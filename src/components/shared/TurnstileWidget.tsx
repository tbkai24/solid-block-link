import { useEffect, useRef, useState } from "react";
import { getTurnstileSiteKey } from "../../services/turnstile";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
    __sblTurnstileScriptLoading?: Promise<void>;
  }
}

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (window.__sblTurnstileScriptLoading) return window.__sblTurnstileScriptLoading;

  window.__sblTurnstileScriptLoading = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-sbl-turnstile]");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Turnstile failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.sblTurnstile = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile failed to load."));
    document.head.appendChild(script);
  });

  return window.__sblTurnstileScriptLoading;
}

type TurnstileWidgetProps = {
  onTokenChange: (token: string) => void;
  resetKey?: number;
};

export function TurnstileWidget({ onTokenChange, resetKey = 0 }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef("");
  const [siteKey, setSiteKey] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "disabled" | "error">("loading");

  useEffect(() => {
    let isActive = true;

    getTurnstileSiteKey().then((key) => {
      if (!isActive) return;
      setSiteKey(key);
      setStatus(key ? "ready" : "disabled");
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let isActive = true;

    onTokenChange("");
    setStatus("loading");

    loadTurnstileScript()
      .then(() => {
        if (!isActive || !window.turnstile || !containerRef.current) return;
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = "";
        }
        containerRef.current.innerHTML = "";
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "light",
          callback: onTokenChange,
          "expired-callback": () => onTokenChange(""),
          "error-callback": () => {
            onTokenChange("");
            setStatus("error");
          }
        });
        setStatus("ready");
      })
      .catch(() => setStatus("error"));

    return () => {
      isActive = false;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = "";
      }
    };
  }, [onTokenChange, resetKey, siteKey]);

  if (status === "disabled") return null;

  return (
    <div className="turnstile-field">
      <span>Security check</span>
      <div ref={containerRef} className="turnstile-widget" />
      {status === "loading" ? <small>Loading security check...</small> : null}
      {status === "error" ? <small>Security check could not load. Please refresh this page.</small> : null}
    </div>
  );
}

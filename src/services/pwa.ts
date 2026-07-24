// PWA & Web Push Notification Service

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[PWA] Service Worker registered successfully:", reg.scope);
      })
      .catch((err) => {
        console.warn("[PWA] Service Worker registration failed:", err);
      });
  });

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notifyListeners();
    console.log("[PWA] Application successfully installed!");
  });
}

export function subscribePwaState(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function canPromptInstall() {
  return Boolean(deferredPrompt);
}

export async function promptInstallApp(): Promise<boolean> {
  if (!deferredPrompt) return false;

  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      deferredPrompt = null;
      notifyListeners();
      return true;
    }
  } catch (err) {
    console.error("[PWA] Install prompt error:", err);
  }
  return false;
}

export function isAppInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as unknown as { standalone?: boolean }).standalone))
  );
}

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

// Notification API Functions
export function getNotificationPermissionStatus(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";

  try {
    const permission = await Notification.requestPermission();
    notifyListeners();
    return permission;
  } catch (err) {
    console.error("[Push] Permission request error:", err);
    return "denied";
  }
}

export async function sendLocalNotification(title: string, options?: NotificationOptions & { url?: string }): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;

  if (Notification.permission !== "granted") {
    const status = await requestNotificationPermission();
    if (status !== "granted") return false;
  }

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        icon: "/sbllogo.jpg",
        badge: "/sbllogo.jpg",
        data: { url: options?.url || "/" },
        ...options
      } as unknown as NotificationOptions);
      return true;
    } else {
      new Notification(title, {
        icon: "/sbllogo.jpg",
        body: options?.body,
        ...options
      });
      return true;
    }
  } catch (err) {
    console.error("[Push] Error showing notification:", err);
    return false;
  }
}

import { useEffect, useMemo, useRef, useState } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import { socialIconByLabel } from "../../config/socialIcons";
import { UpdateItem } from "../../types/content";

type SocialEmbedCardProps = {
  item: UpdateItem;
};

const loadedScripts = new Set<string>();

type EmbedWindow = Window & {
  instgrm?: {
    Embeds?: {
      process: () => void;
    };
  };
  twttr?: {
    widgets?: {
      load: (element?: HTMLElement) => void;
    };
  };
};

function loadScript(src: string) {
  if (loadedScripts.has(src)) return;
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.defer = true;
  document.body.appendChild(script);
  loadedScripts.add(src);
}

function detectEmbedType(platform: string, href: string) {
  const url = href.toLowerCase();
  if (platform === "X" || url.includes("x.com/") || url.includes("twitter.com/")) return "x";
  if (platform === "TikTok" || url.includes("tiktok.com/")) return "tiktok";
  if (platform === "Instagram" || url.includes("instagram.com/")) return "instagram";
  if (platform === "Facebook" || url.includes("facebook.com/")) return "facebook";
  if (platform === "Threads" || url.includes("threads.net/")) return "threads";
  return "fallback";
}

function normalizeXUrl(href: string) {
  return href.replace("https://x.com/", "https://twitter.com/");
}

export function SocialEmbedCard({ item }: SocialEmbedCardProps) {
  const embedType = detectEmbedType(item.platform, item.href);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [embedReady, setEmbedReady] = useState(embedType === "facebook");
  const isShortLabelPlatform = item.platform === "X";

  const fallbackCard = useMemo(
    () => (
      <article className="embed-card post-preview-card" key={item.id}>
        <div className="post-preview-meta">
          <span className="chip post-platform-chip">
            <span className="post-platform-icon" aria-hidden="true">
              {socialIconByLabel[item.platform as keyof typeof socialIconByLabel] ?? null}
            </span>
            {!isShortLabelPlatform ? item.platform : null}
          </span>
          <span className="label">{item.date}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        <a className="text-link post-preview-link" href={item.href} target="_blank" rel="noreferrer">
          View post
          <span aria-hidden="true"><FiArrowUpRight /></span>
        </a>
      </article>
    ),
    [isShortLabelPlatform, item]
  );

  useEffect(() => {
    if (embedType === "x") loadScript("https://platform.twitter.com/widgets.js");
    if (embedType === "tiktok") loadScript("https://www.tiktok.com/embed.js");
    if (embedType === "instagram") loadScript("https://www.instagram.com/embed.js");
  }, [embedType]);

  useEffect(() => {
    if (embedType === "facebook" || embedType === "fallback" || embedType === "threads") return;
    setEmbedReady(false);

    const target = shellRef.current;
    const win = window as EmbedWindow;

    const processEmbed = () => {
      if (!target) return;
      if (embedType === "x") win.twttr?.widgets?.load(target);
      if (embedType === "instagram") win.instgrm?.Embeds?.process();
    };

    processEmbed();
    const retry = window.setTimeout(processEmbed, 1000);

    const interval = window.setInterval(() => {
      if (!target) return;
      const hasIframe = target.querySelector("iframe");
      const hasTwitterWidget = target.querySelector(".twitter-tweet-rendered");
      const hasInstagramEmbed = target.querySelector(".instagram-media-rendered");
      const hasTikTokIframe = target.querySelector("iframe[data-tt-embed]");
      if (hasIframe || hasTwitterWidget || hasInstagramEmbed || hasTikTokIframe) {
        setEmbedReady(true);
        window.clearInterval(interval);
      }
    }, 400);

    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
    }, 4000);

    return () => {
      window.clearTimeout(retry);
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [embedType, item.href]);

  if (embedType === "facebook") {
    const src = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(item.href)}&show_text=true&width=500`;
    return (
      <article className="embed-card social-embed-card" key={item.id}>
        <iframe
          className="social-embed-frame"
          src={src}
          width="100%"
          height="520"
          style={{ border: "none", overflow: "hidden" }}
          scrolling="no"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          title={item.title}
        />
      </article>
    );
  }

  if (embedType === "x") {
    const normalizedHref = normalizeXUrl(item.href);
    return (
      <article className="embed-card social-embed-card" key={item.id}>
        <div className="social-embed-shell" ref={shellRef}>
          <blockquote className="twitter-tweet" data-theme="dark">
            <a href={normalizedHref}>View post</a>
          </blockquote>
        </div>
        {!embedReady ? fallbackCard : null}
      </article>
    );
  }

  if (embedType === "tiktok") {
    return (
      <article className="embed-card social-embed-card" key={item.id}>
        <div className="social-embed-shell" ref={shellRef}>
          <blockquote className="tiktok-embed" cite={item.href}>
            <section>
              <a href={item.href}>View post</a>
            </section>
          </blockquote>
        </div>
        {!embedReady ? fallbackCard : null}
      </article>
    );
  }

  if (embedType === "instagram") {
    return (
      <article className="embed-card social-embed-card" key={item.id}>
        <div className="social-embed-shell" ref={shellRef}>
          <blockquote className="instagram-media" data-instgrm-permalink={item.href} data-instgrm-version="14">
            <a href={item.href}>View post</a>
          </blockquote>
        </div>
        {!embedReady ? fallbackCard : null}
      </article>
    );
  }

  return fallbackCard;
}

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiBell, FiExternalLink, FiX } from "react-icons/fi";
import { useSiteContent } from "../../hooks/useSiteContent";
import { UpdateItem } from "../../types/content";

const dismissalStorageKey = "sbl-announcement-popup-dismissals";

function getStoredDismissals() {
  try {
    return JSON.parse(window.localStorage.getItem(dismissalStorageKey) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function isInternalHref(href: string) {
  return href.startsWith("/");
}

function isSameLocalDay(value: string) {
  const saved = new Date(value);
  const today = new Date();
  return (
    saved.getFullYear() === today.getFullYear() &&
    saved.getMonth() === today.getMonth() &&
    saved.getDate() === today.getDate()
  );
}

function canShowAnnouncement(item: UpdateItem, dismissedAt: string | undefined, closedThisSession: boolean) {
  if ((item.category || item.label) !== "Announcement" || !item.popupEnabled) return false;
  if (item.popupExpiresAt && Date.parse(item.popupExpiresAt) < Date.now()) return false;
  if (closedThisSession) return false;
  if (!dismissedAt) return true;
  if (item.popupFrequency === "daily") return !isSameLocalDay(dismissedAt);
  if (item.popupFrequency === "always") return true;
  return false;
}

export function AnnouncementPopupQueue() {
  const location = useLocation();
  const { content, loading } = useSiteContent();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasStarted, setHasStarted] = useState(false);
  const [closedIds, setClosedIds] = useState<string[]>([]);
  const [dismissals, setDismissals] = useState<Record<string, string>>(() => getStoredDismissals());

  const announcements = useMemo(
    () => content.updates.filter((item) => canShowAnnouncement(item, dismissals[item.id], closedIds.includes(item.id))),
    [closedIds, content.updates, dismissals]
  );

  useEffect(() => {
    if (location.pathname.startsWith("/admin")) {
      setActiveIndex(-1);
      return;
    }

    if (!loading && announcements.length && !hasStarted) {
      setActiveIndex(0);
      setHasStarted(true);
    }
  }, [announcements.length, hasStarted, loading, location.pathname]);

  if (activeIndex < 0 || activeIndex >= announcements.length) return null;

  const announcement = announcements[activeIndex];
  const isLast = activeIndex >= announcements.length - 1;

  function closeCurrent() {
    setActiveIndex((current) => {
      const currentAnnouncement = announcements[current];
      if (currentAnnouncement) {
        setClosedIds((ids) => (ids.includes(currentAnnouncement.id) ? ids : [...ids, currentAnnouncement.id]));
        if (currentAnnouncement.popupFrequency !== "always") {
          const nextDismissals = {
            ...getStoredDismissals(),
            [currentAnnouncement.id]: new Date().toISOString()
          };
          window.localStorage.setItem(dismissalStorageKey, JSON.stringify(nextDismissals));
          setDismissals(nextDismissals);
        }
      }
      return announcements.length > 1 ? 0 : -1;
    });
  }

  return (
    <div className="announcement-popup-backdrop" role="presentation">
      <section className="announcement-popup" role="dialog" aria-modal="true" aria-labelledby="announcement-popup-title">
        <button className="announcement-popup-close" type="button" onClick={closeCurrent} aria-label="Close announcement">
          <FiX aria-hidden="true" />
        </button>

        <p className="eyebrow"><FiBell aria-hidden="true" /> Announcement</p>
        {announcement.popupImageUrl ? (
          <img className="announcement-popup-image" src={announcement.popupImageUrl} alt="" loading="eager" />
        ) : null}
        <h2 id="announcement-popup-title">{announcement.title}</h2>
        <p>{announcement.summary}</p>
        <div className="announcement-popup-meta">
          <span>{announcement.date}</span>
          <span>{activeIndex + 1} of {announcements.length}</span>
        </div>

        <div className="announcement-popup-actions">
          {announcement.href ? (
            isInternalHref(announcement.href) ? (
              <Link className="button secondary" to={announcement.href} onClick={closeCurrent}>
                View Announcement <FiExternalLink aria-hidden="true" />
              </Link>
            ) : (
              <a className="button secondary" href={announcement.href} target="_blank" rel="noreferrer" onClick={closeCurrent}>
                View Announcement <FiExternalLink aria-hidden="true" />
              </a>
            )
          ) : null}
          <button className="button primary" type="button" onClick={closeCurrent}>
            {isLast ? "Close" : "Next Announcement"}
          </button>
        </div>
      </section>
    </div>
  );
}

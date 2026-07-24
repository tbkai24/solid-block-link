import { useEffect, useState } from "react";
import { FiBell, FiCheck, FiDownload, FiShare, FiSmartphone, FiX } from "react-icons/fi";
import {
  canPromptInstall,
  getNotificationPermissionStatus,
  isAppInstalled,
  isIOS,
  promptInstallApp,
  requestNotificationPermission,
  sendLocalNotification,
  subscribePwaState
} from "../../services/pwa";

const DISMISS_KEY = "sblink_pwa_prompt_dismissed_at";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PwaInstallPrompt() {
  const [installed, setInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>("default");
  const [dismissed, setDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const isIosDevice = isIOS();

  useEffect(() => {
    // Check dismissal status
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const timePassed = Date.now() - Number(dismissedAt);
      if (timePassed < DISMISS_DURATION_MS) {
        setDismissed(true);
      }
    }

    function updateState() {
      setInstalled(isAppInstalled());
      setCanInstall(canPromptInstall());
      setNotificationStatus(getNotificationPermissionStatus());
    }

    updateState();
    const unsubscribe = subscribePwaState(updateState);
    return unsubscribe;
  }, []);

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }

  async function handleInstallClick() {
    if (isIosDevice && !installed) {
      setShowIosGuide(true);
      return;
    }

    setInstalling(true);
    const success = await promptInstallApp();
    setInstalling(false);
    if (success) {
      setInstalled(true);
    }
  }

  async function handleEnableNotifications() {
    setEnablingPush(true);
    const permission = await requestNotificationPermission();
    setNotificationStatus(permission);
    setEnablingPush(false);

    if (permission === "granted") {
      void sendLocalNotification("Notifications Enabled! 🎉", {
        body: "You will now receive live alerts for SB19 donation drives and campaign updates.",
        url: "/"
      });
    }
  }

  // If already installed AND notifications enabled, no prompt needed
  if (installed && notificationStatus === "granted") {
    return null;
  }

  // If user dismissed it recently, hide
  if (dismissed) {
    return null;
  }

  // Hide if not on mobile/laptop or cannot install/no push capability
  const showPrompt = canInstall || isIosDevice || notificationStatus !== "granted";
  if (!showPrompt) return null;

  return (
    <div className="pwa-install-banner" role="dialog" aria-label="Install app and enable notifications">
      <div className="pwa-banner-card">
        <button
          className="pwa-close-button"
          type="button"
          onClick={handleDismiss}
          aria-label="Close install prompt"
        >
          <FiX />
        </button>

        <div className="pwa-banner-content">
          <div className="pwa-app-icon">
            <img src="/sbllogo.jpg" alt="SBLink logo" />
          </div>

          <div className="pwa-banner-info">
            <div className="pwa-banner-header">
              <span className="pwa-badge">
                <FiSmartphone aria-hidden="true" /> App Available
              </span>
              {notificationStatus === "granted" ? (
                <span className="pwa-badge success">
                  <FiCheck aria-hidden="true" /> Push Ready
                </span>
              ) : null}
            </div>

            <h3>Install SBLink Drive App</h3>
            <p>
              Get quick 1-tap access on your phone or laptop, offline support, and live campaign push notifications!
            </p>

            {showIosGuide ? (
              <div className="pwa-ios-guide">
                <p>
                  <strong>To Install on iPhone / iPad:</strong>
                </p>
                <ol>
                  <li>
                    Tap the <strong>Share</strong> button <FiShare className="inline-icon" /> at the bottom of Safari.
                  </li>
                  <li>
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </li>
                </ol>
              </div>
            ) : null}

            <div className="pwa-action-row">
              {!installed ? (
                <button
                  type="button"
                  className="button primary pwa-install-btn"
                  onClick={handleInstallClick}
                  disabled={installing}
                >
                  <span className="button-icon" aria-hidden="true">
                    <FiDownload />
                  </span>
                  {installing ? "Installing..." : isIosDevice ? "How to Install" : "Install App"}
                </button>
              ) : null}

              {notificationStatus !== "granted" ? (
                <button
                  type="button"
                  className="button secondary pwa-push-btn"
                  onClick={handleEnableNotifications}
                  disabled={enablingPush}
                >
                  <span className="button-icon" aria-hidden="true">
                    <FiBell />
                  </span>
                  {enablingPush ? "Enabling..." : "Enable Notifications"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEdit3, FiEye, FiEyeOff, FiLock, FiLogOut, FiMail, FiSave, FiUser } from "react-icons/fi";
import { useAuthProfile } from "../hooks/useAuthProfile";
import { supabase } from "../lib/supabase";
import { updateProfileViaApi } from "../services/profile";
import { normalizeUsername, validateSupportedEmail, validateUsername } from "../services/validation";

function runInBackground(task: Promise<unknown>) {
  void task.catch(() => undefined);
}

function withTimeout<T>(task: PromiseLike<T>, message: string, timeoutMs = 10000) {
  return Promise.race([
    Promise.resolve(task),
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    })
  ]);
}

export function AccountPage() {
  const navigate = useNavigate();
  const { session, profile, loading, isAdmin, refreshProfile } = useAuthProfile();
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "danger">("danger");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [activePanel, setActivePanel] = useState<"profile" | "password">("profile");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    username: "",
    email: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (!loading && !session) navigate("/login", { replace: true });
  }, [loading, navigate, session]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "password") {
      setActivePanel("password");
      setNoticeTone("success");
      setNotice("You can now create a new password for your SBL account.");
    }
  }, []);

  useEffect(() => {
    if (!notice || noticeTone !== "success") return;

    const timeoutId = window.setTimeout(() => {
      setNotice("");
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [notice, noticeTone]);

  useEffect(() => {
    setProfileForm({
      displayName: profile?.display_name || "",
      username: profile?.username || "",
      email: profile?.email || session?.user.email || ""
    });
  }, [profile?.display_name, profile?.email, profile?.username, session?.user.email]);

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session) return;

    const displayName = profileForm.displayName.trim();
    const username = normalizeUsername(profileForm.username);
    const email = profileForm.email.trim().toLowerCase();
    const usernameError = validateUsername(username);
    const emailError = validateSupportedEmail(email);
    if (!displayName || usernameError || emailError) {
      setNoticeTone("danger");
      setNotice(usernameError || emailError || "Please add your name.");
      return;
    }

    setProfileSaving(true);
    setNotice("");

    try {
      const currentEmail = session.user.email || "";
      if (email.toLowerCase() !== currentEmail.toLowerCase()) {
        const { error: authError } = await withTimeout(
          supabase.auth.updateUser({ email }),
          "Email update is taking too long. Please try again."
        );
        if (authError) {
          setNoticeTone("danger");
          setNotice(authError.message);
          return;
        }
      }

      await withTimeout(
        updateProfileViaApi({
          token: session.access_token,
          displayName,
          username,
          email
        }),
        "Profile save is taking too long. Please try again."
      );

      setProfileForm({ displayName, username, email });
      runInBackground(refreshProfile());
      setNoticeTone("success");
      setNotice(email.toLowerCase() !== currentEmail.toLowerCase()
        ? "Profile saved. Please check your inbox to confirm your new email address."
        : "Profile saved successfully.");
    } catch (error) {
      setNoticeTone("danger");
      setNotice(error instanceof Error ? error.message : "Profile could not be saved.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session) return;

    if (passwordForm.password.length < 8) {
      setNoticeTone("danger");
      setNotice("Password must be at least 8 characters.");
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setNoticeTone("danger");
      setNotice("Passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    setNotice("");

    try {
      const { error } = await withTimeout(
        supabase.auth.updateUser({
          password: passwordForm.password
        }),
        "Password update is taking too long. Please try again."
      );

      if (error) {
        setNoticeTone("danger");
        setNotice(error.message);
        return;
      }

      setPasswordForm({ password: "", confirmPassword: "" });
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setNoticeTone("success");
      setNotice("Password updated. You can keep using your SBL account securely.");
      window.history.replaceState(null, "", window.location.pathname);
    } catch (error) {
      setNoticeTone("danger");
      setNotice(error instanceof Error ? error.message : "Password could not be updated.");
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading || !session) {
    return (
      <section className="page-shell">
        <div className="page-panel account-skeleton-card" aria-label="Loading account">
          <span className="skeleton-line skeleton-chip" />
          <span className="skeleton-line skeleton-title" />
          <span className="skeleton-line skeleton-copy" />
          <div className="account-skeleton-grid">
            <span className="skeleton-line" />
            <span className="skeleton-line" />
            <span className="skeleton-line" />
          </div>
        </div>
        <div className="account-admin-layout">
          <aside className="page-panel account-action-panel account-skeleton-side">
            <span className="skeleton-line skeleton-chip" />
            <span className="skeleton-line skeleton-button" />
            <span className="skeleton-line skeleton-button" />
          </aside>
          <section className="page-panel account-settings-panel account-skeleton-settings">
            <div>
              <span className="skeleton-line skeleton-chip" />
              <span className="skeleton-line skeleton-heading" />
              <span className="skeleton-line skeleton-copy" />
            </div>
            <div className="account-settings-form">
              <span className="skeleton-line skeleton-input" />
              <span className="skeleton-line skeleton-input" />
              <span className="skeleton-line skeleton-input" />
              <span className="skeleton-line skeleton-button wide" />
            </div>
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="page-panel page-hero-panel">
        <p className="eyebrow">Account</p>
        <h1>Hi, {profile?.display_name || session.user.email}! Welcome back.</h1>
        <p className="page-lead">Manage your SBL profile, password, and account access from one place.</p>
        <div className="cta-row">
          {isAdmin ? <Link className="button primary" to="/admin">Open Admin Panel</Link> : null}
          <Link className="button secondary" to="/contact">Open Support Desk</Link>
          <button className="button secondary danger-button" type="button" onClick={handleLogout}>
            <span className="button-icon" aria-hidden="true"><FiLogOut /></span>
            Log Out
          </button>
        </div>
      </div>

      <div className="account-admin-layout">
        <aside className="page-panel account-action-panel">
          <p className="eyebrow">Account Menu</p>
          <button
            className={activePanel === "profile" ? "admin-sidebar-link active" : "admin-sidebar-link"}
            type="button"
            onClick={() => setActivePanel("profile")}
          >
            <span className="admin-link-icon" aria-hidden="true"><FiEdit3 /></span>
            Edit Profile
          </button>
          <button
            className={activePanel === "password" ? "admin-sidebar-link active" : "admin-sidebar-link"}
            type="button"
            onClick={() => setActivePanel("password")}
          >
            <span className="admin-link-icon" aria-hidden="true"><FiLock /></span>
            Change Password
          </button>
        </aside>

        <section className="page-panel account-settings-panel">
          {notice ? <p className={`admin-alert account-save-alert ${noticeTone}`}>{notice}</p> : null}
          {activePanel === "profile" ? (
            <>
              <div>
                <p className="eyebrow"><FiUser aria-hidden="true" /> Profile</p>
                <h2>Edit profile</h2>
                <p className="muted-text">Update the name and email connected to your SBL account.</p>
                <div className="account-detail-list">
                  <span><FiMail aria-hidden="true" /> {profile?.email || profileForm.email || session.user.email}</span>
                  <span><FiUser aria-hidden="true" /> @{profile?.username || profileForm.username || "username"}</span>
                  <span><FiUser aria-hidden="true" /> {isAdmin ? "Admin" : "Member"}</span>
                </div>
              </div>
              <form className="admin-settings-form account-settings-form" onSubmit={handleProfileSave}>
                <label>
                  <span>Name</span>
                  <input
                    value={profileForm.displayName}
                    onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))}
                    placeholder="Enter your full name"
                    disabled={profileSaving}
                  />
                </label>
                <label>
                  <span>Username</span>
                  <input
                    value={profileForm.username}
                    onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value }))}
                    disabled={profileSaving}
                    autoComplete="username"
                    placeholder="Enter your username"
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Enter your email address"
                    disabled={profileSaving}
                  />
                </label>
                <button className="lookup-button" type="submit" disabled={profileSaving}>
                  <FiSave aria-hidden="true" /> {profileSaving ? "Saving..." : "Save Profile"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div>
                <p className="eyebrow"><FiLock aria-hidden="true" /> Security</p>
                <h2>Change password</h2>
                <p className="muted-text">Use at least 8 characters. After saving, use the new password on your next sign in.</p>
              </div>
              <form className="admin-settings-form account-settings-form" onSubmit={handlePasswordSave}>
                <label>
                  <span>New password</span>
                  <span className="password-field">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.password}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Enter new password (min. 8 characters)"
                      disabled={passwordSaving}
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowNewPassword((current) => !current)} aria-label={showNewPassword ? "Hide password" : "Show password"}>
                      {showNewPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                    </button>
                  </span>
                </label>
                <label>
                  <span>Confirm password</span>
                  <span className="password-field">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                      placeholder="Confirm new password"
                      disabled={passwordSaving}
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                      {showConfirmPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                    </button>
                  </span>
                </label>
                <button className="lookup-button" type="submit" disabled={passwordSaving}>
                  <FiSave aria-hidden="true" /> {passwordSaving ? "Saving..." : "Save Password"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

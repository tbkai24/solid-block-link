import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiUserPlus } from "react-icons/fi";
import { TurnstileWidget } from "../components/shared/TurnstileWidget";
import { useAuthProfile } from "../hooks/useAuthProfile";
import { formatAuthError, supabase } from "../lib/supabase";
import { trackRegistration } from "../services/registrationTracking";
import { normalizeUsername, validateSupportedEmail, validateUsername } from "../services/validation";
import { verifyTurnstileToken } from "../services/turnstile";

const emptySignup = {
  displayName: "",
  username: "",
  email: "",
  password: "",
  website: ""
};

export function SignupPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuthProfile();
  const [form, setForm] = useState(emptySignup);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [tone, setTone] = useState<"success" | "danger">("danger");
  const handleTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);

  useEffect(() => {
    if (!loading && session) navigate("/account", { replace: true });
  }, [loading, navigate, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setTone("danger");
      setNotice("Supabase is not configured.");
      return;
    }

    if (form.website.trim()) {
      setTone("danger");
      setNotice("Unable to create account.");
      return;
    }

    const usernameError = validateUsername(form.username);
    const emailError = validateSupportedEmail(form.email);

    if (!form.displayName.trim() || usernameError || emailError || form.password.length < 8) {
      setTone("danger");
      setNotice(usernameError || emailError || "Please add your name and a password with at least 8 characters.");
      return;
    }

    setSubmitting(true);
    setNotice("");

    try {
      const securityCheck = await verifyTurnstileToken(turnstileToken);
      if (!securityCheck.ok) {
        setTone("danger");
        setNotice(securityCheck.message || "Please complete the security check.");
        setTurnstileToken("");
        setTurnstileResetKey((current) => current + 1);
        setSubmitting(false);
        return;
      }

      const normalizedEmail = form.email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: form.password,
        options: {
          data: {
            display_name: form.displayName.trim(),
            username: normalizeUsername(form.username)
          }
        }
      });

      if (error) {
        setTone("danger");
        setNotice(formatAuthError(error));
        setTurnstileToken("");
        setTurnstileResetKey((current) => current + 1);
        setSubmitting(false);
        return;
      }

      if (data.user) {
        await supabase.from("user_profiles").insert({
          id: data.user.id,
          display_name: form.displayName.trim(),
          username: normalizeUsername(form.username),
          email: normalizedEmail,
          role: "member",
          status: "active"
        });
        await trackRegistration(data.user.id, normalizedEmail);
      }

      setForm(emptySignup);
      setTurnstileToken("");
      setTurnstileResetKey((current) => current + 1);

      if (data.session) {
        navigate("/", { replace: true });
        return;
      }

      setTone("success");
      setNotice("Account created successfully! You can now sign in.");
    } catch (err: any) {
      setTone("danger");
      setNotice(formatAuthError(err));
      setTurnstileToken("");
      setTurnstileResetKey((current) => current + 1);
    }
    setSubmitting(false);
  }

  return (
    <section className="admin-auth-wrap">
      <article className="admin-auth-card">
        <p className="eyebrow">Create Account</p>
        <h1>Join the SBL portal</h1>
        <p className="muted-text">Create an account to submit tickets and follow replies from the SBL team.</p>
        {notice ? <p className={`admin-alert ${tone}`}>{notice}</p> : null}
        <form className="admin-auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Name</span>
            <input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Enter your full name" required autoComplete="name" />
          </label>
          <label>
            <span>Username</span>
            <input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} placeholder="Enter your username" required autoComplete="username" />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Enter your email address" required autoComplete="email" />
          </label>
          <label>
            <span>Password</span>
            <span className="password-field">
              <input type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Enter your password (min. 8 characters)" required minLength={8} autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
              </button>
            </span>
          </label>
          <label className="honeypot-field" aria-hidden="true">
            <span>Website</span>
            <input tabIndex={-1} value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} autoComplete="off" />
          </label>
          <TurnstileWidget onTokenChange={handleTurnstileToken} resetKey={turnstileResetKey} />
          <div className="admin-auth-actions">
            <button className="lookup-button" type="submit" disabled={submitting}>
              <FiUserPlus aria-hidden="true" /> {submitting ? "Creating..." : "Create Account"}
            </button>
            <Link className="admin-entry-link" to="/login">Already have an account?</Link>
          </div>
        </form>
      </article>
    </section>
  );
}

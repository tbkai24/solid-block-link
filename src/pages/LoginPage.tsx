import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiLogIn } from "react-icons/fi";
import { TurnstileWidget } from "../components/shared/TurnstileWidget";
import { useAuthProfile } from "../hooks/useAuthProfile";
import { formatAuthError, supabase } from "../lib/supabase";
import { validateSupportedEmail } from "../services/validation";
import { verifyTurnstileToken } from "../services/turnstile";

export function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuthProfile();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "danger">("danger");
  const handleTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);

  useEffect(() => {
    if (!loading && session) navigate("/", { replace: true });
  }, [loading, navigate, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setNoticeTone("danger");
      setNotice("Supabase is not configured.");
      return;
    }

    setSubmitting(true);
    setNotice("");

    const emailError = validateSupportedEmail(email);
    if (emailError) {
      setNoticeTone("danger");
      setNotice(emailError);
      setSubmitting(false);
      return;
    }

    try {
      const securityCheck = await verifyTurnstileToken(turnstileToken);
      if (!securityCheck.ok) {
        setNoticeTone("danger");
        setNotice(securityCheck.message || "Please complete the security check.");
        setTurnstileToken("");
        setTurnstileResetKey((current) => current + 1);
        setSubmitting(false);
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (authError) {
        setNoticeTone("danger");
        setNotice(formatAuthError(authError));
        setTurnstileToken("");
        setTurnstileResetKey((current) => current + 1);
        setSubmitting(false);
        return;
      }

      navigate("/", { replace: true });
    } catch (err: any) {
      setNoticeTone("danger");
      setNotice(formatAuthError(err));
      setTurnstileToken("");
      setTurnstileResetKey((current) => current + 1);
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    if (!supabase) {
      setNoticeTone("danger");
      setNotice("Supabase is not configured.");
      return;
    }
    const emailError = validateSupportedEmail(email);
    if (emailError) {
      setNoticeTone("danger");
      setNotice(emailError);
      return;
    }

    setSubmitting(true);
    setNotice("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/account?reset=password`
      });

      if (resetError) {
        setNoticeTone("danger");
        setNotice(formatAuthError(resetError));
      } else {
        setNoticeTone("success");
        setNotice("Password reset email sent. Please check your inbox for the SBL reset link.");
      }
    } catch (err: any) {
      setNoticeTone("danger");
      setNotice(formatAuthError(err));
    }
    setSubmitting(false);
  }

  return (
    <section className="admin-auth-wrap">
      <article className="admin-auth-card">
        <p className="eyebrow">Member Access</p>
        <h1>Sign in to SBL</h1>
        <p className="muted-text">Use your account to submit and track support tickets.</p>
        <form className="admin-auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email address" required autoComplete="email" />
          </label>
          <label>
            <span>Password</span>
            <span className="password-field">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required autoComplete="current-password" />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
              </button>
            </span>
          </label>
          <TurnstileWidget onTokenChange={handleTurnstileToken} resetKey={turnstileResetKey} />
          {notice ? <p className={`admin-alert ${noticeTone}`}>{notice}</p> : null}
          <div className="admin-auth-actions">
            <button className="lookup-button" type="submit" disabled={submitting}>
              <FiLogIn aria-hidden="true" /> {submitting ? "Signing in..." : "Sign In"}
            </button>
            <button className="admin-entry-link admin-entry-button" type="button" onClick={handleForgotPassword} disabled={submitting}>
              Forgot password?
            </button>
            <Link className="admin-entry-link" to="/signup">Create Account</Link>
          </div>
        </form>
      </article>
    </section>
  );
}

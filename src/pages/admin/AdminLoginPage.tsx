import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { TurnstileWidget } from "../../components/shared/TurnstileWidget";
import { formatAuthError, supabase } from "../../lib/supabase";
import { useAdminSession } from "../../hooks/useAdminSession";
import { verifyTurnstileToken } from "../../services/turnstile";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAdminSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const handleTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);

  useEffect(() => {
    if (!loading && session) navigate("/admin", { replace: true });
  }, [loading, navigate, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return setError("Supabase is not configured.");
    setSubmitting(true);
    setError("");

    try {
      const securityCheck = await verifyTurnstileToken(turnstileToken);
      if (!securityCheck.ok) {
        setError(securityCheck.message || "Please complete the security check.");
        setTurnstileToken("");
        setTurnstileResetKey((current) => current + 1);
        setSubmitting(false);
        return;
      }

      await supabase.auth.signOut().catch(() => { });

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (authError) {
        setError(formatAuthError(authError));
        setTurnstileToken("");
        setTurnstileResetKey((current) => current + 1);
        setSubmitting(false);
        return;
      }

      if (authData?.user) {
        const isOwner = authData.user.email?.toLowerCase() === "joshuaverzosa879@gmail.com";
        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (!existingProfile) {
          try {
            await supabase.from("user_profiles").upsert({
              id: authData.user.id,
              email: authData.user.email?.toLowerCase(),
              display_name: "Admin",
              username: "admin",
              role: isOwner ? "admin" : "member",
              status: "active"
            });
          } catch {
            // ignore profile creation error
          }
        } else if (isOwner && existingProfile.role !== "admin") {
          try {
            await supabase.from("user_profiles").update({ role: "admin" }).eq("id", authData.user.id);
          } catch {
            // ignore role update error
          }
        }
      }

      navigate("/admin", { replace: true });
    } catch (err: any) {
      setError(formatAuthError(err));
      setTurnstileToken("");
      setTurnstileResetKey((current) => current + 1);
      setSubmitting(false);
    }
  }

  return (
    <section className="admin-auth-wrap">
      <article className="admin-auth-card">
        <h1>Admin Login</h1>
        <p className="muted-text">Sign in with your SBL administrator account credentials.</p>
        <form className="admin-auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter admin email address"
              required
              autoComplete="email"
            />
          </label>
          <label>
            <span>Password</span>
            <span className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
              </button>
            </span>
          </label>
          <TurnstileWidget onTokenChange={handleTurnstileToken} resetKey={turnstileResetKey} />
          {error && <p className="lookup-error">{error}</p>}
          <div className="admin-auth-actions">
            <button className="lookup-button" type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign In"}
            </button>
            <button
              type="button"
              className="admin-entry-link admin-entry-button"
              onClick={() => setEmail("joshuaverzosa879@gmail.com")}
            >

            </button>
            <a className="admin-entry-link" href="/">Back to Homepage</a>
          </div>
        </form>
      </article>
    </section>
  );
}

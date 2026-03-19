import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAdminSession } from "../../hooks/useAdminSession";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAdminSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && session) navigate("/admin", { replace: true });
  }, [loading, navigate, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return setError("Supabase is not configured.");
    setSubmitting(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }
    navigate("/admin", { replace: true });
  }

  return (
    <section className="admin-auth-wrap">
      <article className="admin-auth-card">
        <h1>Admin Login</h1>
        <p className="muted-text">Use your Supabase admin account credentials.</p>
        <form className="admin-auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          {error && <p className="lookup-error">{error}</p>}
          <div className="admin-auth-actions">
            <button className="lookup-button" type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign In"}
            </button>
            <a className="admin-entry-link" href="/">Back to Homepage</a>
          </div>
        </form>
      </article>
    </section>
  );
}

import { FormEvent, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { FiLogIn, FiMail, FiSend, FiUserPlus } from "react-icons/fi";
import { SupportTicketDesk } from "../components/shared/SupportTicketDesk";
import { TurnstileWidget } from "../components/shared/TurnstileWidget";
import { useAuthProfile } from "../hooks/useAuthProfile";
import { supabase } from "../lib/supabase";
import { verifyTurnstileToken } from "../services/turnstile";

const ticketCategories = ["General", "Donation", "Fan Project", "Campaign", "Technical"] as const;

const emptyTicket = {
  subject: "",
  category: "General",
  message: ""
};

export function ContactPage() {
  const { session, loading, isAdmin } = useAuthProfile();
  const [form, setForm] = useState(emptyTicket);
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [notice, setNotice] = useState("");
  const handleTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session) {
      setStatus("error");
      setNotice("Please sign in to submit a ticket.");
      return;
    }
    if (!form.subject.trim() || !form.message.trim()) {
      setStatus("error");
      setNotice("Please add a subject and message.");
      return;
    }

    setStatus("saving");
    setNotice("");

    const securityCheck = await verifyTurnstileToken(turnstileToken);
    if (!securityCheck.ok) {
      setStatus("error");
      setNotice(securityCheck.message || "Please complete the security check.");
      setTurnstileToken("");
      setTurnstileResetKey((current) => current + 1);
      return;
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: session.user.id,
        subject: form.subject.trim(),
        category: form.category,
        status: "Pending",
        priority: "Normal"
      })
      .select("*")
      .single();

    if (ticketError || !ticket) {
      setStatus("error");
      setNotice(ticketError?.message || "Unable to create ticket.");
      setTurnstileToken("");
      setTurnstileResetKey((current) => current + 1);
      return;
    }

    const { error: messageError } = await supabase.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      sender_user_id: session.user.id,
      sender_role: "member",
      body: form.message.trim()
    });

    if (messageError) {
      setStatus("error");
      setNotice(messageError.message);
      setTurnstileToken("");
      setTurnstileResetKey((current) => current + 1);
      return;
    }

    setForm(emptyTicket);
    setTurnstileToken("");
    setTurnstileResetKey((current) => current + 1);
    setTicketRefreshKey((current) => current + 1);
    setStatus("success");
    setNotice("Ticket submitted. You can follow replies below.");
  }

  return (
    <section className="page-shell contact-page">
      <div className="page-panel page-hero-panel contact-hero-panel">
        <p className="eyebrow">Support Tickets</p>
        <h1>Reach the Solid Block Link team.</h1>
        <p className="page-lead">
          Submit campaign questions, donation concerns, fan project notes, and technical requests through your SBL account.
        </p>
      </div>

      {!loading && !session ? (
        <section className="page-panel contact-form-panel">
          <div>
            <p className="eyebrow"><FiMail aria-hidden="true" /> Account Required</p>
            <h2>Sign in to submit a ticket</h2>
            <p className="muted-text">Tickets are connected to your account so you can view replies and status updates later.</p>
          </div>
          <div className="cta-row">
            <Link className="button primary" to="/login">
              <span className="button-icon" aria-hidden="true"><FiLogIn /></span>
              Sign In
            </Link>
            <Link className="button secondary" to="/signup">
              <span className="button-icon" aria-hidden="true"><FiUserPlus /></span>
              Create Account
            </Link>
          </div>
        </section>
      ) : isAdmin ? (
        <>
          <section className="page-panel contact-form-panel">
            <div>
              <p className="eyebrow"><FiMail aria-hidden="true" /> Support Desk</p>
              <h2>Member tickets</h2>
              <p className="muted-text">Review member conversations, reply, and update ticket status from this page.</p>
            </div>
          </section>
          <SupportTicketDesk refreshKey={ticketRefreshKey} />
        </>
      ) : (
        <>
          <section className="page-panel contact-form-panel">
            <div>
              <p className="eyebrow"><FiMail aria-hidden="true" /> Ticket Desk</p>
              <h2>Create a support ticket</h2>
              <p className="muted-text">Your ticket will be visible to SBL admins and tracked below.</p>
            </div>

            {notice ? <p className={`admin-alert ${status === "success" ? "success" : "danger"}`}>{notice}</p> : null}

            <form className="admin-settings-form contact-form" onSubmit={handleSubmit}>
              <label>
                <span>Category</span>
                <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} disabled={status === "saving"}>
                  {ticketCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Subject</span>
                <input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} disabled={status === "saving"} />
              </label>
              <label>
                <span>Message</span>
                <textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} rows={7} disabled={status === "saving"} />
              </label>
              <TurnstileWidget onTokenChange={handleTurnstileToken} resetKey={turnstileResetKey} />
              <button className="lookup-button" type="submit" disabled={status === "saving" || loading}>
                <FiSend aria-hidden="true" /> {status === "saving" ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>
          </section>
          <SupportTicketDesk refreshKey={ticketRefreshKey} />
        </>
      )}
    </section>
  );
}

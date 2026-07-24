import { FormEvent, useEffect, useMemo, useState } from "react";
import { FiMessageCircle, FiSend } from "react-icons/fi";
import { useAdminAlert } from "../../hooks/useAdminAlert";
import { useAuthProfile } from "../../hooks/useAuthProfile";
import { supabase } from "../../lib/supabase";
import { SupportTicketMessageRow, SupportTicketRow } from "../../types/supabase";

const ticketStatuses = ["All", "Pending", "Open", "Closed"] as const;

function getTicketNumber(ticket: SupportTicketRow) {
  return ticket.ticket_number ? `SBL-${String(ticket.ticket_number).padStart(5, "0")}` : `SBL-${ticket.id.slice(0, 8).toUpperCase()}`;
}

function matchesTicketSearch(ticket: SupportTicketRow, search: string) {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  return [
    getTicketNumber(ticket),
    ticket.subject,
    ticket.category,
    ticket.status,
    ticket.user_profiles?.display_name ?? "",
    ticket.user_profiles?.username ?? "",
    ticket.user_profiles?.email ?? ""
  ].join(" ").toLowerCase().includes(term);
}

function getMemberDisplayName(ticket: SupportTicketRow) {
  return ticket.user_profiles?.display_name || (ticket.user_profiles?.username ? `@${ticket.user_profiles.username}` : "") || ticket.user_profiles?.email || "Member";
}

export function AdminTicketsPanel() {
  const { session } = useAuthProfile();
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [reply, setReply] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof ticketStatuses)[number]>("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { message, tone, showAlert } = useAdminAlert();
  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0],
    [selectedTicketId, tickets]
  );
  const visibleTickets = useMemo(
    () => tickets.filter((ticket) =>
      (statusFilter === "All" || ticket.status === statusFilter) &&
      matchesTicketSearch(ticket, ticketSearch)
    ),
    [statusFilter, ticketSearch, tickets]
  );
  const ticketCounts = useMemo(() => ({
    All: tickets.length,
    Pending: tickets.filter((ticket) => ticket.status === "Pending").length,
    Open: tickets.filter((ticket) => ticket.status === "Open").length,
    Closed: tickets.filter((ticket) => ticket.status === "Closed").length
  }), [tickets]);

  async function loadTickets() {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*, user_profiles(display_name,username,email), support_ticket_messages(*)")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<SupportTicketRow[]>();

    if (error) {
      showAlert("danger", error.message);
    } else {
      const nextTickets = (data ?? []).map((ticket) => ({
        ...ticket,
        support_ticket_messages: [...(ticket.support_ticket_messages ?? [])].sort((left, right) =>
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
        )
      }));
      setTickets(nextTickets);
      if (!selectedTicketId && nextTickets[0]) setSelectedTicketId(nextTickets[0].id);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadTickets();
  }, [showAlert]);

  async function updateTicket(id: string, patch: Partial<Pick<SupportTicketRow, "status" | "priority" | "category">>) {
    if (!supabase) return showAlert("danger", "Supabase is not configured.");
    const { error } = await supabase.from("support_tickets").update(patch).eq("id", id);
    if (error) return showAlert("danger", error.message);
    setTickets((current) => current.map((ticket) => ticket.id === id ? { ...ticket, ...patch } : ticket));
    showAlert("success", "Ticket updated.");
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session || !selectedTicket || !reply.trim()) return;

    setSaving(true);
    const { data, error } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: selectedTicket.id,
        sender_user_id: session.user.id,
        sender_role: "admin",
        body: reply.trim()
      })
      .select("*")
      .single<SupportTicketMessageRow>();

    if (error || !data) {
      showAlert("danger", error?.message || "Unable to reply.");
      setSaving(false);
      return;
    }

    await supabase.from("support_tickets").update({ status: "Open" }).eq("id", selectedTicket.id);
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedTicket.id
          ? { ...ticket, status: "Open", support_ticket_messages: [...(ticket.support_ticket_messages ?? []), data] }
          : ticket
      )
    );
    setReply("");
    setSaving(false);
    showAlert("success", "Reply sent.");
  }

  return (
    <section className="admin-panel">
      <p className="eyebrow">Ticket Inbox</p>
      <h2>Support tickets</h2>
      <p className="muted-text">Reply to member tickets and update status from one place.</p>
      {message ? <p className={`admin-alert ${tone}`}>{message}</p> : null}

      <div className="admin-ticket-layout">
        <div className="ticket-list">
          <div className="ticket-toolbar">
            <label className="ticket-search-field">
              <span>Search tickets</span>
              <input
                value={ticketSearch}
                onChange={(event) => setTicketSearch(event.target.value)}
                placeholder="Ticket number, member, subject..."
              />
            </label>
            <div className="ticket-status-tabs" aria-label="Ticket status filters">
              {ticketStatuses.map((status) => (
                <button
                  key={status}
                  className={statusFilter === status ? "subtab-button active" : "subtab-button"}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                >
                  {status} <span>{ticketCounts[status]}</span>
                </button>
              ))}
            </div>
          </div>
          {visibleTickets.map((ticket) => (
            <button
              key={ticket.id}
              className={selectedTicket?.id === ticket.id ? "ticket-list-item active" : "ticket-list-item"}
              type="button"
              onClick={() => setSelectedTicketId(ticket.id)}
            >
              <span className={`chip ticket-status-chip ticket-status-${ticket.status.toLowerCase()}`}>{ticket.status}</span>
              <span className="ticket-number">{getTicketNumber(ticket)}</span>
              <strong>{ticket.subject}</strong>
              <small>{getMemberDisplayName(ticket)} - {ticket.category}</small>
            </button>
          ))}
          {!visibleTickets.length && !loading ? (
            <div className="ticket-empty-state">
              <FiMessageCircle aria-hidden="true" />
              <strong>No tickets match this view.</strong>
              <p>Try another status tab or clear the search field.</p>
            </div>
          ) : null}
          {loading ? <p className="muted-text">Loading tickets...</p> : null}
        </div>

        <div className="ticket-thread-panel">
          {selectedTicket ? (
            <>
              <div className="ticket-thread-head">
                <div>
                  <p className="eyebrow"><FiMessageCircle aria-hidden="true" /> {selectedTicket.category}</p>
                  <p className="ticket-number">{getTicketNumber(selectedTicket)}</p>
                  <h3>{selectedTicket.subject}</h3>
                  <p className="muted-text">{selectedTicket.user_profiles?.email}</p>
                </div>
                <div className="ticket-admin-controls">
                  <select value={selectedTicket.status} onChange={(event) => void updateTicket(selectedTicket.id, { status: event.target.value as SupportTicketRow["status"] })}>
                    <option value="Pending">Pending</option>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>
                  <select value={selectedTicket.priority} onChange={(event) => void updateTicket(selectedTicket.id, { priority: event.target.value as SupportTicketRow["priority"] })}>
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="ticket-thread">
                {(selectedTicket.support_ticket_messages ?? []).map((ticketMessage) => (
                  <article className={ticketMessage.sender_role === "admin" ? "ticket-message admin" : "ticket-message"} key={ticketMessage.id}>
                    <span className="label">{ticketMessage.sender_role === "admin" ? "SBL Team" : getMemberDisplayName(selectedTicket)} - {new Date(ticketMessage.created_at).toLocaleString()}</span>
                    <p>{ticketMessage.body}</p>
                  </article>
                ))}
              </div>
              <form className="admin-settings-form ticket-reply-form" onSubmit={handleReply}>
                <label>
                  <span>Reply</span>
                  <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} disabled={saving || selectedTicket.status === "Closed"} />
                </label>
                <button className="lookup-button" type="submit" disabled={saving || !reply.trim() || selectedTicket.status === "Closed"}>
                  <FiSend aria-hidden="true" /> {saving ? "Sending..." : "Send Reply"}
                </button>
              </form>
            </>
          ) : (
            <div className="ticket-empty-state">
              <FiMessageCircle aria-hidden="true" />
              <strong>Select a ticket</strong>
              <p>Choose a conversation from the inbox to view replies and update the status.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

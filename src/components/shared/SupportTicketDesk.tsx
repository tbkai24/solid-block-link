import { FormEvent, useEffect, useMemo, useState } from "react";
import { FiMessageCircle, FiSend } from "react-icons/fi";
import { useAuthProfile } from "../../hooks/useAuthProfile";
import { supabase } from "../../lib/supabase";
import { SupportTicketMessageRow, SupportTicketRow } from "../../types/supabase";

const ticketStatuses = ["All", "Pending", "Open", "Closed"] as const;

function getTicketNumber(ticket: SupportTicketRow) {
  return ticket.ticket_number ? `SBL-${String(ticket.ticket_number).padStart(5, "0")}` : `SBL-${ticket.id.slice(0, 8).toUpperCase()}`;
}

function matchesTicketSearch(ticket: SupportTicketRow, search: string, isAdmin: boolean) {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  const memberLabel = isAdmin ? `${ticket.user_profiles?.display_name ?? ""} ${ticket.user_profiles?.username ?? ""} ${ticket.user_profiles?.email ?? ""}` : "";
  return [
    getTicketNumber(ticket),
    ticket.subject,
    ticket.category,
    ticket.status,
    memberLabel
  ].join(" ").toLowerCase().includes(term);
}

function getMemberDisplayName(ticket: SupportTicketRow) {
  return ticket.user_profiles?.display_name || (ticket.user_profiles?.username ? `@${ticket.user_profiles.username}` : "") || ticket.user_profiles?.email || "Member";
}

type SupportTicketDeskProps = {
  refreshKey?: number;
};

export function SupportTicketDesk({ refreshKey = 0 }: SupportTicketDeskProps) {
  const { session, isAdmin } = useAuthProfile();
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "danger">("danger");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ticketSearch, setTicketSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof ticketStatuses)[number]>("All");

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0],
    [selectedTicketId, tickets]
  );

  const visibleTickets = useMemo(
    () => tickets.filter((ticket) =>
      (statusFilter === "All" || ticket.status === statusFilter) &&
      matchesTicketSearch(ticket, ticketSearch, isAdmin)
    ),
    [isAdmin, statusFilter, ticketSearch, tickets]
  );

  const ticketCounts = useMemo(() => ({
    All: tickets.length,
    Pending: tickets.filter((ticket) => ticket.status === "Pending").length,
    Open: tickets.filter((ticket) => ticket.status === "Open").length,
    Closed: tickets.filter((ticket) => ticket.status === "Closed").length
  }), [tickets]);

  async function loadTickets() {
    if (!supabase || !session) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let query = supabase
      .from("support_tickets")
      .select("*, user_profiles(display_name,username,email), support_ticket_messages(*)")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("user_id", session.user.id);
    }

    const { data, error } = await query.returns<SupportTicketRow[]>();

    if (error) {
      setNoticeTone("danger");
      setNotice(error.message);
      setLoading(false);
      return;
    }

    const nextTickets = (data ?? []).map((ticket) => ({
      ...ticket,
      support_ticket_messages: [...(ticket.support_ticket_messages ?? [])].sort((left, right) =>
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
      )
    }));

    setTickets(nextTickets);
    setSelectedTicketId((current) =>
      nextTickets.some((ticket) => ticket.id === current) ? current : nextTickets[0]?.id ?? ""
    );
    setLoading(false);
  }

  useEffect(() => {
    void loadTickets();
  }, [isAdmin, refreshKey, session?.user.id]);

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session || !selectedTicket || !reply.trim()) return;

    setSaving(true);
    setNotice("");

    const { data, error } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: selectedTicket.id,
        sender_user_id: session.user.id,
        sender_role: isAdmin ? "admin" : "member",
        body: reply.trim()
      })
      .select("*")
      .single<SupportTicketMessageRow>();

    if (error || !data) {
      setNoticeTone("danger");
      setNotice(error?.message || "Unable to send reply.");
      setSaving(false);
      return;
    }

    const nextStatus = isAdmin ? "Open" : "Pending";
    await supabase.from("support_tickets").update({ status: nextStatus }).eq("id", selectedTicket.id);
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedTicket.id
          ? { ...ticket, status: nextStatus, support_ticket_messages: [...(ticket.support_ticket_messages ?? []), data] }
          : ticket
      )
    );
    setReply("");
    setSaving(false);
  }

  async function updateTicketStatus(status: SupportTicketRow["status"]) {
    if (!supabase || !selectedTicket || !isAdmin) return;
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", selectedTicket.id);
    if (error) {
      setNoticeTone("danger");
      setNotice(error.message);
      return;
    }
    setTickets((current) => current.map((ticket) => ticket.id === selectedTicket.id ? { ...ticket, status } : ticket));
    setNoticeTone("success");
    setNotice("Ticket status updated.");
  }

  return (
    <section className="contact-ticket-desk">
      {notice ? <p className={`admin-alert ${noticeTone}`}>{notice}</p> : null}
      <div className="ticket-layout contact-ticket-layout">
        <section className="page-panel ticket-list-panel">
          <p className="eyebrow"><FiMessageCircle aria-hidden="true" /> {isAdmin ? "Member Tickets" : "My Tickets"}</p>
          <div className="ticket-toolbar">
            <label className="ticket-search-field">
              <span>Search tickets</span>
              <input
                value={ticketSearch}
                onChange={(event) => setTicketSearch(event.target.value)}
                placeholder="Ticket number, subject, status..."
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
          <div className="ticket-list">
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
                <small>
                  {isAdmin ? `${getMemberDisplayName(ticket)} - ` : ""}
                  {ticket.category} - {new Date(ticket.created_at).toLocaleString()}
                </small>
              </button>
            ))}
            {!visibleTickets.length && !loading ? (
              <div className="ticket-empty-state">
                <FiMessageCircle aria-hidden="true" />
                <strong>No tickets match this view.</strong>
                <p>{isAdmin ? "Try another status tab or clear the search field." : "Create a ticket above and your conversation will appear here."}</p>
              </div>
            ) : null}
            {loading ? <p className="muted-text">Loading tickets...</p> : null}
          </div>
        </section>

        <section className="page-panel ticket-thread-panel">
          {selectedTicket ? (
            <>
              <div className="ticket-thread-head">
                <div>
                  <p className="eyebrow">{selectedTicket.category}</p>
                  <p className="ticket-number">{getTicketNumber(selectedTicket)}</p>
                  <h2>{selectedTicket.subject}</h2>
                  {isAdmin ? <p className="muted-text">{selectedTicket.user_profiles?.email}</p> : null}
                </div>
                {isAdmin ? (
                  <select
                    className="ticket-status-select"
                    value={selectedTicket.status}
                    onChange={(event) => void updateTicketStatus(event.target.value as SupportTicketRow["status"])}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>
                ) : (
                  <span className={`chip ticket-status-chip ticket-status-${selectedTicket.status.toLowerCase()}`}>{selectedTicket.status}</span>
                )}
              </div>
              <div className="ticket-thread">
                {(selectedTicket.support_ticket_messages ?? []).map((message) => (
                  <article className={message.sender_role === "admin" ? "ticket-message admin" : "ticket-message"} key={message.id}>
                    <span className="label">
                      {message.sender_role === "admin" ? "Solid Block Link Support" : isAdmin ? getMemberDisplayName(selectedTicket) : "You"} - {new Date(message.created_at).toLocaleString()}
                    </span>
                    <p>{message.body}</p>
                  </article>
                ))}
              </div>
              {selectedTicket.status !== "Closed" ? (
                <form className="admin-settings-form ticket-reply-form" onSubmit={handleReply}>
                  <label>
                    <span>Reply</span>
                    <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} disabled={saving} />
                  </label>
                  <button className="lookup-button" type="submit" disabled={saving || !reply.trim()}>
                    <FiSend aria-hidden="true" /> {saving ? "Sending..." : "Send Reply"}
                  </button>
                </form>
              ) : (
                <p className="muted-text">This ticket is closed.</p>
              )}
            </>
          ) : (
            <div className="ticket-empty-state">
              <FiMessageCircle aria-hidden="true" />
              <strong>Select a ticket</strong>
              <p>{isAdmin ? "Choose a member ticket to view and reply." : "Create a ticket or select an existing conversation."}</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

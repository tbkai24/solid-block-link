import { useEffect, useState } from "react";
import { FiArchive, FiCheckCircle, FiMail, FiTrash2 } from "react-icons/fi";
import { useAdminAlert } from "../../hooks/useAdminAlert";
import { supabase } from "../../lib/supabase";
import { ContactMessageRow } from "../../types/supabase";

export function AdminContactMessagesPanel() {
  const [messages, setMessages] = useState<ContactMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { message, tone, showAlert } = useAdminAlert();

  async function loadMessages() {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      showAlert("danger", `${error.message}. Run the contact_messages SQL migration if needed.`);
    } else {
      setMessages((data ?? []) as ContactMessageRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadMessages();
  }, [showAlert]);

  async function updateStatus(id: string, status: ContactMessageRow["status"]) {
    if (!supabase) return showAlert("danger", "Supabase is not configured.");
    const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
    if (error) return showAlert("danger", error.message);
    setMessages((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    showAlert("success", `Message marked ${status.toLowerCase()}.`);
  }

  async function deleteMessage(id: string) {
    if (!supabase) return showAlert("danger", "Supabase is not configured.");
    const confirmed = window.confirm("Delete this contact message?");
    if (!confirmed) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) return showAlert("danger", error.message);
    setMessages((current) => current.filter((item) => item.id !== id));
    showAlert("success", "Message deleted.");
  }

  return (
    <section className="admin-panel">
      <p className="eyebrow">Contact Inbox</p>
      <h2>Contact messages</h2>
      <p className="muted-text">Read messages submitted from the public Contact Us form.</p>
      {message ? <p className={`admin-alert ${tone}`}>{message}</p> : null}

      <div className="contact-message-list">
        {messages.map((item) => (
          <article className="contact-message-card" key={item.id}>
            <div className="contact-message-head">
              <div>
                <span className={`chip ${item.status === "Unread" ? "breathing-active-chip" : ""}`}>{item.status}</span>
                <h3>{item.subject || "Contact form message"}</h3>
              </div>
              <span className="label">{new Date(item.created_at).toLocaleString()}</span>
            </div>
            <div className="contact-message-meta">
              <span><FiMail aria-hidden="true" /> {item.name}</span>
              <a href={`mailto:${item.email}`}>{item.email}</a>
            </div>
            <p>{item.message}</p>
            <div className="admin-table-actions">
              <button className="admin-inline-button" type="button" onClick={() => void updateStatus(item.id, item.status === "Read" ? "Unread" : "Read")}>
                <FiCheckCircle aria-hidden="true" /> {item.status === "Read" ? "Mark Unread" : "Mark Read"}
              </button>
              <button className="admin-inline-button" type="button" onClick={() => void updateStatus(item.id, "Archived")}>
                <FiArchive aria-hidden="true" /> Archive
              </button>
              <button className="admin-inline-button danger" type="button" onClick={() => void deleteMessage(item.id)}>
                <FiTrash2 aria-hidden="true" /> Delete
              </button>
            </div>
          </article>
        ))}
        {!messages.length && !loading ? <p className="muted-text">No contact messages yet.</p> : null}
        {loading ? <p className="muted-text">Loading contact messages...</p> : null}
      </div>
    </section>
  );
}

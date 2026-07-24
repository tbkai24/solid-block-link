import { useEffect, useState } from "react";
import { useAdminAlert } from "../../hooks/useAdminAlert";
import { supabase } from "../../lib/supabase";
import { UserProfileRow } from "../../types/supabase";

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { message, tone, showAlert } = useAdminAlert();

  async function loadUsers() {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<UserProfileRow[]>();

    if (error) showAlert("danger", error.message);
    else setUsers(data ?? []);

    setLoading(false);
  }

  useEffect(() => {
    void loadUsers();
  }, [showAlert]);

  async function updateUser(id: string, patch: Partial<Pick<UserProfileRow, "role" | "status">>) {
    if (!supabase) return showAlert("danger", "Supabase is not configured.");
    const { error } = await supabase.from("user_profiles").update(patch).eq("id", id);
    if (error) return showAlert("danger", error.message);
    setUsers((current) => current.map((user) => user.id === id ? { ...user, ...patch } : user));
    showAlert("success", "User updated.");
  }

  return (
    <section className="admin-panel">
      <p className="eyebrow">Users</p>
      <h2>User management</h2>
      <p className="muted-text">Review members, update roles, and disable access when needed.</p>
      {message ? <p className={`admin-alert ${tone}`}>{message}</p> : null}

      <div className="admin-summary-table-wrap">
        <table className="admin-summary-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Signup IP</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.display_name || "Unnamed"}</strong></td>
                <td>{user.username ? `@${user.username}` : "Not set"}</td>
                <td>{user.email}</td>
                <td>{user.signup_ip || "Not tracked"}</td>
                <td>
                  <select
                    className="admin-table-select"
                    value={user.role}
                    onChange={(event) => void updateUser(user.id, { role: event.target.value as UserProfileRow["role"] })}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <select
                    className="admin-table-select"
                    value={user.status}
                    onChange={(event) => void updateUser(user.id, { status: event.target.value as UserProfileRow["status"] })}
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!users.length && !loading ? (
              <tr>
                <td colSpan={7} className="muted-text">No users yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {loading ? <p className="muted-text">Loading users...</p> : null}
    </section>
  );
}

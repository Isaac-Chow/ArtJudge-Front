/**
 * AdminUserTable — displays users with expandable session/message details.
 *
 * Fetches paginated user list, allows clicking a user to see their
 * sessions, and clicking a session to see its messages.
 */

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  adminGetUsers,
  adminGetUserSessions,
  adminGetSessionMessages,
} from "../services/api";

export default function AdminUserTable() {
  const { idToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Expanded state
  const [expandedUser, setExpandedUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [expandedSession, setExpandedSession] = useState(null);
  const [messages, setMessages] = useState([]);

  // Fetch users on mount
  useEffect(() => {
    if (!idToken) return;
    setLoading(true);
    adminGetUsers(idToken)
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [idToken]);

  // Handle user row click
  const handleUserClick = async (uid) => {
    if (expandedUser === uid) {
      setExpandedUser(null);
      setSessions([]);
      setExpandedSession(null);
      setMessages([]);
      return;
    }

    setExpandedUser(uid);
    setExpandedSession(null);
    setMessages([]);
    try {
      const data = await adminGetUserSessions(idToken, uid);
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setSessions([]);
    }
  };

  // Handle session row click
  const handleSessionClick = async (sessionId) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      setMessages([]);
      return;
    }

    setExpandedSession(sessionId);
    try {
      const data = await adminGetSessionMessages(idToken, sessionId);
      setMessages(data);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setMessages([]);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (loading) return <p className="admin-loading">Loading users...</p>;
  if (error) return <p className="admin-error">Error: {error}</p>;
  if (users.length === 0) return <p className="admin-empty">No users yet.</p>;

  return (
    <div className="admin-table-wrapper">
      <h2>Subscribed Users ({users.length})</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Sessions</th>
            <th>Last Seen</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <>
              <tr
                key={u.uid}
                className={`admin-user-row ${expandedUser === u.uid ? "expanded" : ""}`}
                onClick={() => handleUserClick(u.uid)}
              >
                <td>{u.display_name || "—"}</td>
                <td>{u.email || "—"}</td>
                <td>
                  <span className="admin-badge">{u.session_count || 0}</span>
                </td>
                <td>{formatDate(u.last_seen)}</td>
                <td>{formatDate(u.created_at)}</td>
              </tr>

              {/* Sessions for expanded user */}
              {expandedUser === u.uid && (
                <tr className="admin-sessions-row">
                  <td colSpan={5}>
                    <div className="admin-sessions-panel">
                      <h3>Sessions</h3>
                      {sessions.length === 0 ? (
                        <p>No sessions found.</p>
                      ) : (
                        <table className="admin-table admin-sessions-table">
                          <thead>
                            <tr>
                              <th>Session ID</th>
                              <th>Messages</th>
                              <th>Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sessions.map((s) => (
                              <>
                                <tr
                                  key={s.session_id}
                                  className={`admin-session-row ${expandedSession === s.session_id ? "expanded" : ""}`}
                                  onClick={() =>
                                    handleSessionClick(s.session_id)
                                  }
                                >
                                  <td className="session-id-cell">
                                    {s.session_id.slice(0, 8)}...
                                  </td>
                                  <td>
                                    <span className="admin-badge">
                                      {s.message_count || 0}
                                    </span>
                                  </td>
                                  <td>{formatDate(s.created_at)}</td>
                                </tr>

                                {/* Messages for expanded session */}
                                {expandedSession === s.session_id && (
                                  <tr className="admin-messages-row">
                                    <td colSpan={3}>
                                      <div className="admin-messages-panel">
                                        <h4>Messages</h4>
                                        {messages.length === 0 ? (
                                          <p>No messages.</p>
                                        ) : (
                                          <div className="admin-message-list">
                                            {messages.map((m, i) => (
                                              <div
                                                key={i}
                                                className={`admin-message ${m.role}`}
                                              >
                                                <span className="admin-message-role">
                                                  {m.role}:
                                                </span>{" "}
                                                {m.text}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

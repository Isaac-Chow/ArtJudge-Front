import { useState, useEffect, useCallback } from "react";
import { getUserSessions } from "../services/api";
import { useAuth } from "../context/AuthContext";

/**
 * Format a date string to a friendly relative format.
 * Shows "Today", "Yesterday", or a short date for older sessions.
 */
function formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
        return "Yesterday";
    } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatHistory({
    currentSessionId,
    onSelectSession,
    onNewChat,
    isOpen,
    onToggle,
}) {
    const { idToken } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchSessions = useCallback(async () => {
        if (!idToken) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getUserSessions(idToken);
            setSessions(data || []);
        } catch (err) {
            console.error("Failed to fetch sessions:", err);
            setError("Failed to load history");
        } finally {
            setLoading(false);
        }
    }, [idToken]);

    // Fetch on mount and when sidebar opens
    useEffect(() => {
        if (isOpen && idToken) {
            fetchSessions();
        }
    }, [isOpen, idToken, fetchSessions]);

    // Allow parent to trigger a refresh (e.g., after a new title arrives)
    useEffect(() => {
        const handler = () => fetchSessions();
        window.addEventListener("refresh-sessions", handler);
        return () => window.removeEventListener("refresh-sessions", handler);
    }, [fetchSessions]);

    return (
        <>
            {/* Toggle button — always visible */}
            <button
                className={`sidebar-toggle ${isOpen ? "open" : ""}`}
                onClick={onToggle}
                title={isOpen ? "Hide history" : "Show history"}
                aria-label="Toggle chat history"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isOpen ? (
                        <path d="M15 18l-6-6 6-6" />
                    ) : (
                        <>
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </>
                    )}
                </svg>
            </button>

            {/* Sidebar panel */}
            <aside className={`chat-history-sidebar ${isOpen ? "open" : ""}`}>
                <div className="sidebar-header">
                    <h3>Chat History</h3>
                    <button className="new-chat-btn" onClick={onNewChat} title="Start a new chat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Chat
                    </button>
                </div>

                <div className="sidebar-sessions">
                    {loading && sessions.length === 0 && (
                        <div className="sidebar-loading">Loading...</div>
                    )}

                    {error && (
                        <div className="sidebar-error">
                            <span>{error}</span>
                            <button onClick={fetchSessions}>Retry</button>
                        </div>
                    )}

                    {!loading && !error && sessions.length === 0 && (
                        <div className="sidebar-empty">
                            No conversations yet.
                            <br />
                            Start chatting to see your history here!
                        </div>
                    )}

                    {sessions.map((session) => (
                        <button
                            key={session.session_id}
                            className={`session-item ${session.session_id === currentSessionId ? "active" : ""
                                }`}
                            onClick={() => onSelectSession(session.session_id)}
                            title={session.title || "Untitled chat"}
                        >
                            <span className="session-title">
                                {session.title || "New Chat"}
                            </span>
                            <span className="session-meta">
                                {session.message_count} msgs · {formatDate(session.updated_at || session.created_at)}
                            </span>
                        </button>
                    ))}
                </div>
            </aside>
        </>
    );
}

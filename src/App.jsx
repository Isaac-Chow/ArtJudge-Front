/**
 * App.jsx — Root component for ArtJudge.
 *
 * - Not authenticated → login screen
 * - Authenticated     → chat interface (with streaming + chat history sidebar)
 * - /admin-console    → admin dashboard (requires admin email)
 */

import { useState, useCallback, useRef } from "react";
import { Routes, Route } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { sendMessageStream, getSessionMessages } from "./services/api";
import LoginButton from "./components/LoginButton";
import ChatWindow from "./components/ChatWindow";
import MessageInput from "./components/MessageInput";
import ChatHistory from "./components/ChatHistory";
import AdminConsole from "./pages/AdminConsole";

function AppContent() {
  const { user, idToken, loading, logout } = useAuth();

  // Session ID — mutable so we can switch between sessions
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track the index of the currently streaming message so we can update it
  const streamingIndexRef = useRef(null);

  /**
   * Load a previous session's messages into the chat window.
   */
  const handleSelectSession = useCallback(
    async (targetSessionId) => {
      if (targetSessionId === sessionId || isLoading) return;

      setSessionId(targetSessionId);
      setMessages([]);
      setIsLoading(true);

      try {
        const rawMessages = await getSessionMessages(idToken, targetSessionId);
        // Transform DB messages into the format the UI expects
        const uiMessages = (rawMessages || []).map((m) => ({
          role: m.role === "agent" ? "agent" : "user",
          text: m.text,
          art_classification: m.metadata?.art_classification || null,
          sources: m.metadata?.sources || null,
          image: m.metadata?.image || null,
        }));
        setMessages(uiMessages);
      } catch (err) {
        console.error("Failed to load session:", err);
        setMessages([
          {
            role: "agent",
            text: "Sorry, I couldn't load that conversation. Please try again.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [idToken, sessionId, isLoading]
  );

  /**
   * Start a brand-new chat session.
   */
  const handleNewChat = useCallback(() => {
    if (isLoading) return;
    setSessionId(uuidv4());
    setMessages([]);
    streamingIndexRef.current = null;
  }, [isLoading]);

  /**
   * Send a message to the agent and stream the response.
   */
  const handleSend = useCallback(
    async ({ text, image, imageBase64 }) => {
      // Optimistic: add user message immediately
      const userMsg = {
        role: "user",
        text,
        image: image || null,
      };
      setMessages((prev) => [...prev, userMsg]);

      // Add an empty agent message that will be filled by streaming
      const agentMsgIndex = messages.length + 1; // after user msg is added
      streamingIndexRef.current = agentMsgIndex;

      setMessages((prev) => [
        ...prev,
        { role: "agent", text: "", streaming: true },
      ]);
      setIsLoading(true);

      try {
        await sendMessageStream(text, sessionId, imageBase64, idToken, {
          onThinking: (status) => {
            setMessages((prev) => {
              const updated = [...prev];
              const idx = streamingIndexRef.current;
              if (idx !== null && updated[idx]) {
                updated[idx] = {
                  ...updated[idx],
                  text: status,
                  thinking: true,
                };
              }
              return updated;
            });
          },
          onStart: () => {
            // Clear thinking text before streaming starts
            setMessages((prev) => {
              const updated = [...prev];
              const idx = streamingIndexRef.current;
              if (idx !== null && updated[idx]) {
                updated[idx] = { ...updated[idx], text: "", thinking: false };
              }
              return updated;
            });
          },
          onText: (delta) => {
            setMessages((prev) => {
              const updated = [...prev];
              const idx = streamingIndexRef.current;
              if (idx !== null && updated[idx]) {
                updated[idx] = {
                  ...updated[idx],
                  text: updated[idx].text + delta,
                };
              }
              return updated;
            });
          },
          onMetadata: (meta) => {
            setMessages((prev) => {
              const updated = [...prev];
              const idx = streamingIndexRef.current;
              if (idx !== null && updated[idx]) {
                updated[idx] = {
                  ...updated[idx],
                  art_classification: meta.art_classification || null,
                  sources: meta.sources || null,
                };
              }
              return updated;
            });
          },
          onTitle: (_title) => {
            // Notify the sidebar to refresh its session list
            window.dispatchEvent(new Event("refresh-sessions"));
          },
          onDone: () => {
            setMessages((prev) => {
              const updated = [...prev];
              const idx = streamingIndexRef.current;
              if (idx !== null && updated[idx]) {
                updated[idx] = { ...updated[idx], streaming: false };
              }
              return updated;
            });
            setIsLoading(false);
            streamingIndexRef.current = null;
          },
          onError: (err) => {
            setMessages((prev) => {
              const updated = [...prev];
              const idx = streamingIndexRef.current;
              if (idx !== null && updated[idx]) {
                updated[idx] = {
                  ...updated[idx],
                  text: `Something went wrong: ${err}. Please try again.`,
                  streaming: false,
                };
              }
              return updated;
            });
            setIsLoading(false);
            streamingIndexRef.current = null;
          },
        });
      } catch (err) {
        setMessages((prev) => {
          const updated = [...prev];
          const idx = streamingIndexRef.current;
          if (idx !== null && updated[idx]) {
            updated[idx] = {
              ...updated[idx],
              text: `Something went wrong: ${err.message}. Please try again.`,
              streaming: false,
            };
          }
          return updated;
        });
        setIsLoading(false);
        streamingIndexRef.current = null;
      }
    },
    [sessionId, idToken, messages.length]
  );

  // Loading state while Firebase checks auth
  if (loading) {
    return (
      <div className="login-screen">
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="login-screen">
        <h1>ArtJudge</h1>
        <p>
          Your AI-powered art style expert. Upload a painting and I will
          identify the art style, explain its history, and tell you about the
          artists who defined it.
        </p>
        <LoginButton />
      </div>
    );
  }

  // Logged in — chat interface with routing
  return (
    <Routes>
      <Route
        path="/admin-console"
        element={<AdminConsole />}
      />
      <Route
        path="*"
        element={
          <div className="app-layout">
            {/* Chat history sidebar */}
            <ChatHistory
              currentSessionId={sessionId}
              onSelectSession={handleSelectSession}
              onNewChat={handleNewChat}
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen((prev) => !prev)}
            />

            {/* Main chat area */}
            <div className="main-content">
              <header className="app-header">
                <h2>ArtJudge</h2>
                <div className="header-user">
                  {user.photoURL && (
                    <img src={user.photoURL} alt={user.displayName || "User"} />
                  )}
                  <span>{user.displayName || user.email}</span>
                  <button className="logout-btn" onClick={logout}>
                    Logout
                  </button>
                </div>
              </header>

              <div className="chat-container">
                <ChatWindow messages={messages} isLoading={false} />
                <MessageInput onSend={handleSend} disabled={isLoading} />
              </div>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

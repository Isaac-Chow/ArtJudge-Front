import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({ messages, isLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="chat-window">
      {messages.length === 0 && !isLoading && (
        <div
          style={{
            textAlign: "center",
            color: "var(--text-muted)",
            padding: "40px 20px",
          }}
        >
          <p style={{ fontSize: "1.1rem", marginBottom: 8 }}>
            Welcome to ArtJudge!
          </p>
          <p style={{ fontSize: "0.9rem" }}>
            Ask me about any art style, or upload an image and I will classify
            it for you.
          </p>
        </div>
      )}

      {messages.map((msg, idx) => (
        <MessageBubble key={idx} message={msg} />
      ))}

      {isLoading && (
        <div className="message-row agent">
          <div className="message-bubble">
            <div className="typing-indicator">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MessageBubble({ message }) {
  const { role, text, art_classification, sources, streaming, thinking } = message;

  return (
    <div className={`message-row ${role}`}>
      <div className="message-bubble">
        {/* Thinking state — pulsing indicator while agent processes */}
        {thinking ? (
          <span className="thinking-indicator">
            <span className="thinking-dot" />
            <span className="thinking-dot" />
            <span className="thinking-dot" />
            <span className="thinking-text">{text || "Thinking..."}</span>
          </span>
        ) : text ? (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            {streaming && <span className="streaming-cursor">|</span>}
          </div>
        ) : null}

        {/* Art classification card */}
        {art_classification && (
          <div className="classification-card">
            <h4>{art_classification.style_name}</h4>
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{ width: `${art_classification.confidence * 100}%` }}
              />
            </div>
            <p>
              <strong>Period:</strong> {art_classification.period}
            </p>
            <p>{art_classification.description}</p>

            {art_classification.key_features?.length > 0 && (
              <>
                <p>
                  <strong>Key Features:</strong>
                </p>
                <ul>
                  {art_classification.key_features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </>
            )}

            {art_classification.notable_artists?.length > 0 && (
              <p>
                <strong>Notable Artists:</strong>{" "}
                {art_classification.notable_artists.join(", ")}
              </p>
            )}
          </div>
        )}

        {/* Web search sources */}
        {sources && sources.length > 0 && (
          <div className="sources-list">
            <p>
              <strong>Sources:</strong>
            </p>
            <ul>
              {sources.map((url, i) => (
                <li key={i}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Attached image preview (for user messages) */}
        {message.image && (
          <div style={{ marginTop: 8 }}>
            <img
              src={message.image}
              alt="Uploaded artwork"
              style={{
                maxWidth: 200,
                maxHeight: 200,
                borderRadius: 8,
                objectFit: "cover",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

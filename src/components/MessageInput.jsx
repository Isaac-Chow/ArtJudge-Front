import { useState, useRef } from "react";

export default function MessageInput({ onSend, disabled }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null); // { file, preview, base64 }
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  const handleTextChange = (e) => {
    setText(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  // Handle image selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImage({
        file,
        preview: reader.result,
        base64: reader.result, // data:image/...;base64,... string
      });
    };
    reader.readAsDataURL(file);

    // Reset so the same file can be selected again
    e.target.value = "";
  };

  const removeImage = () => setImage(null);

  // Submit handler
  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed && !image) return;

    onSend({
      text: trimmed || "Classify this image",
      image: image?.preview || null,
      imageBase64: image?.base64 || null,
    });

    setText("");
    setImage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // Enter to send (Shift+Enter for newline)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="message-input-wrapper">
      {/* Image preview */}
      {image && (
        <div className="image-preview">
          <img src={image.preview} alt="Selected artwork" />
          <span>{image.file.name}</span>
          <button onClick={removeImage} title="Remove image">
            &times;
          </button>
        </div>
      )}

      <div className="input-row">
        {/* Attach image */}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <button
          className="icon-btn attach-btn"
          title="Attach an image"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          {/* Paperclip icon (SVG) */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Ask about art styles or upload an image..."
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />

        {/* Send */}
        <button
          className="icon-btn send-btn"
          title="Send message"
          onClick={handleSubmit}
          disabled={disabled || (!text.trim() && !image)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useAppStore } from "../stores/app-store";
import { X, Trash2, Clock } from "lucide-react";

export function HistoryPanel() {
  const {
    historyOpen,
    setHistoryOpen,
    history,
    loadHistory,
    setInputText,
    setOutputText,
    reset,
  } = useAppStore();

  if (!historyOpen) return null;

  const handleSelect = (item: (typeof history)[0]) => {
    reset();
    setInputText(item.input_text);
    setOutputText(item.output_text);
    setHistoryOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await window.morph.deleteHistoryItem(id);
    loadHistory();
  };

  const handleClearAll = async () => {
    await window.morph.clearHistory();
    loadHistory();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "Z");
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && setHistoryOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "flex-end",
        WebkitAppRegion: "no-drag" as any,
      }}
    >
      <div
        style={{
          backgroundColor: "var(--color-bg)",
          borderLeft: "1px solid var(--color-border)",
          width: 340,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 56, flexShrink: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-fg)" }}>History</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {history.length > 0 && (
              <button
                onClick={handleClearAll}
                style={{
                  fontSize: 11, fontWeight: 500, padding: "5px 12px",
                  borderRadius: 99, border: "none",
                  backgroundColor: "transparent", color: "var(--color-danger)",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Clear all
              </button>
            )}
            <button
              onClick={() => setHistoryOpen(false)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: 8,
                border: "none", backgroundColor: "transparent",
                color: "var(--color-fg-muted)", cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: "var(--color-border-subtle)" }} />

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {history.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 16,
                backgroundColor: "var(--color-surface)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Clock size={20} style={{ color: "var(--color-fg-muted)" }} />
              </div>
              <span style={{ fontSize: 13, color: "var(--color-fg-muted)" }}>No rewrites yet</span>
            </div>
          ) : (
            <div style={{ padding: "8px 0" }}>
              {history.map((item) => (
                <HistoryItem
                  key={item.id}
                  item={item}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryItem({
  item,
  onSelect,
  onDelete,
  formatDate,
}: {
  item: any;
  onSelect: (item: any) => void;
  onDelete: (e: React.MouseEvent, id: number) => void;
  formatDate: (date: string) => string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onSelect(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "14px 24px",
        border: "none",
        backgroundColor: hovered ? "var(--color-surface)" : "transparent",
        cursor: "pointer",
        transition: "background-color 0.15s",
        fontFamily: "inherit",
        display: "block",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <p style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: hovered ? "var(--color-fg)" : "var(--color-fg-secondary)",
          transition: "color 0.15s",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          flex: 1,
        }}>
          {item.input_text.slice(0, 140)}{item.input_text.length > 140 ? "..." : ""}
        </p>
        {hovered && (
          <button
            onClick={(e) => onDelete(e, item.id)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              border: "none", backgroundColor: "transparent",
              color: "var(--color-fg-muted)", cursor: "pointer",
            }}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <p style={{ fontSize: 11, color: "var(--color-fg-muted)", marginTop: 6, fontWeight: 500 }}>
        {formatDate(item.created_at)}
      </p>
    </button>
  );
}

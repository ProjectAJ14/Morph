import { useState } from "react";
import { useAppStore } from "../stores/app-store";
import { X, Trash2, Clock, Check } from "lucide-react";
import type { RewriteRecord, Target } from "../types/morph";

export function HistoryPanel() {
  const { historyOpen, setHistoryOpen, history, loadHistory } = useAppStore();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  if (!historyOpen) return null;

  // Panel stays open — the check mark is the only signal that the clipboard changed.
  const handleSelect = async (item: RewriteRecord) => {
    await window.morph.writeClipboardFormatted(item.output_text, (item.target as Target) || "generic");
    setCopiedId(item.id);
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

  return (
    <div
      className="scrim scrim--right"
      onClick={(e) => e.target === e.currentTarget && setHistoryOpen(false)}
    >
      <div className="drawer">
        <div className="overlay-head">
          <h2 className="h2">History</h2>
          <div className="overlay-actions">
            {history.length > 0 && (
              <button className="link-btn link-btn--danger" onClick={handleClearAll}>
                Clear all
              </button>
            )}
            <button className="icon-btn" onClick={() => setHistoryOpen(false)} aria-label="Close">
              <X size={15} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className="rule" />

        <div className="history-list">
          {history.length === 0 ? (
            <div className="empty">
              <span className="empty__mark">
                <Clock size={18} strokeWidth={1.8} />
              </span>
              <span className="hint">Nothing formatted yet</span>
            </div>
          ) : (
            history.map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                copied={copiedId === item.id}
                onSelect={handleSelect}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "Z");
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function HistoryItem({
  item,
  copied,
  onSelect,
  onDelete,
}: {
  item: RewriteRecord;
  copied: boolean;
  onSelect: (item: RewriteRecord) => void;
  onDelete: (e: React.MouseEvent, id: number) => void;
}) {
  // Two sibling buttons, not one nested in the other: nesting is invalid and
  // the only way out of it is a div that the keyboard cannot reach.
  return (
    <div className="history-item">
      <button className="history-item__open" onClick={() => onSelect(item)}>
        <span className="history-item__text">
          {item.input_text.slice(0, 140)}
          {item.input_text.length > 140 ? "…" : ""}
        </span>
        <span className="history-item__meta">
          <span className="eyebrow">{item.target || "generic"}</span>
          <span className="eyebrow">{formatDate(item.created_at)}</span>
          {copied && (
            <span className="eyebrow copied">
              <Check size={10} strokeWidth={2.4} /> copied
            </span>
          )}
        </span>
      </button>
      <button
        className="history-item__del"
        aria-label="Delete this entry"
        onClick={(e) => onDelete(e, item.id)}
      >
        <Trash2 size={13} strokeWidth={1.8} />
      </button>
    </div>
  );
}

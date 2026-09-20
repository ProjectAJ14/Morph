import { useAppStore } from "../stores/app-store";
import { Slack, FileText, Loader2, Check, AlertCircle } from "lucide-react";
import type { Target } from "../types/morph";

/** Microsoft Teams mark — lucide has no Teams icon. Sized a touch under the
 *  line icons beside it: a solid glyph carries more optical weight at a
 *  matching box. */
function TeamsIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.6 7.9a2.3 2.3 0 1 0-2.3-2.3 2.3 2.3 0 0 0 2.3 2.3Zm-6.9-.6a2.9 2.9 0 1 0-2.9-2.9 2.9 2.9 0 0 0 2.9 2.9ZM24 9.5v5.3a3.6 3.6 0 0 1-3.6 3.6 3.9 3.9 0 0 1-.7-.1 6 6 0 0 1-5.4 3.4 6 6 0 0 1-5.9-5H1.1A1.1 1.1 0 0 1 0 15.6V8.4a1.1 1.1 0 0 1 1.1-1.1h7.3V9h-2.8v8h-2.2V9H1.9v5.9h6.6a6 6 0 0 1 5.8-5.4 6 6 0 0 1 3 .8v-.8ZM17 12v6.3a4.1 4.1 0 0 0 1.5-2.5V12Zm5.1 0h-3.3v4.6h1.6A1.8 1.8 0 0 0 22.1 15Z" />
    </svg>
  );
}

/* No per-target brand hue: the mark and the label already say which app this
   is, and a second hue on the chrome would read as state rather than identity.
   Colour here is spent only on working / done. */
const TARGETS: { id: Target; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: "slack", label: "Slack", hint: "mrkdwn, code blocks for tables", icon: <Slack size={20} strokeWidth={1.8} /> },
  { id: "teams", label: "Teams", hint: "rich text with real tables", icon: <TeamsIcon /> },
  { id: "generic", label: "Generic", hint: "clean standard Markdown", icon: <FileText size={20} strokeWidth={1.8} /> },
];

export function FormatView() {
  const { status, runFormat, config, setSettingsOpen } = useAppStore();
  const working = status.kind === "working";
  const needsKey = config && !config.providers[config.activeProvider]?.apiKeySet;

  return (
    <div className="view">
      <div className="view__head">
        <h1 className="h1">Format clipboard</h1>
        <p className="sub">
          Copy your message, pick where it's going. The formatted version replaces your clipboard.
        </p>
      </div>

      {needsKey ? (
        <button className="notice" onClick={() => setSettingsOpen(true)}>
          <AlertCircle size={15} className="notice__icon" />
          No {config?.providerLabels[config.activeProvider]} API key — open settings to add one
        </button>
      ) : (
        <>
          <span className="eyebrow">Send to</span>
          <div className="targets">
            {TARGETS.map((t) => {
              const isThis =
                (status.kind === "working" || status.kind === "done") && status.target === t.id;
              const phase = isThis
                ? status.kind === "working"
                  ? "is-working"
                  : "is-done"
                : "is-idle";
              return (
                <button
                  key={t.id}
                  className={`target ${phase}`}
                  onClick={() => runFormat(t.id)}
                  disabled={working}
                >
                  <span className="target__icon">{t.icon}</span>
                  <span className="target__body">
                    <span className="target__label">{t.label}</span>
                    <span className="target__hint">{t.hint}</span>
                  </span>
                  <span className="target__status">
                    {isThis && status.kind === "working" && <Loader2 size={14} className="spin" />}
                    {isThis && status.kind === "done" && <Check size={15} strokeWidth={2.2} />}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {status.kind === "error" && (
        <div className="notice">
          <AlertCircle size={14} className="notice__icon" />
          {status.message}
        </div>
      )}
    </div>
  );
}

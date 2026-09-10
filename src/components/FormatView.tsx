import { useAppStore } from "../stores/app-store";
import { Slack, FileText, Loader2, Check, AlertCircle } from "lucide-react";
import type { Target } from "../types/morph";

/** Microsoft Teams mark — lucide has no Teams icon. */
function TeamsIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.6 7.9a2.3 2.3 0 1 0-2.3-2.3 2.3 2.3 0 0 0 2.3 2.3Zm-6.9-.6a2.9 2.9 0 1 0-2.9-2.9 2.9 2.9 0 0 0 2.9 2.9ZM24 9.5v5.3a3.6 3.6 0 0 1-3.6 3.6 3.9 3.9 0 0 1-.7-.1 6 6 0 0 1-5.4 3.4 6 6 0 0 1-5.9-5H1.1A1.1 1.1 0 0 1 0 15.6V8.4a1.1 1.1 0 0 1 1.1-1.1h7.3V9h-2.8v8h-2.2V9H1.9v5.9h6.6a6 6 0 0 1 5.8-5.4 6 6 0 0 1 3 .8v-.8ZM17 12v6.3a4.1 4.1 0 0 0 1.5-2.5V12Zm5.1 0h-3.3v4.6h1.6A1.8 1.8 0 0 0 22.1 15Z" />
    </svg>
  );
}

const TARGETS: { id: Target; label: string; hint: string; color: string; glow: string; icon: React.ReactNode }[] = [
  { id: "slack", label: "Slack", hint: "mrkdwn, code blocks for tables", color: "#36C5F0", glow: "54 197 240", icon: <Slack size={22} strokeWidth={1.8} /> },
  { id: "teams", label: "Teams", hint: "rich text with real tables", color: "#6264A7", glow: "98 100 167", icon: <TeamsIcon /> },
  { id: "generic", label: "Generic", hint: "clean standard Markdown", color: "#8b8b95", glow: "139 139 149", icon: <FileText size={22} strokeWidth={1.8} /> },
];

export function FormatView() {
  const { status, runFormat, config, setSettingsOpen } = useAppStore();
  const working = status.kind === "working";
  const needsKey = config && !config.providers[config.activeProvider]?.apiKeySet;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 10,
        padding: "0 28px 28px",
        minHeight: 0,
      }}
    >
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-fg)" }}>Format clipboard</div>
        <div style={{ fontSize: 12.5, color: "var(--color-fg-muted)", marginTop: 3 }}>
          Copy your message, pick where it's going. The formatted version replaces your clipboard.
        </div>
      </div>

      {needsKey ? (
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px solid var(--color-border)",
            backgroundColor: "var(--color-danger-ghost)",
            color: "var(--color-fg-secondary)",
            fontSize: 13,
            fontFamily: "inherit",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <AlertCircle size={16} color="var(--color-danger)" />
          No {config?.providerLabels[config.activeProvider]} API key — open settings to add one
        </button>
      ) : (
        TARGETS.map((t) => {
          const isThis = (status.kind === "working" || status.kind === "done") && status.target === t.id;
          const phase = isThis ? (status.kind === "working" ? "is-working" : "is-done") : "";
          return (
            <button
              key={t.id}
              onClick={() => runFormat(t.id)}
              disabled={working}
              className={`fmt-btn ${phase}`}
              style={{
                ["--glow-rgb" as any]: t.glow,
                display: "flex",
                alignItems: "center",
                gap: 14,
                width: "100%",
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid var(--color-border-subtle)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-fg)",
                cursor: working ? "default" : "pointer",
                opacity: working && !isThis ? 0.4 : 1,
                fontFamily: "inherit",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (!working) e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-surface)";
              }}
            >
              <span className="fmt-icon" style={{ color: t.color, display: "flex", flexShrink: 0 }}>
                {t.icon}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 550 }}>{t.label}</span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--color-fg-muted)", marginTop: 2 }}>
                  {t.hint}
                </span>
              </span>
              <span
                style={{
                  width: 18,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isThis && status.kind === "working" && (
                  <Loader2 size={15} color={t.color} className="spin" />
                )}
                {isThis && status.kind === "done" && <Check size={16} color="var(--color-success)" />}
              </span>
            </button>
          );
        })
      )}

      {status.kind === "error" && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginTop: 4,
            padding: "10px 12px",
            borderRadius: 10,
            backgroundColor: "var(--color-danger-ghost)",
            fontSize: 12.5,
            color: "var(--color-fg-secondary)",
            lineHeight: 1.45,
          }}
        >
          <AlertCircle size={14} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 2 }} />
          {status.message}
        </div>
      )}
    </div>
  );
}

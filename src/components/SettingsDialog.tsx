import { useAppStore } from "../stores/app-store";
import { X, Check } from "lucide-react";
import { useState, useEffect } from "react";
import type { ProviderId, Target } from "../types/morph";

const PROVIDER_IDS: ProviderId[] = ["anthropic", "groq"];
const KEY_PLACEHOLDER: Record<ProviderId, string> = { anthropic: "sk-ant-...", groq: "gsk_..." };
const KEY_SOURCE: Record<ProviderId, string> = {
  anthropic: "console.anthropic.com",
  groq: "console.groq.com",
};

const TARGETS: { id: Target; label: string }[] = [
  { id: "slack", label: "Slack" },
  { id: "teams", label: "Teams" },
  { id: "generic", label: "Generic" },
];

type Tab = "providers" | "prompts" | "general";

const fieldInput: React.CSSProperties = {
  width: "100%",
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border-subtle)",
  borderRadius: 12,
  padding: "12px 16px",
  fontSize: 13,
  color: "var(--color-fg)",
  outline: "none",
  fontFamily: "inherit",
  transition: "all 0.15s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--color-fg-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 10,
};

export function SettingsDialog() {
  const { settingsOpen, setSettingsOpen, config, loadConfig } = useAppStore();
  const [tab, setTab] = useState<Tab>("providers");
  const [activeProvider, setActiveProvider] = useState<ProviderId>("anthropic");
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, string>>({});
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [promptTarget, setPromptTarget] = useState<Target>("slack");
  const [shortcut, setShortcut] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settingsOpen && config) {
      setActiveProvider(config.activeProvider);
      setKeys({});
      setModels(Object.fromEntries(PROVIDER_IDS.map((id) => [id, config.providers[id].model])));
      setPrompts({ ...config.prompts });
      setShortcut(config.globalShortcut);
      setError(null);
    }
  }, [settingsOpen, config]);

  if (!settingsOpen || !config) return null;

  const isDefaultPrompt = prompts[promptTarget] === config.defaultPrompts[promptTarget];

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await window.morph.setConfig({
        activeProvider,
        globalShortcut: shortcut,
        prompts,
        providers: Object.fromEntries(
          // An empty apiKey tells main to keep the stored one.
          PROVIDER_IDS.map((id) => [id, { model: models[id], apiKey: (keys[id] ?? "").trim() }])
        ),
      });
      await loadConfig();
      setSettingsOpen(false);
    } catch (err: any) {
      setError(err?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && setSettingsOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        WebkitAppRegion: "no-drag",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: 20,
          width: 480,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 28px 16px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-fg)" }}>Settings</h2>
          <button
            onClick={() => setSettingsOpen(false)}
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

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "0 28px 14px" }}>
          {([["providers", "Providers"], ["prompts", "Prompts"], ["general", "General"]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 550,
                borderRadius: 99,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                backgroundColor: tab === id ? "var(--color-surface-hover)" : "transparent",
                color: tab === id ? "var(--color-fg)" : "var(--color-fg-muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ height: 1, backgroundColor: "var(--color-border-subtle)" }} />

        {/* Body */}
        <div style={{ padding: "22px 28px", overflowY: "auto", flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {tab === "providers" && (
              <>
                <div>
                  <label style={labelStyle}>Active provider</label>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${PROVIDER_IDS.length}, 1fr)`, gap: 10 }}>
                    {PROVIDER_IDS.map((id) => {
                      const on = activeProvider === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setActiveProvider(id)}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                            padding: "12px 14px", borderRadius: 12, fontSize: 13, fontWeight: 550,
                            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                            border: on ? "1px solid rgba(124, 92, 252, 0.3)" : "1px solid var(--color-border-subtle)",
                            backgroundColor: on ? "var(--color-primary-ghost)" : "var(--color-surface)",
                            color: on ? "var(--color-primary)" : "var(--color-fg-secondary)",
                          }}
                        >
                          {config.providerLabels[id]}
                          {on && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {PROVIDER_IDS.map((id) => (
                  <div
                    key={id}
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      border: "1px solid var(--color-border-subtle)",
                      backgroundColor: activeProvider === id ? "var(--color-surface)" : "transparent",
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg)" }}>
                        {config.providerLabels[id]}
                      </span>
                      {config.providers[id].apiKeySet ? (
                        <span style={{ fontSize: 11, color: "var(--color-success)" }}>
                          key saved {config.providers[id].apiKey}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--color-fg-muted)" }}>no key</span>
                      )}
                    </div>

                    <input
                      type="password"
                      value={keys[id] ?? ""}
                      onChange={(e) => setKeys({ ...keys, [id]: e.target.value })}
                      placeholder={
                        config.providers[id].apiKeySet
                          ? "Leave blank to keep current key"
                          : `${KEY_PLACEHOLDER[id]}  —  from ${KEY_SOURCE[id]}`
                      }
                      style={fieldInput}
                    />

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {config.providerModels[id].map((m) => {
                        const on = models[id] === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => setModels({ ...models, [id]: m.id })}
                            style={{
                              padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 500,
                              cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                              border: on ? "1px solid rgba(124, 92, 252, 0.3)" : "1px solid var(--color-border-subtle)",
                              backgroundColor: on ? "var(--color-primary-ghost)" : "var(--color-surface-hover)",
                              color: on ? "var(--color-primary)" : "var(--color-fg-secondary)",
                            }}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}

            {tab === "prompts" && (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  {TARGETS.map((t) => {
                    const on = promptTarget === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setPromptTarget(t.id)}
                        style={{
                          flex: 1, padding: "9px 12px", borderRadius: 10, fontSize: 12, fontWeight: 550,
                          cursor: "pointer", fontFamily: "inherit",
                          border: on ? "1px solid rgba(124, 92, 252, 0.3)" : "1px solid var(--color-border-subtle)",
                          backgroundColor: on ? "var(--color-primary-ghost)" : "var(--color-surface)",
                          color: on ? "var(--color-primary)" : "var(--color-fg-secondary)",
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={prompts[promptTarget] ?? ""}
                  onChange={(e) => setPrompts({ ...prompts, [promptTarget]: e.target.value })}
                  rows={14}
                  style={{ ...fieldInput, resize: "none", lineHeight: 1.6, fontSize: 12.5 }}
                />
                <button
                  onClick={() => setPrompts({ ...prompts, [promptTarget]: config.defaultPrompts[promptTarget] })}
                  disabled={isDefaultPrompt}
                  style={{
                    alignSelf: "flex-start", marginTop: -12, padding: "6px 10px", borderRadius: 8, fontSize: 11,
                    fontFamily: "inherit", border: "1px solid var(--color-border-subtle)",
                    backgroundColor: "var(--color-surface)", color: "var(--color-fg-secondary)",
                    cursor: isDefaultPrompt ? "default" : "pointer", opacity: isDefaultPrompt ? 0.45 : 1,
                  }}
                >
                  Reset to default
                </button>
                <p style={{ fontSize: 11, color: "var(--color-fg-muted)", marginTop: 0 }}>
                  Your clipboard text is sent as the user message. Output should be Markdown — Morph converts it
                  to rich text on the clipboard.
                </p>
              </>
            )}

            {tab === "general" && (
              <div>
                <label style={labelStyle}>Global shortcut</label>
                <input
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  style={{ ...fieldInput, fontFamily: "SF Mono, Menlo, monospace" }}
                />
                <p style={{ fontSize: 11, color: "var(--color-fg-muted)", marginTop: 8 }}>
                  Format: CommandOrControl+Shift+M
                </p>
              </div>
            )}

            {error && (
              <div style={{
                padding: "12px 16px",
                backgroundColor: "var(--color-danger-ghost)",
                border: "1px solid rgba(240, 68, 56, 0.1)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--color-danger)",
              }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ height: 1, backgroundColor: "var(--color-border-subtle)" }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: "18px 28px" }}>
          <button
            onClick={() => setSettingsOpen(false)}
            style={{
              padding: "10px 20px", fontSize: 12, fontWeight: 500,
              borderRadius: 99, border: "1px solid var(--color-border)",
              backgroundColor: "transparent", color: "var(--color-fg-secondary)",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 24px", fontSize: 12, fontWeight: 600,
              borderRadius: 99, border: "none",
              backgroundColor: "var(--color-primary)", color: "var(--color-primary-fg)",
              cursor: "pointer", fontFamily: "inherit",
              opacity: saving ? 0.5 : 1,
              boxShadow: "0 0 16px rgba(124, 92, 252, 0.2)",
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

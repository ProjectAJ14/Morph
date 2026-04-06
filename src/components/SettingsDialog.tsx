import { useAppStore } from "../stores/app-store";
import { X } from "lucide-react";
import { useState, useEffect } from "react";

const MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
  { id: "gemma2-9b-it", label: "Gemma 2 9B" },
];

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
  const [apiKey, setApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settingsOpen && config) {
      setApiKey("");
      setSystemPrompt(config.systemPrompt);
      setModel(config.model);
      setShortcut(config.globalShortcut);
      setError(null);
    }
  }, [settingsOpen, config]);

  if (!settingsOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updates: Record<string, unknown> = { systemPrompt, model, globalShortcut: shortcut };
      if (apiKey.trim()) updates.groqApiKey = apiKey.trim();
      await window.morph.setConfig(updates);
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
        WebkitAppRegion: "no-drag" as any,
      }}
    >
      <div
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: 20,
          width: 460,
          maxHeight: "85vh",
          overflow: "hidden",
          boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 28px 20px" }}>
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

        <div style={{ height: 1, backgroundColor: "var(--color-border-subtle)", margin: "0 28px" }} />

        {/* Body */}
        <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "calc(85vh - 150px)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* API Key */}
            <div>
              <label style={labelStyle}>Groq API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={config?.groqApiKeySet ? "Leave blank to keep current key" : "gsk_..."}
                style={fieldInput}
              />
              <p style={{ fontSize: 11, color: "var(--color-fg-muted)", marginTop: 8 }}>
                Get your key at console.groq.com
              </p>
            </div>

            {/* System Prompt */}
            <div>
              <label style={labelStyle}>System Prompt</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={4}
                style={{ ...fieldInput, resize: "none", lineHeight: 1.6 }}
              />
            </div>

            {/* Model */}
            <div>
              <label style={labelStyle}>Model</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500,
                      textAlign: "left" as const,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                      border: model === m.id ? "1px solid rgba(124, 92, 252, 0.3)" : "1px solid var(--color-border-subtle)",
                      backgroundColor: model === m.id ? "var(--color-primary-ghost)" : "var(--color-surface)",
                      color: model === m.id ? "var(--color-primary)" : "var(--color-fg-secondary)",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Global Shortcut */}
            <div>
              <label style={labelStyle}>Global Shortcut</label>
              <input
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
                style={{ ...fieldInput, fontFamily: "SF Mono, Menlo, monospace" }}
              />
              <p style={{ fontSize: 11, color: "var(--color-fg-muted)", marginTop: 8 }}>
                Format: CommandOrControl+Shift+M
              </p>
            </div>

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
        <div style={{ height: 1, backgroundColor: "var(--color-border-subtle)", margin: "0 28px" }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: "20px 28px" }}>
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

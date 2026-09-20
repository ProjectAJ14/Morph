import { useState, useEffect } from "react";
import { useAppStore } from "../stores/app-store";
import { X, Check } from "lucide-react";
import { applyGround, readGround, type Ground } from "../lib/ground";
import type { ProviderId, Target } from "../types/morph";

const PROVIDER_IDS: ProviderId[] = ["anthropic", "groq", "azure"];
const KEY_PLACEHOLDER: Record<ProviderId, string> = {
  anthropic: "sk-ant-...",
  groq: "gsk_...",
  azure: "azure openai key",
};
const KEY_SOURCE: Record<ProviderId, string> = {
  anthropic: "console.anthropic.com",
  groq: "console.groq.com",
  azure: "portal.azure.com",
};

const TARGETS: { id: Target; label: string }[] = [
  { id: "slack", label: "Slack" },
  { id: "teams", label: "Teams" },
  { id: "generic", label: "Generic" },
];

const GROUNDS: { id: Ground; label: string; hint: string }[] = [
  { id: "ink", label: "Ink", hint: "warm dark" },
  { id: "paper", label: "Paper", hint: "warm light" },
];

const TABS = [
  ["providers", "Providers"],
  ["prompts", "Prompts"],
  ["general", "General"],
] as const;

type Tab = (typeof TABS)[number][0];

export function SettingsDialog() {
  const { settingsOpen, setSettingsOpen, config, loadConfig } = useAppStore();
  const [tab, setTab] = useState<Tab>("providers");
  const [activeProvider, setActiveProvider] = useState<ProviderId>("anthropic");
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, string>>({});
  // Azure needs the resource URL and, when the resource rejects the built-in default, an
  // api-version. Neither is a secret, so both round-trip in full.
  const [endpoint, setEndpoint] = useState("");
  const [apiVersion, setApiVersion] = useState("");
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [promptTarget, setPromptTarget] = useState<Target>("slack");
  const [shortcut, setShortcut] = useState("");
  // The ground applies instantly and persists itself — it is not part of the
  // config payload, so it never waits on Save.
  const [ground, setGround] = useState<Ground>(readGround);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settingsOpen && config) {
      setActiveProvider(config.activeProvider);
      setKeys({});
      setModels(Object.fromEntries(PROVIDER_IDS.map((id) => [id, config.providers[id].model])));
      setEndpoint(config.providers.azure.endpoint);
      setApiVersion(config.providers.azure.apiVersion);
      setPrompts({ ...config.prompts });
      setShortcut(config.globalShortcut);
      setGround(readGround());
      setError(null);
    }
  }, [settingsOpen, config]);

  if (!settingsOpen || !config) return null;

  const isDefaultPrompt = prompts[promptTarget] === config.defaultPrompts[promptTarget];

  const chooseGround = (next: Ground) => {
    setGround(next);
    applyGround(next);
  };

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
          PROVIDER_IDS.map((id) => [
            id,
            {
              model: models[id],
              apiKey: (keys[id] ?? "").trim(),
              ...(id === "azure" ? { endpoint: endpoint.trim(), apiVersion: apiVersion.trim() } : {}),
            },
          ])
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
      className="scrim scrim--center"
      onClick={(e) => e.target === e.currentTarget && setSettingsOpen(false)}
    >
      <div className="dialog">
        <div className="overlay-head">
          <h2 className="h2">Settings</h2>
          <button className="icon-btn" onClick={() => setSettingsOpen(false)} aria-label="Close">
            <X size={15} strokeWidth={1.8} />
          </button>
        </div>

        <div className="tabs">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              className={`tab ${tab === id ? "is-on" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rule" />

        <div className="overlay-body">
          {tab === "providers" && (
            <>
              <div className="field">
                <span className="eyebrow">Active provider</span>
                <div className="choice-row">
                  {PROVIDER_IDS.map((id) => (
                    <button
                      key={id}
                      className={`choice ${activeProvider === id ? "is-on" : ""}`}
                      onClick={() => setActiveProvider(id)}
                    >
                      {config.providerLabels[id]}
                      {activeProvider === id && <Check size={13} strokeWidth={2.2} />}
                    </button>
                  ))}
                </div>
              </div>

              {PROVIDER_IDS.map((id) => (
                <div key={id} className={`card ${activeProvider === id ? "is-active" : ""}`}>
                  <div className="card__head">
                    <span className="card__title">{config.providerLabels[id]}</span>
                    {config.providers[id].apiKeySet ? (
                      <>
                        <span className="eyebrow eyebrow--spot">key saved</span>
                        {/* Not an .eyebrow: uppercasing a masked key misstates
                            the characters it is actually showing. */}
                        <span className="hint mono">{config.providers[id].apiKey}</span>
                      </>
                    ) : (
                      <span className="eyebrow">no key</span>
                    )}
                  </div>

                  <input
                    className="input"
                    type="password"
                    value={keys[id] ?? ""}
                    onChange={(e) => setKeys({ ...keys, [id]: e.target.value })}
                    placeholder={
                      config.providers[id].apiKeySet
                        ? "Leave blank to keep current key"
                        : `${KEY_PLACEHOLDER[id]}  —  from ${KEY_SOURCE[id]}`
                    }
                  />

                  {/* Four stacked inputs, so each one is labelled: a placeholder disappears
                      the moment it is filled, and these are not guessable from their values. */}
                  {id === "azure" && (
                    <>
                      <div className="field">
                        <span className="eyebrow">Endpoint</span>
                        <input
                          className="input"
                          value={endpoint}
                          onChange={(e) => setEndpoint(e.target.value)}
                          placeholder="https://your-resource.openai.azure.com"
                        />
                      </div>
                      <div className="field">
                        <span className="eyebrow">API version</span>
                        <input
                          className="input"
                          value={apiVersion}
                          onChange={(e) => setApiVersion(e.target.value)}
                          placeholder="blank uses the built-in default"
                        />
                      </div>
                    </>
                  )}

                  {/* No catalog for this provider (Azure): the deployment is typed in. */}
                  {config.providerModels[id].length === 0 ? (
                    <div className="field">
                      <span className="eyebrow">Deployment</span>
                      <input
                        className="input"
                        value={models[id] ?? ""}
                        onChange={(e) => setModels({ ...models, [id]: e.target.value })}
                        placeholder="deployment name, e.g. gpt-5-5-2"
                      />
                    </div>
                  ) : (
                    <div className="choice-wrap">
                      {config.providerModels[id].map((m) => (
                        <button
                          key={m.id}
                          className={`choice choice--sm ${models[id] === m.id ? "is-on" : ""}`}
                          onClick={() => setModels({ ...models, [id]: m.id })}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {tab === "prompts" && (
            <>
              <div className="choice-row">
                {TARGETS.map((t) => (
                  <button
                    key={t.id}
                    className={`choice ${promptTarget === t.id ? "is-on" : ""}`}
                    onClick={() => setPromptTarget(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <textarea
                className="textarea"
                value={prompts[promptTarget] ?? ""}
                onChange={(e) => setPrompts({ ...prompts, [promptTarget]: e.target.value })}
                rows={14}
              />

              <button
                className="choice choice--sm"
                style={{ alignSelf: "flex-start" }}
                disabled={isDefaultPrompt}
                onClick={() =>
                  setPrompts({ ...prompts, [promptTarget]: config.defaultPrompts[promptTarget] })
                }
              >
                Reset to default
              </button>

              <p className="hint">
                Your clipboard text is sent as the user message. Output should be Markdown — Morph
                converts it to rich text on the clipboard.
              </p>
            </>
          )}

          {tab === "general" && (
            <>
              <div className="field">
                <span className="eyebrow">Ground</span>
                <div className="choice-row">
                  {GROUNDS.map((g) => (
                    <button
                      key={g.id}
                      className={`choice ${ground === g.id ? "is-on" : ""}`}
                      onClick={() => chooseGround(g.id)}
                    >
                      {g.label}
                      {ground === g.id && <Check size={13} strokeWidth={2.2} />}
                    </button>
                  ))}
                </div>
                <p className="hint">
                  {GROUNDS.find((g) => g.id === ground)?.hint} — applies immediately, no save needed.
                </p>
              </div>

              <div className="field">
                <span className="eyebrow">Global shortcut</span>
                <input
                  className="input input--mono"
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                />
                <p className="hint">Format: CommandOrControl+Shift+M</p>
              </div>
            </>
          )}

          {error && (
            <div className="notice">
              <span className="notice__icon">!</span>
              {error}
            </div>
          )}
        </div>

        <div className="rule" />

        <div className="overlay-foot">
          <span className="eyebrow">v{__APP_VERSION__}</span>
          <div className="overlay-foot__actions">
            <button className="btn btn--ghost" onClick={() => setSettingsOpen(false)}>
              Cancel
            </button>
            <button className="btn btn--brand" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

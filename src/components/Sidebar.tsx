import { useAppStore } from "../stores/app-store";
import { Plus, Clock, Settings } from "lucide-react";
import logoImg from "../icon.png";

export function Sidebar() {
  const { setHistoryOpen, setSettingsOpen, setInputText, setOutputText, setError, config } = useAppStore();

  const handleNew = () => {
    setInputText("");
    setOutputText("");
    setError(null);
  };

  return (
    <div
      className="drag-region"
      style={{
        width: 56,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 0,
        paddingBottom: 16,
        gap: 4,
        borderRight: "1px solid var(--color-border-subtle)",
        backgroundColor: "var(--color-bg)",
      }}
    >
      {/* Logo — below macOS traffic lights */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          overflow: "hidden",
          marginBottom: 16,
          marginTop: 56,
          flexShrink: 0,
        }}
      >
        <img
          src={logoImg}
          alt="Morph"
          style={{ width: 30, height: 30, display: "block", objectFit: "cover" }}
          draggable={false}
        />
      </div>

      {/* Top icons */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <SidebarButton icon={<Plus size={18} strokeWidth={2} />} tooltip="New chat" onClick={handleNew} />
        <SidebarButton icon={<Clock size={18} strokeWidth={1.8} />} tooltip="History" onClick={() => setHistoryOpen(true)} />
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom icons */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        {!config?.groqApiKeySet && (
          <div style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: "var(--color-danger)",
            marginBottom: 4,
          }} />
        )}
        <SidebarButton icon={<Settings size={18} strokeWidth={1.8} />} tooltip="Settings" onClick={() => setSettingsOpen(true)} />
      </div>
    </div>
  );
}

function SidebarButton({ icon, tooltip, onClick }: { icon: React.ReactNode; tooltip: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        border: "none",
        backgroundColor: "transparent",
        color: "var(--color-fg-muted)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s",
        WebkitAppRegion: "no-drag" as any,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--color-surface)";
        e.currentTarget.style.color = "var(--color-fg-secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = "var(--color-fg-muted)";
      }}
    >
      {icon}
    </button>
  );
}

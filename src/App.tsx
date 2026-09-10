import { useEffect } from "react";
import { useAppStore } from "./stores/app-store";
import { FormatView } from "./components/FormatView";
import { SettingsDialog } from "./components/SettingsDialog";
import { HistoryPanel } from "./components/HistoryPanel";
import { Sidebar } from "./components/Sidebar";

export default function App() {
  const { loadConfig, loadHistory } = useAppStore();

  useEffect(() => {
    loadConfig();
    loadHistory();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Titlebar drag region */}
        <div
          className="drag-region"
          style={{
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            userSelect: "none",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg-muted)", letterSpacing: "-0.01em" }}>
            Morph
          </span>
        </div>

        <FormatView />
      </div>

      <SettingsDialog />
      <HistoryPanel />
    </div>
  );
}

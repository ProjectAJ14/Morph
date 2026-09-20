import { useEffect } from "react";
import { useAppStore } from "./stores/app-store";
import { applyGround, readGround } from "./lib/ground";
import { FormatView } from "./components/FormatView";
import { SettingsDialog } from "./components/SettingsDialog";
import { HistoryPanel } from "./components/HistoryPanel";
import { Sidebar } from "./components/Sidebar";

export default function App() {
  const { loadConfig, loadHistory } = useAppStore();

  useEffect(() => {
    loadConfig();
    loadHistory();
    // index.html already set the attribute to avoid a flash; this re-applies it
    // so the native window frame gets the resolved --bg too.
    applyGround(readGround());
  }, []);

  return (
    <div className="app">
      <Sidebar />

      <div className="main">
        <div className="titlebar drag-region">
          <span className="titlebar__label">Morph</span>
        </div>
        <FormatView />
      </div>

      <SettingsDialog />
      <HistoryPanel />
    </div>
  );
}

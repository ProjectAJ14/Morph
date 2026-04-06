import { useEffect } from "react";
import { useAppStore } from "./stores/app-store";
import { RewriteView } from "./components/RewriteView";
import { SettingsDialog } from "./components/SettingsDialog";
import { HistoryPanel } from "./components/HistoryPanel";
import { Sidebar } from "./components/Sidebar";

export default function App() {
  const { loadConfig, loadHistory, setInputText, appendOutputChunk, setLoading, setError, reset } = useAppStore();

  useEffect(() => {
    loadConfig();
    loadHistory();

    const unsubPaste = window.morph.onClipboardPaste((text) => {
      reset();
      setInputText(text);
    });
    const unsubChunk = window.morph.onStreamChunk((chunk) => {
      appendOutputChunk(chunk);
    });
    const unsubDone = window.morph.onStreamDone(() => {
      setLoading(false);
      loadHistory();
    });
    const unsubError = window.morph.onStreamError((error) => {
      setError(error);
      setLoading(false);
    });

    return () => {
      unsubPaste();
      unsubChunk();
      unsubDone();
      unsubError();
    };
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
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
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

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", padding: "0 28px 28px 20px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", height: "100%" }}>
            <RewriteView />
          </div>
        </div>
      </div>

      <SettingsDialog />
      <HistoryPanel />
    </div>
  );
}

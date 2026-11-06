import { useEffect, useState } from "react";
import { useAppStore } from "../stores/app-store";
import { ArrowDownToLine, Clock, Settings } from "lucide-react";
import logoImg from "../icon.png";

export function Sidebar() {
  const { setHistoryOpen, setSettingsOpen, config } = useAppStore();
  const needsKey = config && !config.providers[config.activeProvider]?.apiKeySet;

  return (
    <div className="rail drag-region">
      <div className="rail__logo">
        <img src={logoImg} alt="Morph" draggable={false} />
      </div>

      <div className="rail__group">
        <RailButton label="History" onClick={() => setHistoryOpen(true)}>
          <Clock size={17} strokeWidth={1.8} />
        </RailButton>
      </div>

      <div className="rail__spacer" />

      <div className="rail__group">
        <UpdateReadyTile />
        {/* the missing-key tell, directly above the gear it points at */}
        {needsKey && <span className="rail__alert" aria-hidden="true" />}
        <RailButton label="Settings" onClick={() => setSettingsOpen(true)}>
          <Settings size={17} strokeWidth={1.8} />
        </RailButton>
      </div>
    </div>
  );
}

/** Appears once an update has downloaded by itself. Click restarts and installs; Quit also installs. Main clears it (null) if the install fails. */
function UpdateReadyTile() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const updates = window.morph?.updates;
    if (!updates) return;
    updates.readyVersion().then((v) => v && setVersion(v)).catch(() => {});
    return updates.onReady(setVersion);
  }, []);

  if (!version) return null;

  return (
    <button
      className="icon-btn rail__update"
      onClick={() => {
        setVersion(null);
        window.morph.updates.install().catch(() => setVersion(version));
      }}
      title={`Morph ${version} is ready. Click to restart and install, or it installs when you quit.`}
      aria-label={`Update ${version} is ready to install`}
    >
      <ArrowDownToLine size={17} strokeWidth={1.8} />
      <span className="rail__update-dot" aria-hidden="true" />
    </button>
  );
}

function RailButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className="icon-btn" onClick={onClick} title={label} aria-label={label}>
      {children}
    </button>
  );
}

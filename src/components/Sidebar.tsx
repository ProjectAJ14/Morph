import { useAppStore } from "../stores/app-store";
import { Clock, Settings } from "lucide-react";
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
        {/* the missing-key tell, directly above the gear it points at */}
        {needsKey && <span className="rail__alert" aria-hidden="true" />}
        <RailButton label="Settings" onClick={() => setSettingsOpen(true)}>
          <Settings size={17} strokeWidth={1.8} />
        </RailButton>
      </div>
    </div>
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

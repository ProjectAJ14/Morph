import { create } from "zustand";
import type { RewriteRecord, MorphConfig, Target } from "../types/morph";

type Status = { kind: "idle" } | { kind: "working"; target: Target } | { kind: "done"; target: Target } | { kind: "error"; message: string };

interface AppState {
  status: Status;
  settingsOpen: boolean;
  historyOpen: boolean;
  history: RewriteRecord[];
  config: MorphConfig | null;

  runFormat: (target: Target) => Promise<void>;
  setSettingsOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  loadHistory: () => Promise<void>;
  loadConfig: () => Promise<void>;
  clearStatus: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  status: { kind: "idle" },
  settingsOpen: false,
  historyOpen: false,
  history: [],
  config: null,

  runFormat: async (target) => {
    if (get().status.kind === "working") return;
    set({ status: { kind: "working", target } });
    try {
      await window.morph.format(target);
      set({ status: { kind: "done", target } });
      get().loadHistory();
      // Let the confirmation land, then get out of the way.
      setTimeout(async () => {
        await window.morph.hideWindow();
        set({ status: { kind: "idle" } });
      }, 850);
    } catch (err: any) {
      // Electron wraps handler errors: "Error invoking remote method 'x': Error: real message"
      const message = String(err?.message ?? "Something went wrong")
        .replace(/^Error invoking remote method '[^']*':\s*(Error:\s*)?/, "");
      set({ status: { kind: "error", message } });
    }
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setHistoryOpen: (open) => set({ historyOpen: open }),
  clearStatus: () => set({ status: { kind: "idle" } }),

  loadHistory: async () => {
    try {
      set({ history: await window.morph.getHistory(50, 0) });
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  },

  loadConfig: async () => {
    try {
      set({ config: await window.morph.getConfig() });
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  },
}));

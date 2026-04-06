import { create } from "zustand";
import type { RewriteRecord, MorphConfig } from "../types/morph";

interface AppState {
  // Rewrite state
  inputText: string;
  outputText: string;
  isLoading: boolean;
  error: string | null;

  // UI state
  settingsOpen: boolean;
  historyOpen: boolean;
  history: RewriteRecord[];
  config: MorphConfig | null;

  // Actions
  setInputText: (text: string) => void;
  setOutputText: (text: string) => void;
  appendOutputChunk: (chunk: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSettingsOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  loadHistory: () => Promise<void>;
  loadConfig: () => Promise<void>;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  inputText: "",
  outputText: "",
  isLoading: false,
  error: null,
  settingsOpen: false,
  historyOpen: false,
  history: [],
  config: null,

  setInputText: (text) => set({ inputText: text }),
  setOutputText: (text) => set({ outputText: text }),
  appendOutputChunk: (chunk) =>
    set((state) => ({ outputText: state.outputText + chunk })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setHistoryOpen: (open) => set({ historyOpen: open }),

  loadHistory: async () => {
    try {
      const history = await window.morph.getHistory(50, 0);
      set({ history });
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  },

  loadConfig: async () => {
    try {
      const config = await window.morph.getConfig();
      set({ config });
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  },

  reset: () => set({ outputText: "", error: null }),
}));

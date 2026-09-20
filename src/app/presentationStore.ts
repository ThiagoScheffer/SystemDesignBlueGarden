import { create } from 'zustand';

type ReadingView = 'canvas' | 'components' | 'inspector';
interface PresentationState {
  theme: 'light' | 'dark';
  themePreference: 'light' | 'dark' | null;
  componentsVisible: boolean;
  inspectorVisible: boolean;
  resultsRatio: number;
  setTheme: (theme: 'light' | 'dark') => void;
  togglePanel: (panel: 'components' | 'inspector') => void;
  setResultsRatio: (ratio: number) => void;
  readingView: ReadingView;
  setReadingView: (view: ReadingView) => void;
}

const storageKey = 'blue-garden-presentation';
function readPreferences() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '{}') ?? {};
  } catch {
    return {};
  }
}
const saved = readPreferences();
const systemDark =
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-color-scheme: dark)').matches;
const initialTheme =
  saved.theme === 'light' || saved.theme === 'dark'
    ? saved.theme
    : systemDark
      ? 'dark'
      : 'light';
document.documentElement.dataset.theme = initialTheme;
export const usePresentationStore = create<PresentationState>((set) => ({
  theme: initialTheme,
  themePreference:
    saved.theme === 'light' || saved.theme === 'dark' ? saved.theme : null,
  componentsVisible: saved.componentsVisible !== false,
  inspectorVisible: saved.inspectorVisible !== false,
  resultsRatio:
    typeof saved.resultsRatio === 'number' &&
    saved.resultsRatio > 0 &&
    saved.resultsRatio < 1
      ? saved.resultsRatio
      : 0.4,
  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme;
    set({ theme, themePreference: theme });
  },
  togglePanel: (panel) =>
    set((state) => {
      const breakpoint = panel === 'components' ? 1279 : 999;
      const narrow =
        typeof matchMedia === 'function' &&
        matchMedia(`(max-width: ${breakpoint}px)`).matches;
      if (narrow)
        return { readingView: state.readingView === panel ? 'canvas' : panel };
      return panel === 'components'
        ? { componentsVisible: !state.componentsVisible }
        : { inspectorVisible: !state.inspectorVisible };
    }),
  setResultsRatio: (resultsRatio) => set({ resultsRatio }),
  readingView: 'canvas',
  setReadingView: (readingView) =>
    set({
      readingView,
      ...(readingView === 'inspector' ? { inspectorVisible: true } : {}),
    }),
}));
usePresentationStore.subscribe(
  ({ themePreference, componentsVisible, inspectorVisible, resultsRatio }) => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          theme: themePreference,
          componentsVisible,
          inspectorVisible,
          resultsRatio,
        }),
      );
    } catch {
      /* Storage is optional. */
    }
  },
);
if (typeof matchMedia === 'function')
  matchMedia('(prefers-color-scheme: dark)').addEventListener(
    'change',
    (event) => {
      if (usePresentationStore.getState().themePreference !== null) return;
      const theme = event.matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme;
      usePresentationStore.setState({ theme });
    },
  );

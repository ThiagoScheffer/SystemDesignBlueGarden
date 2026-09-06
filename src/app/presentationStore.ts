import { create } from 'zustand';

type ReadingView = 'canvas' | 'components' | 'inspector';
interface PresentationState {
  readingView: ReadingView;
  setReadingView: (view: ReadingView) => void;
}

export const usePresentationStore = create<PresentationState>((set) => ({
  readingView: 'canvas',
  setReadingView: (readingView) => set({ readingView }),
}));

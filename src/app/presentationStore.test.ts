import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePresentationStore } from './presentationStore';

describe('workspace preferences', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    usePresentationStore.setState({
      componentsVisible: true,
      inspectorVisible: true,
      readingView: 'canvas',
      resultsRatio: 0.4,
    });
  });
  it('persists an explicit theme and custom results size', () => {
    usePresentationStore.getState().setTheme('dark');
    usePresentationStore.getState().setResultsRatio(0.55);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(
      JSON.parse(localStorage.getItem('blue-garden-presentation')!),
    ).toMatchObject({ theme: 'dark', resultsRatio: 0.55 });
  });
  it('reveals a hidden inspector for explicit inspection', () => {
    usePresentationStore.getState().togglePanel('inspector');
    expect(usePresentationStore.getState().inspectorVisible).toBe(false);
    usePresentationStore.getState().setReadingView('inspector');
    expect(usePresentationStore.getState().inspectorVisible).toBe(true);
  });
  it('continues working when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('unavailable');
    });
    expect(() =>
      usePresentationStore.getState().setTheme('light'),
    ).not.toThrow();
    expect(usePresentationStore.getState().theme).toBe('light');
  });
});

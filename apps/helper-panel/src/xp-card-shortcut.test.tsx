import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { XpCardShortcut } from './xp-card-shortcut';

describe('XP card shortcut', () => {
  it('shows a labelled non-submit button on Levels & XP', () => {
    const markup = renderToStaticMarkup(<XpCardShortcut featureKey="community.levels" label="XP card identity" onOpen={() => {}} />);
    expect(markup).toContain('type="button"');
    expect(markup).toContain('XP card identity');
  });
  it('does not appear on unrelated modules', () => {
    expect(renderToStaticMarkup(<XpCardShortcut featureKey="support.tickets" label="XP card identity" onOpen={() => {}} />)).toBe('');
  });
  it('opens the existing editor through app navigation', () => {
    const onOpen = vi.fn();
    const button = XpCardShortcut({ featureKey: 'community.levels', label: 'XP card identity', onOpen });
    button!.props.onClick();
    expect(onOpen).toHaveBeenCalledExactlyOnceWith('#/rank-card');
  });
});

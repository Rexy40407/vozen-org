import { expect, it } from 'vitest';
import { canonicalWelcomeKey, visibleWelcomeFeatures } from './welcome';

it('opens the unified feature from old bookmarks', () => {
  expect(canonicalWelcomeKey('support.welcome_channel')).toBe('support.welcome');
  expect(canonicalWelcomeKey('support.tickets')).toBe('support.tickets');
});
it('shows only one welcome card without changing other features', () => {
  const input = [{key:'support.welcome'}, {key:'support.welcome_channel'}, {key:'support.tickets'}];
  expect(visibleWelcomeFeatures(input).map(item => item.key)).toEqual(['support.welcome', 'support.tickets']);
  expect(input).toHaveLength(3);
});

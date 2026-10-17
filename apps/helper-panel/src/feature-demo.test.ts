import { describe, expect, it } from 'vitest';
import { featureDemo } from './feature-demo';

describe('feature-specific demonstrations', () => {
  for (const [key, asset] of [['community.starboard', 'starboard'], ['community.suggestions', 'suggestions'], ['community.giveaways', 'giveaways'], ['support.tickets', 'tickets']]) {
    for (const locale of ['en', 'pt']) {
      it(`selects the owned ${locale} animation and written steps for ${key}`, () => {
        const demo = featureDemo(key, locale);
        expect(demo?.asset).toBe(`${asset}-${locale}`);
        expect(demo?.title).toMatch(/animation|animação/);
        expect(demo?.example.length).toBeGreaterThan(20);
        expect(demo?.steps).toHaveLength(3);
      });
    }
  }
  it('does not misrepresent a Starboard video as a different feature', () => {
    expect(featureDemo('community.levels', 'en')).toBeNull();
    expect(featureDemo('unknown', 'pt')).toBeNull();
  });
  it('explains ticket privacy and staff handling without claiming real server actions', () => {
    const demo = featureDemo('support.tickets', 'en');
    expect(demo?.example).toMatch(/sample data/i);
    expect(demo?.steps.join(' ')).toMatch(/Open ticket/);
    expect(demo?.steps.join(' ')).toMatch(/private channel/);
    expect(demo?.steps.join(' ')).toMatch(/Claim/);
    expect(demo?.steps.join(' ')).toMatch(/Close/);
    expect(featureDemo('support.tickets', 'fr')?.asset).toBe('tickets-en');
  });
  it('uses English media when a localized video is unavailable', () => {
    expect(featureDemo('community.suggestions', 'fr')?.asset).toBe('suggestions-en');
  });
});

import { describe, expect, it } from 'vitest';
import { featureDemo } from './feature-demo';

describe('feature-specific demonstrations', () => {
  for (const [key, asset] of [['community.starboard', 'starboard'], ['community.suggestions', 'suggestions']]) {
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
  it('uses English media when a localized video is unavailable', () => {
    expect(featureDemo('community.suggestions', 'fr')?.asset).toBe('suggestions-en');
  });
});

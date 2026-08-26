import { describe, expect, it } from 'vitest';

import { bundledFeatureSchema } from './feature-contract-fallback';

describe('bundled feature contract recovery', () => {
  it('keeps the anti-raid editor available during a detail API outage', () => {
    const schema = bundledFeatureSchema('protection.anti_raid');

    expect(schema?.version).toBe(1);
    expect(schema?.source).toBe('anti_raid_adapter_v1');
    expect(schema?.sections.flatMap((section) => section.fields.map((field) => field.key))).toEqual([
      'joinThreshold',
      'windowSeconds',
      'incidentMinutes',
      'verification',
      'pauseInvites',
      'alertOnly',
      'alertChannel',
    ]);
  });

  it('does not invent recovery contracts for unrelated modules', () => {
    expect(bundledFeatureSchema('protection.antispam')).toBeNull();
  });
});

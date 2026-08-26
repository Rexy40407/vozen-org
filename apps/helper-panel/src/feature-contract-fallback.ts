import type { FeatureSchema } from './api';

const antiRaidSchema: FeatureSchema = {
  version: 1,
  source: 'anti_raid_adapter_v1',
  sections: [
    {
      title: 'Join detection',
      description: 'Set when the sequence of joins is considered the raid.',
      fields: [
        {
          key: 'joinThreshold',
          label: 'Joins to start an alert',
          kind: 'number',
          min: 2,
          max: 100,
        },
        {
          key: 'windowSeconds',
          label: 'Time window (seconds)',
          kind: 'number',
          min: 3,
          max: 60,
        },
        {
          key: 'incidentMinutes',
          label: 'Protection duration (minutes)',
          kind: 'number',
          min: 1,
          max: 120,
        },
      ],
    },
    {
      title: 'Response and recovery',
      description: 'Choose the verification level and where the team is notified.',
      fields: [
        {
          key: 'verification',
          label: 'Verification level',
          kind: 'select',
          options: [
            ['medium', 'medium'],
            ['high', 'High'],
            ['very_high', 'Very high'],
          ],
        },
        { key: 'pauseInvites', label: 'Pause invites during the incident', kind: 'toggle' },
        { key: 'alertOnly', label: 'Alert only', kind: 'toggle', advanced: true },
        { key: 'alertChannel', label: 'Alert channel', kind: 'text', advanced: true },
      ],
    },
  ],
};

export function bundledFeatureSchema(key: string): FeatureSchema | null {
  return key === 'protection.anti_raid' ? antiRaidSchema : null;
}

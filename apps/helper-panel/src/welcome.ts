export function canonicalWelcomeKey(key: string): string {
  return key === 'support.welcome_channel' ? 'support.welcome' : key;
}

export function visibleWelcomeFeatures<T extends { key: string }>(features: T[]): T[] {
  return features.filter(feature => feature.key !== 'support.welcome_channel');
}

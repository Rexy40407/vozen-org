// Read-only Welcome demonstration checks with isolated, synthetic API fixtures.
process.env.FEATURE_DEMO_FEATURE = 'welcome';
await import('./helper-suggestions-demo-regression.mjs');

// Reuse the shared demonstration contract with isolated Giveaways fixtures.
process.env.FEATURE_DEMO_FEATURE = 'giveaways';
await import('./helper-suggestions-demo-regression.mjs');

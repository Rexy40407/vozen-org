// Reuse the shared read-only demonstration checks with isolated Tickets fixtures.
process.env.FEATURE_DEMO_FEATURE = 'tickets';
await import('./helper-suggestions-demo-regression.mjs');

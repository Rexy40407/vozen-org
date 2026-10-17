// Isolated fixtures for category creation; no real Discord mutations.
process.env.TICKET_RESOURCE = 'category';
await import('./helper-ticket-channel-regression.mjs');

import { describe, it, expect } from 'vitest';
import { activationChoice } from './premium-activation';

describe('Premium activation choices', () => {
  it('never spends another seat on an active server', () => {
    expect(activationChoice({ guild_premium: true, pass_active: false, seats: 0, used: 0 })).toBe('active');
  });
  it('offers plans for free or expired passes', () => {
    expect(activationChoice({ guild_premium: false, pass_active: false, seats: 5, used: 0 })).toBe('plans');
  });
  it('uses the actual subscription limit', () => {
    for (const seats of [3, 5]) {
      expect(activationChoice({ guild_premium: false, pass_active: true, seats, used: seats - 1 })).toBe('activate');
      expect(activationChoice({ guild_premium: false, pass_active: true, seats, used: seats })).toBe('full');
    }
  });
});

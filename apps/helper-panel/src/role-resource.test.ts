import { describe, expect, it } from 'vitest';
import { isRoleResourceOptionDisabled, roleResourceLabel } from './role-resource';

describe('Discord role resource options', () => {
  it('allows high staff roles referenced for ticket access and pings without assigning them', () => {
    const staff = { id: 'staff', name: 'Admins', manageable: false };
    expect(isRoleResourceOptionDisabled(staff, new Set(), false)).toBe(false);
    expect(roleResourceLabel(staff, false)).toBe('@Admins');
  });
  it('disables roles the bot cannot assign', () => {
    expect(
      isRoleResourceOptionDisabled(
        { id: 'guild-id', name: 'everyone', manageable: false },
        new Set(),
      ),
    ).toBe(true);
  });

  it('keeps assignable roles enabled', () => {
    expect(
      isRoleResourceOptionDisabled(
        { id: 'role-id', name: 'Member', manageable: true },
        new Set(),
      ),
    ).toBe(false);
  });

  it('keeps a previously selected invalid role removable', () => {
    expect(
      isRoleResourceOptionDisabled(
        { id: 'guild-id', name: 'everyone', manageable: false },
        new Set(['guild-id']),
      ),
    ).toBe(false);
  });

  it('marks roles the bot cannot assign', () => {
    expect(roleResourceLabel({ id: 'guild-id', name: 'everyone', manageable: false })).toBe(
      '🔒 @everyone',
    );
  });
});

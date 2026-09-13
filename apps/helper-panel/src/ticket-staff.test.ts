import { describe, expect, it } from 'vitest';
import { ticketStaffField, ticketStaffRoleOptions } from './ticket-staff';

describe('ticket staff notification selector', () => {
  it('explains that the selected staff role is pinged and can claim', () => {
    expect(ticketStaffField.key).toBe('staffRole');
    expect(ticketStaffField.kind).toBe('role');
    expect(ticketStaffField.label).toBe('Staff role to notify');
    expect(ticketStaffField.help).toContain('@mentions');
    expect(ticketStaffField.help).toContain('claim');
  });
  it('excludes everyone without excluding higher staff roles', () => {
    const roles = [{ id: 'guild-a', name: 'everyone' }, { id: 'staff', name: 'Admins', manageable: false }];
    expect(ticketStaffRoleOptions(roles, 'guild-a')).toEqual([roles[1]]);
    expect(roles).toHaveLength(2);
  });
  it('uses the current guild and handles unavailable data', () => {
    expect(ticketStaffRoleOptions([], 'guild-b')).toEqual([]);
    expect(ticketStaffRoleOptions([{ id: 'guild-b', name: 'everyone' }], 'guild-b')).toEqual([]);
  });
});

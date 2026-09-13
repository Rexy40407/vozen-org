export const ticketStaffField = {
  key: 'staffRole',
  label: 'Staff role to notify',
  kind: 'role' as const,
  help: 'The opening message @mentions this role. Its members can view, claim, close and reopen tickets. Make the role mentionable or allow the bot to mention roles. Personal Discord notification settings still apply.',
};

export function ticketStaffRoleOptions<T extends { id: string }>(roles: readonly T[], guildId?: string): T[] {
  return roles.filter((role) => role.id !== guildId);
}

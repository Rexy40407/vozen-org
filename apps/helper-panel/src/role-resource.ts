type RoleResourceOption = {
  id: string;
  name: string;
  manageable?: boolean;
};

export function roleResourceLabel(option: RoleResourceOption): string {
  return `${option.manageable === false ? '🔒 ' : ''}@${option.name}`;
}

export function isRoleResourceOptionDisabled(
  option: RoleResourceOption,
  selectedIds: ReadonlySet<string>,
): boolean {
  return option.manageable === false && !selectedIds.has(option.id);
}

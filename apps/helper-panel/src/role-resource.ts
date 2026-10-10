type RoleResourceOption = {
  id: string;
  name: string;
  manageable?: boolean;
};

export function roleRequiresAssignment(fieldKey: string): boolean {
  return !['staffRole','requiredRole','ignoredRoles'].includes(fieldKey);
}

export function roleResourceLabel(option: RoleResourceOption, requiresAssignment = true): string {
  return `${requiresAssignment && option.manageable === false ? '🔒 ' : ''}@${option.name}`;
}

export function isRoleResourceOptionDisabled(
  option: RoleResourceOption,
  selectedIds: ReadonlySet<string>,
  requiresAssignment = true,
): boolean {
  return requiresAssignment && option.manageable === false && !selectedIds.has(option.id);
}

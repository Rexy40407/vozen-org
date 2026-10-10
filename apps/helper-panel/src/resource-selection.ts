export function toggleResource(values: readonly string[], id: string, checked: boolean): string[] {
  return checked ? Array.from(new Set([...values,id])) : values.filter(value => value !== id);
}

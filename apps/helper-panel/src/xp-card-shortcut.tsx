export function XpCardShortcut({ featureKey, label, onOpen }: {
  featureKey?: string;
  label: string;
  onOpen: (path: string) => void;
}) {
  if (featureKey !== 'community.levels') return null;
  return (
    <button type="button" className="secondary" onClick={() => onOpen('#/rank-card')}>
      {label}
    </button>
  );
}

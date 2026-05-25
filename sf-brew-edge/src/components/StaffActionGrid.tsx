import { StaffAction } from '../domain/types';

const ACTIONS: StaffAction[] = [
  'New tab note',
  'Flag keg low',
  '86 item',
  'Customer wait issue',
  'Restock needed',
  'Manager needed',
  'Start rush mode',
  'End rush mode',
];

export function StaffActionGrid({ onAction }: { onAction: (action: StaffAction) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ACTIONS.map((action) => (
        <button key={action} className="rounded-lg bg-zinc-800 p-4 text-left text-sm" onClick={() => onAction(action)}>
          {action}
        </button>
      ))}
    </div>
  );
}

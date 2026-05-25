import { OpsEvent } from '../domain/types';

export function OpsLog({ items }: { items: OpsEvent[] }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <h3 className="mb-2 font-semibold">Ops Log</h3>
      <div className="space-y-2 text-xs">
        {items.slice(0, 6).map((item) => (
          <div key={item.id} className="border-b border-zinc-800 pb-1">
            {item.message}
          </div>
        ))}
        {items.length === 0 && <p className="text-zinc-400">No events yet. Use Staff one-tap actions.</p>}
      </div>
    </section>
  );
}

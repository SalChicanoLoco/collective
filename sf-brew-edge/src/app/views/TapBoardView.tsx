import { TaproomState } from '../../domain/types';

export function TapBoardView({ state }: { state: TaproomState }) {
  return (
    <div className="space-y-2">
      {state.taps.map((tap) => (
        <section key={tap.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <p className="font-semibold">{tap.name} · {tap.beer.name}</p>
          <p className="text-sm text-zinc-300">{tap.beer.style} · {tap.beer.abv}</p>
          <p className={`text-sm ${tap.low ? 'text-amber-400' : 'text-zinc-200'}`}>Fill: {tap.fillPct}%</p>
        </section>
      ))}
    </div>
  );
}

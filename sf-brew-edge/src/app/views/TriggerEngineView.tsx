import { generateManagerRecommendations } from '../../domain/copilot';
import { generatePromoSuggestions } from '../../domain/promoEngine';
import { TaproomState } from '../../domain/types';

export function TriggerEngineView({ state }: { state: TaproomState }) {
  const suggestions = generatePromoSuggestions(state);
  const recommendations = generateManagerRecommendations(state);

  return (
    <div className="space-y-3">
      <p className="rounded bg-amber-500/10 p-2 text-xs text-amber-400">Manager approval required for all promotions and service-mode changes.</p>
      {suggestions.map((item) => <div key={item.title} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm">{item.title} — {item.reason}</div>)}
      {recommendations.map((item) => <div key={item.title} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm">{item.recommendedAction}</div>)}
    </div>
  );
}

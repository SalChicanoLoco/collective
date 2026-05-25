import { CopilotRecommendation, TaproomState } from './types';
import { calculateStaffLoad, estimateKegRisk } from './rules';

export function generateManagerRecommendations(state: TaproomState): CopilotRecommendation[] {
  const load = calculateStaffLoad(state);
  const lowKegs = estimateKegRisk(state.taps);

  return [
    {
      title: 'AI-ready rules engine — local simulation mode.',
      observation: `Staff load is ${load.level} (${load.score}/100); low keg count is ${lowKegs}.`,
      reasoning: 'Deterministic rules map rush + keg risk to safe service-mode decisions.',
      recommendedAction: load.level === 'high' ? 'Approve overload-safe promo suppression.' : 'Approve soft happy hour window.',
      riskDownside: 'Promoting aggressively during rush can degrade service quality.',
      staffImpact: 'One-tap actions remain primary so bartenders stay in flow.',
      confidenceLabel: 'High',
    },
  ];
}

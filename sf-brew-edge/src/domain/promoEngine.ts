import { PromoSuggestion, TaproomState } from './types';
import { calculateStaffLoad, estimateKegRisk } from './rules';

export function generatePromoSuggestions(state: TaproomState): PromoSuggestion[] {
  const load = calculateStaffLoad(state);
  const kegRisk = estimateKegRisk(state.taps);

  const suggestions: PromoSuggestion[] = [
    {
      title: 'Soft happy hour',
      reason: 'Increase velocity with controlled manager-approved promos.',
      requiresManagerApproval: true,
    },
    {
      title: 'Flight push',
      reason: 'Promote tasting flights during steady service windows.',
      requiresManagerApproval: true,
    },
    {
      title: 'Lull-to-party activation',
      reason: 'Move from lull to event mode with explicit manager sign-off.',
      requiresManagerApproval: true,
    },
  ];

  if (state.rushMode) {
    suggestions.push({
      title: 'Event surge mode',
      reason: 'Switch to service-mode simplification during rush periods.',
      requiresManagerApproval: true,
    });
    suggestions.push({
      title: 'Staff overload warning',
      reason: 'Avoid complex promos while staff load is elevated.',
      requiresManagerApproval: true,
    });
  }

  if (kegRisk > 0 || load.level === 'high') {
    suggestions.push({
      title: 'Keg protection',
      reason: 'Do-not-promote low-fill taps to avoid waste and 86 churn.',
      requiresManagerApproval: true,
    });
  }

  return suggestions;
}

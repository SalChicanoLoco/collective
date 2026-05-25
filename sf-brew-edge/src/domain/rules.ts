import { StaffLoad, Tap, TaproomPulse, TaproomState } from './types';

export function estimateKegRisk(taps: Tap[]): number {
  return taps.filter((tap) => tap.low || tap.fillPct <= 20).length;
}

export function calculateTaproomPulse(state: TaproomState): TaproomPulse {
  const lowKegCount = estimateKegRisk(state.taps);
  if (state.rushMode && lowKegCount >= 2) return 'critical';
  if (state.rushMode) return 'rush';
  if (lowKegCount >= 2) return 'steady';
  return 'calm';
}

export function calculateStaffLoad(state: TaproomState): StaffLoad {
  const base = state.rushMode ? 65 : 30;
  const eventWeight = Math.min(state.opsLog.length * 4, 35);
  const score = Math.min(base + eventWeight, 100);
  return { level: score > 75 ? 'high' : score > 50 ? 'medium' : 'low', score };
}

export function simulateRush(state: TaproomState): TaproomState {
  return { ...state, rushMode: true };
}

export function tickDemoState(state: TaproomState): TaproomState {
  return {
    ...state,
    taps: state.taps.map((tap) => {
      const nextFill = Math.max(0, tap.fillPct - (state.rushMode ? 2 : 1));
      return { ...tap, fillPct: nextFill, low: nextFill <= 20 };
    }),
  };
}

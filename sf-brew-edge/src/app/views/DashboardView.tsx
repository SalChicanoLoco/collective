import { calculateStaffLoad, calculateTaproomPulse, estimateKegRisk } from '../../domain/rules';
import { TaproomState } from '../../domain/types';
import { DashboardCard } from '../../components/DashboardCard';

export function DashboardView({ state }: { state: TaproomState }) {
  const pulse = calculateTaproomPulse(state);
  const load = calculateStaffLoad(state);
  const kegRisk = estimateKegRisk(state.taps);

  return (
    <div className="space-y-3">
      <DashboardCard title="Taproom Pulse">{pulse.toUpperCase()} · Staff load {load.level} ({load.score})</DashboardCard>
      <DashboardCard title="Keg Risk">{kegRisk} low-risk tap(s) detected.</DashboardCard>
      {state.compiledProfile.showPciBoundaryWarning && (
        <DashboardCard title="PCI Boundary Warning">Never process cardholder data in this app. Processor references only.</DashboardCard>
      )}
    </div>
  );
}

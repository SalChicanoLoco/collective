import { CompiledBreweryProfile, IntakeProfile } from './types';

export function compileBreweryProfile(intake: IntakeProfile): CompiledBreweryProfile {
  const pain = new Set(intake.painPoints);

  const compiled: CompiledBreweryProfile = {
    recommendedView: 'Dashboard',
    dashboardEmphasis: ['manager_visibility'],
    riskRulesEnabled: [],
    staffActionPriority: ['New tab note', 'Customer wait issue'],
    promoSafetySettings: ['manager_approval_required'],
    nextIntakeSessions: ['Shift handoff review'],
    managerTalkingPoints: ['Start with staff friction and service tempo.'],
    showPciBoundaryWarning: false,
  };

  if (pain.has('Rush line friction')) {
    compiled.recommendedView = 'Staff';
    compiled.dashboardEmphasis.push('rush_mode_signals');
    compiled.riskRulesEnabled.push('overload_suppression');
    compiled.staffActionPriority = ['Start rush mode', 'Customer wait issue', ...compiled.staffActionPriority];
    compiled.promoSafetySettings.push('suppress_complex_promos_when_overloaded');
    compiled.nextIntakeSessions.push('Fast-pour menu mode walkthrough');
    compiled.managerTalkingPoints.push('Rush simplification removes taps-per-minute bottlenecks.');
  }

  if (pain.has('Keg/tap changes')) {
    compiled.recommendedView = compiled.recommendedView === 'Staff' ? 'Staff' : 'TapBoard';
    compiled.dashboardEmphasis.push('keg_risk');
    compiled.riskRulesEnabled.push('keg_protection');
    compiled.staffActionPriority.unshift('Flag keg low');
    compiled.promoSafetySettings.push('do_not_promote_low_fill_taps');
    compiled.nextIntakeSessions.push('Keg change workflow map');
    compiled.managerTalkingPoints.push('Protect margin by reducing waste and over-promotion risk.');
  }

  if (pain.has('PCI/payment risk')) {
    compiled.dashboardEmphasis.push('pci_boundary');
    compiled.riskRulesEnabled.push('payment_boundary_lock');
    compiled.promoSafetySettings.push('no_live_payment_claims');
    compiled.nextIntakeSessions.push('POS/payment architecture map');
    compiled.managerTalkingPoints.push('Keep this app out of card-data scope at all times.');
    compiled.showPciBoundaryWarning = true;
  }

  return compiled;
}

import { useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { OpsLog } from '../components/OpsLog';
import { RoleToggle } from '../components/RoleToggle';
import { compileBreweryProfile } from '../domain/intakeCompiler';
import { IntakeProfile, TaproomState } from '../domain/types';
import { useDemoState } from '../hooks/useDemoState';
import { useDemoTicker } from '../hooks/useDemoTicker';
import { DashboardView } from './views/DashboardView';
import { IntakeView } from './views/IntakeView';
import { StaffView } from './views/StaffView';
import { TapBoardView } from './views/TapBoardView';
import { TriggerEngineView } from './views/TriggerEngineView';

function renderView(view: TaproomState['activeView'], state: TaproomState, onCompile: (profile: IntakeProfile) => void, onAction: ReturnType<typeof useDemoState>['dispatchStaffAction']) {
  if (view === 'Dashboard') return <DashboardView state={state} />;
  if (view === 'Intake') return <IntakeView onCompile={onCompile} />;
  if (view === 'Staff') return <StaffView onAction={onAction} />;
  if (view === 'TapBoard') return <TapBoardView state={state} />;
  return <TriggerEngineView state={state} />;
}

export default function App() {
  const { state, setState, dispatchStaffAction, tick } = useDemoState();
  const [activeView, setActiveView] = useState<TaproomState['activeView']>(state.compiledProfile.recommendedView);

  useDemoTicker(tick);

  const onCompile = (profile: IntakeProfile) => {
    const compiled = compileBreweryProfile(profile);
    setState((prev) => ({ ...prev, intakeProfile: profile, compiledProfile: compiled }));
    setActiveView(compiled.recommendedView);
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-20 text-zinc-100">
      <AppHeader />
      <main className="mx-auto max-w-md space-y-3 p-3">
        <RoleToggle role={state.role} setRole={(role) => setState((prev) => ({ ...prev, role }))} />
        {renderView(activeView, state, onCompile, dispatchStaffAction)}
        <OpsLog items={state.opsLog} />
      </main>
      <BottomNav view={activeView} setView={setActiveView} />
    </div>
  );
}

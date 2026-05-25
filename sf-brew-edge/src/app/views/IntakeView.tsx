import { compileBreweryProfile } from '../../domain/intakeCompiler';
import { IntakeProfile } from '../../domain/types';

const DEFAULT_PAIN_POINTS = ['Rush line friction', 'Keg/tap changes', 'Manager visibility', 'PCI/payment risk'];

export function IntakeView({ onCompile }: { onCompile: (profile: IntakeProfile) => void }) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <p className="text-sm">Compile a brewery-specific profile from intake pain points.</p>
      <button
        className="w-full rounded-lg bg-lime-400 p-3 font-semibold text-black"
        onClick={() => onCompile({ venueName: 'Brian Demo Mode', painPoints: DEFAULT_PAIN_POINTS })}
      >
        Compile profile from demo pain points
      </button>
      <p className="text-xs text-zinc-400">Compiler updates recommended view, risk rules, promo safety, and manager talking points.</p>
    </div>
  );
}

import { TaproomState } from '../domain/types';

const VIEWS: TaproomState['activeView'][] = ['Dashboard', 'Intake', 'Staff', 'TapBoard', 'Triggers'];

export function BottomNav({ view, setView }: { view: TaproomState['activeView']; setView: (view: TaproomState['activeView']) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950 px-3 py-2">
      <div className="mx-auto flex max-w-md justify-between">
        {VIEWS.map((item) => (
          <button key={item} onClick={() => setView(item)} className={view === item ? 'text-lime-400' : 'text-zinc-300'}>
            {item}
          </button>
        ))}
      </div>
    </nav>
  );
}

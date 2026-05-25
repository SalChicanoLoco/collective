import { Role } from '../domain/types';

const ROLES: Role[] = ['Staff', 'Manager', 'Owner'];

export function RoleToggle({ role, setRole }: { role: Role; setRole: (role: Role) => void }) {
  return (
    <div className="flex gap-2">
      {ROLES.map((option) => (
        <button key={option} className={`rounded px-3 py-1 ${role === option ? 'bg-lime-400 text-black' : 'bg-zinc-700'}`} onClick={() => setRole(option)}>
          {option}
        </button>
      ))}
    </div>
  );
}

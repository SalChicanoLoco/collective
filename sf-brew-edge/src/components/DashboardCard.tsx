import { PropsWithChildren } from 'react';

export function DashboardCard({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <h3 className="mb-1 font-semibold">{title}</h3>
      {children}
    </section>
  );
}

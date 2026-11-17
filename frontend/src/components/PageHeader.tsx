import { ReactNode } from 'react';

export function PageHeader({ title, subtitle, action, eyebrow }: { title: string; subtitle?: string; action?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-ink-600">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

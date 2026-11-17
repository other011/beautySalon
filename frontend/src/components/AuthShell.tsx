import { ReactNode } from 'react';

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="bg-gradient-to-br from-sand-100 via-ivory to-nude-100 py-12 sm:py-20">
      <div className="mx-auto w-full max-w-md px-4">
        <div className="card animate-fade-up p-7 sm:p-9">
          <h1 className="font-display text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-600">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-ink-600">{footer}</div>}
      </div>
    </div>
  );
}

import React from 'react';

/** Logo compacto: imagen a la izquierda y nombre a la derecha. */
export const BrandBanner: React.FC = () => {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <img
        src="/brand-banner.png"
        alt="ReporteVialCEA"
        className="h-9 w-14 rounded-lg border border-slate-200 dark:border-slate-700 object-cover object-top"
      />
      <span className="hidden font-display text-sm font-bold tracking-tight whitespace-nowrap bg-clip-text text-transparent sm:inline"
        style={{ backgroundImage: 'var(--accent-gradient)' }}
      >
        REPORTEVIALCEA
      </span>
    </div>
  );
};

import React from 'react';

/** Banner de marca mostrado en el Panel de Oficina y en Registro de Instructor. */
export const BrandBanner: React.FC = () => {
  return (
    <div className="no-print mb-5 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/80 dark:bg-slate-900/80 shadow-sm">
      <img
        src="/brand-banner.png"
        alt="ReporteVialCEA · Inteligencia Vial Urbana"
        className="h-32 w-full object-cover object-top sm:h-44 md:h-52"
      />
    </div>
  );
};

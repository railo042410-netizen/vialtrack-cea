import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';

interface SignatureCanvasProps {
  label: string;
  helperText?: string;
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  hasError?: boolean;
  optional?: boolean;
  accentInkHex?: string;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  label,
  helperText,
  value,
  onChange,
  hasError = false,
  optional = false,
  accentInkHex = '#1d4ed8',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasInkRef = useRef(false);
  const [hasSigned, setHasSigned] = useState(Boolean(value));
  const [inkChoice, setInkChoice] = useState<'slate' | 'cobalt' | 'theme'>('cobalt');

  const inkOptions: { id: 'slate' | 'cobalt' | 'theme'; label: string; color: string }[] = [
    { id: 'slate', label: 'Negro', color: '#0f172a' },
    { id: 'cobalt', label: 'Azul tinta', color: '#1d4ed8' },
    { id: 'theme', label: 'Color tema', color: accentInkHex },
  ];

  const activeInkColor =
    inkOptions.find((o) => o.id === inkChoice)?.color || '#0f172a';

  // Configure high-DPI canvas buffer matching CSS box size
  const initCanvasSize = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const targetWidth = Math.round(rect.width * dpr);
    const targetHeight = Math.round(rect.height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      const tempData = hasInkRef.current ? canvas.toDataURL('image/png') : null;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = activeInkColor;
        ctx.lineWidth = 2.5;

        if (tempData) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
          };
          img.src = tempData;
        }
      }
    }
  };

  useEffect(() => {
    initCanvasSize();
    const observer = new ResizeObserver(() => initCanvasSize());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Sync external reset (when form clears)
  useEffect(() => {
    if (!value && hasInkRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      hasInkRef.current = false;
      setHasSigned(false);
    }
  }, [value]);

  const getLocalCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    initCanvasSize();

    const point = getLocalCoords(e);
    isDrawingRef.current = true;
    lastPointRef.current = point;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.fillStyle = activeInkColor;
      ctx.arc(point.x, point.y, 1.3, 0, Math.PI * 2);
      ctx.fill();
      hasInkRef.current = true;
      setHasSigned(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !lastPointRef.current) return;

    const current = getLocalCoords(e);
    const prev = lastPointRef.current;
    const midX = (prev.x + current.x) / 2;
    const midY = (prev.y + current.y) / 2;

    ctx.strokeStyle = activeInkColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();

    lastPointRef.current = current;
    hasInkRef.current = true;
    if (!hasSigned) setHasSigned(true);
  };

  const commitSignature = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas && hasInkRef.current) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    hasInkRef.current = false;
    setHasSigned(false);
    onChange(undefined);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {label}
          </span>
          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
            {optional ? 'Opcional' : 'Requerida'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Interactive Ink Color Swatches */}
          <div
            className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1"
            role="radiogroup"
            aria-label={`Color de trazo para ${label}`}
          >
            {inkOptions.map((opt) => {
              const active = inkChoice === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  title={`Tinta ${opt.label}`}
                  aria-label={`Tinta ${opt.label}`}
                  onClick={() => setInkChoice(opt.id)}
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-transform ${
                    active
                      ? 'ring-2 ring-slate-900 dark:ring-white scale-105'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-sm"
                    style={{ backgroundColor: opt.color }}
                  />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleClear}
            disabled={!hasSigned}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors min-h-[40px]"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        style={
          !hasError && hasSigned
            ? {
                borderColor: 'var(--accent-primary)',
                boxShadow: '0 0 0 3px var(--accent-ring)',
              }
            : undefined
        }
        className={`relative h-36 sm:h-40 w-full overflow-hidden rounded-xl border bg-white transition-all duration-150 ${
          hasError
            ? 'border-red-500 ring-2 ring-red-500/20'
            : hasSigned
            ? ''
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
        }`}
      >
        {/* Subtle signature baseline */}
        <div className="pointer-events-none absolute inset-x-5 bottom-6 border-b border-dashed border-slate-200" />

        {!hasSigned && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400 select-none">
            <PenLine className="w-5 h-5" style={{ color: activeInkColor }} />
            <span className="text-xs font-medium">
              {helperText || 'Firme con el dedo o cursor aquí'}
            </span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={commitSignature}
          onPointerCancel={commitSignature}
          onPointerLeave={commitSignature}
          style={{ touchAction: 'none' }}
          className="relative z-10 h-full w-full cursor-crosshair block"
        />
      </div>
    </div>
  );
};

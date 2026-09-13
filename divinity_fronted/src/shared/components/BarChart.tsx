import { useState } from 'react';

import { md3BodyMediumClass } from '@/shared/ui/material';

export interface BarChartDatum {
  label: string;
  value: number;
}

interface Props {
  data: BarChartDatum[];
  formatValue?: (value: number) => string;
  /** Clase de color de texto (ej. "text-primary") — las barras usan fill="currentColor". */
  colorClassName?: string;
  height?: number;
}

const WIDTH = 600;
const PADDING_BOTTOM = 28;
const PADDING_TOP = 12;
const RADIUS = 4;

/** Rectángulo con esquinas superiores redondeadas — "extremos redondeados" del mark spec. */
const roundedTopBarPath = (x: number, yTop: number, width: number, yBottom: number, r: number): string => {
  const radius = Math.min(r, width / 2, Math.max(yBottom - yTop, 0));
  if (radius <= 0) {
    return `M${x},${yBottom} L${x},${yTop} L${x + width},${yTop} L${x + width},${yBottom} Z`;
  }
  return [
    `M${x},${yBottom}`,
    `L${x},${yTop + radius}`,
    `Q${x},${yTop} ${x + radius},${yTop}`,
    `L${x + width - radius},${yTop}`,
    `Q${x + width},${yTop} ${x + width},${yTop + radius}`,
    `L${x + width},${yBottom}`,
    'Z',
  ].join(' ');
};

/** Barras de una sola serie — sin leyenda (el título del panel ya nombra la serie), con tooltip en hover y vista de tabla alternable. */
export const BarChart = ({ data, formatValue = String, colorClassName = 'text-primary', height = 180 }: Props) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const max = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = height - PADDING_BOTTOM - PADDING_TOP;
  const barWidth = data.length > 0 ? WIDTH / data.length : WIDTH;
  const barInnerWidth = Math.max(barWidth * 0.55, 6);

  return (
    <div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {showTable ? 'Ver gráfico' : 'Ver como tabla'}
        </button>
      </div>

      {showTable ? (
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant">
              <th className="py-1.5 text-left font-semibold text-on-surface-variant">Período</th>
              <th className="py-1.5 text-right font-semibold text-on-surface-variant">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {data.map((d) => (
              <tr key={d.label}>
                <td className="py-1.5 text-on-surface">{d.label}</td>
                <td className="py-1.5 text-right text-on-surface">{formatValue(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={`relative ${colorClassName}`}>
          <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full" style={{ height }} role="img" aria-label="Gráfico de barras">
            {/* Línea base */}
            <line x1="0" y1={height - PADDING_BOTTOM} x2={WIDTH} y2={height - PADDING_BOTTOM} stroke="var(--color-outline-variant)" strokeWidth="1" />

            {data.map((d, i) => {
              const barHeight = (d.value / max) * chartHeight;
              const x = i * barWidth + (barWidth - barInnerWidth) / 2;
              const yTop = height - PADDING_BOTTOM - barHeight;
              const yBottom = height - PADDING_BOTTOM;
              const isHovered = hovered === i;

              return (
                <g key={d.label}>
                  {/* Hit target más grande que la barra visual */}
                  <rect
                    x={i * barWidth} y={PADDING_TOP} width={barWidth} height={chartHeight}
                    fill="transparent"
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                  />
                  <path
                    d={roundedTopBarPath(x, yTop, barInnerWidth, yBottom, RADIUS)}
                    fill="currentColor"
                    opacity={isHovered ? 1 : 0.75}
                  />
                  <text
                    x={i * barWidth + barWidth / 2} y={height - 10}
                    textAnchor="middle" fontSize="11"
                    fill="var(--color-on-surface-variant)"
                  >
                    {d.label}
                  </text>
                  {isHovered && (
                    <g>
                      <rect
                        x={Math.min(Math.max(x - 20, 4), WIDTH - 84)} y={Math.max(yTop - 26, 2)}
                        width="80" height="20" rx="6"
                        fill="var(--color-surface-container-highest)"
                        stroke="var(--color-outline-variant)"
                      />
                      <text
                        x={Math.min(Math.max(x - 20, 4), WIDTH - 84) + 40} y={Math.max(yTop - 26, 2) + 14}
                        textAnchor="middle" fontSize="11" fontWeight={600}
                        fill="var(--color-on-surface)"
                      >
                        {formatValue(d.value)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {data.every((d) => d.value === 0) && !showTable && (
        <p className={`mt-2 text-center text-on-surface-variant ${md3BodyMediumClass}`}>Todavía no hay datos en este período.</p>
      )}
    </div>
  );
};

"use client";

import * as React from "react";

type ChartCtor = new (
  ctx: CanvasRenderingContext2D,
  config: unknown
) => { destroy: () => void };

export interface EnrollmentChartProps {
  labels: string[];
  enrollments: number[];
  target?: number[];
}

export function EnrollmentChart({ labels, enrollments, target }: EnrollmentChartProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const Chart = (window as unknown as { Chart?: ChartCtor }).Chart;
    if (!canvas || !Chart) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, "rgba(46, 125, 50, 0.8)");
    gradient.addColorStop(1, "rgba(46, 125, 50, 0.1)");

    const targetGradient = ctx.createLinearGradient(0, 0, 0, 200);
    targetGradient.addColorStop(0, "rgba(212, 175, 55, 0.6)");
    targetGradient.addColorStop(1, "rgba(212, 175, 55, 0.1)");

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'New Enrollments',
            data: enrollments,
            borderColor: '#2E7D32',
            backgroundColor: gradient,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#2E7D32',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          ...(target ? [{
            label: 'Target',
            data: target,
            borderColor: '#D4AF37',
            backgroundColor: targetGradient,
            borderWidth: 2,
            borderDash: [5, 5] as number[],
            fill: false,
            tension: 0.2,
            pointBackgroundColor: '#D4AF37',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
          }] : [])
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(107, 114, 128, 0.1)', drawBorder: false },
          },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    } as unknown);

    return () => chart?.destroy();
  }, [labels, enrollments, target]);

  return (
    <div className="relative h-64">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

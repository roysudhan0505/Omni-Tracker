import React from 'react';
import { TrackedObject } from '../types/vision';
import { BarChart3, Compass, Gauge, PieChart } from 'lucide-react';

interface AnalyticsChartsProps {
  tracks: TrackedObject[];
  totalCumulativeTracked: number;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  tracks,
  totalCumulativeTracked,
}) => {
  // Aggregate class counts
  const classCounts: Record<string, { count: number; color: string }> = {};
  for (const t of tracks) {
    if (!classCounts[t.class]) {
      classCounts[t.class] = { count: 0, color: t.color };
    }
    classCounts[t.class].count++;
  }

  // Aggregate speed bins
  const speedBins = {
    stationary: 0, // < 3 km/h
    walking: 0, // 3 - 10 km/h
    moderate: 0, // 10 - 30 km/h
    fast: 0, // > 30 km/h
  };

  // Aggregate direction counts
  const directionCounts: Record<string, number> = {
    N: 0,
    S: 0,
    E: 0,
    W: 0,
    Static: 0,
  };

  for (const t of tracks) {
    const speed = t.velocity.speed * 12;
    if (speed < 3) speedBins.stationary++;
    else if (speed < 10) speedBins.walking++;
    else if (speed < 30) speedBins.moderate++;
    else speedBins.fast++;

    if (t.direction.includes('N')) directionCounts.N++;
    else if (t.direction.includes('S')) directionCounts.S++;
    else if (t.direction.includes('E')) directionCounts.E++;
    else if (t.direction.includes('W')) directionCounts.W++;
    else directionCounts.Static++;
  }

  const totalCurrent = Math.max(1, tracks.length);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {/* Chart 1: Class Category Breakdown */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
          <div className="flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-cyan-400" />
            <span>Class Distribution</span>
          </div>
          <span className="font-mono text-slate-500">{tracks.length} active</span>
        </div>

        <div className="flex flex-col gap-2.5 mt-1">
          {Object.keys(classCounts).length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">No objects in frame</div>
          ) : (
            Object.entries(classCounts).map(([className, item]) => {
              const pct = Math.round((item.count / totalCurrent) * 100);
              return (
                <div key={className} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize font-medium text-slate-200">{className}</span>
                    <span className="font-mono text-slate-400 tabular-nums">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chart 2: Speed Spectrum Histogram */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span>Velocity Spectrum</span>
          </div>
          <span className="font-mono text-slate-500">SORT Derivatives</span>
        </div>

        <div className="grid grid-cols-4 gap-2 h-36 items-end mt-2 pt-4 px-2 border-b border-slate-800">
          <div className="flex flex-col items-center gap-1.5 h-full justify-end">
            <span className="text-[10px] font-mono text-slate-400 tabular-nums">
              {speedBins.stationary}
            </span>
            <div
              className="w-full bg-slate-700 hover:bg-slate-600 rounded-t transition-all"
              style={{
                height: `${Math.max(8, (speedBins.stationary / totalCurrent) * 100)}%`,
              }}
            />
            <span className="text-[9px] font-mono text-slate-400 text-center leading-tight">
              Static
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5 h-full justify-end">
            <span className="text-[10px] font-mono text-slate-400 tabular-nums">
              {speedBins.walking}
            </span>
            <div
              className="w-full bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all"
              style={{
                height: `${Math.max(8, (speedBins.walking / totalCurrent) * 100)}%`,
              }}
            />
            <span className="text-[9px] font-mono text-slate-400 text-center leading-tight">
              Slow
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5 h-full justify-end">
            <span className="text-[10px] font-mono text-slate-400 tabular-nums">
              {speedBins.moderate}
            </span>
            <div
              className="w-full bg-cyan-500/80 hover:bg-cyan-400 rounded-t transition-all"
              style={{
                height: `${Math.max(8, (speedBins.moderate / totalCurrent) * 100)}%`,
              }}
            />
            <span className="text-[9px] font-mono text-slate-400 text-center leading-tight">
              Cruise
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5 h-full justify-end">
            <span className="text-[10px] font-mono text-slate-400 tabular-nums">
              {speedBins.fast}
            </span>
            <div
              className="w-full bg-amber-500/80 hover:bg-amber-400 rounded-t transition-all"
              style={{
                height: `${Math.max(8, (speedBins.fast / totalCurrent) * 100)}%`,
              }}
            />
            <span className="text-[9px] font-mono text-slate-400 text-center leading-tight">
              Fast
            </span>
          </div>
        </div>
      </div>

      {/* Chart 3: Directional Compass Vector Flow */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-violet-400" />
            <span>Directional Flow</span>
          </div>
          <span className="font-mono text-slate-500">Angle Histogram</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">Northbound (↑)</span>
            <span className="font-mono font-bold text-white text-sm tabular-nums">
              {directionCounts.N}
            </span>
          </div>
          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">Southbound (↓)</span>
            <span className="font-mono font-bold text-white text-sm tabular-nums">
              {directionCounts.S}
            </span>
          </div>
          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">Eastbound (→)</span>
            <span className="font-mono font-bold text-white text-sm tabular-nums">
              {directionCounts.E}
            </span>
          </div>
          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">Westbound (←)</span>
            <span className="font-mono font-bold text-white text-sm tabular-nums">
              {directionCounts.W}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

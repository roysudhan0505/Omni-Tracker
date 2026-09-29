import React from 'react';
import { PipelineMetrics, TripwireConfig } from '../types/vision';
import { Activity, Disc, Zap, ArrowDownUp } from 'lucide-react';

interface MetricsCardsProps {
  metrics: PipelineMetrics;
  tripwire: TripwireConfig;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics, tripwire }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
      {/* Metric 1: Active Targets */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Active Targets</span>
          <Activity className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {metrics.activeTracksCount}
          </span>
          <span className="text-xs text-slate-500 font-mono">in perimeter</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <span>Detections: {metrics.totalDetectionsCurrentFrame}</span>
          <span aria-hidden="true">·</span>
          <span>Kalman confirmed</span>
        </div>
      </div>

      {/* Metric 2: Total Cumulative Objects */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Cumulative Tracks</span>
          <Disc className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {metrics.totalUniqueTracked}
          </span>
          <span className="text-xs text-slate-500 font-mono">unique IDs</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <span>Re-ID matches: {Math.max(0, metrics.totalUniqueTracked - metrics.activeTracksCount)}</span>
          <span aria-hidden="true">·</span>
          <span>Logged</span>
        </div>
      </div>

      {/* Metric 3: Pipeline Latency & FPS */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Pipeline Speed</span>
          <Zap className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {metrics.fps.toFixed(1)}
          </span>
          <span className="text-xs text-slate-500 font-mono">FPS</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <span>Det: {metrics.inferenceTimeMs.toFixed(1)}ms</span>
          <span aria-hidden="true">·</span>
          <span>Track: {metrics.trackingTimeMs.toFixed(1)}ms</span>
        </div>
      </div>

      {/* Metric 4: Tripwire Flow */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Tripwire Passage</span>
          <ArrowDownUp className="w-4 h-4 text-violet-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {tripwire.inCount + tripwire.outCount}
          </span>
          <span className="text-xs text-slate-500 font-mono">crossings</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <span className="text-emerald-400">IN: {tripwire.inCount}</span>
          <span aria-hidden="true">·</span>
          <span className="text-cyan-400">OUT: {tripwire.outCount}</span>
        </div>
      </div>
    </div>
  );
};

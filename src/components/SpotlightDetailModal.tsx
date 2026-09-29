import React from 'react';
import { TrackedObject } from '../types/vision';
import { X, Crosshair, Navigation, Clock, Activity, Maximize2 } from 'lucide-react';

interface SpotlightDetailModalProps {
  track: TrackedObject | null;
  onClose: () => void;
}

export const SpotlightDetailModal: React.FC<SpotlightDetailModalProps> = ({ track, onClose }) => {
  if (!track) return null;

  const [x, y, w, h] = track.bbox;
  const speedKmh = Math.round(track.velocity.speed * 12);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 rounded-xl p-4 shadow-2xl flex flex-col gap-3 font-sans">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          <span className="text-sm font-bold text-white">Target Telemetry</span>
          <span className="text-xs font-mono text-cyan-400 font-bold">
            #{track.id.toString().padStart(2, '0')}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
          <span className="text-slate-500 text-[10px] uppercase block">Classification</span>
          <div className="flex items-center gap-1.5 mt-0.5 font-bold text-white font-sans capitalize">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: track.color }} />
            <span>{track.class}</span>
          </div>
        </div>

        <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
          <span className="text-slate-500 text-[10px] uppercase block">Confidence</span>
          <span className="font-bold text-emerald-400 text-sm mt-0.5 block tabular-nums">
            {Math.round(track.score * 100)}%
          </span>
        </div>

        <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
          <span className="text-slate-500 text-[10px] uppercase block">Velocity</span>
          <span className="font-bold text-cyan-400 text-sm mt-0.5 block tabular-nums">
            {speedKmh} km/h
          </span>
        </div>

        <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
          <span className="text-slate-500 text-[10px] uppercase block">Direction</span>
          <div className="flex items-center gap-1 mt-0.5 text-slate-200 font-bold">
            <Navigation className="w-3 h-3 text-cyan-400" />
            <span>{track.direction}</span>
          </div>
        </div>
      </div>

      <div className="p-2 bg-slate-950/80 rounded border border-slate-800 text-xs font-mono flex flex-col gap-1">
        <div className="flex justify-between text-slate-400">
          <span>Bounding Box [x,y,w,h]:</span>
          <span className="text-slate-200 tabular-nums">
            [{Math.round(x)}, {Math.round(y)}, {Math.round(w)}, {Math.round(h)}]
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Dwell Time:</span>
          <span className="text-slate-200 tabular-nums">{track.dwellTimeSeconds.toFixed(1)}s</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Trajectory Points:</span>
          <span className="text-slate-200 tabular-nums">{track.trajectory.length} pts</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Kalman Hits:</span>
          <span className="text-slate-200 tabular-nums">{track.hits} updates</span>
        </div>
      </div>
    </div>
  );
};

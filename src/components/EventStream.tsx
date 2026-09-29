import React from 'react';
import { TrackingEvent } from '../types/vision';
import { AlertCircle, ArrowDownUp, CheckCircle2, PlusCircle, Trash2 } from 'lucide-react';

interface EventStreamProps {
  events: TrackingEvent[];
  onClearEvents: () => void;
}

export const EventStream: React.FC<EventStreamProps> = ({ events, onClearEvents }) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Real-Time MOT Event Stream</span>
          <span className="text-xs text-slate-400 font-mono">({events.length} logged)</span>
        </div>
        <button
          type="button"
          onClick={onClearEvents}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Log</span>
        </button>
      </div>

      <div className="p-3 max-h-[360px] overflow-y-auto flex flex-col gap-2 font-mono text-xs">
        {events.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-sans">
            Awaiting detection and tracking trigger events...
          </div>
        ) : (
          events.slice(0, 50).map((evt) => {
            const timeStr = new Date(evt.timestamp).toISOString().substring(11, 23);

            let icon = <PlusCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
            if (evt.type === 'track_confirmed') {
              icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
            } else if (evt.type === 'tripwire_in' || evt.type === 'tripwire_out') {
              icon = <ArrowDownUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
            } else if (evt.type === 'track_lost') {
              icon = <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
            }

            return (
              <div
                key={evt.id}
                className="flex items-center gap-2.5 p-2 rounded bg-slate-950/60 border border-slate-800/60 hover:border-slate-700/80 transition-colors"
              >
                <span className="text-slate-500 tabular-nums shrink-0">{timeStr}</span>
                {icon}
                <span className="text-slate-300 truncate font-sans">{evt.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

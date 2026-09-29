import React from 'react';
import { TrackedObject } from '../types/vision';
import { Crosshair, Navigation2, Clock } from 'lucide-react';

interface TrackRosterTableProps {
  tracks: TrackedObject[];
  spotlightTrackId: number | null;
  onSelectTrack: (trackId: number | null) => void;
}

export const TrackRosterTable: React.FC<TrackRosterTableProps> = ({
  tracks,
  spotlightTrackId,
  onSelectTrack,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Active Object Tracking Roster</span>
          <span className="text-xs text-slate-400 font-mono">({tracks.length} in scope)</span>
        </div>
        <span className="text-xs text-slate-500 font-mono">SORT State Vector: [u, v, s, r, u̇, v̇, ṡ]</span>
      </div>

      <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-md text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-3">Track ID</th>
              <th className="py-2.5 px-3">Class</th>
              <th className="py-2.5 px-3">Confidence</th>
              <th className="py-2.5 px-3">Est. Speed</th>
              <th className="py-2.5 px-3">Direction</th>
              <th className="py-2.5 px-3">Dwell Time</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {tracks.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                  No active tracked objects detected in the current perimeter.
                </td>
              </tr>
            ) : (
              tracks.map((track) => {
                const isSpotlight = spotlightTrackId === track.id;
                const speedKmh = Math.round(track.velocity.speed * 12);

                return (
                  <tr
                    key={track.id}
                    className={`transition-colors hover:bg-slate-800/40 ${
                      isSpotlight ? 'bg-cyan-950/30' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-white">
                      <span className="text-cyan-400">#</span>
                      {track.id.toString().padStart(2, '0')}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 font-sans font-medium">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: track.color }}
                        />
                        <span className="capitalize">{track.class}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 tabular-nums text-slate-200">
                      {Math.round(track.score * 100)}%
                    </td>
                    <td className="py-2.5 px-3 tabular-nums text-slate-200">
                      {speedKmh > 2 ? `${speedKmh} km/h` : '< 2 km/h'}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Navigation2 className="w-3 h-3 text-slate-400" />
                        <span>{track.direction}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 tabular-nums">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{track.dwellTimeSeconds.toFixed(1)}s</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {track.status === 'confirmed' ? (
                        <span className="text-emerald-400">Confirmed</span>
                      ) : track.status === 'lost' ? (
                        <span className="text-rose-400">Coasting</span>
                      ) : (
                        <span className="text-amber-400">Tentative</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectTrack(isSpotlight ? null : track.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
                          isSpotlight
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>{isSpotlight ? 'Locked' : 'Spotlight'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

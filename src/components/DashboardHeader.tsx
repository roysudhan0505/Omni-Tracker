import React from 'react';
import { VideoSourceType, VIDEO_SOURCES } from '../core/videoSources';
import { Camera, Download, Layers, ShieldCheck } from 'lucide-react';

interface DashboardHeaderProps {
  currentSource: VideoSourceType;
  onSelectSource: (source: VideoSourceType) => void;
  activeTab: 'monitor' | 'analytics' | 'tracks' | 'events';
  onSelectTab: (tab: 'monitor' | 'analytics' | 'tracks' | 'events') => void;
  onExportCsv: () => void;
  onOpenFilePicker: () => void;
  isModelReady: boolean;
  fps: number;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentSource,
  onSelectSource,
  activeTab,
  onSelectTab,
  onExportCsv,
  onOpenFilePicker,
  isModelReady,
  fps,
}) => {
  return (
    <header className="w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark in display face */}
      <div className="flex items-center gap-3">
        <a href="/" className="text-lg font-bold tracking-tight text-white hover:text-cyan-400 transition-colors">
          OmniTrack Vision
        </a>
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SORT Engine Active</span>
          </span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>{fps.toFixed(1)} FPS</span>
        </div>
      </div>

      {/* Zone 2: Clean navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        <button
          type="button"
          onClick={() => onSelectTab('monitor')}
          className={`transition-colors pb-0.5 border-b-2 ${
            activeTab === 'monitor'
              ? 'text-cyan-400 border-cyan-400 font-semibold'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          Detection Console
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('tracks')}
          className={`transition-colors pb-0.5 border-b-2 ${
            activeTab === 'tracks'
              ? 'text-cyan-400 border-cyan-400 font-semibold'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          Track Roster
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('analytics')}
          className={`transition-colors pb-0.5 border-b-2 ${
            activeTab === 'analytics'
              ? 'text-cyan-400 border-cyan-400 font-semibold'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          Spatial Analytics
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('events')}
          className={`transition-colors pb-0.5 border-b-2 ${
            activeTab === 'events'
              ? 'text-cyan-400 border-cyan-400 font-semibold'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          MOT Event Log
        </button>
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2.5">
        {/* Feed Source Dropdown */}
        <div className="relative">
          <select
            value={currentSource}
            onChange={(e) => {
              const val = e.target.value as VideoSourceType;
              if (val === 'file') {
                onOpenFilePicker();
              } else {
                onSelectSource(val);
              }
            }}
            className="appearance-none bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-xs font-medium text-slate-200 py-1.5 pl-3 pr-7 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
          >
            {VIDEO_SOURCES.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                {s.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>

        {/* Export MOT Data */}
        <button
          type="button"
          onClick={onExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap"
          title="Export Multi-Object Tracking dataset (CSV format)"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Export MOT</span>
        </button>
      </div>
    </header>
  );
};

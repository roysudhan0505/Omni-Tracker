import React from 'react';
import { ModelConfig, TrackerConfig, TripwireConfig } from '../types/vision';
import { Sliders, Eye, Cpu, Navigation, RotateCcw } from 'lucide-react';

interface ControlsPanelProps {
  modelConfig: ModelConfig;
  onChangeModelConfig: (cfg: Partial<ModelConfig>) => void;
  trackerConfig: TrackerConfig;
  onChangeTrackerConfig: (cfg: Partial<TrackerConfig>) => void;
  tripwireConfig: TripwireConfig;
  onChangeTripwireConfig: (cfg: Partial<TripwireConfig>) => void;
  onResetTripwire: () => void;
  onResetTracks: () => void;
  showBoundingBoxes: boolean;
  onToggleBoundingBoxes: () => void;
  showTrackingIds: boolean;
  onToggleTrackingIds: () => void;
  showTrajectoryTrails: boolean;
  onToggleTrajectoryTrails: () => void;
  showVelocityVectors: boolean;
  onToggleVelocityVectors: () => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  modelConfig,
  onChangeModelConfig,
  trackerConfig,
  onChangeTrackerConfig,
  tripwireConfig,
  onChangeTripwireConfig,
  onResetTripwire,
  onResetTracks,
  showBoundingBoxes,
  onToggleBoundingBoxes,
  showTrackingIds,
  onToggleTrackingIds,
  showTrajectoryTrails,
  onToggleTrajectoryTrails,
  showVelocityVectors,
  onToggleVelocityVectors,
  showHeatmap,
  onToggleHeatmap,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-5 text-sm text-slate-300">
      {/* Section 1: Object Detector Configuration */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Detection Model</span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400">Real-Time</span>
        </div>

        {/* Model Architecture Radio Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => onChangeModelConfig({ modelType: 'yolov8' })}
            className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
              modelConfig.modelType === 'yolov8'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            YOLOv8
          </button>
          <button
            type="button"
            onClick={() => onChangeModelConfig({ modelType: 'faster_rcnn' })}
            className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
              modelConfig.modelType === 'faster_rcnn'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Faster R-CNN
          </button>
          <button
            type="button"
            onClick={() => onChangeModelConfig({ modelType: 'coco_ssd' })}
            className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
              modelConfig.modelType === 'coco_ssd'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            COCO-SSD
          </button>
        </div>

        {/* Confidence Threshold */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>Confidence Threshold</span>
            <span className="text-slate-200">{Math.round(modelConfig.confidenceThreshold * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.15}
            max={0.9}
            step={0.05}
            value={modelConfig.confidenceThreshold}
            onChange={(e) => onChangeModelConfig({ confidenceThreshold: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* NMS IoU Threshold */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>NMS Suppression IoU</span>
            <span className="text-slate-200">{modelConfig.nmsIouThreshold.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.2}
            max={0.8}
            step={0.05}
            value={modelConfig.nmsIouThreshold}
            onChange={(e) => onChangeModelConfig({ nmsIouThreshold: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      <div className="h-px bg-slate-800/80" />

      {/* Section 2: SORT & Deep-SORT Tracker Engine */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tracking Algorithm</span>
          </div>
          <button
            type="button"
            onClick={onResetTracks}
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white transition-colors"
            title="Reset active track IDs and history"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset IDs</span>
          </button>
        </div>

        {/* SORT vs Deep SORT selector */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => onChangeTrackerConfig({ algorithm: 'sort' })}
            className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
              trackerConfig.algorithm === 'sort'
                ? 'bg-slate-800 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SORT (IoU + Kalman)
          </button>
          <button
            type="button"
            onClick={() => onChangeTrackerConfig({ algorithm: 'deep_sort' })}
            className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
              trackerConfig.algorithm === 'deep_sort'
                ? 'bg-slate-800 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Deep SORT (Re-ID)
          </button>
        </div>

        {/* Max Coasting Age (frames) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>Max Coasting Age</span>
            <span className="text-slate-200">{trackerConfig.maxAge} frames</span>
          </div>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={trackerConfig.maxAge}
            onChange={(e) => onChangeTrackerConfig({ maxAge: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Min Hits to Confirm Track */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>Confirmation Threshold</span>
            <span className="text-slate-200">{trackerConfig.minHits} hits</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={trackerConfig.minHits}
            onChange={(e) => onChangeTrackerConfig({ minHits: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      <div className="h-px bg-slate-800/80" />

      {/* Section 3: Visual Overlays */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Eye className="w-3.5 h-3.5 text-violet-400" />
          <span>Canvas Overlays</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showBoundingBoxes}
              onChange={onToggleBoundingBoxes}
              className="accent-cyan-400 rounded"
            />
            <span>Bounding Boxes</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showTrackingIds}
              onChange={onToggleTrackingIds}
              className="accent-cyan-400 rounded"
            />
            <span>Tracking IDs</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showTrajectoryTrails}
              onChange={onToggleTrajectoryTrails}
              className="accent-cyan-400 rounded"
            />
            <span>Trajectory Trails</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showVelocityVectors}
              onChange={onToggleVelocityVectors}
              className="accent-cyan-400 rounded"
            />
            <span>Velocity Vectors</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none col-span-2">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={onToggleHeatmap}
              className="accent-rose-400 rounded"
            />
            <span>Density Heatmap Accumulation</span>
          </label>
        </div>
      </div>

      <div className="h-px bg-slate-800/80" />

      {/* Section 4: Virtual Tripwire Counting */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Navigation className="w-3.5 h-3.5 text-amber-400" />
            <span>Counting Tripwire</span>
          </div>
          <button
            type="button"
            onClick={onResetTripwire}
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Count</span>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={tripwireConfig.enabled}
              onChange={(e) => onChangeTripwireConfig({ enabled: e.target.checked })}
              className="accent-amber-400 rounded"
            />
            <span>Enable Counting Line</span>
          </label>

          {tripwireConfig.enabled && (
            <button
              type="button"
              onClick={() =>
                onChangeTripwireConfig({
                  orientation:
                    tripwireConfig.orientation === 'horizontal' ? 'vertical' : 'horizontal',
                })
              }
              className="text-xs font-mono text-amber-300 hover:underline"
            >
              {tripwireConfig.orientation.toUpperCase()}
            </button>
          )}
        </div>

        {tripwireConfig.enabled && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Line Position</span>
              <span className="text-slate-200">
                {Math.round(tripwireConfig.positionFraction * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.02}
              value={tripwireConfig.positionFraction}
              onChange={(e) =>
                onChangeTripwireConfig({ positionFraction: parseFloat(e.target.value) })
              }
              className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
};

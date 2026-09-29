/**
 * OmniTrack Vision
 * Real-Time Object Detection & SORT Tracking Dashboard
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Detection,
  TrackedObject,
  TrackerConfig,
  ModelConfig,
  TripwireConfig,
  PipelineMetrics,
  TrackingEvent,
} from './types/vision';
import { SortTrackerEngine } from './core/sortTracker';
import { runDetection, loadCocoModel } from './core/detector';
import { BenchmarkFeedEngine, VideoSourceType } from './core/videoSources';
import { DashboardHeader } from './components/DashboardHeader';
import { VisionCanvas } from './components/VisionCanvas';
import { MetricsCards } from './components/MetricsCards';
import { ControlsPanel } from './components/ControlsPanel';
import { TrackRosterTable } from './components/TrackRosterTable';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { EventStream } from './components/EventStream';
import { SpotlightDetailModal } from './components/SpotlightDetailModal';

export default function App() {
  // Feed source
  const [currentSource, setCurrentSource] = useState<VideoSourceType>('traffic');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Model & Tracker Configurations
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    modelType: 'yolov8',
    confidenceThreshold: 0.45,
    nmsIouThreshold: 0.45,
    targetClasses: [],
  });

  const [trackerConfig, setTrackerConfig] = useState<TrackerConfig>({
    algorithm: 'sort',
    maxAge: 25,
    minHits: 2,
    iouThreshold: 0.3,
    featureSimilarityWeight: 0.35,
  });

  const [tripwireConfig, setTripwireConfig] = useState<TripwireConfig>({
    enabled: true,
    orientation: 'horizontal',
    positionFraction: 0.5,
    direction: 'bidirectional',
    inCount: 0,
    outCount: 0,
  });

  // Visual Overlays toggles
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [showTrackingIds, setShowTrackingIds] = useState(true);
  const [showTrajectoryTrails, setShowTrajectoryTrails] = useState(true);
  const [showVelocityVectors, setShowVelocityVectors] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Spotlight Track
  const [spotlightTrackId, setSpotlightTrackId] = useState<number | null>(null);

  // Dashboard Active Tab
  const [activeTab, setActiveTab] = useState<'monitor' | 'analytics' | 'tracks' | 'events'>('monitor');

  // Metrics & State
  const [metrics, setMetrics] = useState<PipelineMetrics>({
    fps: 60,
    inferenceTimeMs: 4.2,
    trackingTimeMs: 1.8,
    activeTracksCount: 0,
    totalUniqueTracked: 0,
    totalDetectionsCurrentFrame: 0,
  });

  const [tracks, setTracks] = useState<TrackedObject[]>([]);
  const [events, setEvents] = useState<TrackingEvent[]>([]);

  // Engine references
  const benchmarkEngineRef = useRef<BenchmarkFeedEngine | null>(null);
  const sortEngineRef = useRef<SortTrackerEngine>(new SortTrackerEngine());
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const fpsEmaRef = useRef<number>(60);
  const frameCounterRef = useRef<number>(0);

  // Initialize Benchmark Engine on mount
  useEffect(() => {
    benchmarkEngineRef.current = new BenchmarkFeedEngine(854, 480);
    // Preload COCO model in background
    loadCocoModel();

    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Handle switching video sources
  const handleSelectSource = useCallback(async (source: VideoSourceType) => {
    setCurrentSource(source);
    setSpotlightTrackId(null);

    // Stop active webcam if switching away
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((t) => t.stop());
      webcamStreamRef.current = null;
    }

    if (source === 'webcam') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        webcamStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error('Webcam permission error:', err);
        // Fallback to traffic benchmark
        setCurrentSource('traffic');
        if (benchmarkEngineRef.current) {
          benchmarkEngineRef.current.switchFeed('traffic');
        }
      }
    } else if (source === 'file') {
      fileInputRef.current?.click();
    } else {
      // Benchmark feed
      if (benchmarkEngineRef.current) {
        benchmarkEngineRef.current.switchFeed(source);
      }
    }
  }, []);

  // Handle Video File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && videoRef.current) {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
      }
      videoRef.current.srcObject = null;
      videoRef.current.src = URL.createObjectURL(file);
      videoRef.current.loop = true;
      videoRef.current.play();
      setCurrentSource('file');
    }
  };

  // Main Computer Vision Processing Loop
  const processFrame = useCallback(async () => {
    const now = performance.now();
    const deltaMs = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    if (deltaMs > 0) {
      const currentFps = 1000 / deltaMs;
      fpsEmaRef.current = fpsEmaRef.current * 0.9 + currentFps * 0.1;
    }

    frameCounterRef.current++;

    let detections: Detection[] = [];
    let frameWidth = 854;
    let frameHeight = 480;
    let infStart = performance.now();

    const isBenchmark =
      currentSource === 'traffic' ||
      currentSource === 'pedestrians' ||
      currentSource === 'warehouse' ||
      currentSource === 'sports';

    if (isBenchmark && benchmarkEngineRef.current) {
      const engine = benchmarkEngineRef.current;
      if (isPlaying) {
        engine.renderFrame();
      }
      const benchCanvas = engine.getCanvas();
      frameWidth = benchCanvas.width;
      frameHeight = benchCanvas.height;

      detections = await runDetection(benchCanvas, modelConfig);
    } else if (videoRef.current && videoRef.current.readyState >= 2) {
      const video = videoRef.current;
      frameWidth = video.videoWidth || 854;
      frameHeight = video.videoHeight || 480;

      detections = await runDetection(video, modelConfig);
    }

    const infDuration = performance.now() - infStart;

    // Tracking Step (SORT / Deep SORT)
    const trackStart = performance.now();
    const trackingResult = sortEngineRef.current.update(
      detections,
      trackerConfig,
      tripwireConfig,
      { width: frameWidth, height: frameHeight }
    );
    const trackDuration = performance.now() - trackStart;

    setTracks(trackingResult.tracks);

    // Update Tripwire count if changed
    if (trackingResult.tripwireUpdated) {
      setTripwireConfig((prev) => ({
        ...prev,
        inCount: trackingResult.tripwireUpdated!.inCount,
        outCount: trackingResult.tripwireUpdated!.outCount,
      }));
    }

    // Append new events
    if (trackingResult.events.length > 0) {
      setEvents((prev) => [...trackingResult.events, ...prev].slice(0, 100));
    }

    // Update telemetry metrics every 3 frames for smooth UI
    if (frameCounterRef.current % 3 === 0) {
      setMetrics({
        fps: Math.min(60, fpsEmaRef.current),
        inferenceTimeMs: infDuration,
        trackingTimeMs: trackDuration,
        activeTracksCount: trackingResult.tracks.length,
        totalUniqueTracked: sortEngineRef.current.getTotalTrackedCount(),
        totalDetectionsCurrentFrame: detections.length,
      });
    }

    animFrameIdRef.current = requestAnimationFrame(processFrame);
  }, [currentSource, isPlaying, modelConfig, trackerConfig, tripwireConfig]);

  // Start / restart loop when dependencies change
  useEffect(() => {
    animFrameIdRef.current = requestAnimationFrame(processFrame);
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [processFrame]);

  // Snapshot PNG export
  const handleTakeSnapshot = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `omnitrack_detection_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Export Multiple Object Tracking (MOT) dataset in CSV format
  const handleExportCsv = () => {
    if (tracks.length === 0) return;

    let csv = 'frame_id,track_id,bb_left,bb_top,bb_width,bb_height,confidence,class,speed_kmh,direction\n';
    tracks.forEach((t) => {
      const [x, y, w, h] = t.bbox;
      const speed = Math.round(t.velocity.speed * 12);
      csv += `${frameCounterRef.current},${t.id},${x.toFixed(1)},${y.toFixed(1)},${w.toFixed(1)},${h.toFixed(1)},${t.score.toFixed(3)},${t.class},${speed},${t.direction}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `omnitrack_mot_dataset_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset counters
  const handleResetTripwire = () => {
    setTripwireConfig((prev) => ({ ...prev, inCount: 0, outCount: 0 }));
  };

  const handleResetTracks = () => {
    sortEngineRef.current.reset();
    setTracks([]);
    setSpotlightTrackId(null);
  };

  // Step single frame forward when paused
  const handleStepFrame = () => {
    if (!isPlaying && benchmarkEngineRef.current) {
      benchmarkEngineRef.current.renderFrame();
    }
  };

  // Spotlighted Track Object
  const spotlightTrack = tracks.find((t) => t.id === spotlightTrackId) || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Hidden File Input & Video Element */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
        autoPlay
        crossOrigin="anonymous"
      />

      {/* Top Bar Header Contract */}
      <DashboardHeader
        currentSource={currentSource}
        onSelectSource={handleSelectSource}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onExportCsv={handleExportCsv}
        onOpenFilePicker={() => fileInputRef.current?.click()}
        isModelReady={true}
        fps={metrics.fps}
      />

      {/* Main Dashboard Body */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-4 sm:p-6 flex flex-col gap-5">
        {/* KPI Metrics Strip */}
        <MetricsCards metrics={metrics} tripwire={tripwireConfig} />

        {/* Core Workspace: Canvas & Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Main Visualizer Canvas Area (8 cols on desktop) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <VisionCanvas
              sourceCanvas={
                currentSource !== 'webcam' && currentSource !== 'file'
                  ? benchmarkEngineRef.current?.getCanvas()
                  : undefined
              }
              videoElement={
                currentSource === 'webcam' || currentSource === 'file'
                  ? videoRef.current
                  : null
              }
              tracks={tracks}
              showBoundingBoxes={showBoundingBoxes}
              showTrackingIds={showTrackingIds}
              showTrajectoryTrails={showTrajectoryTrails}
              showVelocityVectors={showVelocityVectors}
              showHeatmap={showHeatmap}
              tripwireConfig={tripwireConfig}
              spotlightTrackId={spotlightTrackId}
              onSelectTrack={setSpotlightTrackId}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onStepFrame={handleStepFrame}
              onTakeSnapshot={handleTakeSnapshot}
              isWebcam={currentSource === 'webcam'}
            />

            {/* Quick Context Bar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono px-2 py-1 bg-slate-900/30 rounded-lg border border-slate-800/40">
              <div className="flex items-center gap-2">
                <span>Model: {modelConfig.modelType.toUpperCase()}</span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span>Tracker: {trackerConfig.algorithm.toUpperCase()}</span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span>Conf: {Math.round(modelConfig.confidenceThreshold * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Hungarian IoU: {trackerConfig.iouThreshold}</span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span>Max Coasting: {trackerConfig.maxAge}f</span>
              </div>
            </div>
          </div>

          {/* Controls & Parameters Drawer (4 cols on desktop) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <ControlsPanel
              modelConfig={modelConfig}
              onChangeModelConfig={(cfg) => setModelConfig((prev) => ({ ...prev, ...cfg }))}
              trackerConfig={trackerConfig}
              onChangeTrackerConfig={(cfg) => setTrackerConfig((prev) => ({ ...prev, ...cfg }))}
              tripwireConfig={tripwireConfig}
              onChangeTripwireConfig={(cfg) => setTripwireConfig((prev) => ({ ...prev, ...cfg }))}
              onResetTripwire={handleResetTripwire}
              onResetTracks={handleResetTracks}
              showBoundingBoxes={showBoundingBoxes}
              onToggleBoundingBoxes={() => setShowBoundingBoxes(!showBoundingBoxes)}
              showTrackingIds={showTrackingIds}
              onToggleTrackingIds={() => setShowTrackingIds(!showTrackingIds)}
              showTrajectoryTrails={showTrajectoryTrails}
              onToggleTrajectoryTrails={() => setShowTrajectoryTrails(!showTrajectoryTrails)}
              showVelocityVectors={showVelocityVectors}
              onToggleVelocityVectors={() => setShowVelocityVectors(!showVelocityVectors)}
              showHeatmap={showHeatmap}
              onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
            />
          </div>
        </div>

        {/* Lower Analytic Sections (Controlled by Navigation Tabs) */}
        <section className="mt-2 flex flex-col gap-4">
          {activeTab === 'monitor' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TrackRosterTable
                tracks={tracks}
                spotlightTrackId={spotlightTrackId}
                onSelectTrack={setSpotlightTrackId}
              />
              <EventStream
                events={events}
                onClearEvents={() => setEvents([])}
              />
            </div>
          )}

          {activeTab === 'tracks' && (
            <TrackRosterTable
              tracks={tracks}
              spotlightTrackId={spotlightTrackId}
              onSelectTrack={setSpotlightTrackId}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsCharts
              tracks={tracks}
              totalCumulativeTracked={metrics.totalUniqueTracked}
            />
          )}

          {activeTab === 'events' && (
            <EventStream
              events={events}
              onClearEvents={() => setEvents([])}
            />
          )}
        </section>
      </main>

      {/* Target Spotlight Detail Telemetry Modal */}
      {spotlightTrack && (
        <SpotlightDetailModal
          track={spotlightTrack}
          onClose={() => setSpotlightTrackId(null)}
        />
      )}
    </div>
  );
}

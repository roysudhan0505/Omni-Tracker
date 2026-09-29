import React, { useRef, useEffect } from 'react';
import { TrackedObject, TripwireConfig } from '../types/vision';
import { Play, Pause, StepForward, Camera, Target, Crosshair } from 'lucide-react';

interface VisionCanvasProps {
  sourceCanvas?: HTMLCanvasElement;
  videoElement?: HTMLVideoElement | null;
  tracks: TrackedObject[];
  showBoundingBoxes: boolean;
  showTrackingIds: boolean;
  showTrajectoryTrails: boolean;
  showVelocityVectors: boolean;
  showHeatmap: boolean;
  tripwireConfig: TripwireConfig;
  spotlightTrackId: number | null;
  onSelectTrack: (trackId: number | null) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepFrame: () => void;
  onTakeSnapshot: () => void;
  isWebcam: boolean;
}

export const VisionCanvas: React.FC<VisionCanvasProps> = ({
  sourceCanvas,
  videoElement,
  tracks,
  showBoundingBoxes,
  showTrackingIds,
  showTrajectoryTrails,
  showVelocityVectors,
  showHeatmap,
  tripwireConfig,
  spotlightTrackId,
  onSelectTrack,
  isPlaying,
  onTogglePlay,
  onStepFrame,
  onTakeSnapshot,
  isWebcam,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapAccumulatorRef = useRef<Float32Array | null>(null);
  const heatmapDimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  // Handle canvas click to select / spotlight track
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Find clicked track
    let clickedId: number | null = null;
    for (const track of tracks) {
      const [x, y, w, h] = track.bbox;
      if (clickX >= x && clickX <= x + w && clickY >= y && clickY <= y + h) {
        clickedId = track.id;
        break;
      }
    }

    if (clickedId === spotlightTrackId) {
      onSelectTrack(null); // toggle off
    } else {
      onSelectTrack(clickedId);
    }
  };

  // Render loop for display canvas
  useEffect(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Synchronize canvas dimensions with source
    let sourceWidth = 854;
    let sourceHeight = 480;

    if (sourceCanvas) {
      sourceWidth = sourceCanvas.width;
      sourceHeight = sourceCanvas.height;
    } else if (videoElement && videoElement.videoWidth) {
      sourceWidth = videoElement.videoWidth;
      sourceHeight = videoElement.videoHeight;
    }

    if (canvas.width !== sourceWidth || canvas.height !== sourceHeight) {
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;
      heatmapAccumulatorRef.current = new Float32Array(sourceWidth * sourceHeight);
      heatmapDimsRef.current = { w: sourceWidth, h: sourceHeight };
    }

    // 1. Draw Background Source (Video or Offscreen Canvas)
    if (sourceCanvas) {
      ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
    } else if (videoElement && videoElement.readyState >= 2) {
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#64748b';
      ctx.font = '14px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('Awaiting Video Stream Input...', canvas.width / 2, canvas.height / 2);
    }

    // 2. Spatial Heatmap Accumulator
    if (showHeatmap && heatmapAccumulatorRef.current) {
      const heat = heatmapAccumulatorRef.current;
      const hw = heatmapDimsRef.current.w;
      const hh = heatmapDimsRef.current.h;

      // Decay previous heat
      for (let i = 0; i < heat.length; i++) {
        heat[i] *= 0.985;
      }

      // Add heat for each active track centroid
      for (const track of tracks) {
        const [x, y, w, h] = track.bbox;
        const cx = Math.floor(x + w / 2);
        const cy = Math.floor(y + h / 2);
        const radius = 24;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const distSq = dx * dx + dy * dy;
            if (distSq <= radius * radius) {
              const px = cx + dx;
              const py = cy + dy;
              if (px >= 0 && px < hw && py >= 0 && py < hh) {
                const idx = py * hw + px;
                heat[idx] = Math.min(1.0, heat[idx] + (1 - Math.sqrt(distSq) / radius) * 0.15);
              }
            }
          }
        }
      }

      // Draw Heatmap overlay
      const heatImgData = ctx.getImageData(0, 0, hw, hh);
      const data = heatImgData.data;
      for (let i = 0; i < heat.length; i++) {
        const val = heat[i];
        if (val > 0.05) {
          const pixelIdx = i * 4;
          // Gradient: Cyan -> Yellow -> Red
          let r = 0, g = 0, b = 0;
          if (val < 0.3) {
            b = Math.floor((val / 0.3) * 255);
            g = Math.floor((val / 0.3) * 180);
          } else if (val < 0.7) {
            const t = (val - 0.3) / 0.4;
            g = 220;
            r = Math.floor(t * 240);
            b = Math.floor((1 - t) * 150);
          } else {
            const t = (val - 0.7) / 0.3;
            r = 255;
            g = Math.floor((1 - t) * 200);
          }
          data[pixelIdx] = Math.max(data[pixelIdx], r);
          data[pixelIdx + 1] = Math.max(data[pixelIdx + 1], g);
          data[pixelIdx + 2] = Math.max(data[pixelIdx + 2], b);
        }
      }
      ctx.putImageData(heatImgData, 0, 0);
    }

    // 3. Render Virtual Tripwire Line
    if (tripwireConfig.enabled) {
      const isHorizontal = tripwireConfig.orientation === 'horizontal';
      const pos = isHorizontal
        ? tripwireConfig.positionFraction * canvas.height
        : tripwireConfig.positionFraction * canvas.width;

      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);

      ctx.beginPath();
      if (isHorizontal) {
        ctx.moveTo(0, pos);
        ctx.lineTo(canvas.width, pos);
      } else {
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, canvas.height);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Tripwire label badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      const badgeW = 140;
      const badgeH = 24;
      const badgeX = isHorizontal ? 20 : Math.max(10, pos - badgeW / 2);
      const badgeY = isHorizontal ? Math.max(10, pos - 28) : 20;

      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = '600 11px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.fillText(
        `COUNT: IN ${tripwireConfig.inCount} / OUT ${tripwireConfig.outCount}`,
        badgeX + 8,
        badgeY + 16
      );
      ctx.restore();
    }

    // 4. Render Trajectory Trails
    if (showTrajectoryTrails) {
      for (const track of tracks) {
        if (track.trajectory.length < 2) continue;
        const isSpotlight = spotlightTrackId === track.id;
        if (spotlightTrackId !== null && !isSpotlight) continue;

        ctx.save();
        ctx.lineWidth = isSpotlight ? 3 : 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < track.trajectory.length; i++) {
          const p1 = track.trajectory[i - 1];
          const p2 = track.trajectory[i];
          const alpha = (i / track.trajectory.length) * (isSpotlight ? 0.95 : 0.65);

          ctx.strokeStyle = track.color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 5. Render Bounding Boxes, HUD Brackets & Badges
    for (const track of tracks) {
      const isSpotlight = spotlightTrackId === track.id;
      const [x, y, w, h] = track.bbox;
      const cx = x + w / 2;
      const cy = y + h / 2;

      // Dim non-spotlight tracks if a spotlight is active
      if (spotlightTrackId !== null && !isSpotlight) {
        ctx.save();
        ctx.globalAlpha = 0.2;
      }

      // Corner bracket HUD style bounding box
      if (showBoundingBoxes) {
        ctx.save();
        ctx.strokeStyle = track.color;
        ctx.lineWidth = isSpotlight ? 2.5 : 1.75;

        // Bounding box fill
        ctx.fillStyle = track.color;
        ctx.globalAlpha = isSpotlight ? 0.14 : 0.06;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1.0;

        // Draw corner brackets
        const bracketLen = Math.min(14, Math.min(w, h) * 0.3);
        ctx.beginPath();
        // Top-left
        ctx.moveTo(x, y + bracketLen);
        ctx.lineTo(x, y);
        ctx.lineTo(x + bracketLen, y);
        // Top-right
        ctx.moveTo(x + w - bracketLen, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + bracketLen);
        // Bottom-right
        ctx.moveTo(x + w, y + h - bracketLen);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w - bracketLen, y + h);
        // Bottom-left
        ctx.moveTo(x + bracketLen, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + h - bracketLen);
        ctx.stroke();

        // If coasting / lost (no detection this frame), draw dashed border
        if (track.status === 'lost') {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#ef4444';
          ctx.strokeRect(x, y, w, h);
          ctx.setLineDash([]);
        }
        ctx.restore();
      }

      // Velocity Vector Arrow
      if (showVelocityVectors && track.velocity.speed > 0.4) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = '#38bdf8';
        ctx.lineWidth = 2;
        const arrowScale = 10;
        const targetX = cx + track.velocity.vx * arrowScale;
        const targetY = cy + track.velocity.vy * arrowScale;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(track.velocity.vy, track.velocity.vx);
        ctx.beginPath();
        ctx.moveTo(targetX, targetY);
        ctx.lineTo(
          targetX - 7 * Math.cos(angle - Math.PI / 6),
          targetY - 7 * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          targetX - 7 * Math.cos(angle + Math.PI / 6),
          targetY - 7 * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Label & Tracking ID Badge
      if (showTrackingIds) {
        ctx.save();
        const confPercent = Math.round(track.score * 100);
        const speedKmh = Math.round(track.velocity.speed * 12);
        const labelText = `#${track.id} · ${track.class} · ${confPercent}%`;
        const speedText = speedKmh > 3 ? `${speedKmh} km/h · ${track.direction}` : `${track.direction}`;

        ctx.font = '600 11px JetBrains Mono';
        const labelWidth = Math.max(w, ctx.measureText(labelText).width + 14);
        const badgeHeight = 18;
        const badgeY = Math.max(4, y - badgeHeight - 4);

        // Header pill
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = track.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, badgeY, labelWidth, badgeHeight, 3);
        ctx.fill();
        ctx.stroke();

        // Status indicator dot
        ctx.fillStyle = track.status === 'confirmed' ? track.color : '#f59e0b';
        ctx.beginPath();
        ctx.arc(x + 8, badgeY + 9, 3, 0, Math.PI * 2);
        ctx.fill();

        // Text
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'left';
        ctx.fillText(labelText, x + 16, badgeY + 13);

        // Small speed subscript underneath box if large enough
        if (h > 40 && isSpotlight) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.roundRect(x, y + h + 2, ctx.measureText(speedText).width + 12, 16, 2);
          ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(speedText, x + 6, y + h + 14);
        }
        ctx.restore();
      }

      // Spotlight Reticle Rings
      if (isSpotlight) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(w, h) * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = '#38bdf8';
        // Crosshair ticks
        const r = Math.max(w, h) * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx - r - 8, cy);
        ctx.lineTo(cx - r + 4, cy);
        ctx.moveTo(cx + r - 4, cy);
        ctx.lineTo(cx + r + 8, cy);
        ctx.moveTo(cx, cy - r - 8);
        ctx.lineTo(cx, cy - r + 4);
        ctx.moveTo(cx, cy + r - 4);
        ctx.lineTo(cx, cy + r + 8);
        ctx.stroke();
        ctx.restore();
      }

      if (spotlightTrackId !== null && !isSpotlight) {
        ctx.restore();
      }
    }
  }, [
    sourceCanvas,
    videoElement,
    tracks,
    showBoundingBoxes,
    showTrackingIds,
    showTrajectoryTrails,
    showVelocityVectors,
    showHeatmap,
    tripwireConfig,
    spotlightTrackId,
  ]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col items-center justify-center group"
    >
      <canvas
        ref={displayCanvasRef}
        onClick={handleCanvasClick}
        className="w-full h-auto max-h-[580px] object-contain cursor-crosshair block"
      />

      {/* Interactive Controls Overlay Bar */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80 shadow-lg">
          {!isWebcam && (
            <>
              <button
                type="button"
                onClick={onTogglePlay}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title={isPlaying ? 'Pause Feed' : 'Resume Feed'}
              >
                {isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
              </button>
              <button
                type="button"
                onClick={onStepFrame}
                disabled={isPlaying}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors disabled:opacity-30"
                title="Single Frame Step Forward"
              >
                <StepForward className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-slate-800 mx-1" />
            </>
          )}

          <button
            type="button"
            onClick={onTakeSnapshot}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Export High-Resolution Annotated Frame"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Snapshot</span>
          </button>

          {spotlightTrackId !== null && (
            <button
              type="button"
              onClick={() => onSelectTrack(null)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded transition-colors"
              title="Clear Target Spotlight"
            >
              <Crosshair className="w-3 h-3" />
              <span>Target #{spotlightTrackId}</span>
              <span className="text-amber-400 ml-1">×</span>
            </button>
          )}
        </div>

        {/* Tip helper */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-800/80">
          <Target className="w-3 h-3 text-cyan-400" />
          <span>Click any target to lock telemetry</span>
        </div>
      </div>
    </div>
  );
};

import {
  Detection,
  TrackedObject,
  TrackerConfig,
  TripwireConfig,
  TrackingEvent,
  TrajectoryPoint,
} from '../types/vision';
import { KalmanBoxTracker } from './kalmanFilter';

export const CLASS_COLORS: Record<string, string> = {
  person: '#10b981', // Emerald
  car: '#06b6d4', // Cyan
  truck: '#3b82f6', // Blue
  bus: '#8b5cf6', // Violet
  motorcycle: '#f59e0b', // Amber
  bicycle: '#eab308', // Yellow
  dog: '#ec4899', // Pink
  cat: '#f43f5e', // Rose
  backpack: '#a855f7', // Purple
  handbag: '#d946ef', // Fuchsia
  suitcase: '#6366f1', // Indigo
  traffic_light: '#ef4444', // Red
  stop_sign: '#dc2626', // Dark Red
  bottle: '#14b8a6', // Teal
  chair: '#84cc16', // Lime
  tv: '#0284c7', // Sky
  cell_phone: '#f97316', // Orange
  default: '#06b6d4', // Cyan default
};

export function getClassColor(className: string): string {
  const normalized = className.toLowerCase().replace(/[\s-]/g, '_');
  return CLASS_COLORS[normalized] || CLASS_COLORS.default;
}

export function calculateIoU(
  boxA: [number, number, number, number],
  boxB: [number, number, number, number]
): number {
  const [xA, yA, wA, hA] = boxA;
  const [xB, yB, wB, hB] = boxB;

  const x1 = Math.max(xA, xB);
  const y1 = Math.max(yA, yB);
  const x2 = Math.min(xA + wA, xB + wB);
  const y2 = Math.min(yA + hA, yB + hB);

  const intersectionWidth = Math.max(0, x2 - x1);
  const intersectionHeight = Math.max(0, y2 - y1);
  const intersectionArea = intersectionWidth * intersectionHeight;

  if (intersectionArea <= 0) return 0;

  const areaA = wA * hA;
  const areaB = wB * hB;
  const unionArea = areaA + areaB - intersectionArea;

  return unionArea > 0 ? intersectionArea / unionArea : 0;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? Math.max(0, dot / denom) : 0;
}

class InternalTrack {
  public id: number;
  public kalman: KalmanBoxTracker;
  public class: string;
  public score: number;
  public color: string;
  public hits: number = 1;
  public age: number = 0;
  public timeSinceUpdate: number = 0;
  public trajectory: TrajectoryPoint[] = [];
  public firstSeenTimestamp: number;
  public featureVector?: number[];
  public hasCrossedTripwire: boolean = false;

  constructor(id: number, detection: Detection) {
    this.id = id;
    this.kalman = new KalmanBoxTracker(detection.bbox);
    this.class = detection.class;
    this.score = detection.score;
    this.color = getClassColor(detection.class);
    this.firstSeenTimestamp = Date.now();
    this.featureVector = detection.featureVector;

    const [x, y, w, h] = detection.bbox;
    this.trajectory.push({
      x: x + w / 2,
      y: y + h / 2,
      timestamp: this.firstSeenTimestamp,
    });
  }

  public predict(): [number, number, number, number] {
    const bbox = this.kalman.predict();
    this.age += 1;
    if (this.timeSinceUpdate > 0) {
      this.hits = Math.max(0, this.hits - 1);
    }
    this.timeSinceUpdate += 1;
    return bbox;
  }

  public update(detection: Detection): void {
    this.kalman.update(detection.bbox);
    this.score = detection.score;
    this.class = detection.class; // update class if confidence changes
    this.timeSinceUpdate = 0;
    this.hits += 1;

    if (detection.featureVector) {
      if (!this.featureVector) {
        this.featureVector = detection.featureVector;
      } else {
        // Exponential moving average for appearance features
        const alpha = 0.8;
        this.featureVector = this.featureVector.map(
          (val, idx) => alpha * val + (1 - alpha) * (detection.featureVector?.[idx] || 0)
        );
      }
    }

    const [x, y, w, h] = this.kalman.getStateBbox();
    const cx = x + w / 2;
    const cy = y + h / 2;

    this.trajectory.push({
      x: cx,
      y: cy,
      timestamp: Date.now(),
    });

    // Retain up to 45 recent trajectory points for motion trail
    if (this.trajectory.length > 45) {
      this.trajectory.shift();
    }
  }

  public getDirection(): string {
    const { vx, vy, speed } = this.kalman.getVelocity();
    if (speed < 0.6) return 'Static';
    const angleDeg = (Math.atan2(vy, vx) * 180) / Math.PI; // -180 to 180
    if (angleDeg >= -22.5 && angleDeg < 22.5) return 'E';
    if (angleDeg >= 22.5 && angleDeg < 67.5) return 'SE';
    if (angleDeg >= 67.5 && angleDeg < 112.5) return 'S';
    if (angleDeg >= 112.5 && angleDeg < 157.5) return 'SW';
    if (angleDeg >= 157.5 || angleDeg < -157.5) return 'W';
    if (angleDeg >= -157.5 && angleDeg < -112.5) return 'NW';
    if (angleDeg >= -112.5 && angleDeg < -67.5) return 'N';
    return 'NE';
  }
}

export class SortTrackerEngine {
  private tracks: InternalTrack[] = [];
  private nextTrackId: number = 1;
  private totalCumulativeTracked: number = 0;

  constructor() {}

  public reset(): void {
    this.tracks = [];
    this.nextTrackId = 1;
    this.totalCumulativeTracked = 0;
  }

  public getTotalTrackedCount(): number {
    return this.totalCumulativeTracked;
  }

  /**
   * Main tracking step called for each video frame.
   */
  public update(
    detections: Detection[],
    trackerConfig: TrackerConfig,
    tripwireConfig?: TripwireConfig,
    frameDimensions?: { width: number; height: number }
  ): {
    tracks: TrackedObject[];
    events: TrackingEvent[];
    tripwireUpdated?: { inCount: number; outCount: number };
  } {
    const events: TrackingEvent[] = [];
    const now = Date.now();

    // 1. Predict state of all existing tracks
    const predictedBoxes: [number, number, number, number][] = [];
    for (const track of this.tracks) {
      predictedBoxes.push(track.predict());
    }

    // 2. Associate detections to existing tracks
    const matchedIndices: { trackIdx: number; detIdx: number }[] = [];
    const unmatchedDetections = new Set<number>(detections.map((_, i) => i));
    const unmatchedTracks = new Set<number>(this.tracks.map((_, i) => i));

    if (this.tracks.length > 0 && detections.length > 0) {
      // Build Cost / Affinity Matrix
      const costMatrix: number[][] = [];

      for (let t = 0; t < this.tracks.length; t++) {
        const row: number[] = [];
        const track = this.tracks[t];
        const predBox = predictedBoxes[t];

        for (let d = 0; d < detections.length; d++) {
          const det = detections[d];
          let score = calculateIoU(predBox, det.bbox);

          // Deep SORT appearance feature bonus
          if (trackerConfig.algorithm === 'deep_sort' && track.featureVector && det.featureVector) {
            const sim = cosineSimilarity(track.featureVector, det.featureVector);
            const w = trackerConfig.featureSimilarityWeight;
            score = (1 - w) * score + w * sim;
          }

          // Same-class preference bonus (reduces identity swaps between different classes)
          if (track.class === det.class) {
            score *= 1.15;
          }

          row.push(score);
        }
        costMatrix.push(row);
      }

      // Greedy Assignment with IoU Threshold
      // Find maximum scores iteratively
      const usedTracks = new Set<number>();
      const usedDets = new Set<number>();

      while (true) {
        let bestScore = -1;
        let bestT = -1;
        let bestD = -1;

        for (let t = 0; t < this.tracks.length; t++) {
          if (usedTracks.has(t)) continue;
          for (let d = 0; d < detections.length; d++) {
            if (usedDets.has(d)) continue;
            if (costMatrix[t][d] > bestScore) {
              bestScore = costMatrix[t][d];
              bestT = t;
              bestD = d;
            }
          }
        }

        if (bestScore < trackerConfig.iouThreshold || bestT === -1) {
          break; // No more pairs satisfy threshold
        }

        matchedIndices.push({ trackIdx: bestT, detIdx: bestD });
        usedTracks.add(bestT);
        usedDets.add(bestD);
        unmatchedTracks.delete(bestT);
        unmatchedDetections.delete(bestD);
      }
    }

    // 3. Update matched tracks
    for (const match of matchedIndices) {
      const track = this.tracks[match.trackIdx];
      const detection = detections[match.detIdx];
      const previousHits = track.hits;

      track.update(detection);

      // Check if newly confirmed
      if (previousHits < trackerConfig.minHits && track.hits >= trackerConfig.minHits) {
        events.push({
          id: `evt-${now}-${track.id}`,
          timestamp: now,
          type: 'track_confirmed',
          trackId: track.id,
          className: track.class,
          message: `Track #${track.id} (${track.class}) established trajectory`,
        });
      }
    }

    // 4. Create new tracks for unmatched detections
    for (const detIdx of unmatchedDetections) {
      const detection = detections[detIdx];
      const newId = this.nextTrackId++;
      this.totalCumulativeTracked += 1;
      const newTrack = new InternalTrack(newId, detection);
      this.tracks.push(newTrack);

      events.push({
        id: `evt-init-${now}-${newId}`,
        timestamp: now,
        type: 'track_created',
        trackId: newId,
        className: detection.class,
        message: `Detected new ${detection.class} (ID #${newId})`,
      });
    }

    // 5. Tripwire Crossing Evaluation
    let inCount = tripwireConfig?.inCount || 0;
    let outCount = tripwireConfig?.outCount || 0;

    if (tripwireConfig?.enabled && frameDimensions) {
      const { width, height } = frameDimensions;
      const isHorizontal = tripwireConfig.orientation === 'horizontal';
      const tripwirePos = isHorizontal
        ? tripwireConfig.positionFraction * height
        : tripwireConfig.positionFraction * width;

      for (const track of this.tracks) {
        if (track.trajectory.length >= 2 && !track.hasCrossedTripwire) {
          const ptCurrent = track.trajectory[track.trajectory.length - 1];
          const ptPrev = track.trajectory[track.trajectory.length - 2];

          if (isHorizontal) {
            // Crossing horizontal line
            if (ptPrev.y < tripwirePos && ptCurrent.y >= tripwirePos) {
              // Crossed downwards / Inbound
              inCount += 1;
              track.hasCrossedTripwire = true;
              events.push({
                id: `evt-trip-in-${now}-${track.id}`,
                timestamp: now,
                type: 'tripwire_in',
                trackId: track.id,
                className: track.class,
                message: `Track #${track.id} (${track.class}) crossed tripwire [IN]`,
              });
            } else if (ptPrev.y > tripwirePos && ptCurrent.y <= tripwirePos) {
              // Crossed upwards / Outbound
              outCount += 1;
              track.hasCrossedTripwire = true;
              events.push({
                id: `evt-trip-out-${now}-${track.id}`,
                timestamp: now,
                type: 'tripwire_out',
                trackId: track.id,
                className: track.class,
                message: `Track #${track.id} (${track.class}) crossed tripwire [OUT]`,
              });
            }
          } else {
            // Crossing vertical line
            if (ptPrev.x < tripwirePos && ptCurrent.x >= tripwirePos) {
              inCount += 1;
              track.hasCrossedTripwire = true;
              events.push({
                id: `evt-trip-in-${now}-${track.id}`,
                timestamp: now,
                type: 'tripwire_in',
                trackId: track.id,
                className: track.class,
                message: `Track #${track.id} (${track.class}) crossed line [EAST]`,
              });
            } else if (ptPrev.x > tripwirePos && ptCurrent.x <= tripwirePos) {
              outCount += 1;
              track.hasCrossedTripwire = true;
              events.push({
                id: `evt-trip-out-${now}-${track.id}`,
                timestamp: now,
                type: 'tripwire_out',
                trackId: track.id,
                className: track.class,
                message: `Track #${track.id} (${track.class}) crossed line [WEST]`,
              });
            }
          }
        }
      }
    }

    // 6. Prune lost tracks
    const survivingTracks: InternalTrack[] = [];
    for (const track of this.tracks) {
      if (track.timeSinceUpdate <= trackerConfig.maxAge) {
        survivingTracks.push(track);
      } else {
        events.push({
          id: `evt-lost-${now}-${track.id}`,
          timestamp: now,
          type: 'track_lost',
          trackId: track.id,
          className: track.class,
          message: `Track #${track.id} (${track.class}) exited tracking perimeter`,
        });
      }
    }
    this.tracks = survivingTracks;

    // 7. Format output tracks
    const outputTracks: TrackedObject[] = this.tracks.map((track) => {
      const bbox = track.kalman.getStateBbox();
      const velocity = track.kalman.getVelocity();
      const dwellTimeSeconds = (now - track.firstSeenTimestamp) / 1000;

      let status: TrackedObject['status'] = 'confirmed';
      if (track.hits < trackerConfig.minHits) {
        status = 'tentative';
      } else if (track.timeSinceUpdate > 0) {
        status = 'lost';
      }

      return {
        id: track.id,
        class: track.class,
        bbox,
        score: track.score,
        color: track.color,
        status,
        hits: track.hits,
        age: track.age,
        timeSinceUpdate: track.timeSinceUpdate,
        trajectory: [...track.trajectory],
        velocity,
        direction: track.getDirection(),
        dwellTimeSeconds,
        firstSeenTimestamp: track.firstSeenTimestamp,
        featureVector: track.featureVector,
      };
    });

    return {
      tracks: outputTracks,
      events,
      tripwireUpdated: { inCount, outCount },
    };
  }
}

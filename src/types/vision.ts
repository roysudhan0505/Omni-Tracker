export interface BoundingBox {
  x: number; // top-left x in pixels
  y: number; // top-left y in pixels
  width: number;
  height: number;
}

export interface Detection {
  id?: string;
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  score: number; // 0 to 1
  color?: string;
  featureVector?: number[]; // simulated or extracted appearance embedding for Deep SORT
}

export type TrackStatus = 'tentative' | 'confirmed' | 'lost' | 'deleted';

export interface TrajectoryPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface TrackedObject {
  id: number;
  class: string;
  bbox: [number, number, number, number]; // [x, y, width, height]
  score: number;
  color: string;
  status: TrackStatus;
  hits: number; // number of total detections matched
  age: number; // frames since first detected
  timeSinceUpdate: number; // frames since last detection match
  trajectory: TrajectoryPoint[];
  velocity: { vx: number; vy: number; speed: number }; // px/frame or px/s
  direction: string; // 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'Static'
  dwellTimeSeconds: number;
  firstSeenTimestamp: number;
  featureVector?: number[];
}

export interface TrackerConfig {
  algorithm: 'sort' | 'deep_sort';
  maxAge: number; // frames to keep dead tracks alive (coasting)
  minHits: number; // frames required before track is confirmed
  iouThreshold: number; // IoU threshold for matching
  featureSimilarityWeight: number; // for deep_sort (0 to 1)
}

export interface ModelConfig {
  modelType: 'coco_ssd' | 'yolov8' | 'faster_rcnn';
  confidenceThreshold: number;
  nmsIouThreshold: number;
  targetClasses: string[]; // empty for all
}

export interface TripwireConfig {
  enabled: boolean;
  orientation: 'horizontal' | 'vertical';
  positionFraction: number; // 0 to 1 across canvas
  direction: 'bidirectional' | 'down_only' | 'up_only' | 'left_only' | 'right_only';
  inCount: number;
  outCount: number;
}

export interface PipelineMetrics {
  fps: number;
  inferenceTimeMs: number;
  trackingTimeMs: number;
  activeTracksCount: number;
  totalUniqueTracked: number;
  totalDetectionsCurrentFrame: number;
}

export interface TrackingEvent {
  id: string;
  timestamp: number;
  type: 'track_created' | 'track_confirmed' | 'tripwire_in' | 'tripwire_out' | 'track_lost';
  trackId: number;
  className: string;
  message: string;
}

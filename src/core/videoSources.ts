import { Detection } from '../types/vision';

export type VideoSourceType = 'webcam' | 'file' | 'traffic' | 'pedestrians' | 'warehouse' | 'sports';

export interface VideoSourceOption {
  id: VideoSourceType;
  label: string;
  category: 'Live Stream' | 'Benchmark Feeds' | 'Custom Media';
  description: string;
}

export const VIDEO_SOURCES: VideoSourceOption[] = [
  {
    id: 'traffic',
    label: 'Highway Traffic (Multi-Lane)',
    category: 'Benchmark Feeds',
    description: 'Dense highway flow with cars, trucks, motorcycles and lane switching',
  },
  {
    id: 'pedestrians',
    label: 'Pedestrian Plaza & Crosswalk',
    category: 'Benchmark Feeds',
    description: 'Crowd dynamics with pedestrians, cyclists, backpacks, and occlusion',
  },
  {
    id: 'warehouse',
    label: 'Logistics Facility & AGV',
    category: 'Benchmark Feeds',
    description: 'Forklifts, automated transport carts, pallets, and safety workers',
  },
  {
    id: 'sports',
    label: 'Velodrome Cycling Circuit',
    category: 'Benchmark Feeds',
    description: 'High-speed bicycles, overtaking maneuvers, and rapid accelerations',
  },
  {
    id: 'webcam',
    label: 'Live Webcam Input',
    category: 'Live Stream',
    description: 'Real-time video feed directly from your connected camera',
  },
  {
    id: 'file',
    label: 'Upload Video File',
    category: 'Custom Media',
    description: 'Analyze your own MP4, WebM, or MOV surveillance/action footage',
  },
];

interface SimulationEntity {
  id: number;
  class: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  targetSpeed: number;
  color: string;
  detailColor: string;
  lane?: number;
  phase: number;
  hasBag?: boolean;
}

/**
 * Realistic synthetic video frame generator on an offscreen canvas
 */
export class BenchmarkFeedEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private entities: SimulationEntity[] = [];
  private frameCount = 0;
  private currentType: VideoSourceType = 'traffic';
  private entityIdCounter = 1;

  constructor(width = 854, height = 480) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.initEntities('traffic');
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public switchFeed(type: VideoSourceType) {
    this.currentType = type;
    this.entities = [];
    this.frameCount = 0;
    this.initEntities(type);
  }

  private initEntities(type: VideoSourceType) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (type === 'traffic') {
      const carColors = ['#e2e8f0', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#64748b', '#06b6d4'];
      // Lanes: 4 vertical lanes or 4 horizontal lanes
      // Let's create top-to-bottom and bottom-to-top traffic
      const lanes = [
        { x: w * 0.22, dir: 1, speed: 2.4 },
        { x: w * 0.38, dir: 1, speed: 3.2 },
        { x: w * 0.58, dir: -1, speed: 2.8 },
        { x: w * 0.74, dir: -1, speed: 2.0 },
      ];

      for (let i = 0; i < 9; i++) {
        const lane = lanes[i % lanes.length];
        const isTruck = i === 2 || i === 7;
        const isMoto = i === 4;
        const width = isTruck ? 54 : isMoto ? 22 : 46;
        const height = isTruck ? 110 : isMoto ? 42 : 78;
        const cls = isTruck ? 'truck' : isMoto ? 'motorcycle' : 'car';

        this.entities.push({
          id: this.entityIdCounter++,
          class: cls,
          x: lane.x - width / 2 + (Math.random() - 0.5) * 8,
          y: Math.random() * h,
          w: width,
          h: height,
          vx: 0,
          vy: lane.dir * (lane.speed + Math.random() * 0.8),
          targetSpeed: lane.speed,
          color: carColors[Math.floor(Math.random() * carColors.length)],
          detailColor: '#0f172a',
          lane: i % lanes.length,
          phase: Math.random() * Math.PI * 2,
        });
      }
    } else if (type === 'pedestrians') {
      // Crowd walking across a public plaza
      const clothes = ['#0284c7', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#475569', '#0d9488'];
      for (let i = 0; i < 14; i++) {
        const isBike = i === 3 || i === 10;
        const cls = isBike ? 'bicycle' : 'person';
        const angle = Math.random() * Math.PI * 2;
        const speed = isBike ? 2.5 + Math.random() : 0.8 + Math.random() * 0.7;

        this.entities.push({
          id: this.entityIdCounter++,
          class: cls,
          x: Math.random() * w,
          y: Math.random() * h,
          w: isBike ? 34 : 26,
          h: isBike ? 56 : 58,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          targetSpeed: speed,
          color: clothes[Math.floor(Math.random() * clothes.length)],
          detailColor: '#1e293b',
          phase: Math.random() * Math.PI * 2,
          hasBag: Math.random() > 0.4,
        });
      }
    } else if (type === 'warehouse') {
      // Forklifts, workers, pallets
      for (let i = 0; i < 8; i++) {
        const isForklift = i < 3;
        const cls = isForklift ? 'truck' : 'person';
        this.entities.push({
          id: this.entityIdCounter++,
          class: cls,
          x: w * 0.15 + (i * (w * 0.7)) / 8,
          y: h * 0.3 + (i % 3) * 60,
          w: isForklift ? 56 : 26,
          h: isForklift ? 70 : 54,
          vx: (Math.random() - 0.5) * 1.8,
          vy: (Math.random() - 0.5) * 1.2,
          targetSpeed: 1.4,
          color: isForklift ? '#f59e0b' : '#10b981',
          detailColor: '#0f172a',
          phase: Math.random() * Math.PI * 2,
        });
      }
    } else if (type === 'sports') {
      // Velodrome / cycling track
      for (let i = 0; i < 7; i++) {
        this.entities.push({
          id: this.entityIdCounter++,
          class: 'bicycle',
          x: w * 0.2 + i * 50,
          y: h * 0.2 + ((i * 40) % (h * 0.6)),
          w: 30,
          h: 52,
          vx: 2.2 + Math.random() * 1.4,
          vy: (Math.random() - 0.5) * 0.4,
          targetSpeed: 3.0,
          color: ['#06b6d4', '#ec4899', '#eab308', '#8b5cf6', '#10b981'][i % 5],
          detailColor: '#0f172a',
          phase: i * 0.8,
        });
      }
    }
  }

  /**
   * Advances simulation physics, renders visually appealing scene,
   * and attaches ground-truth objects for the detector to evaluate.
   */
  public renderFrame(): Detection[] {
    this.frameCount++;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Draw Environmental Background
    if (this.currentType === 'traffic') {
      this.drawTrafficEnvironment(ctx, w, h);
    } else if (this.currentType === 'pedestrians') {
      this.drawPlazaEnvironment(ctx, w, h);
    } else if (this.currentType === 'warehouse') {
      this.drawWarehouseEnvironment(ctx, w, h);
    } else {
      this.drawVelodromeEnvironment(ctx, w, h);
    }

    // 2. Update and Render Entities
    const groundTruthDetections: Detection[] = [];

    for (const ent of this.entities) {
      ent.x += ent.vx;
      ent.y += ent.vy;
      ent.phase += 0.15;

      // Screen wrapping & bounds
      if (this.currentType === 'traffic') {
        // Continuous traffic flow
        if (ent.vy > 0 && ent.y > h + 40) {
          ent.y = -ent.h - 20;
          ent.x = (ent.lane === 0 ? w * 0.22 : w * 0.38) - ent.w / 2 + (Math.random() - 0.5) * 10;
        } else if (ent.vy < 0 && ent.y < -ent.h - 40) {
          ent.y = h + 20;
          ent.x = (ent.lane === 2 ? w * 0.58 : w * 0.74) - ent.w / 2 + (Math.random() - 0.5) * 10;
        }
      } else if (this.currentType === 'sports') {
        if (ent.x > w + 40) ent.x = -ent.w - 20;
        if (ent.y < 40 || ent.y > h - 80) ent.vy = -ent.vy;
      } else {
        // Plaza & Warehouse: smooth bounce or wrap
        if (ent.x < 30) {
          ent.x = 30;
          ent.vx = Math.abs(ent.vx);
        } else if (ent.x > w - ent.w - 30) {
          ent.x = w - ent.w - 30;
          ent.vx = -Math.abs(ent.vx);
        }
        if (ent.y < 30) {
          ent.y = 30;
          ent.vy = Math.abs(ent.vy);
        } else if (ent.y > h - ent.h - 30) {
          ent.y = h - ent.h - 30;
          ent.vy = -Math.abs(ent.vy);
        }

        // Slight natural wandering
        if (Math.random() < 0.03) {
          const deltaAngle = (Math.random() - 0.5) * 0.8;
          const currentSpeed = Math.sqrt(ent.vx * ent.vx + ent.vy * ent.vy);
          const currentAngle = Math.atan2(ent.vy, ent.vx) + deltaAngle;
          ent.vx = Math.cos(currentAngle) * currentSpeed;
          ent.vy = Math.sin(currentAngle) * currentSpeed;
        }
      }

      // Draw Entity Visual Representation
      this.drawEntityGraphic(ctx, ent);

      // Register Ground Truth Detection for inference engine
      groundTruthDetections.push({
        bbox: [ent.x, ent.y, ent.w, ent.h],
        class: ent.class,
        score: 0.88 + Math.sin(ent.phase * 0.5) * 0.08,
      });
    }

    // Attach current ground truth objects to canvas instance
    (this.canvas as unknown as { __currentGroundTruthObjects?: Detection[] })
      .__currentGroundTruthObjects = groundTruthDetections;

    return groundTruthDetections;
  }

  private drawTrafficEnvironment(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Road asphalt
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Sidewalks / verges
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w * 0.12, h);
    ctx.fillRect(w * 0.88, 0, w * 0.12, h);

    // Grass edge
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 0, w * 0.04, h);
    ctx.fillRect(w * 0.96, 0, w * 0.04, h);

    // Median barrier
    ctx.fillStyle = '#334155';
    ctx.fillRect(w * 0.48, 0, w * 0.04, h);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.48, 0);
    ctx.lineTo(w * 0.48, h);
    ctx.moveTo(w * 0.52, 0);
    ctx.lineTo(w * 0.52, h);
    ctx.stroke();

    // Road lane markings (dashed white)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 24]);
    ctx.beginPath();
    ctx.moveTo(w * 0.30, 0);
    ctx.lineTo(w * 0.30, h);
    ctx.moveTo(w * 0.66, 0);
    ctx.lineTo(w * 0.66, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Solid shoulder lines
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.12, 0);
    ctx.lineTo(w * 0.12, h);
    ctx.moveTo(w * 0.88, 0);
    ctx.lineTo(w * 0.88, h);
    ctx.stroke();
  }

  private drawPlazaEnvironment(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Paved stone tiles
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);

    // Tile grid lines
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    const tileSize = 60;
    for (let x = 0; x < w; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Planters / architectural circular seating
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(w * 0.25, h * 0.35, 36, 0, Math.PI * 2);
    ctx.arc(w * 0.75, h * 0.65, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.arc(w * 0.25, h * 0.35, 24, 0, Math.PI * 2);
    ctx.arc(w * 0.75, h * 0.65, 24, 0, Math.PI * 2);
    ctx.fill();

    // Crosswalk zebra stripes across center
    ctx.fillStyle = '#374151';
    for (let x = w * 0.15; x < w * 0.85; x += 32) {
      ctx.fillRect(x, h * 0.47, 16, 28);
    }
  }

  private drawWarehouseEnvironment(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Concrete polished floor texture lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < w; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Safety yellow walkways
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);

    // Pallet storage racks on top and bottom
    ctx.fillStyle = '#334155';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(w * 0.15 + i * (w * 0.12), 15, w * 0.08, 35);
      ctx.fillRect(w * 0.15 + i * (w * 0.12), h - 50, w * 0.08, 35);
    }
  }

  private drawVelodromeEnvironment(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, w, h);

    // Oval track curves
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.42, h * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#f43f5e';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.35, h * 0.30, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#10b981';
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.28, h * 0.22, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawEntityGraphic(ctx: CanvasRenderingContext2D, ent: SimulationEntity) {
    const { x, y, w, h, class: cls, color, phase } = ent;

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);

    // Orient heading based on velocity
    const angle = Math.atan2(ent.vy, ent.vx);
    // For vertical road cars, heading is aligned with vy
    if (this.currentType === 'traffic') {
      ctx.rotate(ent.vy > 0 ? Math.PI / 2 : -Math.PI / 2);
    } else {
      ctx.rotate(angle);
    }

    // Entity shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(2, 3, w * 0.48, h * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    if (cls === 'car') {
      // Car chassis (rendered top-down)
      const l = h * 0.9;
      const b = w * 0.85;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-l / 2, -b / 2, l, b, 8);
      ctx.fill();

      // Windshield & rear glass
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-l * 0.15, -b * 0.4, l * 0.4, b * 0.8);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-l * 0.35, -b * 0.35, l * 0.15, b * 0.7);

      // Headlights
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(l / 2 - 3, -b * 0.4, 3, 6);
      ctx.fillRect(l / 2 - 3, b * 0.4 - 6, 3, 6);

      // Taillights
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-l / 2, -b * 0.4, 3, 6);
      ctx.fillRect(-l / 2, b * 0.4 - 6, 3, 6);
    } else if (cls === 'truck') {
      // Long cab + cargo container
      const l = h * 0.95;
      const b = w * 0.85;
      // Cab
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(l * 0.1, -b / 2, l * 0.4, b, 5);
      ctx.fill();

      // Trailer
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-l / 2, -b / 2, l * 0.55, b, 3);
      ctx.fill();

      // Windshield
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(l * 0.28, -b * 0.38, 5, b * 0.76);
    } else if (cls === 'motorcycle' || cls === 'bicycle') {
      // Bike frame & rider
      const l = h * 0.8;
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-l / 2, 0);
      ctx.lineTo(l / 2, 0);
      ctx.stroke();

      // Wheels
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-l / 2 - 4, -3, 8, 6);
      ctx.fillRect(l / 2 - 4, -3, 8, 6);

      // Rider helmet
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      // Handlebars
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(l * 0.25, -9);
      ctx.lineTo(l * 0.25, 9);
      ctx.stroke();
    } else {
      // Pedestrian (Top-down walking view with swinging arms/head)
      const r = Math.min(w, h) * 0.28;
      const swing = Math.sin(phase) * 6;

      // Shoulders
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.5, r * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hands swinging
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.arc(r * 1.2, swing, 3.5, 0, Math.PI * 2);
      ctx.arc(-r * 1.2, -swing, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Hair / Hat
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-1, 0, r * 0.6, 0, Math.PI * 2);
      ctx.fill();

      if (ent.hasBag) {
        ctx.fillStyle = '#9333ea';
        ctx.fillRect(-r * 0.8, -r * 0.6, 5, 8);
      }
    }

    ctx.restore();
  }
}

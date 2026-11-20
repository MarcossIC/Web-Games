import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  untracked,
  viewChild,
} from '@angular/core';
import { buildGalaxyPoints, buildStarfieldPositions } from './galaxy-points';
import { GalaxyView } from './galaxy-travel.service';

type Vec3 = readonly [number, number, number];

interface CameraPose {
  position: Vec3;
  lookAt: Vec3;
  fov: number;
}

const POSES: Record<GalaxyView, CameraPose> = {
  orbit: { position: [0, 3, 7.5], lookAt: [0, 3.1, 0], fov: 60 },
  core: { position: [0, 1.1, 2.6], lookAt: [0, 0.75, 0], fov: 68 },
  launch: { position: [0, 0.5, 0.6], lookAt: [0, 0.4, -1], fov: 84 },
};

/** Above this the extra pixels cost a lot and are barely visible. */
const MAX_PIXEL_RATIO = 1.5;
/** The resolution never drops below this, however slow the device. */
const MIN_PIXEL_RATIO = 0.5;
/** Starting resolution when WebGL runs on the CPU instead of a GPU. */
const SOFTWARE_PIXEL_RATIO = 0.75;
/** Renderer names of WebGL implementations that draw on the CPU. */
const SOFTWARE_RENDERER = /basic render|swiftshader|llvmpipe|software/i;
const PIXEL_RATIO_STEP = 0.25;
/** A frame longer than this missed 60 fps. */
const SLOW_FRAME_MS = 19;
/** Frames measured before deciding whether to lower the resolution. */
const FRAME_SAMPLES = 40;
const SMALL_SCREEN_PX = 700;
const ROTATION_PER_SECOND = 0.03;
const TRAVEL_MS = 1600;
/** Extra field of view at the middle of a trip: it reads as speed. */
const TRAVEL_FOV_PUNCH = 18;
/** How much faster the galaxy spins at the middle of a trip. */
const TRAVEL_SPIN_BOOST = 5;
/** How far the pointer can shift the camera, in scene units. */
const PARALLAX = { x: 0.3, y: 0.18 };
/** Fraction of the remaining distance the parallax covers per second. */
const PARALLAX_EASE = 3;

/** Smooth start and stop with no sudden change of speed in between. */
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/**
 * The WebGL spiral galaxy behind the site pages. It is a place more than
 * a backdrop: changing `view` flies the camera between poses, so page
 * navigation reads as travelling through the galaxy.
 *
 * three.js is imported lazily in the browser only, so SSR renders just the
 * CSS glow of the host, which also stays as the fallback without WebGL.
 */
@Component({
  selector: 'app-galaxy-background',
  standalone: true,
  template: `<canvas #canvas aria-hidden="true"></canvas>`,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background: radial-gradient(
          ellipse at 50% 100%,
          rgba(255, 46, 136, 0.28),
          transparent 60%
        ),
        var(--gg-ink);
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 1.2s ease-out;
    }
    canvas.is-ready {
      opacity: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalaxyBackgroundComponent {
  readonly view = input<GalaxyView>('orbit');

  private readonly canvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private destroyed = false;
  /** Set once the scene exists; starts a camera trip to a view. */
  private travelTo?: (view: GalaxyView) => void;

  constructor() {
    this.destroyRef.onDestroy(() => (this.destroyed = true));
    effect(() => {
      const view = this.view();
      untracked(() => this.travelTo?.(view));
    });
    // Runs in the browser only, and outside Angular so the loop
    // does not trigger change detection on every frame.
    afterNextRender(() => {
      this.zone.runOutsideAngular(() => void this.start());
    });
  }

  private async start(): Promise<void> {
    const THREE = await import('three');
    if (this.destroyed) return;

    const hostElement = this.host.nativeElement;
    let renderer: import('three').WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: this.canvas().nativeElement,
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      });
    } catch {
      // No WebGL: the CSS glow of the host stays as the background.
      return;
    }
    // Without hardware acceleration every pixel is drawn by the CPU, so
    // start small: fewer pixels and fewer stars, upscaled by the browser.
    const gl = renderer.getContext();
    const rendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const software = SOFTWARE_RENDERER.test(
      rendererInfo
        ? String(gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL))
        : ''
    );
    let pixelRatio = software
      ? SOFTWARE_PIXEL_RATIO
      : Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    renderer.setPixelRatio(pixelRatio);

    const scene = new THREE.Scene();
    // The near plane hides stars right against the lens, which would
    // otherwise cover the screen as huge squares during a trip.
    const camera = new THREE.PerspectiveCamera(60, 1, 1.2, 120);
    const small = software || hostElement.clientWidth < SMALL_SCREEN_PX;

    const data = buildGalaxyPoints({
      count: small ? 7000 : 16000,
      arms: 3,
      radius: 6,
      spin: 0.75,
      randomness: 0.6,
      seed: 1986,
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(data.positions, 3)
    );
    geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.028,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const galaxy = new THREE.Points(geometry, material);
    scene.add(galaxy);

    const skyGeometry = new THREE.BufferGeometry();
    skyGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        buildStarfieldPositions(small ? 700 : 1600, 60, 7),
        3
      )
    );
    const skyMaterial = new THREE.PointsMaterial({
      size: 1.6,
      sizeAttenuation: false,
      color: 0xcfc8ff,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    scene.add(new THREE.Points(skyGeometry, skyMaterial));

    // --- Camera: a pose we travel between, plus a small pointer parallax.
    let from = POSES[this.view()];
    let to = from;
    let tripStart = -Infinity;
    const pointer = { x: 0, y: 0 };
    const parallax = { x: 0, y: 0 };

    const tripProgress = (now: number) =>
      Math.min(Math.max((now - tripStart) / TRAVEL_MS, 0), 1);

    const currentPose = (now: number): CameraPose => {
      const t = easeInOutSine(tripProgress(now));
      const mix = (a: Vec3, b: Vec3): Vec3 => [
        lerp(a[0], b[0], t),
        lerp(a[1], b[1], t),
        lerp(a[2], b[2], t),
      ];
      return {
        position: mix(from.position, to.position),
        lookAt: mix(from.lookAt, to.lookAt),
        fov: lerp(from.fov, to.fov, t),
      };
    };

    this.travelTo = (view) => {
      if (POSES[view] === to) return;
      // Starting from wherever the camera is now lets a trip be
      // reversed halfway without a jump.
      const now = performance.now();
      from = currentPose(now);
      to = POSES[view];
      tripStart = now;
    };

    /** Moves the camera for this instant; returns 0..1, peaking mid-trip. */
    const placeCamera = (now: number): number => {
      const pose = currentPose(now);
      const rush = Math.sin(Math.PI * tripProgress(now));
      camera.position.set(
        pose.position[0] + parallax.x,
        pose.position[1] + parallax.y,
        pose.position[2]
      );
      camera.lookAt(pose.lookAt[0], pose.lookAt[1], pose.lookAt[2]);
      camera.fov = pose.fov + rush * TRAVEL_FOV_PUNCH;
      camera.updateProjectionMatrix();
      return rush;
    };

    const resize = () => {
      const width = hostElement.clientWidth || 1;
      const height = hostElement.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      placeCamera(performance.now());
      renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(hostElement);
    resize();
    // The stars fade in over the CSS glow instead of popping in when
    // three.js finishes loading.
    this.canvas().nativeElement.classList.add('is-ready');

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // Holding the frame rate matters more than sharpness: when too many
    // frames miss 60 fps, render fewer pixels and let the browser upscale.
    let samples = 0;
    let slowFrames = 0;
    const keepFrameRate = (frameMs: number) => {
      samples++;
      if (frameMs > SLOW_FRAME_MS) slowFrames++;
      if (samples < FRAME_SAMPLES) return;
      if (slowFrames > samples / 2 && pixelRatio > MIN_PIXEL_RATIO) {
        pixelRatio = Math.max(MIN_PIXEL_RATIO, pixelRatio - PIXEL_RATIO_STEP);
        renderer.setPixelRatio(pixelRatio);
        resize();
      }
      samples = 0;
      slowFrames = 0;
    };

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      keepFrameRate(now - last);
      // Clamped so a long pause (hidden tab) does not make things jump.
      const seconds = Math.min((now - last) / 1000, 0.1);
      last = now;

      const ease = Math.min(seconds * PARALLAX_EASE, 1);
      parallax.x += (pointer.x * PARALLAX.x - parallax.x) * ease;
      parallax.y += (-pointer.y * PARALLAX.y - parallax.y) * ease;

      const rush = placeCamera(now);
      galaxy.rotation.y +=
        seconds * ROTATION_PER_SECOND * (1 + rush * TRAVEL_SPIN_BOOST);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    const play = () => {
      if (frame !== 0 || document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const pause = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    // A hidden tab should not keep the GPU busy.
    const onVisibility = () => (document.hidden ? pause() : play());
    document.addEventListener('visibilitychange', onVisibility);
    play();

    this.destroyRef.onDestroy(() => {
      pause();
      this.travelTo = undefined;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      skyGeometry.dispose();
      skyMaterial.dispose();
      renderer.dispose();
      // Frees the WebGL context now instead of waiting for garbage collection.
      renderer.forceContextLoss();
    });
  }
}

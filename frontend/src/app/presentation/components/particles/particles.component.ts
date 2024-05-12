import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  CollisionMode,
  Container,
  Engine,
  IColorAnimation,
  IOptions,
} from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';
import { NgParticlesService, NgxParticlesModule } from '@tsparticles/angular';
import { loadFull } from 'tsparticles';

@Component({
  standalone: true,
  imports: [CommonModule, NgxParticlesModule],
  selector: 'app-particles',
  templateUrl: './particles.component.html',
  styleUrls: ['./particles.component.css'],
})
export class ParticlesComponent implements OnInit {
  private currenteColor: string = '#fff';
  protected id: string = 'tsparticles';
  protected particlesOptions: IOptions;

  constructor(private readonly ngParticlesService: NgParticlesService) {
    this.particlesOptions = {
      autoPlay: true,
      backgroundMask: { enable: false, composite: 'color', cover: '' },
      clear: true,
      delay: { min: 0, max: 0 },
      duration: { max: 1000000, min: 1 },
      fullScreen: { enable: true, zIndex: 0 },
      manualParticles: [],
      pauseOnBlur: false,
      pauseOnOutsideViewport: false,
      responsive: [],
      smooth: true,
      style: {},
      themes: [],
      zLayers: -1,
      background: {
        color: {
          value: 'none',
        },
        image: '',
        opacity: 1,
        position: '',
        repeat: '',
        size: '',
      },
      fpsLimit: 120,
      interactivity: {
        events: {
          onDiv: [],
          onClick: {
            enable: false,
            mode: '',
          },
          onHover: {
            enable: false,
            mode: 'bubble',
            parallax: { enable: false, force: 0, smooth: 1 },
          },
          resize: { delay: 0, enable: false },
        },
        detectsOn: 'canvas',
        modes: {
          push: {
            quantity: 4,
          },
          repulse: {
            distance: 400,
            duration: 0.4,
          },
          buble: {
            distance: 200,
            size: 0,
            duration: 4,
            opacity: 0,
            speed: 3,
          },
        },
      },
      particles: {
        color: {
          value: this.currenteColor,
          animation: { offset: 0 } as IColorAnimation,
        },
        links: {
          color: this.currenteColor,
          distance: 250,
          enable: false,
          opacity: 0.4,
          width: 1,
        },
        collisions: {
          enable: false,
          absorb: { speed: 0 },
          bounce: { horizontal: { value: 0 }, vertical: { value: 0 } },
          maxSpeed: 0,
          mode: CollisionMode.bounce,
          overlap: {
            enable: false,
            retries: 0,
          },
        },
        bounce: { horizontal: { value: 0 }, vertical: { value: 0 } },
        effect: { type: '', close: false, fill: false, options: {} },
        groups: {},
        reduceDuplicates: true,
        shadow: { enable: false, blur: 0, color: '', offset: { x: 0, y: 0 } },
        stroke: { width: 0 },
        zIndex: { value: 0, opacityRate: 0, sizeRate: 0, velocityRate: 0 },
        move: {
          enable: true,
          speed: 0.9,
          direction: 'bottom-left',
          random: false,
          straight: false,
          outModes: {
            default: 'out',
          },
          angle: 0,
          attract: {
            enable: false,
            distance: 0,
            rotate: { x: 0, y: 0 },
          },
          decay: { max: 0, min: 0 },
          center: { mode: 'percent', radius: 0, x: 0, y: 0 },
          distance: 0,
          drift: { max: 0, min: 0 },
          gravity: {
            enable: false,
            acceleration: 0,
            inverse: false,
            maxSpeed: 0,
          },
          path: {
            enable: false,
            clamp: false,
            delay: { value: 0 },
            options: {},
          },
          size: false,
          spin: { enable: false, acceleration: 0 },
          trail: { enable: false, fill: {}, length: 0 },
          vibrate: false,
          warp: false,
        },
        number: {
          density: {
            enable: true,
            width: 800,
            height: 800,
          },
          value: 50,
          limit: { value: 50, mode: 'wait' },
        },
        opacity: {
          value: 0.9,
          animation: {
            enable: true,
            speed: 1,
            destroy: 'min',
            sync: false,
            startValue: 'random',
            count: 0,
            decay: { max: 1, min: 0 },
            delay: { max: 100, min: 0 },
            mode: 'random',
          },
        },
        shape: {
          type: 'circle',
          fill: true,
          close: true,
          options: {},
        },
        size: {
          value: { min: 2, max: 2 },
          animation: {
            enable: true,
            speed: 4,
            sync: true,
            startValue: 'random',
            count: 0,
            decay: { max: 1, min: 0 },
            delay: { max: 100, min: 0 },
            mode: 'random',
            destroy: 'none',
          },
        },
      },
      detectRetina: false,
    };
  }

  ngOnInit(): void {
    this.ngParticlesService.init(this.particlesInit);
  }

  particlesLoaded(container: Container): void {}

  async particlesInit(engine?: Engine): Promise<void> {
    await loadFull(engine!);
    //await loadSlim(engine!);
  }
}

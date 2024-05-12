import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Container, Engine } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim'; // if you are going to use `loadSlim`, install the "@tsparticles/slim" package too.
import { NgParticlesService, NgxParticlesModule } from '@tsparticles/angular';

@Component({
  standalone: true,
  imports: [CommonModule, NgxParticlesModule],
  selector: 'app-particles',
  templateUrl: './particles.component.html',
  styleUrls: ['./particles.component.css'],
})
export class ParticlesComponent implements OnInit {
  private currenteColor: string;
  protected id: string = 'tsparticles';
  protected particlesOptions: any;

  constructor(private readonly ngParticlesService: NgParticlesService) {
    this.currenteColor = '#fff';
    this.particlesOptions = {
      background: {
        color: {
          value: 'none',
        },
      },
      fpsLimit: 120,
      interactivity: {
        events: {
          onClick: {
            enable: false,
            mode: 'repulse',
          },
          onHover: {
            enable: false,
            mode: 'bubble',
          },
          resize: true,
        },
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
        },
        move: {
          enable: true,
          speed: 0.9,
          direction: 'bottom-left',
          random: false,
          straight: false,
          outModes: {
            default: 'out',
          },
        },
        number: {
          density: {
            enable: true,
            area: 800,
          },
          value: 50,
        },
        opacity: {
          value: 0.9,
          ramdom: true,
          anim: {
            enable: true,
            speed: 1,
            opacity_min: 0,
            sync: false,
          },
        },
        shape: {
          type: 'circle',
          stroke: {
            width: 0,
            color: '#fff',
          },
          polygon: {
            nb_sides: 5,
          },
        },
        size: {
          value: { min: 2, max: 2 },
          random: false,
          anim: {
            enable: true,
            speed: 4,
            size_min: 0.3,
            sync: true,
          },
        },
      },
      detectRetina: true,
    };
  }

  ngOnInit(): void {
    this.ngParticlesService.init(this.particlesInit);
  }

  particlesLoaded(container: Container): void {}

  async particlesInit(engine?: Engine): Promise<void> {
    await loadSlim(engine!);
  }
}

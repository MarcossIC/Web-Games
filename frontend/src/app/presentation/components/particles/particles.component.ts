import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NgParticlesModule } from 'ng-particles';
import { ClickMode, Container, Engine, HoverMode, MoveDirection, OutMode } from 'tsparticles-engine';
import { loadSlim } from 'tsparticles-slim';

@Component({
  standalone: true,
  imports: [CommonModule, NgParticlesModule],
  selector: 'app-particles',
  templateUrl: './particles.component.html',
  styleUrls: ['./particles.component.css']
})
export class ParticlesComponent {
  private currenteColor: string;
  protected id: string = "tsparticles";
    particlesOptions$: any;

  
  constructor() { 
    this.currenteColor = "#fff";
    this.particlesOptions$ = {
        background: {
            color: {
                value: "none",
            },
        },
        fpsLimit: 120,
        interactivity: {
            events: {
                onClick: {
                    enable: false,
                    mode: ClickMode.repulse,
                },
                onHover: {
                    enable: true,
                    mode: HoverMode.bubble,
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
                  duration: 2,
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
                distance: 150,
                enable: false,
                opacity: 0.4,
                width: 1,
            },
            collisions: {
              enable: false,
            },
            move: {
              enable: true,
              speed: 0.8,
              direction: MoveDirection.bottomLeft,
              random: false,
              straight: false,
              outModes: {
                  default: OutMode.out,
              },
                  
            },
            number: {
                density: {
                    enable: true,
                    area: 800,
                },
                value: 100,
            },
            opacity: {
                value: 0.9,
                ramdom: true,
                anim: {
                  enable: true,
                  speed: 1,
                  opacity_min: 0,
                  sync: false
                },
            },
            shape: {
                type: "circle",
                stroke: {
                  width: 0,
                  color: "#fff"
                },
                polygon: {
                  nb_sides: 5
                },
            },
            size: {
              value: { min: 2, max: 2 },
              random: false,
              anim: {
                  enable: true,
                  speed: 4,
                  size_min: 0.3,
                  sync: true
              }
          },
        },
        detectRetina: true,
    }; 
  }

  particlesLoaded(container: Container): void {
  }

  async particlesInit(engine: Engine): Promise<void> {

    // Starting from 1.19.0 you can add custom presets or shape here, using the current tsParticles instance (main)
        // this loads the tsparticles package bundle, it's the easiest method for getting everything ready
        // starting from v2 you can add only the features you need reducing the bundle size
        //await loadFull(engine);
      await loadSlim(engine);
  }
}

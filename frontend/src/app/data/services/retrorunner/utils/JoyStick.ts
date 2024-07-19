import { Axis } from '@app/data/models/Axis';
import { GameObjects, Scenes, Scene } from 'phaser';

class Joystick {
  private scene: Scene;
  private radius: number;
  private stick: GameObjects.Arc;
  private base: GameObjects.Arc;
  private baseX = 0;
  private baseY = 0;
  private pointerId: any;
  private direction: Axis;

  constructor(main: Scene, x: number, y: number, radius: number) {
    this.scene = main;
    this.radius = radius;

    // Crear el fondo del joystick
    this.base = this.scene.add
      .circle(x, y, radius, 0x888888, 0.5)
      .setInteractive()
      .setScrollFactor(0);

    // Crear la palanca del joystick
    this.stick = this.scene.add
      .circle(x, y, radius / 2, 0xffffff, 0.5)
      .setInteractive()
      .setScrollFactor(0);

    // Variables para almacenar la posición inicial
    this.baseX = x;
    this.baseY = y;

    // Variables para almacenar el estado del joystick
    this.pointerId = null;
    this.direction = { x: 0, y: 0 };

    // Manejar los eventos de input
    this.stick.on('pointerdown', this.onPointerDown, this);
    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
  }

  protected onPointerDown(pointer) {
    if (this.pointerId === null) {
      this.pointerId = pointer.id;
      this.stick.setFillStyle(0xff0000, 0.5);
    }
  }

  protected onPointerMove(pointer) {
    if (pointer.id === this.pointerId) {
      let deltaX = pointer.x - this.baseX;
      let deltaY = pointer.y - this.baseY;
      let distance = Math.sqrt(deltaX * deltaY + deltaY * deltaY);

      if (distance > this.radius) {
        deltaX *= this.radius / distance;
        deltaY *= this.radius / distance;
        distance = this.radius;
      }

      this.stick.x = this.baseX + deltaX;
      this.stick.y = this.baseY + deltaY;

      this.direction.x = deltaX / this.radius;
      this.direction.y = deltaY / this.radius;
    }
  }

  protected onPointerUp(pointer) {
    if (pointer.id === this.pointerId) {
      this.pointerId = null;
      this.stick.setFillStyle(0xffffff, 0.5);
      this.stick.x = this.baseX;
      this.stick.y = this.baseY;
      this.direction.x = 0;
      this.direction.y = 0;
    }
  }

  public getDirection() {
    return this.direction;
  }

  public isJumping() {
    return this.direction.y < -0.5;
  }
  public isCrouching() {
    return this.direction.y > 0.5;
  }
  public isMovingRight() {
    return this.direction.x > 0.5;
  }
  public isMovingLeft() {
    return this.direction.x < -0.5;
  }
}

export default Joystick;

import { DragTracker, TAP_MAX_MS, TAP_SLOP_PX } from './drag';

describe('DragTracker', () => {
  const finger = (id: number, x: number, y: number) => ({ id, x, y, type: 'touch' });
  const tracker = (step = 30) => new DragTracker({ step: () => step });

  it('steps once the finger has travelled a whole cell', () => {
    const drags = tracker();
    drags.down(finger(1, 100, 100), 0);
    expect(drags.move(finger(1, 120, 100))).toEqual([]);
    expect(drags.move(finger(1, 130, 100))).toEqual(['right']);
    expect(drags.move(finger(1, 150, 100))).toEqual([]);
    expect(drags.move(finger(1, 160, 100))).toEqual(['right']);
    expect(drags.move(finger(1, 100, 100))).toEqual(['left', 'left']);
  });

  it('gives every cell a fast drag covered between two moves', () => {
    const drags = tracker();
    drags.down(finger(1, 0, 0), 0);
    expect(drags.move(finger(1, -95, 4))).toEqual(['left', 'left', 'left']);
  });

  it('keeps the axis of its first step until the finger lifts', () => {
    const drags = tracker();
    drags.down(finger(1, 100, 100), 0);
    expect(drags.move(finger(1, 130, 110))).toEqual(['right']);
    // Drifting down while dragging sideways does not drop the piece.
    expect(drags.move(finger(1, 135, 200))).toEqual([]);
    drags.up(finger(1, 135, 200), 500);

    drags.down(finger(1, 100, 100), 600);
    expect(drags.move(finger(1, 110, 165))).toEqual(['down', 'down']);
    expect(drags.move(finger(1, 200, 165))).toEqual([]);
  });

  it('reads the step on every move, so it follows a resized board', () => {
    let step = 30;
    const drags = new DragTracker({ step: () => step });
    drags.down(finger(1, 0, 0), 0);
    step = 10;
    expect(drags.move(finger(1, 25, 0))).toEqual(['right', 'right']);
  });

  it('is a tap when the finger lifts soon without travelling', () => {
    const drags = tracker();
    drags.down(finger(1, 100, 100), 0);
    drags.move(finger(1, 104, 103));
    expect(drags.up(finger(1, 104, 103), 120)).toBe('tap');
  });

  it('is not a tap once it travelled, held too long or stepped', () => {
    const drags = tracker();
    drags.down(finger(1, 100, 100), 0);
    drags.move(finger(1, 100 + TAP_SLOP_PX, 100));
    drags.move(finger(1, 100, 100));
    expect(drags.up(finger(1, 100, 100), 100)).toBeNull();

    drags.down(finger(1, 100, 100), 1000);
    expect(drags.up(finger(1, 100, 100), 1001 + TAP_MAX_MS)).toBeNull();

    drags.down(finger(1, 100, 100), 2000);
    drags.move(finger(1, 140, 100));
    expect(drags.up(finger(1, 140, 100), 2100)).toBeNull();
  });

  it('follows the finger that went down last', () => {
    const drags = tracker();
    drags.down(finger(1, 0, 0), 0);
    drags.down(finger(2, 0, 0), 10);
    expect(drags.move(finger(1, 60, 0))).toEqual([]);
    expect(drags.up(finger(1, 0, 0), 20)).toBeNull();
    expect(drags.move(finger(2, 30, 0))).toEqual(['right']);
  });

  it('forgets a cancelled finger: no step and no tap', () => {
    const drags = tracker();
    drags.down(finger(1, 0, 0), 0);
    drags.cancel(finger(1, 0, 0));
    expect(drags.move(finger(1, 60, 0))).toEqual([]);
    expect(drags.up(finger(1, 0, 0), 10)).toBeNull();
  });

  it('leaves the mouse out: its clicks are clicks', () => {
    const drags = tracker();
    drags.down({ id: 1, x: 0, y: 0, type: 'mouse' }, 0);
    expect(drags.move({ id: 1, x: 90, y: 0, type: 'mouse' })).toEqual([]);
    expect(drags.up({ id: 1 }, 10)).toBeNull();
  });
});

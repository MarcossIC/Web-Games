import { interpolateBody, settleBody, unwrapBody } from './snake-motion';

const BOARD = { columns: 32, rows: 18 };

describe('interpolateBody', () => {
  it('places each segment part of the way from where it was to where it is', () => {
    const previous = [
      { x: 5, y: 3 },
      { x: 4, y: 3 },
    ];
    const current = [
      { x: 6, y: 3 },
      { x: 5, y: 3 },
    ];

    expect(interpolateBody(previous, current, 0.5, BOARD)).toEqual([
      { x: 5.5, y: 3 },
      { x: 4.5, y: 3 },
    ]);
  });

  it('starts at the previous position and ends at the current one', () => {
    const previous = [{ x: 2, y: 2 }];
    const current = [{ x: 2, y: 3 }];

    expect(interpolateBody(previous, current, 0, BOARD)).toEqual([
      { x: 2, y: 2 },
    ]);
    expect(interpolateBody(previous, current, 1, BOARD)).toEqual([
      { x: 2, y: 3 },
    ]);
  });

  it('carries a segment out through the edge it is crossing', () => {
    // The head left through the right edge and comes back on the left:
    // it keeps moving right, past the last column.
    const previous = [{ x: 32, y: 4 }];
    const current = [{ x: 1, y: 4 }];

    expect(interpolateBody(previous, current, 0.5, BOARD)).toEqual([
      { x: 32.5, y: 4 },
    ]);
  });

  it('carries a segment out through the top edge as well', () => {
    const previous = [{ x: 7, y: 1 }];
    const current = [{ x: 7, y: 18 }];

    expect(interpolateBody(previous, current, 0.25, BOARD)).toEqual([
      { x: 7, y: 0.75 },
    ]);
  });

  it('does not slide a segment that was placed somewhere else, as on a restart', () => {
    const previous = [{ x: 3, y: 3 }];
    const current = [{ x: 20, y: 11 }];

    expect(interpolateBody(previous, current, 0.5, BOARD)).toEqual([
      { x: 20, y: 11 },
    ]);
  });

  it('shows a segment the snake just grew at its own position', () => {
    const previous = [{ x: 5, y: 3 }];
    const current = [
      { x: 6, y: 3 },
      { x: 5, y: 3 },
    ];

    expect(interpolateBody(previous, current, 0.5, BOARD)).toEqual([
      { x: 5.5, y: 3 },
      { x: 5, y: 3 },
    ]);
  });

  it('keeps the progress between 0 and 1', () => {
    const previous = [{ x: 1, y: 1 }];
    const current = [{ x: 2, y: 1 }];

    expect(interpolateBody(previous, current, 7, BOARD)).toEqual([
      { x: 2, y: 1 },
    ]);
    expect(interpolateBody(previous, current, -3, BOARD)).toEqual([
      { x: 1, y: 1 },
    ]);
  });
});

describe('unwrapBody', () => {
  it('leaves a body that does not cross an edge as it is', () => {
    const body = [
      { x: 6, y: 3 },
      { x: 5, y: 3 },
      { x: 4, y: 3 },
    ];

    expect(unwrapBody(body, BOARD)).toEqual(body);
  });

  it('lays a body that crosses an edge out as one unbroken line', () => {
    // Head already back on the left, the rest still on the right.
    const body = [
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 32, y: 3 },
      { x: 31, y: 3 },
    ];

    expect(unwrapBody(body, BOARD)).toEqual([
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 0, y: 3 },
      { x: -1, y: 3 },
    ]);
  });

  it('does the same across the top and bottom edges', () => {
    const body = [
      { x: 9, y: 18 },
      { x: 9, y: 1 },
    ];

    expect(unwrapBody(body, BOARD)).toEqual([
      { x: 9, y: 18 },
      { x: 9, y: 19 },
    ]);
  });
});

describe('settleBody', () => {
  it('leaves a normal body as it is', () => {
    const body = [
      { x: 6, y: 3 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
    ];

    expect(settleBody(body, BOARD)).toEqual(body);
  });

  it('moves a segment the game parked on the head back to the tail', () => {
    // The snake just ate at (6, 3): the game appended the new segment
    // there, on top of the head, three cells away from the real tail.
    const body = [
      { x: 6, y: 3 },
      { x: 5, y: 3 },
      { x: 4, y: 3 },
      { x: 6, y: 3 },
    ];

    expect(settleBody(body, BOARD)).toEqual([
      { x: 6, y: 3 },
      { x: 5, y: 3 },
      { x: 4, y: 3 },
      { x: 4, y: 3 },
    ]);
  });

  it('treats segments on opposite edges as neighbours', () => {
    const body = [
      { x: 1, y: 3 },
      { x: 32, y: 3 },
    ];

    expect(settleBody(body, BOARD)).toEqual(body);
  });
});

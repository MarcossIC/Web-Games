import { bindKeys, type KeyBinding } from './key-bindings';

type Action = 'left' | 'jump' | 'pause';

describe('bindKeys', () => {
  const bindings: KeyBinding<Action>[] = [
    { action: 'left', keys: ['ArrowLeft', 'a'] },
    { action: 'jump', codes: ['Space'] },
    { action: 'pause', keyCodes: [80] },
  ];
  const resolve = bindKeys(bindings);

  it('matches by key, as KeyboardEvent.key says it', () => {
    expect(resolve({ key: 'ArrowLeft' })).toBe('left');
    expect(resolve({ key: 'a' })).toBe('left');
  });

  it('is case sensitive by key unless asked otherwise', () => {
    expect(resolve({ key: 'A' })).toBeUndefined();
    const loose = bindKeys<Action>([{ action: 'left', keys: ['a'], ignoreCase: true }]);
    expect(loose({ key: 'A' })).toBe('left');
  });

  it('matches by code, the place of the key on any layout', () => {
    expect(resolve({ key: ' ', code: 'Space' })).toBe('jump');
  });

  it('matches by keyCode, the letter of the layout', () => {
    expect(resolve({ key: 'p', keyCode: 80 })).toBe('pause');
  });

  it('gives undefined for a key with no binding', () => {
    expect(resolve({ key: 'x', code: 'KeyX', keyCode: 88 })).toBeUndefined();
  });

  it('gives the fallback for a key with no binding when there is one', () => {
    const withFallback = bindKeys<Action | null>(bindings, { otherwise: null });
    expect(withFallback({ key: 'Shift' })).toBeNull();
    expect(withFallback({ key: 'a' })).toBe('left');
  });

  it('lets repeats and modifiers through by default', () => {
    expect(resolve({ key: 'a', repeat: true })).toBe('left');
    expect(resolve({ key: 'a', ctrlKey: true, metaKey: true, altKey: true })).toBe('left');
  });

  it('drops repeats when asked to', () => {
    const once = bindKeys<Action>([{ action: 'pause', keys: ['p'], ignoreRepeat: true }]);
    expect(once({ key: 'p', repeat: true })).toBeUndefined();
    expect(once({ key: 'p', repeat: false })).toBe('pause');
  });

  it('drops Ctrl, Cmd and Alt combos when asked to, not Shift', () => {
    const plain = bindKeys<Action>([{ action: 'pause', keys: ['p'], ignoreCase: true, ignoreModifiers: true }]);
    expect(plain({ key: 'p', ctrlKey: true })).toBeUndefined();
    expect(plain({ key: 'p', metaKey: true })).toBeUndefined();
    expect(plain({ key: 'p', altKey: true })).toBeUndefined();
    expect(plain({ key: 'P', shiftKey: true })).toBe('pause');
  });

  it('a filtered key falls to the fallback, as a key with no binding', () => {
    const once = bindKeys<Action | null>([{ action: 'pause', keys: ['p'], ignoreRepeat: true }], { otherwise: null });
    expect(once({ key: 'p', repeat: true })).toBeNull();
  });

  it('takes the first binding that matches', () => {
    const both = bindKeys<Action>([
      { action: 'left', keys: ['a'] },
      { action: 'jump', keys: ['a'] },
    ]);
    expect(both({ key: 'a' })).toBe('left');
  });
});

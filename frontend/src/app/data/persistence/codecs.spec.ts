import { count, flag, nullable, number, object, recordOf, text } from './codecs';

describe('codecs', () => {
  describe('number', () => {
    it('takes finite numbers only', () => {
      const any = number();

      expect(any(3.5)).toBe(3.5);
      expect(any(-2)).toBe(-2);
      for (const bad of [Number.NaN, Infinity, '3', null, undefined, {}]) {
        expect(any(bad)).withContext(String(bad)).toBeUndefined();
      }
    });

    it('applies its rule', () => {
      expect(number({ min: 1 })(0)).toBeUndefined();
      expect(number({ min: 1 })(1)).toBe(1);
      expect(number({ above: 0 })(0)).toBeUndefined();
      expect(number({ above: 0 })(0.5)).toBe(0.5);
      expect(number({ integer: true })(1.5)).toBeUndefined();
      expect(number({ integer: true })(2)).toBe(2);
    });
  });

  describe('count', () => {
    it('takes whole numbers from its minimum up, zero by default', () => {
      expect(count()(0)).toBe(0);
      expect(count()(-1)).toBeUndefined();
      expect(count()(2.5)).toBeUndefined();
      expect(count(1)(0)).toBeUndefined();
      expect(count(1)(4)).toBe(4);
    });
  });

  describe('text', () => {
    it('takes strings only', () => {
      expect(text()('')).toBe('');
      expect(text()('a')).toBe('a');
      expect(text()(1)).toBeUndefined();
      expect(text()(null)).toBeUndefined();
    });
  });

  describe('flag', () => {
    it('takes true and false only', () => {
      expect(flag()(true)).toBeTrue();
      expect(flag()(false)).toBeFalse();
      for (const bad of ['1', 'true', 0, 1, null, undefined]) {
        expect(flag()(bad)).withContext(String(bad)).toBeUndefined();
      }
    });
  });

  describe('nullable', () => {
    it('takes null, or what its check takes', () => {
      const maybe = nullable(count());

      expect(maybe(null)).toBeNull();
      expect(maybe(3)).toBe(3);
      expect(maybe('x')).toBeUndefined();
      expect(maybe(undefined)).toBeUndefined();
    });
  });

  describe('object', () => {
    const point = object({ x: count(), label: text() });

    it('takes an object whose every field passes, leaving out the extra fields', () => {
      expect(point({ x: 1, label: 'a', extra: true })).toEqual({ x: 1, label: 'a' });
    });

    it('refuses the whole object when one field fails', () => {
      expect(point({ x: -1, label: 'a' })).toBeUndefined();
      expect(point({ x: 1 })).toBeUndefined();
    });

    it('refuses what is not an object', () => {
      for (const bad of [null, [], 'a', 3]) {
        expect(point(bad)).withContext(JSON.stringify(bad)).toBeUndefined();
      }
    });
  });

  describe('recordOf', () => {
    const times = recordOf(count(1), number({ above: 0 }));

    it('keeps the entries whose key and value pass, one by one', () => {
      expect(times({ 1: 300, 2: -4, 3: 'fast', x: 100, 4: null, 5: 0, 6: 410.5 })).toEqual({ 1: 300, 6: 410.5 });
    });

    it('refuses what is not an object', () => {
      expect(times([1, 2])).toBeUndefined();
      expect(times('a')).toBeUndefined();
      expect(times(null)).toBeUndefined();
    });
  });
});

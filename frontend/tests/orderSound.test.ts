import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playOrderSound, setOrderRingtone } from '../src/utils/orderSound';

// Stands in for the browser's Audio: records which sources were played, and can refuse some.
const played: string[] = [];
let refuse: (src: string) => boolean = () => false;

beforeEach(() => {
  played.length = 0;
  refuse = () => false;
  vi.stubGlobal(
    'Audio',
    class {
      constructor(private src: string) {}
      play() {
        played.push(this.src);
        return refuse(this.src) ? Promise.reject(new Error('blocked')) : Promise.resolve();
      }
    },
  );
});
afterEach(() => {
  setOrderRingtone('');
  vi.unstubAllGlobals();
});

describe('playOrderSound', () => {
  it('plays the default sound until a person has chosen their own', async () => {
    await playOrderSound();
    expect(played).toHaveLength(1);
    expect(played[0]).toMatch(/^https:\/\/assets\.mixkit\.co\//);
  });

  it("plays the person's own sound once it is set", async () => {
    setOrderRingtone('/api/v1/public/images/abc');
    await playOrderSound();
    expect(played).toEqual(['/api/v1/public/images/abc']);
  });

  it('falls back to the default when the chosen file cannot be played', async () => {
    setOrderRingtone('/api/v1/public/images/gone');
    refuse = (src) => src.includes('/images/gone');
    await playOrderSound();
    expect(played).toHaveLength(2);
    expect(played[1]).toMatch(/mixkit/);
  });

  it('never throws, even when the browser refuses every sound', async () => {
    refuse = () => true;
    await expect(playOrderSound()).resolves.toBeUndefined();
  });

  it('can preview a sound without changing the saved one', async () => {
    setOrderRingtone('/a');
    await playOrderSound('/b');
    expect(played).toEqual(['/b']);
    await playOrderSound();
    expect(played[1]).toBe('/a');
  });
});

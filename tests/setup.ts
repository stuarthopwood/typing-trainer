import "@testing-library/jest-dom/vitest";

globalThis.AudioContext = class {
  createOscillator() { return { connect: () => {}, type: '', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, start: () => {}, stop: () => {} }; }
  createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }; }
  get destination() { return {}; }
  get currentTime() { return 0; }
} as unknown as typeof AudioContext;

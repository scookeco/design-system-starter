// jsdom (a devDependency, used by Vitest) ships no types. The manifest collector needs only this.
declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string);
    readonly window: Window & typeof globalThis;
  }
}

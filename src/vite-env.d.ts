/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '@splinetool/runtime' {
  export class Application {
    constructor(canvas: HTMLCanvasElement);
    load(url: string): Promise<void>;
  }
}

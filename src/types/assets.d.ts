declare module "*.png" {
  const src: string;
  export default src;
}

/** package.json version, injected by Vite. */
declare const __APP_VERSION__: string;

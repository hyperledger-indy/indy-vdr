import type { nativeBindings } from "./bindings";

// biome-ignore lint/suspicious/noExplicitAny: inferred from bindings.ts but complex to type fully
export type NativeMethods = Record<
  keyof typeof nativeBindings,
  (...args: unknown[]) => any
>;

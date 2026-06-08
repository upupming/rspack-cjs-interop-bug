/**
 * A minimal CJS module that mimics the export pattern of tailwindcss internals.
 *
 * tailwindcss v3.4.x uses `@swc/cli` to compile its ESM source (src/) into
 * CJS output (lib/). The swc compiler produces a `_export()` helper that
 * dynamically defines exports via `Object.defineProperty` in a loop.
 *
 * Node.js's `cjs-module-lexer` cannot statically detect named exports from
 * this pattern, so `import { X } from 'this-module'` fails in ESM runtime.
 */

export const MY_SYMBOL: unique symbol = Symbol('my-symbol');

export function helperFn(): string {
  return 'hello from CJS';
}

# fake-cjs-lib

A minimal CJS module that reproduces the exact export pattern of **tailwindcss v3.4.x** internal modules.

## How it's built

tailwindcss uses `@swc/cli` to compile ESM source into CJS:

```bash
swc src --out-dir lib --copy-files
```

This repo does the same:

```bash
npx swc src/index.ts -o index.js
```

### Source (src/index.ts)

```ts
export const MY_SYMBOL: unique symbol = Symbol('my-symbol');

export function helperFn(): string {
  return 'hello from CJS';
}
```

### Compiled output (index.js)

```js
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function _export(target, all) {
    for(var name in all) Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get MY_SYMBOL() { return MY_SYMBOL; },
    get helperFn() { return helperFn; }
});
const MY_SYMBOL = Symbol('my-symbol');
function helperFn() { return 'hello from CJS'; }
```

## Why this is problematic

Node.js's `cjs-module-lexer` uses static analysis to detect which named exports a CJS module provides. It recognizes patterns like:

- ✅ `exports.X = ...`
- ✅ `module.exports = { X: ... }`
- ✅ `Object.defineProperty(exports, "X", { ... })` (literal string key)

But it **cannot** recognize:

- ❌ `_export(exports, { ... })` — indirect via helper function

This means in Node.js ESM runtime:

```js
import { MY_SYMBOL } from 'fake-cjs-lib';
// ❌ SyntaxError: does not provide an export named 'MY_SYMBOL'

import lib from 'fake-cjs-lib';
lib.MY_SYMBOL;
// ✅ Works — default import gives the whole module.exports object
```

## Reference

- tailwindcss build command: `"build": "swc src --out-dir lib --copy-files"`
- tailwindcss swc version: `@swc/cli` 0.1.62, `@swc/core` 1.3.55
- Same `_export()` + `_interop_require_default()` pattern in all `tailwindcss/lib/**/*.js` files

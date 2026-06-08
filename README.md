# rslib/rspack: No import pattern produces correct output for both ESM and CJS

## Problem

When using rslib to output both ESM and CJS formats, and the external dependency is a CJS module that uses the `_export()` helper pattern (standard swc/babel compiled output), **no import syntax exists** that produces working output for both formats at Node.js runtime.

## Preconditions

The external CJS module has these characteristics:
1. Sets `__esModule: true`
2. Uses `_export(exports, {...})` helper function to dynamically define exports
3. Does **NOT** have `exports.default`

This pattern is the standard swc/babel ESM→CJS compilation output. tailwindcss, and many npm packages use this exact pattern.

## Comparison of all 4 import patterns

| # | Source code | ESM output | CJS output | ESM failure reason | CJS failure reason |
|---|------------|:---:|:---:|---|---|
| 1 | `import { X } from 'cjs'` | ❌ | ✅ | cjs-module-lexer cannot detect dynamic exports | — |
| 2 | `import lib from 'cjs'; lib.X` | ✅ | ❌ | — | `__webpack_require__.n` extracts `.default` for `__esModule:true` modules, but `.default` doesn't exist → `undefined` |
| 3 | `import * as lib from 'cjs'; lib.X` | ❌ | ✅ | Property not on namespace object, lives on `.default` | — |
| 4 | `import * as lib from 'cjs'; lib.default.X` | ✅ | ❌ | — | rspack collapses `.default` access into `__webpack_require__.n`, which returns `undefined` |

### Detailed analysis

**ESM output behavior at Node.js runtime:**

```js
import * as lib from 'fake-cjs-lib';
// lib = { __esModule: true, default: <module.exports object>, 'module.exports': ... }
// lib.MY_SYMBOL → undefined (cjs-module-lexer can't detect it)
// lib.default.MY_SYMBOL → Symbol(...) (correct, but incompatible with rspack CJS output)
```

**`__webpack_require__.n` logic in CJS output:**

```js
__webpack_require__.n = (module) => {
    // If __esModule: true → return module['default']
    // But this module has no exports.default → returns undefined!
    var getter = module && module.__esModule ? () => module['default'] : () => module;
    return getter;
};
```

The issue: swc/babel compiled CJS modules set `__esModule: true` (meaning "I was compiled from ESM"), but don't necessarily have `exports.default` (only present when the original ESM had `export default`). `__webpack_require__.n` only checks the `__esModule` flag without verifying that `.default` actually exists.

## Steps to reproduce

```bash
pnpm install
pnpm build

# Current source uses Pattern 1 (named import)
pnpm test:esm   # ❌ SyntaxError: does not provide an export named 'MY_SYMBOL'
pnpm test:cjs   # ✅ Works

# Edit src/index.ts to switch to Pattern 2 (default import)
pnpm build
pnpm test:esm   # ✅ Works
pnpm test:cjs   # ❌ TypeError: Cannot read properties of undefined
```

Edit `src/index.ts` and uncomment different patterns to verify each one.

## The CJS module code (fake-cjs-lib/index.js)

```js
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function _export(target, all) {
    for(var name in all) Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    MY_SYMBOL: function() { return MY_SYMBOL; },
    helperFn: function() { return helperFn; }
});
const MY_SYMBOL = Symbol('my-symbol');
function helperFn() { return 'hello from CJS'; }
```

## Verifying cjs-module-lexer behavior in Node.js

```bash
node --input-type=module -e "
import * as lib from 'fake-cjs-lib';
console.log('namespace keys:', Object.keys(lib));
// → ['__esModule', 'default', 'module.exports']
// MY_SYMBOL and helperFn are NOT on the namespace!

console.log('lib.MY_SYMBOL:', lib.MY_SYMBOL);                  // undefined
console.log('lib.default.MY_SYMBOL:', lib.default.MY_SYMBOL);  // Symbol(...)
"
```

## Root cause

Two independent issues combine to create a deadlock:

1. **Node.js cjs-module-lexer limitation**: Cannot recognize the `_export(exports, {...})` pattern, so ESM runtime can only access CJS exports via `.default`

2. **rspack `__webpack_require__.n` assumption is too strong**: When it sees `__esModule: true`, it unconditionally extracts `.default` without checking whether `.default` actually exists. It should fall back to the entire module object:

```js
// Current (broken):
var getter = module.__esModule ? () => module['default'] : () => module;

// Suggested fix:
var getter = module.__esModule
  ? () => (module['default'] !== undefined ? module['default'] : module)
  : () => module;
```

## Workaround

Use a runtime helper for cross-format compatibility:

```ts
import * as _mod from 'cjs-module';

function cjsInterop<T>(mod: unknown, key: string): T {
  const m = mod as Record<string, unknown>;
  if (key in m) return m[key] as T;
  if ('default' in m && m['default'] != null) {
    const d = m['default'] as Record<string, unknown>;
    if (typeof d === 'object' && key in d) return d[key] as T;
  }
  return mod as T;
}

const MY_SYMBOL = cjsInterop<symbol>(_mod, 'MY_SYMBOL');
```

This helper is preserved in the output (runtime function call cannot be statically optimized away), allowing correct property resolution in both ESM and CJS environments.

## Real-world impact

This affects `@lynx-js/tailwind-preset` which depends on tailwindcss internal modules (`tailwindcss/lib/lib/setupContextUtils.js`, etc.) that use exactly this `_export()` pattern. The built ESM output fails with:

```
SyntaxError: The requested module 'tailwindcss/lib/lib/setupContextUtils.js'
does not provide an export named 'INTERNAL_FEATURES'
```

## Environment

- Node.js: v24.12.0
- rslib: 0.22.0
- rspack: (bundled with rslib)
- pnpm: 10.x
- OS: macOS

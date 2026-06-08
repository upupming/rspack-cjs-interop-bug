// Demonstrate all 4 import patterns to show none works for both ESM and CJS output.
// Uncomment the pattern you want to test (only one at a time).

// ─── Pattern 1: named import ───
// ESM output: ❌ (cjs-module-lexer can't detect named exports)
// CJS output: ✅
import { MY_SYMBOL, helperFn } from 'fake-cjs-lib';
const sym = MY_SYMBOL;
const fn = helperFn;

// ─── Pattern 2: default import + property access ───
// ESM output: ✅
// CJS output: ❌ (__webpack_require__.n returns undefined for __esModule without .default)
// import lib from 'fake-cjs-lib';
// const sym = lib.MY_SYMBOL;
// const fn = lib.helperFn;

// ─── Pattern 3: namespace import + property access ───
// ESM output: ❌ (properties live on .default, not on namespace)
// CJS output: ✅
// import * as lib from 'fake-cjs-lib';
// const sym = lib.MY_SYMBOL;
// const fn = lib.helperFn;

// ─── Pattern 4: namespace import + .default + property access ───
// ESM output: ✅
// CJS output: ❌ (rspack collapses .default into __webpack_require__.n which returns undefined)
// import * as lib from 'fake-cjs-lib';
// const sym = lib.default.MY_SYMBOL;
// const fn = lib.default.helperFn;

export default function main() {
  console.log('MY_SYMBOL type:', typeof sym);
  console.log('helperFn result:', fn());

  if (typeof sym !== 'symbol') {
    throw new Error(`Expected symbol, got ${typeof sym}: ${String(sym)}`);
  }
  if (fn() !== 'hello from CJS') {
    throw new Error(`Expected 'hello from CJS', got '${fn()}'`);
  }
  console.log('✅ All checks passed');
}

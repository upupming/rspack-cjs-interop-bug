// Source uses namespace import + property access.
// This is a valid pattern that should work at runtime.
import * as lib from 'fake-cjs-lib';

// Access named exports from the namespace
const sym = lib.MY_SYMBOL;
const fn = lib.helperFn;

export default function main() {
  console.log('MY_SYMBOL type:', typeof sym); // should be 'symbol'
  console.log('helperFn result:', fn());       // should be 'hello from CJS'

  if (typeof sym !== 'symbol') {
    throw new Error(`Expected symbol, got ${typeof sym}: ${String(sym)}`);
  }
  if (fn() !== 'hello from CJS') {
    throw new Error(`Expected 'hello from CJS', got '${fn()}'`);
  }
  console.log('✅ All checks passed');
}

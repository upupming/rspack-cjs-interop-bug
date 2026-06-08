import { MY_SYMBOL, helperFn } from "fake-cjs-lib";
const sym = MY_SYMBOL;
const fn = helperFn;
function main() {
    console.log('MY_SYMBOL type:', typeof sym);
    console.log('helperFn result:', fn());
    if ('symbol' != typeof sym) throw new Error(`Expected symbol, got ${typeof sym}: ${String(sym)}`);
    if ('hello from CJS' !== fn()) throw new Error(`Expected 'hello from CJS', got '${fn()}'`);
    console.log('✅ All checks passed');
}
export default main;

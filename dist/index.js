import * as __rspack_external_fake_cjs_lib_876278b5 from "fake-cjs-lib";
const sym = __rspack_external_fake_cjs_lib_876278b5.MY_SYMBOL;
const fn = __rspack_external_fake_cjs_lib_876278b5.helperFn;
function main() {
    console.log('MY_SYMBOL type:', typeof sym);
    console.log('helperFn result:', fn());
    if ('symbol' != typeof sym) throw new Error(`Expected symbol, got ${typeof sym}: ${String(sym)}`);
    if ('hello from CJS' !== fn()) throw new Error(`Expected 'hello from CJS', got '${fn()}'`);
    console.log('✅ All checks passed');
}
export default main;

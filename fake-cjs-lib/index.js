/**
 * A minimal CJS module that mimics the export pattern of tailwindcss internals.
 *
 * tailwindcss v3.4.x uses `@swc/cli` to compile its ESM source (src/) into
 * CJS output (lib/). The swc compiler produces a `_export()` helper that
 * dynamically defines exports via `Object.defineProperty` in a loop.
 *
 * Node.js's `cjs-module-lexer` cannot statically detect named exports from
 * this pattern, so `import { X } from 'this-module'` fails in ESM runtime.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get MY_SYMBOL () {
        return MY_SYMBOL;
    },
    get helperFn () {
        return helperFn;
    }
});
const MY_SYMBOL = Symbol('my-symbol');
function helperFn() {
    return 'hello from CJS';
}


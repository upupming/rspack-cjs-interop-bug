// This CJS module uses the same _export() pattern as tailwindcss (swc output).
// Node.js cjs-module-lexer CANNOT detect named exports from this pattern.
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all) Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    MY_SYMBOL: function() {
        return MY_SYMBOL;
    },
    helperFn: function() {
        return helperFn;
    }
});

const MY_SYMBOL = Symbol('my-symbol');

function helperFn() {
    return 'hello from CJS';
}

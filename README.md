# rslib/rspack: 无法编译出 ESM/CJS 双格式都能正确运行的产物

## 问题

当使用 rslib 同时输出 ESM 和 CJS 格式，且外部依赖是一个使用 `_export()` helper 模式（swc/babel 编译产物）的 CJS 模块时，**不存在任何一种 import 写法**能让两种格式的产物都在 Node.js 运行时正常工作。

## 前置条件

外部 CJS 模块具有以下特征：
1. 设置了 `__esModule: true`
2. 使用 `_export(exports, {...})` helper 函数动态定义导出
3. **没有** `exports.default`

这种模式是 swc/babel 编译 ESM→CJS 的标准输出，tailwindcss、很多 npm 包都是这样的。

## 四种写法的结果对比

| # | 源码写法 | ESM 产物 | CJS 产物 | ESM 失败原因 | CJS 失败原因 |
|---|---------|:---:|:---:|---|---|
| 1 | `import { X } from 'cjs'` | ❌ | ✅ | cjs-module-lexer 识别不了动态导出 | — |
| 2 | `import lib from 'cjs'; lib.X` | ✅ | ❌ | — | `__webpack_require__.n` 对 `__esModule:true` 的模块取 `.default`，但 `.default` 不存在 → `undefined` |
| 3 | `import * as lib from 'cjs'; lib.X` | ❌ | ✅ | namespace 对象上没有 `X`，它在 `.default` 上 | — |
| 4 | `import * as lib from 'cjs'; lib.default.X` | ✅ | ❌ | — | rspack 将 `.default` 访问折叠进 `__webpack_require__.n`，同样返回 `undefined` |

### 详细分析

**ESM 产物在 Node.js 运行时的语义：**

```js
import * as lib from 'fake-cjs-lib';
// lib = { __esModule: true, default: <module.exports对象>, 'module.exports': ... }
// lib.MY_SYMBOL → undefined（cjs-module-lexer 识别不了）
// lib.default.MY_SYMBOL → Symbol(...)（正确，但 rspack CJS 产物不兼容）
```

**CJS 产物中 `__webpack_require__.n` 的逻辑：**

```js
__webpack_require__.n = (module) => {
    // 如果有 __esModule: true → 取 module['default']
    // 但这个模块没有 exports.default → 返回 undefined!
    var getter = module && module.__esModule ? () => module['default'] : () => module;
    return getter;
};
```

这里的问题是：swc/babel 编译的 CJS 模块设置了 `__esModule: true`（表示"我是从 ESM 编译来的"），但并不一定有 `exports.default`（只有原始 ESM 有 `export default` 时才有）。`__webpack_require__.n` 只根据 `__esModule` 标志判断，没有检查 `.default` 是否真的存在。

## 复现步骤

```bash
pnpm install
pnpm build

# 当前源码使用 Pattern 1 (named import)
pnpm test:esm   # ❌ SyntaxError: does not provide an export named 'MY_SYMBOL'
pnpm test:cjs   # ✅ Works

# 修改 src/index.ts 切换到 Pattern 2 (default import)
pnpm build
pnpm test:esm   # ✅ Works
pnpm test:cjs   # ❌ TypeError: Cannot read properties of undefined
```

编辑 `src/index.ts`，取消注释不同的 Pattern 来验证每种写法。

## CJS 模块代码 (fake-cjs-lib/index.js)

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

## 在 Node.js 中验证 cjs-module-lexer 的行为

```bash
# 证明 Node.js ESM 无法识别动态导出
node --input-type=module -e "
import * as lib from 'fake-cjs-lib';
console.log('namespace keys:', Object.keys(lib));
// → ['__esModule', 'default', 'module.exports']
// MY_SYMBOL 和 helperFn 不在 namespace 上！

console.log('lib.MY_SYMBOL:', lib.MY_SYMBOL);          // undefined
console.log('lib.default.MY_SYMBOL:', lib.default.MY_SYMBOL);  // Symbol(...)
"
```

## 根因总结

两个独立的问题碰在一起，形成了死局：

1. **Node.js cjs-module-lexer 的局限**：无法识别 `_export(exports, {...})` 模式，导致 ESM 运行时只能通过 `.default` 访问 CJS 导出

2. **rspack `__webpack_require__.n` 的假设过强**：看到 `__esModule: true` 就无条件取 `.default`，不处理 `.default` 不存在的情况。应该 fallback 到整个 module 对象：

```js
// 当前（有问题的）:
var getter = module.__esModule ? () => module['default'] : () => module;

// 建议修复:
var getter = module.__esModule
  ? () => (module['default'] !== undefined ? module['default'] : module)
  : () => module;
```

## Workaround

使用运行时 helper 做两边兼容：

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

这个 helper 能被 rspack 保留在产物中（因为是运行时函数调用，无法被静态优化），从而在 ESM 和 CJS 两种环境下都正确解析属性。

## 环境

- Node.js: v24.12.0
- rslib: 0.22.0
- rspack: (rslib 内置)
- pnpm: 10.x
- OS: macOS

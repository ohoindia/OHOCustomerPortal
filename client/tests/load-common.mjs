import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Load the actual shared TypeScript with Node; inject only platform globals.
export function loadModule(path, globals = {}) {
  const cache = new Map();
  function load(url) {
    if (cache.has(url.href)) return cache.get(url.href);
    const exports = {};
    cache.set(url.href, exports);
    const { outputText } = ts.transpileModule(readFileSync(url, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    });
    vm.runInNewContext(outputText, {
      exports,
      Date,
      ...globals,
      require: (specifier) => load(new URL(`${specifier}.ts`, url)),
    });
    return exports;
  }
  return load(new URL(path, import.meta.url));
}

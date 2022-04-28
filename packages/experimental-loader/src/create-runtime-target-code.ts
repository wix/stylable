import type { StylableExports } from '@stylable/core/dist/index-internal';

export function createRuntimeTargetCode(namespace: string, mapping: StylableExports) {
    return `
  var rt = require("@stylable/runtime/dist/css-runtime-stylesheet.js");

  module.exports = rt.create(
      ${JSON.stringify(namespace)},
      ${JSON.stringify(mapping)},
      "",
      -1,
      module.id
  );
  `;
}

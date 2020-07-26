import { StylableExports } from '@stylable/core';

export function createRuntimeTargetCode(namespace: string, mapping: StylableExports) {
    return `
  var rt = require("@stylable/runtime/cjs/css-runtime-stylesheet.js");

  module.exports = rt.create(
      ${JSON.stringify(namespace)},
      ${JSON.stringify(mapping)},
      "",
      -1,
      module.id,
  );
  `;
}

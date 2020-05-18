import { loader } from 'webpack';

function evalStylableExtractModule(source: string): [string, object] {
    if (!source) {
        throw new Error('No source is provided to evalModule');
    }
    const _module = {
        exports: {},
    };
    const fn = new Function(
        'module',
        'exports',
        'require',
        source.replace('export default ', 'module.exports = ')
    );
    fn(_module, _module.exports);
    return _module.exports as [string, object];
}

const stylableRuntimeLoader: loader.Loader = function loader(content) {
    if (typeof content !== 'string') {
        throw new Error('content is not string');
    }

    const [namespace, mapping] = evalStylableExtractModule(content);

    return `
  const rt = require("@stylable/runtime/cjs/css-runtime-stylesheet.js");

  module.exports = rt.create(
      ${JSON.stringify(namespace)},
      ${JSON.stringify(mapping)},
      "",
      -1,
      module.id,
  );
  `;
};
export default stylableRuntimeLoader;

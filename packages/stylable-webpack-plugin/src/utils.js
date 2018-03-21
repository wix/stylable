const isUrl = require("url-regex")({ exact: true, strict: true });
const { parseValues, stringifyValues } = require("css-selector-tokenizer");

function replaceUrls(ast, replaceFn) {
  ast.walkDecls(decl => {
    const ast = parseValues(decl.value);
    ast.nodes.forEach(function(node) {
      node.nodes.forEach(node => processNode(node, replaceFn));
    });
    decl.value = stringifyValues(ast);
  });
}

function processNode(node, replaceFn) {
  switch (node.type) {
    case "value":
      node.nodes.forEach(_ => processNode(_, replaceFn));
      break;
    case "nested-item":
      node.nodes.forEach(_ => processNode(_, replaceFn));
      break;
    case "url":
      var url = node.url;
      if (isUrl.test(url) || url === "") {
      } else {
        replaceFn(node);
      }
      break;
  }
}

function isImportedByNonStylable(module) {
  return module.reasons.some(({ module }) => module && module.type !== "stylable");
}

function getCSSDepthAndDeps(module, cssDependencies = [], path = []) {
  if (path.includes(module) || !module) {
    return { depth: 0, cssDependencies };
  }
  const { resource, dependencies, reasons, type } = module;
  const isCSS = type === "stylable";

  // const indent = path.map(_ => "\t").join("");
  // if (isCSS) {
  //     console.log(indent + resource)
  // }

  // +1 for CSS
  const selfDepth = isCSS ? 1 : 0;
  let jsDepth = 0;
  let cssDepth = 0;

  // max(CSS deep)
  if (dependencies) {
    const stylableModulesDepth = dependencies.map(dep => dep.module).map(_ => {
      if (path.includes(_)) {
        return 0;
      }
      const isCSSDep = _ && _.type === "stylable";
      const innerDeps = isCSSDep ? [] : cssDependencies;
      if (isCSSDep) {
        cssDependencies.push(_);
      }
      return getCSSDepthAndDeps(_, innerDeps, path.concat(module)).depth;
    });
    cssDepth = stylableModulesDepth.length
      ? Math.max(...stylableModulesDepth)
      : 0;
  }

  // Component depth
  if (reasons && isCSS) {
    const name = resource.replace(/\.st\.css$/, "");
    const views = reasons
      .filter(({ module: _module }) => {
        return _module && _module.type !== "stylable" && _module.resource && _module.resource.indexOf(name) !== -1;
      })
      .map(({ module }) => module);
    
    if (new Set(views).size > 1) {
      throw new Error(`only one file with the name ${name} allowed`);
    }

    if (views[0]) {
      jsDepth = getCSSDepthAndDeps(
        views[0],
        cssDependencies,
        path.concat(module)
      ).depth;
    }
  }

  // if (isCSS) {
  //     console.log(`${indent}${resource} depth: (${selfDepth + Math.max(cssDepth, jsDepth)}) <-- ${selfDepth}-${cssDepth}-${jsDepth} cssDependencies: ${cssDependencies.map(_ => _.resource)}`)
  // }

  return { depth: selfDepth + Math.max(cssDepth, jsDepth), cssDependencies };
}

module.exports.replaceUrls = replaceUrls;
module.exports.isImportedByNonStylable = isImportedByNonStylable;
module.exports.getCSSDepthAndDeps = getCSSDepthAndDeps;

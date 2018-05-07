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
  return module.reasons.some(
    ({ module }) => module && module.type !== "stylable"
  );
}

module.exports.replaceUrls = replaceUrls;
module.exports.isImportedByNonStylable = isImportedByNonStylable;

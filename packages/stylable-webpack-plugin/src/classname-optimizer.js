const {
  parseSelector,
  stringifySelector,
  traverseNode
} = require("stylable/dist/src/selector-utils");

class StylableClassNameOptimizer {
  constructor() {
    this.context = {
      names: {}
    };
  }
  rewriteSelector(selector) {
    const ast = parseSelector(selector);
    traverseNode(ast, node => {
      if (node.type === "class") {
        if (!this.context.names[node.name]) {
          this.context.names[node.name] =
            "s" + Object.keys(this.context.names).length;
        }
        node.name = this.context.names[node.name];
      }
    });
    return stringifySelector(ast);
  }
  optimizeAstAndExports(ast, exported) {
    ast.walkRules(rule => {
      rule.selector = this.rewriteSelector(rule.selector, this.context);
      Object.keys(exported).forEach(originName => {
        exported[originName] = exported[originName]
          .split(" ")
          .map(renderedNamed => {
            return this.context.names[renderedNamed] || renderedNamed;
          })
          .join(" ");
      });
    });
  }
}

exports.StylableClassNameOptimizer = StylableClassNameOptimizer;

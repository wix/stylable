const { StylableOptimizer } = require("stylable");
const {
  parseSelector,
  traverseNode
} = require("stylable/dist/src/selector-utils");
const { StylableClassNameOptimizer } = require("./classname-optimizer");
const { StylableNamespaceOptimizer } = require("./namespace-optimizer");

class WebpackStylableOptimizer extends StylableOptimizer {
  constructor(...args) {
    super(...args);
    this.classNameOptimizer = new StylableClassNameOptimizer();
    this.namespaceOptimizer = new StylableNamespaceOptimizer();
  }
  removeUnusedComponents(stylable, meta, usageMapping) {
    const matchNamespace = new RegExp(`(.+)${stylable.delimiter}(.+)`);
    meta.outputAst.walkRules(rule => {
      var outputSelectors = rule.selectors.filter(selector => {
        const selectorAst = parseSelector(selector);
        return !this.isContainsUnusedParts(selectorAst, usageMapping, matchNamespace);
      });
      if (outputSelectors.length) {
        rule.selector = outputSelectors.join();
      } else {
        rule.remove();
      }
    });
  }

  isContainsUnusedParts(selectorAst, usageMapping, matchNamespace) {
    // TODO: !!-!-!! last working point
    let isContainsUnusedParts = false;
    traverseNode(selectorAst, node => {
      if (isContainsUnusedParts) {
        return false;
      }
      if (node.type === "class") {
        const parts = matchNamespace.exec(node.name);
        if (parts) {
          if (usageMapping[parts[1]] === false) {
            isContainsUnusedParts = true;
          }
        }
      } else if (node.type === "nested-pseudo-element") {
        return false;
      }
    });
    return isContainsUnusedParts
  }
}

exports.WebpackStylableOptimizer = WebpackStylableOptimizer;

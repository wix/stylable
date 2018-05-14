class StylableNamespaceOptimizer {
  constructor() {
    this.index = 0;
    this.namespacePrefix = "o";
    this.namespaceMapping = {};
  }
  getNamespace(meta, compiler, plugin) {
    return (
      this.namespaceMapping[meta.source] ||
      (this.namespaceMapping[meta.source] = this.namespacePrefix + this.index++)
    );
  }
}

exports.StylableNamespaceOptimizer = StylableNamespaceOptimizer;

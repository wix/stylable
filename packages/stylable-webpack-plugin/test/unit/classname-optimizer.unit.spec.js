const { expect } = require("chai");
const { parse } = require("postcss");
const { StylableClassNameOptimizer } = require("../../src/classname-optimizer");

describe("StylableClassNameOptimizer  Unit", () => {
  it("should give unique names to classes and rewrite exports", () => {
    const optimizer = new StylableClassNameOptimizer();
    const ast = parse(
      `.namespace--classname{} .namespace--thing{} .namespace--composed{}`
    );
    const exports = {
      classname: "namespace--classname",
      thing: "namespace--thing",
      composed: "namespace--composed namespace--classname"
    };

    optimizer.optimizeAstAndExports(ast, exports);
    expect(exports, "exports rewrite").to.eql({
      classname: "s0",
      thing: "s1",
      composed: "s2 s0"
    });
    expect(ast.toString(), "ast optimized").to.equal(".s0{} .s1{} .s2{}");
  });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var generate_test_util_1 = require("../utils/generate-test-util");
describe('Stylable postcss transform (Global)', function () {
    it('should support :global()', function () {
        var result = generate_test_util_1.generateStylableRoot({
            entry: "/a/b/style.st.css",
            files: {
                '/a/b/style.st.css': {
                    namespace: 'style',
                    content: "\n                        .root :global(.btn) {}\n                        :global(.btn) {}\n                        :global(.btn) .container {}\n                    "
                }
            }
        });
        chai_1.expect(result.nodes[0].selector).to.equal('.style--root .btn');
        chai_1.expect(result.nodes[1].selector).to.equal('.btn');
        chai_1.expect(result.nodes[2].selector).to.equal('.btn .style--container');
    });
});
//# sourceMappingURL=global.spec.js.map
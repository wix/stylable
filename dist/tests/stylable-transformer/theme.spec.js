"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
// import * as postcss from "postcss";
var generate_test_util_1 = require("../utils/generate-test-util");
describe('Theme', function () {
    it('should compose import root into root class', function () {
        var cssExports = generate_test_util_1.generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-theme: true;\n                            -st-from: \"./theme.st.css\";\n                        }\n                    "
                },
                '/theme.st.css': {
                    namespace: 'theme',
                    content: ""
                }
            }
        });
        chai_1.expect(cssExports).to.eql({
            root: 'entry--root theme--root'
        });
    });
    it('should compose import root into root class (multi level)', function () {
        var cssExports = generate_test_util_1.generateStylableExports({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: "\n                        :import {\n                            -st-theme: true;\n                            -st-from: \"./theme.st.css\";\n                        }\n                    "
                },
                '/theme.st.css': {
                    namespace: 'theme',
                    content: "\n                        :import {\n                            -st-theme: true;\n                            -st-from: \"./inner-theme.st.css\";\n                        }\n                    "
                },
                '/inner-theme.st.css': {
                    namespace: 'inner-theme',
                    content: ""
                }
            }
        });
        chai_1.expect(cssExports).to.eql({
            root: 'entry--root theme--root inner-theme--root'
        });
    });
});
//# sourceMappingURL=theme.spec.js.map
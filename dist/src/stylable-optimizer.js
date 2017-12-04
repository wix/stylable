"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function removeSTDirective(root) {
    var toRemove = [];
    root.walkRules(function (rule) {
        if (rule.nodes && rule.nodes.length === 0) {
            toRemove.push(rule);
            return;
        }
        rule.walkDecls(function (decl) {
            if (decl.prop.startsWith('-st-')) {
                toRemove.push(decl);
            }
        });
    });
    toRemove.forEach(function (node) {
        removeRecursiveIfEmpty(node);
    });
}
exports.removeSTDirective = removeSTDirective;
function removeRecursiveIfEmpty(node) {
    var parent = node.parent;
    node.remove();
    if (parent && parent.nodes && parent.nodes.length === 0) {
        removeRecursiveIfEmpty(parent);
    }
}
//# sourceMappingURL=stylable-optimizer.js.map
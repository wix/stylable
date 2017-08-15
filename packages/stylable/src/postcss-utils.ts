import * as postcss from 'postcss';
import { SRule } from "./postcss-process";
import { parseSelector, stringifySelector } from "./selector-utils";
import { valueMapping } from "./stylable-value-parsers";
const cloneDeep = require('lodash.clonedeep');

export function isValidDeclaration(decl: postcss.Declaration) {
    return typeof decl.value === 'string';
}

export function mergeRules(mixinRoot: postcss.Root, rule: SRule) {
    mixinRoot.walkRules((mixinRule: SRule) => {

        const ruleSelectorAst = parseSelector(rule.selector);
        const mixinSelectorAst = parseSelector(mixinRule.selector);

        var nodes: any[] = [];
        mixinSelectorAst.nodes.forEach((mixinSelector) => {

            ruleSelectorAst.nodes.forEach((ruleSelector) => {
                const m: any[] = cloneDeep(mixinSelector.nodes);
                const first = m[0];

                if (first && first.type === 'invalid' && first.value === '&') {
                    m.splice(0, 1);
                } else if (first && first.type !== 'spacing') {
                    m.unshift({
                        type: 'spacing',
                        value: ' '
                    })
                }

                nodes.push({
                    type: 'selector',
                    before: ruleSelector.before || mixinSelector.before,
                    nodes: cloneDeep(ruleSelector.nodes, true).concat(m)
                })
            });

        });

        ruleSelectorAst.nodes = nodes;

        mixinRule.selector = stringifySelector(ruleSelectorAst);
        mixinRule.selectorAst = ruleSelectorAst;
    });

    if (mixinRoot.nodes) {
        let nextRule = rule;
        mixinRoot.nodes.slice().forEach((node: SRule | postcss.Declaration) => {
            if (node.type === 'decl') {
                if (isValidDeclaration(node)) {
                    rule.insertBefore(rule.mixinEntry, node);
                } else {
                    //TODO: warn invalid mixin value
                }
            } else if (node.type === 'rule') {
                if (rule.parent.last === nextRule) {
                    rule.parent.append(node);
                } else {
                    rule.parent.insertAfter(nextRule, node);
                }
                const toRemove: postcss.Declaration[] = [];
                rule.walkDecls((decl) => {
                    if (!isValidDeclaration(decl)) {
                        toRemove.push(decl);
                        //TODO: warn invalid mixin value
                    }
                })
                toRemove.forEach((decl) => decl.remove());
                nextRule = node;
            }
            //TODO: warn on @media or not?
        });
        rule.walkDecls(new RegExp(valueMapping.mixin), (node) => node.remove());
    }
}

export function createClassSubsetRoot(root: postcss.Root, selectorPrefix: string) {
    const mixinRoot = postcss.root();
    let addRootDecls = true;
    root.nodes!.forEach((node: SRule) => {
        if (node.type === "rule") {
            if (node.selector.startsWith(selectorPrefix)) {
                if (addRootDecls && node.selectorType === 'class') {
                    addRootDecls = false;
                    node.walkDecls((decl) => {
                        mixinRoot.append(decl.clone());
                    });
                } else {
                    //TODO: handle complex selectors with , 
                    const clone: SRule = node.clone({
                        selector: node.selector.replace(selectorPrefix, '&')
                    });
                    //TODO: maybe delete
                    // delete clone.selectorAst;
                    mixinRoot.append(clone);
                }
            }
        }
    });
    return mixinRoot;
}
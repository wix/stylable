import { isAbsolute } from 'path';
import * as postcss from 'postcss';
import { createDiagnosticReporter, Diagnostics } from './diagnostics';
import type { ImportSymbol, StylableSymbol } from './features';
import { isChildOfAtRule, stMixinMarker, isStMixinMarker } from './helpers/rule';
import { scopeNestedSelector, parseSelectorWithCache } from './helpers/selector';

export function isValidDeclaration(decl: postcss.Declaration) {
    return typeof decl.value === 'string';
}

export const utilDiagnostics = {
    INVALID_MERGE_OF: createDiagnosticReporter(
        '14001',
        'error',
        (mergeValue: string) => `invalid merge of: \n"${mergeValue}"`
    ),
    INVALID_RECURSIVE_MIXIN: createDiagnosticReporter(
        '10010',
        'error',
        () => `invalid recursive mixin`
    ),
};

// ToDo: move to helpers/mixin
export function mergeRules(
    mixinAst: postcss.Root,
    rule: postcss.Rule,
    mixinDecl: postcss.Declaration,
    report: Diagnostics,
    useNestingAsAnchor: boolean
) {
    let mixinRoot: postcss.Rule | null | 'NoRoot' = null;
    const nestedInKeyframes = isChildOfAtRule(rule, `keyframes`);
    const anchorSelector = useNestingAsAnchor ? '&' : '[' + stMixinMarker + ']';
    const anchorNodeCheck = useNestingAsAnchor ? undefined : isStMixinMarker;
    mixinAst.walkRules((mixinRule: postcss.Rule) => {
        if (isChildOfAtRule(mixinRule, 'keyframes')) {
            return;
        }
        if (mixinRule.selector === anchorSelector && !mixinRoot) {
            if (mixinRule.parent === mixinAst) {
                mixinRoot = mixinRule;
            } else {
                const { selector } = scopeNestedSelector(
                    parseSelectorWithCache(rule.selector),
                    parseSelectorWithCache(mixinRule.selector),
                    false,
                    anchorNodeCheck
                );
                mixinRoot = 'NoRoot';
                mixinRule.selector = selector;
            }
        } else if (!isChildOfMixinRoot(mixinRule, mixinRoot)) {
            // scope to mixin target if not already scoped by parent
            const { selector } = scopeNestedSelector(
                parseSelectorWithCache(rule.selector),
                parseSelectorWithCache(mixinRule.selector),
                false,
                anchorNodeCheck
            );
            mixinRule.selector = selector;
        } else if (mixinRule.selector.includes(anchorSelector)) {
            // report invalid nested mixin
            mixinRule.selector = mixinRule.selector.split(anchorSelector).join('&');
            report?.report(utilDiagnostics.INVALID_RECURSIVE_MIXIN(), {
                node: rule,
            });
        }
    });

    if (mixinAst.nodes) {
        let nextRule: postcss.Rule | postcss.AtRule = rule;
        // TODO: handle rules before and after decl on entry
        const inlineMixin = !hasNonDeclsBeforeDecl(mixinDecl);
        const mixInto = inlineMixin ? rule : postcss.rule({ selector: '&' });
        const mixIntoRule = (node: postcss.AnyNode) => {
            // mix node into rule
            if (inlineMixin) {
                mixInto.insertBefore(mixinDecl, node);
            } else {
                // indent first level - doesn't change deep nested
                node.raws.before = (node.raws.before || '') + '    ';
                mixInto.append(node);
            }
            // mark following decls for nesting
            if (!nestFollowingDecls && node.type !== 'decl' && hasAnyDeclsAfter(mixinDecl)) {
                nestFollowingDecls = true;
            }
        };
        let nestFollowingDecls = false;
        mixinAst.nodes.slice().forEach((node) => {
            if (node === mixinRoot) {
                for (const nested of [...node.nodes]) {
                    mixIntoRule(nested);
                }
            } else if (node.type === 'decl') {
                // stand alone decl - most likely from js mixin
                mixIntoRule(node);
            } else if (node.type === 'rule' || node.type === 'atrule') {
                const valid = !nestedInKeyframes;
                if (valid) {
                    if (rule.parent!.last === nextRule) {
                        rule.parent!.append(node);
                    } else {
                        rule.parent!.insertAfter(nextRule, node);
                    }
                    nextRule = node;
                } else {
                    report?.report(utilDiagnostics.INVALID_MERGE_OF(node.toString()), {
                        node: rule,
                    });
                }
            }
        });
        // add nested mixin to rule body
        if (mixInto !== rule && mixInto.nodes.length) {
            mixinDecl.before(mixInto);
        }
        // nest following decls if needed
        if (nestFollowingDecls) {
            const nestFollowingDecls = postcss.rule({ selector: '&' });
            while (mixinDecl.next()) {
                const nextNode = mixinDecl.next()!;
                nextNode.raws.before = (nextNode.raws.before || '') + '    ';
                nestFollowingDecls.append(nextNode);
            }
            mixinDecl.after(nestFollowingDecls);
        }
    }

    return rule;
}

function hasNonDeclsBeforeDecl(decl: postcss.Declaration) {
    let current: postcss.AnyNode | undefined = decl.prev();
    while (current) {
        if (current.type !== 'decl' && current.type !== 'comment') {
            return true;
        }
        current = current.prev();
    }
    return false;
}
function hasAnyDeclsAfter(decl: postcss.Declaration) {
    let current: postcss.AnyNode | undefined = decl.next();
    while (current) {
        if (current.type === 'decl') {
            return true;
        }
        current = current.prev();
    }
    return false;
}

const isChildOfMixinRoot = (rule: postcss.Rule, mixinRoot: postcss.Rule | null | 'NoRoot') => {
    let current: postcss.Container | postcss.Document | undefined = rule.parent;
    while (current) {
        if (current === mixinRoot) {
            return true;
        }
        current = current.parent;
    }
    return false;
};

export const sourcePathDiagnostics = {
    MISSING_SOURCE_FILENAME: createDiagnosticReporter(
        '17001',
        'error',
        () => 'missing source filename'
    ),
};

export function getSourcePath(root: postcss.Root, diagnostics: Diagnostics) {
    const source = (root.source && root.source.input.file) || '';
    if (!source) {
        diagnostics.report(sourcePathDiagnostics.MISSING_SOURCE_FILENAME(), {
            node: root,
        });
    } else if (!isAbsolute(source)) {
        throw new Error('source filename is not absolute path: "' + source + '"');
    }
    return source;
}

export function getAlias(symbol: StylableSymbol): ImportSymbol | undefined {
    if (symbol._kind === 'class' || symbol._kind === 'element') {
        if (!symbol[`-st-extends`]) {
            return symbol.alias;
        }
    }

    return undefined;
}

import { createFeature, FeatureContext } from './feature';
import { deprecatedStFunctions } from '../custom-values';
import { generalDiagnostics } from './diagnostics';
import * as STSymbol from './st-symbol';
import type { StylableMeta } from '../stylable-meta';
import { isChildOfAtRule } from '../helpers/rule';
import { walkSelector } from '../helpers/selector';
import type { ImmutablePseudoClass, PseudoClass } from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';
import { processDeclarationFunctions } from '../process-declaration-functions';
//

export interface VarSymbol {
    _kind: 'var';
    name: string;
    value: string;
    text: string;
    valueType: string | null;
    node: postcss.Node;
}

export const diagnostics = {
    FORBIDDEN_DEF_IN_COMPLEX_SELECTOR: generalDiagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR,
    NO_VARS_DEF_IN_ST_SCOPE() {
        return `cannot define ":vars" inside of "@st-scope"`;
    },
    DEPRECATED_ST_FUNCTION_NAME: (name: string, alternativeName: string) => {
        return `"${name}" is deprecated, use "${alternativeName}"`;
    },
};

// HOOKS

export const hooks = createFeature<{
    SELECTOR: PseudoClass;
    IMMUTABLE_SELECTOR: ImmutablePseudoClass;
}>({
    analyzeSelectorNode({ context, node, rule }) {
        if (node.type !== `pseudo_class` || node.value !== `vars`) {
            return;
        }
        // make sure `:vars` is the only selector
        if (rule.selector === `:vars`) {
            if (isChildOfAtRule(rule, `st-scope`)) {
                context.diagnostics.warn(rule, diagnostics.NO_VARS_DEF_IN_ST_SCOPE());
            } else {
                collectVarSymbols(context, rule);
            }
            rule.remove();
            // stop further walk into `:vars {}`
            return walkSelector.stopAll;
        } else {
            context.diagnostics.warn(rule, diagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(`:vars`));
        }
        return;
    },
});

function collectVarSymbols(context: FeatureContext, rule: postcss.Rule) {
    rule.walkDecls((decl) => {
        collectUrls(context.meta, decl); // ToDo: remove
        warnOnDeprecatedCustomValues(context, decl);

        // check type annotation
        let type = null;
        const prev = decl.prev() as postcss.Comment;
        if (prev && prev.type === 'comment') {
            const typeMatch = prev.text.match(/^@type (.+)$/);
            if (typeMatch) {
                type = typeMatch[1];
            }
        }
        // add symbol
        const name = decl.prop;
        STSymbol.addSymbol({
            context,
            symbol: {
                _kind: 'var',
                name,
                value: '',
                text: decl.value,
                node: decl,
                valueType: type,
            },
            node: decl,
        });
        // deprecated
        context.meta.vars.push(STSymbol.get(context.meta, name, `var`)!);
    });
}

function warnOnDeprecatedCustomValues(context: FeatureContext, decl: postcss.Declaration) {
    processDeclarationFunctions(
        decl,
        (node) => {
            if (node.type === 'nested-item' && deprecatedStFunctions[node.name]) {
                const { alternativeName } = deprecatedStFunctions[node.name];
                context.diagnostics.info(
                    decl,
                    diagnostics.DEPRECATED_ST_FUNCTION_NAME(node.name, alternativeName),
                    { word: node.name }
                );
            }
        },
        false
    );
}

// ToDo: remove after moving :vars removal to end of analyze.
// url collection should pickup vars value during general decls walk
function collectUrls(meta: StylableMeta, decl: postcss.Declaration) {
    processDeclarationFunctions(
        decl,
        (node) => {
            if (node.type === 'url') {
                meta.urls.push(node.url);
            }
        },
        false
    );
}

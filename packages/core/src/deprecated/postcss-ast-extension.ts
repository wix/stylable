import { setFieldForDeprecation } from '../helpers/deprecation';
import type { RefedMixin } from '../stylable-meta';
import type { SelectorAstNode } from './deprecated-selector-utils';
import { Rule, Declaration } from 'postcss';

/**
 * mark extended fields as deprecated.
 * `valueOnThis` is used because postcss.clone copies own properties.
 */
const pleaseUse = `getStylableAstData(rule) instead`;
setFieldForDeprecation(Rule.prototype, `selectorAst`, {
    objectType: `SRule`,
    valueOnThis: true,
});
setFieldForDeprecation(Rule.prototype, `isSimpleSelector`, {
    objectType: `SRule`,
    valueOnThis: true,
});
setFieldForDeprecation(Rule.prototype, `selectorType`, {
    objectType: `SRule`,
    valueOnThis: true,
});
setFieldForDeprecation(Rule.prototype, `mixins`, {
    objectType: `SRule`,
    valueOnThis: true,
    pleaseUse,
});
setFieldForDeprecation(Rule.prototype, `stScopeSelector`, {
    objectType: `SRule`,
    valueOnThis: true,
    pleaseUse,
});

setFieldForDeprecation(Declaration.prototype, `stylable`, {
    objectType: `SDecl`,
    valueOnThis: true,
    // pleaseUse, // not sure we will support an alternative without a real use case found
});

/**
 * extended types
 */

export interface SRule extends Rule {
    selectorAst: SelectorAstNode;
    isSimpleSelector: boolean;
    selectorType: 'class' | 'element' | 'complex';
    mixins?: RefedMixin[];
    stScopeSelector?: string;
}

export interface DeclStylableProps {
    sourceValue: string;
}

export interface SDecl extends Declaration {
    stylable: DeclStylableProps;
}

/**
 * helpers?
 */

export function getDeclStylable(decl: SDecl): DeclStylableProps {
    if (decl.stylable) {
        return decl.stylable;
    } else {
        decl.stylable = decl.stylable ? decl.stylable : { sourceValue: '' };
        return decl.stylable;
    }
}

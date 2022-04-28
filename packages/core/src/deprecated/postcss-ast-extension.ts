import { setFieldForDeprecation } from '../helpers/deprecation';
import { Rule } from 'postcss';

/**
 * mark extended fields as deprecated.
 * `valueOnThis` is used because postcss.clone copies own properties.
 */
setFieldForDeprecation(Rule.prototype, `stScopeSelector`, {
    objectType: `SRule`,
    valueOnThis: true,
    pleaseUse: `getRuleScopeSelector(rule)`,
});

/**
 * extended types
 */
/**@deprecated*/
export interface SRule extends Rule {
    stScopeSelector?: string;
}

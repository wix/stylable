import type { ClassSymbol, ElementSymbol } from '../stylable-meta';
import type { CSSResolve } from '../stylable-resolver';
import { valueMapping } from '../stylable-value-parsers';

export function getOriginDefinition(resolved: Array<CSSResolve<ClassSymbol | ElementSymbol>>) {
    for (const r of resolved) {
        const { symbol } = r;
        if (symbol._kind === 'class' || symbol._kind === 'element') {
            if (symbol.alias && !symbol[valueMapping.extends]) {
                continue;
            } else {
                return r;
            }
        }
    }
    return resolved[0];
}
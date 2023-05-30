import type { ClassSymbol, ElementSymbol, STPart } from '../features';
import type { CSSResolve } from '../stylable-resolver';

export function getOriginDefinition<T extends ClassSymbol | ElementSymbol | STPart.PartSymbol>(
    resolved: CSSResolve<T>[]
) {
    for (const r of resolved) {
        const { symbol } = r;
        if (symbol._kind === 'class' || symbol._kind === 'element') {
            if (symbol.alias && !symbol[`-st-extends`]) {
                continue;
            } else {
                return r;
            }
        }
    }
    return resolved[0];
}

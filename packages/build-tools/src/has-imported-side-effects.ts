import { Imported, Stylable, StylableMeta } from '@stylable/core';

export function hasImportedSideEffects(stylable: Stylable, meta: StylableMeta, imported: Imported) {
    //keyframes
    if (Object.keys(imported.keyframes).length) {
        return true;
    }

    //compose usage
    for (const localSymbol of Object.values(meta.classes)) {
        if (
            localSymbol['-st-extends'] &&
            localSymbol['-st-extends']._kind === 'import' &&
            localSymbol['-st-extends'].import.request === imported.request
        ) {
            const cssResolved = stylable.resolver.resolveSymbolOrigin(
                localSymbol['-st-extends'],
                meta
            );
            if (
                cssResolved?.symbol &&
                cssResolved.symbol._kind === 'class' &&
                cssResolved.meta.root !== cssResolved.symbol.name
            ) {
                return true;
            }
        }
    }

    return false;
}

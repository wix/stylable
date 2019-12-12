import { StylableMeta } from '@stylable/core';
import { StylableModule } from './types';

export function isImportedByNonStylable(module: { reasons: Array<{ module: { type: string } }> }) {
    return module.reasons.some(({ module }) => module && module.type !== 'stylable');
}

export function isUsedAsComposeViaExtends(stylableMeta: StylableMeta, from: string) {
    return Object.values(stylableMeta.classes).some(classSymbol => {
        if (
            !classSymbol['-st-root'] &&
            classSymbol['-st-extends'] &&
            classSymbol['-st-extends']._kind === 'import'
        ) {
            return from === classSymbol['-st-extends'].import.from;
        } else {
            return false;
        }
    });
}

export function isUsedAsCompose(parentModule: {
    request: string;
    reasons: Array<{ module: StylableModule }>;
}) {
    return parentModule.reasons.some(({ module }) => {
        if (module && module.type === 'stylable') {
            return isUsedAsComposeViaExtends(module.buildInfo.stylableMeta, parentModule.request);
        } else {
            return false;
        }
    });
}

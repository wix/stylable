import type webpack from 'webpack';
import type { StylableModule } from './types';

export function isImportedByNonStylable(module: { reasons: Array<{ module: { type: string } }> }) {
    return module.reasons.some(({ module }) => module && module.type !== 'stylable');
}

export function rewriteUrl(node: any, replacementIndex: number) {
    node.stringType = '';
    delete node.innerSpacingBefore;
    delete node.innerSpacingAfter;
    node.url = `__css_asset_placeholder__${replacementIndex}__`;
}

export function isStylableModule(module: webpack.compilation.Module): module is StylableModule {
    return module.type === 'stylable';
}

export function isImportedByNonStylable(module: { reasons: Array<{ module: {type: string} }>}) {
    return module.reasons.some(({ module }) => module && module.type !== 'stylable');
}

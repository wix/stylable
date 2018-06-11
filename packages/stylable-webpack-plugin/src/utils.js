module.exports.isImportedByNonStylable = function isImportedByNonStylable(module) {
    return module.reasons.some(({ module }) => module && module.type !== 'stylable');
};

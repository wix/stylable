export const rootValueMapping = {
    vars: ':vars' as const,
    import: ':import' as const,
    stScope: 'st-scope' as const,
    namespace: 'namespace' as const,
};

export const valueMapping = {
    from: '-st-from' as const,
    named: '-st-named' as const,
    default: '-st-default' as const,
    root: '-st-root' as const,
    states: '-st-states' as const,
    extends: '-st-extends' as const,
    mixin: '-st-mixin' as const, // ToDo: change to STMixin.MixinType.ALL,
    partialMixin: '-st-partial-mixin' as const, // ToDo: change to STMixin.MixinType.PARTIAL,
    global: '-st-global' as const,
};

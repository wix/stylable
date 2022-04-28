/**@deprecated use string instead*/
export const rootValueMapping = {
    vars: ':vars' as const,
    import: ':import' as const,
    stScope: 'st-scope' as const,
    namespace: 'namespace' as const,
};
/**@deprecated use string instead*/
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

/**@deprecated */
export type stKeys = keyof typeof valueMapping;

/**@deprecated */
export const stValues: string[] = Object.keys(valueMapping).map(
    (key) => valueMapping[key as stKeys]
);

/**@deprecated */
export const stValuesMap: Record<string, boolean> = Object.keys(valueMapping).reduce((acc, key) => {
    acc[valueMapping[key as stKeys]] = true;
    return acc;
}, {} as Record<string, boolean>);

/**@deprecated */
export const STYLABLE_NAMED_MATCHER = new RegExp(`^${valueMapping.named}-(.+)`);

/**@deprecated */
export const mixinDeclRegExp = new RegExp(`(${valueMapping.mixin})|(${valueMapping.partialMixin})`);

/**@deprecated */
export const animationPropRegExp = /animation$|animation-name$/;

/**@deprecated */
export const STYLABLE_VALUE_MATCHER = /^-st-/;

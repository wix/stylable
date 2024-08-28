type FunctionConfig<T> = Pick<
    {
        [K in keyof T]: T[K] extends (...args: any[]) => infer R ? () => R : never;
    },
    {
        [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
    }[keyof T]
>;

export function wrapAndCatchErrors<T extends Record<string, any>>(
    config: Partial<FunctionConfig<T>>,
    context: new (...args: any[]) => T,
) {
    const proto = context.prototype;
    for (const [name, defaultReturn] of Object.entries(config)) {
        const func = proto[name];
        if (typeof func !== 'function') {
            console.error(
                `expected to find a function named ${name} on context, but found ${typeof func}`,
            );
            continue;
        }
        proto[name as keyof T] = function (this: T, ...args: unknown[]) {
            try {
                return func.apply(this, args) || (defaultReturn as () => unknown)();
            } catch (e) {
                const errorContent = e instanceof Error ? e.stack : e;
                console.error(`\nUnexpected error in ${name}\n`);
                console.log(`${errorContent}\n\n`);
                return;
            }
        } as T[typeof name];
    }
}

import type { LoaderContext } from 'webpack';

export function addBuildInfo(ctx: LoaderContext<any>, namespace: string) {
    try {
        ctx._module!.buildInfo.stylableNamespace = namespace;
    } catch (error) {
        ctx.emitWarning(
            new Error(
                `Failed to add stylableNamespace buildInfo for: ${ctx.resourcePath} because ${(error as Error).message}`
            )
        );
    }
}

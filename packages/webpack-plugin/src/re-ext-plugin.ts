import type { Resolver } from 'webpack';
import type { ResolveRequest } from 'enhanced-resolve';

export class ReExt {
    private newExt: string[];
    constructor(private matchExtRegExp: RegExp, newExt: string | string[]) {
        this.newExt = Array.isArray(newExt) ? newExt : [newExt];
    }
    apply(resolver: Resolver) {
        const target = resolver.ensureHook('normal-resolve');
        resolver.getHook('raw-resolve').tapAsync('ReExt', (request, resolveContext, callback) => {
            const requestPath = request.request;
            const matchExtRegExp = this.matchExtRegExp;
            if (!requestPath || !requestPath.match(matchExtRegExp)) {
                return callback();
            }

            async function runMatchExt(newExt: string[]) {
                for (const ext of newExt) {
                    const resolved = await resolveExt(ext);
                    if (resolved) return resolved;
                }
                return undefined;
            }

            runMatchExt(this.newExt)
                .then((res) => {
                    res ? callback(null, res as ResolveRequest) : callback();
                })
                .catch((err) => {
                    callback(err);
                });

            function resolveExt(newExt: string) {
                return new Promise((res) => {
                    resolver.doResolve(
                        target,
                        {
                            ...request,

                            request: requestPath!.replace(matchExtRegExp, newExt),
                            fullySpecified: true,
                        },
                        `replacing extension for ${requestPath} to ${newExt}`,
                        resolveContext,
                        (err: Error, resolved: unknown) => {
                            err ? res(undefined) : res(resolved);
                        }
                    );
                });
            }
        });
    }
}

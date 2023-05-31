import type { Resolver } from 'webpack';
import type { ResolveRequest } from 'enhanced-resolve';

export class ReExt {
    private newExt: string[];
    constructor(private matchExtRegExp: RegExp, newExt: string | string[]) {
        this.newExt = Array.isArray(newExt) ? newExt : [newExt];
    }
    apply(resolver: Resolver) {
        const target = resolver.ensureHook('file');
        resolver.getHook('raw-file').tapAsync('ReExt', (request, resolveContext, callback) => {
            const relativeFilePath = request.relativePath;
            const requestedPath = request.path;
            const matchExtRegExp = this.matchExtRegExp;
            if (!requestedPath || !relativeFilePath || !relativeFilePath.match(matchExtRegExp)) {
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
                            path: (requestedPath as string).replace(matchExtRegExp, newExt),
                            relativePath: relativeFilePath!.replace(matchExtRegExp, newExt),
                        },
                        `replacing extension for ${relativeFilePath} to ${newExt}`,
                        resolveContext,
                        (err, resolved) => {
                            err ? res(undefined) : res(resolved);
                        }
                    );
                });
            }
        });
    }
}

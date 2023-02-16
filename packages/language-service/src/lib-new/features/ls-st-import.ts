import type * as postcss from 'postcss';
import { Completion, range, Snippet } from '../../lib/completion-types';
import type { LangServiceContext } from '../lang-service-context';
import path from 'path';
export function getCompletions(context: LangServiceContext): Completion[] {
    const completions: Completion[] = [];
    const { node } = context.location.base;
    if (node.type === 'atrule' && node.name === 'st-import') {
        completions.push(...getStImportCompletions(context, node));
    }
    return completions;
}
function getStImportCompletions(context: LangServiceContext, _importNode: postcss.AtRule) {
    const completions: Completion[] = [];
    if (context.location.atRuleParams) {
        const { node, offsetInNode } = context.location.atRuleParams;
        if (!Array.isArray(node) && node.type === '<string>') {
            // ToDo: check context better - should come after "from" ?
            const pathBeforeCaret = node.value.slice(1, offsetInNode);
            const originFilePath = context.meta.source;
            addSpecifierCompletions({
                completions,
                context,
                originFilePath,
                pathBeforeCaret,
            });
        }
    }
    return completions;
}
function addSpecifierCompletions({
    completions,
    context,
    originFilePath,
    pathBeforeCaret,
}: {
    completions: Completion[];
    context: LangServiceContext;
    originFilePath: string;
    pathBeforeCaret: string;
}) {
    const originDirPath = path.dirname(originFilePath);
    let specifier = pathBeforeCaret;
    // attempt to get mapped specifier
    try {
        specifier = context.stylable.resolver.resolvePath(originDirPath, specifier);
    } catch (e) {
        /*continue with original specifier*/
    }

    if (specifier.startsWith('.') || context.fs.isAbsolute(specifier)) {
        // relative completions
        addPathRelativeCompletions({
            completions,
            context,
            contextDirPath: originDirPath,
            originFilePath,
            specifierPath: specifier,
        });
    } else {
        // package internal completions
        const packages = getNodeModules({ context, originDirPath });
        const [packageName, internalPath] = parsePackageSpecifier(specifier);
        if (internalPath !== undefined) {
            let packageJsonPath = context.fs.join(packageName, 'package.json');
            try {
                packageJsonPath = context.stylable.resolver.resolvePath(
                    originDirPath,
                    packageJsonPath
                );
            } catch (e) {
                /**/
            }
            const packageJsonStat = context.fs.statSync(packageJsonPath, {
                throwIfNoEntry: false,
            });
            if (packageJsonStat) {
                const packageJson = context.fs.readJsonFileSync(packageJsonPath)!;
                if (!isValidPackageJson(packageJson)) {
                    return;
                }
                if ('exports' in packageJson) {
                    // ToDo: deal with exports
                } else {
                    // const packagePath = context.fs.dirname(packageJsonPath);
                    addPathRelativeCompletions({
                        completions,
                        context,
                        contextDirPath: context.fs.dirname(packageJsonPath),
                        originFilePath,
                        specifierPath: internalPath || './',
                    });
                }
            }
        } else {
            // package names completions
            const allowFullCompletions = pathBeforeCaret === '';
            for (const packageName of packages) {
                let deltaStart = 0;
                if (packageName.startsWith(pathBeforeCaret)) {
                    deltaStart = -pathBeforeCaret.length;
                } else if (!allowFullCompletions) {
                    continue;
                }
                const label = packageName;
                const detail = '';
                const snippet = new Snippet(label);
                completions.push(
                    new Completion(
                        label,
                        detail,
                        'a',
                        snippet,
                        range(context.getPosition(), { deltaStart })
                    )
                );
            }
        }
    }
}
// naive check for an actual object
function isValidPackageJson(obj: any): obj is JSON {
    return !!obj && !Array.isArray(obj) && typeof obj === 'object';
}
function getNodeModules({
    context: { fs },
    originDirPath,
}: {
    context: LangServiceContext;
    originDirPath: string;
}) {
    const packages = new Set<string>();
    let dirPath = originDirPath;
    let searching = true;
    while (searching) {
        // search packages
        const nodeModulesPath = fs.join(dirPath, 'node_modules');
        const stat = fs.statSync(nodeModulesPath, { throwIfNoEntry: false });
        if (stat) {
            const items = fs.readdirSync(nodeModulesPath, { withFileTypes: true });
            for (const item of items) {
                if (item.isDirectory()) {
                    if (item.name[0] === '@') {
                        const scopedItems = fs.readdirSync(fs.join(nodeModulesPath, item.name), {
                            withFileTypes: true,
                        });
                        for (const scopedItem of scopedItems) {
                            if (scopedItem.isDirectory()) {
                                packages.add(item.name + '/' + scopedItem.name);
                            }
                        }
                    } else {
                        packages.add(item.name);
                    }
                }
            }
        }
        if (dirPath === '/') {
            searching = false;
        } else {
            // search up
            dirPath = fs.join(dirPath, '..');
        }
    }
    return packages;
}
function addPathRelativeCompletions({
    completions,
    context,
    contextDirPath,
    originFilePath,
    specifierPath,
}: {
    completions: Completion[];
    context: LangServiceContext;
    contextDirPath: string;
    originFilePath: string;
    specifierPath: string;
}) {
    const targetPath = context.fs.resolve(contextDirPath, specifierPath);
    const { dir, name } = specifierPath.endsWith('/')
        ? { dir: targetPath, name: '' }
        : context.fs.parse(targetPath);
    addDirRelativeCompletions({
        completions,
        context,
        targetPath: dir,
        originFilePath,
        startWith: name,
    });
    if (dir !== targetPath) {
        addDirRelativeCompletions({
            completions,
            context,
            targetPath,
            originFilePath,
            prefix: specifierPath.endsWith('/') ? '' : '/',
        });
    }
}
function addDirRelativeCompletions({
    completions,
    context,
    targetPath,
    originFilePath,
    startWith = '',
    prefix = '',
}: {
    completions: Completion[];
    context: LangServiceContext;
    targetPath: string;
    originFilePath: string;
    startWith?: string;
    prefix?: string;
}) {
    const stat = context.fs.statSync(targetPath, { throwIfNoEntry: false });
    if (stat?.isDirectory()) {
        const files = context.fs.readdirSync(targetPath, { withFileTypes: true });
        for (const item of files) {
            const itemPath = context.fs.join(targetPath, item.name);
            if (itemPath === originFilePath) {
                continue;
            }
            let deltaStart = 0;
            if (item.name.startsWith(startWith)) {
                deltaStart = -(startWith.length + prefix.length);
            } else {
                continue;
            }
            const directorySlash = item.isDirectory() ? '/' : '';
            const label = prefix + item.name + directorySlash;
            const detail = '';
            const snippet = new Snippet(label);
            completions.push(
                new Completion(
                    label,
                    detail,
                    'a',
                    snippet,
                    range(context.getPosition(), { deltaStart })
                )
            );
        }
    }
}
/**
 * @example parsePackageSpecifier('react-dom') === ['react-dom']
 * @example parsePackageSpecifier('react-dom/client') === ['react-dom', 'client']
 * @example parsePackageSpecifier('@stylable/core') === ['@stylable/core']
 * @example parsePackageSpecifier('@stylable/core/dist/some-file') === ['@stylable/core', 'dist/some-file']
 */
export function parsePackageSpecifier(
    specifier: string
): readonly [packageName: string, pathInPackage?: string] {
    const firstSlashIdx = specifier.indexOf('/');
    if (firstSlashIdx === -1) {
        return [specifier];
    }
    const isScopedPackage = specifier.startsWith('@');
    if (isScopedPackage) {
        const secondSlashIdx = specifier.indexOf('/', firstSlashIdx + 1);
        return secondSlashIdx === -1 ? [specifier] : splitAtIdx(specifier, secondSlashIdx);
    } else {
        return splitAtIdx(specifier, firstSlashIdx);
    }
}
/** @example splitAtIdx('abcde', 2) === ['ab', 'de'] */
function splitAtIdx(value: string, idx: number) {
    return [value.slice(0, idx), value.slice(idx + 1)] as const;
}

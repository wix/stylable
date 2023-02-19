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
            if (!packages[packageName]) {
                // package not found: bailout
                return;
            }
            const packageJsonPath = context.fs.join(packages[packageName], 'package.json');
            const packageJsonStat = context.fs.statSync(packageJsonPath, {
                throwIfNoEntry: false,
            });
            if (packageJsonStat) {
                const packageJson = context.fs.readJsonFileSync(packageJsonPath)!;
                if (!isObject(packageJson)) {
                    // issue with package.json: bailout
                    return;
                }
                if ('exports' in packageJson && isObject(packageJson['exports'])) {
                    // according to exports field
                    addPackageExportsCompletions({
                        completions,
                        context,
                        packagePath: packages[packageName],
                        exportsField: packageJson['exports'],
                        internalPath,
                    });
                } else {
                    // relative from package
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
            for (const packageName of Object.keys(packages)) {
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
function isObject(obj: any): obj is JSON {
    return !!obj && !Array.isArray(obj) && typeof obj === 'object';
}
function getNodeModules({
    context: { fs },
    originDirPath,
}: {
    context: LangServiceContext;
    originDirPath: string;
}) {
    const packages: Record<string, string> = {};
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
                    const packagePath = fs.join(nodeModulesPath, item.name);
                    if (item.name[0] === '@') {
                        const scopedItems = fs.readdirSync(packagePath, {
                            withFileTypes: true,
                        });
                        for (const scopedItem of scopedItems) {
                            const scopedPackageName = item.name + '/' + scopedItem.name;
                            if (scopedItem.isDirectory() && !packages[scopedPackageName]) {
                                packages[scopedPackageName] = fs.join(packagePath, scopedItem.name);
                            }
                        }
                    } else if (!packages[item.name]) {
                        packages[item.name] = packagePath;
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
    originFilePath?: string;
    specifierPath: string;
}) {
    const targetPath = specifierPath
        ? context.fs.resolve(contextDirPath, specifierPath)
        : contextDirPath;
    const { dir, name } = targetPath.endsWith('/')
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
    originFilePath?: string;
    startWith?: string;
    prefix?: string;
}) {
    const stat = context.fs.statSync(targetPath, { throwIfNoEntry: false });
    if (stat?.isDirectory()) {
        const files = context.fs.readdirSync(targetPath, { withFileTypes: true });
        for (const item of files) {
            const itemPath = context.fs.join(targetPath, item.name);
            if (originFilePath && itemPath === originFilePath) {
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
function addPackageExportsCompletions({
    completions,
    context,
    packagePath,
    exportsField,
    internalPath,
}: {
    completions: Completion[];
    context: LangServiceContext;
    packagePath: string;
    exportsField: JSON;
    internalPath: string;
}) {
    // ToDo: handle type check
    const exportsRules = exportsField; // ToDo: handle conditional
    for (const [from, to] of Object.entries(exportsRules)) {
        if (!from.startsWith('./') || from.length < 3) {
            continue;
        }
        const internalFrom = from.slice(2);
        let deltaStart = 0;
        if (internalFrom.startsWith(internalPath)) {
            deltaStart = internalPath.length;
        } else {
            continue;
        }
        const fromWildCardIndex = internalFrom.indexOf('*');
        if (fromWildCardIndex !== -1) {
            if (typeof to !== 'string') {
                // ignore null and unsupported values
                continue;
            }
            // wildcard mapping
            const toWildCardIndex = to.indexOf('*');
            // validate
            if (
                internalFrom.lastIndexOf('*') !== fromWildCardIndex ||
                (toWildCardIndex !== -1 && to.lastIndexOf('*') !== toWildCardIndex)
            ) {
                // mapping not valid: bailout
                continue; // ToDo: test
            }
            if (deltaStart < fromWildCardIndex) {
                // from path completion
                const label = internalFrom.slice(0, fromWildCardIndex);
                const detail = '';
                const snippet = new Snippet(label);
                completions.push(
                    new Completion(
                        label,
                        detail,
                        'a',
                        snippet,
                        range(context.getPosition(), { deltaStart: -deltaStart })
                    )
                );
            } else {
                // internal path completions
                const wildCardInput = internalPath.slice(deltaStart);
                const toBasePath = to.slice(0, toWildCardIndex);
                // const fromAfterWildCard = internalFrom.slice(fromWildCardIndex);
                // const toAfterWildCard = to.slice(toWildCardIndex+1);
                addPathRelativeCompletions({
                    completions,
                    context,
                    contextDirPath:
                        context.fs.resolve(packagePath, toBasePath) +
                        (toBasePath.endsWith('/') ? '/' : ''),
                    specifierPath: wildCardInput,
                });
            }
        } else if (to !== null) {
            // explicit single mapping
            const label = internalFrom;
            const detail = '';
            const snippet = new Snippet(label);
            completions.push(
                new Completion(
                    label,
                    detail,
                    'a',
                    snippet,
                    range(context.getPosition(), { deltaStart: -deltaStart })
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

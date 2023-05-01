import type * as postcss from 'postcss';
import type { StylableSymbol } from '@stylable/core';
import { Completion, namedCompletion, range, Snippet } from '../../lib/completion-types';
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
            // specifier completions
            // ToDo: check context better - should come after "from" ?
            const pathBeforeCaret = node.value.slice(1, offsetInNode);
            const originFilePath = context.meta.source;
            const originDirPath = path.dirname(originFilePath);
            // add specifier completions
            addSpecifierCompletions({
                completions,
                context,
                originFilePath,
                originDirPath,
                pathBeforeCaret,
            });
            /* 
                Attempt to get mapped specifier for things like Typescript paths or Webpack alias.
                This is a best effort to get mapped paths completions and relies on the provided resolver 
                to provide path resolving to partial paths and not throw.
                This type of mapping should be done with package.json imports field.
            */
            try {
                const resolvedPath = context.stylable.resolver.resolvePath(
                    originDirPath,
                    pathBeforeCaret
                );
                if (resolvedPath !== pathBeforeCaret) {
                    addSpecifierCompletions({
                        completions,
                        context,
                        originFilePath,
                        originDirPath,
                        pathBeforeCaret: resolvedPath,
                    });
                }
            } catch (e) {
                // mapping failed - cannot get mapped completions
            }
        } else {
            // named imports
            // get specifier module
            const importFrom = getSpecifierModule(context);
            if (!importFrom?.value) {
                return completions;
            }
            //
            const result = analyzeNamedImports(context);
            if (!result) {
                return completions;
            }
            const { importType, existingNames, nameBeforeCaret } = result;
            if (importFrom.kind === 'css') {
                // CSS import completions
                const symbols =
                    importType === 'top'
                        ? importFrom.value.getAllSymbols()
                        : {
                              /* ToDo: handle typed imports */
                          };
                addNamedImportCompletion({
                    context,
                    completions,
                    importFrom,
                    availableImports: symbols,
                    existingNames,
                    nameBeforeCaret,
                    normalizePath: false,
                    resolveOrigin(symbol) {
                        const originResolve = context.stylable.resolver.deepResolve(symbol) || {
                            _kind: 'css',
                            meta: importFrom.value,
                            symbol,
                        };
                        if (originResolve._kind !== 'css') {
                            return;
                        }
                        return createNamedCompletionDetail(originResolve.symbol);
                    },
                });
            } else {
                // JS import completions
                addNamedImportCompletion({
                    context,
                    completions,
                    importFrom,
                    availableImports: importFrom.value,
                    existingNames,
                    nameBeforeCaret,
                    normalizePath: true,
                    resolveOrigin(symbol) {
                        const originResolve = context.stylable.resolver.deepResolve(symbol) || {
                            _kind: 'css',
                            meta: importFrom.value,
                            symbol,
                        };
                        if (originResolve._kind !== 'css') {
                            return;
                        }
                        return createNamedCompletionDetail(originResolve.symbol);
                    },
                });
            }
        }
    }
    return completions;
}
function addNamedImportCompletion({
    context,
    completions,
    importFrom,
    availableImports,
    existingNames,
    nameBeforeCaret,
    normalizePath,
    resolveOrigin,
}: {
    context: LangServiceContext;
    completions: Completion[];
    importFrom: NonNullable<ReturnType<typeof getSpecifierModule>>;
    availableImports: Record<string, any>;
    existingNames: Set<string>;
    nameBeforeCaret: string;
    normalizePath: boolean;
    resolveOrigin?: (symbol: StylableSymbol) => string | undefined;
}) {
    for (const [name, value] of Object.entries(availableImports)) {
        if (existingNames.has(name)) {
            continue;
        }
        let deltaStart = 0;
        if (name.startsWith(nameBeforeCaret)) {
            deltaStart = -nameBeforeCaret.length;
        } else {
            continue;
        }
        const originNameOrValue = resolveOrigin?.(value);
        let relativePath = path
            .relative(context.meta.source, importFrom.resolvedPath || '')
            .slice(1);
        if (normalizePath) {
            relativePath = path.normalize(relativePath);
        }
        relativePath = relativePath.replace(/\\/g, '/');
        completions.push(
            namedCompletion(
                name,
                range(context.getPosition(), { deltaStart }),
                relativePath,
                originNameOrValue
            )
        );
    }
}
function createNamedCompletionDetail(symbol: StylableSymbol) {
    switch (symbol._kind) {
        case 'class':
            return 'Stylable class';
        case 'cssVar':
            return `${symbol.global ? 'Global ' : ''}${symbol.name}`;
        case 'var':
            return symbol.text;
        case 'element':
            return 'Stylable element';
    }
    return undefined;
}
function getSpecifierModule(context: LangServiceContext) {
    const paramsAst = context.location.atRuleParams!.ast;
    let specifier = '';
    for (let i = paramsAst.length - 1; i >= 0; --i) {
        if (paramsAst[i].type === '<string>') {
            specifier = paramsAst[i].value.slice(1, -1);
            break;
        }
    }
    if (!specifier) {
        return;
    }
    let importModule;
    try {
        // ToDo: check invalidation
        importModule = context.stylable.resolver.getModule({
            context: path.dirname(context.meta.source),
            request: specifier,
        });
    } catch {
        return;
    }
    return importModule;
}
function analyzeNamedImports(context: LangServiceContext) {
    const result: { importType: string; existingNames: Set<string>; nameBeforeCaret: string } = {
        importType: 'unknown',
        existingNames: new Set(),
        nameBeforeCaret: '',
    };
    const { ast, node, parents } = context.location.atRuleParams!;
    if (Array.isArray(node)) {
        return;
    }
    const nodeIndex = ast.indexOf(node);
    let blockStartIndex = -1;
    for (let i = nodeIndex; i >= 0; i--) {
        const currentNode = ast[i];
        if (currentNode && currentNode.type === 'literal' && currentNode.value === '[') {
            blockStartIndex = i;
            break;
        }
    }
    if (blockStartIndex === -1) {
        return;
    }
    if (parents.length === 1) {
        // top level imports
        result.importType = 'top';
        // get block end index
        let blockEndIndex = nodeIndex;
        for (let i = nodeIndex + 1; i <= ast.length - 1; i++) {
            const currentNode = ast[i];
            if (currentNode && currentNode.type === 'literal' && currentNode.value === ']') {
                blockEndIndex = i;
                break;
            }
        }
        // collect names
        const atRuleParamLocation = context.location.atRuleParams!;
        let readyForImport = true;
        for (let i = blockStartIndex + 1; i < blockEndIndex; ++i) {
            const currentNode = ast[i];
            if (
                readyForImport &&
                (currentNode.type === '<custom-ident>' || currentNode.type === '<dashed-ident>')
            ) {
                if (currentNode === atRuleParamLocation.node) {
                    result.nameBeforeCaret = currentNode.value.slice(
                        0,
                        atRuleParamLocation.offsetInNode
                    );
                } else {
                    result.existingNames.add(currentNode.value);
                    readyForImport = false;
                }
            } else if (currentNode.type === 'literal' && currentNode.value === ',') {
                readyForImport = true;
            }
        }
    } else if (parents.length === 2) {
        // typed import
    }
    return result;
}

function addSpecifierCompletions({
    completions,
    context,
    originFilePath,
    originDirPath,
    pathBeforeCaret,
}: {
    completions: Completion[];
    context: LangServiceContext;
    originFilePath: string;
    originDirPath: string;
    pathBeforeCaret: string;
}) {
    const specifier = pathBeforeCaret;
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
                            // use posix for specifier
                            const scopedPackageName = fs.posix.join(item.name, scopedItem.name);
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
        if (fs.dirname(dirPath) === dirPath) {
            // top level: bailout
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
    if (specifierPath.match(/(^\.+$)|(\/\.+$)/)) {
        // filter out specifier that only contains dots or ends with slash and dots
        return;
    }
    const isSpecifierEmpty = !specifierPath;
    const targetPath = isSpecifierEmpty
        ? contextDirPath
        : context.fs.resolve(contextDirPath, specifierPath);
    const isExplicitDirectory = isSpecifierEmpty
        ? contextDirPath.endsWith(context.fs.sep)
        : specifierPath.endsWith('/') || specifierPath.endsWith(context.fs.sep);
    const { dir, name } = isExplicitDirectory
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
                    range(context.getPosition(), { deltaStart }),
                    !!directorySlash // trigger completion
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
    if (!isObject(exportsField)) {
        return;
    }
    const exportsRules = getExportsRules(exportsField);
    for (const [from, to] of Object.entries(exportsRules)) {
        if (!from.startsWith('./') || from.length < 3) {
            continue;
        }
        const internalFrom = from.slice(2);
        const fromWildCardIndex = internalFrom.indexOf('*');
        let deltaStart = 0;
        const isCurrentPathIncludedInFrom =
            fromWildCardIndex !== -1 && internalPath.length > internalFrom.length - 1
                ? internalPath.startsWith(internalFrom.slice(0, internalFrom.length - 2))
                : internalFrom.startsWith(internalPath);
        if (isCurrentPathIncludedInFrom) {
            deltaStart = internalPath.length;
        } else {
            continue;
        }

        if (fromWildCardIndex !== -1) {
            const resultTo = getExportsRules(to);
            if (typeof resultTo !== 'string') {
                // bailout
                continue;
            }
            // wildcard mapping
            const toWildCardIndex = resultTo.indexOf('*');
            // validate
            if (
                internalFrom.lastIndexOf('*') !== fromWildCardIndex ||
                (toWildCardIndex !== -1 && resultTo.lastIndexOf('*') !== toWildCardIndex)
            ) {
                // mapping not valid: bailout
                continue;
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
                        range(context.getPosition(), { deltaStart: -deltaStart }),
                        true // trigger completion
                    )
                );
            } else {
                // internal path completions
                const wildCardInput = internalPath.slice(fromWildCardIndex, deltaStart);
                const toBasePath = resultTo.slice(0, toWildCardIndex);
                // const fromAfterWildCard = internalFrom.slice(fromWildCardIndex);
                // const toAfterWildCard = to.slice(toWildCardIndex+1);
                addPathRelativeCompletions({
                    completions,
                    context,
                    contextDirPath:
                        context.fs.resolve(packagePath, toBasePath) +
                        (toBasePath.endsWith('/') ? context.fs.sep : ''),
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
const knownConditionals = new Set(['node', 'import', 'require', 'default', 'browser']);
function getExportsRules(exportsField: any): any {
    if (!isObject(exportsField)) {
        return exportsField;
    }
    for (const [key, value] of Object.entries(exportsField)) {
        if (key.startsWith('.')) {
            // not nested - return rules
            return exportsField;
        } else if (knownConditionals.has(key)) {
            // check nested conditions
            return getExportsRules(value);
        }
    }
    return {};
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

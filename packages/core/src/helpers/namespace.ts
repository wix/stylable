import { murmurhash3_32_gc } from '../murmurhash';

export const namespaceDelimiter = '__';
export function namespace(name: string, namespace: string) {
    return namespace ? namespace + namespaceDelimiter + name : name;
}

export interface PackageInfo {
    name: string;
    version: string;
    dirPath: string;
}

export interface NamespaceBuilderParams {
    hashSalt: string;
    prefix: string;
    namespace: string;
    paths: {
        file: string;
        origin: string;
    };
    packageInfo: PackageInfo;
}

export interface NamespaceBuilder {
    (options: NamespaceBuilderParams):
        | {
              namespace: string;
              hashPart: string;
          }
        | undefined
        | null;
}

export interface CreateNamespaceOptions {
    prefix?: string;
    hashSalt?: string;
    hashFragment?: 'full' | 'minimal' | number;
    buildNamespace?: NamespaceBuilder;
    getPackageInfo?: (filePath: string) => PackageInfo;
    handleNoMatch?: (
        strict: boolean,
        namespace: string,
        filePath: string,
        usedBy?: string
    ) => string;
    hashSeparator?: string;
    strict?: boolean;
    hashFn?: (i: string) => string | number;
    normalizePath: (dirPath: string, filePath: string) => string;
}

function defaultGetPackageInfo() {
    return {
        name: '',
        version: '0.0.0',
        dirPath: '',
    };
}

export function defaultNamespaceBuilder({
    prefix,
    namespace,
    hashSalt,
    paths,
    packageInfo,
}: NamespaceBuilderParams) {
    return {
        namespace: prefix + namespace,
        hashPart: hashSalt + packageInfo.name + '@' + packageInfo.version + '/' + paths.origin,
    };
}

export function defaultNoMatchHandler(
    strict: boolean,
    ns: string,
    stylesheetPath: string,
    usedBy?: string
): string {
    throw new Error(
        `Could not create namespace for:\n${stylesheetPath}\nthe last valid namespace tried was ${JSON.stringify(
            ns
        )}${usedBy ? ` that was used by:\n${usedBy}\n` : strict ? ' ' : ''}${
            strict ? 'running on strict mode' : ''
        }`
    );
}

export function createNamespaceStrategy(options: CreateNamespaceOptions) {
    const {
        prefix = '',
        hashSalt = '',
        hashFragment = 'minimal',
        buildNamespace = defaultNamespaceBuilder,
        getPackageInfo = defaultGetPackageInfo,
        handleNoMatch = defaultNoMatchHandler,
        hashSeparator = '-',
        strict = false,
        hashFn = murmurhash3_32_gc,
        normalizePath,
    } = options;

    const usedNamespaces = new Map<string, string>();

    return (
        namespace: string,
        stylesheetOriginPath: string,
        stylesheetPath: string = stylesheetOriginPath
    ) => {
        const packageInfo = getPackageInfo(stylesheetPath);
        const buildNamespaceParams = {
            prefix,
            hashSalt,
            namespace,
            paths: {
                file: packageInfo.dirPath
                    ? normalizePath(packageInfo.dirPath, stylesheetPath)
                    : stylesheetPath,
                origin: packageInfo.dirPath
                    ? normalizePath(packageInfo.dirPath, stylesheetOriginPath)
                    : stylesheetOriginPath,
            },
            packageInfo,
        };
        const { namespace: resultNs, hashPart } =
            buildNamespace(buildNamespaceParams) ?? defaultNamespaceBuilder(buildNamespaceParams);

        const hashStr = hashFn(hashPart).toString();

        let i =
            typeof hashFragment === 'number'
                ? hashFragment
                : hashFragment === 'full'
                ? hashStr.length
                : 0;

        let finalNamespace = '';
        while (i <= hashStr.length) {
            const hashSlice = hashStr.slice(0, i);
            finalNamespace = resultNs + (hashSlice ? hashSeparator + hashSlice : '');
            const usedBy = usedNamespaces.get(finalNamespace);
            if (!usedBy) {
                usedNamespaces.set(finalNamespace, stylesheetPath);
                return finalNamespace;
            }
            if (usedBy === stylesheetPath) {
                return finalNamespace;
            } else if (strict) {
                return handleNoMatch(strict, finalNamespace, stylesheetPath, usedBy);
            }
            i++;
        }

        return handleNoMatch(
            strict,
            finalNamespace,
            stylesheetPath,
            usedNamespaces.get(finalNamespace)
        );
    };
}

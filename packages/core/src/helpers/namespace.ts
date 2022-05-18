export function namespace(name: string, namespace: string, delimiter = '__') {
    return namespace ? namespace + delimiter + name : name;
}

export interface PackageInfo {
    name: string;
    version: string;
    dirPath: string;
}

export interface NamespaceBuilderOptions {
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
    (options: NamespaceBuilderOptions): {
        namespace: string;
        hashPart: string;
    };
}

export interface CreateNamespaceOptions {
    prefix?: string;
    hashSalt?: string;
    hashFragment?: 'full' | 'minimal' | number;
    buildNamespace?: NamespaceBuilder;
    getPackageInfo?: (filePath: string) => PackageInfo;
    normalizePath: (dirPath: string, filePath: string) => string;
    hashFn: (i: string) => string | number;
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
}: NamespaceBuilderOptions) {
    return {
        namespace: prefix + namespace,
        hashPart: hashSalt + packageInfo.name + '@' + packageInfo.version + '/' + paths.origin,
    };
}

// function defaultHash(input: string) {
//     //Node12 compatibility - we might want to use base64Url instead
//     return createHash('sha256').update(input).digest('hex');
// }

// function normPath(packageRoot: string, stylesheetPath: string) {
//     return relative(packageRoot, stylesheetPath).replace(/\\/g, '/');
// }

export function createNamespaceStrategy(options: CreateNamespaceOptions) {
    const {
        prefix = '',
        hashSalt = '',
        hashFragment = 'minimal',
        buildNamespace = defaultNamespaceBuilder,
        getPackageInfo = defaultGetPackageInfo,
        hashFn,
        normalizePath,
    } = options;

    const usedNamespaces = new Map<string, string>();

    return (
        namespace: string,
        stylesheetPath: string,
        stylesheetOriginPath: string = stylesheetPath
    ) => {
        const packageInfo = getPackageInfo(stylesheetPath);

        const results = buildNamespace({
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
        });

        const { namespace: resultNs, hashPart } = results;

        const hashStr = hashFn(hashPart).toString();
        let i =
            typeof hashFragment === 'number'
                ? hashFragment
                : hashFragment === 'full'
                ? hashStr.length
                : 0;

        while (i <= hashStr.length) {
            const hashSlice = hashStr.slice(0, i);
            const ns = resultNs + (hashSlice ? '-' + hashSlice : '');
            const used = usedNamespaces.get(ns);
            if (!used) {
                usedNamespaces.set(ns, stylesheetPath);
                return ns;
            }
            if (used === stylesheetPath) {
                return ns;
            }
            i++;
        }
        throw new Error('Could not create namespace for ' + stylesheetPath);
    };
}

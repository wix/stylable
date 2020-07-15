// TODO: Finalize schema for resolveOptions in the ESlist config meta, this code is taken from webpack schema.

export const resolverDefs = {
    Resolve: {
        description: 'Options for the resolver.',
        oneOf: [
            {
                $ref: '#/definitions/ResolveOptions',
            },
        ],
    },
    ResolveOptions: {
        description: 'Options object for resolving requests.',
        type: 'object',
        additionalProperties: false,
        properties: {
            alias: {
                description: 'Redirect module requests.',
                anyOf: [
                    {
                        type: 'array',
                        items: {
                            description: 'Alias configuration.',
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                alias: {
                                    description: 'New request.',
                                    anyOf: [
                                        {
                                            description: 'Multiple alternative requests.',
                                            type: 'array',
                                            items: {
                                                description: 'One choice of request.',
                                                type: 'string',
                                                minLength: 1,
                                            },
                                        },
                                        {
                                            description:
                                                'Ignore request (replace with empty module).',
                                            enum: [false],
                                        },
                                        {
                                            description: 'New request.',
                                            type: 'string',
                                            minLength: 1,
                                        },
                                    ],
                                },
                                name: {
                                    description: 'Request to be redirected.',
                                    type: 'string',
                                },
                                onlyModule: {
                                    description: 'Redirect only exact matching request.',
                                    type: 'boolean',
                                },
                            },
                            required: ['alias', 'name'],
                        },
                    },
                    {
                        type: 'object',
                        additionalProperties: {
                            description: 'New request.',
                            anyOf: [
                                {
                                    description: 'Multiple alternative requests.',
                                    type: 'array',
                                    items: {
                                        description: 'One choice of request.',
                                        type: 'string',
                                        minLength: 1,
                                    },
                                },
                                {
                                    description: 'Ignore request (replace with empty module).',
                                    enum: [false],
                                },
                                {
                                    description: 'New request.',
                                    type: 'string',
                                    minLength: 1,
                                },
                            ],
                        },
                    },
                ],
            },
            aliasFields: {
                description:
                    'Fields in the description file (usually package.json) which are used to redirect requests inside the module.',
                type: 'array',
                items: {
                    description:
                        'Field in the description file (usually package.json) which are used to redirect requests inside the module.',
                    anyOf: [
                        {
                            type: 'array',
                            items: {
                                description:
                                    'Part of the field path in the description file (usually package.json) which are used to redirect requests inside the module.',
                                type: 'string',
                                minLength: 1,
                            },
                        },
                        {
                            type: 'string',
                            minLength: 1,
                        },
                    ],
                },
            },
            byDependency: {
                description:
                    'Extra resolve options per dependency category. Typical categories are "commonjs", "amd", "esm".',
                type: 'object',
                additionalProperties: {
                    description: 'Options object for resolving requests.',
                    oneOf: [
                        {
                            $ref: '#/definitions/ResolveOptions',
                        },
                    ],
                },
            },
            cache: {
                description:
                    'Enable caching of successfully resolved requests (cache entries are revalidated).',
                type: 'boolean',
            },
            cachePredicate: {
                description: 'Predicate function to decide which requests should be cached.',
                instanceof: 'Function',
                tsType: "((request: import('enhanced-resolve').ResolveRequest) => boolean)",
            },
            cacheWithContext: {
                description:
                    'Include the context information in the cache identifier when caching.',
                type: 'boolean',
            },
            conditionNames: {
                description: 'Condition names for exports field entry point.',
                type: 'array',
                items: {
                    description: 'Condition names for exports field entry point.',
                    type: 'string',
                },
            },
            descriptionFiles: {
                description: 'Filenames used to find a description file (like a package.json).',
                type: 'array',
                items: {
                    description: 'Filename used to find a description file (like a package.json).',
                    type: 'string',
                    minLength: 1,
                },
            },
            enforceExtension: {
                description: 'Enforce using one of the extensions from the extensions option.',
                type: 'boolean',
            },
            exportsFields: {
                description:
                    'Field names from the description file (usually package.json) which are used to provide entry points of a package.',
                type: 'array',
                items: {
                    description:
                        'Field name from the description file (usually package.json) which is used to provide entry points of a package.',
                    type: 'string',
                },
            },
            extensions: {
                description: 'Extensions added to the request when trying to find the file.',
                type: 'array',
                items: {
                    description: 'Extension added to the request when trying to find the file.',
                    type: 'string',
                    minLength: 1,
                },
            },
            fileSystem: {
                description: 'Filesystem for the resolver.',
                tsType: "(import('../lib/util/fs').InputFileSystem)",
            },
            mainFields: {
                description:
                    'Field names from the description file (package.json) which are used to find the default entry point.',
                type: 'array',
                items: {
                    description:
                        'Field name from the description file (package.json) which are used to find the default entry point.',
                    anyOf: [
                        {
                            type: 'array',
                            items: {
                                description:
                                    'Part of the field path from the description file (package.json) which are used to find the default entry point.',
                                type: 'string',
                                minLength: 1,
                            },
                        },
                        {
                            type: 'string',
                            minLength: 1,
                        },
                    ],
                },
            },
            mainFiles: {
                description:
                    'Filenames used to find the default entry point if there is no description file or main field.',
                type: 'array',
                items: {
                    description:
                        'Filename used to find the default entry point if there is no description file or main field.',
                    type: 'string',
                    minLength: 1,
                },
            },
            modules: {
                description: 'Folder names or directory paths where to find modules.',
                type: 'array',
                items: {
                    description: 'Folder name or directory path where to find modules.',
                    type: 'string',
                    minLength: 1,
                },
            },
            plugins: {
                description: 'Plugins for the resolver.',
                type: 'array',
                items: {
                    description: 'Plugin of type object or instanceof Function.',
                    oneOf: [
                        {
                            $ref: '#/definitions/ResolvePluginInstance',
                        },
                    ],
                },
            },
            resolver: {
                description: 'Custom resolver.',
                tsType: "(import('enhanced-resolve').Resolver)",
            },
            restrictions: {
                description: 'A list of resolve restrictions.',
                type: 'array',
                items: {
                    description: 'Resolve restriction.',
                    anyOf: [
                        {
                            instanceof: 'RegExp',
                            tsType: 'RegExp',
                        },
                        {
                            type: 'string',
                        },
                    ],
                },
            },
            symlinks: {
                description: 'Enable resolving symlinks to the original location.',
                type: 'boolean',
            },
            unsafeCache: {
                description:
                    'Enable caching of successfully resolved requests (cache entries are not revalidated).',
                anyOf: [
                    {
                        type: 'boolean',
                    },
                    {
                        type: 'object',
                        additionalProperties: true,
                    },
                ],
            },
            useSyncFileSystemCalls: {
                description: 'Use synchronous filesystem calls for the resolver.',
                type: 'boolean',
            },
        },
    },
    ResolvePluginInstance: {
        description: 'Plugin instance.',
        type: 'object',
        additionalProperties: true,
        properties: {
            apply: {
                description: 'The run point of the plugin, required method.',
                instanceof: 'Function',
                tsType: "(resolver: import('enhanced-resolve/lib/Resolver')) => void",
            },
        },
        required: ['apply'],
    },
};

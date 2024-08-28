import { nodeFs as fs } from '@file-services/node';
import path from 'path';
import { Stylable, StylableMeta, createDefaultResolver } from '@stylable/core';
import safeParser from 'postcss-safe-parser';
import {
    ESLintUtils,
    AST_NODE_TYPES,
    ASTUtils,
    TSESTree as esTree,
} from '@typescript-eslint/utils';
import { DefinitionType } from '@typescript-eslint/scope-manager';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const { isIdentifier } = ASTUtils;

const createRule = ESLintUtils.RuleCreator((ruleName) => {
    return `${ruleName}`; // TODO: create documentation site links
});

type Options = [{ exposeDiagnosticsReports: boolean; resolveOptions: {} }];

export default createRule({
    name: 'unknown-locals',
    defaultOptions: [{ exposeDiagnosticsReports: false, resolveOptions: {} }], // TODO: allow to pass resolve config
    create(context, options) {
        const [{ exposeDiagnosticsReports, resolveOptions }] = options as Options;
        const moduleResolver = createDefaultResolver({ fs, ...resolveOptions });

        const stylable = new Stylable({
            fileSystem: fs,
            projectRoot: process.cwd(),
            resolveModule: moduleResolver,
            requireModule: createRequire(pathToFileURL(process.cwd())),
            cssParser: safeParser,
        });

        function reportDiagnostics(meta: StylableMeta, node: esTree.ImportDeclaration) {
            if (meta.transformDiagnostics?.reports.length || meta.diagnostics?.reports.length) {
                context.report({
                    messageId: 'diagnostics',
                    node,
                    data: {
                        diagnostics: meta.diagnostics.reports
                            .concat(meta.transformDiagnostics?.reports ?? [])
                            .map((report) => report.message)
                            .join('\n'),
                    },
                });
            }
        }

        return {
            ImportDeclaration(node) {
                const importRequest = getStylableRequest(node);
                if (!importRequest) {
                    return;
                }
                const fileName = context.getFilename();
                const dirName = path.dirname(fileName);
                const fullPath = moduleResolver(dirName, importRequest);
                const meta = stylable.analyze(fullPath);
                const { exports } = stylable.transform(meta);

                if (exposeDiagnosticsReports) {
                    reportDiagnostics(meta, node);
                }

                const namedImports = node.specifiers.filter(
                    (sp) => sp.type === AST_NODE_TYPES.ImportSpecifier,
                );

                namedImports.forEach(({ imported, local }) => {
                    const exportName = imported.name as keyof typeof exports;

                    if (exportName in exports) {
                        const variable = context.getScope().variables.find((varDefs) => {
                            if (varDefs.defs.length === 0) {
                                return;
                            }
                            const { type } = varDefs.defs[varDefs.defs.length - 1];
                            return (
                                local.name === varDefs.name && type === DefinitionType.ImportBinding
                            );
                        });

                        if (!variable) {
                            return;
                        }

                        variable.references.forEach((ref) => {
                            const parent = ref.identifier.parent;
                            if (!parent || parent.type !== AST_NODE_TYPES.MemberExpression) {
                                return;
                            }

                            const accessor = getMemberAccessor(parent.property, parent.computed);

                            if (accessor !== undefined && !exports[exportName][accessor]) {
                                context.report({
                                    messageId: 'unknown-local',
                                    node: parent.property,
                                    data: {
                                        exportName,
                                        partName: JSON.stringify(accessor),
                                        request: importRequest,
                                    },
                                });
                            }
                        });
                    }
                });
            },
        };
    },
    meta: {
        type: 'problem',
        messages: {
            'unknown-local':
                'unknown local {{exportName}} {{partName}} used from stylesheet {{request}}',
            diagnostics: '{{diagnostics}}',
        },
        schema: [
            {
                id: 'options',
                type: 'object',
                properties: {
                    exposeDiagnosticsReports: { type: 'boolean' },
                    resolveOptions: { type: 'object' }, // TODO: add the webpack defs
                },
            },
        ],
        docs: {
            description: '',
        },
    },
});

function getStylableRequest(importStatement: esTree.ImportDeclaration) {
    const importRequest = importStatement.source.value?.toString();
    if (importRequest?.endsWith('.st.css')) {
        return importRequest;
    }
    return;
}

function getMemberAccessor(
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    property: esTree.PrivateIdentifier | esTree.Expression,
    isComputed: boolean,
) {
    if (isIdentifier(property) && !isComputed) {
        return property.name;
    } else if (property.type === AST_NODE_TYPES.Literal && typeof property.value === 'string') {
        return property.value;
    }
    return;
}

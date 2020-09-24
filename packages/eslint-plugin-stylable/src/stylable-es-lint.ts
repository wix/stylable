import fs from 'fs';
import path from 'path';
import { Stylable, createDefaultResolver, StylableExports, StylableMeta } from '@stylable/core';
import {
    ESLintUtils,
    AST_NODE_TYPES,
    ASTUtils,
    TSESTree as esTree,
} from '@typescript-eslint/experimental-utils';

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
        const moduleResolver = createDefaultResolver(fs, resolveOptions);

        const stylable = Stylable.create({
            fileSystem: fs,
            projectRoot: process.cwd(),
            resolveModule: moduleResolver,
            requireModule: require,
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
                const meta = stylable.process(fullPath, dirName);
                const { exports } = stylable.transform(meta);

                if (exposeDiagnosticsReports) {
                    reportDiagnostics(meta, node);
                }

                const namedImports = node.specifiers.filter(
                    (sp) => sp.type === AST_NODE_TYPES.ImportSpecifier
                ) as esTree.ImportSpecifier[];

                namedImports.forEach(({ imported, local }) => {
                    const exportName = imported.name as keyof StylableExports;

                    if (exportName in exports) {
                        const variable = context.getScope().variables.find((varDefs) => {
                            if (varDefs.defs.length === 0) {
                                return;
                            }
                            const { type } = varDefs.defs[varDefs.defs.length - 1];
                            return local.name === varDefs.name && type === 'ImportBinding';
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
            category: 'Possible Errors',
            description: '',
            recommended: 'error',
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

function getMemberAccessor(property: esTree.Expression, isComputed: boolean) {
    if (isIdentifier(property) && !isComputed) {
        return property.name;
    } else if (property.type === AST_NODE_TYPES.Literal && typeof property.value === 'string') {
        return property.value;
    }
    return;
}

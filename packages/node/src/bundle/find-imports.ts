import ts from 'typescript';
const {
    SyntaxKind: { ImportKeyword },
    isCallExpression,
    isStringLiteral,
    isImportDeclaration,
    isExportDeclaration,
    createSourceFile,
} = ts;

export function parseCode(filePath: string, sourceText: string): ts.SourceFile {
    return createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest);
}

export interface ITextRange {
    start: number;
    end: number;
    text: string;
    dynamic: boolean;
}

export function findImportRanges(sourceFile: ts.SourceFile, allowRequire = false): ITextRange[] {
    const importRanges: ITextRange[] = [];
    const dynamicImportsFinder = (node: ts.Node) => {
        const isCall = isCallExpression(node);
        if (isCall && node.expression.kind === ImportKeyword) {
            const [callArgument] = node.arguments;
            if (isStringLiteral(callArgument)) {
                importRanges.push(stringLiteralToTextRange(callArgument, sourceFile, true));
            }
        } else if (
            allowRequire &&
            isCall &&
            isRequireIdentifier(node.expression) &&
            node.arguments.length === 1
        ) {
            const [callArgument] = node.arguments;
            if (isStringLiteral(callArgument)) {
                importRanges.push(stringLiteralToTextRange(callArgument, sourceFile, true));
            }
        } else {
            node.forEachChild(dynamicImportsFinder);
        }
    };
    const importsFinder = (node: ts.Node) => {
        if (isImportDeclaration(node) || isExportDeclaration(node)) {
            const { moduleSpecifier } = node;
            if (moduleSpecifier && isStringLiteral(moduleSpecifier)) {
                importRanges.push(stringLiteralToTextRange(moduleSpecifier, sourceFile, false));
            }
        } else {
            node.forEachChild(dynamicImportsFinder);
        }
    };
    sourceFile.forEachChild(importsFinder);
    return importRanges;
}

function isRequireIdentifier(expression: ts.LeftHandSideExpression): expression is ts.Identifier {
    return ts.isIdentifier(expression) && expression.text === 'require';
}

function stringLiteralToTextRange(
    node: ts.StringLiteral,
    sourceFile: ts.SourceFile,
    dynamic: boolean
): ITextRange {
    return {
        start: node.getStart(sourceFile) + 1,
        end: node.getEnd() - 1,
        text: node.text,
        dynamic,
    };
}


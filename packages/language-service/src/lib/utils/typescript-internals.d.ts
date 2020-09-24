import ts from 'typescript';

declare module 'typescript' {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface NamedTupleMember {}

    // needed for custom readDirectory
    export function matchFiles(
        path: string,
        extensions: ReadonlyArray<string> | undefined,
        excludes: ReadonlyArray<string> | undefined,
        includes: ReadonlyArray<string> | undefined,
        useCaseSensitiveFileNames: boolean,
        currentDirectory: string,
        depth: number | undefined,
        getFileSystemEntries: (path: string) => FileSystemEntries
    ): string[];

    // used by matchFiles above
    export interface FileSystemEntries {
        readonly files: ReadonlyArray<string>;
        readonly directories: ReadonlyArray<string>;
    }

    // needed to resolve newLine, while taking compilerOptions into consideration, for each `LanguageServiceHost`
    export function getNewLineCharacter(
        options: ts.CompilerOptions | ts.PrinterOptions,
        getNewLine?: () => string
    ): string;
}

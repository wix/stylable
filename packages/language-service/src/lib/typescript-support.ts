import { IFileSystem } from '@file-services/types';
import { createBaseHost, createLanguageServiceHost } from '@file-services/typescript';
import ts from 'typescript';
import { ExtendedTsLanguageService } from './types';

export function typescriptSupport(fileSystem: IFileSystem) {
    let openedFiles: string[] = [];
    const baseHost = createBaseHost(fileSystem);
    const tsLanguageServiceHost = createLanguageServiceHost(
        baseHost,
        () => openedFiles,
        () => ({
            target: ts.ScriptTarget.ES5,
            sourceMap: false,
            declaration: true,
            outDir: 'dist',
            lib: [],
            module: ts.ModuleKind.CommonJS,
            typeRoots: ['./node_modules/@types'],
        }),
        ''
    );
    const tsLanguageService = ts.createLanguageService(tsLanguageServiceHost);
    const wrappedTs: ExtendedTsLanguageService = {
        setOpenedFiles: (files: string[]) => (openedFiles = files),
        ts: tsLanguageService,
    };
    return wrappedTs;
}

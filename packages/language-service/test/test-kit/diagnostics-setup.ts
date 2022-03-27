import { createMemoryFs } from '@file-services/memory';
import { safeParse, Stylable } from '@stylable/core';
import { StylableLanguageService } from '@stylable/language-service';

export function createDiagnostics(files: { [filePath: string]: string }, filePath: string) {
    const fs = createMemoryFs(files);

    const stylableLSP = new StylableLanguageService({
        fs,
        stylable: new Stylable({
            fileSystem: fs,
            requireModule: require,
            projectRoot: '/',
            cssParser: safeParse,
        }),
    });

    return stylableLSP.diagnose(filePath);
}

import { createMemoryFs } from '@file-services/memory';
import { Stylable } from '@stylable/core';
import { safeParse } from '@stylable/core/dist/index-internal';
import { StylableLanguageService } from '@stylable/language-service';

export function createDiagnostics(files: { [filePath: string]: string }, filePath: string) {
    const fs = createMemoryFs(files);

    const stylableLSP = new StylableLanguageService({
        fs,
        stylable: Stylable.create({
            fileSystem: fs,
            requireModule: require,
            projectRoot: '/',
            cssParser: safeParse,
        }),
    });

    return stylableLSP.diagnose(filePath);
}

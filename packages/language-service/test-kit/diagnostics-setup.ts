import { createMemoryFs } from '@file-services/memory';
import { Stylable } from '@stylable/core';
import { StylableLanguageService } from '@stylable/language-service';

export function createDiagnostics(files: { [filePath: string]: string }, filePath: string) {
    const fs = createMemoryFs(files);

    const stylableLSP = new StylableLanguageService({
        fs,
        stylable: new Stylable('/', fs, require),
    });

    return stylableLSP.diagnose(filePath);
}

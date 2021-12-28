import { createMemoryFs } from '@file-services/memory';
import { Stylable } from '@stylable/core';
import { StylableLanguageService } from '@stylable/language-service';

export function getInMemoryLSP() {
    const fs = createMemoryFs();
    const lsp = new StylableLanguageService({
        fs,
        stylable: Stylable.create({ fileSystem: fs, projectRoot: '/' }),
    });

    return { fs, lsp };
}

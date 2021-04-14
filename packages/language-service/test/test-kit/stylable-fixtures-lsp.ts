import fs from '@file-services/node';
import path from 'path';
import { safeParse, Stylable } from '@stylable/core';
import { StylableLanguageService } from '@stylable/language-service';

export const CASES_PATH = path.join(
    path.dirname(require.resolve('@stylable/language-service/package.json')),
    'test',
    'fixtures',
    'server-cases'
);

function requireModule(request: string) {
    return require(require.resolve(request, { paths: [CASES_PATH] }));
}

export const stylableLSP = new StylableLanguageService({
    fs,
    stylable: Stylable.create({
        fileSystem: fs,
        requireModule,
        projectRoot: CASES_PATH,
        cssParser: safeParse,
    }),
});

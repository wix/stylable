import { nodeFs as fs } from '@file-services/node';
import path from 'path';
import { Stylable } from '@stylable/core';
import { safeParse } from '@stylable/core/dist/index-internal';
import { StylableLanguageService } from '@stylable/language-service';

export const CASES_PATH = fs.realpathSync.native(
    path.join(
        path.dirname(require.resolve('@stylable/language-service/package.json')),
        'test/fixtures/server-cases',
    ),
);

function requireModule(request: string) {
    return require(require.resolve(request, { paths: [CASES_PATH] }));
}

export const stylableLSP = new StylableLanguageService({
    fs,
    stylable: new Stylable({
        fileSystem: fs,
        requireModule,
        projectRoot: CASES_PATH,
        cssParser: safeParse,
    }),
});

import fs from '@file-services/node';
import { Stylable } from '@stylable/core';
import { StylableLanguageService } from '../src/lib/service';

export const CASES_PATH = fs.join(
    fs.dirname(fs.findClosestFileSync(__dirname, 'package.json')!),
    'test',
    'fixtures',
    'server-cases'
);

function requireModule(request: string) {
    return require(require.resolve(request, { paths: [CASES_PATH] }));
}

export const stylableLSP = new StylableLanguageService({
    fs,
    stylable: new Stylable(CASES_PATH, fs as any, requireModule)
});


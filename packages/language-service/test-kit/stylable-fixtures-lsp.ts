import fs from '@file-services/node';
import { StylableLanguageService } from '../src/lib/service';

export const CASES_PATH = fs.join(
    fs.dirname(fs.findClosestFileSync(__dirname, 'package.json')!),
    'test',
    'fixtures',
    'server-cases'
);

export const stylableLSP = new StylableLanguageService({
    rootPath: CASES_PATH,
    fs,
    requireModule: (request: string) => {
        return require(require.resolve(request, { paths: [CASES_PATH] }));
    }
});

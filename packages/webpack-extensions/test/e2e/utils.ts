import { readFileSync } from 'fs';
import { hashContent } from '@stylable/webpack-extensions';

export function getSheetContentAndHash(sheetPath: string) {
    const content = readFileSync(sheetPath, 'utf-8');
    return {
        path: sheetPath,
        content,
        hash: hashContent(sheetPath + content),
    };
}

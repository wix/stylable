import { getType } from 'mime';

export function fileToDataUri(filename: string, content: { toString: (arg0: 'base64') => string }) {
    return `data:${getType(filename)};charset=utf-8;base64,${content.toString('base64')}`;
}

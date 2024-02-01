import mime from 'mime';

export function fileToDataUri(filename: string, content: { toString: (arg0: 'base64') => string }) {
    return `data:${mime.getType(filename)};charset=utf-8;base64,${content.toString('base64')}`;
}

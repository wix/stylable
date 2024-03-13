import { Base64 } from 'js-base64';
import mime from 'mime';

export function fileToDataUri(filename: string, content: Uint8Array) {
    return `data:${mime.getType(filename)};charset=utf-8;base64,${Base64.fromUint8Array(content)}`;
}

const createHash = require('webpack/lib/util/createHash');

export function hashContent(source: string, length?: number) {
    const hash = createHash('sha1');
    hash.update(source || '');
    const hashId = hash.digest('hex');
    return length !== undefined ? hashId.slice(0, length) : hashId;
}

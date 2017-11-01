import { expect } from 'chai';
import { cachedProcessFile, MinimalFS } from '../src/cached-process-file';

describe('cachedProcessFile', () => {

     it('return process file content', () => {
        const file = 'C:/file.txt';
        const fs: MinimalFS = {
            readFileSync(fullpath: string) {
                if (fullpath === file) {
                    return 'content';
                }
                return '';
            },
            statSync() {
                return {
                    mtime: new Date(0)
                } as any;
            }
        };

        const p = cachedProcessFile((_fullpath, content) => {
            return content + '!';
        }, fs);

        expect(p.process(file)).to.equal('content!');

    });

     it('not process file if not changed', () => {
        const file = 'C:/file.txt';
        let res: {};
        const fs: MinimalFS = {
            readFileSync(fullpath: string) {
                if (fullpath === file) {
                    return 'content';
                }
                return '';
            },
            statSync() {
                return {
                    mtime: new Date(0)
                };
            }
        };

        const p = cachedProcessFile((fullpath, content) => {
            const processed = { content, fullpath };
            res = res ? res : processed;
            return processed;
        }, fs);

        expect(p.process(file)).to.equal(p.process(file));

    });

     it('not read file if not changed', () => {
        const file = 'C:/file.txt';

        let count = 0;

        const fs: MinimalFS = {
            readFileSync(fullpath: string) {
                count++;
                return fullpath;
            },
            statSync() {
                return {
                    mtime: new Date(0)
                };
            }
        };

        const p = cachedProcessFile(() => null, fs);
        p.process(file);
        p.process(file);
        p.process(file);
        expect(count).to.equal(1);

    });

     it('read file if and reprocess if changed', () => {
        const file = 'C:/file.txt';

        let readCount = 0;
        let processCount = 0;

        const fs: MinimalFS = {
            readFileSync() {
                readCount++;
                return '';
            },
            statSync() {
                return {
                    mtime: readCount === 0 ? new Date(0) : new Date(1)
                };
            }
        };

        const p = cachedProcessFile(() => {
            processCount++;
            return null;
        }, fs);

        p.process(file);
        p.process(file);

        expect(readCount).to.equal(2);
        expect(processCount).to.equal(2);

    });

     it('add stuff to ', () => {
        const file = 'C:/file.txt';

        let readCount = 0;
        let processCount = 0;

        const fs: MinimalFS = {
            readFileSync() {
                readCount++;
                return '';
            },
            statSync() {
                return {
                    mtime: readCount === 0 ? new Date(0) : new Date(1)
                };
            }
        };

        const p = cachedProcessFile(() => {
            processCount++;
            return null;
        }, fs);

        p.process(file);
        p.process(file);

        expect(readCount).to.equal(2);
        expect(processCount).to.equal(2);

    });

});

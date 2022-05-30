import { expect } from 'chai';
import { cachedProcessFile } from '@stylable/core';

describe('cachedProcessFile', () => {
    it('return process file content', () => {
        const file = 'C:/file.txt';
        function readFileSync(fullpath: string) {
            if (fullpath === file) {
                return 'content';
            }
            return '';
        }

        const p = cachedProcessFile((_fullpath, content) => {
            return content + '!';
        }, readFileSync);

        expect(p.process(file)).to.equal('content!');
    });

    it('not process file if not changed', () => {
        const file = 'C:/file.txt';
        let res: {};
        function readFileSync(fullpath: string) {
            if (fullpath === file) {
                return 'content';
            }
            return '';
        }

        const p = cachedProcessFile((fullpath, content) => {
            const processed = { content, fullpath };
            res = res ? res : processed;
            return processed;
        }, readFileSync);

        expect(p.process(file)).to.equal(p.process(file));
    });

    it('should accept post processors used in process and processContent', () => {
        const file = 'C:/file.txt';
        function readFileSync(fullpath: string) {
            return fullpath;
        }
        const p = cachedProcessFile(() => 'Hello', readFileSync, [
            (content) => {
                return content + '!post-processor';
            },
        ]);

        const out = p.process(file);
        expect(out).to.equal('Hello!post-processor');
        expect(out).to.equal(p.processContent('Hello', file));
    });

    it('should accept cache', () => {
        const file = 'C:/file.txt';
        function readFileSync(fullpath: string) {
            return fullpath;
        }

        const p = cachedProcessFile(() => 'Hello', readFileSync, [], {
            [file]: {
                value: 'FROM CACHE',
                content: file,
            },
        });

        const out = p.process(file);
        expect(out).to.equal('FROM CACHE');
        expect(p.processContent('Hello', file), 'process context should ignore cache').to.equal(
            'Hello'
        );
    });

    it('read file if and reprocess if changed', () => {
        const file = 'C:/file.txt';

        let readCount = 0;
        let processCount = 0;
        function readFileSync() {
            return String(readCount++);
        }
        const p = cachedProcessFile(() => {
            return String(processCount++);
        }, readFileSync);

        p.process(file);
        p.process(file);

        expect(readCount).to.equal(2);
        expect(processCount).to.equal(2);
    });

    it('add stuff to ', () => {
        const file = 'C:/file.txt';

        let readCount = 0;
        let processCount = 0;

        function readFileSync() {
            return String(readCount++);
        }

        const p = cachedProcessFile(() => {
            processCount++;
            return null;
        }, readFileSync);

        p.process(file);
        p.process(file);

        expect(readCount).to.equal(2);
        expect(processCount).to.equal(2);
    });
});

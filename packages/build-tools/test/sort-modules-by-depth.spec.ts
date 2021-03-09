import { sortModulesByDepth } from '@stylable/build-tools';
import { expect } from 'chai';

describe('sort-modules-by-depth', () => {
    it('should sort by depth and name when depth conflicts', () => {
        const sorted = sortModulesByDepth(
            [
                { id: 'b0', depth: 0 },
                { id: 'a0', depth: 0 },
                { id: 'b1', depth: 1 },
                { id: 'a1', depth: 1 },
            ],
            ({ depth }) => depth,
            ({ id }) => id
        );

        expect(sorted).to.eql([
            { id: 'a1', depth: 1 },
            { id: 'b1', depth: 1 },
            { id: 'a0', depth: 0 },
            { id: 'b0', depth: 0 },
        ]);
    });
    it('should sort by depth and name when depth conflicts (reverse depth order)', () => {
        const sorted = sortModulesByDepth(
            [
                { id: 'b1', depth: 1 },
                { id: 'a1', depth: 1 },
                { id: 'b0', depth: 0 },
                { id: 'a0', depth: 0 },
            ],
            ({ depth }) => depth,
            ({ id }) => id,
            -1
        );

        expect(sorted).to.eql([
            { id: 'a0', depth: 0 },
            { id: 'b0', depth: 0 },
            { id: 'a1', depth: 1 },
            { id: 'b1', depth: 1 },
        ]);
    });
});

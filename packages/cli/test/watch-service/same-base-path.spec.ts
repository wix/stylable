import { expect } from 'chai';
import { normalize, sep, resolve } from 'path';

function normalSameParentPath(p: string, c: string, caseInsensitive = true): boolean {
    const np = normalize(caseInsensitive ? p.toLowerCase() : p)
        .split(sep)
        .filter(Boolean);
    const nc = normalize(caseInsensitive ? c.toLowerCase() : c)
        .split(sep)
        .filter(Boolean);

    let isMatch = false;
    for (let i = 0; i < np.length; i++) {
        let matchCount = i;
        for (let j = 0; j < nc.length; j++) {
            const a = nc[j];
            const b = np[matchCount];
            if (a === b) {
                matchCount += 1;
                isMatch = true;
            } else {
                isMatch = false;
                break;
            }
            if (matchCount >= np.length) {
                return isMatch;
            }
        }
    }
    return isMatch;
}

`
filter [a/x/b]

 a
  - b
   - c
  - x
    - b
     - c  
    - d
     - a
      - x 
       - b

`;

describe('', () => {
    it('true', () => {
        expect(normalSameParentPath('/c:/a/b', 'c:\\a\\b')).to.equal(true);
        expect(normalSameParentPath('C:\\project', 'c:\\Project\\file')).to.equal(true);
        expect(
            normalSameParentPath('\\\\SERVER\\Share\\path', '\\\\SERVER\\Share\\path\\c')
        ).to.equal(true);

        expect(normalSameParentPath(resolve('/a'), resolve('/a'))).to.equal(true);
        expect(normalSameParentPath('/a', '/a')).to.equal(true);
        expect(normalSameParentPath('/a/b', '/a/b/c')).to.equal(true);
        expect(normalSameParentPath('/a/b', '/a//b')).to.equal(true);
        expect(normalSameParentPath('/x/x/x/x/a/b', '/a/b/')).to.equal(true);
        expect(normalSameParentPath('/x/x/x/x/x/x/a/b', '/a/b/c/d/e/f/g')).to.equal(true);
        expect(normalSameParentPath('/a/b/c/a/b/x', '/a/b/x')).to.equal(true);
    });
    it('false', () => {
        expect(normalSameParentPath('/a/b/c', '/a/b')).to.equal(false);
        expect(normalSameParentPath('/a/b', '/c/a/b')).to.equal(false);
        expect(normalSameParentPath('/a/bc', '/a/b/')).to.equal(false);
    });
});

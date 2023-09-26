import { expect } from 'chai';
import { ESBuildTestKit } from '../esbuild-testkit';
import { sleep } from 'promise-assist';

describe('Stylable ESBuild plugin rebuild on change', function () {
    const tk = new ESBuildTestKit();

    afterEach(() => tk.dispose());

    it('should pick up rebuild', async function () {
        const { context, read, write } = await tk.build({
            project: 'rebuild',
            tmp: true,
        });
        const css1 = read('dist/index.js');
        expect(css1, 'initial color').to.includes('color: red');
        await context.watch();
        await sleep(2222);
        write('a.st.css', `.root{color: green}`);
        await sleep(2222);
        const css2 = read('dist/index.js');
        expect(css2, 'color after change').to.includes('color: green');
    });
});

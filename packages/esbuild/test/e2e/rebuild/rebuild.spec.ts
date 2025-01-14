import { expect } from 'chai';
import { ESBuildTestKit } from '../esbuild-testkit.js';
import { sleep } from 'promise-assist';

describe('Stylable ESBuild plugin rebuild on change', function () {
    const tk = new ESBuildTestKit();

    afterEach(() => tk.dispose());

    it('should pick up rebuild', async function () {
        const { context, read, write, act } = await tk.build({
            project: 'rebuild',
            tmp: true,
        });
        const css1 = read('dist/index.js');
        expect(css1, 'initial color').to.includes('color: red');
        await context.watch();
        await sleep(2222);
        await act(() => {
            write('a.st.css', `.root{color: green}`);
        });
        const css2 = read('dist/index.js');
        expect(css2, 'color after change').to.includes('color: green');
    });

    it('should stay alive after error', async function () {
        const { context, read, write, act } = await tk.build({
            project: 'rebuild',
            tmp: true,
        });
        const css1 = read('dist/index.js');
        expect(css1, 'initial color').to.includes('color: red');
        await context.watch();
        await sleep(2222);
        await act(() => {
            write('a.st.css', `.root{}}}}}`);
        });
        await act(() => {
            write('a.st.css', `.root{color: green}`);
        });
        const css2 = read('dist/index.js');
        expect(css2, 'color after change').to.includes('color: green');
    });
});

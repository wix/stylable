// import {} from '@stylable/e2e-test-kit'
import { inspect } from 'util';
import { expect } from 'chai';
import { ESBuildTestKit } from './esbuild-testkit';

describe('Stylable ESBuild plugin', () => {
    let tk!: ESBuildTestKit;
    beforeEach(() => (tk = new ESBuildTestKit('simple-project')));
    afterEach(() => tk.dispose());

    it('should build a simple project without errors', async () => {
        await tk.build();
        console.log(inspect(tk.buildResult.metafile, false, 10));
        expect(1);
    });
});

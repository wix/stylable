import { expect } from 'chai';
import { ESBuildTestKit } from '../esbuild-testkit';

describe('Stylable ESBuild plugin', () => {
    const tk = new ESBuildTestKit({
        log: false,
        launchOptions: {
            headless: false,
        },
    });

    afterEach(() => tk.dispose());

    it('should emit build errors for duplicate namespace and break', async () => {
        let check;
        try {
            await tk.build('duplicate-namespace');
        } catch (e) {
            check = (e as any)?.message;
        }

        expect(check).to.includes(`The namespace 'X' is being used in multiple files.`);
    });
});

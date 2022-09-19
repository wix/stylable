import type { LoaderContext } from 'webpack';
import { basename, dirname, join } from 'path';

export default function (this: LoaderContext<{}>, content: string) {
    return new Promise((res) => {
        const sourceFileName = basename(this.resourcePath).replace(/\.st\.css\.m?js$/, '.st.css');
        const sourceDir = dirname(this.resourcePath);
        this.fs.stat(join(sourceDir, sourceFileName), (err) => {
            if (err) {
                res(content);
            } else {
                res(`export * from ${JSON.stringify('./' + sourceFileName)}`);
            }
        });
    });
}

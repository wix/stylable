import { nodeFs } from '@file-services/node';
import { expect } from 'chai';
import { rollupRunner } from './test-kit/rollup-runner';
import { getProjectPath } from './test-kit/test-helpers';

const imageBase64 = `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAdCAMAAACDkYxEAAACl1BMVEX////0LUL3LEXwLzwAWJJSwXRXxHBky2XyLj/xLz4AP45At4RFuYBJvHxpzmD1LUSQEB0AR4dOv3j5K0n4LEjzLkDuMDqEAAr9/v0AT5A7s4hfyWlgyWf/LE8AHk7xQ032KD7vMDr8EjnwIjLtGSSODxxcAgy+2+T9z9T7wsfhwsUmtKAaa50ttpmm45gytZMAQZI3s44AUY4AQIv2gooARYYAQ4RFvoMAJnlOvngAKm5Lv21cx2xcxmxLwGRXxmAAJ19w0lxs0Fv5PllmzlRUx1L/MEn9K0n4KET9GEDuNDubLDntLjfyHzDtJi6HDBmLCBd8BxVpABBkAA9iAA5PAAhiAAaBAAMmAAAXAAD3/f3x9Pvr9vf88PLu7e396+zu+uvR7umx7+j+3ePE6d2X19yjx9fU8dWUwdTT8NHqzM7E68xs1cz/v8yO2cu758r6xsmCtMlzq8ZzoMVyp8RcyrtNyLtXlrf0pLLXrLH9na1yyakve6gkvaUAlqVAh6UMvKQAp6IouJ4Rs5yG1Jo0vplyy5gFbZeN2JY5t5b/fpYTr5Rzy5M8wZMARpItspD2ipA3s40UrYwAS4w+uotKuon7dYnEhIiZ34f9bYU2soRJu4LCfoIVd4Ikq4FtzH74a339YXy9cXtHwXhGungAMnZrzHUieXV+1XRuznM4sHLxbHH1ZXFbxm1axW1BumxqzmcHPGR912NSw2HzV2FFvl/zUV/4RV1dyVsAI1oAHVhey1LWRVGqQ1D/MU/5KkvxPUhczEf0MUb6L0buJ0b+MEWXP0TlJkLiJkL4I0HkGj2hMjr4FTbuJTL0GTLNGi63Gi2wFSzyFivtHiq5Dh1yABB1AA5/AAZBAARAAARaAAAgAAAbAABDUUd5AAAB10lEQVQoz2KAggS9TY4zJBiwAL2DLk5OLo5YZFbs5gMB10wMmQ072MHANR1dZqW9jIyMtLS0/TJ0mY7NNra2NmvX2c1Hl8neygYGdi0YFlmzgoF1D4izyHtvBVwmf72QkJClpdCqaCDHWzwgQPxULlSqbQkvCCyuB7K1wlUFBAIDlbogUrN5QMB8bjGQXSmuKhAUonbRcyFYaio3CJhblADZEuKq/iFBN9RkPWeCpKpnSUlJTVluocMANtE/ODTizhFZpSogL2XeREPD3o1WxmkguViBa6ERkSdk9yslA3md/fr6rTvljAXVwRYAJnD1ZuRxd2EPZyA7cZKurvYuOQcD00KQVNb14NvuwsLCZzSAnLzuJm0roJSkaTlI7nSY2j4REZGT00Cc0ubavqVcXJIsZjFA3pxbF9yYmEQ8toPNL2to5+LiYmEBWzc9DCgDBM4Qf+c0TpZkAUpFAdnHzh/mBwKFBdDgSqoTNDIyKwKy4q4cZQQC/nOa8GBOrdHJANF7FERBUgqHMKJojS8HB4eoqOglDXQZeWVOTk6gpK8JusyBs8zMzEBJ5W3oMgUqimLMQKAsj2GRpoqYmKKY4uUtDJjAy8/Hx09lArb0LbHaS94kHsoBAHXVc1Gx2nF+AAAAAElFTkSuQmCC")`;

const getElementsStyles = () => {
    const { backgroundImage, backgroundColor, fontSize, fontFamily } = getComputedStyle(
        document.body
    );
    const { backgroundImage: partBackgroundImage, color: partColor } = getComputedStyle(
        document.body.firstElementChild!
    );
    return {
        body: { backgroundImage, backgroundColor, fontSize, fontFamily },
        part: { backgroundImage: partBackgroundImage, color: partColor },
    };
};

describe('StylableRollupPlugin', function () {
    this.timeout(20000);

    const project = 'simple-stylable';

    const runner = rollupRunner({
        projectPath: getProjectPath(project),
        pluginOptions: {
            inlineAssets(_, buffer) {
                return buffer.byteLength < 1024 * 5;
            },
        },
    });

    it('should transform Stylable files with assets and create output css', async () => {
        const { projectDir, serve, ready, act, open } = runner;

        await ready;

        const url = await serve();
        let page = await open(url);

        const { body, part } = await page.evaluate(getElementsStyles);

        expect(body.backgroundImage).to.equal(imageBase64);
        expect(body.fontSize).to.equal('120px');
        expect(body.fontFamily).to.equal('monospace');

        expect(part.backgroundImage).to.match(/2e13bcd92bf005d9bf9046f9206e5652ed34fc7b_dog.png/);
        expect(part.color).to.equal('rgb(0, 128, 0)');

        await act(async (done) => {
            nodeFs.writeFileSync(nodeFs.join(projectDir, 'index.st.css'), '');
            await done;
            page = await open(url);
        });

        const { body: body2 } = await page.evaluate(getElementsStyles);

        expect(body2.backgroundImage).to.equal('none');
        expect(body2.fontSize).to.equal('16px');

        await act(async (done) => {
            nodeFs.writeFileSync(
                nodeFs.join(projectDir, 'index.st.css'),
                '.root {background: red}'
            );
            await done;
            page = await open(url);
        });

        const { body: body3 } = await page.evaluate(getElementsStyles);

        expect(body3.backgroundColor).to.equal('rgb(255, 0, 0)');
    });
});

import { copyFileSync } from 'fs';

console.log('### copying js vendor assets');

async function copyAndMinify() {
    copyFileSync('../../node_modules/tippy.js/dist/tippy.all.min.js', 'js/vendor/tippy/tippy.all.min.js');
    copyFileSync('../../node_modules/tippy.js/LICENSE', 'js/vendor/tippy/LICENSE');
    copyFileSync('../../node_modules/prismjs/prism.js', 'js/vendor/prism/prism.js');
    copyFileSync('../../node_modules/prismjs/LICENSE', 'js/vendor/prism/LICENSE');
}

copyAndMinify();

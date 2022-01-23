// 1. find all stylable files
// 2. find all components connected (views) to the stylable files
// 3. treat each component as entrypoint and calculate the depth of each import

// const stylableFiles = glob("**/*.st.css");
// const views = stylableFiles.map((file) => findView(file)).filter(Boolean);
// const parsedViews = views.map((viewFile) => parseFile(viewFile));
// const viewDepthGraph = parsedViews.map((ast) => createDependencyDepthsGraph(ast));
// const fixedViews =  parsedViews.map((ast)=>fixDependenciesOrder(ast, viewDepthGraph));
// fixedViews.map((fixed)=>writeFile(fixed.path, fixed.content));

import { run } from './deps';

function bundle({ entryPoints }) {
    const { entries, roots } = run({ entryPoints, ignoreList: [], context: process.cwd() });

    
    
}

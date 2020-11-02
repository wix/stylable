import { getImports } from "./loader-utils";
import { StylableLoaderContext } from "./types";

export default function (this: StylableLoaderContext, source: string) {
  const { meta, exports } = this.stylable.transform(source, this.resourcePath);

  const { urls, imports } = getImports(
    meta,
    this.stylable.projectRoot,
    this.assetsMode
  );

  this.flagStylableModule({ css: meta.outputAst!.toString(), urls });

  return `
${imports.join("\n")}
export const namespace = ${JSON.stringify(meta.namespace)};
export const classes = ${JSON.stringify(exports.classes)}; 
export const keyframes = ${JSON.stringify(exports.keyframes)}; 
export const stVars = ${JSON.stringify(exports.stVars)}; 
export const vars = ${JSON.stringify(exports.vars)}; 
export const cssStates = /*#__PURE__*/ __webpack_require__.stc.bind(null, namespace);
export const style = /*#__PURE__*/ __webpack_require__.sts.bind(null, namespace);
export const st = style;
if(import.meta.webpackHot /* HMR */) {
  import.meta.webpackHot.accept();
}
`;
}

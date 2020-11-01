import {
  isAsset,
  makeAbsolute,
  processDeclarationUrls,
  StylableMeta,
} from "@stylable/core";
import { dirname } from "path";

export function getImports(
  meta: StylableMeta,
  projectRoot: string,
  assetsMode: "url" | "loader"
) {
  const urls = handleUrlDependencies(meta, projectRoot);

  const imports = meta.imports
    .filter(({ fromRelative }) => fromRelative.endsWith(".st.css"))
    .map(({ fromRelative }) => `import ${JSON.stringify(fromRelative)};`);

  if (assetsMode === "loader") {
    urls.forEach((assetPath) =>
      imports.push(`import ${JSON.stringify(assetPath)};`)
    );
  }
  return { urls, imports };
}

function handleUrlDependencies(meta: StylableMeta, rootContext: string) {
  const moduleContext = dirname(meta.source);
  const urls: string[] = [];
  meta.outputAst!.walkDecls((node) =>
    processDeclarationUrls(
      node,
      (node) => {
        const { url } = node;
        if (url && isAsset(url)) {
          node.url = `__stylable_url_asset_${urls.length}__`;
          (node as any).stringType = '"';
          if(url.startsWith('/')){
            
          }
          urls.push(makeAbsolute(url, rootContext, moduleContext));
        }
      },
      true
    )
  );
  return urls;
}

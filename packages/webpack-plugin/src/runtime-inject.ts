import { stylesheet, injectStyles } from "./runtime";

import {
  RuntimeModule,
  RuntimeGlobals,
  Compilation,
  Dependency,
  Module,
  ModuleGraph,
  NormalModule,
  sources,
} from "webpack";
import {
  extractFilenameFromAssetModule,
  replaceCSSAssetPlaceholders,
  isLoadedWithKnownAssetLoader,
} from "./plugin-utils";
import { StylableBuildMeta } from "./types";
const makeSerializable = require("webpack/lib/util/makeSerializable");

interface DependencyTemplateContext {
  module: Module;
  moduleGraph: ModuleGraph;
  runtimeRequirements: Set<string>;
}

export class StylableRuntimeDependency extends Dependency {
  constructor(private stylableBuildMeta: StylableBuildMeta) {
    super();
  }
  updateHash(hash: any) {
    hash.update(JSON.stringify(this.stylableBuildMeta));
  }

  serialize({ write }: any) {
    write(this.stylableBuildMeta);
  }

  deserialize({ read }: any) {
    this.stylableBuildMeta = read();
  }
}

export class InjectDependencyTemplate {
  constructor(
    private staticPublicPath: string,
    private assetsModules: Map<string, NormalModule>
  ) {}
  apply(
    _dependency: StylableRuntimeDependency,
    source: sources.ReplaceSource,
    { module, runtimeRequirements }: DependencyTemplateContext
  ) {
    if (!module.buildMeta.stylable.isUsed) {
      return;
    }
    if (module.buildMeta.stylable.cssInjection === "js") {
      const css = replaceCSSAssetPlaceholders(
        module.buildMeta.stylable,
        this.staticPublicPath,
        (resourcePath) => {
          const assetModule = this.assetsModules.get(resourcePath);
          if (!assetModule) {
            throw new Error("Missing asset module for " + resourcePath);
          }
          if (isLoadedWithKnownAssetLoader(assetModule)) {
            return extractFilenameFromAssetModule(assetModule);
          } else {
            return assetModule.buildInfo.filename;
          }
        }
      );
      source.insert(
        source.size(),
        `__webpack_require__.sti(namespace, ${JSON.stringify(css)}, ${
          module.buildMeta.stylable.cssDepth
        });`,
        StylableRuntimeDependency.name
      );
      runtimeRequirements.add(StylableRuntimeInject.name);
    }
    runtimeRequirements.add(StylableRuntimeStylesheet.name);
  }
}

export class StylableRuntimeStylesheet extends RuntimeModule {
  constructor() {
    super("stylable stylesheet", 10);
  }
  generate() {
    return `(${stylesheet})(__webpack_require__)`;
  }
}

export class StylableRuntimeInject extends RuntimeModule {
  constructor() {
    super("stylable inject", 10);
  }
  generate() {
    return `(${injectStyles})(__webpack_require__)`;
  }
}

export class LoadCSS extends RuntimeModule {
  constructor() {
    super("stylable load css", 10);
  }
  generate() {
    return `${RuntimeGlobals.ensureChunkHandlers}.stcss = ()=>{/*load css for chunk*/}`;
  }
}

export function injectRuntimeModules(name: string, compilation: Compilation) {
  compilation.hooks.runtimeRequirementInTree
    .for(RuntimeGlobals.ensureChunkHandlers)
    .tap(name, (chunk) => {
      compilation.addRuntimeModule(chunk, new LoadCSS());
    });

  compilation.hooks.runtimeRequirementInModule
    .for(StylableRuntimeInject.name)
    .tap(name, (_module, set) => {
      set.add(RuntimeGlobals.require);
    });

  compilation.hooks.runtimeRequirementInModule
    .for(StylableRuntimeStylesheet.name)
    .tap(name, (_module, set) => {
      set.add(RuntimeGlobals.require);
    });

  compilation.hooks.runtimeRequirementInTree
    .for(StylableRuntimeInject.name)
    .tap(name, (chunk, _set) => {
      compilation.addRuntimeModule(chunk, new StylableRuntimeInject());
    });

  compilation.hooks.runtimeRequirementInTree
    .for(StylableRuntimeStylesheet.name)
    .tap(name, (chunk, _set) => {
      compilation.addRuntimeModule(chunk, new StylableRuntimeStylesheet());
    });
}

makeSerializable(
  StylableRuntimeDependency,
  __filename,
  StylableRuntimeDependency.name
);

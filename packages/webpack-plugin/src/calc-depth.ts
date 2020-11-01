import { Module, ModuleGraph, NormalModule } from "webpack";
import {
  isStylableModule,
  isAssetModule,
  uniqueFilterMap,
  isSameResourceModule,
} from "./plugin-utils";

export interface DepthResults {
  id: string;
  depth: number;
  deps: Set<Module>;
}

export function calcDepth(
  start: NormalModule,
  moduleGraph: ModuleGraph,
  visited = new Map<string, DepthResults>()
) {
  let id = start.resource;
  let results = visited.get(id);
  if (results) {
    return results;
  } else {
    results = { id, depth: 0, deps: new Set() };
    visited.set(id, results);
  }
  const selfDepth = isStylableModule(start) ? 1 : 0;

  const inConnections = uniqueFilterMap(
    moduleGraph.getIncomingConnections(start),
    ({ originModule }) => originModule
  );

  for (const connectionModule of inConnections) {
    const dependedModules = uniqueFilterMap(
      connectionModule.dependencies,
      (dep) => moduleGraph.getModule(dep)
    );
    for (const module of dependedModules) {
      if (isSameResourceModule(start, module)) {
        break;
      }
      handleStylableConnection(results, module, selfDepth);
    }
  }

  const outConnections = uniqueFilterMap(
    moduleGraph.getOutgoingConnections(start),
    ({ module }) => module
  );

  for (const connectionModule of outConnections) {
    handleStylableConnection(results, connectionModule, selfDepth);
  }

  return results;

  function handleStylableConnection(
    results: DepthResults,
    connectionModule: Module,
    selfDepth: number
  ) {
    if (isAssetModule(connectionModule)) {
      return;
    }
    const depResult = calcDepth(
      connectionModule as NormalModule,
      moduleGraph,
      visited
    );
    if (depResult.id !== results.id) {
      results.depth = Math.max(results.depth, depResult.depth + selfDepth);
    }
    if (isStylableModule(connectionModule)) {
      results.deps.add(connectionModule);
      for (const dep of depResult.deps) {
        results.deps.add(dep);
      }
    }
  }
}

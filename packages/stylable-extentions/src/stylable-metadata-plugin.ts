import * as webpack from 'webpack';
import * as path from 'path';
import { RawSource } from 'webpack-sources';

export interface Preset {
  path: string;
  overrides: { [name: string]: string };
  named?: string;
  style?: string;
}

export interface ComponentConfig {
  id: string;
  namespace: string;
  stylesheetPath: string;
  presets: Preset[];
  variantsPath: string;
  previewProps: { [name: string]: any };
}



export class StylableMetadataPlugin {
  constructor(private pkg: { name: string, version: string }, private componentConfigExt = '.component.json') {
  }
  apply(compiler: webpack.Compiler) {
    compiler.hooks.compilation.tap("StylableMetadataPlugin", compilation => {
      compilation.hooks.optimizeChunks.tap("StylableMetadataPlugin", chunks => {
        chunks.forEach(chunk => {
          const pkg = this.pkg;
          const packageLocation = "/node_modules/" + pkg.name;
          const output = {
            version: pkg.version,
            name: pkg.name,
            fs: {} as { [path: string]: any },
            components: {} as { [path: string]: ComponentConfig },
            packageLocation
          };

          let maxDepth = 0;

          const stylableModules = getStylableModules(chunk);
          stylableModules.forEach((module: any) => {
            const { depth } = module.buildInfo.runtimeInfo;
            const namespace = module.buildInfo.stylableMeta.namespace;
            const resourcePath = normPath(module.resource, compiler.options.context);
            const resourceName = path
              .basename(resourcePath)
              .replace(/\.st\.css$/, "");

            maxDepth = Math.max(maxDepth, depth);

            output.fs[packageLocation + resourcePath] = {
              depth,
              namespace,
              source: compilation.inputFileSystem
                .readFileSync(module.resource)
                .toString()
            };

            let resourceDir = '';
            let componentConfig: ComponentConfig | undefined = undefined;
            try {
              resourceDir = path.dirname(module.resource);
              componentConfig = JSON.parse(
                compilation.inputFileSystem
                  .readFileSync(
                    path.join(resourceDir, resourceName + this.componentConfigExt)
                  )
                  .toString()
              );
            } catch (e) { }

            if (resourceDir && componentConfig) {
              if (componentConfig.variantsPath) {
                const variantsPath = componentConfig.variantsPath;
                const variantsFolder = path.join(resourceDir, variantsPath);

                try {
                  compilation.inputFileSystem
                    .readdirSync(variantsFolder)
                    .forEach((name: string) => {
                      if (name.match(/\.st\.css/)) {
                        const variantPath = path.join(
                          resourceDir,
                          variantsPath,
                          name
                        );
                        output.fs[
                          packageLocation +
                          normPath(variantPath, compiler.options.context)
                        ] = {
                            depth,
                            namespace:
                              name.replace(".st.css", "") + "-" + namespace,
                            source: compilation.inputFileSystem
                              .readFileSync(variantPath)
                              .toString(),
                            variant: true
                          };
                      }
                    });
                } catch (error) {
                  if (error.code !== "ENOENT") {
                    throw new Error(
                      "Error while creating variants for: " + resourcePath
                    );
                  }
                }

                componentConfig.variantsPath = packageLocation + normPath(
                  variantsFolder,
                  compiler.options.context
                );
                if (componentConfig.presets) {
                  for (const preset of componentConfig.presets) {
                    preset.path = normPath(
                      path.join(componentConfig.variantsPath, preset.path)
                    );
                    if (!output.fs[preset.path]) {
                      throw new Error(
                        "Missing Variant for preset: " + preset.path
                      );
                    }
                  };
                }
              }

              componentConfig.stylesheetPath = packageLocation + resourcePath;
              componentConfig.namespace = namespace;

              if (!output.components[componentConfig.id]) {
                output.components[componentConfig.id] = componentConfig;
              } else {
                throw new Error(
                  `Duplicate Component ID: ${componentConfig.id}`
                );
              }
            }
          });
          if (output.fs[packageLocation + "/index.st.css"]) {
            throw new Error("duplicate index");
          }

          output.fs[packageLocation + "/index.st.css"] = {
            depth: maxDepth,
            namespace: chunk.name,
            source: Object.keys(output.components)
              .map(name => {
                return `:import {-st-from: "${
                  output.components[name].stylesheetPath.replace(packageLocation, '.')
                  }"; -st-default: ${name}} ${name}{}`;
              })
              .join("\n")
          };

          if (stylableModules.length) {
            compilation.assets[`${output.name}-metadata.json`] = new RawSource(
              JSON.stringify(output, null, 2)
            );
          }
        });
      });
    });
  }
};

function getStylableModules(chunk: webpack.compilation.Chunk) {
  return Array.from(chunk.modulesIterable).filter(module => module.type === "stylable");
}

function normPath(resource: string, context = "") {
  return resource.replace(context, "").replace(/\\/g, "/");
}
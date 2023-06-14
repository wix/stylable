# @stylable/cli

[![npm version](https://img.shields.io/npm/v/@stylable/cli.svg)](https://www.npmjs.com/package/@stylable/cli)

`@stylable/cli` is a low-level utility used for working with Stylable projects directly.

- Build and transform stylesheets into JavaScript modules
- Generate an entry index file to help consume a published project

## Installation

Using NPM:
```
npm install @stylable/cli --save-dev
```

Using Yarn:
```
yarn add @stylable/cli -D
```

## Usage

After installing `@stylable/cli`, the `stc` command will be available, running `stc --help` will provide a brief description for the options available.

`stc` accepts [CLI arguments](#cli-arguments) or a Stylable [configuration file](#configuration-file).

### CLI Arguments

| Option                    | Alias  | Description                                                                            | Default Value    |
| ------------------------- | ------ | ----------------------------------------------------------------------------------     | ---------------- |
| `--version`               |  `v`   | show CLI version number                                                                | `boolean`        |
| `--rootDir`               |        | root directory of project                                                              | `cwd`            |
| `--srcDir`                |        | source directory relative to root                                                      | `./`             |
| `--outDir`                |        | target directory relative to root                                                      | `./`             |
| `--indexFile`             |        | filename of the generated index                                                        | `false`          |
| `--cjs`                   |        | output commonjs modules (`.js`)                                                        | `false`          |
| `--esm`                   |        | output esm modules (`.mjs`)                                                            | `false`          |
| `--css`                   |        | output transpiled css files (`.css`)                                                   | `false`          |
| `--stcss`                 |        | output stylable source files (`.st.css`)                                               | `false`          |
| `--dts`                   |        | output definition files for the stylable source files (`.st.css.d.ts`)                 | `false`          |
| `--dtsSourceMap`          |        | output source-maps for the definitions of stylable source files (`.st.css.d.ts.map`)   | `true` if `--dts` is true, otherwise `false` |
| `--watch`                 |  `w`   | enable watch mode                                                                      | `false`          |
| `--config`                 |  `c`   | The path to a config file specifying how to build and output Stylable stylesheets                                                                      | The directory containing the config file is assumed to be the "rootDir" for the project named "stylable.config.js"         |
| `--useNamespaceReference` | `unsr` | mark output stylable source files with relative path for namespacing purposes (\*)     | `false`          |
| `--customGenerator`       |        | path of a custom index file generator                                                  | -                |
| `--ext`                   |        | extension of stylable css files                                                        | `.st.css`        |
| `--cssInJs`               |        | output transpiled css into the js module                                               | `false`          |
| `--cssFilename`           |        | pattern of the generated css file                                                      | `[filename].css` |
| `--injectCSSRequest`      | `icr`  | add a static import for the generated css in the js module output                      | `false`          |
| `--namespaceResolver`     | `nsr`  | node request to a module that exports a stylable resolveNamespace function             | `@stylable/node` |
| `--require`               | `r`    | require hook to execute before running                                                | `-`              |
| `--optimize`              | `o`    | removes: empty nodes, stylable directives, comments                                    | `false`          |
| `--minify`                | `m`    | minify generated css                                                                   | `false`          |
| `--log`                   |        | verbose log                                                                            | `false`          |
| `--diagnostics`           |        | print verbose diagnostics                                                              | `true`           |
| `--diagnosticsMode`       |        | determine the diagnostics mode. if strict process will exit on any exception, loose will attempt to finish the process regardless of exceptions                         | `false`          |
| `--help`                  | `h`    | Show help                                                                              | `boolean`                                    |

`*` - For the `useNamespaceReference` flag to function properly, the `source` folder must be published in addition to the output `target` code

### Configuration file

The `stc` configuration should be located in the `stylable.config.js` file under the property name `stcConfig`.
The CLI provides a helper method and type definitions to provide a better configuration experience.

```js
const { stcConfig } = require('@stylable/cli');

// This can be an object or a method that returns an object.
exports.stcConfig = stcConfig({
    options: {
        // BuildOptions
    }
});
```

#### Build options
```ts

export interface BuildOptions {
    /** specify where to find source files */
    srcDir: string;
    /** specify where to build the target files */
    outDir: string;
    /** should the build need to output manifest file */
    manifest?: string;
    /** generates Stylable index file for the given name, the index file will reference Stylable sources from the `srcDir` unless the `outputSources` option is `true` in which case it will reference the `outDir` */
    indexFile?: string;
    /** custom cli index generator class */
    IndexGenerator?: typeof IndexGenerator;
    /** output commonjs module (.js) */
    cjs?: boolean;
    /** output esm module (.mjs) */
    esm?: boolean;
    /** template of the css file emitted when using outputCSS */
    outputCSSNameTemplate?: string;
    /** should include the css in the generated JS module */
    includeCSSInJS?: boolean;
    /** should output build css for each source file */
    outputCSS?: boolean;
    /** should output source .st.css file to dist */
    outputSources?: boolean;
    /** should add namespace reference to the .st.css copy  */
    useNamespaceReference?: boolean;
    /** should inject css import in the JS module for the generated css from outputCSS */
    injectCSSRequest?: boolean;
    /** should apply css optimizations */
    optimize?: boolean;
    /** should minify css */
    minify?: boolean;
    /** should generate .d.ts definitions for every stylesheet */
    dts?: boolean;
    /** should generate .d.ts.map files for every .d.ts mapping back to the source .st.css.
     * It will use the origin file path unless `outputSources` is true, then it will use the outputted file path as the source-map source.
     */
    dtsSourceMap?: boolean;
    /** should emit diagnostics */
    diagnostics?: boolean;
    /** determine the diagnostics mode. if strict process will exit on any exception, loose will attempt to finish the process regardless of exceptions */
    diagnosticsMode?: DiagnosticsMode;
}
```

### Generating an index file

This generates an `index.st.css` file that acts as an export entry from every stylesheet in the provided `srcDir`.

```sh
$ stc --srcDir="./src" --outDir="./dist" --indexFile="index.st.css"
```

The generated index file will include re-exports of all stylesheet roots found in the given `srcDir` path.

#### Generating a custom index file

Exporting a `Generator` named export class from a file will allow it to be used as a `customGenerator`.

Usually this generator will inherit from our base generator class and override the `generateReExports` and `generateIndexSource` methods.

This example demonstrates the default generator behavior (only exports stylesheet roots): 
```ts
import { Generator as Base, ReExports } from '@stylable/cli';

export class Generator extends Base {
    public generateReExports(filePath): ReExports {
        return {
            root: this.filename2varname(filePath),
            parts: {},
            keyframes: {},
            stVars: {},
            vars: {},
        };
    }    
    protected generateIndexSource(indexFileTargetPath: string) {
        const source = super.generateIndexSource(indexFileTargetPath);
        return '@st-namespace "INDEX";\n' + source;
    }
}
```

* See our [named exports generator](./test/fixtures/named-exports-generator.ts) for a more complete example that re-exports every symbol from every stylesheet found in the generated index file.

### Build source stylesheets to JavaScript modules

To transform your project stylesheets to target JavaScript modules containing the transformed source files, you must provide the `indexFile` parameter with an empty string.

```sh
$ stc --srcDir="./src" --outDir="./dist"
```

## Multiple Projects

Projects allow sharing `stc` configurations and management of Stylable projects in one location. They provides a controllable and predictable build order with caching optimizations.

```ts
export interface MultipleProjectsConfig<PRESET extends string> {
    options?: PartialBuildOptions;
    presets?: Presets<PRESET>;
    projects: Projects<PRESET>;
    projectsOptions?: {
        resolveRequests?: ResolveRequests;
    };
}
```

> Example for simple monorepo with Stylable packages
```js
const { stcConfig } = require('@stylable/cli');

exports.stcConfig = stcConfig({
    options: {
        srcDir: './src',
        outDir: './dist',
        outputSources: true,
        cjs: false,
        useNamespaceReference: true, 
    },
    projects: ['packages/*']
});

```

### Options

Similar to a [single project](#configuration-file), `options` is the top-level `BuildOptions` and is the default options for each project.

### Projects

**Projects** is a generic term that refers to a set of path requests that define single or multiple `BuildOptions`.\
This set of requests is being processed and then evaluated as a map of `projectRoot` (directory path) to a set of `BuildOptions`.

By default, the request is a path to a package, and in order to make the correct topological sort, the dependency needs to be specified in each package `package.json`

As mentioned above, the value of a request can be resolved to a single or multiple `BuildOptions`.

```jsonc
{
    //...
    projects: {
        "packages/*": { 
            // ...BuildOptions
        },
        "other-package/*": [
            { /* #1 ...BuildOptions */ }, 
            { /* #2 ...BuildOptions */ }, 
        ]
    }
    //...
}
```

> The full types specification for defining Projects
```ts
export type Projects =
    | Array<string | [string, ProjectEntryValues]>
    | Record<string, ProjectEntryValues>;

export type ProjectEntryValues<PRESET extends string> =
    | ProjectEntryValue<PRESET>
    | Array<ProjectEntryValue<PRESET>>;

export type ProjectEntryValue<PRESET extends string> =
    | PRESET
    | PartialBuildOptions
    | {
          preset?: PRESET;
          presets?: Array<PRESET>;
          options: PartialBuildOptions;
      };
```



### Presets

To reuse `BuildOptions`, define them using a name under the `presets` property and use them as the project entry value.

```js
exports.stcConfig = {
    //...
    presets: {
        firstPreset: {/* ...BuildOptions */},
        secondPreset: {/* ...BuildOptions */},
    },
    projects: {
        'packages/*': ['firstPreset', 'secondPreset']
    }

};
```

### Projects Options

These options control the projects resolution process.

#### resolveRequests [Function] *(Advanced usage)*

Default: `resolveNpmRequests`

This method is used to resolve the Projects `requests` (e.g. 'packages/*' in the example) to the actual `projectRoot`s (absolute path to the relevant projects).

The order of the resolved entities will be the order of the builds.

## Usage `stc-format`

After installing `@stylable/cli`, the `stc-format` command will be available, running `stc-format --help` will provide a brief description for the options available.

| Option                        | Alias | Description                                                   | Value Type    | Default Value                 |
| ----------------------------- | ----- | ------------------------------------------------------------- | --------------| ----------------------------- |
| `--target`                    | `T`   | file or directory to format                                   | `string`      | `current working directory`   |
| `--endWithNewline`            | `n`   | End output with newline                                       | `boolean`     | `false`                       |
| `--indentEmptyLines`          | `E`   | Keep indentation on empty lines                               | `boolean`     | `false`                       |
| `--indentSize`                | `s`   | Indentation size                                              | `number`      | `4`                           |
| `--indentWithTabs`            | `t`   | Indent with tabs, overrides -s and -c                         | `boolean`     | `false`                       |
| `--maxPerserveNewlines`       | `m`   | Maximum number of line-breaks to be preserved in one chunk    | `number`      | `1`                           |
| `--newlineBetweenRules`       | `N`   | Add a newline between CSS rules                               | `boolean`     | `true`                        |
| `--perserveNewlines`          | `p`   | Preserve existing line-breaks                                 | `boolean`     | `true`                        |
| `--selectorSeparatorNewline`  | `L`   | Add a newline between multiple selectors                      | `boolean`     | `true`                        |
| `--debug`                     | `D`   | Enable explicit debug log (overrides --silent)                | `boolean`     | `false`                       |
| `--silent`                    | `S`   | Will not print any messages to the log                        | `boolean`     | `false`                       |
| `--require`                   | `r`   | require hooks                                                 | `array`       | `[]`                          |
| `--help`                      | `h`   | Show help                                                     | `boolean`     |                               |
| `--version`                   | `v`   | Show version number                                           | `boolean`     |                               |

### Experimental formatter

A new experimental formatter is available using the `--experimental` argument.

Currently not all configuration is accepted by the new formatter, the supported formatting options arguments are `--endWithNewline`, `--indentSize`, and a new `--wrapLineLength`.

### Formatting the source directory

```sh
$ stc-format --target ./src
```


## Usage `stc-codemod`

After installing `@stylable/cli`, the `stc-codemod` command will be available, running `stc-codemod --help` will provide a brief description for the options available.

### Usage with `npx`

It is possible to run the codemod cli with npx with the following command

```bash
npx -p @stylable/cli stc-codemod --help
```

| Option                        | Alias | Description                                                   | Value Type    | Default Value                 |
| ----------------------------- | ----- | ------------------------------------------------------------- | --------------| ----------------------------- |
| `--rootDir`                   | `d`   | Root directory of a project                                   | `string`      | `current working directory`   |
| `--mods`                      | `m`   | Array of builtin codemods to execute                          | `array`       | `[]`                          |
| `--external`                  | `e`   | Array of external codemod requests to execute                          | `array`       | `[]`                          |
| `--require`                   | `r`   | require hooks                                                 | `array`       | `[]`                          |
| `--help`                      | `h`   | Show help                                                     | `boolean`     |                               |


#### builtin codemods

- `st-import-to-at-import` - Convert `:import` to `@st-import` syntax.
> Note that this codemod does not preserve comments inside the `:import` 

- `st-global-custom-property-to-at-property` - Convert deprecated `@st-global-custom-property *;` to `@property st-global(*);` syntax.

- `namespace-to-st-namespace` - Converts `@namespace` that would have been used as Stylable namespace configuration to `@st-namespace`.

### Provide an external codemod

Codemods are transformation operations for code based on AST.

The contract for external codemods is that any requested module (`cjs`) will provide a `module.export.codemods` which is an iterable with the following signature: 

```ts
interface CodeModResponse {
    changed: boolean;
}

type Codemods = Iterable<{ id: string, apply: CodeMod }>;

type CodeMod = (context: CodeModContext) => CodeModResponse;

interface CodeModContext {
    ast: Root;
    diagnostics: Diagnostics;
    postcss: Postcss;
}
```
> Codemod ids should be namespaced to avoid collision.

#### Basic codemod example

```ts
module.exports.codemods = [
    {
        id: 'banner', 
        apply({ ast, postcss }) { 
            ast.prepend(postcss.comment({text: 'Hello Codemod'}));
            
            return {
                changed: true
            }
        }
    }
]
```
## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [MIT license](./LICENSE).

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

| Option                    | Alias  | Description                                                                            | Default Value    |
| ------------------------- | ------ | ----------------------------------------------------------------------------------     | ---------------- |
| `--version`               |  `v`   | show CLI version number                                                                | `boolean`        |
| `--rootDir`               |        | root directory of project                                                              | `cwd`            |
| `--srcDir`                |        | source directory relative to root                                                      | `./`             |
| `--outDir`                |        | target directory relative to root                                                      | `./`             |
| `--indexFile`             |        | filename of the generated index                                                        | `false`          |
| `--cjs`                   |        | output commonjs modules (`.js`)                                                        | `true`           |
| `--esm`                   |        | output esm modules (`.mjs`)                                                            | `false`          |
| `--css`                   |        | output transpiled css files (`.css`)                                                   | `false`          |
| `--stcss`                 |        | output stylable source files (`.st.css`)                                               | `false`          |
| `--dts`                   |        | output definition files for the stylable source files (`.st.css.d.ts`)                 | `false`          |
| `--dtsSourceMap`          |        | output source-maps for the definitions of stylable source files (`.st.css.d.ts.map`)   | `true` if `--dts` is true, otherwise `false` |
| `--watch`                 |  `w`   | enable watch mode                                                                      | `false`          |
| `--useNamespaceReference` | `unsr` | mark output stylable source files with relative path for namespacing purposes (\*)     | `false`          |
| `--customGenerator`       |        | path of a custom index file generator                                                  | -                |
| `--ext`                   |        | extension of stylable css files                                                        | `.st.css`        |
| `--cssInJs`               |        | output transpiled css into the js module                                               | `false`          |
| `--cssFilename`           |        | pattern of the generated css file                                                      | `[filename].css` |
| `--injectCSSRequest`      | `icr`  | add a static import for the generated css in the js module output                      | `false`          |
| `--namespaceResolver`     | `nsr`  | node request to a module that exports a stylable resolveNamespace function             | `@stylable/node` |
| `--require`               | `r`    | require hook to execture before running                                                | `-`              |
| `--optimize`              | `o`    | removes: empty nodes, stylable directives, comments                                    | `false`          |
| `--minify`                | `m`    | minify generated css                                                                   | `false`          |
| `--log`                   |        | verbose log                                                                            | `false`          |
| `--diagnostics`           |        | print verbose diagnostics                                                              | `true`           |
| `--diagnosticsMode`       |        | determine the diagnostics mode. if strict process will exit on any exception, loose will attempt to finish the process regardless of exceptions                         | `false`          |
| `--help`                  | `h`    | Show help                                                                              | `boolean`                                    |

`*` - For the `useNamespaceReference` flag to function properly, the `source` folder must be published in addition to the output `target` code

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
        return '@namespace "INDEX";\n' + source;
    }
}
```

* See our [named exports generator](./test/fixtures/named-exports-generator.ts) for a more complete example that re-exports every symbol from every stylesheet found in the generated index file.

### Build source stylesheets to JavaScript modules

To transform your project stylesheets to target JavaScript modules containing the transformed source files, you must provide the `indexFile` parameter with an empty string.

```sh
$ stc --srcDir="./src" --outDir="./dist"
```

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

### Formatting the source directory

```sh
$ stc-format --target ./src
```


## Usage `stc-codemod`

After installing `@stylable/cli`, the `stc-codemod` command will be available, running `stc-codemod --help` will provide a brief description for the options available.

| Option                        | Alias | Description                                                   | Value Type    | Default Value                 |
| ----------------------------- | ----- | ------------------------------------------------------------- | --------------| ----------------------------- |
| `--rootDir`                   | `d`   | Root directory of a project                                   | `string`      | `current working directory`   |
| `--mods`                      | `m`   | Array of builtin codemods to execute                          | `array`       | `[]`                          |
| `--external`                  | `e`   | Array of external codemod to execute                          | `array`       | `[]`                          |
| `--require`                   | `r`   | require hooks                                                 | `array`       | `[]`                          |
| `--help`                      | `h`   | Show help                                                     | `boolean`     |                               |


### Provide an external codemod

Codemods are transform operations for code based on AST.

The contract of the external codemod is that the requested module (cjs) will provide module.export.codemods which is an iterable with the following signature: 

```ts
type Codemods = Iterable<{ id: string, apply: CodeModApply }>;
type CodeModApply = (ast: postcss.Root, diagnostics: Diagnostics, context: { postcss: Postcss }) => void;
```

#### Basic codemod example

```ts
module.exports.codemods = [
    {id: 'banner', apply(ast, _, { postcss }){ ast.prepend(postcss.comment({text: 'Hello Codemod'})) }}
]
```

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [MIT license](./LICENSE).

# @stylable/json-schema

[![npm version](https://img.shields.io/npm/v/@stylable/json-schema.svg)](https://www.npmjs.com/package/@stylable/json-schema)

`@stylable/json-schema` is a utility that allows you to transform Stylable stylesheets into [JSON-Schema](https://json-schema.org/) compatible 

## Installation

```sh
yarn add @stylable/json-schema
```
## Usage
Import the `extractSchema` utility function from `@stylable/json-schema`, and invoke it.
The `extractSchema` function receives four arguments, `css`, `filePath`, `rootPath` and `path`. 

css: string, filePath: string, root: string, path: MinimalPath

```ts
import { extractSchema } from '@stylable/json-schema';
import * as path from 'path';

const schema = extractSchema('.root {}', '/src/stylesheet.st.css', '/src', path);
```

### Arguments
|Name|Type|Description|
|-------------|----|-----------|
|css|string|CSS content to be processed and extracted|
|filePath|string|path to the file currently being extracted|
|basePath|string|path to the root of the project. all generated paths will be absolute to this base path|
|path|[MinimalPath](#MinimalPath)|`path` object containing a minimal set of required utility methods|

#### MinimalPath

```ts
export interface MinimalPath {
    dirname:    (p: string) => string;
    join:       (...paths: string[]) => string;
    isAbsolute: (path: string) => boolean;
    relative:   (from: string, to: string) => string;
}
```

## Example
For the entry point `entry.st.css`, the following JSON will be generated.

### Source
```css
/* ./entry.st.css */
:import {
    -st-from: '/imported.st.css';
    -st-default: Comp;
    -st-named: part;
}
:vars {
    myColor: red;
}
.root {
    -st-extends: Comp;
}
.otherPart {
    -st-extends: part;
}
```

```css
/* ./imported.st.css */
.root {}
.part {}
```

### Target
```JSON
{
    "$id": "/entry.st.css",
    "$ref": "stylable/module",
    "properties": {
        "root": {
            "$ref": "stylable/class",
            "states": {
                "userSelected": {
                    "type": "boolean"
                }
            },
            "extends": {
                "$ref": "/imported.st.css#root"
            }
        },
        "Comp": {},
        "part": {},
        "myColor": {
            "$ref": "stylable/var"
        },
        "otherPart": {
            "$ref": "stylable/class",
            "states": {
                "size": {
                    "type": "enum",
                    "enum": [
                        "s",
                        "m",
                        "l"
                    ]
                }
            },
            "extends": {
                "$ref": "/imported.st.css#part"
            }
        }
    }
}
```

<!-- ## License

Copyright (c) 2018 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE). -->


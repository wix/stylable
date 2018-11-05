# @stylable/json-schema

[![npm version](https://img.shields.io/npm/v/@stylable/json-schema.svg)](https://www.npmjs.com/package/@stylable/json-schema)

`@stylable/json-schema` is a utility that allows you to transform Stylable stylesheets into [JSON-Schema](https://json-schema.org/) compatible format.

## Installation

```sh
yarn add @stylable/json-schema
```
## Usage
Import the `extractSchema` utility function from `@stylable/json-schema`, and invoke it.
The `extractSchema` function receives four arguments, `css`, `filePath`, `rootPath` and `path`. 

### Arguments
|Name|Type|Description|
|-------------|----|-----------|
|css|string|CSS content to be processed and extracted|
|filePath|string|absolute path to the file currently being extracted|
|basePath|string|absolute path to the root of the project. all generated paths will be absolute to this base path|
|path|[MinimalPath](#MinimalPath)|`path` object containing a minimal set of required utility methods|

#### MinimalPath interface

```ts
export interface MinimalPath {
    dirname:    (p: string) => string;
    join:       (...paths: string[]) => string;
    isAbsolute: (path: string) => boolean;
    relative:   (from: string, to: string) => string;
}
```

## Example
Usage example for `extractSchema`.

```ts
import fs from 'fs';
import path from 'path';
import { extractSchema } from '@stylable/json-schema';

const filePath = path.join(__dirname, 'src/entry.st.css');
const css = fs.readFileSync(filePath, 'utf8');

const stylesheetSchema = extractSchema(
    css,
    filePath,
    __dirname,
    path
);
```

### Source
```css
/* ~/myproject/src/entry.st.css */
:import {
    -st-from: './imported.st.css';
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

### Result
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


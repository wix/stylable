# @stylable/json-schema

[![npm version](https://img.shields.io/npm/v/@stylable/json-schema.svg)](https://www.npmjs.com/package/@stylable/json-schema)

`@stylable/json-schema` is a utility that allows you to transform Stylable stylesheets into [JSON-Schema](https://json-schema.org/) compatible 

## Installation

```sh
yarn add @stylable/json-schema
```
## Usage
Import the `extractSchema` utility function from `@stylable/json-schema`, and invoke it.
The `extractSchema` function receives two arguments, `meta` and `basePath`. 

```ts
import { extractSchema } from '@stylable/json-schema';

const { meta } = stylable.transform(stylable.process(filePath));

const schema = extractSchema(meta, './app/');
```

### Arguments
|Name|Type|Description|
|-------------|----|-----------|
|meta|[StylableMeta](../core/src/stylable-meta.ts)|Processed stylesheet to be converted|
|basePath|string|generated paths will be relative to this path|

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


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

<!-- ## License

Copyright (c) 2018 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE). -->


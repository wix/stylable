# @stylable/jest

[![npm version](https://img.shields.io/npm/v/@stylable/jest.svg)](https://www.npmjs.com/package/@stylable/jest)

`@stylable/jest` is a simple integration that allows testing your **Stylable**  React components using [Jest](https://jestjs.io/). 

## Installation
This package is still a work-in-progress within the **Stylable** mono-repo. Once it matures, further details will be added here.

## Usage

Use the `process` utility imported from `@stylable/jest` to configure your Jest setup to support **Stylable** stylesheets, turning them into resolvable modules.

> Note: Jest should also be configured to ignore `.st.css` files in its transformations.

```ts
const { process } = require('@stylable/jest');

const config = merge(jestProjectConfig, {
  transform: {
    '\\.jsx?$': require.resolve('babel-jest'),
    '\\.st.css?$': process,
  },
});

config.transformIgnorePatterns = (config.transformIgnorePatterns || [])
  .concat(['/node_modules/(?!(.*?\\.st\\.css$))']);
```

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE).


# @stylable/jest

[![npm version](https://img.shields.io/npm/v/@stylable/jest.svg)](https://www.npmjs.com/package/@stylable/jest)

`@stylable/jest` is a simple integration that allows testing your Stylable React components using [Jest](https://jestjs.io/).

## Installation

This package is still a work-in-progress within the Stylable mono-repo. Once it matures, further details will be added here.

## Usage

Add the transformation to the `jest.config.js` file:

```js
module.exports = {
  transform: {
    '\\.st\\.css?$': require.resolve('@stylable/jest'),
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(.*?\\.st\\.css$))', // libraries publish .st.css files in their dist
  ],
};
```

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE).

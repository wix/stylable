# @stylable/jest

[![npm version](https://img.shields.io/npm/v/@stylable/jest.svg)](https://www.npmjs.com/package/@stylable/jest)

`@stylable/jest` is a simple integration that allows testing your Stylable React components using [Jest](https://jestjs.io/).

## Installation

Install `@stylable/jest` as a dev dependency in your local project.

Install using npm:
```bash
npm install @stylable/jest --save-dev
```

Install using yarn:
```bash
yarn add @stylable/jest --dev
```

## Usage

Add the transformer to your `jest.config.js` file:

```js
module.exports = {
  transform: {
    '\\.st\\.css?$': '@stylable/jest',
  }
};
```

### Configuring Stylable options

See the interface for `StylableConfig` [here](https://github.com/wix/stylable/blob/master/packages/core/src/stylable.ts).

```js
module.exports = {
  transform: {
    '\\.st\\.css?$': ['@stylable/jest', { stylable: { /* Stylable options */ } }],
  }
};
```

### Ignore Stylable files from exsiting css integrations
To prevent existing CSS integrations from affecting Stylable files, ignore '.st.css' in the integration configuration.

Change: 
```js
"moduleNameMapper": {
  "\\.(css|scss)$": "SOME_MOCK_PATH"
},
```
To:
```js
"moduleNameMapper": {
  "(?<!\\.st)\\.(css|scss)$": "SOME_MOCK_PATH"
},
```

### Ignoring `node_modules` stylesheets

To disable transformation for stylehseets originating from your `node_modules` add the following configuration:

```js
module.exports = {
  // existing configuration...
  
  transformIgnorePatterns: [
    '/node_modules/(?!(.*?\\.st\\.css$))', // libraries publish .st.css files in their dist
  ],
};
```

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [MIT license](./LICENSE).

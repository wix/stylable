# @stylable/e2e-test-kit

[![npm version](https://img.shields.io/npm/v/@stylable/e2e-test-kit.svg)](https://www.npmjs.com/package/@stylable/e2e-test-kit)

`@stylable/e2e-test-kit` serves as a collection of tools to help test Stylable components and applications. It offers various capabilities to bundle, run and test your project in memory, or in the browser.

### `StylableProjectRunner`

Used to setup an E2E test project with `@stylable/webpack-plugin` and `puppeteer`. This allows testing an entire project setup, including stylable configuration, webpack configuration and the process of transpiling the project, performing your tests against a running browser.

You can find a set of example configuration setups [here](./packages/webpack-plugin/test/e2e).

### `getStyleElementsMetadata`

A puppeteer helper function aimed at extracting Stylable styling from the DOM for testing purposes.

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE).

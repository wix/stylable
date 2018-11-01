![Stylable CSS for Components](./stylable.svg)

[![Travis Build Status](https://travis-ci.org/wix/stylable.svg?branch=master)](https://travis-ci.org/wix/stylable)
[![AppVoyer Build Status](https://ci.appveyor.com/api/projects/status/32r7s2skrgm9ubva?svg=true)](https://ci.appveyor.com/project/AlexShemeshWix/stylable)

**Stylable** enables you to write reusable, highly-performant components. Each component exposes a style API that maps its internal parts so you can reuse components across teams without sacrificing stylability.

* Scopes styles to components so they don't "leak" and clash with other styles.
* Enables custom pseudo-classes and pseudo-elements that abstract the internal structure of a component. These can then be styled externally.
* Cuts down on the resulting CSS bundles using "rule-shaking" and other optimizations

At build time, the preprocessor converts the Stylable CSS into a minimal, flat, static, valid vanilla CSS that works cross-browser.

Learn more in our [Documentation Center](https://stylable.io/).

## Installation

There are two options for installing Stylable:

* Create a new project based on Stylable [react-scripts](./packages/react-scripts), using [create-react-app](https://github.com/facebook/create-react-app)
* Install Stylable and its [webpack plugin](./packages/webpack-plugin) to an existing webpack based project

For details on both options, see [Install & Configure](https://stylable.io/docs/getting-started/install-configure).

## Demos
* [Mr. Potato Bruce](https://github.com/wix/potato-bruce) - A small app showcasing Stylable, created using [@stylable/react-scripts](./packages/react-scripts)
* [Manual Vue Integration](https://github.com/wix-playground/stylable-vue-example) - Simple example showing how to manually integrate Stylable into a Vue project (proof of concept)
* [Various webpack project setups](./packages/webpack-plugin/test/e2e/projects) - An example of possible webpack configurations

## Repository Structure
This repository is a `mono-repo` containing multiple `packages` that together comprise the Stylable ecosystem. It uses [Lerna](https://lernajs.io/) and [Yarn workspaces](https://yarnpkg.com/lang/en/docs/workspaces/) to manage the various packages and their dependencies.

### Core

|Package Name|Published Name|Latest Version|Description|
|------------|--------------|:-------:|-----------|
|[core](./packages/core)|`@stylable/core`|[![npm version](https://img.shields.io/npm/v/@stylable/core.svg)](https://www.npmjs.com/package/@stylable/core)|Core CSS preprocessor|
|[runtime](./packages/runtime)|`@stylable/runtime`|[![npm version](https://img.shields.io/npm/v/@stylable/runtime.svg)](https://www.npmjs.com/package/@stylable/runtime)|Runtime browser code|

### Tooling & Utilities

|Package Name|Published Name|Latest Version|Description|
|------------|--------------|:------------:|-----------|
|[e2e-test-kit](./packages/e2e-test-kit)|`@stylable/e2e-test-kit`|[![npm version](https://img.shields.io/npm/v/@stylable/e2e-test-kit.svg)](https://www.npmjs.com/package/@stylable/e2e-test-kit)|`webpack` project runner used for `E2E` testing |
|[dom-test-kit](./packages/dom-test-kit)|`@stylable/dom-test-kit`|[![npm version](https://img.shields.io/npm/v/@stylable/dom-test-kit.svg)](https://www.npmjs.com/package/@stylable/dom-test-kit)|Stylable DOM related testing utils |
|[cli](./packages/cli)|`@stylable/cli`|[![npm version](https://img.shields.io/npm/v/@stylable/cli.svg)](https://www.npmjs.com/package/@stylable/cli)|Used for managing Stylable stylesheets in a project|
|[react-scripts](./packages/react-scripts)|`@stylable/react-scripts`|[![npm version](https://img.shields.io/npm/v/@stylable/react-scripts.svg)](https://www.npmjs.com/package/@stylable/react-scripts)|`create-react-app` boilerplate generator scripts|
|[stylable.io](./packages/stylable.io)|unpublished to `npm`|-|source for [stylable.io](http://stylable.io)|
|[json-schema](./packages/json-schema)|`@stylable/json-schema`|[![npm version](https://img.shields.io/npm/v/@stylable/json-schema.svg)](https://www.npmjs.com/package/@stylable/json-schema)|JSON Schema convertor for Stylable stylesheets|

### Integrations

|Package Name|Published Name|Latest Version|Description|
|------------|--------------|:------------:|-----------|
|[jest](./packages/jest)|`@stylable/jest`|[![npm version](https://img.shields.io/npm/v/@stylable/jest.svg)](https://www.npmjs.com/package/@stylable/jest)|Jest Stylable processor plugin |
|[node](./packages/node)|`@stylable/node`|[![npm version](https://img.shields.io/npm/v/@stylable/node.svg)](https://www.npmjs.com/package/@stylable/node)|`require` hook and Node module factory |
|[webpack-extensions](./packages/webpack-extensions)|`@stylable/webpack-extensions`|[![npm version](https://img.shields.io/npm/v/@stylable/webpack-extensions.svg)](https://www.npmjs.com/package/@stylable/webpack-extensions)|Experimental features for `webpack` integration|
|[webpack-plugin](./packages/webpack-plugin)|`@stylable/webpack-plugin`|[![npm version](https://img.shields.io/npm/v/@stylable/webpack-plugin.svg)](https://www.npmjs.com/package/@stylable/webpack-plugin)|`webpack` (`v4.x`) integration plugin|

### External Packages
|Package Name|Description|
|------------|-----------|
|[stylable-intelligence](https://github.com/wix/stylable-intelligence)|VSCode extension providing language services for Stylable

## Contributing

Read our [contributing guidelines](./CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE).

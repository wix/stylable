![Stylable CSS for Components](./stylable.svg)

[![Travis Build Status](https://travis-ci.org/wix/stylable.svg?branch=master)](https://travis-ci.org/wix/stylable)
[![AppVoyer Build Status](https://ci.appveyor.com/api/projects/status/32r7s2skrgm9ubva?svg=true)](https://ci.appveyor.com/project/AlexShemeshWix/stylable)

**Stylable** enables you to write reusable, highly-performant components. Each component exposes a style API that maps its internal parts so you can reuse components across teams without sacrificing stylability.

* Scopes styles to components so they don't "leak" and clash with other styles.
* Enables custom pseudo-classes and pseudo-elements that abstract the internal structure of a component. These can then be styled externally.
* Cuts down on the resulting CSS bundles using "rule-shaking" and other optimizations

At build time, the preprocessor converts the **Stylable** CSS into a minimal, flat, static, valid vanilla CSS that works cross-browser.

Learn more in our [Documentation Center](https://stylable.io/).

## Installation

There are two options for installing **Stylable**:

* Create a new project based on **Stylable** [stylable-scripts](./packages/stylable-scripts), using [create-react-app](https://github.com/facebook/create-react-app)
* Install **Stylable** and its [webpack plugin](./packages/stylable-webpack-plugin) to an existing webpack based project

For details on both options, see [Install & Configure](https://stylable.io/docs/getting-started/install-configure).

## Demos
* [Mr. Potato Bruce](https://github.com/wix/potato-bruce) - A small app showcasing Stylable, created using [stylable-scripts](./packages/stylable-scripts)
* [Manual Vue Integration](https://github.com/wix-playground/stylable-vue-example) - Simple example showing how to manually integrate Stylable into a Vue project (proof of concept)
* [Various webpack project setups](./packages/stylable-webpack-plugin/test/e2e/projects) - An example of possible webpack configurations

## Repository Structure
This repository is a `mono-repo` containing multiple `packages` that together comprise the **Stylable** ecosystem. It uses [Lerna](https://lernajs.io/) and [Yarn workspaces](https://yarnpkg.com/lang/en/docs/workspaces/) to manage the various packages and their dependencies.

### Core

|Package Name|Published Name|Description|
|------------|--------------|-----------|
|[stylable](./packages/stylable)|`stylable`|Core CSS preprocessor|
|[stylable-runtime](./packages/stylable-runtime)|`stylable-runtime`|Runtime browser code|

### Tooling & Utilities

|Package Name|Published Name|Description|
|------------|--------------|-----------|
|[e2e-test-kit](./packages/e2e-test-kit)|`@stylable/e2e-test-kit`|`webpack` project runner used for `E2E` testing |
|[stylable-cli](./packages/stylable-cli)|`stylable-cli`|Used for managing **Stylable** stylesheets in a project|
|[stylable-scripts](./packages/stylable-scripts)|`stylable-scripts`|`create-react-app` boilerplate generator scripts|

### Integrations

|Package Name|Published Name|Description|
|------------|--------------|-----------|
|[stylable-jest](./packages/stylable-jest)|`stylable-jest`|Jest **Stylable** processor plugin |
|[stylable-node](./packages/stylable-node)|`@stylable/node`|`require` hook and Node module factory |
|[stylable-webpack-extensions](./packages/stylable-webpack-extensions)|`@stylable/webpack-extensions`|Experimental features for `webpack` integration|
|[stylable-webpack-plugin](./packages/stylable-webpack-plugin)|`stylable-webpack-plugin`|`webpack` (`v4.x`) integration plugin|

### External Packages
|Package Name|Description|
|------------|-----------|
|[stylable-intelligence](https://github.com/wix/stylable-intelligence)|VSCode extension providing language services for **Stylable**

> Note: Stylable is in the process of [migrating](https://github.com/wix/stylable/issues/361) to a [scoped package](https://docs.npmjs.com/misc/scope) project structure on NPM, hence some packages are published with `@stylable/*` while some are not. Eventually all packages will be published under the `@stylable` scope.

## Contributing

Read our [contributing guidelines](./CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE).

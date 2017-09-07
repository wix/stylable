![Stylable CSS for Components](./branding/logo/PNG/96-logo-horizontal.png)

[![npm version](https://badge.fury.io/js/stylable.svg)](https://www.npmjs.com/package/stylable)
[![Build Status](https://travis-ci.org/wix/stylable.svg?branch=master)](https://travis-ci.org/wix/stylable)

**Stylable** enables you to build reusable, highly-performant components. Each component exposes a style API that maps its internal parts so you can reuse components across teams without sacrificing stylability.

* Scopes styles to components so they don't "leak" and clash with other styles.
* Enables custom pseudo-classes and pseudo-elements that abstract the internal structure of a component. These can then be styled externally.
* Uses themes so you can apply different look and feel across your web application.

At build time, the preprocessor converts the **Stylable** CSS into flat, static, valid vanilla CSS that works cross-browser.

Learn more in our [Documentation Center](https://wix.github.io/stylable/).
Or read our story [here](./docs/README.md) in GitHub.

<!-- ## Code Example -->

## Installation

Install **Stylable** as a dependency in your local project.

Using npm:
```bash
npm install stylable --save
```
Using yarn:
```bash
yarn add stylable
```

While the **stylable** package includes a programmatic API and can be used directly, we strongly suggest using
the **stylable-integration** package that powers and enables using the `.st.css` files in your project's build cycle:
https://github.com/wixplosives/stylable-integration

## Component Library

**Stylable** includes a rich [component library](https://github.com/wix/stylable-components) for out-of-the-box use.

## Contributing

Read our [contributing guidelines](./CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE.md).

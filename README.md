![Stylable CSS for Components](./site/branding/logo/SVG/96-logo-horizontal.svg)

[![npm version](https://badge.fury.io/js/stylable.svg)](https://www.npmjs.com/package/stylable)
[![Build Status](https://travis-ci.org/wix/stylable.svg?branch=master)](https://travis-ci.org/wix/stylable)

**Stylable** enables you to write reusable, highly-performant components. Each component exposes a style API that maps its internal parts so you can reuse components across teams without sacrificing stylability.

* Scopes styles to components so they don't "leak" and clash with other styles.
* Enables custom pseudo-classes and pseudo-elements that abstract the internal structure of a component. These can then be styled externally.
* Uses themes so you can apply different look and feel across your web application.

At build time, the preprocessor converts the **Stylable** CSS into flat, static, valid vanilla CSS that works cross-browser.

Learn more in our [Documentation Center](https://stylable.io/).

<!-- ## Code Example -->

## Installation

There are two options for installing **Stylable**:
* Write your own project based on a **Stylable** boilerplate 
* Install **Stylable** to work with an existing project as follows:

Install **stylable** and **stylable-integration** as a dependency in your local project.

Using npm:
```bash
npm install stylable stylable-integration --save-dev
```
Using Yarn:
```bash
yarn add stylable stylable-integration
```
For details on both options, see [Install & Configure](https://stylable.io/docs/getting-started/install-configure).


## Contributing

Read our [contributing guidelines](./CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## Updating Documentation
To update the documentation on [Stylable.io](http://www.stylable.io), follow the instructions [here](./updating-docs.md).

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE.md).

## Spirit 

The spirit of the project is best captured in the following video: 

<a href="http://www.youtube.com/watch?feature=player_embedded&v=jK88TqyXSWs
" target="_blank"><img src="http://img.youtube.com/vi/jK88TqyXSWs/0.jpg" 
alt="Stylable Musicale" width="240" height="180" border="10" /></a>


# @stylable/react-scripts

[![npm version](https://img.shields.io/npm/v/@stylable/react-scripts.svg)](https://www.npmjs.com/package/@stylable/react-scripts)

A fork of [react-scripts](https://github.com/facebook/create-react-app/tree/next/packages/react-scripts) used tailored for quick and easy creation of Stylable projects.

## Major changes from `react-scripts`
- Uses TypeScript instead of Babel, configured to work with Webpack's tree-shaking and dynamic chunks on import();
- Adds built-in support for [Stylable](http://stylable.io/).

## Getting started

This is the quickest way to get a Stylable project up and running. It is an opinionated boilerplate that uses TypeScript and Stylable instead of css-loader

In your terminal, run:
```
$ npx create-react-app --scripts-version @stylable/react-scripts [APP NAME]
$ cd [APP NAME]
$ yarn
$ yarn start
```

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by an [MIT license](./LICENSE).

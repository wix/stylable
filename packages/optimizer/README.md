# @stylable/optimizer

[![npm version](https://img.shields.io/npm/v/@stylable/optimizer.svg)](https://www.npmjs.com/package/stylable/optimizer)

Performs optimization when running Stylable in production mode.

### `StylableOptimizer`

Performs optimization such as removing Stylable directives, comments, unused components, empty rules to Stylable's output based on the provided configuration.

The `StylableOptimizer` is also responsible for invoking the `StylableClassNameOptimizer` and `StylableNamespaceOptimizer` based on its configuration.

### `StylableClassNameOptimizer`

Optimizes class names based on usage to a shorter format, being careful not to affect states (which need to stay un-optimized at the moment) and global rules.

### `StylableNamespaceOptimizer`

Optimizes namespaces to a shorter format.

## License
Copyright (c) 2019 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [MIT license](./LICENSE).
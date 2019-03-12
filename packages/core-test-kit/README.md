# @stylable/core-test-kit

[![npm version](https://img.shields.io/npm/v/@stylable/core-test-kit.svg)](https://www.npmjs.com/package/stylable/core-test-kit)

`@stylable/core-test-kit` is a collection of utilities aimed at making testing Stylable core behavior and functionality easier.

### What's in this test-kit?

#### Matchers
An assortment of `Chai` matchers used by Stylable.
- `flat-match` - flattens and matches passed arguments
- `results` - test Stylable transpiled style rules output

#### Diagnostics tooling

A collection of tools aimed at testing Stylable diagnostics messages (warnings and errors).

#### Testing infrastructure

Used for easily setting up Stylable instances (processor/transformer) and its infrastructure.

#### Match rules
Exposes two utility functions (`matchRuleAndDeclaration` and `matchAllRulesAndDeclarations`) used for testing Stylable generated AST representing CSS rules and declarations.

## License

Copyright (c) 2019 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE).  

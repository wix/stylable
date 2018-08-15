# @stylable/dom-test-kit

[![npm version](https://img.shields.io/npm/v/@stylable/dom-test-kit.svg)](https://www.npmjs.com/package/stylable/dom-test-kit)

`@stylable/dom-test-kit` is at the center of how Stylable operates. It provides the basic capabilities required for Stylable to parse stylesheets and transform their output to valid plain CSS.

## How to use

The `@stylable/dom-test-kit` exposes a single class named `StylableDOMUtil`, and from that class, several testing utilities are available:

#### `select(selector?: string, element?: QueryElement): Element | null` -
Select the first `element` in the DOM that matches the provided Stylable selector.

#### `selectAll(selector?: string, element?: QueryElement): Element[] | null` -
Select all `elements` in the DOM that match the provided Stylable selector.

#### `scopeSelector(selector?: string): string` -
Transforms a Stylable `selector` to its target vanilla CSS.

#### `hasStyleState(element: StateElement, stateName: string, param: StateValue = true): boolean` -
Check whether the provided `element` has the corresponding state set. This method can also receive a third optional param to validate the state active value.

#### `getStyleState(element: StateElement, stateName: string): string | null` -
Get an `element` state value if exists, `null` if it does not.

#### `getStateDataAttrKey(state: string, param: StateValue = true` -
Transform a Stylable `state` to its target DOM attribute key.

#### `getStateDataAttr(state: string, param: StateValue = true): string` -
Transform a Stylable `state` to its target DOM attribute and value.


## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE).

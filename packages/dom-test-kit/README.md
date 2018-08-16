# @stylable/dom-test-kit

[![npm version](https://img.shields.io/npm/v/@stylable/dom-test-kit.svg)](https://www.npmjs.com/package/stylable/dom-test-kit)

`@stylable/dom-test-kit` is comprised of a single class named `StylableDOMUtil` which exposes several DOM related testing utilities.

## Example
```css
/* style.st.css */
.root {}

.part {
    -st-states: loading;
}
```
```ts
/* test.ts */
import { StylableDOMUtil } from '@stylable/dom-test-kit';
import style from './my-component.st.css';

const domUtil = new StylableDOMUtil(style);
const partElement = domUtil.select(style.part);

domUtil.hasStyleState(partElement, 'loading');
```

## What does it do?

> Note: currently all of the provided utilities support only simplified Stylable selectors, consisting only of `class` and `pseudo-class` selectors.

### `constructor(style: RuntimeStylesheet, root?: Element)`
Initialize the `StylableDOMUtil` by providing a source stylesheet that would function as the base for all testing utilities. You may pass a DOM root element to serve as the default entry point for the `select` methods,

### `select(selector?: string, element?: Element): Element | null`
Select the first `element` in the DOM that matches the provided Stylable `selector`.

### `selectAll(selector?: string, element?: Element): Element[] | null`
Select all `elements` in the DOM that match the provided Stylable `selector`.

### `scopeSelector(selector?: string): string`
Transforms a Stylable `selector` to its target vanilla CSS.

### `hasStyleState(element: Element, stateName: string, param: StateValue = true): boolean`
Check whether the provided `element` has the corresponding state set. This method can also receive a third optional param to validate the state active value.

### `getStyleState(element: Element, stateName: string): string | null`
Get an `element` state value if exists, `null` if it does not.

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE).

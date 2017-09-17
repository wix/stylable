---
id: references/imports
title: Imports
layout: docs
---

**Stylable** enables you to import other stylesheets and modules in a way that is similar to [JS Imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import). You can then use the stylesheet or module as it's been defined, or just one or more of its named values, in your own **Stylable** stylesheet.

You use the **Stylable** syntax beginning with `-st-` for the `:import` config:

* `-st-from:` Identifies the path to the stylesheet or JavaScript module. Can be a relative path or a 3rd party path.
* `-st-default:` Imports the default export of the module named in `-st-from:`. Use with the name by which to identify the imported value in the scoped stylesheet.
* `-st-named:` List of the named exports to import into the local scoped stylesheet from the file named in `-st-from:`.

> **Note**  
> * `:import` is a Stylable directive and not a selector.
> * Using `import` as part of a complex selector or inside a CSS ruleset does not import.
> * Multiple imports may conflict and the last one in the file wins.

## Import Basic usage

### Import the default export of a local reference stylesheet for use in the scoped stylesheet

Import the `toggle-button.css` stylesheet from a local location. Assign the name `ToggleButton` to the default export of that stylesheet for use in this scoped stylesheet.

```css
/* CSS */
:import {
    -st-from: './toggle-button.css';
    -st-default: ToggleButton;
}
```

```js
/* ES6 equivalent */
import ToggleButton from './toggle-button.css';
```

### Import named exports from a local JS module

The values `gridMixin` and `tooltipMixin` are imported from the local JavaScript module `my-mixins.js`. These named exports are now imported into this scoped stylesheet.

```css
/* CSS */
:import {
    -st-from: "./my-mixins";
    -st-named: gridMixin, tooltipMixin;
}
```

```js
/* ES6 equivalent */
import { gridMixin, tooltipMixin } from "./my-mixins";
```

### Import named exports from a local JS module and locally refer to one of the export values as a different name

The values `gridMixin` and `tooltipMixin` are imported from the local JavaScript module `my-mixins.js`. `gridMixin` is used as is and `tooltipMixin` has been renamed for use in this scoped stylesheet as ```tooltip```. These mixins should be referred to as `gridMixin` and `tooltip` in this stylesheet.

```css
/* CSS */
:import {
    -st-from: "./my-mixins";
    -st-named: gridMixin, tooltipMixin as tooltip;
}
```

```js
/* ES6 equivalent */
import { gridMixin, tooltipMixin as tooltip } from "./my-mixins";
```

## Import Stylesheet

When importing another stylesheet the default represent the root of the stylesheet, and named imports represent vars and classes.

## Usage

* [Tag selectors](./tag-selectors.md)
* [Extend a stylesheet](./extend-stylesheet.md)
* [Import variables](./variables.md#import-variables)
* [Import classes](./class-selectors.md#import-classes)
* [Mixins](./mixin-syntax.md)
* [Component Variants](../guides/component-variants.md) and [Shared Classes](../guides/shared-classes.md)

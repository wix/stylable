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

## Imports - basic usage

Here are some examples of how you can use imports in your **Stylable** stylesheet.

### Import the default export of a local reference stylesheet for use in the scoped stylesheet

Import the `toggle-button.css` stylesheet from a local location. Assign the name `ToggleButton` to the default export of that stylesheet for use in this scoped stylesheet. 

> **Note**  
> Generally when importing a **default** value from a css file, you can use a capital letter to signify that the value is used as a component in this stylesheet. 

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

> **Note**  
> When importing named values, they are generally used as class or tag selectors and, therefore, you should camelCase to name them.

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

The values `gridMixin` and `tooltipMixin` are imported from the local JavaScript module `my-mixins.js`. The value `gridMixin` is used as is and `tooltipMixin` has been renamed for use in this scoped stylesheet as `tooltip`. These mixins are referred to as `gridMixin` and `tooltip` in this stylesheet.

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

## Import stylesheet

When importing another stylesheet, the default import represents the root of the stylesheet and is generally treated as a component, and named imports represent vars and classes.

## Usage

* [Tag selectors](./tag-selectors.md)
* [Extend a stylesheet](./extend-stylesheet.md)
* [Import variables](./variables.md#import-variables)
* [Import classes](./class-selectors.md#import-classes)
* [Mixins](./mixins.md)
* [Component variants](../guides/component-variants.md) and [Shared classes](../guides/shared-classes.md)

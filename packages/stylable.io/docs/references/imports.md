---
id: references/imports
title: Imports
layout: docs
---

**Stylable** enables you to import other stylesheets and modules in a way that is similar to [JS Imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import). You can then use the stylesheet or module as it's been defined, or just one or more of its named values, in your own **Stylable** stylesheet.

## Import syntax
**Stylable** supports two types of import syntax that can be used, the two are identical in their capabilities.
- `@st-import` at-rule directive - A newer more concise syntax, similar to ES imports:
    * replace `<DEFAULT_NAME>` with your desired local name to import an entire stylesheet, representing its root class
    * Inside the square brackets, import any inner parts belonging to said stylesheet

```css
@st-import <DEFAULT_NAME>, [<NAMED_PART1, NAMED_PART2, ...>] from './stylesheet.st.css';
```

- `:import` ruleset directive - The original more verbose way of importing symbols, uses the **Stylable** syntax beginning with `-st-` inside the `:import` ruleset:
    * `-st-from:` Identifies the path to the stylesheet or JavaScript module. Can be a relative path or a 3rd party path.
    * `-st-default:` Imports the default export of the module named in `-st-from:`. Use with the name by which to identify the imported value in the scoped stylesheet.
    * `-st-named:` List of the named exports to import into the local scoped stylesheet from the file named in `-st-from:`.

```css
:import {
    -st-from: './stylesheet.st.css';
    -st-default: <DEFAULT_NAME>;
    -st-named: <NAMED_PART1, NAMED_PART2, ...>;
}
```

Every example below will feature both types of import syntaxes, their end result is identical.

> **Note**  
> * `:import` is a Stylable directive and not a selector.
> * likewise, `@st-import` is a Stylable directive and not an actual at-rule.
> * Import statements cannot be used as a part of a complex selector or inside a CSS ruleset.
> * Multiple imports may conflict in their used symbol names; the last one in the file wins.

## Imports - basic usage

Here are some examples of how you can use imports in your **Stylable** stylesheet.

### Import the default export of a local reference stylesheet for use in the scoped stylesheet

Import the `button.st.css` stylesheet from a local location. Assign the name `Button` to the default export of that stylesheet for use in this scoped stylesheet. 

When importing another stylesheet, the default import represents the root of the stylesheet and is generally treated as a component, and named imports represent other internal stylesheet parts.

> **Note**  
> Generally when importing a **default** value from a stylable file, you should use a capital letter to signify that the value represents a component root node in this stylesheet. 


```css
/* comp.st.css - new syntax */
@st-import ToggleButton from './button.st.css';
```

```css
/* comp.st.css - old syntax */
:import {
    -st-from: './button.st.css';
    -st-default: ToggleButton;
}
```

```js
/* ES6 "equivalent" */
import ToggleButton from './button.st.css';
```

### Import named parts from a local stylesheet
Named imports from a stylesheet can be used to bring symbols of different types, which you can then use inside your stylesheet.

- Elements
- Classes
- Stylable Variables
- CSS Variables
- Keyframes - special case, see [importing keyframes](#importing_keyframes) entry below

In this 
```css
/* comp.st.css - new syntax */
@st-import [label, icon, --bgColor] from './button.st.css';
```

```css
/* comp.st.css - old syntax */
:import {
    -st-from: './button.st.css';
    -st-named: label, icon, --bgColor;
}
```

```js
/* ES6 "equivalent" */
import { label, icon, --bgColor } from './button.st.css';
```

### Import named exports from a local JS module

The values `gridMixin` and `tooltipMixin` are imported from the local JavaScript module `my-mixins.js`. These named exports are now imported into this scoped stylesheet.

> **Note**  
> When importing named values, they are generally used as class or tag selectors and, therefore, you should camelCase to name them.

```css
/* comp.st.css - new syntax */
@st-import [gridMixin, tooltipMixin] from './my-mixins';
```

```css
/* comp.st.css - old syntax */
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
/* comp.st.css - new syntax */
@st-import [gridMixin, tooltipMixin as tooltip] from './my-mixins';
```

```css
/* comp.st.css - old syntax */
:import {
    -st-from: "./my-mixins";
    -st-named: gridMixin, tooltipMixin as tooltip;
}
```

```js
/* ES6 equivalent */
import { gridMixin, tooltipMixin as tooltip } from "./my-mixins";
```

## Import keyframes

In Stylable, both class names and keyframes undergo namespacing to avoid collision. However, despite the two being global, they do not share a namespace in CSS - this means that you can have both a class name and a keyframe with the same name.

Due to this, when importing keyframes from another stylesheet, a special `keyframes()` directive needs to be used.

```css
/* comp.st.css - new syntax */
@st-import [keyframes(slideX, slideY)] from './keyframes.st.css';
```

```css
/* comp.st.css - old syntax */
:import {
    -st-from: "./my-mixins";
    -st-named: keyframes(slideX, slideY);
}
```

You can read more about keyframes behavior [here](./keyframes.md).


## Importing specific symbols

* [Tag selectors](./tag-selectors.md)
* [Extend a stylesheet](./extend-stylesheet.md)
* [Import Stylable variables](./variables.md#import-variables)
* [Import CSS variables](./css-vars.md#importing-css-variables)
* [Import classes](./class-selectors.md#import-classes)
* [Mixins](./mixins.md)
* [Component variants](../guides/component-variants.md) and [Shared classes](../guides/shared-classes.md)

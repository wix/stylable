---
id: references/mixin-syntax
title: Mixins
layout: docs
---

You can use **Stylable** to apply complex styles and behaviors to a CSS rule set. Mixins enable you to define patterns of properties, which can then be reused in other rule sets. 

Here are some use cases where you can use mixins with other **Stylable** features:
* [Layouts](./create-layouts.md) - easily describe complex layouts.
* Helpers - use custom CSS shortcuts, like timers, effects and macros.

## Example

The value `textTooltip` of the external file `my-mixins` is imported. The class selector `.submit-button` uses the mixin syntax and applies parameters. In this case, to wait `300` milliseconds to display the `data-tooltip` hover text on the button. 

```css
/* CSS */
:import {
    -st-from: "./my-mixins";
    -st-names: textTooltip;
}
.submit-button {
    -st-mixin: textTooltip(300, data-tooltip); /* apply mixin */
}
```

## Syntax

You can use mixins with parameters, without parameters, and with multiple mixins.


```css
/* CSS */
.a {
    /* no parameters */
    -st-mixin: noParams;
}
.b {
    /* multiple parameters */
    -st-mixin: multiParams(param1, param2);
}
.c {
    /* apply multiple mixins */
    -st-mixin: noParams, multiParams(param1, param2);
}
```

Any parameter you add to the mixin is considered a string.


```css
/* CSS */
.a {
    -st-mixin: mix(300, xxx); /* ["300", "xxx"] */
}
.b {
    -st-mixin: mix(300, "xxx"); /* ["300", "xxx"] */
}
.c { /* use quotations to include comma */
    -st-mixin: mix(300, "xx,x"); /* ["300", "xx,x"] */
}
.d { /* escape slashes */
    -st-mixin: mix(300, "\"xxx\""); /* ["300", "\"xxx\""] */
}
```

## How mixins are applied

Mixins can add CSS declarations to the CSS rule set to which they are applied:

* Rules are added at the position in the CSS where the `-st-mixin` is declared.
* Any selectors that are appended as a result of the mixin are added directly after the rule set that the mixin was applied to.
* Multiple mixins are applied according to the order that they are specified.


```css
/* CSS */
.a {
    color: red;
    -st-mixin: golden;
    background: white;
}
.a:hover {
    background: white;
}
```

```css
/* CSS output*/
.a {
    color: red;
    color: gold; /* added by golden */
    background: black; /* added by golden */
    background: white;
}
.a:hover {
    color: black; /* added by golden */
    background: gold; /* added by golden */
}
.a:hover {
    background: white;
}
```

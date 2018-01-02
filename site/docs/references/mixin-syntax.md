---
id: references/mixin-syntax
title: Mixins
layout: docs
---

**Stylable** mixins allow you to reuse complex styles and CSS behaviors, and apply them to any rule-set. 

Some use cases where you can use mixins:
* Presets/Variants - create reusable pieces of styling CSS
* Layouts - easily describe complex layouts.
* Effects - easily describe complex effects
* macros - use JS to define the CSS macros you need

## Example usage

The value `textTooltip` of the external file `my-mixins` is imported. The class selector `.submitButton` uses the mixin syntax and applies parameters. In this case, to wait `300` milliseconds to display the `dataTooltip` hover text on the button. 

```css
/* CSS */
:import {
    -st-from: "./my-mixins";
    -st-named: textTooltip;
}
.submitButton {
    -st-mixin: textTooltip(300, dataTooltip); /* apply mixin */
}
```

## Defining mixins in CSS

every CSS class defined in a **stylable** CSS file can be used as a mixin.

``` css

/* file a.st.css */
.a{
    color:red;
}

/* file b.st.css */
:import{
    -st-from:'./a.st.css';
    -st-named:a;
}
.b{
    -st-mixin:a;
}
```

``` css
/* Output CSS */
.b{
    color:red;
}
```

## Defining mixins in Javascript or Typescript

you can easily create new mixins using javascript or typescript
[read more in extending through js](./extending-through-js.md)

## Applying multiple mixins

You can apply multiple mixins in the same line.


```css
/* CSS */
.c {
    /* apply multiple mixins */
    -st-mixin: noParams, multiParams(param1, param2);
}

```

## Usage with special characters

```css
/* CSS */
.c { /* use quotations to include comma */
    -st-mixin: mix(300, "xx,x"); /* ["300", "xx,x"] */
}
.d { /* escape slashes */
    -st-mixin: mix(300, "\"xxx\""); /* ["300", "\"xxx\""] */
}
```

## How mixins are applied

Mixins can add CSS declarations to the CSS rule-set to which they are applied:

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

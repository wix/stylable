
# Mixins

Apply complex style and behaviors to a CSS ruleset.

Use cases:
* [layout](./create-layouts.md) - easily describe complex layout
* [variants](./variants.md) - apply a component in a specific theme
* helpers - color manipulations, easing functions, custom CSS shorthands / shortcuts

## Example

CSS API:
```css
:import{
    -st-from: "./my-mixins";
    -st-names: textTooltip;
}
.submit-button{
    -st-mixin: textTooltip(300, data-tooltip);
}
```

Might generate the CSS on the `.submit-button` that will pickup the `data-tooltip` text and display it on hover after 300ms.

## Syntax

With and without params and with multiple mixins

```css
.a{
    /* no parameters */
    -st-mixin: noParams;
}
.b{
    /* multiple parameters */
    -st-mixin: multiParams(param1, param2);
}
.c{
    /* apply multiple mixins */
    -st-mixin: noParams, multiParams(param1, param2);
}
```

Everything is a string:

```css
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

## Target

Mixins may add CSS declarations to the CSS ruleset that they are applied to:

* rules are added at the position that the `-st-mixin` is declared
* appended selectors are added directly after the rule-set that the mixin was applied to
* multiple mixins are applied according to the order that they are specified in

CSS API:
```css
.a{
    color:red;
    -st-mixin: golden;
    background:white;
}
.a:hover{
    background:white;
}
```

CSS OUTPUT:
```css
.a{
    color:red;
    color:gold; /* added by golden */
    background:black; /* added by golden */
    background:white;
}
.a:hover{
    color:black; /* added by golden */
    background:gold; /* added by golden */
}
.a:hover{
    background:white;
}
```

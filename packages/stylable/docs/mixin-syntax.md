
# Mixins

Apply complex style and behaviors to a CSS rule-set.

Use cases:
* [layout](./create-layouts.md) - easily describe complex layout
* [variants](./variants.md) - apply a component in a specific theme
* helpers - color manipulations, easing functions, custom CSS shorthands / shortcuts

## Example

CSS API:
```css
:import{
    -sb-from: "./my-mixins";
    -sb-names: textTooltip;
}
.submit-button{
    -sb-mixin: textTooltip(300, 'data-tooltip');
}
```

Might generate the CSS on the `.submit-button` that will pickup the `data-tooltip` text and display it on hover after 300ms.

## Syntax

```css
.a{
    /* no parameters */
    -sb-mixin: noParams;
}
.b{
    /* multiple parameters */
    -sb-mixin: multiParams(param1, param2);
}
.c{
    /* apply multiple mixins */
    -sb-mixin: noParams, multiParams(param1, param2);
}
```

## Target

Mixins may add CSS declarations to the CSS rule-set that they are applied to:

* rules are added at the position that the `-sb-mixin` is declared
* appended selectors are added directly after the rule-set that the mixin was applied to
* multiple mixins are applied according to the order that they are specified in

CSS API:
```css
.a{
    color:red;
    -ms-mixin: golden;
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

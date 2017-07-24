
# Mixins

You can use **Stylable** to apply complex styles and behaviors to a CSS rule set. Mixins enable you to define patterns of properties, which can then be reused in other rule sets. 

Here are some use cases where you can use mixins with other **Stylable** features:
* [Layouts](./create-layouts.md) - easily describe complex layouts.
* [Variants](./variants.md) - apply a specific theme to a component.
* Helpers - handle color manipulations, ease functions, use custom CSS shortcuts.

You use the **Stylable** syntax `-sb-mixin` with or without parameters applied. You can also use multiple mixins in the same statement. 

## Example

The value `textTooltip` of the external file `my-mixins` is imported. The class selector `.submit-button` uses the mixin syntax and applies parameters. In this case, to wait `300` milliseconds to display the `data-tooltip` hover text on the button. 

CSS API:
```css
:import{
    -sb-from: "./my-mixins";
    -sb-names: textTooltip;
}
.submit-button{
    -sb-mixin: textTooltip(300, data-tooltip);
}
```

## Syntax

You can use mixins with parameters, without parameters, and with multiple mixins.

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

Any parameter you add to the mixin is considered a string.

```css
.a {
    -sb-mixin: mix(300, xxx); /* ["300", "xxx"] */
}
.b {
    -sb-mixin: mix(300, "xxx"); /* ["300", "xxx"] */
}
.c { /* use quotations to include comma */
    -sb-mixin: mix(300, "xx,x"); /* ["300", "xx,x"] */
}
.d { /* escape slashes */
    -sb-mixin: mix(300, "\"xxx\""); /* ["300", "\"xxx\""] */
}
```

## How mixins are applied

Mixins can add CSS declarations to the CSS rule set to which they are applied:

* Rules are added at the position in the CSS where the `-sb-mixin` is declared.
* Any selectors that are appended as a result of the mixin are added directly after the rule set that the mixin was applied to.
* Multiple mixins are applied according to the order that they are specified.

CSS API:
```css
.a{
    color:red;
    -sb-mixin: golden;
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

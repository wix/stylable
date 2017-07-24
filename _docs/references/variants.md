
# Variants

You can use variants in **Stylable** the same way you use [mixins](./mixin-syntax.md). They are defined as part of a **Stylable** stylesheet that can then be applied to a CSS rule set.

Variants can be used if you want to apply multiple styles to a single component for different themes or semantics. They preserve the integrity of the CSS output by not being including unless its syntax is directly used in the CSS. This increases performance, enables easier debugging and generally keeps the CSS output cleaner and free of unused syntax.

You can define variants only for a [class selector](./class-selectors.md). 

When you declare a variant, use `-sb-variant: true;` to instruct the **Stylable** pre-processor to check if the variant is being used anywhere in the project and if it isn't, to ignore the variant during build time.

## Examples

### Define a variant

The `.SaleBtn` class selector, which extends the default value `Button` that is being imported from the `button.css` file, is defined as a variant with the `-sb-variant: true;`. 

CSS API :
```css
/* theme.css */
:import {
    -sb-from: "./button.css";
    -sb-default: Button;
}
.SaleBtn {
    -sb-extends: Button;
    -sb-variant: true;
    color: red;
}
.SaleBtn:hover {
    color: pink;
}
```

### Define inline variants

When you create a component, it's useful to keep in one file all of its styles and any variants you offer to consumers of your component.

For example, consider the following button and its variant `BigButton`. While the button component has a height of 2em, the variant has a different height so the original sstyle and the variant's style are both available for use from the same file. 

```css
.root {
    color:red;
    background-color:blue;
    height:2em;
}

.BigButton {
    -sb-variant: true;
    height:5em;
}
```

> Note: Variants without an [extends directive rule](./extend-stylesheet.md) are automatically variants of the owner stylesheet.


### Use variants

CSS API:
```css
/* page.css */
:import {
    -sb-from: "./theme.css";
    -sb-names: SaleBtn;
}

.sale-button {
    -sb-mixin: SaleBtn;
}
```

CSS OUTPUT:
```css
/* namespaced to page */
.root .sale-button {
    color: red;
}
.root .sale-button:hover {
    color: pink;
}
```

### Use variants with extends 

When you use a variant with `-sb-extends`, the class also inherits the variant type.

CSS API:
```css
/* page.css */
:import {
    -sb-from: "./theme.css";
    -sb-names: SaleBtn;
}

.sale-button {
    -sb-extends: SaleBtn;
}

.sale-button::icon {
    border: 2px solid green;
}
```

CSS OUTPUT:
```css
/* namespaced to page */
.root .sale-button {
    color: red;
}
.root .sale-button:hover {
    color: pink;
}
.root .sale-button .button-icon {
    border: 2px solid green;
}
```


# Variants

You can use variants in **Stylable** the same way you use [mixins](./mixin-syntax.md). They are defined as part of a **Stylable** stylesheet that can then be applied to a CSS rule set.

Variants can be used if you want a single component to offer multiple style variants for different themes or semantics. The CSS output does not include variants unless it is directly used in the CSS. This increases performance, enables easier debugging and generally keeps the CSS output cleaner and free of unused code.

You can define variants only for a [class selector](./class-selectors.md). 

When you declare a variant, use `-st-variant: true;` to instruct the **Stylable** pre-processor to check if the variant is being used anywhere in the project and if it isn't, to ignore the variant during build time.

## Define a variant

The `.SaleBtn` class, which extends `Button` that is imported from the `button.css` file, is defined as a variant with the `-st-variant: true;`. 

CSS API :
```css
/* theme.css */
:import {
    -st-from: "./button.css";
    -st-default: Button;
}
.SaleBtn {
    -st-extends: Button;
    -st-variant: true; /* variant of Button */
    color: red;
}
.SaleBtn:hover {
    color: pink;
}
```

## Define inline variants

When you create a component, it's useful to keep in one file all of its styles and any variants you offer to consumers of your component.

For example, consider the following button and its variant `BigButton`. While the button component has a height of 2em, the variant has a different height so the original style and the variant's style are both available for use from the same file. 

```css
.root {
    color:red;
    background-color:blue;
    height:2em;
}

.BigButton {
    -st-variant: true; /* variant of root */
    height:5em;
}
```

> Note: Variants without an [extends directive rule](./extend-stylesheet.md) are automatically variants of the owner stylesheet `root` class.


## Use variants

When you apply a variant as a mixin, you are applying the variant's styles and behavior and cannot access its custom internal parts, like pseudo-elements or pseudo-classes. 

CSS API:
```css
/* page.css */
:import {
    -st-from: "./theme.css";
    -st-names: SaleBtn;
}

.sale-button {
    -st-mixin: SaleBtn;
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

## Use variants with extends 

When you use a variant with `-st-extends`, the class also inherits the variant base type enabling access to pseudo-elements and pseudo-classes. In this example, the CSS can style the button's `icon` because in the `theme.css` file, the `SaleBtn` variant extends `Button`.

CSS API:
```css
/* page.css */
:import {
    -st-from: "./theme.css";
    -st-names: SaleBtn;
}

.sale-button {
    -st-extends: SaleBtn;
}

.sale-button::icon {
    border: 2px solid green;
}
```

CSS OUTPUT:
```css
/* namespaced to page */
.root .sale-button.Button_root {
    color: red;
}
.root .sale-button.Button_root:hover {
    color: pink;
}
.root .sale-button.Button_root .Button_icon {
    border: 2px solid green;
}
```

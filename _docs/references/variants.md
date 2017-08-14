
# Variants

You can use variants in **Stylable** the same way you use [mixins](./mixin-syntax.md). They are defined as part of a **Stylable** stylesheet that can then later be applied to a CSS ruleset.

Variants can be used if you want a single component to offer multiple style variants for different themes or semantics. The CSS output does not include variants unless it is directly used in the CSS. This increases performance, enables easier debugging and generally keeps the CSS output cleaner and free of unused code.

You can define variants only for a [class selector](./class-selectors.md). 

When you declare a variant, use `-st-variant: true;` to instruct the **Stylable** pre-processor to check if the variant is being used anywhere in the project and if it isn't, to ignore the variant during build time.

// ToDo THEME: remove most - just write that variant means that variant class is not outputed to CSS by default, move most of the examples here to -st-mixin - just print any class on other selectors (with overrides?)

## Define a variant

The `.SaleBtn` class, which extends `Button` that is imported from the `button.css` file, is defined as a variant with the `-st-variant: true;`. 

CSS API :
```css
/* main.css */
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

## Use a variant with `-st-extends`

You use a variant using the `-st-extends` directive. The class then inherits the variant base type enabling access to its root definitions as well as all pseudo-elements and pseudo-classes. In this example, the CSS can style the button's `icon` because in the `main.css` file, the `SaleBtn` variant extends `Button`. The hover behavior is also inherited from the base class.

CSS API:
```css
/* page.css */
:import {
    -st-from: "./main.css";
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

## Use a variant with `-st-mixin`

When you apply a variant as a mixin, you are applying the variant's styles and behavior only, and cannot access its custom internal parts, like pseudo-elements or pseudo-classes. 

CSS API:
```css
/* page.css */
:import {
    -st-from: "./main.css";
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
    -st-extends: root; /* extends stylesheet root */
    -st-variant: true; /* variant of root */
    height:5em;
}
```

> Note: Variants without an [extends directive rule](./extend-stylesheet.md) are universal variants for any element.


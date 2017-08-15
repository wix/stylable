# Variants

Variants are classes that are selectively written to the CSS target, in order to offer multiple variations of a single component.

Variants can be used if you want to expose multiple CSS declarations for different themes or semantics, but don't want to include every variation in your target code. 

**The CSS output does not include a variant unless it is directly used in the CSS**. This increases performance, enables easier debugging and generally keeps the CSS output cleaner and free of unused code.

You can define variants only for a [class selector](./class-selectors.md). 

When you declare a variant, use `-st-variant: true;` to instruct the **Stylable** pre-processor to check if the variant is being used anywhere in the project and if it isn't, to ignore the variant during build time. 

Then to use the variant, you can use any of the extension methods available for **Stylable** classes. 

> **Note**:  
> Variants without an `-st-extends` (and thus, do not extend any component) directive are universal variants for use by any element.

## Define a variant

The `.cancelButton` class is defined as a variant using `-st-variant: true`. Then used in the `Form` stylsheet.

### CSS API:

```css
/* button.st.css */
@namespace "Button"
.root {
    color: blue;
}
.bigBorder {
    -st-variant: true; /* universal variant */
    border: 10px solid black;
}
.cancelButton {
    -st-extends: root;
    -st-variant: true; /* variant of this component */
    color: red;
}
.cancelButton:hover {
    color: pink;
}
```

```css
/* form.st.css */
@namespace "Form"
:import {
    -st-from: './button.st.css';
    -st-default: Button;
    -st-named: cancelButton;
}
/* 
@export "Form__cancel Button__cancelButton" 
*/
.cancel {
    -st-extends: cancelButton;
    color: gold;
}
```

### CSS Output:

```css
.Button__root.Button__cancelButton { color: red } /* from variant */
.Button__root.Button__cancelButton:hover { color: pink } /* from variant */
.Form__root .Form__cancel.Button__cancelButton { color: gold }

/* Note that bigBorder is not in the output since it is not in use */
```

## Usages

[Mixins](./mixin-syntax.md)

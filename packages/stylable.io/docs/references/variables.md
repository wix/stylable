---
id: references/variables
title: Variables
layout: docs
---

Use variables to define common values to be used across the stylesheet and so they can be exposed for sharing and theming.
These variables are used only during build-time and have no impact on the resulting runtime code.

If you wish to use dynamic variables, and to change their values during runtime, see [css custom properties (vars)](./css-vars.md) for further details.

> **Note**    
> Variables are scoped to the specific stylesheet and do not conflict with variables from another stylesheet.

## Use in stylesheet

Use the syntax `:vars` to define variables, and apply them with a `value()`:

```css
/* CSS */
@namespace "Example1";
:vars {
    color1: red;
    color2: green;
}
.root {
    color: value(color1);
    background: value(color2);
}
```

```css
/* CSS output */
.Example1__root {
    color: red; /* color1 */
    background: green; /* color2 */
}
```

## Import variables

Any var defined in a stylesheet is exported as a named export and can be [imported](./imports.md) by other stylesheets.

```css
/* CSS */
@namespace "Example2";
:import {
    -st-from: "./example1.css"; /* Example1 stylesheet */
    -st-named: color1, color2; /* import color1 and color2 variables */
}
.root {
    border: 10px solid value(color1);
}
.root:hover {
    border: 10px solid value(color2);
}
```

```css
/* CSS output*/
.Example2__root {
    border: 10px solid red; /* color1 */
}
.Example2__root:hover {
    border: 10px solid green; /* color2 */
}
```

> **Note**  
> Imported variables are not exported from the stylesheet that has imported them. They can be imported only from the stylesheet in which they are declared.


## Compose variables

You can set the value of a variable using another variable.

```css
/* CSS */
@namespace "Example3";
:import {
    -st-from: "./example1.css"; /* Example1 stylesheet */
    -st-named: color1, color2;
}
:vars {
    border1: 10px solid value(color1); /* use color1 in a complex value */
}
.root {
    border: value(border1); /* user border1 */
}
```

```css
/* CSS output*/
.Example3__root {
    border: 10px solid red; /* 10px solid {color1} */
}
```

## Advanced variable types
You can use Stylable custom types when defining a variable. When the variable is consumed, new capabilities are exposed including being able to provide multiple values to the one variable. 

Stylable does this by utilizing a type function in the variable definition and passing additional arguments to the `value()` function.

### Stylable native variable types
By default, Stylable exposes two types of variables that are available globally and do not require a special import:
* `stMap`  
* `stArray`

#### stMap
Use the `stMap` function to provide an interface similar to a map so you can group variables by context and retrieve them by key.

Its definition is comprised of key/value pairs with a space as a delimiter between them, and a comma as a separator between pairs.

```css
:vars {
    colors: stMap(
        bg green,
        text red
    );
}

.root {
    background-color: value(colors, bg); /* green */
}
```

#### stArray
Use the `stArray` function to provide an interface similar to an array so you can group variables by context and retrieve them by their index. 

When using the `stArray` function, the array value is zero-based and comma separated.

```css
:vars {
    colors: stArray(red, green);
}

.root {
    background-color: value(colors, 1); /* green */
}
```

### Custom variable type

Stylable also offers a custom variable type, `stBorder`, that must be imported from the `@stylable/custom-value` [package](https://github.com/wix/stylable/tree/master/packages/custom-value).

`stBorder` accepts three arguments, `size`, `style` and `color` in that order. When using the type, you can either invoke the entire border definition (by not passing an additional argument), or specific parts of it, according to their key.

```css
:import {
    -st-from: "@stylable/custom-value";
    -st-named: stBorder;
}

:vars {
    /* order of arguments: size style color */
    myBorder: stBorder(1px, solid, green);
}

.root {
    border: value(myBorder); /* 1px solid green */
    background-color: value(myBorder, color); /* green */
}
```

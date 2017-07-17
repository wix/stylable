# Variables

Use variables to define common values to be used across the stylesheet and are exposed for sharing and theming.

> Note: Variables are scoped and will not conflict with variables from another stylesheet.

## Use in stylesheet

Use `:vars` to define variables, and apply them with the `value()`:

CSS API:
```css
/* example1.css */
:vars {
    color1: red;
    color2: green;
}
.root {
    color: value(color1);
    background: value(color2);
}
```

CSS OUTPUT:
```css
/* namespaced to example1 */
.root {
    color: red; /* color1 */
    background: green; /* color2 */
}
```

## Import variables

CSS API:
```css
/* example2.css */
:import {
    -sb-from: "./example1.css"; /* stylesheet a previous example */
    -sb-named: color1, color2; /* import color1 and color2 variables */
}
.root {
    border: 10px solid value(color1);
}
.root:hover {
    border:10px solid value(color2);
}
```

CSS OUTPUT:
```css
/* namespaced to example1 */
.root {
    color: red; /* color1 */
    background: green; /* color2 */
}
/* namespaced to example2 */
.root {
    border: 10px solid red; /* color1 */
}
.root:hover {
    border:10px solid green; /* color2 */
}
```

## Use value in variable

Variables can be set with the value of another variable:

CSS API:
```css
/* example3.css */
:import {
    -sb-from: "./example1.css"; /* stylesheet a previous example */
    -sb-named: color1, color2;
}
:vars{
    border1: 10px solid value(color1); /* use color1 in complex value */
}
.root {
    border: value(border1);
}
```

CSS OUTPUT:
```css
/* namespaced to example1 */
.root {
    color: red; /* color1 */
    background: green; /* color2 */
}
/* namespaced to example3 */
.root {
    border: 10px solid red; /* 10px solid {color1} */
}
```

##  Overriding variables

CSS API:
```css
/* example4.css */
:import {
    -sb-from: "./example1.css"; /* stylesheet a previous example */
    -sb-named: color1, color2;
}
:override {
    color1: yellow; /* modify color1 to yellow */
}
.root {
    border: 10px solid value(color1);
}
.root:hover {
    border:10px solid value(color2);
}
```

CSS OUTPUT:
```css
/* namespaced to example1 */
/* color1=yellow */
.root {
    color: yellow; /* color1 */
    background: green; /* color2 */
}
/* namespaced to example4 */
.root {
    border: 10px solid yellow; /* 10px solid {color1} */
}
.root:hover {
    border:10px solid green; /* 10px solid {color2} */
}
```

> Note: resolve order: after stylesheets are collected, variable override is applied according to the dependency order, so that top dependency override wins.

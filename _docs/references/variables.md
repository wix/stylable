# Variables

Use variables to define common values to be used across the stylesheet and are exposed for sharing and theming.

> **Note**: Variables are scoped and will not conflict with variables from another stylesheet.

## Use in stylesheet

Use `:vars` to define variables, and apply them with the `value()`:

CSS API:
```css
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

CSS OUTPUT:
```css
.Example1__root {
    color: red; /* color1 */
    background: green; /* color2 */
}
```

## Import variables

Any var defined in stylesheet is exported as a named export and can be imported by other stylesheets:

CSS API:
```css
@namespace "Example2";
:import {
    -st-from: "./example1.css"; /* stylesheet a previous example */
    -st-named: color1, color2; /* import color1 and color2 variables */
}
.Example2__root {
    border: 10px solid value(color1);
}
.Example2__root:hover {
    border:10px solid value(color2);
}
```

CSS OUTPUT:
```css
.Example2__root {
    border: 10px solid red; /* color1 */
}
.Example2__root:hover {
    border:10px solid green; /* color2 */
}
```

> **Note**: Imported variables are not exported from stylesheet.

## Use value in variable

Variables can be set with the value of another variable:

CSS API:
```css
@namespace "Example3";
:import {
    -st-from: "./example1.css"; /* stylesheet a previous example */
    -st-named: color1, color2;
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
.Example3__root {
    border: 10px solid red; /* 10px solid {color1} */
}
```

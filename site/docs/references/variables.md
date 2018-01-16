---
id: references/variables
title: Variables
layout: docs
---

Use variables to define common values to be used across the stylesheet and so they can be exposed for sharing and theming.

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
>Imported variables are not exported from the stylesheet that has imported them. They can be exported only from the stylesheet where they are declared.


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


## Override variables - option 1

You can override variables using the ```-st-$variableName:newValue``` declaration.

 overriding variables will cause stylable to print out all the rules effected by those variables under the ruleset requesting the override.

 ```css

/* File a.st.css */
:vars{
    mainColor:red;
}

.classWithVariable{
    background-color:green;
    color:value(mainColor)
}

/* File b.st.css */

:import{
    -st-from:'./a.st.css';
    -st-named:mainColor;
}
.overridingClass{
    -st-$mainColor:blue;
}

 ```



 ```css
 .a__classWithVariable{
     background-color:green;
     color:red;
 }

.b__overridingClass .a__classWithVariable{
     color:blue;
 }
```
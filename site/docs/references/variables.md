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

## Variables and infered types

**Stylable** infers the following variable types from your variable declaration:


| Type | infered by |
|----|----|
|color| recognized color name / color hexa format / rgba format | 
|cssUnit| number + recognized unit | 
|percentage| number+% | 
|image| base64 image / image url | 
|number| a number | 
|string| wrapped by quatation marks |


Native Enums Types are infered for values in commononly used enums 

* lineStyle
* display
* bezierCurves
* positionKeywords
* repeatStyleKeywords
* lineStyleKeywords
* boxKeywords
* geometryBoxKeywords
* transitionTimingFunctions

*Variable types default to string if no better match is found.*
*stylable treats strings in much the same way as Typescript treats any, allowing string where any-type is expected, allowing any-type where string is expected*


**Wrapping any variable with quetation marks makes its type a string. e.g."
```css

```

using these types stylable can give you better tooling.

### Variable validation 


```css
    :vars{
        a:5; /*infered as number*/
        b:"5"; /*infered as string*/
        c:block; /*infered as display-enum*/
        d:"block"; /*infered as string*/
        e:10px; /* infered as cssUnit */
        f:"10px"; /* infered as string */
    }
    .myComp{
        font-weight: value(a) /* no error number is allowed for font-weight */
        font-weight: value(b) /* no error string is allowed everywhere */
        
        
        display: value(c); /* no error display-enum is allowed for display */
        display: value(d); /* no error string is allowed for everywhere */

        width: value(e); /* no error cssUnit is allowed in width*/
        width: value(f); /* no error string is allowed for everywhere */


        width: value(c) /* error display enum is not allowed in width */
        width: value(d) /* no error string is allowed for everywhere */
        
        content: value(a) /* no error, content allows string, that means everytype is allowed */
        border: solid 1px value(a) /* no error, shorthand values are not currently checked */
    }
```

variable types are also checked when overriding variables and passing variables to formaters/mixins.

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

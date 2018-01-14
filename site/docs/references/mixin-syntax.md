---
id: references/mixins-syntax
title: Mixins
layout: docs
---


**Stylable** mixins enable you to reuse complex styles and CSS behaviors, and apply them to any ruleset during build time. 

Here are some examples of when you can use mixins:

- Presets/Variants - create reusable pieces of styling CSS
- Layouts - easily describe complex layouts
- Effects - easily describe complex effects
- Macros - use code to define the CSS macros you need

Mixins can be applied using either CSS or JavaScript/TypeScript. 

## CSS mixins

Any CSS class rule, including the root class, that is defined in a **Stylable** CSS file can be used as a mixin source. You can use either a local class, or import one from a different stylesheet.

```css
/* CSS mixin file - mixins.st.css */
.root {
    color: purple;
}

.someClass {
    color: green;
}
```

``` css
/* CSS file importing the above mixin - example.st.css */
:import {
    -st-from: './mixins.st.css';
    -st-default: MyComp;
    -st-named: someClass;
}

.rootMixedIn {
    -st-mixin: MyComp; /* root mixin */
}

.classMixedIn {
    -st-mixin: someClass; /* class mixin */
}
```

```
/* css output */
/* TODO: FILL ME */

```

### CSS mixin with parameters and variables

CSS mixins can accept parameters in the form of values and also named variables. Using variables in a mixin enables you to override specific variables inside of a mixin before they are applied. Anywhere within the scope of the class using the mxin, the named variable is replaced by the value that overrides it.

Here is an example of using a variable in a CSS mixin:

```css
:vars {
    color1: green;
}

.classToMixin {
    background: value(color1);
}

.targetClass {
    -st-mixin: classToMixin(color1 orange);
}
```

```
/* css output */
/* TODO - FILL ME */

```




## JavaScript/TypeScript mixins
/*Need some explanation how these are different than CSS mixins and if any difference in how they are used. Does CSS not "allow you to create complex structures"?*/
JavaScript/TypeScript mixins allow you to create complex structures in CSS according to the arguments you passed. 

Any argument applied to a mixin is passed on to the mixin function as a string argument /* should we add:  whereas a CSS mixin...fill in*/.

``` css
/* file example.st.css */
:import {
    -st-from: './my-mixin';
    -st-default: TSMixin;
}

.codeMixedIn {
    -st-mixin: TSMixin(42); /* JS/TS mixin */
}
```
```
/* css output */
/* TODO - fill in */
```

### JS/TS mixins with parameters and variables

You can pass **Stylable** variables as parameters to a mixin by calling the value function on the variable name.

``` css
/* file example.st.css */
:import {
    -st-from: './my-mixin';
    -st-default: TSMixin;
}

:vars {
    mySize: 42;
}

.codeMixedIn {
    -st-mixin: TSMixin(value(mySize)); /* JS/TS mixin */
}
```
```
/* css output */
/* TODO - fill in */
```


### JS/TS mixin usage with special characters
You can also escape special characters by wrapping them with quotes or using a backslash (`\`). 
 /*any issue w/ CSS mixin and special characters?*/

Example:
```css
.c { /* use quotations to include comma */
    -st-mixin: mix(300, "xx,x"); /* ["300", "xx,x"] */
}
.d { /* escape slashes */
    -st-mixin: mix(300, "\"xxx\""); /* ["300", "\"xxx\""] */
}
```
```ts
<!-- Needs a TS mixin example -->
```

### Mixin with parameters
Mixins, both CSS and JS/TS, can accept parameters. However, the usage and meaning differs between the two, learn more about the difference below. If no params are passed to the mixin, the parentheses can be omitted. 

### Circular references /*This should be a note. Add an example?*/
Note: It is possible to reach a state where you have circular references between mixins. In such a state they cannot be resolved, and a diagnostics warning will be issued in your code intelligence.



## How mixins are applied
Mixins can add CSS declarations to the CSS ruleset to which they are applied.

Rules are added at the position in the CSS where the `-st-mixin` is declared.
Any selectors that are appended as a result of the mixin are added directly after the ruleset that the mixin was applied to.

Multiple mixins are applied according to the order that they are specified /*applied?*/.

```css
/* CSS */
.a {
    color: red;
    -st-mixin: golden;
    background: white;
}
.a:hover {
    background: white;
}
```

```css
/* CSS output*/
.a {
    color: red;
    color: gold; /* added by golden */
    background: black; /* added by golden */
    background: white;
}
.a:hover {
    color: black; /* added by golden */
    background: gold; /* added by golden */
}
.a:hover {
    background: white;
}
```


## Apply a mixin
You can apply multiple mixins in either CSS or JavaScript/TypeScript, or both.

```css
.c {
    /* apply multiple mixins */
    -st-mixin: someMixin, anotherMixin;
}
```
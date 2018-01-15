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

Mixins can be applied using either CSS or JavaScript. Mixins can recive parameters and those paramaters can be either CSS values or variables. 


## CSS mixins

Any CSS class or element that is defined in a **Stylable** CSS file can be used as a mixin source; this includes the stylesheet's root. You can use either a local class or element, or import one from a different stylesheet.

In the following example, a locally defined mixin is used in a local class.

```css
/* CSS */
    .style-mixin {
        color: green;
        background: yellow;
    }
    .someClass {
        -st-mixin: style-mixin; /* local class mixin */    
    }  
```
```css
/* CSS output */
    ...
    .someClass {
        color: green;
        background: yellow;
    }  
```

Here is an example of a mixin file written in **Stylable** CSS that is imported into a stylesheet.

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
/* CSS file - example.st.css - imports the above mixin */
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

```css
/* CSS output */
.rootMixedIn {
    color: purple;
}

.rootMixedIn .someClass {
    color: green;
}

.classMixedIn {
    color: green;
}
```

### CSS mixin with parameters and variables

CSS mixins can accept named parameters in the following format:
 `mixin(variableName valueOverride)`. 
 
 Using parameters in a mixin enables you to override specific [variables](./variables.md) inside of a mixin before they are applied.

Here is an example of using a variable in a CSS mixin and how it can be overriden by the mixin's parameter value.

```css
/* CSS */
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

```css
/* CSS output */
.classToMixin {
    background: green;
}

.targetClass {
    background: orange;
}
```

## JavaScript mixins

JavaScript mixins allow you to create complex structures in CSS based on the arguments passed to the mixin and the mixin logic. 

A JS mixin returns a CSS fragment which can be multiple rulesets or multiple declarations within a given ruleset. **Stylable** [formatters](./) can return a single declaration value.

Arguments are passed to the mixin as a string argument and it's the mixin's responsibility to parse them.

Here is an example of a mixin receiving multiple arguments and returning multiple declarations into the ruleset into which it's being mixed in.

```js
/* file my-mixin.js */
module.exports = function colorAndBg([color, bgColor]){ 
    /* arguments: array of string types */

    return {
        color: color,
        background: bgColor
    }
};
```

``` css
/* file example.st.css */
:import {
    -st-from: './my-mixin';
    -st-default: colorAndBg;
}

.codeMixedIn {
    -st-mixin: colorAndBg(green, orange); 
    font-family: monospace;
}
```
```css
/* CSS output */
.codeMixedIn {
    color: green; 
    background: orange;
    font-family: monospace;
}
```

### JavaScript mixins returning multiple rulesets

Mixins can return multiple rulesets by returning selectors that are mixed in to the target stylesheet. These selectors can appear with the following syntax options:
* `&selector` - resulting selector is appended to the selector it was mixed into (in below example `&:hover`)
* `selector` - resulting selector is appended as a descendent selector to its mixed in target (in below example `.otherClass`) 

```js
/* file my-mixin.js */
module.exports = function complexMixin([color, bgColor]){ 
    /* arguments: array of string types */

    return {
        color: color,
        background: bgColor,
        "&:hover": {
            color: "gold"
        },
        ".otherClass": {
            color: "purple"
        }
    }
};
```

``` css
/* file example.st.css */
:import {
    -st-from: './my-mixin';
    -st-default: complexMixin;
}

.codeMixedIn {
    -st-mixin: complexMixin(green, orange); 
    font-family: monospace;
}
```
```css
/* CSS output */
.codeMixedIn {
    color: green; 
    background: orange;
    font-family: monospace;
}

.codeMixedIn:hover {
    color: gold; 
}

.codeMixedIn .otherClass {
    color: purple; 
}
```

## How mixins are applied

Mixins can add CSS declarations to the CSS ruleset to which they are applied.

Rules are added at the position in the CSS where the `-st-mixin` is declared.
Any selectors that are appended as a result of the mixin are added directly after the ruleset that the mixin was applied to.

You can apply multiple mixins in either CSS or JavaScript, or both seperated by comma `-st-mixin: mixinA, mixinB`.
Multiple mixins are applied according to the order that they are declared left to right.

## Considerations when using mixins


### Mixin usage with special characters
You can escape special characters by wrapping them with quotes or using a backslash (`\`). 

Example:
```css
.x { /* use quotations to include comma */
    -st-mixin: mix(300, "xx,x"); /* ["300", "xx,x"] */
}
.y { /* escape slashes */
    -st-mixin: mix(300, "\"xxx\""); /* ["300", "\"xxx\""] */
}
```

### Circular references 
It is possible to reach a state where you have circular references between mixins. These cannot be resolved, and a diagnostics warning is issued in your **Stylable** code intelligence.



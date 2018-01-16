---
id: references/mixins-syntax
title: Mixins
layout: docs
---


**Stylable** mixins enable you to reuse complex styles and CSS behaviors, and apply them to any ruleset during build time. 

Here are some examples of when you can use mixins:

* Presets/Variants - create reusable pieces of styling CSS
* Layouts - easily describe complex layouts
* Effects - easily describe complex effects
* Macros - use code to define the CSS macros you need

Mixins can be applied using either CSS or JavaScript, and can recive parameters.

>**Note**  
> If you need to return only a single declaration value using code, we recommend **Stylable** [formatters](./formatters.md). 

## CSS mixins

Any CSS stylesheet, class or element that is defined in a **Stylable** CSS file can be used as a mixin source. You can use either a local class or element, or import the mixin from a different stylesheet.

In the following example, a locally defined class is used as a mixin in the same stylesheet.

```css
/* CSS */
.style-mixin {
    color: green;
    background: yellow;
}
.someClass {
    -st-mixin: style-mixin;     
}  
```
```css
/* CSS output */
...
.someClass {
    color: green; /* from local mixin */
    background: yellow; /* from local mixin */
}  
```

Here is an example of a **Stylable** CSS file that is imported and mixed into the  classes of a different stylesheet. The `.rootMixedIn` class as a stylesheet and `classMixedIn` as a class.

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
    -st-mixin: MyComp; /* stylesheet mixin */
}

.classMixedIn {
    -st-mixin: someClass; /* class mixin */
}
```

```css
/* CSS output */
.rootMixedIn {
    color: purple; /* from stylesheet mixin */
}

.rootMixedIn .someClass { /* ruleset added as a result of the stylesheet mixin */
    color: green;
}

.classMixedIn {
    color: green; /* from class mixin */
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
    background: green; /* from local class */
}

.targetClass {
    background: orange; /* from mixin with override */
}
```

## JavaScript mixins

JavaScript mixins allow you to create complex structures in CSS based on the arguments passed to the mixin and the mixin logic. 

A JS mixin returns a CSS fragment which can be a single declaration and its value, multiple declarations, multiple rulesets, or any combination of these.

Arguments are passed to the mixin as a string argument and it's the mixin's responsibility to parse them.

Here is an example of a mixin receiving multiple arguments and returning multiple declarations into the target ruleset.

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
    color: green; /* from JS mixin */
    background: orange; /* from JS mixin */
    font-family: monospace; /* from local class */
}
```

### JavaScript mixins returning multiple rulesets

Mixins can return multiple rulesets that are mixed into the target stylesheet. These rulesets can be written with the following syntax options:
* `selector` - resulting ruleset is appended as a descendent selector to its mixed in target (in below example `.otherClass`) 
* `&selector` - resulting ruleset references the parent selector into which it was mixed in (in below example `&:hover`, the parent selector is `.codeMixedIn`)


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
    color: green; /* from JS mixin */
    background: orange; /* from JS mixin */
    font-family: monospace; /* from local class */
}

.codeMixedIn:hover { /* from JS mixin with & */
    color: gold; 
}

.codeMixedIn .otherClass { /* from JS mixin with appended selector */
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

Take a look at these considerations before working with **Stylable** mixins.

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



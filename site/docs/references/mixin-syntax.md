# Mixins

## What is a mixin?
**Stylable** mixins allow you to reuse complex styles and CSS behaviors (using either CSS or JavaScript / TypeScript) and apply them to any rule-set during build time.

Some use cases where you can use mixins:

- Presets/Variants - create reusable pieces of styling CSS
- Layouts - easily describe complex layouts
- Effects - easily describe complex effects
- Macros - using code to define the CSS macros you need

### Applying a mixin
You can apply multiple mixins in either CSS, JS/TS or both.

```css
.c {
    /* apply multiple mixins */
    -st-mixin: someMixin, anotherMixin;
}
```

### Mixin with params
Mixins, both CSS and JS/TS, can accept arguments. However, the usage and meaning differs between the two, learn more about the difference below. If no params are passed to the mixin, the parentheses can be omitted. 

### Circular references
Note: It is possible to reach a state where you have circular references between mixins. In such a state they cannot be resolved, and a diagnostics warning will be issued in your code intelligence.

---

## CSS mixins
Any CSS class or root class rule defined in a **stylable** CSS file can be used as a mixin source. You can either use a local class, or import one from a different stylesheet.

### Example usage
See an example for each type below:

```css
/* file mixins.st.css */
.root {
    color: purple;
}

.someClass {
    color: green;
}
```

``` css
/* file example.st.css */
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

/* css output */
/* TODO: FILL ME */

```

#### CSS mixin with params
CSS Mixins can accept parameters in the form of named variables. This allows you to override specific variables inside of a mixin before they are applied. Anywhere within the scope of the mixed in class, the named variable will be replaced by its overriden value.

Example:
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

/* css output */
/* FILL ME */

```

---

## JavaScript / TypeScript mixins
JavaScript / TypeScript mixins allow you to compute and create complex structures in CSS according to the arguments you passed. 

Any argument applied to a mixin will be passed on to the mixin function as a string argument.

``` css
/* file example.st.css */
:import {
    -st-from: './my-mixin';
    -st-default: TSMixin;
}

.codeMixedIn {
    -st-mixin: TSMixin(42); /* JS / TS mixin */
}

/* css output */

```

### Usage with variables
You can pass **Stylable** variables as paramters to a mixin by calling the value function on the var name.

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
    -st-mixin: TSMixin(value(mySize)); /* JS / TS mixin */
}

/* css output */

```


### Usage with special characters
You can also escape special characters by wrapping them with quotes or using a backslash (`\`). 

Example:
```css
.c { /* use quotations to include comma */
    -st-mixin: mix(300, "xx,x"); /* ["300", "xx,x"] */
}
.d { /* escape slashes */
    -st-mixin: mix(300, "\"xxx\""); /* ["300", "\"xxx\""] */
}

```

<!-- Needs a TS mixin example -->

## How mixins are applied
Mixins can add CSS declarations to the CSS ruleset to which they are applied:

Rules are added at the position in the CSS where the -st-mixin is declared.
Any selectors that are appended as a result of the mixin are added directly after the ruleset that the mixin was applied to.
Multiple mixins are applied according to the order that they are specified.

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
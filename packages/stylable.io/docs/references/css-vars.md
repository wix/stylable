---
id: references/css-vars
title: CSS Custom Properties (CSS vars)
layout: docs
---

`CSS Custom Properties` is a new feature introduced to the CSS language, providing the ability to define and re-use variables across stylesheets.

CSS Custom Properties are defined using the `--*` property syntax, and accessed using the `var(--*)` CSS function.

To learn more about this language feature, check out the following resources
- [MDN - Custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*){:target="_blank"}
- [MDN - Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_variables){:target="_blank"}
- [Smashing Magazine - It's Time To Start Using CSS Custom Properties](https://www.smashingmagazine.com/2017/04/start-using-css-custom-properties/){:target="_blank"}

## Stylable variables vs. CSS custom properties
[Stylable variables](./variables.md) and CSS custom properties offer different capabilities, and as such serve different use-cases.

Stylable variables exist only in your source code, and get replaced during transpilation to the final target code. They serve well for reducing code repetition, increasing readability and can benefit any static theme or styling without incurring any runtime performance cost. 

CSS custom properties on the other hand do incur a small runtime cost, but offer the ability to override their values during runtime, allowing dynamic styling through Stylable.

## Automatic scoping (namespacing)

Stylable automatically scopes any CSS custom property found in the stylesheet. It does so by generating a unique namespace for the stylesheet (similar to how classes are scoped), and replaces the variable with its scoped counterpart. 

Example:
```css
/* entry.st.css */
.root {
    --myVar: green;
    color: var(--myVar);
}
```

Transpiled output:
```css
/* entry.st.css */
.root {
    --entry-myVar: green;
    color: var(--entry-myVar);
}
```

## Importing CSS variables

Due to the fact Stylable provides scoping to CSS variables, it also provides the ability to import CSS variables defined in another stylesheet.

```css
/* entry.st.css */
:import {
    -st-from: "./imported.st.css";
    -st-named: --myVar;
}

.root {
    color: var(--myVar); /* green */
}

.part {
    /* this override will match the namespace of the imported stylesheet */
    --myVar: gold;
    background-color: var(--myVar); /* gold */
}
```

```css
/* imported.st.css */
.root {
    --myVar: green;
}
```

## Overriding CSS variables during runtime

Override any variable by redefining its value using an inline style attribute. 

{% raw %}
```js
import sheet from 'entry.st.css';

<div {...sheet('root', {}, {})}
     style={ 
        [sheet['--color']]: 'green', 
        [sheet['--border-size']]: '5px', 
        background: 'gold' } />
```
{% endraw %}

Output:
```js
<div className="stylesheet--root" 
    style="--stylesheet-color: green; --stylesheet-border-size: 5px; background: gold;" />
```


### Using the `$cssVars` utility function

Use the `$cssVars` utility function exposed on the stylesheet for an easier way of defining multiple variables at once. 
It will scope any variable passed to it that is defined in the stylesheet, and pass through any declarations it does not recognize.

```js
import sheet from './entry.st.css';

<div {...sheet('root', {}, {})}
    style={sheet.$cssVars({
        '--color': 'green', 
        '--border-size': '5px', 
        background: 'grey' })/>
```

Output:
```js
<div className="stylesheet--root" 
    style="--stylesheet-color: green; --stylesheet-border-size: 5px; background: grey;" />
```

## Using global CSS variables

In cases where you have no control over the name of the CSS variable used, use the `@st-global-custom-property` directive to define CSS variables that will not be scoped, and will maintain their exact given name.

This is mostly useful when working with 3rd-party libraries, where you only attempt to affect it externally.

```css
@st-global-custom-property --color, --bg;

.root {
    --color: green;
    color: var(--color);
}
```

```js
import sheet from './entry.st.css';

<div {...sheet('root', {}, {})}
     style="--color: red; --bg: yellow;"
/>
```

> Accessing any globally defined variable on the stylesheet will return its global name (un-scoped).


---
id: references/theme
title: Theme
layout: docs
---

You can use theming at the [top level of an application](../guides/stylable-application.md#Apply component library theme) and to [create a theme](../guides/stylable-component-library.md#Theme) for a component library.

When [importing](./imports.md) a stylesheet use`-st-theme` directive to add its look and feel to your stylesheet. Any CSS definitions written inside the imported stylesheet are output to the final CSS.

```css
/* CSS */
@namespace "project";
:import {
    -st-theme: true;
    -st-from: './theme.st.css';
}
```

## Override classes

Any [shared classes](../guides/shared-classes.md) and [component variants](../guides/component-variants.md) defined at the theme level can be overridden in our stylesheet by simply redefining them.

```css
/* CSS */
@namespace "project";
:import {
    -st-theme: true;
    -st-from: 'comp-lib/backoffice-theme.st.css';
    -st-named: emphasisBox, mainGallery;
}
.mainGallery { /* component variant extends Gallery */
    background: black;
}
.mainGallery::navButton {
    color: white;
}
.emphasisBox {
    border: 5px dashed black;
}
```

## Override theme variables (experimental)

Any variable defined in a theme file can be overridden. Every CSS declaration that uses that variable is overridden under our stylesheet.

```css
/* CSS */
@namespace "project";
:import {
    -st-theme: true;
    -st-from: 'comp-lib/backoffice-theme.st.css';
    color1: black; /* override color1 with black */
    color2: purple; /* override color2 with purple */
}
```

# Theme

Used in the [top part of an application](../guides/stylable-application.md#Apply component library theme) and to [create a theme](../guides/stylable-component-library.md#Theme) for a component library.

When [importing](./imports.md) a stylesheet use`-st-theme` directive to add its look and feel to your stylesheet. Any CSS definitions written inside the imported stylesheet will output to the final CSS.

```css
@namespace "project";
:import {
    -st-theme: true;
    -st-from: './theme.st.css';
}
```

## Override classes

Any [shared classes](../guides/shared-classes.ms) and [component variants](../guides/component-variants.md) defined at the theme level can be overridden in our stylesheet, by simply redefining them.

```css
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

## Override theme variables

Any variable defined in a theme file can be overridden. every CSS declaration that use that variable will be overridden under our stylesheet.

```css
@namespace "project";
:import {
    -st-theme: true;
    -st-from: 'comp-lib/backoffice-theme.st.css';
    color1: black; /* override color1 with black */
    color2: purple; /* override color2 with purple */
}
```

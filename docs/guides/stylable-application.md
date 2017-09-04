# Stylable Application

When building a stylable application we might want to share definitions between parts of the application and consume 3rd party stylable component libraries.

## The `project.st.css` file

It is recommended to have a [project commons stylesheet](./project-commons.md) for:

* [theme stylesheets](../references/theme.md) - apply 3rd party component library themes
* share common CSS definitions between parts of the project:
    * [variables](../references/variables.md) - values to reuse in declarations
    * [shared classes](./shared classes.md) - classes that can be reused in components
    * [component variants](./component-variants.md) - semantic component classes

An application would define CSS with the final style definitions:

```css
/* project.st.css */
@namespace "Project";
:vars {
    color1: white;
    color2: red;
    fontBig: 30px;
    fontSmall: 10px;
}
:import {
    -st-from: './button/button.st.css';
    -st-default: Button;
}
.cancelButton {
    -st-extends: Button;
    color: value(color1);
    background: value(color2);
}
```

## Apply component library theme

As best practice, the project commons will use the [`-st-theme`](../references/theme.md) directive to apply 3rd party library themes. Each theme will influence the components from its library.

```css
@namespace "project";
:import {
    -st-theme: true;
    -st-from: 'form-comps/backoffice-theme.st.css';
}
:import {
    -st-theme: true;
    -st-from: 'panels-comps/dark-theme.st.css';
}
```

> **Note**:
> Usually theme is only used on project commons file, but there are cases where you would want to show different styles between pages of your application, in which case a [multiple theme project structure](./stylable-component-library.md) might work better.

## Stylable component
The [component style best practices guide](./component-style-best-practices.md) describes ways to design a good component that can be styled and themed.
However, when building your application, it is common to define components with their final CSS. This makes them less "themable", but is much simpler.

In the following code we are describing a component with:
* 2 colors used from project
* 1 component variant

```css
@namespace "dialog"
:import {
    -st-from: './project.st.css';
    -st-named: color1, color2, cancelButton;
}
:import {
    -st-from: './button/button.st.css';
    -st-default: Button;
}
.root {
    color: value(color1);
    background: value(color2);
}
.ok {
    -st-extends: Button;
}
.cancel {
    -st-extends: cancelButton;
}
```
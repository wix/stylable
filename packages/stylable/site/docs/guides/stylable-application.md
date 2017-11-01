---
id: guides/stylable-application
title: Build a Stylable Application
layout: docs
---

When building a **Stylable** application, you want to share definitions between parts of the application and consume 3rd party **Stylable** component libraries. 

## The `project.st.css` file

It is recommended to have a [project commons stylesheet](./project-commons.md) that includes:

* [Theme stylesheets](../references/theme.md) - to apply 3rd party component library themes
* Shared common CSS definitions between parts of the project:
    * [variables](../references/variables.md) - values to reuse in declarations
    * [shared classes](./shared-classes.md) - classes that can be reused in components
    * [component variants](./component-variants.md) - semantic component classes

An application would define CSS with the final style definitions:

```css
/* project.st.css */
@namespace "project";
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

As a best practice, the project commons should use the [`-st-theme`](../references/theme.md) directive to apply 3rd party library themes. Each theme influences the components from its own library.

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
> Usually a theme is used only in a project commons file, but there are cases where you may want to show different styles between pages of your application, in which case a [multiple theme project structure](./stylable-component-library.md) might work better.

## Stylable component

The [Stylable component best practices guide](./stylable-component-best-practices.md) describes ways to design a good component that can be styled and themed. However, when building your application, it is also common to define components with their final CSS. This makes them less "themable", but is much simpler.

In the following code you can see a component that is described with:
* 2 colors used from project
* 1 component variant

```css
@namespace "dialog";
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

---
id: guides/component-variants
title: Component Variants
layout: docs
---

When building a [Stylable component library](./stylable-component-library.md) or a [Stylable application](./stylable-application.md), it is useful to define several semantic "flavors" of some components, for example a `Button` component that represents `cancel` or a `Gallery` component for the `main` gallery instance. 

## Defining a component variant

In your project's [Stylable stylesheet](./project-commons.md) used for the commonly used components in your project (usually named `project.st.css`) you:
1. Import a component stylesheet. 
2. Define a CSS class with a descriptive name like `cancelButton`.
3. Extend the component on the class you just defined.

```css
@namespace "project";
:import {
    -st-from: "./button.st.css";
    -st-default: Button; 
}
.cancelButton {
    -st-extend: Button;
    color: red;
    border: 1px solid red;
}
```

## Use component variants in components

A component **Stylable** stylesheet can use and extend component variants:

```css
@namespace "comp";
:import {
    -st-from: './project.st.css';
    -st-named: cancelButton;
}
/*
selector: .comp__root .project__cancelButton.button__root
js value: "project__cancelButton"
*/
.cancelButton { }
/*
selector: .comp__root .comp__cancel.project__cancelButton.button__root
js value: "comp__cancel project__cancelButton"
*/
.cancel {
    -st-extends: cancelButton;
}
```

# Component variants

When building a [stylable component library](./stylable-component-library.md) or a [stylable application](./stylable-application.md), it is useful to define several semantics "flavors" of some components like `Button` component that meant to represent `cancel` or a `Gallery` component for the `main` gallery instance. 

## Defining a component variant

In the [commons stylable stylesheet](./project-commons.md) of your project (usually named `project.st.css`) you:
.1 import a component stylesheet 
.2 define a css class with a descriptive name like `cancelButton`
.3 extend the component on the class

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

Component stylable stylesheet can use and extend component variants:

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
selector: .comp__root .comp__messageBox.project__cancelButton.button__root
js value: "comp__messageBox project__cancelButton"
*/
.messageBox {
    -st-extends: emphasisBox;
}
```
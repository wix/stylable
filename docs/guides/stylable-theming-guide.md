# Stylable Theming Guide

A **Stylable** Theme is a tool to enable you to standardize styling across an application. You can switch the entire look & feel of an application with a single change.

## Use a **Stylable** Theme in Your Application

### 1 Create a `theme.st.css` File

As a first step, we will create a theme stylesheet called `theme.st.css` that imports all of our components into a single location that can be easily changed. The `theme.st.css` also declares different variants of the components.

```css
@namespace "Theme";
/* theme.st.css */
:import {
    -st-from: './button.st.css';
    -st-default: Button;
}
:import {
    -st-from: './input.st.css';
    -st-default: Input;
}
.cancelButton {
    -st-extends: Button;
    color: red;
}
.submitButton {
    -st-extends: Button;
    color: white;
}
.emailInput {
    -st-extends: Input;
    border: 1px solid black;
}
.passwordInput {
    -st-extends: Input;
    border: 1px solid green;
}
```

### 2 Using The Stylable Theme

The theme is imported into an application using the directive `-st-theme: true;`. Using this directive automatically composes the theme into the application [root](../references/root.md). This means that it can influence all **Stylable** components in the scope of the application.

```css
/* app.st.css */
@namespace "App";
:import {
    -st-theme: true;
    -st-from: "./theme.st.css";
    -st-named: cancelButton, submitButton, passwordInput, emailInput;
}
```

### 3 Using Named Imports from Theme

There are a couple of different ways to use the variants that are imported. You can [extend](../references/extend-stylesheet.md) a class, or declare it directly as a [class selector](../references/class-selectors.md). 

```css
@namespace "App";
:import {
    -st-from: "./theme.st.css";
    -st-named: cancelButton;
}
.myBtn {
    -st-extends: cancelButton;
    color: maroon;
}
.cancelButton {
    color: fuchsia;
}
```

There's a subtle but important difference between the two methods:

* When `myBtn` extends `cancelButton`, **Stylable** writes both classes into the CSS and changes to the styling are local. They do not leak downwards to other elements of the type `cancelButton`.

* When you use the class `cancelButton` directly, you are influencing the type `cancelButton`, and this influences any component in the current scope.

In this example, `myBtn` is limited to influencing this specific instance of `cancelButton`, whereas `.cancelButton` as a class influences all other elements below it in the component tree.

## See Also:

* [Theming a Component Library](./theme-component-library.md)

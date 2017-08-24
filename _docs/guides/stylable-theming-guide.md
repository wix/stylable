# Stylable Themes Guide

A **Stylable** Theme is a tool to enable you to standardize styling across an application. You can switch the entire look & feel of an application with a single change.

## Use a **Stylable** Theme in Your Application

### 1 Apply a **Stylable** Theme

[Import](../references/imports.md) the theme into an application, and it is automatically composed into its [root](../references/root.md). This means that it can influence all **Stylable** components in the scope of the application.

```css
@namespace "App";
:import {
    -st-theme: true;
    -st-from: "a-comps/backoffice-theme.st.css";
}
```

### 2 Import Variants from a **Stylable** Theme

You can import [variants](../references/variants.md) of the components into the application, and apply these variants to the components. 

In this example, the application includes a login form made up of two inputs for email and password, and two buttons for cancel and submit. The CSS imports the theme, and inside of it, the 4 named variants for `Button` and `Input`. You don't have to import `Button` and `Input` because the **Stylable** Theme takes care of importing the actual components.

```css
@namespace "App";
:import {
    -st-theme: true;
    -st-from: "a-comps/backoffice-theme.st.css";
    -st-named: cancelButton, submitButton, passwordInput, emailInput;
}
```

### 3 Use Variants from a Stylable Theme

There are a couple of different ways to use the variants that are imported. You can [extend](../references/extend-stylesheet.md) a class, or declare it directly as a [class selector](../references/class-selectors.md). 

```css
@namespace "Comp";
:import {
    -st-from: "a-comps/backoffice-theme.st.css";
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

* [Theming a Component Library]()  
* [Creating a Stylable Theme]()  
* [Debugging in Stylable]()  

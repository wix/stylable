# Stylable Themes Guide

A Stylable Theme is a tool to allow developers to standardize styling across an application. An easy way to switch the entire look & feel of an application with a single change.

## Using a Stylable Theme in your Application

### Applying a Stylable Theme

We will [import](../references/imports.md) the theme into our application, and it will automatically be composed into its [root](../references/root.md), meaning it will influence all **Stylable** components in the `App` scope.

```css
@namespace "App";
:import {
    -st-theme: true;
    -st-from: "a-comps/backoffice-theme.st.css";
}
```

### Importing Variants from a Stylable Theme

We can then import [variants](../references/variants.md) of the components in our application, and apply these variants to them. For example, our application includes a login form made up of 2 inputs and 2 buttons (email, password, cancel and submit). We will import the theme, and inside of it the 4 named variants of `Button` and `Input`. (There is no need to import `Button` and `Input` as the theme takes care of that for us).

```css
@namespace "App";
:import {
    -st-theme: true;
    -st-from: "a-comps/backoffice-theme.st.css";
    -st-named: cancelButton, submitButton, passwordInput, emailInput;
}
```

### Using Variants from a Stylable Theme

We have a couple of different ways to use the variants we import. We can [extend](../references/extend-stylesheet.md) a class, or declare it directly. 

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

* When `myBtn` extends `cancelButton`, **Stylable** writes both classes into the CSS and changes to the styling are local - they do not leak downwards to other elements of the type `cancelButton`.

* When we use the class `cancelButton` directly, we are influencing the type `cancelButton`, and this will influence any component in our current scope.

`myBtn` is limited to influencing this specific instance of cancelButton, whereas `cancelButton` will influence all other elements below it in the component tree.

## Further Reading

* [Theming a Component Library]()  
* [Creating a Stylable Theme]()  
* [Debugging in Stylable]()  

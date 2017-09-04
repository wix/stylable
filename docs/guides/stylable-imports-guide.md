# Stylable Imports

This guide shows you an example of how to use [imports](../references/imports.md) in **Stylable**.

## 1 Basic Component

Let's start with a simple example of a project containing a number of components. 

Our project needs a new login form which would need a few inputs and buttons. For this example, let's work with a `Button` component.

In this Stylable CSS file for a button, let's:
* Give this component the [namespace](../references/namespace.md) `Button`. 
* Style its [root](../references/root.md). 
* Declare the [classes](../references/class-selectors.md) `icon` and `label` inside of our button to expose these classes as [pseudo-elements](../references/pseudo-elements.md).
* Give it a `cancelButton` variantusing an internal class that paints it red when you want to use it as a cancel button.


```css
/* button.st.css */
@namespace "Button";
.root {
    display: inline-block; /* provide the button root with an internal style */
}
.icon {} /* button pseudo-element */
.label {} /* button pseudo-element */
.cancelButton {
    color: red;
}
```

## 2 Default Imports

Let's now import this button into our `LoginForm` using the directive `-st-default`. When importing this way, the classes that extend the components (in the example, `okButton` extending `Button`) represent the component root and can have access to its pseudo-elements and pseudo-classes. So for example, `okButton` will have a `icon` pseudo-element that we can match.

```css
/* login-form.st.css */
@namespace "LoginForm";
:import {
    -st-from: "./button.st.css";
    -st-default: Button;
}
.okButton {
    -st-extends: Button;
    color: red;
}
.okButton::icon {
    border: 1px solid green;
}
```

## 3 Named Imports

We can now build our login form.

We use the button as well as its variant. The type `Button` is used for the `submit` button, and the variant `cancelButton` for the `cancel` button. We do this by importing them into our `Form` component, and then extending them by name.

> **Note**:  
> When using `-st-named`, [classes](../references/class-selector.md) and [mixins](.,/refernces/mixin-syntax.md) are imported using their actual name at the source. 

```css
/* login-form.st.css */
@namespace "LoginForm";
:import {
    -st-from: "./button.st.css";
    -st-default: Button;
    -st-named: cancelButton;
}
.submit {
    -st-extends: Button;
}
.cancel { 
    -st-extends: cancelButton;
}
```

## 4 Theme Import

The theme is an import that's automatically composed to the root, and is used to give different projects the same look & feel.

Theme imports use the directive `-st-theme: true`. You can read more about theming in the [Stylable theming guide](./stylable-theming-guide.md).

For the theme we create a main `project.st.css` file that imports all the components of our project, and their different variants.

```css
/* project.st.css */
@namespace "Project";
:import {
    -st-from: "./button.st.css";
}
.cancelButton {
    -st-extends: Button;
    color: red;
    border: pink;
}
```

The theme imports this `Project` stylesheet, and is then able to style the entire project.

```css
/* backoffice-theme.st.css */
@namespace "BackofficeTheme";
:import {
   -st-theme: true; /* auto compose to root */
   -st-from: "./project.st.css";
   -st-default: Project;
   -st-named: cancelButton; /* scoped to Project__cancelButton */
}
:import {
   -st-from: "./button.st.css";
   -st-default: Button;
}
Button {
   outline: gold;
}
/* We have the option of matching cancelButton directly by name, scoped to Project__cancelButton */
.cancelButton {
   background: silver;
}
```

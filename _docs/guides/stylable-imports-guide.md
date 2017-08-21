# Stylable Imports

This guide shows you an example of how to use [imports](../references/imports.md) in **Stylable**.

## 1 Basic Component

Let's start with a simple example of a project containing a number of components. 

Our project needs a new login form which would need a few inputs and buttons. For this example, let's work with a `button` component.

In this Stylable CSS file for a button, let's:
* Give this component the [namespace](../references/namespace.md) LoginFormButton. 
* Style its [root](../references/root.md). 
* Declare the [classes](../references/class-selectors.md) `icon` and `label` inside of our button.
* Expose these classes as [pseudo-elements](../references/pseudo-elements.md).


```css
/* button.st.css */
@namespace "LoginFormButton";
.root {
    display: inline-block; /* provide the button root with an internal style */
}
.icon {} /* button pseudo-element */
.label {} /* button pseudo-element */
```

## 2 Import Component into Project CSS

Let's now add a project directory called `project.st.css`. This directory contains all the [variants](../references/variants.md) for our components. We can manage the numerous style variations we need. For our example, let's focus on the `cancelButton` [variant](../references/variants.md) of the `Button` component.

The project file itself imports all the components from the library using the directive `-st-default`. When importing this way, the classes that extend the components (in the example, `cancelButton` extending `Button`) have their entire API available.

```css
/* project.st.css */
@namespace "LoginFormProject";
:import {
    -st-from: "./button.st.css";
    -st-default: Button;
}
.cancelButton {
    -st-variant: true;
    -st-extends: Button;
    color: red;
}
```

## 3 Import Named Values into Project Imports

We can now build our login form.

We use the button as well as its variant. The type `Button` is used for the `OK` button, and the variant `cancelButton` for the `cancel` button. We do this by importing them into our `Form` component, and then extending them by name.

> **Note**:  
> When using `-st-named`, [classes](../references/class-selector.md), [variants](../references/variants.md) and [mixins](.,/refernces/mixin-syntax.md) are imported using their actual name at the source. 

```css
/* login-form.st.css */
@namespace "LoginForm";
:import {
    -st-from: "./button.st.css";
    -st-default: Button;
}
:import {
    -st-from: "./project.st.css"
    -st-named: cancelButton;
}
.OK {
    -st-extends: Button; /* OK pseudo-element extending a button */
}
.cancel { 
    -st-extends: cancelButton; /* cancel pseudo-element extending a button */
}
```

## 4 Import Themes

The theme is an import that's automatically composed to the root, and is used to change the styling of multiple components across multiple applications.

The theme imports project directories using `-st-theme: true` and all of the components that each theme affects use `-st-named`. 

```css
/* backoffice-theme.st.css */
@namespace "Backoffice";
:import { /* root="Backoffice__root Project__root"  */
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
.cancelButton { /* Project__cancelButton */
   background: silver;
}
```

Read more about [theming Stylable components](./stylable-theming-guide.md).

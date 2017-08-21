# Stylable Imports

This guide is meant to explain the use of [imports](../references/imports.md) in **Stylable**.

## Example Project

Let's start with a simple example. 

We have a project containing a number of components. 

Our project needs a new login form.

To create a login form we need a few inputs and buttons (in this example we will focus on the `Button` component).

So this is the CSS of our button. We give this component the [namespace](../references/namespace.md) Button, and style its [root](../references/root.md). We also declare the [classes](../references/class-selectors.md) `icon` and `label` inside of our button, which will be exposed as [pseudo-elements](../references/pseudo-elements.md):


```css
/* button.st.css */
@namespace "Button";
.root {
    display: inline-block; /* button root inner style */
}
.icon {} /* button pseudo-element */
.label {} /* button pseudo-element */
```

## Default Import

Then we add a project directory called `project.st.css`. The directory containts all the variants of our components, and allows us to manage the numerous variations we need. For our example, we will focus on the `cancelButton` [variant](../references/variants.md) of the `Button` component.

The project file itself imports all the components from the library using the directive `-st-default`. When exporting this way, classes that extend the components (in the example, `cancelButton` extending `Button`) have its entire API available.

```css
/* project.st.css */
@namespace "Project";
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

## Named Imports

We can now build our login form.

We use the button as well as its variant (the type `Button` for the `OK` button, and the variant `cancelButton` for the `cancel` button). We do this by importing them into our `Form` component, and then extending them by name.

> **Note**:  
> When using `-st-named`, [classes](../references/class-selector.md), [variants](../references/variants.md) and [mixins](.,/refernces/mixin-syntax.md) are imported using their actual name at the source. 

```css
/* login-form.st.css */
@namespace "Login";
:import {
    -st-from: "./button.st.css";
    -st-default: Button;
}
:import {
    -st-from: "./project.st.css"
    -st-named: cancelButton;
}
.ok {
    -st-extends: Button; /* ok pseudo-element extending a button */
}
.cancel { 
    -st-extends: cancelButton; /* cancel pseudo-element extending a button */
}
```

## Theme Imports

The theme is an import that's automatically composed to the root, and is used to change the styling of multiple components across multiple applications.

The theme imports project directories using `-st-theme: true` and all of the components that each theme will be affecting using `-st-named`. 

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

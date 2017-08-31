# Theme a Component Library

Stylabe allows you to author a [component library](), that can be themed, and easily styled by its consumers.  

## The `project.st.css` File

We recommend creating a `project.st.css` file in the `src` directory of your component library. This can expose an API for the entire project. Importing this CSS into the theme provides access to all the library's features, enabling you to: 

* Expose all vars in use in the project.
* Import and expose all components in the project.
* Declare and expose all the [variants](../references/variants.md) of these components.

```css
/* project.st.css */
@namespace "Project";
:vars {
    red1: #F012BE;
    red2: #FF4136;
    grey1: #DDDDDD;
    blue1: #7FDBFF;
    blue2: #0074D9;
}
:import {
    -st-from: './button/button.st.css';
    -st-default: Button;
}
.cancelButton {
    -st-extends: Button;
    -st-variant: true;
    color: value(red2);
}
.submitButton {
    -st-extends: Button;
    -st-variant: true;
    color: value(grey1);
    background: value(blue1);
}
```

## Themable Components

The components in the library should be as easy to style and theme as possible. We recommend following these guidelines when planning 

* Component authors should expose a good Style API and its [custom states](../references/pseudo-classes.md), and contain the least possible styling required for the component to function, e.g., layout only. (When styling is required as part of the component functionality, it should be explained in a comment, as well as documentation).
* Reusable vars should be declared outside of component. The component can use vars for common values that are less likely to be override-able. For example, don't define colors in a component
* Variants should be declared in the main `project.st.css` file, and should not be part of the component code unless required.

## Themable Project Structure

As a best practice we recommend following this folder structure:

* the `src/components` folder will contain a folder for each component, where each component will have a Stylable CSS file using the naming convention `my-component.st.css`
* the `src/components` folder will include a `project.st.css` [file](#the-project-file) that helps theme our library
* the `src/themes` folder will include the relevant theme files

```
src/
    |
    --- components/
    |   |
    |   project.st.css
    |   |
    |   --- my-component/
    |       |
    |       index.ts
    |       my-component.tsx
    |       my-component.st.css
    |
    --- themes/
    |   |
    |   backoffice-theme.st.css
    |   frontoffice-theme.st.css
```
## Declaring Vars

One of the primary uses of themes is to standardise styles across an application. [Vars](../references/variables.md) offer a tools to standardize specific CSS values across the application.

For example, the cancelButton variant of the Button component needs to use the tone of Red used elsewhere in the application theme.

```css
@namespace "Button";
:vars {
    wonderRed: #F012BE;
}
.root {
    background: #b0e0e6;
}
.icon {
    background-image: url(./assets/btnIcon.svg);
}
.label {
    font-size: 16px;
    color: rgba(81, 12, 68, 1.0)
}
.cancelButton {
    -st-extends: root;
    -st-variant: true;
    color: value(wonderRed);
}
```

## Applying the Theme to our Project

Lastly, in our theme, we will import our `project.st.css` and apply theming to it.

The structure of this file will be very similar to the `project.st.css`, and set all values specific to it. 

```css
@namespace "BackofficeTheme";
:vars {
    pink1: #ffb3ff;
    pink2: #ff00ff;
}
:import {
    -st-from: '../components/project.st.css';
    -st-default: Project;
    -st-named: cancelButton, submitButton, horizontalSlider, verticalSlider;
}
.cancelButton {
    background: value(pink1);
}
```

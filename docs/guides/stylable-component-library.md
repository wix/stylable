# Create a Stylable Component Library

Stylable enables you to author a component library, that can be themed, and easily consumed and styled, by other **Stylable** projects.  

## Library recommended folder structure

As a best practice, we recommend following this folder structure:

```
src/
    |
    --- components/
    |   |
    |   --- my-component/
    |   |   |
    |   |   my-component.jsx
    |   |   my-component.st.css
    |   |
    |   project.st.css
    |
    --- themes/
    |   |
    |   backoffice-theme.st.css
    |   app-theme.st.css
```

* The `src/components` folder contains:
    * a project stylesheet describing the project CSS API
    * a folder for each component with its stylable stylesheet
* The `src/themes` folder contains the relevant theme files.

## The `project.st.css` file

As a first step, create a [project commons stylesheet](./project-commons.md) named `project.st.css` in the `src/components` directory. This exposes the API for the project. 

> **Note**:
> It is recommended to leave the project's CSS ruleset empty so it can be defined in a theme file. 

## Themable components

Your components should be as easy to style and theme as possible. We recommend following these guidelines when planning: 

* Expose a good style API and its [custom states](../references/pseudo-classes.md). 
* The component API should contain the minimum styling required for the component to function, for example layout is sometimes required. 
* The effect of CSS combinations is not always easy to understood and styles are generally less tested, therefore, we recommend adding comments that explain the reason for unclear CSS.
* Reusable vars should be declared outside of the component. The component can use vars for common values that are less likely to be override-able.
* Use [component variants](./component-variants.md) and [shared classes](./shared-classes.md) from the project file (`project.st.css`).

More best practices for themable components can be found in the [component style best practices guide](./component-style-best-practices.md).

In the following code, you can see a component described with:
* 2 colors used from project
* 1 shared class 

```css
/* app.st.css */
@namespace "App";
:import {
    -st-from: '../project.st.css';
    -st-named: color1, color2, emphasisBox;
}
.root {
    color: value(color1);
    background: value(color2);
}
.messageBox {
    /* append emphasisBox CSS class to messageBox JS output */
    -st-extends: emphasisBox;
}
```

## Theme

Our library can offer multiple theme files that render a different look and feel per theme. A theme imports the `project.st.css` file as [theme](../references/theme.md) to override variables, variants and classes from the library.

In the following code, you can see a theme file customizing the library:
* override `color1` and `color2`
* CSS for `cancelButton` variant component
* CSS for `emphsisBox` shared class

```css
/* backoffice-theme.st.css */
@namespace "backofficeTheme";
:import {
    -st-from: '../project.st.css';
    -st-named: color1, color2, cancelButton, emphasisBox;
    color1: white;
    color2: red;
}
.cancelButton {
    color: value(color1);
    background: value(color2);
}
.emphasisBox {
    border: 3px solid value(color2);
}
```

Read more about using themes in [theme an application](./styalble-application.md#Apply component library theme).

<!-- ## Playground

{% playground id="stylableComponentLibrary", title="Stylable Component Library", dir="./guides/stylable-component-library", entry="app", active="app.tsx", readOnly=false %}{% endplayground %} -->

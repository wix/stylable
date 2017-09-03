# Stylable Component Library

Stylable allows you to author a component library, that can be themed, and easily consumed and styled, by other stylable projects.  

## Library recommended folder structure

As a best practice we recommend following this folder structure:

```
src/
    
    |
    --- components/
    |   |
    |   --- my-component/
    |       |
    |       my-component.jsx
    |       my-component.st.css
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
* The `src/themes` folder includes the relevant theme files

## The `project.st.css` file

We create a [project commons stylesheet](./project-commons.md) named `project.st.css` in the `src/components` directory. This exposes the API for the project. 

> **Notice**:
> It is recommended to leave project CSS ruleset empty to be defined in a theme file. 

## Themable components

Our components should be as easy to style and theme as possible. We recommend following these guidelines when planning: 

* Expose a good style API and its [custom states](../references/pseudo-classes.md). 
* Component API should contain the minimum styling required for the component to function, for example layout is sometimes required. 
* Because the effect of CSS combination is not always easy to understood and style is usually less tested, try adding comments that explain the reason for unclear CSS.
* Reusable vars should be declared outside of the component. The component can use vars for common values that are less likely to be override-able.
* Use [component variants](./component-variants.md) and [shared classes](./shared classes.md) from `project.st.css` file.

More best practices for themable components can be found in the [component style best practices guide](./component-style-best-practices.md).

In the following code we are describing a component with:
* 2 colors used from project
* 1 shared class used to mark a DOM element

```css
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

Our library can offer multiple theme files that will render it with different look an feel. A theme imports the `project.st.css` file as [theme](../references/theme.md) to override variables, variants and classes the library offer.

In the following code we are describing a theme file customizing out library:
* override `color1` and `color2`
* CSS for `cancelButton` variant component
* CSS for `emphsisBox` shared class

```css
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

See more info on using theme in [theme an application guide](./styalble-application.md#Apply component library theme).
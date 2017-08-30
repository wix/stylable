# How to Understand Stylable Output

For advanced CSS users, it's useful to be able to read **Stylable** output to understand what is affecting a specific element and to debug if necessary. You want to be able to see what has been applied, and connect it to specific declarations in the code.

## Basics of Namespacing

**Stylable** automatically [namespaces](../references/namespace.md) all style rules, to scope each component and prevent styles from "leaking" into other components. The CSS output displays a randomly generated hash string that replaces the class to namespace it. Components also reflect their source component, relative to from where they were scoped. For example in the following code example, the selector gets a hash string with underscore root (`_root`) because it was scoped to the root class. 


```css
CSS
.some-class {}

CSS OUTPUT
/*
@selector ".<randomly generated hash string>__root"
@exports "" - see Default Import section
*/
```

You can declare a specific namespace for your component, to more easily track it. **Stylable's** automatic namespacing is not human-readable. In the example below, when you declare the namespace `ToggleBtn`, the CSS output reflects the namespacing so you can identify it in the output.

```css
CSS
@namespace "ToggleBtn";
.some-class {}

CSS OUTPUT
/*
@selector ".ToggleBtn<randomly generated hash string>__root"
@exports "ToggleBtn__root"
*/
```

## Imports 

Let's continue with the `ToggleBtn` component that is now [imported](../references/imports.md) into the `DefaultImport` and `NamedImport` examples. Here the component is namespaced and the sections following describe the different ways to import the component.

```css
/* toggle-btn.st.css */
@namespace "ToggleBtn";
.root {
    -st-states: toggled;
}

.checkBox { color:red; }
.highContrast { color:green; }
:vars {
    color1: blue;
}
```

### Default Imports

Let's examine the differences between using [tag-selectors](../references/tag-selectors.md) and [class-selectors](../references/class-selectors.md) when importing a namespaced component. The tag selector is scoped to the component itself, whereas the class selector is scoped to the local stylesheet.

```css
@namespace "DefaultImport";
:import {
    -st-from: './toggle-btn.st.css';
    -st-default: ToggleBtn;
}
```
```css
/* TAG SELECTORS */

CSS 
ToggleBtn {}

CSS OUTPUT
/*
@selector ".DefaultImport__root .ToggleBtn__root"
@exports "" - tag selectors are not exported
*/

CSS 
ToggleBtn:toggled {}

CSS OUTPUT
/*
@selector ".DefaultImport__root .ToggleBtn__root[data-ToggleBtn-toggled]"
@exports ""
*/

CSS
ToggleBtn::checkBox {}

CSS OUTPUT
/*
@selector ".DefaultImport__root .ToggleBtn__root .ToggleBtn__checkBox"
@exports ""
*/
```

```css
/* CLASS SELECTORS */

CSS
.main-toggle {
    -st-extends: ToggleBtn;
}

CSS OUTPUT
/*
@selector ".DefaultImport__root .DefaultImport__main-toggle.ToggleBtn__root"
@exports "DefaultImport__main-toggle"
*/

CSS
.main-toggle:toggled {}

CSS OUTPUT
/*
@selector ".DefaultImport__root .DefaultImport__main-toggle.ToggleBtn__root[data-ToggleBtn-toggled]"
@exports "" - custom pseudo-class overrides are not exported
*/

CSS
.main-toggle::highContrast {}

CSS OUTPUT
/*
@selector ".DefaultImport__root .DefaultImport__main-toggle.ToggleBtn__root  .ToggleBtn__highContrast"
@exports "" - custom pseudo-elements are not exported
*/
```

### Named Imports

Named imports result in slightly different output, and do not extend the root of the component as the default import of the component does. Let's take a look at the differences.

```css
CSS
@namespace "NamedImport";
:import {
    -st-from: './ToggleBtn.st.css';
    -st-named: main-toggle as myToggle, highContrast, main-background-color;
}

.myToggle {}

CSS OUTPUT
/*
@selector ".NamedImport__root .ToggleBtn__checkBox"
@exports "ToggleBtn__checkBox"
*/

CSS
.local {
    -st-extends: highContrast;
}

CSS OUTPUT
/*
@selector ".NamedImport__root .NamedImport__local.ToggleBtn__highContrast"
@exports "NamedImport__local ToggleBtn__highContrast"
*/

CSS
.highContrast {
    -st-extends: highContrast;
}

CSS OUTPUT
/*
@selector ".NamedImport__root .NamedImport__highContrast.ToggleBtn__highContrast"
@exports "NamedImport__highContrast ToggleBtn__highContrast"
*/

CSS
.someclass {
    border: 1px solid value(main-background-color)
}
/* To illustrate use of value(var) */
```

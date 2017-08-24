# Reading Stylable Output

Reading **Stylable** output is often necessary in order to understand what is affecting a specific element. You want to be able to see what is applied, and connect it to specific declarations in the code.

## Basics of Namespacing

**Stylable** automatically [namespaces](../references/namespace.md) all style rules, to scope each component and prevent styles from "leaking" into other components. The CSS output will show some hash that replaces the class in order to namespace it. Components will also reflect their source component, relative to the scope. 

```css
.some-class {}

/*
@selector ".[some hash]__root"
@exports "" - see Default Import section
*/
```

You can declare a specific namespace for your component, in order to track it easier (**Stylable** automatic namespacing is not human-readable). In the example below, when we declare the namespace `ToggleBtn`, the CSS output will reflect our namespacing:

```css
@namespace "ToggleBtn";
.some-class {}

/*
@selector ".ToggleBtn[some hash]__root"
@exports "ToggleBtn__root"
*/
```

## Imports Output

Let's continue with a component `ToggleBtn` that we will want to import into our `DefaultImport`, `NamedImport` and `ThemeImport` examples.

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

We can then see the intricacies of the differences between using [tag-selectors](../references/tag-selectors.md) and [class-selectors](../references/class-selectors.md). The scoping in the former is to the component itself, whereas in the latter it is attached to the local scope.

```css
@namespace "DefaultImport";
:import {
    -st-from: './toggle-btn.st.css';
    -st-default: ToggleBtn;
}

/* TAG SELECTORS */

ToggleBtn {}
/*
@selector ".DefaultImport__root .ToggleBtn__root"
@exports "" - tag selectors are not exported
*/

ToggleBtn:toggled {}
/*
@selector ".DefaultImport__root .ToggleBtn__root[data-ToggleBtn-toggled]"
@exports ""
*/

ToggleBtn::checkBox {}
/*
@selector ".DefaultImport__root .ToggleBtn__root .ToggleBtn__checkBox"
@exports ""
*/

/* CLASS SELECTORS */

.main-toggle {
    -st-extends: ToggleBtn;
}
/*
@selector ".DefaultImport__root .DefaultImport__main-toggle.ToggleBtn__root"
@exports "DefaultImport__main-toggle"
*/

.main-toggle:toggled {}
/*
@selector ".DefaultImport__root .DefaultImport__main-toggle.ToggleBtn__root[data-ToggleBtn-toggled]"
@exports "" - custom pseudo-class overrides are not exported
*/

.main-toggle::highContrast {}
/*
@selector ".DefaultImport__root .DefaultImport__main-toggle.ToggleBtn__root  .ToggleBtn__highContrast"
@exports "" - custom pseudo-elements are not exported
*/
```

### Named Imports

Named imports will result in slightly different output, and will not extend the root of the component like the default component does.

```css
@namespace "NamedImport";
:import {
    -st-from: './ToggleBtn.st.css';
    -st-named: main-toggle as myToggle, highContrast, main-background-color;
}

.myToggle {}
/*
@selector ".NamedImport__root .ToggleBtn__checkBox"
@exports "ToggleBtn__checkBox"
*/

.local {
    -st-extends: highContrast;
}
/*
@selector ".NamedImport__root .NamedImport__local.ToggleBtn__highContrast"
@exports "NamedImport__local ToggleBtn__highContrast"
*/

.highContrast {
    -st-extends: highContrast;
}
/*
@selector ".NamedImport__root .NamedImport__highContrast.ToggleBtn__highContrast"
@exports "NamedImport__highContrast ToggleBtn__highContrast"
*/

.someclass {
    border: 1px solid value(main-background-color)
}
/* To illustrate use of value(var) */
```

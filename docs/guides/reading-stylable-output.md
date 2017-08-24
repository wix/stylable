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
    -st-named: checkBox as aliased, highContrast, main-background-color;
}

.aliased {}
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

## Theme Imports

Themes 

```css
@namespace "App";
:import { /* root="App__root Backoffice__root Project__root"  */
    -st-theme: true; /* auto compose to root */
    -st-from: "a-comps/backoffice-theme.st.css";
}
```

### CSS OUTPUT:
```css
/* a-comps/button.st.css */
.Button__root { display: inline-block; } 
/* a-comps/backoffice-theme.st.css */
.Backoffice__root .Button__root { outline: gold; } /* applied by the theme */
```

## Theme in application (with variant cancelButton and Button used)

We can also use variants in our theme, importing them using the directive `-st-named` inside our theme import. For example, below we import the variant `cancelButton` declared in the imported project (see [imports guide](./stylable-imports-guide.md) for an explanation about this example).

We can then make local or global (in our current scope) overrides to the components and their variants, based on our needs.

```css
/* app.st.css */
@namespace "App";
:import { /* root="App__root Backoffice__root Project__root"  */
    -st-theme: true; /* auto compose to root */
    -st-from: "a-comps/backoffice-theme.st.css";
    -st-named: cancelButton;
}
.cancelButton {
    border: 10px solid orange;
}
```
output.css
```css
/* a-comps/button.st.css */
.Button__root { display: inline-block; }
/* a-comps/project.st.css */
.Project__root .Project__cancelButton { color: red; }
/* a-comps/backoffice-theme.st.css */
.Backoffice__root .Button__root { outline: gold; }
.Backoffice__root .Project__cancelButton { outline: silver; }
/* ./app.st.css */
.App__root .Project__cancelButton { border: 10px solid orange; }
```

## Extending vs. Overriding

A component can also extends a class, rather than reference it directly.

There's a subtle but important different between the two methods:
* When `myBtn` extends `cancelButton`, **Stylable** writes both classes into the CSS and changes to the styling are local - they do not leak downwards to other elements of the type `cancelButton`. 
* When we use the class `cancelButton` directly, we are influencing the type `cancelButton`, and this will influence any component in our current scope.


```css
@namespace "Comp";
:import {
    -st-from: "a-comps/backoffice-theme.st.css";
    -st-named: cancelButton;
}
.myBtn { /* class="Comp__myBtn Project__cancelButton" */
    -st-extends: cancelButton;
    color: maroon;
}
.cancelButton { /* class="Project__cancelButton" */
    color: fuchsia;
}
```

Both are available as an API to a component using our `Comp` - but `myBtn` is limited to influencing this specific button, whereas `cancelButton` will influence all other elements below it in the component tree.

Notice the difference between `Comp` and `Comp2` - where `Comp2` doesn't scope `cancelButton` to it in any way.


### CSS API:
```css
/* app.st.css */
@namespace "App";
.root {
    border: 20px solid purple;
}
```
```css
/* comp.st.css */
@namespace "Comp";
:import {
    -st-from: "a-comps/backoffice-theme.st.css";
    -st-named: cancelButton;
}
.myBtn { /* class="Comp__myBtn Project__cancelButton" */
    -st-extends: cancelButton;
    color: salmon;
}
```
```css
/* comp2.st.css */
@namespace "Comp2";
:import {
    -st-from: "a-comps/frontoffice-theme.st.css";
    -st-named: cancelButton;
}
.cancelButton { /* class="Project__cancelButton" */
    color: teal;
}
```

### CSS OUTPUT:
```css
/* a-comps/button.st.css */
.Button__root { display: inline-block; }
/* a-comps/project.st.css */
.Project__root .Project__cancelButton { color: red; }
/* a-comps/backoffice-theme.st.css */
.Backoffice__root .Button__root { outline: gold; }
.Backoffice__root .Project__cancelButton { outline: silver; }
.Frontoffice__root .Button__root { outline: gold; }
.Frontoffice__root .Project__cancelButton { outline: silver; }
/* ./comp.st.css */
.Comp__root .Comp__myBtn.Project__cancelButton { color: salmon; }
/* ./comp2.st.css */
.Comp2_root .Project__cancelButton { color: teal; }
/* ./app.st.css */
.App__root { border: 20px solid purple; }
```

## Theme vars

The theme is also a good place to include all [variables](../references/variables.md). We declare them at the root of the theme and are able to use them throughout.

```css
/* backoffice-theme.st.css */
@namespace "Backoffice";
:import { /* root="Backoffice__root Project__root"  */
    -st-theme: true; /* auto compose to root */
    -st-from: "./project.st.css";
    -st-default: Project;
    -st-named: cancelButton; /* scoped to Project__cancelButton */
}
:vars {
    color1: gold;
    color2: silver;
}
Button {
    outline: value(color1);
}
.cancelButton { 
    background: value(color2);
}
```

## Theme vars override (with Button used)

In our application, we can override specific vars that are already declared in the system. These allow us to effect every component in the theme that's using the var.

They will _not_ be available for use in the scope of the app. In the example below, if we try to use `color1` inside of the class `.cancelButton` we would get an error. 

Note also, that if we declare a var called `color1` inside of a `:vars` declaration block, it will not change any of the imported components of the theme, but will work locally.

### CSS API
```css
/* app.st.css */
@namespace "App";
:import { /* root="App__root Backoffice__root Project__root"  */
    -st-theme: true; /* auto compose to root */
    -st-from: "a-comps/backoffice-theme.st.css";
    -st-named: cancelButton;
    color1: black;
    color2: white;
}
:vars {
    border1: 10px solid orange;
}
.cancelButton {
    border: value(border1);
    color: value(color1); /* ERROR: variable color1 is not defined */
}
```

### CSS OUTPUT:
```css
/* a-comps/button.st.css */
.Button__root { display: inline-block; }
/* a-comps/project.st.css */
.Project__root .Project__cancelButton { color: red; }
/* a-comps/backoffice-theme.st.css */
.Backoffice__root .Button__root { outline: gold; }
.Backoffice__root .Project__cancelButton { outline: silver; }
/* override backoffice with App */
.App__root .Button__root { outline: black; }
.App__root .Project__cancelButton { outline: white; }
/* ./app.st.css */
.App__root .Project__cancelButton { border: 10px solid orange; }
```
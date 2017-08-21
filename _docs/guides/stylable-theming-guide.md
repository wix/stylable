# Theming Stylable Components

## What is theming?

Theming is a way to change the styling of multiple components across multiple applications. In many cases you want to apply a single theme to all components in multiple applications that are a part of the same product. 

The theme in Stylable will import the Components it affects, and apply new styling to it. Our app will be able to import a theme in order to change the styling of multiple components. Then, based on whether the specific imports are being used, we will expect to see them in the CSS output.

> For the start of this exmple, see [stylable imports](./stylable-imports-guide.md). 

## Theme In Application (with Button used)

We start with a theme of a application, where the `Button` component is used as a [tag selector](../references/tag-selector.md) or [extended](../references/extend-stylesheet.md) somewhere in the application.

We will apply a theme called `Backoffice` to our application, and we can expect the following:

### CSS API:
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

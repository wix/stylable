# Pseudo-classes

In addition to CSS's native [pseudo-classes](https://developer.mozilla.org/en/docs/Web/CSS/Pseudo-classes), Stylable allows you to define custom pseudo-classes that allow you to apply styles according to state.

Let's say you want a component to have a different styling applied to it when its content is loading. You can define "loading" as a custom pseudo-class and toggle it in your component.

Native pseudo classes like `:hover` and `nth-child()` are valid and supported natively.

> *Note*: custom states may only be applied to simple selectors like [tag selector](./tag-selectors.md), [class selector](./class-selectors.md) and [root selector](./root.md).

## Define custom states

To define custom states, you tell Stylable the list of possible custom states that the CSS declaration may be given, using the Stylable property `-sb-states`:

CSS API:
```css
/* example1.css */
.root{
    -sb-states: toggled, loading;
}
.root:toggled { color:red; }
.root:loading { color:green; }
```

CSS OUTPUT:
```css
/* namespaced to example1 */
.root[data-toggled] { color:red; }
.root[data-loading] { color:green; }
```

> Notice: custom pseudo states are implemented using `data-*` attributes that are scoped to the stylesheet.

## Override native

It is also possible to override any native pseudo-class. This allows you to write [polyfills](https://remysharp.com/2010/10/08/what-is-a-polyfill) for forthcoming CSS pseudo-classes, and also ensures that if you define a custom state with a name, that in the future, accidentally clashes with a new CSS pseudo-class, your app's behavior will not change.

We don't recommend you override an existing CSS pseudo-class unless you want to drive your team-mates insane.

## Extend external stylesheet

CSS API:
```css
/* example2.css */
:import {
    -sb-from: "./example1.css"; /* stylesheet a previous example */
    -sb-default: Comp1; /* import color1 and color2 variables */
}
.media-button{
    -sb-extends: Comp1;
    -sb-states: toggled, selected;
}
.media-button:hover { border:10px solid black; }
.media-button:toggled { color:gold;}
.media-button:loading { color:silver; }
.media-button:selected { color:salmon; }
```

CSS OUTPUT:
```css
/* namespaced to example1 */
.root[data-toggled]{ color:red; }
.root[data-loading]{ color:green; }
/* namespaced to example2 */
.root .media-button:hover { border:10px solid black; } /* native hover - not declared by anyone */
.root .media-button[data-toggled] { color:gold;} /* toggled scoped to example2 - last to declareg */
.root .media-button[data-loading] { color:silver; } /* loading scoped to example1 - only one to declare */
.root .media-button[data-selected] { color:salmon; } /* selected scoped to example2 - only one to declare */
```

## Enabling custom states

Custom pseudo-classes are implemented using `data-*` attributes and need additional run-time logic to control when they are on and off.

Stylable offers [React CSS state integration](./react-integration.md) to help components manage custom pseudo-states easily:

```jsx
/* render of stylable component */
render() {
    return <div cssState={{
        toggled:true,
        selected:false
    }} ></div>
}
```


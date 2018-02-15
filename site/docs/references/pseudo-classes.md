---
id: references/pseudo-classes
title: Pseudo-Classes
layout: docs
---

In addition to CSS's native [pseudo-classes](https://developer.mozilla.org/en/docs/Web/CSS/Pseudo-classes), like `:hover` and `:nth-child()`, **Stylable** enables you to define custom pseudo-classes so that you can apply styles to your components based on state.

Let's say you want a component to have different styling applied to it when its content is loading. You can define `loading` as a custom pseudo-class and toggle it in your component.

## Define custom pseudo-classes

To define custom pseudo-classes, you use the **Stylable** directive rule `-st-states` to provide a list of the possible custom pseudo-classes that you want to use in the CSS.

The `-st-states` directive rule can be defined only for simple selectors like [class selector](./class-selectors.md) and [root](./root.md).

## Simple custom pseudo-classes

To define custom pseudo-classes, or states, without parameters, you tell **Stylable** the list of possible custom states that the CSS declaration may be given. You can then target the states in the context of the selector. In this example `toggled` and `loading` are added to the `root` selector and then targeted with different colors. 

```css
/* example1.st.css */
@namespace "Example1";
.root {
    -st-states: toggled, loading;
}
.root:toggled { color: red; }
.root:loading { color: green; }
.root:loading:toggled { color: blue; }
```

```css
/* CSS output*/
.Example1__root[data-Example1-toggled] { color: red; }
.Example1__root[data-Example1-loading] { color: green; }
.Example1__root[data-Example1-loading][data-Example1-toggled] { color: blue; }
```

## Custom pseudo-classes with parameters

To simplify the CSS selector interface, you can also define custom pseudo-classes that accept a parameter. 

For example, a cell in a grid can be marked and later targeted using `column` and `row` pseudo-classes.

```css
.cell {
    -st-states: column(number), 
                row(number);
}

.cell:column(1):row(4) {
    color:red;
}
```
**Stylable** offers a built-in system of [state types](./state-parameter-types.md) that provide a better development experience when targeting pseudo-classes. 

## Mapped states

**Stylable** generates custom pseudo-classes using `data-*` attributes. When you are building your components with **Stylable** the standard DOM implementation is good, but you might want to target the state in a custom way. 

You can use this feature to define custom pseudo-classes even if the existing components you are targeting are not based on **Stylable**. 

In this example, `toggled` and `loading` are defined on the root class with their custom implementation. 

```css
/* example-custom.st.css */
@namespace "ExampleCustom";
.root {
    -st-states: toggled(".on"), loading("[dataSpinner]");
}
.root:toggled { color: red; }
.root:loading { color: green; }
```

```css
/* CSS output*/
.ExampleCustom__root.on { color: red; }
.ExampleCustom__root[dataSpinner] { color: green; }
```

> **Note**    
> When writing custom mappping, ensure your custom selector targets a simple selector, and not a CSS child selector.

## State inheritance

You can extend another imported stylesheet and inherit its custom pseudo-classes. In this example the value `Comp1` is imported from the `example1.css` stylesheet and extended by `.mediaButton`. The custom pseudo-classes `toggled` and `selected` are defined to be used on the `mediaButton` component. 

```css
/* example2.st.css */
@namespace "Example2";
:import {
    -st-from: "./example1.st.css";
    -st-default: Comp1;
}
.mediaButton {
    -st-extends: Comp1;
    -st-states: toggled, selected;
}
.mediaButton:hover { border: 0.2em solid black; } /* native CSS because no custom declaration*/
.mediaButton:loading { color: silver; } /* from Example1 */
.mediaButton:selected { color: salmon; } /* from Example2 */
.mediaButton:toggled { color: gold; } /* included in Example1 but overridden by Example2 */
```

```css
/* CSS output*/
.Example1__root[data-Example1-toggled] { color: red; }
.Example1__root[data-Example1-loading] { color: green; }
.Example2__root .Example2__mediaButton:hover { border: 0.2em solid black; } /* native hover - not declared */
.Example2__root .Example2__mediaButton[data-Example1-loading] { color: silver; } /* loading scoped to Example1 - only one to declare */
.Example2__root .Example2__mediaButton[data-Example2-selected] { color: salmon; } /* selected scoped to Example2 - only one to declare */
.Example2__root .Example2__mediaButton[data-Example2-toggled] { color: gold;} /* toggled scoped to Example2 - last to declare */
```

> **Note**    
> You can override the behavior of native pseudo-classes. This can enable you to write [polyfills](https://remysharp.com/2010/10/08/what-is-a-polyfill) for forthcoming CSS pseudo-classes to ensure that when you define a name for a custom pseudo-class, if there are clashes with a new CSS pseudo-class in the future, your app's behavior does not change. We don't recommend you to override an existing CSS pseudo-class unless you want to drive your teammates insane.

## Enable custom pseudo-classes

Custom pseudo-classes are implemented using `data-*` attributes and need additional runtime logic to control when they are on and off. 

**Stylable** offers [React CSS state integration](../getting-started/react-integration.md) to help components manage custom pseudo-classes easily.

{% raw %}

```jsx
/* render of stylable component */
render() {
    return <div style-state={{ /* used in stylable-react-integration to implement pseudo-classes */
        toggled:true,
        selected:false
    }} ></div>
}
```

{% endraw %}

# Pseudo-classes

In addition to CSS's native [pseudo-classes](https://developer.mozilla.org/en/docs/Web/CSS/Pseudo-classes), **Stylable** enables you to define custom pseudo-classes so that you can apply styles to your components based on state.

Let's say you want a component to have different styling applied to it when its content is loading. You can define `loading` as a custom pseudo-class and toggle it in your component.

Native pseudo-classes like `:hover` and `:nth-child()` are valid and supported natively.

## Define custom pseudo-classes

To define custom pseudo-classes, you use the **Stylable** directive rule `-st-states` to provide a list of the possible custom pseudo-classes that you want to use in the CSS.

The `-st-states` directive rule can be defined only for simple selectors like [tag selector](./tag-selectors.md), [class selector](./class-selectors.md) and [root](./root.md).

## Name custom pseudo-classes and assign a style to them

To define custom states for a simple selector, you tell **Stylable** the list of possible custom states that the CSS declaration may be given. You can then target the states in the context of the selector. In this example `toggled` and `loading` are added to the root selector and then assigned different colors. 

### CSS API:
```css
/* example1.st.css */
@namespace "Example1"
.root {
    -st-states: toggled, loading;
}
.root:toggled { color: red; }
.root:loading { color: green; }
.root:loading:toggled { color: blue; }
```

### CSS OUTPUT:
```css
.Example1__root[data-Example1-toggled] { color: red; }
.Example1__root[data-Example1-loading] { color: green; }
.Example1__root[data-Example1-loading][data-Example1-toggled] { color: blue; }
```

> **Note**:  
> You can also override the behavior of native pseudo-classes. This can enable you to write [polyfills](https://remysharp.com/2010/10/08/what-is-a-polyfill) for forthcoming CSS pseudo-classes to ensure that when you define a name for a custom pseudo-class, if there are clashes with a new CSS pseudo-class in the future, your app's behavior does not change. We don't recommend you to override an existing CSS pseudo-class unless you want to drive your teammates insane.

## Extend external stylesheet

You can extend another imported stylesheet and inherit its custom pseudo-classes. In this example the value `Comp1`is imported from the `example1.css` stylesheet and extended by `.media-button`. The custom pseudo-classes `toggled` and `selected` are defined to be used on the `media-button` component. 

### CSS API:
```css
/* example2.st.css */
@namespace "Example2"
:import {
    -st-from: "./example1.st.css";
    -st-default: Comp1;
}
.media-button {
    -st-extends: Comp1;
    -st-states: toggled, selected;
}
.media-button:hover { border: 10px solid black; } /* native CSS because no custom declaration*/
.media-button:loading { color: silver; } /* from Example1 */
.media-button:selected { color: salmon; } /* from Example2 */
.media-button:toggled { color: gold; } /* included in Example1 but overridden by Example2 */
```

### CSS OUTPUT:
```css
.Example1__root[data-Example1-toggled] { color: red; }
.Example1__root[data-Example1-loading] { color: green; }
.Example2__root .Example2__media-button:hover { border: 10px solid black; } /* native hover - not declared */
.Example2__root .Example2__media-button[data-Example1-loading] { color: silver; } /* loading scoped to Example1 - only one to declare */
.Example2__root .Example2__media-button[data-Example2-selected] { color: salmon; } /* selected scoped to Example2 - only one to declare */
.Example2__root .Example2__media-button[data-Example2-toggled] { color: gold;} /* toggled scoped to Example2 - last to declare */
```

## Map custom pseudo-classes

You can use this feature to define states even if the existing components you are targeting are not based on **Stylable**. In this example, `toggled` and `loading` are defined on the root class with their custom implementation. In the CSS output,instead of the default behavior in **Stylable** of generating the `data-*` attributes to target states, it uses the custom implementation defined in the source. 

### CSS API:
```css
/* example-custom.st.css */
@namespace "ExampleCustom"
.root {
    -st-states: toggled(".on"), loading("[data-spinner]");
}
.root:toggled { color: red; }
.root:loading { color: green; }
```

### CSS OUTPUT:
```css
.ExampleCustom__root.on { color: red; }
.ExampleCustom__root[data-spinner] { color: green; }
```

> Note: custom mapping should define selector that target one element (no CSS child elements) 

## Enable custom pseudo-classes

Custom pseudo-classes are implemented using `data-*` attributes and need additional runtime logic to control when they are on and off.

**Stylable** offers [React CSS state integration](./react-integration.md) to help components manage custom pseudo-classes easily.

{% raw %}

```jsx
/* render of stylable component */
render() {
    return <div cssStates={{
        toggled:true,
        selected:false
    }} ></div>
}
```

{% endraw %}

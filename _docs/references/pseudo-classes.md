# Pseudo-classes

In addition to CSS's native [pseudo-classes](https://developer.mozilla.org/en/docs/Web/CSS/Pseudo-classes), **Stylable** enables you to define custom pseudo-classes so that you can apply styles to your components based on state.

Let's say you want a component to have different styling applied to it when its content is loading. You can define "loading" as a custom pseudo-class and toggle it in your component.

Native pseudo-classes like `:hover` and `:nth-child()` are valid and supported natively.

## Define custom pseudo-classes

To define custom pseudo-classes, you use the **Stylable** directive rule `-sb-states` to provide a list of the possible custom pseudo-classes that you want to use in the CSS.

The `-sb-states` directive rule can be defined only for simple selectors like [tag selector](./tag-selectors.md), [class selector](./class-selectors.md) and [root](./root.md).

## Name custom pseudo-classes and assign a style to them

To define custom states for a simple selector, you tell **Stylable** the list of possible custom states that the CSS declaration may be given. You can then target the states in the context of the selector. In this example `toggled` and `loading` are added to the root selector and then assigned different colors. 

CSS API:
```css
/* example1.css */
.root{
    -st-states: toggled, loading;
}
.root:toggled { color:red; }
.root:loading { color:green; }
.root:loading:toggled { color:blue; }
```

CSS OUTPUT:
```css
/* namespaced to example1 */
.root[data-example1-toggled] { color:red; }
.root[data-example1-loading] { color:green; }
.root[data-example1-loading][data-example1-toggled] { color:blue; }
```

> Note: You can also override the behavior of native pseudo-class. This can enable you to write [polyfills](https://remysharp.com/2010/10/08/what-is-a-polyfill) for forthcoming CSS pseudo-classes to ensure that when you define a name for a custom pseudo-class, if there are clashes with a new CSS pseudo-class in the future, your app's behavior does not change. We don't recommend you to override an existing CSS pseudo-class unless you want to drive your teammates insane.

## Map custom pseudo-classes

You can use this feature to define states even if the existing components you are targeting are not based on **Stylable**. In this example, `toggled` and `loading` are defined on the root class with their custom implementation. In the CSS output, instead of the default behavior in **Stylable** of generating the `data-*` attributes to target states, it uses the custom implementation defined in the source. 

CSS API:
```css
/* example-custom.css */
.root{
    -st-states: toggled(".on"), loading("[data-spinner]");
}
.root:toggled { color:red; }
.root:loading { color:green; }
```

CSS OUTPUT:
```css
/* namespaced to example-custom */
.root.on { color:red; }
.root[data-spinner] { color:green; }
```

## Extend external stylesheet

You can extend another imported stylesheet and inherit its custom pseudo-classes. In this example the value `Comp1`is imported from the `example1.css` stylesheet and extended by `.media-button`. The custom pseudo-classes `toggled` and `selected` are defined to be used on the `media-button` component. 

CSS API:
```css
/* example2.css */
:import {
    -st-from: "./example1.css"; /* stylesheet a previous example */
    -st-default: Comp1;
}
.media-button {
    -st-extends: Comp1;
    -st-states: toggled, selected;
}
.media-button:hover { border:10px solid black; } /* native CSS because no custom declaration*/
.media-button:loading { color:silver; } /* from example1 */
.media-button:selected { color:salmon; } /* from example2 */
.media-button:toggled { color:gold;} /* included in example1 but overridden by example2 */
```

CSS OUTPUT:
```css
/* namespaced to example1 */
.root[data-example1-toggled]{ color:red; }
.root[data-example1-loading]{ color:green; }
/* namespaced to example2 */
.root .media-button:hover { border:10px solid black; } /* native hover - not declared */
.root .media-button[data-example1-loading] { color:silver; } /* loading scoped to example1 - only one to declare */
.root .media-button[data-example2-selected] { color:salmon; } /* selected scoped to example2 - only one to declare */
.root .media-button[data-example2-toggled] { color:gold;} /* toggled scoped to example2 - last to declare */
```

## Enabling custom pseudo-classes

Custom pseudo-classes are implemented using `data-*` attributes and need additional runtime logic to control when they are on and off. *<Should this also be explained above?>*

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

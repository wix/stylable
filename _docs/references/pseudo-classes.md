# Pseudo-classes

In addition to CSS's native [pseudo-classes](https://developer.mozilla.org/en/docs/Web/CSS/Pseudo-classes), **Stylable** enables you to define custom pseudo-classes so that you can apply styles to your components based on state.

Let's say you want a component to have different styling applied to it when its content is loading. You can define "loading" as a custom pseudo-class and toggle it in your component.

Native pseudo-classes like `:hover` and `:nth-child()` are valid and supported natively.

## Define custom pseudo-classes

To define custom pseudo-classes, you use the **Stylable** directive rule `-sb-states` to provide a list of the possible custom pseudo-classes that you want to use in the CSS.

The `-sb-states` directive rule can be defined only for simple selectors like [tag selector](./tag-selectors.md), [class selector](./class-selectors.md) and [root](./root.md).

### Name custom pseudo-classes and assign a style to them

Name `toggled` and `loading` as custom pseudo-classes and assign different colors to them. The [.root](./root.md) selector is added to the custom pseudo-class.

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
.root[data-example1-toggled] { color:red; }
.root[data-example1-loading] { color:green; }
```

> Note: Custom pseudo-classes are implemented using `data-*` attributes that are scoped to the stylesheet. *<Need more information here>*


### Map custom pseudo-classes

You can target existing components that are not based on **Stylable** to be mapped to custom pseudo-classes created in **Stylable**.  *<What about mapping components that were created in Stylable?>*

CSS API:
```css
/* example-custom.css */
.root{
    -sb-states: toggled(".on"), loading("[data-spinner]");
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

## Override the behavior of native pseudo-classes

You can also override any native pseudo-class. This can enable you to write [polyfills](https://remysharp.com/2010/10/08/what-is-a-polyfill) for forthcoming CSS pseudo-classes. This can ensure that when you define a name for a custom pseudo-class, if there are clashes with a new CSS pseudo-class in the future, your app's behavior does not change.

We don't recommend you to override an existing CSS pseudo-class unless you want to drive your teammates insane.

*<No example?>

## Extend external stylesheet

You can import from an external stylesheet and extend it to use custom pseudo-classes. In this example the value `Comp1`is imported from the `example1.css` stylesheet and scoped to be used for the class selector `.media-button`. The custom pseudo-classes `toggled` and `selected` are defined to be used on the `media-button` component. Several native and custom pseudo-classes are styled for `media-button`. *<Shouldn't `loading` be defined in `-sb-states`?>* 

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
.root[data-example1-toggled]{ color:red; }
.root[data-example1-loading]{ color:green; }
/* namespaced to example2 */
.root .media-button:hover { border:10px solid black; } /* native hover - not declared by anyone */
.root .media-button[data-example2-toggled] { color:gold;} /* toggled scoped to example2 - last to declare */
.root .media-button[data-example1-loading] { color:silver; } /* loading scoped to example1 - only one to declare */
.root .media-button[data-example2-selected] { color:salmon; } /* selected scoped to example2 - only one to declare */
```

## Enabling custom states

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

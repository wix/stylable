---
id: references/pseudo-classes
title: Pseudo-Classes
layout: docs
---

In addition to CSS's native [pseudo-classes](https://developer.mozilla.org/en/docs/Web/CSS/Pseudo-classes), **Stylable** enables you to define custom pseudo-classes so that you can apply styles to your components based on state.

Let's say you want a component to have different styling applied to it when its content is loading. You can define `loading` as a custom pseudo-class and toggle it in your component.

Native pseudo-classes like `:hover` and `:nth-child()` are supported natively in **Stylable**.

## Define custom pseudo-classes

To define custom pseudo-classes, you use the **Stylable** directive rule `-st-states` to provide a list of the possible custom pseudo-classes that you want to use in the CSS.

The `-st-states` directive rule can be defined only for simple selectors like [tag selector](./tag-selectors.md), [class selector](./class-selectors.md) and [root](./root.md).

## Name custom pseudo-classes and assign a style to them

To define custom pseudo-classes, or states, for a simple selector, you tell **Stylable** the list of possible custom states that the CSS declaration may be given. You can then target the states in the context of the selector. In this example `toggled` and `loading` are added to the root selector and then assigned different colors. 

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

in some use cases its useful to define custom states that use a parameter to indicate which nodes to activate on. 

for example a cell in a grid can be marked using column and row pseudo-classes

```css
/* stateWithNumberParam.st.css */
.cell{
    -st-states: column(number), 
                row(number) 
}

.cell:column(1):row(1){
    color:red;
}

```

```css
/* CSS output*/
.Example1__root[data-Example1-column="1"][data-Example1-row="1"] { color: red; }

```

### Types and allowed prefixes

***Stylable*** supports a number of parameter types for pseudo-classes, these types allow us to provide better tooling when using the pseudo-class.

in the future we intend to support extra functunality for the numeral types through build time tricks


| Type | Allowed validations | Allowed prefixes |
|----|----|----|
| string | minLength <br> maxLength | "~" - match whole words <br> "^" - match start <br> "$" - match end <br> "*" - match include |
| number | minimum <br> maximum <br> multipleOf <br> | \> - greater then (future) <br> \< - lesser then (future) <br> n+1 - [nth child format](https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-child) (future)  |
| boolean | - | - |
| tag  | - | - |
| enum | options | - |
| percentage | - | \> - greater then - (future) <br> \< - lesser then - (future) |





#### String example

```css
/* defining state */
.token{
    -st-states: fieldName(string);
}

/* customize fields with fieldName email */
.token:fieldName(email){
    color:lightBlue;
}

/* customize fields with fieldName that starts with user_ */
.token:fieldName(^user_){
    color:blue;
}

/* customize fields with fieldName that ends with _id */
.token:fieldName($_id){
    color:gray;
}

/* customize fields with fieldName that includes error */
.token:fieldName(*error){
    color:red;
}


/* using includes with "not" operator */
.token:fieldName(!*error){
    border:1px solid green;
}
```

```css
/* CSS output*/
.Example1__root[data-Example1-fieldName="email"] { color: lightBlue; }
.Example1__root[data-Example1-fieldName^="user_"] { color: blue; }
.Example1__root[data-Example1-fieldName$="_id"] { color: gray; }
.Example1__root[data-Example1-fieldName*="error"] { color: red; }
.Example1__root:not([data-Example1-fieldName*="error"]) { color: red; }

```


#### Number example

```css
/* stateWithNumberParam.st.css */
.cell{
    -st-states: column(number);
}

/* customize fields with at column 1 */
.cell:column(1){
    color:lightBlue;
}

/* customize using css number matching ( FUTURE ) */
.cell:column(2n+1){
    color:green;
}

/* customize using css odd/even keywords ( FUTURE ) */
.cell:column(even){
    color:grey;
}

/* customize column greater then 3 ( FUTURE ) */
.cell:column(>3){
    background:blue;
}

/* customize column lesser then 2 ( FUTURE ) */
.cell:column(<2){
    background:red;
}

```


```css
/* CSS output*/
.Example1__root[data-Example1-column="1"] { color: lightBlue; }
.Example1__root[data-Example1-column$modula="2|1"] { color: green; }
.Example1__root[data-Example1-column$modula="2|0"] { color: grey; }
.Example1__root[data-Example1-column$time-line="^a"] { color: blue; }
.Example1__root[data-Example1-column$time-line="^abc"] { background: blue; }
.Example1__root[data-Example1-column$n+1="^abc"] { background: blue; }
.Example1__root:not([data-Example1-column$time-line="*c"]) { background: red; }

```

*all the future features described above are implemented using static processing.*

*because of that you will have to declare them at build time in order to use them with dynamic css*

```css
.cell{
    -st-states: column(number);
    -st-states: done(number<0,100>);
}


.cell:column(2n+x):column(3n+x):column(4n+x){
    /*will let stylable know you're using the css modula syntax at runtime with: 
    2n+x,3n+x or 4n+x, stylable runtime will now know to add the right data attributes*/
}

.cell:column(x){
    /* will let stylable know your gonna use the number current limits, assumes a stepValue of 1, minValue of 0, maxValue of 10 if not specified*/
}


.cell:column(5x){
    /* will let stylable know your gonna use the number current limits, with step value 5,
    minValue of 0, maxValue of 10*/
}

```

#### Boolean example


```css
/* stateWithBooleanParam.st.css */
.token{
    -st-states: selected;
}

.token:selected{
    color:red;
}


```

```css
/* CSS output*/
.Example1__root[data-Example1-selected] { color: red; }

```



#### Tag example


```css
/* stateWithBooleanParam.st.css */
.token{
    -st-states: related(tags);
}

.token:related(flat-earth){
    color:red;
}


```

```css
/* CSS output*/
.Example1__root[data-Example1-related~="flat-earth"] { color: red; }

```
#### Enum example


```css
/* stateWithBooleanParam.st.css */
.token{
    -st-states: size(small | mid | large);
}

.token:size(large){
    color:red;
}


```

```css
/* CSS output*/
.Example1__root[data-Example1-size="large"] { color: red; }

```

> **Note**    
> You can also override the behavior of native pseudo-classes. This can enable you to write [polyfills](https://remysharp.com/2010/10/08/what-is-a-polyfill) for forthcoming CSS pseudo-classes to ensure that when you define a name for a custom pseudo-class, if there are clashes with a new CSS pseudo-class in the future, your app's behavior does not change. We don't recommend you to override an existing CSS pseudo-class unless you want to drive your teammates insane.

## Extend external stylesheet

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

## Map custom pseudo-classes

You can use this feature to define states even if the existing components you are targeting are not based on **Stylable**. In this example, `toggled` and `loading` are defined on the root class with their custom implementation. **Stylable** generates selectors using custom `data-*` attributes. The CSS output uses the custom implementation defined in `-st-states` rather than its default generated `data-*` attributes.

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

---
id: guides/components-basics
title: Stylable Basics
layout: docs
---

This guide walks you through the basics of how to style and work with components using **Stylable**. 

You use **Stylable** with a component file (for example using React), along with a **Stylable** CSS file that has the extention `.st.css`.

> **Note**:
> This guide demonstrates the HTML side of our [stylable-integration](https://github.com/wixplosives/stylable-integration) with React. 

Whether creating your own components or using components you imported from a 3rd party, you want to be able to access and style the internal parts of every component in the scope of your page or application. 

**Stylable** styles are similar to a type-system. Once you have declared that something is of the type `Button` for example, **Stylable** knows its internal structure and can match its internal parts and states.


## 1 Style a component 

Let's say you have a `Button` component with a render function per this example. You can style its different HTML elements using the `className` attribute.

```jsx
/* button.tsx */
render () {
    return (
        <button>
            <div className="icon"/>
            <span className="label">Submit</span>
        </button>
    );
}
```

Now in the component's **Stylable** CSS file called `button.st.css`, you can declare each of the classes as a ruleset as follows:

```css
/* button.st.css */
.root { /* the root class is automatically placed on the root HTML element by stylable-integration */
    background: #b0e0e6;
}
.icon {
    background-image: url('./assets/btnIcon.svg');
}
.label {
    font-size: 1.2em;
    color: rgba(81, 12, 68, 1.0)
}
```
In this example, the **Stylable** CSS [extends](../references/extend-stylesheet.md) the [root](../references/root.md) class and styles it. The `root` class is automatically added as part of the **Stylable** integration and doesn't have to be written separately.


## 2 Expose the component's Stylable API

When using **Stylable**, every component exposes an API that's usable by its parent components.

The API includes:

* _The component's internal parts_: any HTML element that has the className attribute, and is therefore exposed via a [Stylable pseudo-element](../references/pseudo-elements.md).
 
* _The component's custom states_: any state connected to the component logic, and declared as a [Stylable pseudo-class](../references/pseudo-classes.md).

Let's see how to create your own parts and states and expose them for use throughout a page or application.

### A. Create and expose internal parts

In the example above, you created a very simple button component. Now let's [import](../references/imports.md) this button into a `Form` component. The classes that you created above are available as internal parts of the imported component. Each class is available by its name as a [Stylable pseudo-element](../references/pseudo-elements.md). 

You can now style your `Button` in the scope of the `Form` so that it fits the needs of this page.

Let's take the `Button` component and import it into the JavaScript file, and also add it to the render:

```jsx
/* form.tsx */
import {Button} from './button.tsx'

render(){
    return (
        <div>
            <Button className="formBtn"/>
        </div>
    );
}
```

Let's also import `Button`'s **Stylable** CSS into the `Form` CSS. You can then match the internal parts of the component that you imported:

```css
/* form.st.css */
:import {
    -st-from: './button.st.css';
    -st-default: Button;
}
.formBtn {
    -st-extends: Button;
    background: cornflowerblue;
}
.formBtn::label { /* since formBtn extends Button, it also includes all of its internal parts */
    color: honeydew;
    font-weight: bold;
}
```

### B. Create and expose states

You can also create custom states for the component that are available as [pseudo-classes](../references/pseudo-classes.md) to anyone using your component.

A state can be used to reflect any Boolean property in your component. For example, your `Button` has a Boolean property called `clicked`. In this example, it is triggered when it is first clicked, and never turned off.

```jsx
/* button.tsx */
render () {
    return (
        <button style-state={this.state.clicked} onClick={()=>this.setState({clicked:!this.state.clicked})}>
            <div className="icon"/>
            <span className="label">Click Here!</span>
        </button>
    );
}
```

```css
/* button.st.css */
.root {
    -st-states: clicked;
    background: #b0e0e6;
}
.icon {
    background-image: url(./assets/btnIcon.svg);
}
.label {
    font-size: 1.2em;
    color: rgba(81, 12, 68, 1.0)
}
.root:clicked { /* matches the state on the root of the component */
    box-shadow: 2px 2px 2px 1px darkslateblue;
}
```

You can then match `Button`'s `clicked` state in your `Form` as follows:

```css
/* form.st.css */
.formBtn {
    background: cornflowerblue;
}
.formBtn:clicked {
    box-shadow: 2px 2px 2px 1px indigo;
}
```

## See also:

* [Building an Application](./stylable-application.md)
* [Building a Component Library](./stylable-component-library.md)
* [Stylable Cheatsheet](../getting-started/cheatsheet.md)

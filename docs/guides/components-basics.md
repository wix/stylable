# Stylable Basics

This guide walks you through the basics of how to style and work with components using **Stylable**. 

You use **Stylable** with a component file (for example using React), along with a **Stylable** CSS file that has the extention `.st.css`.

> **Note**:
> This guide shows the HTML side of our [stylable-integration](https://github.com/wixplosives/stylable-integration) with React. 

**Stylable** styles are similar to a type-system. Once you have declared that something is of the type `Button` for example, **Stylable** knows its internal structure and can match its internal parts and states.

Whether creating your own components or using components you imported from a 3rd party, you want to be able to access and style the internal parts of every component in the scope of your page or application. 


## 1 Style a Component 

Let's say you have a `Button` component with a render function per this example. You can style its different HTML elements using the `className` attribute.

```jsx
/* button.ts */
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
@namespace "Button";
.root { /* note that the root class is automatically placed on the root HTML element by stylable-integration */
    background: #b0e0e6;
    color: black;
    outline: none;
    border: none;
}
.status {
    border: 2px solid grey;
}
.label {} /* note that in Stylable you will have empty CSS classes that act only as API for external users */
```

In this example, the **Stylable** CSS [extends](../references/extend-stylesheet.md) the [root](../references/root.md) class and styles it. The `root` class is automatically added as part of the **Stylable** integration and doesn't actually have to be written separately.


## 2 Expose the Component's Stylable API

When using **Stylable**, every component exposes an API that's usable by its parent components.

The API includes:

* _The component's internal parts_: any HTML element that has the className attribute, and is therefore exposed via a [Stylable pseudo-element](../references/pseudo-elements.md).
 
* _The component's custom states_: any state connected to the component logic, and declared as a [Stylable pseudo-class](../references/pseudo-classes.md).

Let's see how to create your own parts and states and expose them for use throughout a page or application.

### A. Create and Expose Internal Parts

In the example above, you created a very simple button component. Now let's [import](../references/imports.md) this button into a `Form` component. The classes that you created above are available as internal parts of the imported component. Each class is available by its name as a [Stylable pseudo-element](../references/pseudo-elements.md). 

You can now style your `Button` in the scope of the `Form` so that it fits the needs of this page.

Let's take the `Button` component and import it into the JavaScript file, and also add it to the render:

```jsx
/* form.tsx */
import {Button} from './button.ts'

render(){
    return (
        <div>
            <Button className="button">
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
.button {
    -st-extends: Button;
    background: lightgrey;
}
.button::label { /* since button extends Button, it also includes all of its internal parts */
    font-weight: bolder;
}
```

### B. Create and Expose States

You can also create custom states for the component that are available as [pseudo-classes](../references/pseudo-classes.md) to anyone using your component.

A state can be used to reflect any Boolean property in your component. For example, your `Button` has a Boolean property called `clicked`. In this example, it is triggered when it is first clicked, and never turned off.

```jsx
/* button.ts */
render () {
    return (
        <button style-state={this.state.clicked} onClick={()=>this.setState({clicked:!this.state.clicked})}>
            <div className="icon"/>
            <span className="label">Status</span>
        </button>
    );
}
```

```css
/* button.st.css */
@namespace "Button";
.root {
    -st-states: clicked;
    background: #b0e0e6;
    color: black;
    outline: none;
    border: none;
}
.root:clicked { /* matches the clicked state on the root of the component */
    background: lightcyan;
}
.root:clicked .status { /* matches the status class when button root is in clicked state */
    border: 2px solid yellowgreen;
    box-shadow: 0px 0px 1px yellowgreen;
}
```

You can then match `Button`'s `clicked` state in your `Form` as follows:

```css
/* form.st.css */
@namespace "Form"
.button {
    background: lightgrey;
}
.button:clicked {
    color: red;
}
```

## Playground

{% playground id="stylableBasics", title="Stylable Basics", dir="./guides/stylable-basics", entry="form", active="form.tsx", readOnly=false %}{% endplayground %}

## See also:

* [Building an Application](./stylable-application.md)
* [Building a Component Library](./stylable-component-library.md)
* [Stylable Cheatsheet](../usefulIngo/cheatsheet.md)

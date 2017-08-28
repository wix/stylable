# Stylable Component Basics

This guide will walk you through the basics of styling components with **Stylable** and understand the basics of working with them. 

## Styling A Component 

Let's assume we have a `Button` component with a render function like this, we can style its different nodes using the `className` attribute.

```tsx
/* button.ts */
render () {
    return (
        <button className="root">
            <div className="btnIcon"/>
            <span className="btnLabel">Submit</span>
        </button>
    );
}
```

Now in the component's **Stylable CSS** file `button.st.css` we can declare each of the classes as a ruleset:

```css
/* button.st.css */
.root {
    -st-extends: root; 
    background: #b0e0e6;
}
.btnIcon {
    background-image: url('./assets/btnIcon.svg');
}
.btnLabel {
    font-size: 1.2em;
    color: rgba(81, 12, 68, 1.0)
}
```


## Exposing the Component Stylable API

**Stylable** styles are similar to a type-system. Once we have declared that something is of the type `Button`, we know its internal structure and can match its internal parts and states.

Whether creating your own components or using components you imported from a 3rd party, you want to be able to style the internal parts of every component in your page or application scope. 

When using **Stylable**, every component exposes an API that's usable by its parent components.

The API includes:

* _The component's internal parts_: any HTML element that has the className attribute, and is therefore exposed via a [Stylable pseudo-element](../references/pseudo-elements.md).
 
* _The component's custom states_: any state connected to the component logic, and declared as a [Stylable pseudo-class](../references/pseudo-classes.md).

### Creating and Exposing Internal Parts

In the example above, we created a very simple button component. Now we [import](../references/imports.md) this button into a `Form` component, and the classes that we created are available to us as internal parts of the component we import. Each class is available by its name as a [Stylable pseudo-element](../references/pseudo-elements.md). And we can now style our `Button` in the scope of our `Form` to fit our needs.

We take the `Button` component and import it into our TypeScript file, also adding it to our render:

```tsx
/* form.tsx */
import {Button} from './button.ts'

render(){
    return (
        <div className="root">
            <Button className="formBtn">
        </div>
    );
}
```

We also import `Button`'s Stylable CSS into the `Form` CSS, and are then able to match internal parts of the component we imported:

```css
/* form.st.css */
:import {
    -st-from: './button.st.css';
    -st-default: Button;
}
.root {
    background: floralwhite;
}
.formBtn {
    -st-extends: Button;
    background: cornflowerblue;
}
.root::btnLabel { /* since formBtn extends Button, it also includes all of its internal parts */
    color: honeydew;
    font-weight: bold;
}
```

### Creating and Exposing States

In our component we can also create custom states that will be available to anyone using our component as [pseudo-classes](../references/pseudo-classes.md).

A state can be used to reflect any Boolean property in our component. For example, our `Button` has a Boolean property called `clicked` (for the sake of this example, it will be triggered when it is first clicked, and never turned off).

```tsx
/* button.ts */
render () {
    return (
        <button className="root" style-state={this.state.clicked} onClick={()=>this.setState({clicked:true})}>
            <div className="btnIcon"/>
            <span className="btnLabel">Click Here!</span>
        </button>
    );
}
```

```css
/* button.st.css */
.root {
    -st-extends: root; 
    -st-states: clicked;
    background: #b0e0e6;
}
.btnIcon {
    background-image: url(./assets/btnIcon.svg);
}
.btnLabel {
    font-size: 1.2em;
    color: rgba(81, 12, 68, 1.0)
}
.root:clicked { /* places the state on the root of the component */
    box-shadow: 2px 2px 2px 1px darkslateblue;
}
```

We can then match this state of `Button` in our `Form` this way:

```css
/* form.st.css */
.root {
    background: floralwhite;
}
.formBtn {
    background: cornflowerblue;
}
.formBtn:clicked {
    box-shadow: 2px 2px 2px 1px indigo;
}
```

## Further Reading

* [Stylable Imports](./stylable-imports-guide.md)
* [Stylable Theming](./stylable-theming-guide.md)

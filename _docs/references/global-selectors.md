# Global selectors

In **Stylable**, selectors are scoped to the stylesheet. But what if you want to target global or other selectors that are not scoped? You can use the `:global()` directive selector. 

In this example `.classB` and `.classC` are not scoped to `App` but are part of the selector query.

CSS input
```css
    @namespace "App";
    .classA :global(.classB > .classC) .classD:hover {
        color: red;
    }

```

CSS output
```css
    .App_root .App_classA .classB > .classC .App_classD:hover {
        color: red;
    }
```

> **Note**: While we don't recommend it, you can also use global to keep pseudo-classes native. You can describe them using the syntax below where `classA` is scoped and `:selected` is native.
>
> ```css
> .classA:global(:selected) {
>     color: red;
> }
> ```


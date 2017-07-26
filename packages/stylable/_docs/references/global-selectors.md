# Global selectors

Selectors inside `:global()` directive selector are not scoped to the stylesheet 

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

> Note: you can also use global pseudo-classes and elements, to override an override. But why would you?! You describe them using this syntax:
>
> ```css
> .classA :global(.classB > .classC) .classD:global(:hover) {
>     color: red;
> }
> ```


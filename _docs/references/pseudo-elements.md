
# Pseudo-elements

In addition to CSS's native [pseudo-elements](https://developer.mozilla.org/en/docs/Web/CSS/Pseudo-elements), **Stylable** stylesheets automatically expose CSS classes as custom pseudo-elements. This enables you to access internal parts of a component to apply styling.

## Define a custom pseudo-element

Any [CSS class](./class-selectors.md) is accessible as a pseudo-element of an [extending stylesheet](./extend-stylesheet).

When you define a CSS class inside a component, in this case a `play-button` in a `VideoPlayer`, that class may be targeted as a pseudo-element of any class that extends the component `VideoPlayer`.

### CSS API:
```css
/* video-player.st.css */
@namespace "VideoPlayer"
.root {}
.play-button { 
    background: black; 
    color: white;
}
```

## Style custom pseudo-elements

Use `::` to access an internal part of a component after a [custom tag selector](./tag-selectors.md#custom-element) or after an [extended class selector](./extend-stylesheet.md).

In this example, you [import](./imports.md) a `VideoPlayer` component into your stylesheet, and style an internal part called `play-button` overriding its original styling.

### CSS API:
```css
@namespace "Page"
:import {
    -st-from: './video-player.st.css';
    -st-default: VideoPlayer;
}
.main-video {
    -st-extends: VideoPlayer; /* define main-video as VideoPlayer */
}
.main-video::play-button { /* override main-video play button */
    background: green;
    color: purple;
}
```

### CSS OUTPUT:
```css
.Page__root .Page__main-video.VideoPlayer__root .VideoPlayer__play-button {
    background: green;
    color: purple;
}
```

> **Note**:  
> Custom pseudo elements are not limited to the end of a selector like native pseudo-elements, and they can be chained. For example, you can access the label of a navigation button from a gallery: `.my-gallery::nav-btn::label`.


## Extend stylesheet pseudo-elements

When a Stylable stylesheet [root](./root.md) extends another stylesheet, pseudo-elements are automatically exposed on the extending stylesheet and available inline.

In this example, the class `play-button` is available from the original component file `video-player.css`, and extended and styled in the `super-video-player.css` stylesheet as a custom pseudo-element on the `root` class. 

The `page.css` stylesheet can then extend `super-video-player.css` and on the `.main-player` class, style `play-button` differently.

### CSS API:
```css
/* super-video-player.st.css */
@namespace "SuperVideoPlayer"
:import {
    -st-from: './video-player.st.css';
    -st-default: VideoPlayer;
}
.root {
    -st-extends: VideoPlayer;
}
.root::play-button {
    color: gold;
}
```

```css
/* page.st.css */
@namespace "Page"
:import {
    -st-from: './super-video-player.st.css';
    -st-default: SuperVideoPlayer;
}
.main-player {
    -st-extends: SuperVideoPlayer;
}
.main-player::play-button {
    color: silver;
}
```

### CSS OUTPUT:
```css
.SuperVideoPlayer__root.VideoPlayer__root .VideoPlayer__play-button { color: gold; }
.Page__root .Page__main-player.SuperVideoPlayer__root .VideoPlayer__play-button { color: silver; }
```



## Override custom pseudo-elements

You can use CSS classes to override extended pseudo-elements. 

> **Note**:  
> You can also override native pseudo-elements using **Stylable's** custom pseudo-elements but this is not recommended as it can lead to code that's confusing and hard to maintain.

In this example, `root` extends `VideoPlayer` and so any class placed on the `root` overrides the pseudo-element.

### CSS API:
```css
@namespace "SuperVideoPlayer"
:import {
    -st-from: './video-player.css';
    -st-default: VideoPlayer;
}
.root {
    -st-extends: VideoPlayer;
}
.play-button { /* override VideoPlayer play-button */
    color: gold;
}
```

### CSS OUTPUT
```css
.SuperVideoPlayer__root.VideoPlayer__root .SuperVideoPlayer__play-button { color: gold; }
```

> **Note**:  
> Overriding pseudo-elements changes the targeting in the overriding stylesheet and not in the stylesheet being extended. This can have adverse effects on performance.


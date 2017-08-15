
# Pseudo-elements

In addition to CSS's native [pseudo-elements](https://developer.mozilla.org/en/docs/Web/CSS/Pseudo-elements), **Stylable** stylesheets automatically expose CSS classes as custom pseudo-elements. This enables you to access internal parts of a component to apply styling.

## Style custom pseudo-elements

Use `::` to access an internal part of a component after either a [custom tag selector](./tag-selectors.md#custom-element) or after an [extended class selector](./extend-stylesheet.md).

In this example the **Stylable** stylesheet [imports](./imports.md) a `video-player` component (stylesheet), extends it as the class selector `.main-video` and styles an internal `play-button` as a custom pseudo-element of the component. 

CSS API
```css
:import {
    -st-from: './video-player.css';
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

CSS OUTPUT:
```css
/* namespaced to the stylesheet */
.root .main-video.VideoPlayer_root .VideoPlayer_play-button {
    background:green;
    color:purple;
}
```

> **Note**: Custom pseudo-elements are not limited to the end of a selector like native pseudo-elements, they can be chained. For example, you can access the label of a navigation button from a gallery: `.my-gallery::nav-btn::label`.

## Define custom pseudo-elements

Any [CSS class](./class-selectors.md) is accessible as a pseudo-element of an [extending](./extend-stylesheet) class.

The `video-player.css` can define a `play-button` class selector that can then be targeted as a pseudo-element.

CSS API
```css
/* video-player.css */
.play-button { background:black; color:white; }
```

## Extend stylesheet pseudo-elements

When a **Stylable** stylesheet's [root](./root.md) extends another stylesheet, pseudo-elements are automatically exposed on the extending stylesheet and available inline.

In this example, the class `play-button` is available from the original component file `video-player.css`, and extended and styled in the`super-video-player.css` stylesheet as a custom pseudo-element on the `root` class. The `page.css` stylesheet can then extend `super-video-player.css` and on the `.main-player` class, style `play-button` differently.

CSS API
```css
/* super-video-player.css */
:import {
    -st-from: './video-player.css';
    -st-default: VideoPlayer;
}
.root{
    -st-extends: VideoPlayer;
}
.root::play-button {
    color: gold;
}
```

```css
/* page.css */
:import {
    -st-from: './super-video-player.css';
    -st-default: SuperVideoPlayer;
}
.main-player {
    -st-extends: SuperVideoPlayer;
}
.main-player::play-button {
    color: silver;
}
```

CSS OUTPUT
```css
/* namespaced to super-video-player.css */
.root.VideoPlayer_root .VideoPlayer_play-button {
    color: gold;
}
/* namespaced to page.css */
.root .main-player.SuperVideoPlayer_root.VideoPlayer_root .VideoPlayer_play-button {
    color: silver;
}
```

## Override custom pseudo-elements

You can use CSS class selector to override extended pseudo-elements.

> **Note:** You can also override native pseudo-elements using **Stylable's** custom pseudo-element but this is not recommended.

Per the above example, `play-button` is a custom pseudo-element in the `page.css` file and here in `amazing-video-player.css` it is a class selector, styled differently.   

CSS API
```css
/* amazing-video-player.css */
:import {
    -st-from: './video-player.css';
    -st-default: VideoPlayer;
}
.root{
    -st-extends: VideoPlayer;
}
.play-button { 
    color: gold;
}
```

CSS OUTPUT
```css
/* namespaced to amazing-video-player.css */
.root.VideoPlayer_root .AmazingVideoPlayer_play-button {
    color: gold;
}
/* namespaced to page.css */
.root .main-player.AmazingVideoPlayer_root.VideoPlayer_root .AmazingVideoPlayer_play-button {
    color: silver;
}
```

> **Note:** Overriding pseudo-elements only changes the targeting in the overriding stylesheet not in the stylesheet being extended. This can have adverse effects on performance.




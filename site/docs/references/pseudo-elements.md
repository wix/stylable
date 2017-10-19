---
id: references/pseudo-elements
title: Pseudo-Elements
layout: docs
---

In addition to CSS's native [pseudo-elements](https://developer.mozilla.org/en/docs/Web/CSS/Pseudo-elements), **Stylable** stylesheets automatically expose CSS classes as custom pseudo-elements. This enables you to access internal parts of a component to apply styling.

## Define a custom pseudo-element

Any [CSS class](./class-selectors.md) is accessible as a pseudo-element of an [extending stylesheet](./extend-stylesheet.md).

When you define a CSS class inside a component, in this case a `playButton` in a `VideoPlayer`, that class may be targeted as a pseudo-element of any class that extends the component `videoPlayer`.

```css
/* video-player.st.css */
@namespace "VideoPlayer";
.root {}
.playButton { 
    background: black; 
    color: white;
}
```

## Style custom pseudo-elements

Use `::` to access an internal part of a component after a [custom tag selector](./tag-selectors.md#component-element) or after an [extended class selector](./extend-stylesheet.md).

In this example, you [import](./imports.md) a `VideoPlayer` component into your stylesheet, and style an internal part called `playButton` overriding its original styling.


```css
/* CSS */
@namespace "Page";
:import {
    -st-from: './video-player.st.css';
    -st-default: VideoPlayer;
}
.mainVideo {
    -st-extends: VideoPlayer; /* define mainVideo as VideoPlayer */
}
.mainVideo::playButton { /* override mainVideo playButton */
    background: green;
    color: purple;
}
```

```css
/* CSS output*/
.Page__root .Page__mainVideo.VideoPlayer__root .VideoPlayer__playButton {
    background: green;
    color: purple;
}
```

> **Note**    
> Custom pseudo-elements are not limited to the end of a selector like native pseudo-elements, and they can be chained. For example, you can access the label of a navigation button from a gallery: `.myGallery::navBtn::label`.


## Extend stylesheet pseudo-elements

When a Stylable stylesheet [root](./root.md) extends another stylesheet, pseudo-elements are automatically exposed on the extending stylesheet and available inline.

In this example, the class `playButton` is available from the original component file `video-player.css`, and extended and styled in the `super-video-player.css` stylesheet as a custom pseudo-element on the `root` class. 

The `page.css` stylesheet can then extend `super-video-player.css` and on the `.mainPlayer` class, style `playButton` differently.

```css
/* super-video-player.st.css */
@namespace "SuperVideoPlayer";
:import {
    -st-from: './video-player.st.css';
    -st-default: VideoPlayer;
}
.root {
    -st-extends: VideoPlayer;
}
.root::playButton {
    color: gold;
}
```

```css
/* page.st.css */
@namespace "Page";
:import {
    -st-from: './super-video-player.st.css';
    -st-default: SuperVideoPlayer;
}
.mainPlayer {
    -st-extends: SuperVideoPlayer;
}
.mainPlayer::playButton {
    color: silver;
}
```

```css
/* CSS output*/
.SuperVideoPlayer__root.VideoPlayer__root .VideoPlayer__playButton { color: gold; }
.Page__root .Page__mainPlayer.SuperVideoPlayer__root .VideoPlayer__playButton { color: silver; }
```


## Override custom pseudo-elements

You can use CSS classes to override extended pseudo-elements. 

> **Note**    
> You can also override native pseudo-elements using **Stylable's** custom pseudo-elements but this is not recommended as it can lead to code that's confusing and hard to maintain.

In this example, `root` extends `VideoPlayer` and so any class placed on the `root` overrides the pseudo-element.

```css
/* CSS */
@namespace "SuperVideoPlayer";
:import {
    -st-from: './video-player.css';
    -st-default: VideoPlayer;
}
.root {
    -st-extends: VideoPlayer;
}
.playButton { /* override VideoPlayer playButton */
    color: gold;
}
```

```css
/* CSS output*/
.SuperVideoPlayer__root.VideoPlayer__root .SuperVideoPlayer__playButton { color: gold; }
```

> **Note**    
> Overriding pseudo-elements changes the targeting in the overriding stylesheet and not in the stylesheet being extended.



# Pseudo-elements

In addition to CSS's native [pseudo-elements](https://developer.mozilla.org/en/docs/Web/CSS/Pseudo-elements), Stylable stylesheet automatically exposes CSS classes as custom pseudo-elements.

## Define a Custom Pseudo-Element

Any [CSS class](./class-selectors.md) is accessible as a pseudo-element of an [extending stylesheet](./extend-stylesheet).

When you define a CSS class `play-button` inside the component `VideoPlayer`, that class may be targeted as a pseudo-element of any class that extends `VideoPlayer`.

CSS API
```css
/* video-player.st.css */
@namespace "VideoPlayer"
.root {}
.play-button { 
    background:black; 
    color:white;
}
```

## Styling custom pseudo-elements

Use `::` to access an internal part of a component after a [custom tag selector](./tag-selectors.md#custom-element) or [extended class selector](./extend-stylesheet.md).

You can [import](./imports.md) a `VideoPlayer` component into your stylesheet, and style an internal called `play-button`:

CSS API
```css
@namespace "Page"
:import {
    -st-from: './video-player.css';
    -st-default: VideoPlayer;
}
.Page__root.main-video {
    -st-extends: VideoPlayer; /* define main-video as VideoPlayer */
}
.Page__root.main-video::play-button { /* override main-video play button */
    background: green;
    color: purple;
}
```

CSS OUTPUT:
```css
/* namespaced to the stylesheet */
.Page__root .Page__root.main-video.VideoPlayer__root .VideoPlayer__play-button {
    background:green;
    color:purple;
}
```

> **Note**:  
> Custom pseudo elements are not limited to the end of a selector like native pseudo elements, and unlike native pseudo-selectors they can be chained (e.g. `.my-gallery::nav-btn::label`)


## Extend stylesheet pseudo-elements

When stylesheet [root](./root.md) extends another stylesheet, pseudo-elements are automatically exposed on the extending stylesheet and available inline:

CSS API
```css
/* super-video-player.css */
@namespace "SuperVideoPlayer"
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
@namespace "Page"
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
.SuperVideoPlayer__root.VideoPlayer__root .VideoPlayer__play-button { color: gold }
.Page__root .Page__root.main-player.SuperVideoPlayer__root.VideoPlayer__root .VideoPlayer__play-button { color: silver }
```

> **Note**:
> With this mechanism you can override native pseudo-elements. For example, if one of your classes is called `.first-line`, accessing it as `.class::first-line` would override the native behavior. This can lead to code that's confusing and hard to maintain.

## Override custom pseudo-elements

You may use CSS classes normally to override extended pseudo-elements. In the example below, our root extends `VideoPlayer` and so any class placed on the root will override the pseudo-element.

CSS API
```css
@namespace "SuperVideoPlayer"
:import {
    -st-from: './video-player.css';
    -st-default: VideoPlayer;
}
.root{
    -st-extends: VideoPlayer;
}
.play-button { /* override VideoPlayer play-button */
    color: gold;
}
```

CSS OUTPUT
```css
.SuperVideoPlayer__root.VideoPlayer__root .VideoPlayer__play-button { color: gold }
.Page__root .SuperVideoPlayer__root.VideoPlayer__root .VideoPlayer__play-button { color: silver }

```

> **Note**: 
> Overriding pseudo-elements only changes the manner which the CSS uses to match those pseudo-elements. It does not change the extended component view output.


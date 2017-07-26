
# Pseudo-elements

In addition to CSS's native [pseudo-elements](https://developer.mozilla.org/en/docs/Web/CSS/Pseudo-elements), Stylable stylesheet automatically exposes CSS classes as custom pseudo-elements.

## Styling custom pseudo-elements

Use `::` to access an internal part of a component after a [custom tag selector](./tag-selectors.md#custom-element) or [extended class selector](./extend-stylesheet.md).

Stylesheet can [import](./imports.md) a `video-player` component (stylesheet), extend it and style an internal `play-button`:

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
.root .main-video.videoPlayer_root .videoPlayer_play-button {
    background:green;
    color:purple;
}
```

> Note: Custom pseudo elements are not limited to the end of a selector like native pseudo elements, they can be chained (e.g. `.my-gallery::nav-btn::label`)

## define custom pseudo-elements

Any [CSS class](./class-selectors.md) is accessible as a pseudo-element of an [extending](./extend-stylesheet).

A `video-player.css` can define `play-button` CSS class that may be targeted as a pseudo-element:

CSS API
```css
.play-button { background:black; color:white; }
```

## Override native

// ToDo: say something about not doing this... or doing this for "good" reasons ;)

## Extend stylesheet pseudo-elements

When stylesheet [root](./root.md) extends another stylesheet, pseudo-elements are automatically exposed on the extending stylesheet and available inline:

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
.root .VideoPlayer_root .VideoPlayer_play-button {
    color: gold;
}
/* namespaced to page.css */
.root .main-player.SuperVideoPlayer_root.VideoPlayer_root .VideoPlayer_play-button {
    color: silver;
}
```

## Override custom pseudo-elements

Use CSS classes normally to override extended pseudo-elements:

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
.play-button { /* override VideoPlayer play-button */
    color: gold;
}
```

CSS OUTPUT
```css
/* namespaced to super-video-player.css */
.root .VideoPlayer_root .VideoPlayer_play-button {
    color: gold;
}
/* namespaced to page.css */
.root .main-player.SuperVideoPlayer_root.VideoPlayer_root .VideoPlayer_play-button {
    color: silver;
}

> Note that override of pseudo-elements only change the way CSS that use the stylesheet target those pseudo-elements. It does not change the extended component view output.




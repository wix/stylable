
# Pseudo-elements

In addition to CSS's native [pseudo-elements](https://developer.mozilla.org/en/docs/Web/CSS/Pseudo-elements), Stylable stylesheet automatically exposes CSS classes as custom pseudo-elements.

## Styling pseudo-elements
Use [custom tag selector](./tag-selectors.md#custom-element) or [extend a stylesheet](./extend-stylesheet.md) in order to get access to its internal parts.

Given a `video-player.css` with a `play-button` CSS class
```css
.play-button{ background:black; color:white }
```

Another stylesheet can [import](./imports.md) the `video-player` stylesheet, extend it and style the internal `play-button`:

CSS API
```css
:import{
    -sb-from:'./video-player.css';
    -sb-default:VideoPlayer;
}
.main-video{
    -sb-extends:VideoPlayer; /* define main-video as VideoPlayer */
}
.main-video::play-button{ /* override main-video play button */
    background:green;
    color:purple
}
```

CSS OUTPUT:
```css
.videoPlayer_root .videoPlayer_play-button { background:black; color:white }
/* namespaced to the stylesheet */
.root .main-video.videoPlayer_root .videoPlayer_play-button {
    background:green;
    color:purple;
}
```

> Note: Custom pseudo elements are not limited to the end of a selector like native pseudo elements, they can be chained (e.g. `.my-gallery::nav-btn::label`)

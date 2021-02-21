import { classes } from './index.st.css';

document.documentElement.classList.add(classes.root);

import('./dynamic').then(({ Dynamic, root }) => {
    document.body.insertAdjacentHTML('beforeend', Dynamic());

    window.colorOfDynamicComponent = getComputedStyle(document.querySelector(`.${root}`)).color;
});

window.onload = () => {
    window.backgroundColorAtLoadTime = getComputedStyle(document.documentElement).backgroundColor;
};

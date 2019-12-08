import { classes } from './index.st.css';

document.documentElement.classList.add(classes.root);
window.backgroundColorAtLoadTime = getComputedStyle(document.documentElement).backgroundColor;

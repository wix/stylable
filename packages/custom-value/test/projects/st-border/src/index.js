import { classes } from './index.st.css';

document.documentElement.classList.add(classes.root);
window.myBorder = getComputedStyle(document.documentElement).border;
window.myColor = getComputedStyle(document.documentElement).backgroundColor;

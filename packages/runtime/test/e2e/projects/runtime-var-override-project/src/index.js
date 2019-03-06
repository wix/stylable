import { classes, vars } from "./index.st.css";

document.documentElement.classList.add(classes.root);
document.documentElement.setAttribute('style', `${vars['--bg']}: rgb(0, 0, 255); ${vars['--color']}: rgb(0, 0, 255);`);

window.backgroundColorAtLoadTime = getComputedStyle(document.documentElement).backgroundColor;

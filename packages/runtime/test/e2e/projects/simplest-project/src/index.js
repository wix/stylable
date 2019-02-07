import style from "./index.st.css";

document.documentElement.classList.add(style.root);
document.documentElement.style = style.$cssVars({
    '--bg': `rgb(0, 0, 255)`,
    '--color': `rgb(0, 0, 255)`
}).toString();

window.backgroundColorAtLoadTime = getComputedStyle(document.documentElement).backgroundColor;

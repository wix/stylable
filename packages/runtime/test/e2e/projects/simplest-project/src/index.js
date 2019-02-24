import style from "./index.st.css";

document.documentElement.classList.add(style.root);
document.documentElement.setAttribute('style', `${style['--bg']}: rgb(0, 0, 255); ${style['--color']}: rgb(0, 0, 255);`);

window.backgroundColorAtLoadTime = getComputedStyle(document.documentElement).backgroundColor;

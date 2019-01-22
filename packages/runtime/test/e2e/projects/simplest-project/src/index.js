import style from "./index.st.css";

document.documentElement.classList.add(style.root);
document.documentElement.style.setProperty('--index2331474114-bg', `rgb(0, 0, 255)`);
console.log(`${style['--bg']}: rgb(0, 0, 255)`);
console.log(style['--bg']);
window.backgroundColorAtLoadTime = getComputedStyle(document.documentElement).backgroundColor;
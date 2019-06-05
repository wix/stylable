import style from "./index.st.css";

document.documentElement.classList.add(style('root').className);
window.backgroundColorAtLoadTime = getComputedStyle(document.documentElement).backgroundColor;

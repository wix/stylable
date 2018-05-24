import index from "./index.st.css";

document.documentElement.classList.add(index.root);
window.backgroundColorAtLoadTime = getComputedStyle(document.documentElement).backgroundColor;
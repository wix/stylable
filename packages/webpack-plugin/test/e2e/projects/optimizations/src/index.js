import index from "./index.st.css";
window.stylableIndex = index;

document.documentElement.classList.add(index.root);
document.body.classList.add(index.used);

const state = index.$cssStates({ x: true });
document.documentElement.classList.add(state);


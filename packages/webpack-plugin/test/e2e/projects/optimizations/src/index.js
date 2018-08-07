import index from "./index.st.css";
window.stylableIndex = index;
document.documentElement.classList.add(index.root);
document.body.classList.add(index.used);
const states = index.$cssStates({ x: true });
Object.keys(states).forEach(attr => {
    document.documentElement.setAttribute(attr, states[attr]);
});

import index from "./index.st.css";
window.stylableIndex = index;
document.documentElement.classList.add(index.root);
document.body.classList.add(index.used);
const states = index.$cssStates({ x: true });
Object.keys(states).forEach(attr => {
    document.documentElement.setAttribute(attr, states[attr]);
});

const div = document.createElement('div');
div.className = 'global1';

const global2 = document.createElement('div');
global2.className = 'global2';
global2.textContent = 'Globals Here!!!';
div.appendChild(global2);

document.body.appendChild(div);
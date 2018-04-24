import index from "./index.st.css";
import { button } from "test-components";

document.documentElement.classList.add(index.root);

const btn = button.render('I am a button');
btn.id = 'btn'
document.body.appendChild(btn)


console.log("entry", index);
console.log("entry", button);

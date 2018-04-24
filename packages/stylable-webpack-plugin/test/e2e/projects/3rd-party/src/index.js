import index from "./index.st.css";
import { button } from "test-components";

document.documentElement.classList.add(index.root);

document.body.appendChild(button.render('I am a button'))


console.log("entry", index);
console.log("entry", button);

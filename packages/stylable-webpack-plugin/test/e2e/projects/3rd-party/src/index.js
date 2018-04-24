import style from "./index.st.css";
import { button } from "test-components";

document.documentElement.classList.add(style.root);

document.body.appendChild(button.render('!!!!!!!!!!'))


console.log("entry", style);
console.log("entry", button);

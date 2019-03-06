import { classes } from "./button.st.css";
const render = (label = "Button") => {
  const btn = document.createElement("button");
  const text = document.createElement("span");
  text.textContent = label;
  btn.appendChild(text);
  btn.classList.add(classes.root);
  text.classList.add(classes.text);
  return btn;
};
export { classes, render };

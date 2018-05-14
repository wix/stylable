import style from "./button.st.css";
const render = (label = "Button") => {
  const btn = document.createElement("button");
  const text = document.createElement("span");
  text.textContent = label;
  btn.appendChild(text);
  btn.classList.add(style.root);
  text.classList.add(style.text);
  return btn;
};
export { style, render };

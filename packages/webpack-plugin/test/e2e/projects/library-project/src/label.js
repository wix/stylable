import style from "./button.st.css";
const render = (label = "I am a Label") => {
  const text = document.createElement("span");
  text.textContent = label;
  text.classList.add(style.root);
  return text;
};
export { style, render };

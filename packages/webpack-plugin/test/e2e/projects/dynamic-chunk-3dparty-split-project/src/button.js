import style from "./button.st.css";
import * as button from "test-components/button";
const render = (_text = 'Button') => {
  const btn = button.render(_text);
  btn.classList.add(style.root);
  return btn;
};
export { style, render };

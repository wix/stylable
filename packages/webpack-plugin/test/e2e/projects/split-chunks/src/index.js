import index from "./index.st.css";
(async () => {
  const { style } = await import("lib");
  document.documentElement.classList.add(index.root);
  document.documentElement.classList.add(style.root);
})();

// document.documentElement.classList.add(getName());

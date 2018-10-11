import index from "./index.st.css";
(async () => {
  const { style } = await import("lib");
  const { style: style2 } = await import("lib2");
  document.documentElement.classList.add(index.root);
  
  document.body.innerHTML = `
    <div style="height:200px" class="${style.root}">A</div>
    <div style="height:200px" class="${style2.root}">B</div>
  `
})();

// document.documentElement.classList.add(getName());

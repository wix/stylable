module.exports.options = function(options) {
  let index = 1;
  return {
    ...options,
    transformHooks: {
      postProcessor(result) {
        const actions = [];
        result.meta.outputAst.walkDecls(decl => {
          actions.push(() =>
            decl.after(
              decl.clone({
                value: decl.value.replace(/hook_var_(\d+)/, "rgb($1, 0, 0)")
              })
            )
          );
        });
        actions.forEach(action => action());
        return result;
      },
      replaceValueHook() {
        return "hook_var_" + index++;
      }
    }
  };
};

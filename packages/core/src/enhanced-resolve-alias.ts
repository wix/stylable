// we don't want to bundle the entire enhanced-resolve package for the browser
// it will throw if Stylable is used in the browser without a custom resolver
export default {
    createResolver: () => {
        throw new Error(
            'Stylable requires a custom resolver in lib bundles. please provide `resolveModule` options to the Stylable constructor.'
        );
    },
};

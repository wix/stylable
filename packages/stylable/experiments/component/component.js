const Party = PartyModule.exports.default;
const componentClasses = ComponentCSSModule.exports.default;

function Component(el) {
    return `<div class="${componentClasses}">${Party({className: componentClasses.Label})} Component</div>`
}
var camelcase = require('camelcase-css');

function atRule(node, options) {
    if (typeof node.nodes === 'undefined') {
        return node.params;
    } else {
        return process(node, options);
    }
}


function shouldCamel(noCamel, name) {
    return !noCamel.some((matcher) => name.match(matcher));
}

function process(node, options) {
    var name;
    var result = {};
    options = options || {};
    options.noCamel = options.noCamel || [];
    node.each(function (child) {
        var rules = {};
        node.each(function (rule) {
            if (rule.type !== 'rule') {
                return;
            } else if (rules[rule.selector]) {
                if (rules[rule.selector].append) {
                    rules[rule.selector].append(rule.nodes);
                    rule.remove();
                }
            } else {
                rules[rule.selector] = rule;
            }
        });

        if (child.type === 'atrule') {
            name = '@' + child.name;
            if (child.params && child.nodes) name += ' ' + child.params;
            
            if (typeof result[name] === 'undefined') {
                result[name] = atRule(child, options);
            } else if (Array.isArray(result[name])) {
                result[name].push(atRule(child, options));
            } else {
                result[name] = [result[name], atRule(child, options)];
            }

        } else if (child.type === 'rule') {
            result[child.selector] = process(child, options);

        } else if (child.type === 'decl') {
            name = shouldCamel(options.noCamel, child.prop) ? camelcase(child.prop) : child.prop;
            child.value = child.important ?
                child.value + ' !important' : child.value;
            if (typeof result[name] === 'undefined') {
                result[name] = child.value;
            } else if (Array.isArray(result[name])) {
                result[name].push(child.value);
            } else {
                result[name] = [result[name], child.value];
            }
        }

    });
    return result;
}


module.exports = process;
'use strict';
var camelCaseCSS = require("camelcase-css");
var stack;

function Declaration(name, value) {
    this.type = 'decl';
    this.name = name;
    this.value = value;
}

function Rule(rule) {
    this.type = 'rule';
    this.rule = rule;
    this.decl = [];
}

function AtRule(rule, value) {
    this.type = '@at-type';
    this.rule = rule;
    this.value = value || true;
    this.children = [];
}




function shouldCamel(options, name, selector) {
    return !(options.noCamel.some((matcher) => name.match(matcher)) || options.noCamelSelector.some((matcher) => selector.match(matcher)));
}

function objectify(nodes, out, options, value) {
    return nodes.length ? nodes.reduce((out, node) => {
        var rule = node.rule;
        var isAt = node.type === '@at-type';
        if(rule !== '@font-face' && !isAt){
            while (out[rule]) { rule += ' '; }
        }
        return setOrPush(out, rule, isAt ?
            objectify(node.children, null, options, node.value) :
            objectifyDeclarations(node.decl, null, options, node));
    }, out || {}) : value;
}

function objectifyDeclarations(decl, out, options, parent) {
    return decl.reduce((out, node) => {
        return setOrPush(out, shouldCamel(options, node.name, parent.rule) ? camelCaseCSS(node.name) : node.name, node.value);
    }, out || {});
}

function setOrPush(target, key, value) {
    if (Array.isArray(target[key])) {
        target[key].push(value);
    } else if (target[key]) {
        target[key] = [target[key], value];
    } else {
        target[key] = value;
    }
    return target;
}

//handlers

function handleDecl(rule, content, id) {
    var node;
    if (content.charCodeAt(0) !== 64) {
        var index = content.indexOf(':');
        var name = content.substring(0, index);
        var value = content.substring(index + 1).trim();
        node = new Declaration(name, value);
    } else {
        rule = null;
        var index = content.indexOf(' ');
        var name = content.substring(0, index);
        var value = content.substring(index + 1).trim();
        node = new AtRule(name, value);
    }
    stack.push({ id, rule, node });
}

function handleRule(rule, id, mergeSame) {
    var node = new Rule(rule);
    var size = stack.length;
    if (!rule && id === 0) { return; }
    while (size--) {
        if (stack[size].rule !== rule) { continue; }
        if (stack[size].node.type === 'rule') {
            if (mergeSame) {
                node.decl = node.decl.concat(stack.splice(size, 1)[0].node.decl);
            }
        } else {
            node.decl.push(stack.splice(size, 1)[0].node);
        }
    }
    node.decl.reverse();
    stack.push({ id, rule, node });
}

function handleAtRule(rule, id) {
    var node = new AtRule(rule);
    var size = stack.length;
    while (size--) {
        if (stack[size].id === id) {
            node.children.push(stack.splice(size, 1)[0].node);
        }
    }
    if (rule === '@font-face') {
        node.children.forEach((node) => {
            node.rule = rule;
            stack.push({ id: 0, rule, node });
        });
    } else {
        node.children.reverse();
        stack.push({ id: 0, rule, node });
    }

}


module.exports = function (options) {
    options = options || {};
    options.noCamel = options.noCamel || [];
    options.noCamelSelector = options.noCamelSelector || [];
    options.mergeSame = options.mergeSame === undefined ? true : options.mergeSame;
    return function plugin(context, content, selectors, parents, line, column, length, id) {
        var rule = selectors.join(', ');

        switch (context) {
            case -1:
                stack = [];
                break
            case -2:
                return objectify(stack.map(_ => _.node), null, options);
            case 1:
                handleDecl(rule, content, id);
                break
            case 2:
                handleRule(rule, id, options.mergeSame);
                break
            case 3:
                handleAtRule(rule, id);
                break
        }
    }
}
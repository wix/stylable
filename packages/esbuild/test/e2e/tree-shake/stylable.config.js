const { createNamespaceStrategyNode } = require('@stylable/node');

module.exports = {
    defaultConfig() {
        return {
            resolveNamespace: createNamespaceStrategyNode({
                hashFragment: 'minimal',
                strict: true,
            }),
        };
    },
};

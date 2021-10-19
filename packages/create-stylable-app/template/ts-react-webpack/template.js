/** @type {import('create-stylable-app').TemplateDefinition} */
module.exports = {
    dependencies: ['@stylable/runtime', 'react', 'react-dom'],
    devDependencies: [
        '@stylable/core',
        '@stylable/webpack-plugin',
        '@types/react',
        '@types/react-dom',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
        'eslint-config-prettier',
        'eslint-plugin-react',
        'eslint-plugin-react-hooks',
        'eslint-plugin-stylable',
        'eslint@7',
        'html-webpack-plugin',
        'rimraf',
        'serve',
        'ts-loader',
        'typescript',
        'webpack',
        'webpack-cli',
        'webpack-dev-server',
    ],
    packageJson: {
        description: 'Stylable App',
        private: true,
        license: 'UNLICENSED',
        scripts: {
            clean: 'rimraf dist',
            prebuild: 'npm run clean',
            build: 'webpack --mode production --no-devtool',
            start: 'webpack serve --open',
            serve: 'serve ./dist',
            lint: 'eslint . -f codeframe',
            typecheck: 'tsc --noEmit',
            test: 'npm run typecheck && npm run lint',
        },
    },
};

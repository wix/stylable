// @ts-check

/** @type {import('create-stylable-app').TemplateDefinition} */
module.exports = {
    dependencies: ['react', 'react-dom'],
    devDependencies: [
        '@stylable/cli',
        '@stylable/runtime',
        '@stylable/webpack-plugin',
        '@types/react',
        '@types/react-dom',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
        'eslint-config-prettier',
        'eslint-plugin-react',
        'eslint-plugin-react-hooks',
        'eslint',
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
        type: 'module',
        scripts: {
            clean: 'rimraf dist',
            prebuild: 'npm run clean',
            build: 'webpack --mode production --no-devtool',
            start: 'webpack serve --open',
            serve: 'serve ./dist',
            lint: 'eslint .',
            typecheck: 'tsc --noEmit',
            test: 'npm run typecheck && npm run lint',
        },
    },
    postinstall: [['npm', 'run', 'build']],
};

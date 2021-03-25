# create-stylable-app

Quickly initialize a web application powered with [Stylable](https://stylable.io) as its styling solution.

This CLI creates a simple setup that showcases _basic_ Stylable integration.

## Usage

```sh
npx create-stylable-app <project-name> 
```

_OR_

```sh
npm init stylable-app <project-name>
```

_OR_

```sh
yarn create stylable-app <project-name>
```

## Options

### Choosing a template
`create-stylable-app` can generate a project from a set of different templates:
- `ts-react-webpack` (default) - generate a project based on React, TypeScript and webpack
- `ts-react-rollup` - generate a project based on React, TypeScript and Rollup

### Options description

| Option       | Alias  | Description                                                         | Default Value      |
| ------------ | ------ | ------------------------------------------------------------------- | ------------------ |
| template     | `-t`   | project template to use (`ts-react-webpack` or `ts-react-rollup`)   | `ts-react-webpack` |
| verboseNpm   |        | print verbose npm log                                               | `false`            |
| help         | `-h`   | Show this help                                                      |                    |
| version      |        | show `create-stylable-app` version number                           |                    |

## License

Copyright (c) 2020 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE).

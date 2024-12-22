import { expect } from 'chai';
import {
    loadDirSync,
    populateDirectorySync,
    runCliSync,
    createTempDirectory,
    ITempDirectory,
} from '@stylable/e2e-test-kit';

describe('Stylable CLI config presets', function () {
    let tempDir: ITempDirectory;

    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        await tempDir.remove();
    });

    it('should handle single preset (object)', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': JSON.stringify({
                name: 'workspace',
                version: '0.0.0',
                private: true,
            }),
            packages: {
                'project-a': {
                    src: {
                        'style.st.css': `.root{color:red}`,
                    },
                    'package.json': JSON.stringify({
                        name: 'a',
                        version: '0.0.0',
                    }),
                },
            },
            'stylable.config.js': `
        exports.stcConfig = () => ({ 
            presets: {
              'comp-lib': {
                dts: true,
                outputSources: true,
              }
            },
            options: { 
                outDir: './dist',
                srcDir: './src',
            },
            projects: {
              'packages/*': 'comp-lib'
            }
        })
        `,
        });

        const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);
        const dirContent = loadDirSync(tempDir.path);

        expect(stderr, 'has cli error').not.to.match(/error/i);
        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

        expect(Object.keys(dirContent)).to.include.members([
            'packages/project-a/dist/style.st.css.d.ts',
            'packages/project-a/dist/style.st.css',
        ]);
    });

    it('should handle single preset (array)', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': JSON.stringify({
                name: 'workspace',
                version: '0.0.0',
                private: true,
            }),
            packages: {
                'project-a': {
                    src: {
                        'style.st.css': `.root{color:red}`,
                    },
                    'package.json': JSON.stringify({
                        name: 'a',
                        version: '0.0.0',
                    }),
                },
            },
            'stylable.config.js': `
      exports.stcConfig = () => ({ 
          presets: {
            'comp-lib': {
              dts: true,
              outputSources: true,
            }
          },
          options: { 
              outDir: './dist',
              srcDir: './src',
          },
          projects: [
            ['packages/*','comp-lib']
          ]
      })
      `,
        });

        const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);
        const dirContent = loadDirSync(tempDir.path);

        expect(stderr, 'has cli error').not.to.match(/error/i);
        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

        expect(Object.keys(dirContent)).to.include.members([
            'packages/project-a/dist/style.st.css.d.ts',
            'packages/project-a/dist/style.st.css',
        ]);
    });

    it('should handle multiple presets (object)', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': JSON.stringify({
                name: 'workspace',
                version: '0.0.0',
                private: true,
            }),
            packages: {
                'project-a': {
                    src: {
                        'style.st.css': `.root{color:red}`,
                    },
                    'package.json': JSON.stringify({
                        name: 'a',
                        version: '0.0.0',
                    }),
                },
            },
            'stylable.config.js': `
              exports.stcConfig = () => ({ 
                  presets: {
                    'a': {
                      outputSources: true,
                    },
                    'b': {
                      dts: true,
                    }
                  },
                  options: { 
                      outDir: './dist',
                      srcDir: './src',
                  },
                  projects: {
                    'packages/*': ['a', 'b']
                  }
              })
      `,
        });

        const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);
        const dirContent = loadDirSync(tempDir.path);

        expect(stderr, 'has cli error').not.to.match(/error/i);
        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

        expect(Object.keys(dirContent)).to.include.members([
            'packages/project-a/dist/style.st.css',
            'packages/project-a/dist/style.st.css.d.ts',
        ]);
    });

    it('should handle multiple presets (array)', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': JSON.stringify({
                name: 'workspace',
                version: '0.0.0',
                private: true,
            }),
            packages: {
                'project-a': {
                    src: {
                        'style.st.css': `.root{color:red}`,
                    },
                    'package.json': JSON.stringify({
                        name: 'a',
                        version: '0.0.0',
                    }),
                },
            },
            'stylable.config.js': `
            exports.stcConfig = () => ({ 
                presets: {
                    'a': {
                        outputSources: true,
                      },
                      'b': {
                        dts: true,
                      }
                },
                options: { 
                    outDir: './dist',
                    srcDir: './src',
                },
                projects: [
                  ['packages/*', ['a', 'b']]
                ]
            })
    `,
        });

        const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);
        const dirContent = loadDirSync(tempDir.path);

        expect(stderr, 'has cli error').not.to.match(/error/i);
        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

        expect(Object.keys(dirContent)).to.include.members([
            'packages/project-a/dist/style.st.css',
            'packages/project-a/dist/style.st.css.d.ts',
        ]);
    });

    it('should handle single preset override', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': JSON.stringify({
                name: 'workspace',
                version: '0.0.0',
                private: true,
            }),
            packages: {
                'project-a': {
                    src: {
                        'style.st.css': `.root{color:red}`,
                    },
                    'package.json': JSON.stringify({
                        name: 'a',
                        version: '0.0.0',
                    }),
                },
            },
            'stylable.config.js': `
          exports.stcConfig = () => ({ 
              presets: {
                'comp-lib': {
                  dts: true,
                  outputSources: true,
                }
              },
              options: { 
                  outDir: './dist',
                  srcDir: './src',
              },
              projects: {
                'packages/*': {
                  preset: 'comp-lib',
                  options: {
                    dts: false
                  }
                }
              }
          })
    `,
        });

        const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);
        const dirContent = loadDirSync(tempDir.path);

        expect(stderr, 'has cli error').not.to.match(/error/i);
        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

        expect(Object.keys(dirContent)).to.include.members([
            'packages/project-a/dist/style.st.css',
        ]);

        expect(Object.keys(dirContent)).not.to.include.members([
            'packages/project-a/dist/style.st.css.d.ts',
        ]);
    });

    it('should handle multiple presets overrides', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': JSON.stringify({
                name: 'workspace',
                version: '0.0.0',
                private: true,
            }),
            packages: {
                'project-a': {
                    src: {
                        'style.st.css': `.root{color:red}`,
                    },
                    'package.json': JSON.stringify({
                        name: 'a',
                        version: '0.0.0',
                    }),
                },
            },
            'stylable.config.js': `
            exports.stcConfig = () => ({ 
                presets: {
                  'a': {
                    outputSources: true,
                    cjs: true
                  },
                  'b': {
                    esm: true,
                    cjs: true
                  }
                },
                options: { 
                    outDir: './dist',
                    srcDir: './src',
                },
                projects: {
                  'packages/*': {
                    presets: ['a', 'b'],
                    options: {
                      cjs: false,
                    }
                  }
                }
            })
    `,
        });

        const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);
        const dirContent = loadDirSync(tempDir.path);

        expect(stderr, 'has cli error').not.to.match(/error/i);
        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

        expect(Object.keys(dirContent)).to.include.members([
            'packages/project-a/dist/style.st.css',
            'packages/project-a/dist/style.st.css.mjs',
        ]);

        expect(Object.keys(dirContent)).not.to.include.members([
            'packages/project-a/dist/style.st.css.js',
            'packages/project-b/dist/style.st.css.js',
        ]);
    });

    it('should handle options and preset mix', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': JSON.stringify({
                name: 'workspace',
                version: '0.0.0',
                private: true,
            }),
            packages: {
                'project-a': {
                    src: {
                        'style.st.css': `.root{color:red}`,
                    },
                    'package.json': JSON.stringify({
                        name: 'a',
                        version: '0.0.0',
                    }),
                },
            },
            'stylable.config.js': `
            exports.stcConfig = () => ({ 
                presets: {
                  'a': {
                    outputSources: true,
                  }
                },
                options: { 
                    outDir: './dist',
                    srcDir: './src',
                },
                projects: {
                  'packages/*': ['a', { indexFile: './index.st.css' }]                   
                }
            })
    `,
        });

        const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);
        const dirContent = loadDirSync(tempDir.path);

        expect(stderr, 'has cli error').not.to.match(/error/i);
        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

        expect(Object.keys(dirContent)).to.include.members([
            'packages/project-a/dist/style.st.css',
            'packages/project-a/dist/index.st.css',
        ]);
    });

    it('should throw when used non-existing preset', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': JSON.stringify({
                name: 'workspace',
                version: '0.0.0',
                private: true,
            }),
            packages: {
                'project-a': {
                    src: {
                        'style.st.css': `.root{color:red}`,
                    },
                    'package.json': JSON.stringify({
                        name: 'a',
                        version: '0.0.0',
                    }),
                },
            },
            'stylable.config.js': `
        exports.stcConfig = () => ({ 
            options: { 
                outDir: './dist',
                srcDir: './src',
            },
            projects: [
              ['packages/*', 'a']
            ]
        })
`,
        });

        const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);

        expect(stdout, 'has diagnostic error').not.to.match(/error/i);
        expect(stderr, 'has cli error').to.match(/Cannot resolve preset named "a"/i);
    });
});

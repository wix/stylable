import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { loadDirSync, populateDirectorySync, runCliSync } from './test-kit/cli-test-kit';

describe('Stylable CLI config presets', function () {
    this.timeout(25000);
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

    it('should handle multiple presets and overrides between them (object)', () => {
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
                      dts: true,
                      outputSources: true,
                    },
                    'b': {
                      dts: false,
                      cjs: false,
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
        ]);

        expect(Object.keys(dirContent)).not.to.include.members([
            'packages/project-a/dist/style.st.css.d.ts',
            'packages/project-a/dist/style.st.css.js',
        ]);
    });

    it('should handle multiple presets and overrides between them (array)', () => {
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
                    dts: true,
                    outputSources: true,
                  },
                  'b': {
                    dts: false,
                    cjs: false,
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
        ]);

        expect(Object.keys(dirContent)).not.to.include.members([
            'packages/project-a/dist/style.st.css.d.ts',
            'packages/project-a/dist/style.st.css.js',
        ]);
    });

    it('should handle single preset override (object)', () => {
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

    it('should handle single preset override (array)', () => {
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
              [
                'packages/*', 
                {
                  preset: 'comp-lib',
                  options: {
                    dts: false
                  }
                }
              ]
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
        ]);

        expect(Object.keys(dirContent)).not.to.include.members([
            'packages/project-a/dist/style.st.css.d.ts',
        ]);
    });

    it('should handle multiple presets overrides (object)', () => {
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
                    cjs: false,
                    mjs: true
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
                      outputSources: false,
                      cjs: true,
                      mjs: false,
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
            'packages/project-a/dist/style.st.css.js',
        ]);

        expect(Object.keys(dirContent)).not.to.include.members([
            'packages/project-a/dist/style.st.css',
            'packages/project-a/dist/style.st.css.mjs',
        ]);
    });

    it('should handle multiple presets overrides (array)', () => {
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
                  cjs: false,
                  mjs: true
                }
              },
              options: { 
                  outDir: './dist',
                  srcDir: './src',
              },
              projects: [
                [
                  'packages/*',
                  {
                    presets: ['a', 'b'],
                    options: {
                      outputSources: false,
                      cjs: true,
                      mjs: false,
                    }
                  }
                ]
              ]
          })
  `,
        });

        const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);
        const dirContent = loadDirSync(tempDir.path);

        expect(stderr, 'has cli error').not.to.match(/error/i);
        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

        expect(Object.keys(dirContent)).to.include.members([
            'packages/project-a/dist/style.st.css.js',
        ]);

        expect(Object.keys(dirContent)).not.to.include.members([
            'packages/project-a/dist/style.st.css',
            'packages/project-a/dist/style.st.css.mjs',
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

    it('should throw when used invalid preset', () => {
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
                a: {
                    dts: true
                }
            },
            options: { 
                outDir: './dist',
                srcDir: './src',
            },
            projects: [
              ['packages/*', ['a', {}]]
            ]
        })
`,
        });

        const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);

        expect(stdout, 'has diagnostic error').not.to.match(/error/i);
        expect(stderr, 'has cli error').to.include(
            'Error: Cannot resolve preset named "[object Object]"'
        );
    });
});

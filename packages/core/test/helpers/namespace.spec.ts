import { expect } from 'chai';
import {
    type NamespaceBuilderParams,
    createNamespaceStrategy,
    defaultNamespaceBuilder,
    defaultNoMatchHandler,
} from '@stylable/core/dist/helpers/namespace';

describe('createNamespaceStrategy', () => {
    it('should return smallest namespace for the same file', () => {
        const resolveNamespace = createNamespaceStrategy({
            hashFn: () => '1',
            getPackageInfo: () => ({ name: 'package', version: '0.0.0', dirPath: '/package' }),
            normalizePath: (dirPath, filePath) => filePath.replace(dirPath, ''),
        });

        expect(resolveNamespace('x', '/package/x.st.css')).to.equal('x');
        expect(resolveNamespace('x', '/package/x.st.css')).to.equal('x');
    });
    it('should return smallest namespace for the same file with prefix', () => {
        const resolveNamespace = createNamespaceStrategy({
            prefix: 'test-',
            hashFn: () => '1',
            getPackageInfo: () => ({ name: 'package', version: '0.0.0', dirPath: '/package' }),
            normalizePath: (dirPath, filePath) => filePath.replace(dirPath, ''),
        });

        expect(resolveNamespace('x', '/package/x.st.css')).to.equal('test-x');
        expect(resolveNamespace('x', '/package/x.st.css')).to.equal('test-x');
    });
    it('should salt the hash', () => {
        let usedInput: string | undefined;
        const resolveNamespace = createNamespaceStrategy({
            hashSalt: '__SALT__',
            hashFn: (input) => {
                usedInput = input;
                return '1';
            },
            getPackageInfo: () => ({ name: 'package', version: '0.0.0', dirPath: '/package' }),
            normalizePath: (dirPath, filePath) => filePath.replace(dirPath, ''),
        });

        expect(resolveNamespace('x', '/package/x.st.css')).to.equal('x');
        expect(usedInput).to.equal('__SALT__package@0.0.0//x.st.css');
    });
    it('should call buildNamespace hook', () => {
        let usedOptions: NamespaceBuilderParams | undefined;
        const resolveNamespace = createNamespaceStrategy({
            hashFn: () => '1',
            getPackageInfo: () => ({ name: 'package', version: '0.0.0', dirPath: '/package' }),
            normalizePath: (dirPath, filePath) => filePath.replace(dirPath, ''),
            buildNamespace(options) {
                usedOptions = options;
                return defaultNamespaceBuilder(options);
            },
        });

        expect(resolveNamespace('x', '/package/x.st.css')).to.equal('x');
        expect(usedOptions).to.eql({
            prefix: '',
            hashSalt: '',
            namespace: 'x',
            paths: {
                file: '/x.st.css',
                origin: '/x.st.css',
            },
            packageInfo: {
                name: 'package',
                version: '0.0.0',
                dirPath: '/package',
            },
        });
    });
    it('should add a small part of the hash for same namespace from different file', () => {
        let nextHash = 0;
        const resolveNamespace = createNamespaceStrategy({
            hashFn: () => nextHash++,
            getPackageInfo: () => ({ name: 'package', version: '0.0.0', dirPath: '/package' }),
            normalizePath: (dirPath, filePath) => filePath.replace(dirPath, ''),
        });

        expect(resolveNamespace('x', '/package/x.st.css')).to.equal('x'); // hash 0
        expect(resolveNamespace('x', '/package/x1.st.css')).to.equal('x-1'); // hash 1
        expect(resolveNamespace('x', '/package/x2.st.css')).to.equal('x-2'); // hash 2
    });
    it('should throw when no unique namespace can be generated and hash slice size is larger then hash length', () => {
        function getErrorMessage() {
            try {
                defaultNoMatchHandler(false, 'x-1', '/package/x2.st.css', '/package/x1.st.css');
            } catch (e) {
                return (e as Error).message;
            }
            return '';
        }

        const resolveNamespace = createNamespaceStrategy({
            hashFn: () => '1',
            getPackageInfo: () => ({ name: 'package', version: '0.0.0', dirPath: '/package' }),
            normalizePath: (dirPath, filePath) => filePath.replace(dirPath, ''),
        });
        expect(resolveNamespace('x', '/package/x.st.css')).to.equal('x');
        expect(resolveNamespace('x', '/package/x1.st.css')).to.equal('x-1');
        expect(() => {
            resolveNamespace('x', '/package/x2.st.css');
        }).to.throw(getErrorMessage());
    });
    it('should throw when no unique namespace can be generated in strict mode', () => {
        function getErrorMessage() {
            try {
                defaultNoMatchHandler(true, 'x', '/package/x1.st.css', '/package/x.st.css');
            } catch (e) {
                return (e as Error).message;
            }
            return '';
        }

        const resolveNamespace = createNamespaceStrategy({
            hashFn: () => '1',
            getPackageInfo: () => ({ name: 'package', version: '0.0.0', dirPath: '/package' }),
            normalizePath: (dirPath, filePath) => filePath.replace(dirPath, ''),
            strict: true,
        });
        expect(resolveNamespace('x', '/package/x.st.css')).to.equal('x');
        expect(() => {
            resolveNamespace('x', '/package/x1.st.css');
        }).to.throw(getErrorMessage());
    });
    it('should use minimum hash slice size', () => {
        const resolveNamespace = createNamespaceStrategy({
            hashFragment: 4, // min size hash slice
            hashFn: () => '12345',
            getPackageInfo: () => ({ name: 'package', version: '0.0.0', dirPath: '/package' }),
            normalizePath: (dirPath, filePath) => filePath.replace(dirPath, ''),
        });

        expect(resolveNamespace('x', '/package/x.st.css')).to.equal('x-1234');
        expect(resolveNamespace('x', '/package/x1.st.css')).to.equal('x-12345');
    });

    it('should use full hash', () => {
        const resolveNamespace = createNamespaceStrategy({
            hashFragment: 'full', // min size hash slice
            hashFn: () => '12345',
            getPackageInfo: () => ({ name: 'package', version: '0.0.0', dirPath: '/package' }),
            normalizePath: (dirPath, filePath) => filePath.replace(dirPath, ''),
        });

        expect(resolveNamespace('x', '/package/x.st.css')).to.equal('x-12345');
    });

    it('should use stylesheet path when dirPath from getPackageInfo does not exists', () => {
        let usedInput: string | undefined;
        const resolveNamespace = createNamespaceStrategy({
            hashFn: (input) => {
                usedInput = input;
                return '12345';
            },
            getPackageInfo: () => ({ name: 'package', version: '0.0.0', dirPath: '' }),
            normalizePath: () => {
                throw new Error('Should not be called');
            },
        });

        expect(resolveNamespace('x', '/package/x.st.css')).to.equal('x');
        expect(usedInput).to.equal('package@0.0.0//package/x.st.css');
    });

    it('should use normalizePath when dirPath from getPackageInfo exists', () => {
        let usedDirPath: string | undefined;
        let usedFilePath: string | undefined;
        const resolveNamespace = createNamespaceStrategy({
            hashFn: () => '12345',
            getPackageInfo: () => ({ name: 'package', version: '0.0.0', dirPath: '/package' }),
            normalizePath: (dirPath, filePath) => {
                usedDirPath = dirPath;
                usedFilePath = filePath;
                return filePath.replace(dirPath, '');
            },
        });

        expect(resolveNamespace('x', '/package/x.st.css')).to.equal('x');
        expect(usedDirPath).to.equal('/package');
        expect(usedFilePath).to.equal('/package/x.st.css');
    });
});

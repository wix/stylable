import { dirname, join } from 'path';

const NODE_MODULES_FOLDER = `/node_modules/`;

export interface Preset {
    path: string;
    overrides: { [name: string]: string };
    named?: string;
    style?: string;
}

export interface LocalComponentConfig {
    id: string;
    presets?: Preset[];
    snapshots?: string[];
    variantsPath?: string;
    previewProps?: { [name: string]: any };
}

export interface ComponentConfig extends LocalComponentConfig {
    stylesheetPath: string;
    namespace: string;
}

export interface ComponentsMetadata {
    version: string;
    name: string;
    fs: { [path: string]: { metadata?: any; content: string } };
    components: { [path: string]: ComponentConfig };
    packages: { [name: string]: string };
}

export class ComponentMetadataBuilder {
    private output: ComponentsMetadata;
    constructor(private context: string, name: string, version: string) {
        this.output = {
            version,
            name,
            fs: {},
            components: {},
            packages: {},
        };
    }
    public hasPackages() {
        return Object.keys(this.output.packages).length;
    }
    public build() {
        this.validate();
        return this.output;
    }
    public addSource(resourcePath: string, content: string, metadata: any) {
        const local = this.localResourcePath(resourcePath);
        this.output.fs[local] = {
            metadata,
            content,
        };
        this.output.packages[this.resourcePackageName(local)] = this.packageRootPath(local);
    }
    public addComponent(
        stylesheetPath: string,
        localComponentConfig: LocalComponentConfig,
        namespace: string
    ) {
        const componentConfig = cloneObject(localComponentConfig) as ComponentConfig;
        const componentDir = dirname(stylesheetPath);
        const variantsPath = componentConfig.variantsPath;
        componentConfig.namespace = namespace;
        componentConfig.stylesheetPath = this.localResourcePath(stylesheetPath);
        if (variantsPath) {
            componentConfig.variantsPath = this.localResourcePath(join(componentDir, variantsPath));
            if (componentConfig.presets) {
                for (const preset of componentConfig.presets) {
                    preset.path = this.localResourcePath(
                        join(componentDir, variantsPath, preset.path)
                    );
                }
            }
        }
        if (!componentConfig.id) {
            throw new Error(
                `Invalid component config for resource: ${stylesheetPath}. Missing {id}`
            );
        }
        if (this.output.components[componentConfig.id]) {
            throw new Error(`Duplicate Component ID: ${componentConfig.id}`);
        }
        this.output.components[componentConfig.id] = componentConfig;
    }
    public addComponentSnapshot(id: string, snapshot: string | string[]) {
        const componentConfig = this.output.components[id];
        componentConfig.snapshots = componentConfig.snapshots || [];
        if (Array.isArray(snapshot)) {
            componentConfig.snapshots.push(...snapshot);
        } else {
            componentConfig.snapshots.push(snapshot);
        }
    }
    public createIndex() {
        const indexPath = this.localResourcePath('/index.st.css');
        const namespace = this.output.name + '-index';
        if (this.output.fs[indexPath]) {
            throw new Error('Duplicate index');
        }
        let maxDepth = 0;
        const source = Object.keys(this.output.components).reduce((source, name) => {
            const { stylesheetPath } = this.output.components[name];
            const { depth } = this.output.fs[stylesheetPath].metadata;
            const from = stylesheetPath;
            maxDepth = Math.max(maxDepth, depth);

            return source + `:import {-st-from: "${from}"; -st-default: ${name}} .root ${name}{}\n`;
        }, '');
        this.addSource('/index.st.css', source, { namespace, depth: maxDepth });
    }
    private validate() {
        const errors = [];
        for (const component in this.output.components) {
            for (const preset of this.output.components[component].presets || []) {
                if (!this.output.fs[preset.path]) {
                    errors.push(`Missing variant for preset ${preset.path}`);
                }
            }
        }
        if (errors.length) {
            throw new Error('Invalid metadata output:\n' + errors.join('\n'));
        }
    }
    private packageRootPath(localResourcePath: string) {
        const i = localResourcePath.lastIndexOf(NODE_MODULES_FOLDER);
        if (i !== -1) {
            return (
                localResourcePath.slice(0, i + NODE_MODULES_FOLDER.length) +
                this.resourcePackageName(localResourcePath)
            );
        } else {
            return '/' + this.output.name;
        }
    }
    private localResourcePath(resourcePath: string) {
        return '/' + this.output.name + normPath(resourcePath, this.context);
    }
    private resourcePackageName(localResourcePath: string) {
        const i = localResourcePath.lastIndexOf(NODE_MODULES_FOLDER);
        if (i !== -1) {
            const [packageName, subName] = localResourcePath
                .slice(i + NODE_MODULES_FOLDER.length)
                .split('/');
            if (packageName.startsWith('@')) {
                return packageName + '/' + subName;
            }
            return packageName;
        } else {
            return this.output.name;
        }
    }
}

function normPath(resource: string, context = '') {
    const v = resource.replace(context, '').replace(/\\/g, '/');
    return v.startsWith('/') ? v : `/${v}`;
}

function cloneObject<T = object>(obj: T) {
    const clone = (Array.isArray(obj) ? [] : {}) as T;
    for (const i in obj) {
        const v = obj[i];
        if (v && typeof v === 'object') {
            clone[i] = cloneObject(v);
        } else {
            clone[i] = v;
        }
    }
    return clone;
}

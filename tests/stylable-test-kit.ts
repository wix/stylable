import { fromCSS, Stylesheet, Resolver } from "../src";
import { Pojo } from "../src/types";
import { Generator } from '../src/generator';
import { valueMapping } from '../src/stylable-value-parsers';

export interface EnvFile {
    path:string;
    name:string;
    value:any;
}
export interface CSSFile extends EnvFile {
    value:Stylesheet;
}
export interface JSFile extends EnvFile {
    value:Pojo;
}
export function CSS(path:string, name:string, src:string):CSSFile{
    return {path, name, value:fromCSS(src, name)}
}
export function JS(path:string, name:string, src:Pojo):JSFile{
    return {path, name, value:src} // ToDo: eval from module src
}
export type StylableEnfConfig = {namespaceDivider?:string, entries?:string[]};
export function defineStylableEnv(files:EnvFile[], {namespaceDivider='__', entries=['./main.css']}:StylableEnfConfig){
    const resolver = new Resolver(files.reduce<Pojo<any>>((acc, file) => {
        acc[file.path] = file.value;
        return acc;
    }, {}));
    const entryStylesheets = entries.map(path => resolver.resolveModule(path));
    const generator = new Generator({ namespaceDivider, resolver });
    Generator.generate(entryStylesheets, generator);
    return {
        files,
        generator,
        resolver,
        validate:{
            output(expected:string[]){
                const actual = generator.buffer;
                actual.forEach((actualOutput, index) => {
                    if(actualOutput !== expected[index]){
                        throw new Error(`expected CSS output #${index} to equal: \n"${expected[index]}"\n, but got: \n"${actualOutput}"`);
                    }
                });

                if(expected.length !== actual.length){
                    throw new Error(`expected ${expected.length} amount of CSS output, but got ${actual.length}`);
                }
            },
            stylesheet(path:string){
                const stylesheet = resolver.resolveModule(path);
                if(!stylesheet){
                    throw new Error(`stylesheet not found in path "${path}"`);
                }
                if(!Stylesheet.isStylesheet(stylesheet)){
                    throw new Error(`expected path "${path}" to reference stylesheet`);
                }
                return {
                    variant(className:string, isVariant:boolean=true){
                        const typedClass = stylesheet.typedClasses[className];
                        const isVariantActual = typedClass && typedClass[valueMapping.variant] === true || false;
                        if(isVariant !== isVariantActual){
                            const negative = isVariant ? '' : 'not ';
                            throw new Error(`expected stylesheet ${path} to ${negative}have ".${className}" variant`);
                        }
                    }
                }
            }
        }
    }
}
import { CustomValueStrategy } from '@stylable/core';
import {
    BoxedValueArray,
    BoxedValueMap,
    createCustomValue,
} from '@stylable/core/dist/index-internal';

export const stBorder = createCustomValue<BoxedValueMap, BoxedValueArray>({
    processArgs: (node, customTypes) => {
        return CustomValueStrategy.args(node, customTypes);
    },
    createValue: ([size, style, color]) => {
        return {
            size,
            style,
            color,
        };
    },
    getValue: (value, index) => {
        return value[index];
    },
    flattenValue: ({ value: { size, style, color } }) => {
        return {
            delimiter: ' ',
            parts: [size, style, color],
        };
    },
});

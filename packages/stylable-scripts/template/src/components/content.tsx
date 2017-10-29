import * as React from 'react';
import {properties, stylable} from 'wix-react-tools';

import style from './content.st.css';

interface ContentProps extends properties.Props {
    mainFile: string;
}

export const Content = stylable(style)(properties((props: ContentProps) => (
    <p>To get started, edit <code>{props.mainFile}</code> and save to reload.</p>
)));

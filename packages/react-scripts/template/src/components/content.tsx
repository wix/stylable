import React from 'react';
import { classes, style } from './content.st.css';

export interface IContentProps {
    className: string;
    mainFile: string;
}

export const Content: React.FunctionComponent<IContentProps> = props => (
    <p className={style(classes.root, props.className)} >
        To get started, edit <code>{props.mainFile}</code> and save to reload.
    </p>
);

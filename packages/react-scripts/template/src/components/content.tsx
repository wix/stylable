import React from 'react';
import style from './content.st.css';

export interface IContentProps {
    className?: string;
    mainFile: string;
}

export const Content: React.SFC<IContentProps> = props => (
    <p {...style('root', {}, props)}>
        To get started, edit <code>{props.mainFile}</code> and save to reload.
    </p>
);

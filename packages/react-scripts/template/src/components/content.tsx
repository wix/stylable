import * as React from 'react';
import style from './content.st.css';

interface ContentProps {
    className?: string;
    mainFile: string;
}

export const Content = (props: ContentProps) => (
    <p {...style('root', {}, props)}>
        To get started, edit <code>{props.mainFile}</code> and save to reload.
    </p>
);

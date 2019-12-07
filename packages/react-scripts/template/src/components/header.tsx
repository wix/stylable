import React from 'react';
import { classes, style } from './header.st.css';
import reactLogo from './logos/react.svg';
import stylableLogo from './logos/stylable.svg';

export interface IHeaderProps {
    className: string;
    message: string;
}

export const Header: React.FunctionComponent<IHeaderProps> = props => (
    <header className={style(classes.root, props.className)}>
        <img src={reactLogo} className={classes.reactLogo} alt="logo" />
        <img src={stylableLogo} className={classes.stylableLogo} alt="logo" />
        <h1 className={classes.title}>{props.message}</h1>
    </header>
);

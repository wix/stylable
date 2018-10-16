import React from 'react';
import style from './header.st.css';
import reactLogo from './logos/react.svg';
import stylableLogo from './logos/stylable.svg';

export interface IHeaderProps {
    className?: string;
    message: string;
}

export const Header: React.SFC<IHeaderProps> = props => (
    <header {...style('root', {}, props)}>
        <img src={reactLogo} className={style.reactLogo} alt="logo" />
        <img src={stylableLogo} className={style.stylableLogo} alt="logo" />
        <h1 className={style.title}>{props.message}</h1>
    </header>
);

import * as React from 'react';
import reactLogo from './logos/react.svg';
import stylableLogo from './logos/stylable.svg';
import style from './header.st.css';

interface HeaderProps {
    className?: string;
    message: string;
}

export const Header = (props: HeaderProps) => (
    <header {...style('root', {}, props)}>
        <img src={reactLogo} className={style.reactLogo} alt="logo" />
        <img src={stylableLogo} className={style.stylableLogo} alt="logo" />
        <h1 className={style.title}>{props.message}</h1>
    </header>
);

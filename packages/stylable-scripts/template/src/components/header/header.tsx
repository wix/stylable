import * as React from 'react';
import reactLogo from './react.svg';
import stylableLogo from './stylable.svg';
import style from './header.st.css';

export const Header: React.SFC = () => (
    <header className={style.root}>
        <img src={reactLogo} className={style.reactLogo} alt="logo" />
        <img src={stylableLogo} className={style.stylableLogo} alt="logo" />
        <h1 className={style.title}>Welcome to React with Stylable</h1>
    </header>
);

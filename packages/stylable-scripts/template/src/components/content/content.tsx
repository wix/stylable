import * as React from 'react';
import {properties, stylable} from 'wix-react-tools';

import style from './content.st.css';

export const Content: React.SFC = stylable(style)(properties(() => (
  <p>
    To get started, edit <code>src/index.tsx</code> and save to reload.
  </p>
)));

import ts from 'typescript';

export interface ExtendedTsLanguageService {
    setOpenedFiles: (files: string[]) => void;
    ts: ts.LanguageService;
}

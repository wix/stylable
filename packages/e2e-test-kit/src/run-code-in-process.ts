import child from 'child_process';

export function runCode(fn: (...args: any[]) => any, args: any) {
    const code64 = Buffer.from(`(${fn.toString()})(...${JSON.stringify(args)})`).toString('base64');
    const cmdArgs = ['-e', `eval(Buffer.from('${code64}','base64').toString('utf8'))`];
    return child.spawn('node', cmdArgs, {
        shell: false,
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });
}

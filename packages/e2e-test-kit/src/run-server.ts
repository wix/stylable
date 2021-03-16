import { spawn } from 'child_process';

export async function serve(dir: string, port = 3000, log = console.log) {
    log('Start Server');
    return new Promise<{ server: { close(): void }; serverUrl: string }>((res) => {
        const child = spawn(
            'node',
            ['./isolated-server', dir, port.toString()],
            {
                cwd: __dirname,
                stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
            }
        );

        child.once('message', (port) => {
            log(`Server Running (port: ${port})`);
            const serverUrl = `http://localhost:${port}`;
            const server = {
                close: () => {
                    try {
                        child.kill();
                    } catch (e) {
                        log('Kill Server Error:' + e);
                    }
                },
            };
            res({ server, serverUrl });
        });
        child.once('error', (e) => {
            log('Static Server Error: ' + e);
        });
    });
}

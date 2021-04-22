import { spawn } from 'child_process';
import { once } from 'events';

export async function runServer(dir: string, preferredPort = 3000, log = console.log) {
    log('Start Server');
    const args = [require.resolve('./isolated-server'), dir, preferredPort.toString()];
    const child = spawn('node', args, {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    });

    const [port] = (await once(child, 'message')) as [number];
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
    return { server, serverUrl };
}

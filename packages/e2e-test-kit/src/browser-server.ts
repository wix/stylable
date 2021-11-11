import { BrowserServer, chromium } from 'playwright-chromium';

let server: BrowserServer;

export const mochaGlobalSetup = async () => {
    server = await chromium.launchServer();
    process.env.PLAYWRIGHT_SERVER = server.wsEndpoint();
    console.log(`server running on ${process.env.PLAYWRIGHT_SERVER}`);
};

export const mochaGlobalTeardown = async () => {
    await server.close();
    console.log('server stopped!');
};

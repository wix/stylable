import { BrowserServer, chromium } from 'playwright-chromium';

export const mochaGlobalSetup = async function (this: { server: BrowserServer }) {
    this.server = await chromium.launchServer();
    process.env.PLAYWRIGHT_SERVER = this.server.wsEndpoint();
    console.log(`Browser server running on ${process.env.PLAYWRIGHT_SERVER}`);
};

export const mochaGlobalTeardown = async function (this: { server: BrowserServer }) {
    await this.server.close();
    console.log('Browser server stopped!');
};

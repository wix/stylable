import { expect } from 'chai';
import Sinon from 'sinon';
const delay = (time: number) => new Promise(res => setTimeout(res, time));

import { timedCache } from '../src/timed-cache';

describe.only('timed-cache', () => {

    it('should cache for specific time', async () => {
        const spy = Sinon.spy((...args: string[]) => args.join(';'));
        const cached = timedCache(spy, {
            createKey: (args: string[]) => args.join(';'),
            timeout: 100,
            useTimer: false
        });

        cached.get('1');
        cached.get('2');
        cached.get('3');
        
        cached.get('1');
        cached.get('2');
        cached.get('3');
        
        cached.get('1');
        cached.get('2');
        cached.get('3');

        expect(spy.callCount, 'calls').to.equal(3);
        expect(cached.cache.size, 'cache size').to.equal(3);
        await delay(101)

        
        cached.get('1');
        expect(cached.cache.size, 'cache size after clean up').to.equal(1);
        
    });

    it('should cache for specific time with timer auto clean', async () => {
        const spy = Sinon.spy((...args: string[]) => args.join(';'));
        const cached = timedCache(spy, {
            createKey: (args: string[]) => args.join(';'),
            timeout: 100,
            useTimer: true
        });

        cached.get('1');
        cached.get('2');
        cached.get('3');
        
        cached.get('1');
        cached.get('2');
        cached.get('3');
        
        cached.get('1');
        cached.get('2');
        cached.get('3');

        expect(spy.callCount, 'calls').to.equal(3);
        expect(cached.cache.size, 'cache size').to.equal(3);
        await delay(101)

        expect(cached.cache.size, 'cache size after clean up').to.equal(0);
        
    });

});

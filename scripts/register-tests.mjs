import { register } from 'node:module';

register('./test-hooks.mjs', { parentURL: import.meta.url });

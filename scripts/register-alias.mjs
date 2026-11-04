import { register } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

register(pathToFileURL(path.resolve('scripts/alias-hook.mjs')).href, pathToFileURL(path.resolve('./')));

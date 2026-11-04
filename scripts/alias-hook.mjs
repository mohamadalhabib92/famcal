import path from 'node:path';
import { pathToFileURL } from 'node:url';

const srcUrl = pathToFileURL(path.resolve('src') + path.sep).href;

async function withExtension(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (typeof specifier === 'string' && (specifier.startsWith('.') || specifier.startsWith('file:'))) {
      try {
        return await nextResolve(`${specifier}.ts`, context);
      } catch {
        try {
          return await nextResolve(`${specifier}.tsx`, context);
        } catch {
          throw error;
        }
      }
    }
    throw error;
  }
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const fileUrl = new URL(specifier.slice(2), srcUrl).href;
    return withExtension(fileUrl, context, nextResolve);
  }
  if (specifier.startsWith('.')) return withExtension(specifier, context, nextResolve);
  return nextResolve(specifier, context);
}

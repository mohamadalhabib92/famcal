export async function resolve(specifier, context, nextResolve) {
  const bare = specifier.startsWith('./') || specifier.startsWith('../');
  const file = specifier.split('/').pop() ?? '';
  if (bare && file && !file.includes('.')) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
}

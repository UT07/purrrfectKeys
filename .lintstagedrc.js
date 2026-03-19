module.exports = {
  '*.{ts,tsx}': [
    'eslint --fix',
    () => 'npx tsc --noEmit',
  ],
};

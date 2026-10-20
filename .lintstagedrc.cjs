module.exports = {
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write --ignore-unknown"],
  "*.{json,md,css,scss,svg}": ["prettier --write --ignore-unknown"],
};

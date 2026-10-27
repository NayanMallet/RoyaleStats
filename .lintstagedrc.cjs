// Runs on staged files before each commit (Husky pre-commit hook).
// The front has its own ESLint configuration, so its files are linted from front/.
const path = require('path');

const quote = (files) => files.map((f) => JSON.stringify(f)).join(' ');

module.exports = {
  '*.{ts,js,cjs,mjs,vue}': (files) => {
    const relative = files.map((f) => path.relative(process.cwd(), f));
    const front = relative.filter((f) => f.startsWith('front/'));
    const others = relative.filter((f) => !f.startsWith('front/'));
    const commands = [];
    if (others.length) commands.push(`eslint --fix --no-warn-ignored ${quote(others)}`);
    if (front.length) {
      const fromFront = front.map((f) => path.relative('front', f));
      commands.push(`pnpm --dir front exec eslint --fix ${quote(fromFront)}`);
    }
    commands.push(`prettier --write ${quote(relative)}`);
    return commands;
  },
  '*.{json,md,css,yml,yaml}': 'prettier --write',
};

const colors = require('./colors.js').default;
const spacing = require('./spacing.js').default;
const typography = require('./typography.js').default;

const theme = {
  colors,
  spacing,
  typography,
};

module.exports = { theme, colors, spacing, typography };
module.exports.default = theme;

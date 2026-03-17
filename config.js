const path = require('path');
const CONFIG = {
    inputDir: path.resolve(__dirname, 'input'),
    outputBaseDir: path.resolve(__dirname, 'output'),
    removeZeroByteFiles: true,
    maxFilenameLength: 250, // Windows max filename length
    invalidChars: /[<>:"|?*%,!&()]/g,
    replacementChar: '-',
  };

  module.exports = CONFIG;
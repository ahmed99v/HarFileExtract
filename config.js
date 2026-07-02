const path = require('path');
const CONFIG = {
    inputDir: path.resolve(__dirname, 'input'),
    outputBaseDir: path.resolve(__dirname, 'output'),
    removeZeroByteFiles: true,	//Remove the zero files 
    maxFilenameLength: 250, // Windows max filename length
    invalidChars: /[<>:"|?*%,!&()]/g,		//Invalid characters
    replacementChar: '-',
  };

  module.exports = CONFIG;
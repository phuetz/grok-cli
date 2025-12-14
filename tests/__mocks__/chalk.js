// Mock chalk for Jest - using object prototype chain
const methods = [
  'bold', 'italic', 'dim', 'underline', 'inverse', 'hidden', 'strikethrough',
  'visible', 'reset',
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'grey',
  'blackBright', 'redBright', 'greenBright', 'yellowBright', 'blueBright',
  'magentaBright', 'cyanBright', 'whiteBright',
  'bgBlack', 'bgRed', 'bgGreen', 'bgYellow', 'bgBlue', 'bgMagenta', 'bgCyan', 'bgWhite',
  'bgGray', 'bgGrey',
  'bgBlackBright', 'bgRedBright', 'bgGreenBright', 'bgYellowBright', 'bgBlueBright',
  'bgMagentaBright', 'bgCyanBright', 'bgWhiteBright',
];

function createChalk() {
  function chalk(str) {
    return String(str ?? '');
  }

  // Add all methods that return chalk itself for chaining
  methods.forEach(method => {
    Object.defineProperty(chalk, method, {
      get: () => createChalk(),
      configurable: true,
    });
  });

  // Add functions that return chalk
  chalk.rgb = () => createChalk();
  chalk.hex = () => createChalk();
  chalk.ansi256 = () => createChalk();
  chalk.bgRgb = () => createChalk();
  chalk.bgHex = () => createChalk();
  chalk.bgAnsi256 = () => createChalk();

  return chalk;
}

const chalk = createChalk();
module.exports = chalk;
module.exports.default = chalk;

const viper = require('../viperhtml');

viper.adoptable = true;

const render = viper.bind({});

console.log(render`<!DOCTYPE html>
<html>
  <head>
    <title>${'"text"'}</title>
  </head>
  <body class="${'name'}">${['"html"']}</body>
</html>`.toString());
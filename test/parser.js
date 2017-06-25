const viper = require('../viperhtml');

const render = viper.bind({});

console.log(render`<!DOCTYPE html>
<html>
  <head>
    <title> ${'"text"'} </title>
  </head>
  <body>${'"html"'}</body>
</html>`);
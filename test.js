const viperHTML = require('./index.js');

// the view
const pageLayout = (render, model) =>
render`<!doctype html>
<html>
  <head>${model.head}</head>
  <body>${model.body}</body>
</html>`;

// the viper async render
const asyncRender = viperHTML.async();

// dummy server for one view only
require('http')
  .createServer((req, res) => {
    res.writeHead( 200, {
      'Content-Type': 'text/html'
    });
    pageLayout(

      // res.write(chunk) while resolved
      asyncRender(chunk => res.write(chunk)),

      // basic model example with async content
      {
        head: Promise.resolve({html: '<title>right away</title>'}),
        body: new Promise(res => setTimeout(
          res, 1000, viperHTML.wire()`<div>later on</div>`
        ))
      }
    )
    .then(() => res.end())
    .catch(err => { console.error(err); res.end(); });
  })
  .listen(8000);
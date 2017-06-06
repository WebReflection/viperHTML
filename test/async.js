const viper = require('../viperhtml');

const render = viper.async();

const view = (render, i) => render`<!doctype html>
  <html>
    <head><title>Asynchronous Render</title></head>
    <body>
      <ol>${[
        new Promise(res => setTimeout(
          res, Math.random() * 1500, `<li>item ${++i}</li>`
        )),
        new Promise(res => setTimeout(
          res, Math.random() * 2000, `<li>item ${++i}</li>`
        )),
        new Promise(res => setTimeout(
          res, Math.random() * 2500, `<li>item ${++i}</li>`
        )),
        new Promise(res => setTimeout(
          res, Math.random() * 3000, `<li>item ${++i}</li>`
        )),
        new Promise(res => setTimeout(
          res, Math.random() * 3500, `<li>item ${++i}</li>`
        )),
        new Promise(res => setTimeout(
          res, Math.random() * 4000, `<li>item ${++i}</li>`
        ))
      ]}</ol>
    </body>
  </html>
`;

require('http').createServer((req, res) => {
  res.writeHead( 200, {'Content-Type': 'text/html'});
  view(
    render(chunk => res.write(chunk)),
    0
  )
  .then(() => res.end())
  .catch(err => { console.error(err); res.end(); });
}).listen(8080);

console.log('http://localhost:8080/');
# viperHTML [![Build Status](https://travis-ci.org/WebReflection/hyperHTML.svg?branch=master)](https://travis-ci.org/WebReflection/viperHTML) [![Coverage Status](https://coveralls.io/repos/github/WebReflection/viperHTML/badge.svg?branch=master)](https://coveralls.io/github/WebReflection/viperHTML?branch=master)

<img alt="viperHTML logo" src="https://webreflection.github.io/hyperHTML/logo/viperhtml.svg" width="116" height="81">

[hyperHTML](https://github.com/WebReflection/hyperHTML) lightness, ease, and performance, for both client and server.

- - -
Don't miss the [viperHTML](https://github.com/WebReflection/viperHTML) version of **Hacker News**

Live: https://viperhtml-164315.appspot.com/

Repo: https://github.com/WebReflection/viper-news
- - -

### Same API without DOM constrains
On browsers, `viperHTML` is simply a reference to [hyperHTML](https://medium.com/@WebReflection/hyperhtml-a-virtual-dom-alternative-279db455ee0e#.bgosolrh0),
which uses template strings to parse just in time, and only once, a template DOM tree, achieving best possible performance updating only what's needed and never the rest.

On server, and _document-less_ environments, `viperHTML` parses the template string once, decides what is an attribute, what is a callback, what is text and what is HTML, and any future call to the same render will only update parts of that string.

The result is a blazing fast template engine that makes templates and renders shareable between the client and the server.


### Automatically Sanitized HTML
Both attributes and text nodes are safely escaped on each call.
```js
var output = render => render`
  <!-- attributes and callbacks are safe -->
  <a
    href="${a.href}"
    onclick="${a.onclick}"
  >
    <!-- also text is always safe -->
    ${a.text}
    <!-- HTML goes in as it is -->
    <span>${a.html}</span>
  </a>
`;

var a = {
  text: 'Click "Me"',
  html: '<strong>"HTML" Me</strong>',
  href: 'https://github.com/WebReflection/viperHTML',
  onclick: (e) => e.preventDefault()
};

// associate the link to an object of info
// or simply use viperHTML.wire();
var link = viperHTML.bind(a);

console.log(output(link));
```

The resulting output will be the following one:
```html
  <!-- attributes and callbacks are safe -->
  <a
    href="https://github.com/WebReflection/viperHTML"
    onclick="return ((e) =&gt; e.preventDefault()).call(this, event)"
  >
    <!-- also text is always safe -->
    Click &quot;Me&quot;
    <!-- HTML goes in as it is -->
    <span><strong>"HTML" Me</strong></span>
  </a>
```


### The 2 + 1 hyperHTML Rules to Remember

  * attributes and callbacks must go in single or double quoted attributes, even booleans `<button disabled="${true}">`
  * if there is any chars different from `>` and `<` surrounding the text, it's text content, never HTML

As extra point on performance:

  * bound or wired objects are on average 2~10X faster to update and return the new content

Following a basic benchmark result to demonstrate one-off use case is also very fast anyway.

```sh
basic benchmark 
first call: upgrade + update: 0.554ms
second call: cached update: 0.137ms
a thousand of cached update calls: 30.167ms
a thousand of uncached upgrade + update calls: 39.001ms
```


### Usage Example
```js
const viperHTML = require('viperhtml');

function tick(render) {
  return render`
    <div>
      <h1>Hello, world!</h1>
      <h2>It is ${new Date().toLocaleTimeString()}.</h2>
    </div>
  `;
}

// for demo purpose only,
// stop showing tick result after 6 seconds
setTimeout(
  clearInterval,
  6000,
  setInterval(
    render => console.log(tick(render)),
    1000,
    // On a browser, you'll need to bind
    // the content to a generic DOM node.
    // On the server, you can directly use a wire()
    // which will produce an updated result each time
    // it'll be used through a template literal
    viperHTML.wire()
  )
);
```




### The Extra viperHTML Feature: Asynchronous Partial Output

Clients and servers inevitably have different needs,
and the ability to serve chunks on demand, instead of a whole page at once,
is once of these very important differences that wouldn't make much sense on the client side.

If your page content might arrive on demand and is asynchronous,
`viperHTML` offers an utility to both obtain performance boots,
and intercepts all chunks of layout, as soon as this is available.


#### viperHTML.async()

Similar to a wire, `viperHTML.async()` returns a callback that *must be invoked* right before the template string,
optionally passing a callback that will be invoked per each available chunk of text, as soon as this is resolved.

```js
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
        head: Promise.resolve('<title>right away</title>'),
        body: new Promise(res => setTimeout(
          res, 1000, '<div>later on</div>'
        ))
      }
    )
    .then(() => res.end())
    .catch(err => { console.error(err); res.end(); });
  })
  .listen(8000);
```


### Handy Patterns
Following a list of handy patterns to solve common issues.

#### HTML in template literals doesn't get highlighted
True that, but if you follow a simple `(render, model)` convetion,
you can just have templates as html files.
```html
<!-- template/tick.html -->
<div>
  <h1>Hello, ${model.name}!</h1>
  <h2>It is ${new Date().toLocaleTimeString()}.</h2>
</div>
```
At this point, you can generate as many views as you want through the following step
```sh
#!/usr/bin/env bash

mkdir -p view

for f in $(ls template); do
  echo 'module.exports = (render, model) => render`' > "view/${f:0:-4}js"
  cat template/$f >> "view/${f:0:-4}js"
  echo '`;' >> "view/${f:0:-4}js"
done
```

As result, the folder `view` will now contain a `tick.js` file as such:
```js
module.exports = (render, model) => render`
<!-- template/tick.html -->
<div>
  <h1>Hello, ${model.name}!</h1>
  <h2>It is ${new Date().toLocaleTimeString()}.</h2>
</div>
`;
```

You can now use each view as modules.
```js
const view = {
  tick: require('./view/tick')
};

// show the result in console
console.log(view.tick(
  viperHTML.wire(),
  {name: 'user'}
));
```

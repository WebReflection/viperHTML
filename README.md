# viperHTML [![Build Status](https://travis-ci.org/WebReflection/hyperHTML.svg?branch=master)](https://travis-ci.org/WebReflection/viperHTML) [![Coverage Status](https://coveralls.io/repos/github/WebReflection/viperHTML/badge.svg?branch=master)](https://coveralls.io/github/WebReflection/viperHTML?branch=master)

[hyperHTML](https://github.com/WebReflection/hyperHTML) lightness, ease, and performance, for both client and server.


### Same API without DOM constrains
On browsers, `viperHTML` is simply a reference to [hyperHTML](https://medium.com/@WebReflection/hyperhtml-a-virtual-dom-alternative-279db455ee0e#.bgosolrh0),
which uses template strings to parse just in time, and only once, a template DOM three, achieving best possible performance updating only what's needed and never the rest.

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

var test = require('tressa');
var viperHTML = require('../viperhtml.js');

test.async(function (done) {
  var a = {
    text: 'Click Me',
    html: '<strong>muhahahaha</strong>',
    href: 'https://github.com/WebReflection/viperHTML',
    onclick (e) {
      debugger;
    }
  };
  var link = viperHTML.bind(a);
  var rendered = link`
    <a href="${a.href}" onclick="${a.onclick}">
      ${a.text}
      <span>${a.html}</span>
    </a>
  `;
  done();
});

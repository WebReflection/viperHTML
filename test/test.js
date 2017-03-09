var tressa = require('tressa');
var viperHTML = require('../viperhtml.js');

tressa.title('viperHTML');

tressa.async(done => {
  var output = render => render`
    <a href="${a.href}" onclick="${a.onclick}">
      ${a.text}
      <span>${a.html}</span>${
        '<br>'
    }</a>
  `;
  var a = {
    text: 'Click "Me"',
    html: '<strong>"Risky" Me</strong>',
    href: 'https://github.com/WebReflection/viperHTML',
    onclick: (e) => e.preventDefault()
  };
  var link = viperHTML.bind(a);
  tressa.assert(output(link) === `
    <a href="https://github.com/WebReflection/viperHTML" onclick="return ((e) =&gt; e.preventDefault()).call(this, event)">
      Click &quot;Me&quot;
      <span><strong>"Risky" Me</strong></span><br></a>
  `, 'expected layout');
  tressa.assert(output(link) === output(link), 'cached template');
  done();
});

tressa.async(done => {
  function onclick() {}
  var html = viperHTML.bind({});
  var rendered = html`<button onclick="${onclick}" disabled="${true}">`;
  tressa.assert(
    '<button onclick="return (function onclick() {}).call(this, event)" disabled>' === rendered,
    'disabled="${true}" shows as disabled'
  );

  html = viperHTML.bind({});
  rendered = html`<button onclick="${onclick}" disabled="${false}">`;
  tressa.assert(
    '<button onclick="return (function onclick() {}).call(this, event)">' === rendered,
    'disabled="${false}" does not show'
  );
  done();
});

tressa.async(done => {
  var reference = {};
  var rendered = viperHTML.wire()`"hello wire"`;
  tressa.assert(
    '"hello wire"' === rendered,
    'wire works as expected'
  );
  tressa.assert(
    viperHTML.wire(reference) === viperHTML.wire(reference),
    'same reference, same wire'
  );
  tressa.assert(
    viperHTML.wire() !== viperHTML.wire(),
    'no reference, different wire'
  );
  tressa.assert(
    viperHTML.wire({}) !== viperHTML.wire({}),
    'different reference, different wire'
  );
  done();
});

tressa.async(done => {
  var info = {click(){}};
  var rendered = viperHTML.wire()`<button onclick="${info.click}">`;
  tressa.assert(
    `<button onclick="return (function click(){}).call(this, event)">` === rendered,
    'shortcut methods are normalized'
  );
  done();
});

tressa.async(done => {
  tressa.assert(
    viperHTML.wire()`>${'not "HTML"'}` === '>not &quot;HTML&quot;',
    '> escaped HTML'
  );
  tressa.assert(
    viperHTML.wire()`${'not "HTML"'}<` === 'not &quot;HTML&quot;<',
    'escaped HTML <'
  );
  tressa.assert(
    viperHTML.wire()`<a onclick=${'"'}>` === '<a onclick=&quot;>',
    'not a function'
  );
  tressa.assert(
    viperHTML.wire()`<a onclick="${'"'}>` === '<a onclick="&quot;>',
    'not a "function'
  );
  tressa.assert(
    viperHTML.wire()`<a onclick=${'"'}">` === '<a onclick=&quot;">',
    'not a function"'
  );
  tressa.assert(
    viperHTML.wire()`<a attr="${'"'}>` === '<a attr="&quot;>',
    'not an attribute'
  );
  done();
});

tressa.async(done => {
  var bound = viperHTML.bind({});
  tressa.assert(
    bound`a${1}b` !== bound`${'a'}2b`,
    'branching templates'
  );
  done();
});
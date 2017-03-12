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

tressa.async(done => {
  var rendered = viperHTML.wire()`
  <a
    href="${'viper.com'}"
    onclick="${e => e.preventDefault()}"
  >Click Me</a>
  `;
  tressa.assert(
    `
  <a
    href="viper.com"
    onclick="return (e =&gt; e.preventDefault()).call(this, event)"
  >Click Me</a>
  ` === rendered,
    'arrow event'
  );
  done();
});


tressa.async(done => {
  var rendered = viperHTML.wire()`
  <a
    href="${'viper.com'}"
    onclick="${null}"
  >Click Me</a>
  `;
  tressa.assert(
    `
  <a
    href="viper.com"
    onclick=""
  >Click Me</a>
  ` === rendered,
    'null event'
  );
  done();
});


tressa.async(done => {
  var chunks = [];

  var asyncWire = viperHTML.async();

  // an asyncWire is an intermediate function
  // that allows to specify a callback
  // which will receive all chunks as these
  // will be resolved.
  // An asyncWire always returns a Promise.all
  // that will resolve once all chunks will be available.
  (asyncWire(chunk => chunks.push(chunk))`
  <a
    href="${Promise.resolve('viper.com')}"
    onclick="${Promise.resolve(null)}"
  >Click Me</a>
  `).then(all => {

    tressa.assert(
    `
  <a
    href="viper.com"
    onclick=""
  >Click Me</a>
  ` === all.join(''),
    'callback resolved through promises'
  );

    tressa.assert(
      chunks.join('') === all.join(''),
      'all chunks notified'
    );

    (asyncWire()`
  <a
    href="${Promise.resolve('viper.com')}"
    onclick="${Promise.resolve(null)}"
  >Click Me</a>
  `).then(all => {

    tressa.assert(
    `
  <a
    href="viper.com"
    onclick=""
  >Click Me</a>
  ` === all.join(''),
    'no errors without callback'
  );

    done();
  });

  });

}).then(() => 
tressa.async(done => {
  var wire = viperHTML.wire();
  tressa.assert(
    wire`<p>${[1,2,3]}</p>` === '<p>123</p>',
    'array as HTML'
  );

  wire = viperHTML.async();
  wire()`<p>${Promise.all([1,Promise.resolve(2),3])}</p>`.then(all => {
    tressa.assert(all.join('') === '<p>123</p>', 'array as Promise.all');
  });

  wire = viperHTML.async();
  wire()`<p>${1}</p>`.then(all => {
    tressa.assert(all.join('') === '<p>1</p>', 'value to resolve');
  });

  wire = viperHTML.async();
  wire()`<p>${[
    new Promise(r => setTimeout(r, 10, 1)),
    Promise.resolve(2),
    3,
    [
      new Promise(r => setTimeout(r, 100, 4)),
      5,
      6
    ]
  ]}</p>`.then(all => {
    tressa.assert(all.join('') === '<p>123456</p>', 'nested weirdo values');
    done();
  });

})).then(() => tressa.async(done => {

  tressa.log('');
  tressa.log('## basic benchmark');

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
    href: '/viperHTML',
    onclick: (e) => e.preventDefault()
  };

  var link = viperHTML.bind(a);

  var benchName = 'first call: upgrade + update';
  console.time(benchName);
  out = output(link);
  console.timeEnd(benchName);

  benchName = 'second call: cached update';
  console.time(benchName);
  out = output(link);
  console.timeEnd(benchName);

  benchName = 'a thousand of cached update calls';
  console.time(benchName);
  for (var i = 0; i < 1000; i++) {
    out = output(link);
  }
  console.timeEnd(benchName);

  benchName = 'a thousand of uncached upgrade + update calls';
  console.time(benchName);
  for (var i = 0; i < 1000; i++) {
    out = output(viperHTML.wire());
  }
  console.timeEnd(benchName);

  done();
}));



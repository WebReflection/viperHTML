var tressa = require('tressa');
var viperHTML = require('../viperhtml.js');

Object.prototype.interfere = true;

tressa.title('viperHTML');

tressa.assert(viperHTML.wire()`` === '', 'empty template');
tressa.assert(
  viperHTML.wire()`<code> ${'text'} </code>` === '<code> text </code>',
  'code with text'
);
tressa.assert(viperHTML.wire()`<![CDATA[!]]>` === '<![CDATA[!]]>', 'CDATA');
tressa.assert(viperHTML.wire()`<?php ?>` === '<?php ?>', '<?processing ?>');
tressa.assert(viperHTML.wire()`<!-- comment -->` === '<!-- comment -->', '<!-- comment -->');

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
    tressa.assert(
    output(link) === `<a href="https://github.com/WebReflection/viperHTML" onclick="return ((e) =&gt; e.preventDefault()).call(this, event)">Click &quot;Me&quot;<span><strong>"Risky" Me</strong></span><br></a>`,
    'expected layout'
  );
  tressa.assert(output(link) === output(link), 'cached template');
  done();
});

tressa.async(done => {
  function onclick() {}
  var html = viperHTML.bind({});
  var rendered = html`<button onclick="${onclick}" disabled="${true}">`;
  tressa.assert(
    '<button onclick="return (function onclick() {}).call(this, event)" disabled></button>' === rendered,
    'disabled="${true}" shows as disabled'
  );

  html = viperHTML.bind({});
  rendered = html`<button onclick="${onclick}" disabled="${false}">`;
  tressa.assert(
    '<button onclick="return (function onclick() {}).call(this, event)"></button>' === rendered,
    'disabled="${false}" does not show'
  );

  html = viperHTML.bind({});
  rendered = html`<script defer src="${'viper.com'}"></script>`;
  tressa.assert(
    '<script defer src="viper.com"></script>' === rendered,
    'special attributes are preserved'
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
  var rendered = viperHTML.wire()`<button attr="value" onclick="${info.click}">`;
  tressa.assert(
    `<button attr="value" onclick="return (function click(){}).call(this, event)"></button>` === rendered,
    'shortcut methods are normalized'
  );
  done();
});


tressa.async(done => {
  var rendered = viperHTML.wire()`<p attr='"' class="${undefined}">${null}<p> ${undefined}`;
  tressa.assert(
    `<p attr='"' class="undefined"><p>undefined</p></p>` === rendered,
    'null and undefined do not throw'
  );
  done();
});

tressa.async(done => {
  tressa.assert(
    viperHTML.wire()`<br>${'"HTML"'}` === '<br>"HTML"',
    '> unescaped HTML'
  );
  tressa.assert(
    viperHTML.wire()`${'"HTML"'}<br>` === '"HTML"<br>',
    'unescaped HTML <'
  );
  tressa.assert(
    viperHTML.wire()`<a onclick='${'"'}'>` === '<a onclick="&quot;"></a>',
    'not a function'
  );
  tressa.assert(
    viperHTML.wire()`<a attr="${'"'}">` === '<a attr="&quot;"></a>',
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
    `<a href="viper.com" onclick="return (e =&gt; e.preventDefault()).call(this, event)">Click Me</a>` === rendered,
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
    `<a href="viper.com" onclick="">Click Me</a>` === rendered,
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
  `).then(() => {

    tressa.assert(
    `<a href="viper.com" onclick="">Click Me</a>` === chunks.join(''),
    'chunks resolved through promises'
  );


    (asyncWire()`
  <a
    href="${Promise.resolve('viper.com')}"
    onclick="${Promise.resolve(null)}"
  >Click Me</a>
  `).then(() => {
    done();
  });

  });

})
.then(() => 
tressa.async(done => {
  var subRef = [];
  var subAsync = viperHTML.async();
  var parentRef = [];
  var parentAsync = viperHTML.async();


  (parentAsync(parentRef.push.bind(parentRef))`<p>${[
    1,
    subAsync(subRef.push.bind(subRef))`<span>${[2, Promise.resolve(3), 4]}</span>`,
    5
  ]}</p>`).then(result => {
    tressa.assert(subRef.join('') === '<span>234</span>', 'sub chunks are correct');
    tressa.assert(parentRef.join('') === result.join(''), 'chunks are like the result');
    tressa.assert(result.join('') === '<p>1<span>234</span>5</p>', 'result is correct');
    done();
  });

}))
.then(() => 
tressa.async(done => {
  var ref = {};

  var wire = viperHTML.wire();
  tressa.assert(
    wire`<p>${[1,2,3]}</p>` === '<p>123</p>',
    'array as HTML'
  );

  wire = viperHTML.async(ref);

  tressa.assert(wire === viperHTML.async(ref), 'weakly referenced async wires');

  var all1 = [];
  wire(all1.push.bind(all1))`<p>${Promise.all([1,Promise.resolve(2),3])}</p>`.then(() => {
    tressa.assert(all1.join('') === '<p>123</p>', 'array as Promise.all');
  });

  var all2 = [];
  wire = viperHTML.async();
  wire(all2.push.bind(all2))`<p>${1}</p>`.then(all => {
    tressa.assert(all2.join('') === '<p>1</p>', 'value to resolve');
    tressa.assert(all2.join('') === all.join(''), 'final all is the same');
    done();
  });

}))
.then(() => tressa.async(done => {
  var all3 = [];
  wire = viperHTML.async();
  wire((chunk) => {
    tressa.log(`  #grey(${chunk})`);
    all3.push(chunk);
  })`<p>${[
    new Promise(r => setTimeout(r, 100, 1)),
    Promise.resolve(2),
    3,
    [
      new Promise(r => setTimeout(r, 300, 4)),
      new Promise(r => setTimeout(r, 500, 5)),
      Promise.all([6, 7])
    ],
    new Promise(r => setTimeout(r, 100, 8))
  ]}</p>`.then(all => {
    tressa.assert(all3.join('') === '<p>12345678</p>', 'nested weirdo values');
    tressa.assert(all3.join('') === all.join(''), 'all is the same');
    done();
  });
}))
.then(() => tressa.async(done => {
  tressa.log('## hyperHTML behaviors');

  tressa.assert(viperHTML.bind({})`${['<br>']}` === '<br>', 'empty templates');

  var ref = {};
  tressa.assert(
    viperHTML.wire(ref, ':1') === viperHTML.wire(ref, ':1') &&
    viperHTML.wire(ref, ':1') !== viperHTML.wire(ref, ':2') &&
    viperHTML.wire(ref, ':2') === viperHTML.wire(ref, ':2'),
    'wires now accept ids'
  );

  tressa.assert(
    viperHTML.wire(null, ':1') !== viperHTML.wire(null, ':2'),
    'wires could be null too'
  );

  done();
}))
.then(() => tressa.async(done => {
  tressa.log('## viperHTML.minify');
  tressa.assert(viperHTML.bind({})`
    <style>
    .test { color: #ff0000; }
    </style>
  ` === '<style>.test{color:red}</style>',
  'static CSS minified once');
  tressa.assert(viperHTML.bind({})`
    <script>
    /*! (c) */
    // test.js
    var globalVar;
    function funcName(firstLongName, anotherLongName) {
      var myVariable = firstLongName +  anotherLongName;
    }
    </script>
  ` === '<script>/*! (c) */\nfunction funcName(a,n){}var globalVar;</script>',
  'static JS minified once');
  tressa.assert(viperHTML.bind({})`
    <script>
    // same
    var globalVar =
    </script>
  ` === `<script>
    // same
    var globalVar =
    </script>`,
    'script errors are left unchanged'
  );
  done();
}))
.then(() => tressa.async(done => {

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

  benchName = 'a thousand of uncached update calls';
  console.time(benchName);
  for (var i = 0; i < 1000; i++) {
    out = output(viperHTML.wire());
  }
  console.timeEnd(benchName);

  done();
}));



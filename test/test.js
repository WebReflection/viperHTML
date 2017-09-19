var tressa = require('tressa');
var viperHTML = require('../viperhtml.js');

Object.prototype.interfere = true;

tressa.title('viperHTML');

tressa.assert(viperHTML.wire()`` == '', 'empty template');
tressa.assert(
  viperHTML.wire()`<code> ${'text'} </code>` == '<code> <!--\x01:1-->text<!--\x01:1--> </code>',
  'code with text'
);
tressa.assert(viperHTML.wire()`<![CDATA[!]]>` == '<![CDATA[!]]>', 'CDATA');
tressa.assert(viperHTML.wire()`<?php ?>` == '<?php ?>', '<?processing ?>');
tressa.assert(viperHTML.wire()`<!-- comment -->` == '<!-- comment -->', '<!-- comment -->');

tressa.async(done => {
  tressa.log('## explicit intents');
  tressa.assert(
    viperHTML.wire()`<p>${{text: '<b></b>'}}</p>` ==
    '<p><!--\x01:2-->&lt;b&gt;&lt;/b&gt;<!--\x01:2--></p>',
    'explicit text content'
  );
  tressa.assert(
    viperHTML.wire()`<p>${{any: ['<b></b>']}}</p>` ==
    '<p><!--\x01:4--><b></b><!--\x01:4--></p>',
    'explicit any content'
  );
  done();
});

tressa.async(done => {
  tressa.log('## defined transformer');
  viperHTML.define('eUC', encodeURIComponent);
  tressa.assert(/a=<!--\x01:6-->b%20c<!--\x01:6-->/.test(viperHTML.wire()`a=${{eUC: 'b c'}}`), 'expected virtual layout');
  tressa.assert(/<p><!--\x01:8-->b%20c<!--\x01:8--><\/p>/.test(viperHTML.wire()`<p>${{eUC: 'b c'}}</p>`), 'expected layout');
  tressa.assert(/<p><!--\x01:a--><!--\x01:a--><\/p>/.test(viperHTML.wire()`<p>${{asd: 'b c'}}</p>`), 'empty layout');
  done();
});

tressa.async(done => {
  tressa.log('## other tests');
  var output = render => render`
    <a href="${a.href}" onclick="${a.onclick}">
      ${a.text}
      <span>${{html:a.html}}</span>
      ${['<br>']}
      </a>
  `;
  var a = {
    text: 'Click "Me"',
    html: '<strong>"Risky" Me</strong>',
    href: 'https://github.com/WebReflection/viperHTML',
    onclick: (e) => e.preventDefault()
  };
  var link = viperHTML.bind(a);
  tressa.assert(
    output(link) == "\n    <a href=\"https://github.com/WebReflection/viperHTML\" onclick=\"return ((e) =&gt; e.preventDefault()).call(this, event)\">\n      <!--\u0001:b-->Click &quot;Me&quot;<!--\u0001:b-->\n      <span><!--\u0001:c--><strong>\"Risky\" Me</strong><!--\u0001:c--></span>\n      <!--\u0001:d--><br><!--\u0001:d-->\n      </a>\n  ",
    'expected layout'
  );
  // tressa.assert(output(link) == output(link).toString(), 'cached template');
  done();
});

tressa.async(done => {
  function onclick() {}
  var html = viperHTML.bind({});
  var rendered = html`<button onclick="${onclick}" disabled="${true}">`;
  tressa.assert(
    '<button onclick="return (function onclick() {}).call(this, event)" disabled></button>' == rendered,
    'disabled="${true}" shows as disabled'
  );

  html = viperHTML.bind({});
  rendered = html`<button onclick="${onclick}" disabled="${false}">`;
  tressa.assert(
    '<button onclick="return (function onclick() {}).call(this, event)"></button>' == rendered,
    'disabled="${false}" does not show'
  );

  html = viperHTML.bind({});
  rendered = html`<script defer src="${'viper.com'}"></script>`;
  tressa.assert(
    '<script defer src="viper.com"></script>' == rendered,
    'special attributes are preserved'
  );

  done();
});

tressa.async(done => {
  var reference = {};
  var rendered = viperHTML.wire()`"hello wire"`;
  tressa.assert(
    '"hello wire"' == rendered,
    'wire works as expected'
  );
  tressa.assert(
    viperHTML.wire(reference) == viperHTML.wire(reference),
    'same reference, same wire'
  );
  tressa.assert(
    viperHTML.wire() != viperHTML.wire(),
    'no reference, different wire'
  );
  tressa.assert(
    viperHTML.wire({}) != viperHTML.wire({}),
    'different reference, different wire'
  );
  done();
});

tressa.async(done => {
  var info = {click(){}};
  var rendered = viperHTML.wire()`<button attr="value" onclick="${info.click}">`;
  tressa.assert(
    `<button attr="value" onclick="return (function click(){}).call(this, event)"></button>` == rendered,
    'shortcut methods are normalized'
  );
  done();
});


tressa.async(done => {
  var rendered = viperHTML.wire()`<p attr='"' class="${undefined}">${null}<p> ${undefined}`;
  tressa.assert(
    `<p attr='"' class="undefined"><!--:e--><!--:e--><p> <!--:f--><!--:f--></p></p>` == rendered,
    'null and undefined do not throw'
  );
  done();
});

tressa.async(done => {
  tressa.assert(
    viperHTML.wire()`<br>${['"HTML"']}` == '<br><!--:g-->"HTML"<!--:g-->',
    '> unescaped HTML'
  );
  tressa.assert(
    viperHTML.wire()`${['"HTML"']}<br>` == '<!--:h-->"HTML"<!--:h--><br>',
    'unescaped HTML <'
  );
  tressa.assert(
    viperHTML.wire()`<a onclick='${'"'}'>` == '<a onclick="&quot;"></a>',
    'not a function'
  );
  tressa.assert(
    viperHTML.wire()`<a attr="${'"'}">` == '<a attr="&quot;"></a>',
    'not an attribute'
  );
  done();
});

tressa.async(done => {
  var bound = viperHTML.bind({});
  tressa.assert(
    bound`a${1}b` != String(bound`${'a'}2b`),
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
    `\n  <a href="viper.com" onclick="return (e =&gt; e.preventDefault()).call(this, event)">Click Me</a>\n  ` == rendered,
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
    `\n  <a href="viper.com" onclick="">Click Me</a>\n  ` == rendered,
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
    `\n  <a href="viper.com" onclick="">Click Me</a>\n  ` == chunks.join(''),
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
  tressa.log('## Async with placeholder');
  var calls = [];
  (viperHTML.async()(calls.push.bind(calls))`<p>${{
    placeholder: 'whatever',
    text: '123'
  }}</p>`).then(result => {
    tressa.assert(calls.join('') == '<p><!--:l-->123<!--:l--></p>', 'text sub chunks are correct');
    tressa.assert(calls.join('') == result.join(''), 'text stream is correct');
    calls = [];
    (viperHTML.async()(calls.push.bind(calls))`<p>${{
      placeholder: 'whatever',
      any: '<b></b>'
    }}</p>`).then(result => {
      tressa.assert(calls.join('') == '<p><!--:n-->&lt;b&gt;&lt;/b&gt;<!--:n--></p>', 'any sub chunks are correct');
      tressa.assert(calls.join('') == result.join(''), 'any stream is correct');
      calls = [];
      (viperHTML.async()(calls.push.bind(calls))`<p>${{
        placeholder: 'whatever',
        html: '<b></b>'
      }}</p>`).then(result => {
        tressa.assert(calls.join('') == '<p><!--:p--><b></b><!--:p--></p>', 'html sub chunks are correct');
        tressa.assert(calls.join('') == result.join(''), 'html stream is correct');
        calls = [];
        (viperHTML.async()(calls.push.bind(calls))`<p>${{
          placeholder: 'whatever',
          nope: '<b></b>'
        }}</p>`).then(result => {
          tressa.assert(calls.join('') == '<p><!--:r--><!--:r--></p>', 'other sub chunks are correct');
          tressa.assert(calls.join('') == result.join(''), 'other stream is correct');
          calls = [];
          done();
        });
      });
    });
  });
}))
.then(() => 
tressa.async(done => {
  tressa.log('## Just async');
  var subRef = [];
  var subAsync = viperHTML.async();
  var parentRef = [];
  var parentAsync = viperHTML.async();


  (parentAsync(parentRef.push.bind(parentRef))`<p>${[
    1,
    subAsync(subRef.push.bind(subRef))`<span>${[2, Promise.resolve(3), 4]}</span>`,
    5
  ]}</p>`).then(result => {
    tressa.assert(subRef.join('') == '<span><!--:s-->234<!--:s--></span>', 'sub chunks are correct');
    tressa.assert(parentRef.join('') == result.join(''), 'chunks are like the result');
    tressa.assert(result.join('') == '<p><!--:t-->1<span><!--:s-->234<!--:s--></span>5<!--:t--></p>', 'result is correct');
    done();
  });

}))
.then(() => 
tressa.async(done => {
  var ref = {};

  var wire = viperHTML.wire();
  tressa.assert(
    wire`<p>${[1,2,3]}</p>` == '<p><!--:u-->123<!--:u--></p>',
    'array as HTML'
  );

  wire = viperHTML.async(ref);

  tressa.assert(wire === viperHTML.async(ref), 'weakly referenced async wires');

  var all1 = [];
  wire(all1.push.bind(all1))`<p>${Promise.all([1,Promise.resolve(2),3])}</p>`.then(() => {
    tressa.assert(all1.join('') === '<p><!--:w-->123<!--:w--></p>', 'array as Promise.all');
  });

  var all2 = [];
  wire = viperHTML.async();
  wire(all2.push.bind(all2))`<p>${1}</p>`.then(all => {
    tressa.assert(all2.join('') === '<p><!--:v-->1<!--:v--></p>', 'value to resolve');
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
    tressa.assert(all3.join('') === '<p><!--:x-->12345678<!--:x--></p>', 'nested weirdo values');
    tressa.assert(all3.join('') === all.join(''), 'all is the same');
    done();
  });
}))
.then(() => tressa.async(done => {
  tressa.log('## hyperHTML behaviors');

  tressa.assert(viperHTML.bind({})`${['<br>']}` == '<!--:y--><br><!--:y-->', 'empty templates');

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
.then(function () {
  tressa.log('## viperHTML.escape(html)');
  tressa.assert(viperHTML.escape('<html>') === '&lt;html&gt;', 'escape as expected');
})
.then(function () {
  tressa.log('## preserved text');
  tressa.assert(viperHTML.wire()`<div> Hello, ${'World'} </div>` == '<div> Hello, <!--:z-->World<!--:z--> </div>', 'OK');
})
.then(function () {
  tressa.log('## attributes without quotes');
  tressa.assert(viperHTML.wire()`<div test=${123}></div>` == '<div test="123"></div>', 'OK');
})
.then(() => tressa.async(done => {
  tressa.log('## viperHTML.minify');
  tressa.assert(viperHTML.bind({})`
    <style>
    .test { color: #ff0000; }
    </style>
  ` == '\n    <style>.test{color:red}</style>\n  ',
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
  ` == '\n    <script>/*! (c) */\nfunction funcName(a,n){}var globalVar;</script>\n  ',
  'static JS minified once');
  tressa.assert(viperHTML.bind({})`
    <script>
    // same
    var globalVar =
    </script>
  ` == `\n    <script>
    // same
    var globalVar =
    </script>\n  `,
    'script errors are left unchanged'
  );
  done();
}))
.then(function () {
  tressa.log('## HTML and Promises');
  function document(render, model) {
    return render`<body>${model.body}</body>`;
  }
  tressa.assert(
    document(
      viperHTML.wire(),
      {
        body: viperHTML.wire()`<p>Hello</p>`
      }
    ) == '<body><!--:10--><p>Hello</p><!--:10--></body>',
    'wired content is always considered HTML'
  );
})
.then(() => tressa.async(done => {
  tressa.log('## asynchronous boolean attributes');
  var asyncWire = viperHTML.async();
  var out = [];
  asyncWire(out.push.bind(out))
  `<script async=${Promise.resolve(true)} defer=${Promise.resolve(false)}></script>`;
  setTimeout(() => {
    tressa.assert(
      /<script\s+async\s*><\/script>/.test(out.join('')),
      'boolean attributes are either in or out'
    );
    done();
  }, 200);
}))
.then(function () {
  tressa.log('## viper(...)');
  var viper = viperHTML.viper;
  tressa.assert(typeof viper() === 'function', 'empty viper() is a wire');
  tressa.assert((viper`abc`) == 'abc', 'viper`abc`');
  tressa.assert((viper`<p>a${2}c</p>`) == '<p>a<!--:11-->2<!--:11-->c</p>', 'viper`<p>a${2}c</p>`');
  tressa.assert((viper({})`abc`) == 'abc', 'viper({})`abc`');
  tressa.assert((viper({})`<p>a${'b'}c</p>`) == '<p>a<!--:12-->b<!--:12-->c</p>', 'viper({})`<p>a${\'b\'}c</p>`');
  tressa.assert((viper({}, ':id')`abc`) == 'abc', 'viper({}, \':id\')`abc`');
  tressa.assert((viper({}, ':id')`<p>a${'b'}c</p>`) == '<p>a<!--:13-->b<!--:13-->c</p>', 'viper({}, \':id\')`<p>a${\'b\'}c</p>`');
  tressa.assert((viper('svg')`<rect />`), 'viper("svg")`<rect />`');
})
.then(function () { 'use strict';
  tressa.log('## viper.Component');
  var viper = viperHTML.viper;
  class Button extends viper.Component {
    render() { return this.html`
      <button>hello</button>`;
    }
  }
  class Rect extends viper.Component {
    constructor(state) {
      super().setState(state);
    }
    render() { return this.svg`
      <rect x=${this.state.x} y=${this.state.y} />`;
    }
  }
  class Paragraph extends viper.Component {
    constructor(state) {
      super().setState(state);
    }
    onclick() { this.clicked = true; }
    render() { return this.html`
      <p attr=${this.state.attr} onclick=${this}>hello</p>`;
    }
  }
  var render = viper.bind({});
  var result = render`${[
    new Button,
    new Rect({x: 123, y: 456})
  ]}`;
  tressa.assert(
    /<button>hello<\/button>[\S\s]+<rect x="123" y="456"><\/rect>/.test(result),
    'content is the expected one'
  );
  var p = new Paragraph(() => ({attr: 'test'}));
  debugger;
  result = render`${p}`;
  tressa.assert(
    /<p attr="test" onclick="">hello<\/p>/.test(result),
    'single content is also OK'
  );
  // noop to invoke
  p.handleEvent();
})
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



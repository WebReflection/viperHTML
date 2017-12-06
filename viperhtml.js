'use strict';

/*! (C) 2017 Andrea Giammarchi @WebReflection (MIT) */

// friendly destructuring
viper.viper = viper;

// magic entry point for most operations (bind, wire)
function viper(HTML) {
  return arguments.length < 2 ?
    (HTML == null || typeof HTML === 'string' ?
      render.bind({}) :
      ('raw' in HTML ?
        render.bind({})(HTML) :
        wireWeakly(HTML, 'html'))) :
    ('raw' in HTML ?
      render.bind({}) : viper.wire
    ).apply(null, arguments);
}

// viperHTML \o/
//
// var render = viperHTML.bind(object);
// render`
//  <h1>⚡️ viperHTML ⚡️</h1>
//  <p>
//    ${(new Date).toLocaleString()}
//  </p>
// `;
function render(template) {
  var viper = vipers.get(this);
    if (
      !viper ||
      viper.template !== template
    ) {
      viper = upgrade.apply(this, arguments);
      vipers.set(this, viper);
    }
    return (this instanceof Async ? this.update : update)
            .apply(viper, arguments);
}

// A wire ➰ is a shortcut to relate a specific object,
// or a runtime created one, to a specific template.
//
// var render = viperHTML.wire();
// render`
//  <div>Hello Wired!</div>
// `;
viper.wire = function wire(obj, type) {
  return arguments.length < 1 || obj == null ?
    render.bind({}) :
    wireWeakly(obj, type || 'html');
};

// An asynchronous wire ➰ is a weakly referenced callback,
// to be invoked right before the template literals
// to return a rendered capable of resolving chunks.
viper.async = function getAsync(obj) {
  return arguments.length < 1 ?
    createAsync() :
    (asyncs.get(obj) || set(asyncs, obj, createAsync()));
};

// viper.Component([initialState]) 🍻
// An overly-simplified Component class.
class Component {
  handleEvent() { /* noop by default */ }
  get html() { return (this.html = render.bind(this)); }
  set html(value) { defineValue(this, 'html', value); }
  get svg() { return (this.svg = render.bind(this)); }
  set svg(value) { defineValue(this, 'svg', value); }
  get state() { return (this.state = this.defaultState); }
  set state(value) { defineValue(this, 'state', value); }
  get defaultState() { return {}; }
  setState(state) {
    var target = this.state;
    var source = typeof state === 'function' ? state.call(this, target) : state;
    for (var key in source) target[key] = source[key];
    this.render();
  }
  // the render must be defined when extending hyper.Component
  // the render **must** return either comp.html or comp.svg wire
  // render() { return this.html`<p>that's it</p>`; }
}
viper.Component = Component;

// - - - - - - - - - - - - - - - - - -  - - - - -

// -------------------------
// Helpers
// -------------------------

// used to force html output
function asHTML(html) {
  return {html: html};
}

// parse all comments at once and sanitize them
function comments($0, $1, $2, $3) {
  return $1 + $2.replace(FIND_ATTRIBUTES, sanitizeAttributes) + $3;
}

// instrument a wire to work asynchronously
// passing along an optional resolved chunks
// interceptor callback
function createAsync() {
  var
    wired = new Async,
    wire = render.bind(wired),
    chunksReceiver
  ;
  wired.update = function () {
    this.callback = chunksReceiver;
    return chunks.apply(this, arguments);
  };
  return function (callback) {
    chunksReceiver = callback || String;
    return wire;
  };
}

// set a configurable, non enumerable, non writable property
function defineValue(self, key, value) {
  Object.defineProperty(self, key, {configurable: true, value: value});
}

// splice 0 - length an array and join its content
function empty(array) {
  return array.splice(0, array.length).join('');
}

// ensure String value and escape it
function escape(s) {
  return htmlEscape(String(s));
}

// given a list of updates
// create a copy with the right update for HTML
function fixUpdates(updates) {
  for (var
    update,
    i = 0,
    length = updates.length,
    out = [];
    i < length; i++
  ) {
    update = updates[i];
    out.push(update === getUpdateForHTML ? update.call(this) : update);
  }
  return out;
}

// if an interpolated value is an Array
// return Promise or join by empty string
function getUpdateForHTML() {
  return this instanceof Async ? identity : asTemplateValue;
}

// pass along a generic value
function identity(value) {
  return value;
}

// use a placeholder and resolve with the right callback
function invokeAtDistance(value) {
  if ('text' in value) {
    return Promise.resolve(value.text).then(String).then(asTemplateValue);
  } else if ('any' in value) {
    return Promise.resolve(value.any).then(asTemplateValue);
  } else if ('html' in value) {
    return Promise.resolve(value.html).then(asHTML).then(asTemplateValue);
  } else {
    return Promise.resolve(invokeTransformer(value)).then(asTemplateValue);
  }
}

// last attempt to transform content
function invokeTransformer(object) {
  for (var key, i = 0, length = transformersKeys.length; i < length; i++) {
    key = transformersKeys[i];
    if (object.hasOwnProperty(key)) {
      // noop is passed to respect hyperHTML API but it won't have
      // any effect at distance for the time being
      return transformers[key](object[key], noop);
    }
  }
}

// literally
function noop() {}

// multiple content joined as single string
function asTemplateValue(value, isAttribute) {
  var presuf = isAttribute ? '' : createHyperComment();
  switch(typeof value) {
    case 'string': return presuf + escape(value) + presuf;
    case 'boolean':
    case 'number': return presuf + value + presuf;
    case 'object':
      if (value instanceof Buffer) return presuf + value + presuf;
      if (value instanceof Component) return asTemplateValue(value.render(), isAttribute);
    case 'undefined':
      if (value == null) return presuf + '' + presuf;
    default:
      if (isArray(value)) {
        for (var i = 0, length = value.length; i < length; i++) {
          if (value[i] instanceof Component) {
            value[i] = value[i].render();
          }
        }
        return presuf + value.join('') + presuf;
      }
      if ('placeholder' in value) return invokeAtDistance(value);
      if ('text' in value) return presuf + escape(value.text) + presuf;
      if ('any' in value) return asTemplateValue(value.any, isAttribute);
      if ('html' in value) return presuf + [].concat(value.html).join('') + presuf;
      return asTemplateValue(invokeTransformer(value), isAttribute);
  }
}

// sanitizes quotes around attributes
function sanitizeAttributes($0, $1, $2) {
  return $1 + ($2 || '"') + UID + ($2 || '"');
}

// weakly relate a generic object to a genric value
function set(map, object, value) {
  map.set(object, value);
  return value;
}

// join a template via unique comment
// look for comments in attributes and content
// define updates to be invoked for this template
// sanitize and clean the layout too
function transform(template) {
  var tagName = '';
  var isCDATA = false;
  var current = [];
  var chunks = [];
  var updates = [];
  var content = new Parser({
    onopentag: function (name, attributes) {
      tagName = name;
      current.push('<', name);
      for (var key in attributes) {
        if (attributes.hasOwnProperty(key)) {
          var value = attributes[key];
          var isPermutation = value === UID;
          var isSpecial = SPECIAL_ATTRIBUTE.test(key);
          var isEvent = isPermutation && ATTRIBUTE_EVENT.test(key);
          if (isPermutation) {
            if (isSpecial) {
              if (isEvent) {
                current.push(' ', key, '="');
                updates.push(updateEvent);
              } else {
                updates.push(updateBoolean(key));
              }
            } else {
              current.push(' ', key, '="');
              updates.push(updateAttribute);
            }
            chunks.push(empty(current));
            if (!isSpecial || isEvent) current.push('"');
          } else {
            if (isSpecial && value.length === 0) {
              current.push(' ', key);
            } else {
              var quote = value.indexOf('"') < 0 ? '"' : "'";
              current.push(' ', key, '=', quote, value, quote);
            }
          }
        }
      }
      current.push('>');
    },
    oncdatastart: function () {
      current.push('<![CDATA[');
      isCDATA = true;
    },
    oncdataend: function () {
      current.push(']]>');
      isCDATA = false;
    },
    onprocessinginstruction: function (name, data) {
      current.push('<', data, '>');
    },
    onclosetag: function (name) {
      if (!VOID_ELEMENT.test(name)) {
        current.push('</', name, '>');
      }
      tagName = '';
    },
    ontext: function (text) {
      var length = updates.length - 1;
      switch (true) {
        case isCDATA:
        case /^code|input|textarea|pre$/i.test(tagName):
          current.push(text);
          break;
        case /^script$/i.test(tagName):
          current.push(minifyJS(text));
          break;
        case /^style$/i.test(tagName):
          current.push(minifyCSS(text));
          break;
        default:
          current.push(adoptable ? text : text.trim());
          break;
      }
    },
    oncomment: function (data) {
      if (data === UID) {
        chunks.push(empty(current));
        updates.push(getUpdateForHTML);
      } else {
        current.push('<!--' + data + '-->');
      }
    },
    onend: function () {
      chunks.push(empty(current));
    }
  }, {
    decodeEntities: false,
    xmlMode: true
  });
  content.write(template.join(UIDC).replace(NO, comments));
  content.end();
  return {
    chunks: chunks,
    updates: updates
  };
}

// same as escape but specific for attributes
function updateAttribute(s) {
  return htmlEscape(String(s));
}

// return the right callback to update a boolean attribute
// after modifying the template to ignore such attribute if falsy
function updateBoolean(name) {
  name = ' ' + name;
  function update(value) {
    switch (value) {
      case true:
      case 'true':
        return name;
    }
    return '';
  }
  update[UID] = true;
  return update;
}

// return the right callback to invoke an event
// stringifying the callback and invoking it
// to simulate a proper DOM behavior
function updateEvent(value) {
  switch (typeof value) {
    case 'function': return 'return (' + escape(
      JS_SHORTCUT.test(value) && !JS_FUNCTION.test(value) ?
        ('function ' + value) :
        value
    ) + ').call(this, event)';
    case 'object': return '';
    default: return escape(value || '');
  }
}

// -------------------------
// Minifiers
// -------------------------

function minifyCSS() {
  return csso.minify.apply(csso, arguments).css;
}

function minifyJS(code, options) {
  var result = uglify.minify(code, Object.assign({
    // uglify-js defaults
    output: {comments: /^!/}
  }, options));
  return result.error ? code : result.code;
}

// -------------------------
// Template setup
// -------------------------

// resolves through promises and
// invoke a notifier per each resolved chunk
// the context will be a viper
function chunks() {
  for (var
    update,
    out = [],
    updates = this.updates,
    template = this.chunks,
    callback = this.callback,
    all = Promise.resolve(template[0]),
    chain = function (after) {
      return all.then(function (through) {
                  notify(through);
                  return after;
                });
    },
    getSubValue = function (value) {
      if (isArray(value)) {
        value.forEach(getSubValue);
      } else {
        all = chain(
          Promise.resolve(value)
                 .then(resolveArray)
        );
      }
    },
    getValue = function (value) {
      if (isArray(value)) {
        var hc = Promise.resolve(createHyperComment());
        all = chain(hc);
        value.forEach(getSubValue);
        all = chain(hc);
      } else {
        all = chain(
          Promise.resolve(value)
                 .then(resolveAsTemplateValue(update))
                 .then(update === asTemplateValue ? identity : update)
        );
      }
    },
    notify = function (chunk) {
      out.push(chunk);
      callback(chunk);
    },
    i = 1,
    length = arguments.length; i < length; i++
  ) {
    update = updates[i - 1];
    getValue(arguments[i]);
    all = chain(template[i]);
  }
  return all.then(notify).then(function () { return out; });
}

// tweaks asTemplateValue to think the value is an Array
// but without needing to add the suffix.
// Used to place an hyper comment after a group of values has been resolved
// instead of per each resolved value.
function resolveArray(value) {
  return asTemplateValue(isArray(value) ? value : [value], true);
}

// invokes at distance asTemplateValue
// passing the "isAttribute" flag
function resolveAsTemplateValue(update) {
  return function (value) {
    return asTemplateValue(
      value,
      update === updateAttribute ||
      update === updateEvent ||
      UID in update
    );
  };
}

// each known viperHTML update is
// kept as simple as possible.
// the context will be a viper
function update() {
  for (var
    updates = this.updates,
    template = this.chunks,
    i = 1,
    length = arguments.length,
    out = [template[0]];
    i < length; i++
  ) {
    out.push(updates[i - 1](arguments[i]), template[i]);
  }
  return Buffer.from(out.join(''));
}

// but the first time, it needs to be setup.
// From now on, only update(tempalte) will be called
// unless this context won't be used for other renderings.
function upgrade(template) {
  var info = templates.get(template) ||
      set(templates, template, transform(template));
  return {
    template: template,
    updates: fixUpdates.call(this, info.updates),
    chunks: info.chunks
  };
}

// -------------------------
// Wires
// -------------------------

function wireWeakly(obj, id) {
  var wire = wires.get(obj) || set(wires, obj, new Dict);
  return wire[id] || (wire[id] = render.bind({}));
}

function createHyperComment() {
  return adoptable ? ('<!--\x01:' + (++hyperComment).toString(36) + '-->') : '';
}

// -------------------------
// local variables
// -------------------------

var
  VOID_ELEMENT = /^area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr$/i,
  UID = '_viperHTML: ' + require('crypto').randomBytes(16).toString('hex') + ';',
  UIDC = '<!--' + UID + '-->',
  ATTRIBUTE_EVENT = /^on\S+$/,
  JS_SHORTCUT = /^[a-z$_]\S*?\(/,
  JS_FUNCTION = /^function\S*?\(/,
  SPECIAL_ATTRIBUTE = /^(?:(?:on|allow)[a-z]+|async|autofocus|autoplay|capture|checked|controls|default|defer|disabled|formnovalidate|hidden|ismap|itemscope|loop|multiple|muted|nomodule|novalidate|open|playsinline|readonly|required|reversed|selected|truespeed|typemustmatch|usecache)$/,
  NO = /(<[a-z]+[a-z0-9:_-]*)((?:[^\S]+[a-z0-9:_-]+(?:=(?:'.*?'|".*?"|<.+?>|\S+))?)+)([^\S]*\/?>)/gi,
  FIND_ATTRIBUTES = new RegExp('([^\\S][a-z]+[a-z0-9:_-]*=)([\'"]?)' + UIDC + '\\2', 'gi'),
  csso = require('csso'),
  uglify = require("uglify-js"),
  Parser = require('htmlparser2').Parser,
  htmlEscape = require('html-escaper').escape,
  templates = new Map(),
  asyncs = new WeakMap(),
  vipers = new WeakMap(),
  wires = new WeakMap(),
  isArray = Array.isArray,
  transformers = {},
  transformersKeys = [],
  hyperComment = 0,
  adoptable = false
;

// traps function bind once (useful in destructuring)
viper.bind = function bind(context) { return render.bind(context); };

viper.minify = {
  css: minifyCSS,
  js: minifyJS
};

viper.define = function define(transformer, callback) {
  if (!(transformer in transformers)) {
    transformersKeys.push(transformer);
  }
  transformers[transformer] = callback;
  // TODO: else throw ? console.warn ? who cares ?
};

Object.defineProperty(viper, 'adoptable', {
  get: function () {
    return adoptable;
  },
  set: function (value) {
    adoptable = !!value;
  }
});

module.exports = viper;

// local class to easily recognize async wires
function Async() {}

// local class to easily create wires
function Dict() {}
Dict.prototype = Object.create(null);

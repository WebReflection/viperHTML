'use strict';

/*! (C) 2017 Andrea Giammarchi @WebReflection (MIT) */

// viperHTML \o/
//
// var render = viperHTML.bind(object);
// render`
//  <h1>⚡️ viperHTML ⚡️</h1>
//  <p>
//    ${(new Date).toLocaleString()}
//  </p>
// `;
function viperHTML(template) {
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
viperHTML.wire = function wire(obj, type) {
  return arguments.length < 1 ?
      viperHTML.bind({}) :
      (obj == null ?
        viperHTML.bind({}) :
        wireWeakly(obj, type || 'html')
      );
};

// An asynchronous wire ➰ is a weakly referenced callback,
// to be invoked right before the template literals
// to return a rendered capable of resolving chunks.
viperHTML.async = function getAsync(obj) {
  return arguments.length < 1 ?
    createAsync() :
    (asyncs.get(obj) || set(asyncs, obj, createAsync()));
};

// reflection hyperHTML.escape API
viperHTML.escape = escape;

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
    wire = viperHTML.bind(wired),
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
    out = new Array(length);
    i < length; i++
  ) {
    update = updates[i];
    out[i] = update === getUpdateForHTML ?
              update.call(this) : update;
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
  for (var key in transformers) {
    if (object.hasOwnProperty(key)) {
      return transformers[key](object[key]);
    }
  }
}

// multiple content joined as single string
function asTemplateValue(value) {
  switch(typeof value) {
    case 'string':
    case 'number':
    case 'boolean': return escape(value);
    case 'object':
    case 'undefined':
      if (value == null) return '';
    default:
      if (isArray(value)) return value.join('');
      if ('placeholder' in value) return invokeAtDistance(value);
      if ('text' in value) return escape(value.text);
      if ('any' in value) return asTemplateValue(value.any);
      if ('html' in value) return [].concat(value.html).join('');
      return asTemplateValue(invokeTransformer(value));
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
              updates.push(escape);
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
        case /^pre|code$/i.test(tagName):
          current.push(text);
          break;
        case /^script$/i.test(tagName):
          current.push(minifyJS(text));
          break;
        case /^style$/i.test(tagName):
          current.push(minifyCSS(text));
          break;
        default:
          current.push(text);
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

// return the right callback to update a boolean attribute
// after modifying the template to ignore such attribute if falsy
function updateBoolean(name) {
  name = ' ' + name;
  return function (value) {
    return value ? name : '';
  };
}

// return the right callback to invoke an event
// stringifying the callback and invoking it
// to simulate a proper DOM behavior
function updateEvent(value) {
  var isFunction = typeof value === 'function';
  return isFunction ?
    ('return (' + escape(
      JS_SHORTCUT.test(value) && !JS_FUNCTION.test(value) ?
        ('function ' + value) :
        ('' + value)
    ) + ').call(this, event)') :
    escape(value || '');
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
    getValue = function (value) {
      if (isArray(value)) {
        value.forEach(getValue);
      } else {
        all = chain(
          Promise.resolve(value)
                 .then(asTemplateValue)
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
  return out.join('');
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
  return wire[id] || (wire[id] = viperHTML.bind({}));
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
  NO = new RegExp('(<[a-z]+[a-z0-9:_-]*)((?:[^\\S]+[a-z0-9:_-]+(?:=(?:\'.*?\'|".*?"|<.+?>|\\S+))?)+)([^\\S]*/?>)', 'g'),
  FIND_ATTRIBUTES = new RegExp('([^\\S][a-z]+[a-z0-9:_-]*=)([\'"]?)' + UIDC + '\\2', 'g'),
  csso = require('csso'),
  uglify = require("uglify-js"),
  Parser = require('htmlparser2').Parser,
  htmlEscape = require('html-escaper').escape,
  templates = new Map(),
  asyncs = new WeakMap(),
  vipers = new WeakMap(),
  wires = new WeakMap(),
  isArray = Array.isArray,
  bind = viperHTML.bind,
  transformers = {}
;

// traps function bind once (useful in destructuring)
viperHTML.bind = function () { return bind.apply(viperHTML, arguments); };

viperHTML.minify = {
  css: minifyCSS,
  js: minifyJS
};

viperHTML.define = function define(transformer, callback) {
  transformers[transformer] = callback;
};

module.exports = viperHTML;

// local class to easily recognize async wires
function Async() {}

// local class to easily create wires
function Dict() {}
Dict.prototype = Object.create(null);

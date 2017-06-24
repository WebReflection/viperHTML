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
    (asyncs.get(obj) || setWM(asyncs, obj, createAsync()));
};

// - - - - - - - - - - - - - - - - - -  - - - - -

// -------------------------
// DOM investigation
// -------------------------

// if a gap is in between a node declaration
// and its attribute definition this is true
function isAttribute(copies, i) {
  return ATTRIBUTE_BEFORE.test(copies.slice(0, i).join('')) &&
         ATTRIBUTE_AFTER.test(copies.slice(i).join(''));
}

// if a gap is in between html elements
// allow any sort of HTML content
function isHTML(statics, i) {
  var
    before = statics[i - 1],
    after = statics[i],
    length = before.length
  ;
  return  (length < 1 || before[length - 1] === '>') &&
          (after.length < 1 || after[0] === '<');
}

// -------------------------
// Helpers
// -------------------------

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

// given a template object
// retrieve the list of needed updates
// each time new interpolations are passed along
function createUpdates(template) {
  for (var
    updates = [],
    copies = template.slice(),
    i = 1,
    length = template.length;
    i < length; i++
  ) {
    updates[i - 1] = isHTML(template, i) ?
      getUpdateForHTML :
      (isAttribute(copies, i) ?
        getUpdateForAttribute(copies, i) :
        escape);
  }
  return {
    updates: updates,
    copies: copies
  };
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

// if a node is an attribute, return the right function
// accordingly if that's an escape or a callback
function getUpdateForAttribute(copies, i) {
  var name = copies[i - 1].replace(ATTRIBUTE_NAME, '$1');
  return SPECIAL_ATTRIBUTE.test(name) ?
    (ATTRIBUTE_EVENT.test(name) ?
      updateEvent() :
      updateBoolean(name, copies, i)) :
    escape;
}

// if an interpolated value is an Array
// return Promise or join by empty string
function getUpdateForHTML() {
  return this instanceof Async ? identity : joinIfArray;
}

// multiple content joined as single string
function joinIfArray(value) {
  return isArray(value) ? value.join('') : value;
}

function identity(value) {
  return value;
}

// weakly relate a generic object to a genric value
function setWM(wm, object, value) {
  wm.set(object, value);
  return value;
}

// return the right callback to update a boolean attribute
// after modifying the template to ignore such attribute if falsy
function updateBoolean(name, copies, i) {
  copies[i - 1] = copies[i - 1].slice(0, -(name.length + 3));
  copies[i] = copies[i].slice(1);
  name = ' ' + name;
  return function (value) {
    return value ? name : '';
  };
}

// return the right callback to invoke an event
// stringifying the callback and invoking it
// to simulate a proper DOM behavior
function updateEvent() {
  return function (value) {
    var isFunction = typeof value === 'function';
    return isFunction ?
      ('return (' + escape(
        JS_SHORTCUT.test(value) && !JS_FUNCTION.test(value) ?
          ('function ' + value) :
          ('' + value)
      ) + ').call(this, event)') :
      (value || '');
  };
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
    copies = this.copies,
    callback = this.callback,
    all = Promise.resolve(copies[0]),
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
                 .then(joinIfArray)
                 .then(update === joinIfArray ? identity : update)
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
    all = chain(copies[i]);
  }
  return all.then(notify).then(function () { return out; });
}

// each known viperHTML update is
// kept as simple as possible.
// the context will be a viper
function update() {
  for (var
    updates = this.updates,
    copies = this.copies,
    i = 1,
    length = arguments.length,
    out = [copies[0]];
    i < length; i++
  ) {
    out.push(updates[i - 1](arguments[i]), copies[i]);
  }
  return out.join('');
}

// but the first time, it needs to be setup.
// From now on, only update(tempalte) will be called
// unless this context won't be used for other renderings.
function upgrade(template) {
  var info = templates.get(template) ||
      setWM(templates, template, createUpdates(template));
  return {
    template: template,
    updates: fixUpdates.call(this, info.updates),
    copies: info.copies
  };
}

// -------------------------
// Wires
// -------------------------

function wireWeakly(obj, id) {
  var wire = wires.get(obj) || setWM(wires, obj, new Dict);
  return wire[id] || (wire[id] = viperHTML.bind({}));
}

// -------------------------
// local variables
// -------------------------

// hyperHTML might have document in the wild to feature detect IE
// viperHTML should not suffer browser feature detection
// this file is used only if no document is available
// so let's make it temporarily a thing

global.document = {};

var
  ATTRIBUTE_BEFORE = /<[a-z]\S*[^\S]+(?:[a-z-]+(?:=(?:(["'])[^\1]*?\1|[^"'\s]+))?[^\S]+)*?[a-z-]+=["']$/i,
  ATTRIBUTE_AFTER = /^"(?:[^\S]+[a-z-]+(?:=(?:(["'])[^\1]*?\1|[^"'\s]+))?)*?[^\S]*>/i,
  ATTRIBUTE_NAME = /^[\s\S]*?([a-z-]+)="$/i,
  ATTRIBUTE_EVENT = /^on[a-z]+$/,
  JS_SHORTCUT = /^[a-z$_]\S*?\(/,
  JS_FUNCTION = /^function\S*?\(/,
  SPECIAL_ATTRIBUTE = /^(?:(?:on|allow)[a-z]+|async|autofocus|autoplay|capture|checked|controls|default|defer|disabled|formnovalidate|hidden|ismap|itemscope|loop|multiple|muted|nomodule|novalidate|open|playsinline|readonly|required|reversed|selected|truespeed|typemustmatch|usecache)$/,
  htmlEscape = require('html-escaper').escape,
  templates = new Map(),
  asyncs = new WeakMap(),
  vipers = new WeakMap(),
  wires = new WeakMap(),
  escape = function (s) { return htmlEscape(String(s)); },
  isArray = Array.isArray
;

// let's cleanup this property now
delete global.document;

module.exports = viperHTML;

// local class to easily recognize async wires
function Async() {}

// local class to easily create wires
function Dict() {}
Dict.prototype = Object.create(null);

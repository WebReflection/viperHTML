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
function viperHTML(statics) {
  var viper = wm.get(this);
  return viper && viper.s === statics ?
    update.apply(viper, arguments) :
    upgrade.apply(this, arguments);
}

// A wire ➰ is a shortcut to relate a specific object,
// or a runtime created one, to a specific template.
//
// var render = viperHTML.wire();
// render`
//  <div>Hello Wired!</div>
// `;
viperHTML.wire = function wire(object) {
  return viperHTML.bind(arguments.length < 1 ? {} : object);
};

// - - - - - - - - - - - - - - - - - -  - - - - -

// -------------------------
// DOM investigation
// -------------------------

// if a gap is in between a node declaration
// and its attribute definition this is true
function isAttribute(statics, i) {
  var
    before = slice.call(statics, 0, i).join(''),
    after = slice.call(statics, i).join('')
  ;
  return ATTRIBUTE_BEFORE.test(before) && ATTRIBUTE_AFTER.test(after);
}

// if a gap is in between html elements
// allow any sort of HTML content
function isHTML(statics, i) {
  var
    before = i < 1 ? '' : statics[i - 1],
    after = statics[i]
  ;
  return before.slice(-1) === '>' && after[0] === '<';
}

// -------------------------
// Helpers
// -------------------------

// if a node is an attribute, return the right function
// accordingly if that's an escape or a callback
function getUpdateForAttribute(copies, i) {
  var name = copies[i - 1].replace(ATTRIBUTE_NAME, '$1');
  return SPECIAL_ATTRIBUTE.test(name) ?
    (ATTRIBUTE_EVENT.test(name) ?
      updateEvent(name) :
      updateBoolean(name, copies, i)) :
    escape;
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
// stringigying the callback and invoking it
// to simulate a proper DOM behavior
function updateEvent(name) {
  return function (value) {
    var inline = JS_SHORTCUT.test(value) ?
      ('function ' + value) :
      ('' + value);
    return 'return (' + escape(inline) + ').call(this, event)';
  };
}

// -------------------------
// Template setup
// -------------------------

// each known hyperHTML update is
// kept as simple as possible.
function update() {
  for (var
    c = this.c,
    u = this.u,
    out = [c[0]],
    i = 1,
    length = arguments.length;
    i < length; i++
  ) {
    out[i] = u[i - 1](arguments[i]) + c[i];
  }
  return out.join('');
}

// but the first time, it needs to be setup.
// From now on, only update(statics) will be called
// unless this context won't be used for other renderings.
function upgrade(statics) {
  for (var
    updates = [],
    copies = slice.call(statics),
    viper = {s: statics, u: updates, c: copies},
    i = 1,
    length = statics.length;
    i < length; i++
  ) {
    updates[i - 1] = isHTML(statics, i) ?
      String :
      (isAttribute(statics, i) ?
        getUpdateForAttribute(copies, i) :
        escape);
  }
  wm.set(this, viper);
  return update.apply(viper, arguments);
}

// -------------------------
// local variables
// -------------------------

var
  ATTRIBUTE_BEFORE = /<[a-z]\S*[^\S]+(?:[a-z-]+(?:=(?:["'][^"']*?["']|[^"'\s]+))?[^\S]+)*?[a-z-]+="$/i,
  ATTRIBUTE_AFTER = /^"(?:[^\S]+[a-z-]+(?:=(?:["'][^"']*?["']|[^"'\s]+))?)*?[^\S]*>/i,
  ATTRIBUTE_NAME = /^[\s\S]*?([a-z-]+)="$/i,
  ATTRIBUTE_EVENT = /^on[a-z]+$/,
  JS_SHORTCUT = /^[a-z$_]\S*?\(/,
  SPECIAL_ATTRIBUTE = /^(?:on[a-z]+|async|autofocus|autoplay|capture|checked|controls|deferred|disabled|formnovalidate|loop|multiple|muted|required)$/,
  // escape = require('html-escaper').escape,
  escape = String,
  wm = new WeakMap(),
  slice = [].slice
;

// umd.KISS
try { module.exports = viperHTML; } catch(o_O) {}

/*
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
document.body.innerHTML = rendered;
*/
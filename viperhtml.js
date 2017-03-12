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
  var viper = vipers.get(this);
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
  return arguments.length < 1 ?
    viperHTML.bind({}) :
    (wires.get(object) || (
      wires.set(object, wire()),
      wire(object)
    ));
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
  return statics[i - 1].slice(-1) === '>' &&
         statics[i][0] === '<';
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
// stringifying the callback and invoking it
// to simulate a proper DOM behavior
function updateEvent(name) {
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
    copies = updates.slice.call(statics),
    viper = {s: statics, u: updates, c: copies},
    i = 1,
    length = statics.length;
    i < length; i++
  ) {
    updates[i - 1] = isHTML(statics, i) ?
      String :
      (isAttribute(copies, i) ?
        getUpdateForAttribute(copies, i) :
        escape);
  }
  vipers.set(this, viper);
  return update.apply(viper, arguments);
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
  SPECIAL_ATTRIBUTE = require('hyperhtml').SPECIAL_ATTRIBUTE,
  escape = require('html-escaper').escape,
  vipers = new WeakMap(),
  wires = new WeakMap()
;

// let's cleanup this property now
delete global.document;

// just to mimic hyperHTML public statics
viperHTML.SPECIAL_ATTRIBUTE = SPECIAL_ATTRIBUTE;

module.exports = viperHTML;

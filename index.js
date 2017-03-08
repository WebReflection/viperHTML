/*! (C) 2017 Andrea Giammarchi @WebReflection (MIT) */
module.exports = typeof document === 'object' ?
  require('hyperhtml') :
  require('./viperhtml.js');
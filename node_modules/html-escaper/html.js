/*jslint indent: 2 */
var html = (function (O) {'use strict';
  // Andrea Giammarchi - MIT Style License
  var
    reEscape = /[&<>'"]/g,
    reUnescape = /&(?:amp|#38|lt|#60|gt|#62|apos|#39|quot|#34);/g,
    oEscape = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    },
    oUnescape = {
      '&amp;': '&',
      '&#38;': '&',
      '&lt;': '<',
      '&#60;': '<',
      '&gt;': '>',
      '&#62;': '>',
      '&apos;': "'",
      '&#39;': "'",
      '&quot;': '"',
      '&#34;': '"'
    },
    fnEscape = function (m) {
      return oEscape[m];
    },
    fnUnescape = function (m) {
      return oUnescape[m];
    },
    replace = ''.replace;
  return (O.freeze || O)({
    escape: function escape(s) {
      return replace.call(s, reEscape, fnEscape);
    },
    unescape: function unescape(s) {
      return replace.call(s, reUnescape, fnUnescape);
    }
  });
  }(Object));

try { module.exports = html; } catch (ignore) {}
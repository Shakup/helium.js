/*
 * lea.evolution.js - version 0.0.1 - 2015-08-21
 * An elegant lea.js plugin to build rich Web applications
 * Author: Sébastien Decamme <sebastien.decamme@gmail.com>
 * Homepage: https://github.com/Shakup/lea.evolution.js
 */
!function(a){"function"==typeof define&&define.amd?define(["lea"],a):"object"==typeof exports?module.exports=a(require("lea")):a(Lea)}(function(a){a.getUrlParameters=function(a){var b,c=/([^&=]+)=?([^&]*)/g,d={},e=window.location.search||window.location.hash;for(e=e.substring(e.indexOf("?")+1,e.length);b=c.exec(e);)d[decodeURIComponent(b[1])]=decodeURIComponent(b[2]);return void 0!=a?d[a]||null:d}});
//# sourceMappingURL=lea.evolution.js.map
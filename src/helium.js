(function (factory) {

	if (typeof define === "function" && define.amd) {
		define(["lea"], factory);
	} else if (typeof exports === "object") {
		module.exports = factory(require("lea"));
	} else {
		factory(Lea);
	}
	
})(function ($) {

	

});
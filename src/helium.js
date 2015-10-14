(function (factory) {

	if ( typeof define === "function" && define.amd ) {
		define( "helium", ["lea"], function(Lea) { return factory(Lea); } );
	} else {
		factory(Lea);
	}

})(function ($) {

	"use strict";

	include "template.js"

	include "router.js"
	
	include "data.js"

	var StopIteration = new Error("StopIteration");

	function Helium () {
		this.version = "{{version}}";
		this.debug   = false;
	}

	Helium.prototype.log = function (message, type) {
		if (type === undefined) {
			type = "log";
		}

		if (this.debug === true) {
			console[type](message);
		}
	}

	Helium.prototype.router   = new Router;
	Helium.prototype.template = new Template;
	Helium.prototype.data     = new Data;

	Helium.prototype.run = function () {

		$.addMethod("render", function (template) {
			this.each(function (element) {
				
				$(element).find("[he-bind]").each(function () {
					var id = $(this).attr('he-bind');
					He.data.unbind(id);
				});

				$(element).html( He.template.compile(template) );
				He.template.applyTags(element);

				$(element).find("[he-bind]").each(function (element) {
					He.data.applyBind( $(this).attr("he-bind") );
				});
			});

			return this;
		});

		this.router.run();
		this.template.run();

		console.info("Fueled by Helium v" + this.version);
	}

	var He = window.He = new Helium;

	return He;

});
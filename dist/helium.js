/*
 * helium.js - version 0.0.1 - 2015-10-11
 * An elegant framework to build rich applications
 * Author: Sébastien Decamme <sebastien.decamme@gmail.com>
 * Homepage: https://github.com/Shakup/helium.js
 */

(function (factory) {

	if ( typeof define === "function" && define.amd ) {
		define( "helium", ["lea"], function(Lea) { return factory(Lea); } );
	} else {
		factory(Lea);
	}

})(function ($) {

	"use strict";

	/* ==========================================================================
	   Template Object
	   ========================================================================== */

	function Template () {
		this.baseDir     = "/";
		this._loaderXHR  = null;
		this._errorLoad  = function () {};
		this._afterLoad  = function () {};
		this._beforeLoad = function () {};
	}

	Template.prototype.errorLoad = function (fnc) {
		this._errorLoad = fnc;
		return this;
	}

	Template.prototype.beforeLoad = function (fnc) {
		this._beforeLoad = fnc;
		return this;
	}

	Template.prototype.afterLoad = function (fnc) {
		this._afterLoad = fnc;
		return this;
	}

	Template.prototype._extractCondition = function (value) {
		var 
			reg    = /(\@[^\=\s]+)(\=([^:]+)\?([^:]+)(\:(.+))?)?/,
			output = {ref: null, compare: null, then: null, else: null},
			match;

		if ( (match = reg.exec(value)) && match.length > 1 ) {
			
			match = this._cleanMatch(match);
			
			output.ref = match[1];

			if (match.length > 2) {
				output.compare = match[3];
				output.then    = match[4];
				output.else    = match[6] || null;
			};

			return output;

		} else return null;
	}

	Template.prototype._retrieve = function (data) {
		if ( $.type(data) !== "string") return data;

		var prefix = data.substr(0, 1);
		
		return prefix == "@" ? He.data.get( data.substr(1) ) : data;
	}

	Template.prototype._cleanMatch = function (arr) {
		return arr.filter(function(item) {
			return $.type(item) !== "undefined";
		});
	}

	Template.prototype._bindHtml = function (value) {
		var
			self = this,
			fnc, data, condition, bindId;

		condition = this._extractCondition(value);

		if (!condition) return "";

		if (condition.compare) {
			fnc = function (data, value, id, options) {
				value           = self._retrieve(value);
				options.compare = self._retrieve(options.compare);
				options.then    = self._retrieve(options.then);
				options.else    = self._retrieve(options.else);

				var html = value == options.compare ? options.then : (options.else ? options.else : "");

				$("[he-bind=\"" + id + "\"]").html(html);
			}
		} else {
			fnc = function (data, value, id, options) {
				var html = self._retrieve(value);
				$("[he-bind=\"" + id + "\"]").html(html);
			}
		}

		data   = condition.ref.substr(1);
		bindId = He.data.bind(data, fnc, condition);

		return "he-bind=\"" + bindId + "\"";
	}

	Template.prototype._bindAttr = function (attr, value) {
		var 
			self = this,
			fnc, data, condition, attrValue, bindId;

		condition = this._extractCondition(value);

		if (!condition) return "";

		data = condition.ref.substr(1);

		if (condition.compare) {
			var attrValue = self._retrieve(data) == condition.compare ? condition.then : (condition.else ? condition.else : "");

			fnc = function (data, value, id, options) {
				value           = self._retrieve(value);
				options.compare = self._retrieve(options.compare);
				options.then    = self._retrieve(options.then);
				options.else    = self._retrieve(options.else);

				var attrValue = value == options.compare ? options.then : (options.else ? options.else : "");

				$("[he-bind=\"" + id + "\"]").attr(options.attr, attrValue);
			}
		} else {
			var attrValue = self._retrieve(data);

			fnc = function (data, value, id, options) {
				var attrValue = self._retrieve(value);
				$("[he-bind=\"" + id + "\"]").attr(options.attr, attrValue);
			}
		}

		condition.attr = attr;
		bindId         = He.data.bind(data, fnc, condition);

		return attr + "=\"" + attrValue + "\" he-bind=\"" + bindId + "\"";
	}

	Template.prototype.compile = function (template, data) {
		if (data == null) {
			data = {};
		};

		template = this.compileSingle(template);
		template = this.compileBind(template);
		template = this.compileLink(template);
		template = this.compileEach(template);

		return template;
	}

	Template.prototype.compileEach = function (template) {
		var 
			reg = /{{\s*each\s+(@[\w\-_]+)\s+as\s+([\w\-_]+)\s*}}([\s\S]*){{\/each}}/g,
			match, data, alias, tpl, subTpl, coll,
			subReg, subMatch, subData,
			tplComp, exp, expVal;

		while (match = reg.exec(template)) {
			tplComp = "";
			data    = match[1].substr(1);
			alias   = match[2];
			tpl     = match[3];
			coll    = He.data.get(data),
			subReg  = new RegExp( "{{\\s*(" + alias + "[^{\\s]*)\\s*}}", "g" );

			if ( $.type(coll) !== "array" ) {
				template = template.replace( match[0], "" );
				continue;
			}

			coll.forEach(function (item) {

				subTpl = tpl;
				
				while ( (subMatch = subReg.exec(tpl)) !== null ) {

					exp    = subMatch[1].replace( new RegExp("^(" + alias + ")", "g"), "item" );
					expVal = eval(exp) || null;
					
					if (expVal !== null) {
						subTpl = subTpl.replace( subMatch[0], eval(exp) );
					} else {
						subTpl = subTpl.replace( subMatch[0], "" );
						He.log("[TEMPLATE] " + subMatch[0].replace(/[{|}|\s]/g, "") + " is not a valid data", "error");
					}

				}

				tplComp += subTpl;

			});

			template = template.replace( match[0], tplComp );
		}

		return template;
	}

	Template.prototype.compileBind = function (template) {
		var
			regHtml = /{{bind\-html\s+(\@.+)?}}/g,
			regAttr = /{{bind\-attr\s+([^\=\:\@]+)\=["'](.+)['"]}}/g,
			match;	

		while (match = regHtml.exec(template)) {
			template = template.replace( match[0], this._bindHtml(match[1]) );
		}

		while (match = regAttr.exec(template)) {
			template = template.replace( match[0], this._bindAttr(match[1], match[2]) );
		}

		return template;
	}

	Template.prototype.compileSingle = function (template) {
		var
			self = this,
			reg  = /{{\s*(\@.+)\s*}}/g,
			match, condition, bindId, fnc, data, html;

		while ( match = reg.exec(template) ) {
			condition = this._extractCondition(match[1]);

			condition.ref     = self._retrieve(condition.ref);
			condition.compare = self._retrieve(condition.compare);
			condition.then    = self._retrieve(condition.then);
			condition.else    = self._retrieve(condition.else);

			if (condition.compare) {
				html = condition.ref == condition.compare ? condition.then : (condition.else ? condition.else : "");
			} else {
				html = condition.ref;
			}

			template = template.replace( match[0], html );
		}

		return template;
	}

	Template.prototype.compileLink = function (template) {
		var
			reg = /{{link\s*(.+?)}}((.+?)({{\/link}}))?/g,
			match, parts, route;

		function generateLink (route, inner, attributes) {
			var anchor, name;

			if (inner == null) {
				inner = "";
			}

			if (attributes == null) {
				attributes = {};
			}

			anchor = "<a href=\"" + He.router.getUrl(route) + "\" he-link=\"" + route + "\"";

			for (name in attributes) {
				anchor += " " + name + "=\"" + attributes[name] + "\"";
			}

			anchor += ">" + inner + "</a>";

			return anchor;
		}

		function extractAttributes (str) {
			var
				regAttr  = /(\S+)=["']?((?:.(?!["']?\s+(?:\S+)=|[>"']))+.)["']?/g,
				strParts = parts.join(" "),
				attr     = {},
				attrMatch;

			while (attrMatch = regAttr.exec(strParts)) {
				attr[attrMatch[1]] = attrMatch[2];
			}

			return attr;
		}

		while (match = reg.exec(template)) {

			parts = match[1].trim().split(" ");
			route = parts.shift();

			if (match.length === 1) {
				template = template.replace( match[0], generateLink(route) );
			} else {
				template = template.replace( match[0], generateLink(route, match[3], extractAttributes(parts.join(" "))) );
			}
		}

		return template;
	}

	Template.prototype.applyTags = function (container) {
		var self = this;

		$(container).find("[he-link]").click(function (event) {
			event.preventDefault();
			He.router.goTo( $(this).attr("he-link") );
		});
	}

	Template.prototype.load = function (template, cache) {
		var self = this;

		if (cache == undefined) {
			cache = false;
		}

		function Loader (template) {
			var
				_self = this,
				store;

			if ( self._loaderXHR !== null ) {
				self._loaderXHR.abort();
			}

			function genStoreKey(str) {
				return str.replace(/[\._]*/g, "-");
			}

			this._success = function () {};
			this._error   = function () {};

			if ( cache == true && ("localStorage" in window) ) {

				store = localStorage.getItem( genStoreKey(template) );

				if (store) {
					self._afterLoad(store);
					this._success(store);
					return this;
				}

			} else {
				cache = false;
			}

			self._loaderXHR = $.get( self.baseDir + template )
				.success(function (response) {

					if (cache == true) {
						localStorage.setItem( genStoreKey(template), response );
					}

					self._afterLoad(response);
					_self._success(response);
				})
				.error(function () {
					self._errorLoad();
					_self._error();
				});

			return this;
		}

		Loader.prototype.success = function (fnc) {
			this._success = fnc;
			return this;
		}

		Loader.prototype.error = function (fnc) {
			this._error = fnc;
			return this;
		}

		this._beforeLoad();

		return new Loader(template);
	}

	Template.prototype.run = function () {
		var self = this;

		$("[he-template]").each(function () {
			var $container = $(this);

			var $c = $("#" + $container.attr("he-template") );

			$container.html( self.compile( $("#" + $container.attr("he-template")).text() ) );
			
			self.applyTags(this);
		});
	}

	/* ==========================================================================
	   Router Object
	   ========================================================================== */

	function Router () {
		this.routes        = {};
		this.mode          = "hash";
		this.basePath      = "/";
		this._404          = function () {};
		this._before       = function () {};
		this._after        = function () {};
		this._currentRoute = null;
	}

	Router.prototype._stripSlashes  = function (path) {
		return path.toString().replace(/\/$/, "").replace(/^\//, "");
	}

	Router.prototype.before = function (cb) {
		if ( $.type(cb) == "function" ) {
			this._before = cb;
		}

		return this;
	}

	Router.prototype.after = function (cb) {
		if ( $.type(cb) == "function" ) {
			this._after = cb;
		}

		return this;
	}

	Router.prototype.currentPath = function () {
		var part = "", path;
		
		if (this.mode === "history") {
			part = this._stripSlashes( decodeURI( location.pathname + location.search ) );
			part = part.replace(/\?(.*)$/, "");
			part = this.basePath !== "/" ? part.replace(this.basePath, "") : part;
		} else {
			part = location.hash ? location.hash.replace("#", "") : "";
		}

		return this._stripSlashes(part);
	}

	Router.prototype.currentRoute = function () {
		return this._currentRoute;
	}

	Router.prototype.exists = function (name) {
		return name in this.routes;
	}

	Router.prototype.register = function (name, path, action) {
		if ( this.exists(name) ) {
			He.log("[ROUTES] \"" + name + "\" already exists", "error");
			return false;
		};

		this.routes[name] = {
			path: this.path === "/" ? "/" : this._stripSlashes(path),
			action: action
		}

		return this;
	}

	Router.prototype.register404 = function (cb) {
		if ($.type(cb) == "function") {
			this._404 = cb;
		};

		return this;
	}

	Router.prototype.goTo = function (name, data) {
		if ( !this.exists(name) ) {
			He.log("[ROUTES] \"" + name + "\" does not exists", "error");
			return false;
		};

		if ( this._before(name) === false ) {
			He.log("[ROUTES] \"" + name + "\" cancelled", "warn");
			return this;
		};

		He.log("[ROUTES] Go to \"" + name + "\"");

		if (this.mode === "history") {
			history.pushState({name: name}, name, this.getUrl(name));
			this.execute(name, data || {});
		} else {
	        location.hash = "#/" + (this.routes[name].path === "" ? "" : this.routes[name].path + "/");
		}

		return this;
	}

	Router.prototype.getUrl = function (name) {
		if ( !this.exists(name) ) {
			He.log("[ROUTES] \"" + name + "\" does not exists", "error");
			return false;
		};

		var url = location.protocol + "//" + location.host;
		
		url += location.port ? ":" + location.port : "";
		url += ( this.basePath === "/" ? "" : "/" + this._stripSlashes(this.basePath) );

		if (this.mode === "history") {
			url += "/";
		} else {
			url += "/#/";
		}

		url += this.routes[name].path === "" ? "" : this.routes[name].path + "/";

		return url;
	}

	Router.prototype.execute = function (name, data) {
		if ( !this.exists(name) ) {
			He.log("[ROUTES] \"" + name + "\" does not exists", "error");
			return false;
		}

		if ( this._before(name) === false ) {
			He.log("[ROUTES] \"" + name + "\" cancelled", "warn");
			return this;
		};

		He.log("[ROUTES] Execute \"" + name + "\"");
		
		if ($.type(this.routes[name].action) == "function") {
			this.routes[name].action.call(null, this.routes[name], data || {});
		};

		He.data.set("route", name);

		this._currentRoute = name;

		this._after(name);

		return this;
	}

	Router.prototype.getNameByPath = function(path) {
		var route, name;

		for (name in this.routes) {
			route = this.routes[name];
			if (route.path === path) {
				return name;
			}
		}
		
		return null;
	}

	Router.prototype._onHashChange = function () {
		if (!location.hash) {
			location.hash = "#/";
		}

		var routeName = this.getNameByPath( this.currentPath() );
		
		if (routeName !== null && this._before(routeName) !== false) {
			this.execute( routeName );
		} else {
			this._trigger404();
		}
	}

	Router.prototype._onPopState = function (event) {
		if ( event.state !== null && ("name" in event.state) && this._before(event.state.name) !== false ) {
			this.execute(event.state.name);
		} else if ( !event.state && this.currentPath() === "" && this.exists("index") && this._before("index") !== false ) {
			this.execute("index");
		} else {
			this._trigger404();
		}
	}

	Router.prototype._trigger404 = function () {
		He.data.set('route', null);
		this._404();
	}

	Router.prototype.run = function () {
		var self = this, name;

		this.basePath = this.basePath !== "/" ? this._stripSlashes(this.basePath) + "/" : this.basePath;
		this.baseUrl  = location.protocol + "//" + location.host + "/" + (this.basePath !== "/" ? this.basePath + "/" : this.basePath);

		He.data.set("basePath", this.basePath);
		He.data.set("baseUrl", this.baseUrl);

		if (this.mode === "history") {

			window.onpopstate = this._onPopState.bind(this);

			name = this.getNameByPath( this.currentPath() );
		
			if (name !== null && this._before(name) !== false) {
				this.execute(name);
			} else {
				this._trigger404();
			}

		} else {

			window.addEventListener('hashchange', this._onHashChange.bind(this), false);
			this._onHashChange();

		}

		return this;
	}
	
	/* ==========================================================================
	   Data Object
	   ========================================================================== */

	function Data () {
		this._data    = {};
		this._incr    = 0;
		this._fnc     = {};
		this._actions = {};
		this._options = {};

		Object.observe(this._data, this._onChange.bind(this));
	}

	Data.prototype._onChange = function (datas) {
		var self = this;

		datas.forEach(function (data) {
			if ( data.name in self._actions ) {
				self._actions[data.name].forEach(function (id) {
					self._fnc[id]( data.name, data.object[data.name], id, self._options[id] );
				});
			};
		});
	}

	Data.prototype.set = function (data, value) {
		this._data[data] = value;

		return this;
	}

	Data.prototype.get = function (data) {
		if ( data in this._data ) {
			return this._data[data];
		}

		return null;
	}

	Data.prototype.exists = function (data) {
		return data in this._data;
	}

	Data.prototype.bind = function (data, fnc, options) {
		var incr;

		incr = this._incr++;

		if ( !this._actions[data] ) {
			this._actions[data] = [];
		}

		this._actions[data].push(incr);

		this._fnc[incr]     = fnc;
		this._options[incr] = options || {};

		return incr;
	}

	Data.prototype.unbind = function (id) {
		var key, index;

		id = parseInt(id);

		for (key in this._actions) {
			index = this._actions[key].indexOf(id);

			if (index > -1) {
				this._actions[key].splice(index, 1);
			}
		}

		if (this._fnc[id]) delete this._fnc[id];
		if (this._options[id]) delete this._options[id];
	}

	Data.prototype.applyBind = function (id) {
		var key, index;

		id = parseInt(id);

		for (key in this._actions) {
			index = this._actions[key].indexOf(id);

			if (index > -1) {
				this._fnc[id]( key, this.get(key), id, this._options[id] );
			}
		}
	}

	var StopIteration = new Error("StopIteration");

	function Helium () {
		this.version = "0.0.1";
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
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

Template.prototype._retrieve = function (data) {
	if ( $.type(data) !== "string") return data;

	var prefix = data.substr(0, 1);
	
	return prefix == "@" ? He.data.get( data.substr(1) ) : data;
}

Template.prototype._cleanMatch = function (arr) {
	return arr.filter(function (item) {
		return $.type(item) !== "undefined";
	});
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

Template.prototype._bindHtml = function (value) {
	var
		self = this,
		fnc, data, bindId;

	fnc = function (data, value, id) {
		var html = self._retrieve(value);
		$("[he-bind=\"" + id + "\"]").html(html);
	}

	bindId = He.data.bind(value, fnc);

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

Template.prototype._assignHelpers = function () {
	var self = this;

	Handlebars.registerHelper("link", function (route, options) {

		var
			data   = options.hash,
			route  = route || "index",
			anchor = "<a href=\"" + He.router.getUrl(route) + "\" he-link=\"" + route + "\"",
			inner  = options.fn(this);

		for (name in data) {
			if (name === "route") continue;
			anchor += " " + name + "=\"" + data[name] + "\"";
		}

		anchor += ">" + inner + "</a>";

		return anchor;

	});

	Handlebars.registerHelper("bind-attr", function (options) {
		var
			data = options.hash,
			attr, output;

		for (attr in data) break;

		output = self._bindAttr( attr, data[attr] );

		return new Handlebars.SafeString(output);
	});

	Handlebars.registerHelper("bind-html", function (data) {
		var output = self._bindHtml(data);

		return new Handlebars.SafeString(output);
	});

}

Template.prototype.run = function () {
	var self = this;

	this._assignHelpers();

	$("[he-template]").each(function () {
		var $container = $(this), tpl;

		var $c = $("#" + $container.attr("he-template") );

		tpl = Handlebars.compile( $("#" + $container.attr("he-template")).text() )
		
		$container.html( tpl(He.data._data) );
		
		self.applyTags(this);
	});
}

/*
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
}*/
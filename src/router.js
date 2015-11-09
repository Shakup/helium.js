/* ==========================================================================
   Router Object
   ========================================================================== */

function Router () {
	this.routes        = {};
	this.mode          = "hash";
	this.basePath      = "";
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

Router.prototype.mount = function (name, path, action) {
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

Router.prototype.mount404 = function (cb) {
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

	this.basePath = this._stripSlashes(this.basePath || "") + "/";
	this.baseUrl  = location.protocol + "//" + location.host + "/" + (this.basePath === "/" ? "" : this.basePath);

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
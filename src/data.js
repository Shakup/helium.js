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
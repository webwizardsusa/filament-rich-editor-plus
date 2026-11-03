//#region \0rolldown/runtime.js
var e = Object.defineProperty, t = (t, n) => {
	let r = {};
	for (var i in t) e(r, i, {
		get: t[i],
		enumerable: !0
	});
	return n || e(r, Symbol.toStringTag, { value: "Module" }), r;
}, n = Object.defineProperty, r = (e, t) => {
	let r = {};
	for (var i in e) n(r, i, {
		get: e[i],
		enumerable: !0
	});
	return t || n(r, Symbol.toStringTag, { value: "Module" }), r;
};
//#endregion
//#region ../../node_modules/orderedmap/dist/index.js
function i(e) {
	this.content = e;
}
i.prototype = {
	constructor: i,
	find: function(e) {
		for (var t = 0; t < this.content.length; t += 2) if (this.content[t] === e) return t;
		return -1;
	},
	get: function(e) {
		var t = this.find(e);
		return t == -1 ? void 0 : this.content[t + 1];
	},
	update: function(e, t, n) {
		var r = n && n != e ? this.remove(n) : this, a = r.find(e), o = r.content.slice();
		return a == -1 ? o.push(n || e, t) : (o[a + 1] = t, n && (o[a] = n)), new i(o);
	},
	remove: function(e) {
		var t = this.find(e);
		if (t == -1) return this;
		var n = this.content.slice();
		return n.splice(t, 2), new i(n);
	},
	addToStart: function(e, t) {
		return new i([e, t].concat(this.remove(e).content));
	},
	addToEnd: function(e, t) {
		var n = this.remove(e).content.slice();
		return n.push(e, t), new i(n);
	},
	addBefore: function(e, t, n) {
		var r = this.remove(t), a = r.content.slice(), o = r.find(e);
		return a.splice(o == -1 ? a.length : o, 0, t, n), new i(a);
	},
	forEach: function(e) {
		for (var t = 0; t < this.content.length; t += 2) e(this.content[t], this.content[t + 1]);
	},
	prepend: function(e) {
		return e = i.from(e), e.size ? new i(e.content.concat(this.subtract(e).content)) : this;
	},
	append: function(e) {
		return e = i.from(e), e.size ? new i(this.subtract(e).content.concat(e.content)) : this;
	},
	subtract: function(e) {
		var t = this;
		e = i.from(e);
		for (var n = 0; n < e.content.length; n += 2) t = t.remove(e.content[n]);
		return t;
	},
	toObject: function() {
		var e = {};
		return this.forEach(function(t, n) {
			e[t] = n;
		}), e;
	},
	get size() {
		return this.content.length >> 1;
	}
}, i.from = function(e) {
	if (e instanceof i) return e;
	var t = [];
	if (e) for (var n in e) t.push(n, e[n]);
	return new i(t);
};
//#endregion
//#region ../../node_modules/prosemirror-model/dist/index.js
function a(e, t, n) {
	for (let r = 0;; r++) {
		if (r == e.childCount || r == t.childCount) return e.childCount == t.childCount ? null : n;
		let i = e.child(r), o = t.child(r);
		if (i == o) {
			n += i.nodeSize;
			continue;
		}
		if (!i.sameMarkup(o)) return n;
		if (i.isText && i.text != o.text) {
			let e = i.text, t = o.text, r = 0;
			for (; e[r] == t[r]; r++) n++;
			return r && r < e.length && r < t.length && c(e.charCodeAt(r - 1)) && s(e.charCodeAt(r)) && n--, n;
		}
		if (i.content.size || o.content.size) {
			let e = a(i.content, o.content, n + 1);
			if (e != null) return e;
		}
		n += i.nodeSize;
	}
}
function o(e, t, n, r) {
	for (let i = e.childCount, a = t.childCount;;) {
		if (i == 0 || a == 0) return i == a ? null : {
			a: n,
			b: r
		};
		let l = e.child(--i), u = t.child(--a), d = l.nodeSize;
		if (l == u) {
			n -= d, r -= d;
			continue;
		}
		if (!l.sameMarkup(u)) return {
			a: n,
			b: r
		};
		if (l.isText && l.text != u.text) {
			let e = l.text, t = u.text, i = e.length, a = t.length;
			for (; i > 0 && a > 0 && e[i - 1] == t[a - 1];) i--, a--, n--, r--;
			return i && a && i < e.length && c(e.charCodeAt(i - 1)) && s(e.charCodeAt(i)) && (n++, r++), {
				a: n,
				b: r
			};
		}
		if (l.content.size || u.content.size) {
			let e = o(l.content, u.content, n - 1, r - 1);
			if (e) return e;
		}
		n -= d, r -= d;
	}
}
function s(e) {
	return e >= 56320 && e < 57344;
}
function c(e) {
	return e >= 55296 && e < 56320;
}
var l = class e {
	constructor(e, t) {
		if (this.content = e, this.size = t || 0, t == null) for (let t = 0; t < e.length; t++) this.size += e[t].nodeSize;
	}
	nodesBetween(e, t, n, r = 0, i) {
		for (let a = 0, o = 0; o < t; a++) {
			let s = this.content[a], c = o + s.nodeSize;
			if (c > e && n(s, r + o, i || null, a) !== !1 && s.content.size) {
				let i = o + 1;
				s.nodesBetween(Math.max(0, e - i), Math.min(s.content.size, t - i), n, r + i);
			}
			o = c;
		}
	}
	descendants(e) {
		this.nodesBetween(0, this.size, e);
	}
	textBetween(e, t, n, r) {
		let i = "", a = !0;
		return this.nodesBetween(e, t, (o, s) => {
			let c = o.isText ? o.text.slice(Math.max(e, s) - s, t - s) : o.isLeaf ? r ? typeof r == "function" ? r(o) : r : o.type.spec.leafText ? o.type.spec.leafText(o) : "" : "";
			o.isBlock && (o.isLeaf && c || o.isTextblock) && n && (a ? a = !1 : i += n), i += c;
		}, 0), i;
	}
	append(t) {
		if (!t.size) return this;
		if (!this.size) return t;
		let n = this.lastChild, r = t.firstChild, i = this.content.slice(), a = 0;
		for (n.isText && n.sameMarkup(r) && (i[i.length - 1] = n.withText(n.text + r.text), a = 1); a < t.content.length; a++) i.push(t.content[a]);
		return new e(i, this.size + t.size);
	}
	cut(t, n = this.size) {
		if (t == 0 && n == this.size) return this;
		let r = [], i = 0;
		if (n > t) for (let e = 0, a = 0; a < n; e++) {
			let o = this.content[e], s = a + o.nodeSize;
			s > t && ((a < t || s > n) && (o = o.isText ? o.cut(Math.max(0, t - a), Math.min(o.text.length, n - a)) : o.cut(Math.max(0, t - a - 1), Math.min(o.content.size, n - a - 1))), r.push(o), i += o.nodeSize), a = s;
		}
		return new e(r, i);
	}
	cutByIndex(t, n) {
		return t == n ? e.empty : t == 0 && n == this.content.length ? this : new e(this.content.slice(t, n));
	}
	replaceChild(t, n) {
		let r = this.content[t];
		if (r == n) return this;
		let i = this.content.slice(), a = this.size + n.nodeSize - r.nodeSize;
		return i[t] = n, new e(i, a);
	}
	addToStart(t) {
		return new e([t].concat(this.content), this.size + t.nodeSize);
	}
	addToEnd(t) {
		return new e(this.content.concat(t), this.size + t.nodeSize);
	}
	eq(e) {
		if (this.content.length != e.content.length) return !1;
		for (let t = 0; t < this.content.length; t++) if (!this.content[t].eq(e.content[t])) return !1;
		return !0;
	}
	get firstChild() {
		return this.content.length ? this.content[0] : null;
	}
	get lastChild() {
		return this.content.length ? this.content[this.content.length - 1] : null;
	}
	get childCount() {
		return this.content.length;
	}
	child(e) {
		let t = this.content[e];
		if (!t) throw RangeError("Index " + e + " out of range for " + this);
		return t;
	}
	maybeChild(e) {
		return this.content[e] || null;
	}
	forEach(e) {
		for (let t = 0, n = 0; t < this.content.length; t++) {
			let r = this.content[t];
			e(r, n, t), n += r.nodeSize;
		}
	}
	findDiffStart(e, t = 0) {
		return a(this, e, t);
	}
	findDiffEnd(e, t = this.size, n = e.size) {
		return o(this, e, t, n);
	}
	findIndex(e) {
		if (e == 0) return d(0, e);
		if (e == this.size) return d(this.content.length, e);
		if (e > this.size || e < 0) throw RangeError(`Position ${e} outside of fragment (${this})`);
		for (let t = 0, n = 0;; t++) {
			let r = this.child(t), i = n + r.nodeSize;
			if (i >= e) return i == e ? d(t + 1, i) : d(t, n);
			n = i;
		}
	}
	toString() {
		return "<" + this.toStringInner() + ">";
	}
	toStringInner() {
		return this.content.join(", ");
	}
	toJSON() {
		return this.content.length ? this.content.map((e) => e.toJSON()) : null;
	}
	static fromJSON(t, n) {
		if (!n) return e.empty;
		if (!Array.isArray(n)) throw RangeError("Invalid input for Fragment.fromJSON");
		return e.fromArray(n.map(t.nodeFromJSON));
	}
	static fromArray(t) {
		if (!t.length) return e.empty;
		let n, r = 0;
		for (let e = 0; e < t.length; e++) {
			let i = t[e];
			r += i.nodeSize, e && i.isText && t[e - 1].sameMarkup(i) ? (n ||= t.slice(0, e), n[n.length - 1] = i.withText(n[n.length - 1].text + i.text)) : n && n.push(i);
		}
		return new e(n || t, r);
	}
	static from(t) {
		if (!t) return e.empty;
		if (t instanceof e) return t;
		if (Array.isArray(t)) return this.fromArray(t);
		if (t.attrs) return new e([t], t.nodeSize);
		throw RangeError("Can not convert " + t + " to a Fragment" + (t.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
	}
};
l.empty = new l([], 0);
var u = {
	index: 0,
	offset: 0
};
function d(e, t) {
	return u.index = e, u.offset = t, u;
}
function f(e, t) {
	if (e === t) return !0;
	if (!(e && typeof e == "object") || !(t && typeof t == "object")) return !1;
	let n = Array.isArray(e);
	if (Array.isArray(t) != n) return !1;
	if (n) {
		if (e.length != t.length) return !1;
		for (let n = 0; n < e.length; n++) if (!f(e[n], t[n])) return !1;
	} else {
		for (let n in e) if (!(n in t) || !f(e[n], t[n])) return !1;
		for (let n in t) if (!(n in e)) return !1;
	}
	return !0;
}
var p = class e {
	constructor(e, t) {
		this.type = e, this.attrs = t;
	}
	addToSet(e) {
		let t, n = !1;
		for (let r = 0; r < e.length; r++) {
			let i = e[r];
			if (this.eq(i)) return e;
			if (this.type.excludes(i.type)) t ||= e.slice(0, r);
			else if (i.type.excludes(this.type)) return e;
			else !n && i.type.rank > this.type.rank && (t ||= e.slice(0, r), t.push(this), n = !0), t && t.push(i);
		}
		return t ||= e.slice(), n || t.push(this), t;
	}
	removeFromSet(e) {
		for (let t = 0; t < e.length; t++) if (this.eq(e[t])) return e.slice(0, t).concat(e.slice(t + 1));
		return e;
	}
	isInSet(e) {
		for (let t = 0; t < e.length; t++) if (this.eq(e[t])) return !0;
		return !1;
	}
	eq(e) {
		return this == e || this.type == e.type && f(this.attrs, e.attrs);
	}
	toJSON() {
		let e = { type: this.type.name };
		for (let t in this.attrs) {
			e.attrs = this.attrs;
			break;
		}
		return e;
	}
	static fromJSON(e, t) {
		if (!t) throw RangeError("Invalid input for Mark.fromJSON");
		let n = e.marks[t.type];
		if (!n) throw RangeError(`There is no mark type ${t.type} in this schema`);
		let r = n.create(t.attrs);
		return n.checkAttrs(r.attrs), r;
	}
	static sameSet(e, t) {
		if (e == t) return !0;
		if (e.length != t.length) return !1;
		for (let n = 0; n < e.length; n++) if (!e[n].eq(t[n])) return !1;
		return !0;
	}
	static setFrom(t) {
		if (!t || Array.isArray(t) && t.length == 0) return e.none;
		if (t instanceof e) return [t];
		let n = t.slice();
		return n.sort((e, t) => e.type.rank - t.type.rank), n;
	}
};
p.none = [];
var m = class extends Error {}, h = class e {
	constructor(e, t, n) {
		this.content = e, this.openStart = t, this.openEnd = n;
	}
	get size() {
		return this.content.size - this.openStart - this.openEnd;
	}
	insertAt(t, n) {
		let r = _(this.content, t + this.openStart, n, this.openStart + 1, this.openEnd + 1);
		return r && new e(r, this.openStart, this.openEnd);
	}
	removeBetween(t, n) {
		return new e(g(this.content, t + this.openStart, n + this.openStart), this.openStart, this.openEnd);
	}
	eq(e) {
		return this.content.eq(e.content) && this.openStart == e.openStart && this.openEnd == e.openEnd;
	}
	toString() {
		return this.content + "(" + this.openStart + "," + this.openEnd + ")";
	}
	toJSON() {
		if (!this.content.size) return null;
		let e = { content: this.content.toJSON() };
		return this.openStart > 0 && (e.openStart = this.openStart), this.openEnd > 0 && (e.openEnd = this.openEnd), e;
	}
	static fromJSON(t, n) {
		if (!n) return e.empty;
		let r = n.openStart || 0, i = n.openEnd || 0;
		if (typeof r != "number" || typeof i != "number") throw RangeError("Invalid input for Slice.fromJSON");
		return new e(l.fromJSON(t, n.content), r, i);
	}
	static maxOpen(t, n = !0) {
		let r = 0, i = 0;
		for (let e = t.firstChild; e && !e.isLeaf && (n || !e.type.spec.isolating); e = e.firstChild) r++;
		for (let e = t.lastChild; e && !e.isLeaf && (n || !e.type.spec.isolating); e = e.lastChild) i++;
		return new e(t, r, i);
	}
};
h.empty = new h(l.empty, 0, 0);
function g(e, t, n) {
	let { index: r, offset: i } = e.findIndex(t), a = e.maybeChild(r), { index: o, offset: s } = e.findIndex(n);
	if (i == t || a.isText) {
		if (s != n && !e.child(o).isText) throw RangeError("Removing non-flat range");
		return e.cut(0, t).append(e.cut(n));
	}
	if (r != o) throw RangeError("Removing non-flat range");
	return e.replaceChild(r, a.copy(g(a.content, t - i - 1, n - i - 1)));
}
function _(e, t, n, r, i, a) {
	let { index: o, offset: s } = e.findIndex(t), c = e.maybeChild(o);
	if (s == t || c.isText) return a && r <= 0 && i <= 0 && !a.canReplace(o, o, n) ? null : e.cut(0, t).append(n).append(e.cut(t));
	let l = _(c.content, t - s - 1, n, o == 0 ? r - 1 : 0, o == e.childCount - 1 ? i - 1 : 0, c);
	return l && e.replaceChild(o, c.copy(l));
}
function v(e, t, n) {
	if (n.openStart > e.depth) throw new m("Inserted content deeper than insertion position");
	if (e.depth - n.openStart != t.depth - n.openEnd) throw new m("Inconsistent open depths");
	return y(e, t, n, 0);
}
function y(e, t, n, r) {
	let i = e.index(r), a = e.node(r);
	if (i == t.index(r) && r < e.depth - n.openStart) {
		let o = y(e, t, n, r + 1);
		return a.copy(a.content.replaceChild(i, o));
	}
	if (!n.content.size) return w(a, ee(e, t, r));
	if (!n.openStart && !n.openEnd && e.depth == r && t.depth == r) {
		let r = e.parent, i = r.content;
		return w(r, i.cut(0, e.parentOffset).append(n.content).append(i.cut(t.parentOffset)));
	}
	{
		let { start: i, end: o } = te(n, e);
		return w(a, T(e, i, o, t, r));
	}
}
function b(e, t) {
	if (!t.type.compatibleContent(e.type)) throw new m("Cannot join " + t.type.name + " onto " + e.type.name);
}
function x(e, t, n) {
	let r = e.node(n);
	return b(r, t.node(n)), r;
}
function S(e, t) {
	let n = t.length - 1;
	n >= 0 && e.isText && e.sameMarkup(t[n]) ? t[n] = e.withText(t[n].text + e.text) : t.push(e);
}
function C(e, t, n, r) {
	let i = (t || e).node(n), a = 0, o = t ? t.index(n) : i.childCount;
	e && (a = e.index(n), e.depth > n ? a++ : e.textOffset && (S(e.nodeAfter, r), a++));
	for (let e = a; e < o; e++) S(i.child(e), r);
	t && t.depth == n && t.textOffset && S(t.nodeBefore, r);
}
function w(e, t) {
	if (!e.type.validContent(t)) throw new m("Invalid content for node " + e.type.name);
	return e.copy(t);
}
function T(e, t, n, r, i) {
	let a = e.depth > i && x(e, t, i + 1), o = r.depth > i && x(n, r, i + 1), s = [];
	return C(null, e, i, s), a && o && t.index(i) == n.index(i) ? (b(a, o), S(w(a, T(e, t, n, r, i + 1)), s)) : (a && S(w(a, ee(e, t, i + 1)), s), C(t, n, i, s), o && S(w(o, ee(n, r, i + 1)), s)), C(r, null, i, s), new l(s);
}
function ee(e, t, n) {
	let r = [];
	return C(null, e, n, r), e.depth > n && S(w(x(e, t, n + 1), ee(e, t, n + 1)), r), C(t, null, n, r), new l(r);
}
function te(e, t) {
	let n = t.depth - e.openStart, r = t.node(n).copy(e.content);
	for (let e = n - 1; e >= 0; e--) r = t.node(e).copy(l.from(r));
	return {
		start: r.resolveNoCache(e.openStart + n),
		end: r.resolveNoCache(r.content.size - e.openEnd - n)
	};
}
var ne = class e {
	constructor(e, t, n) {
		this.pos = e, this.path = t, this.parentOffset = n, this.depth = t.length / 3 - 1;
	}
	resolveDepth(e) {
		return e == null ? this.depth : e < 0 ? this.depth + e : e;
	}
	get parent() {
		return this.node(this.depth);
	}
	get doc() {
		return this.node(0);
	}
	node(e) {
		return this.path[this.resolveDepth(e) * 3];
	}
	index(e) {
		return this.path[this.resolveDepth(e) * 3 + 1];
	}
	indexAfter(e) {
		return e = this.resolveDepth(e), this.index(e) + (e == this.depth && !this.textOffset ? 0 : 1);
	}
	start(e) {
		return e = this.resolveDepth(e), e == 0 ? 0 : this.path[e * 3 - 1] + 1;
	}
	end(e) {
		return e = this.resolveDepth(e), this.start(e) + this.node(e).content.size;
	}
	before(e) {
		if (e = this.resolveDepth(e), !e) throw RangeError("There is no position before the top-level node");
		return e == this.depth + 1 ? this.pos : this.path[e * 3 - 1];
	}
	after(e) {
		if (e = this.resolveDepth(e), !e) throw RangeError("There is no position after the top-level node");
		return e == this.depth + 1 ? this.pos : this.path[e * 3 - 1] + this.path[e * 3].nodeSize;
	}
	get textOffset() {
		return this.pos - this.path[this.path.length - 1];
	}
	get nodeAfter() {
		let e = this.parent, t = this.index(this.depth);
		if (t == e.childCount) return null;
		let n = this.pos - this.path[this.path.length - 1], r = e.child(t);
		return n ? e.child(t).cut(n) : r;
	}
	get nodeBefore() {
		let e = this.index(this.depth), t = this.pos - this.path[this.path.length - 1];
		return t ? this.parent.child(e).cut(0, t) : e == 0 ? null : this.parent.child(e - 1);
	}
	posAtIndex(e, t) {
		t = this.resolveDepth(t);
		let n = this.path[t * 3], r = t == 0 ? 0 : this.path[t * 3 - 1] + 1;
		for (let t = 0; t < e; t++) r += n.child(t).nodeSize;
		return r;
	}
	marks() {
		let e = this.parent, t = this.index();
		if (e.content.size == 0) return p.none;
		if (this.textOffset) return e.child(t).marks;
		let n = e.maybeChild(t - 1), r = e.maybeChild(t);
		if (!n) {
			let e = n;
			n = r, r = e;
		}
		let i = n.marks;
		for (var a = 0; a < i.length; a++) i[a].type.spec.inclusive === !1 && (!r || !i[a].isInSet(r.marks)) && (i = i[a--].removeFromSet(i));
		return i;
	}
	marksAcross(e) {
		let t = this.parent.maybeChild(this.index());
		if (!t || !t.isInline) return null;
		let n = t.marks, r = e.parent.maybeChild(e.index());
		for (var i = 0; i < n.length; i++) n[i].type.spec.inclusive === !1 && (!r || !n[i].isInSet(r.marks)) && (n = n[i--].removeFromSet(n));
		return n;
	}
	sharedDepth(e) {
		for (let t = this.depth; t > 0; t--) if (this.start(t) <= e && this.end(t) >= e) return t;
		return 0;
	}
	blockRange(e = this, t) {
		if (e.pos < this.pos) return e.blockRange(this);
		for (let n = this.depth - (this.parent.inlineContent || this.pos == e.pos ? 1 : 0); n >= 0; n--) if (e.pos <= this.end(n) && (!t || t(this.node(n)))) return new oe(this, e, n);
		return null;
	}
	sameParent(e) {
		return this.pos - this.parentOffset == e.pos - e.parentOffset;
	}
	max(e) {
		return e.pos > this.pos ? e : this;
	}
	min(e) {
		return e.pos < this.pos ? e : this;
	}
	toString() {
		let e = "";
		for (let t = 1; t <= this.depth; t++) e += (e ? "/" : "") + this.node(t).type.name + "_" + this.index(t - 1);
		return e + ":" + this.parentOffset;
	}
	static resolve(t, n) {
		if (!(n >= 0 && n <= t.content.size)) throw RangeError("Position " + n + " out of range");
		let r = [], i = 0, a = n;
		for (let e = t;;) {
			let { index: t, offset: n } = e.content.findIndex(a), o = a - n;
			if (r.push(e, t, i + n), !o || (e = e.child(t), e.isText)) break;
			a = o - 1, i += n + 1;
		}
		return new e(n, r, a);
	}
	static resolveCached(t, n) {
		let r = ae.get(t);
		if (r) for (let e = 0; e < r.elts.length; e++) {
			let t = r.elts[e];
			if (t.pos == n) return t;
		}
		else ae.set(t, r = new re());
		let i = r.elts[r.i] = e.resolve(t, n);
		return r.i = (r.i + 1) % ie, i;
	}
}, re = class {
	constructor() {
		this.elts = [], this.i = 0;
	}
}, ie = 12, ae = /* @__PURE__ */ new WeakMap(), oe = class {
	constructor(e, t, n) {
		this.$from = e, this.$to = t, this.depth = n;
	}
	get start() {
		return this.$from.before(this.depth + 1);
	}
	get end() {
		return this.$to.after(this.depth + 1);
	}
	get parent() {
		return this.$from.node(this.depth);
	}
	get startIndex() {
		return this.$from.index(this.depth);
	}
	get endIndex() {
		return this.$to.indexAfter(this.depth);
	}
}, se = Object.create(null), ce = class e {
	constructor(e, t, n, r = p.none) {
		this.type = e, this.attrs = t, this.marks = r, this.content = n || l.empty;
	}
	get children() {
		return this.content.content;
	}
	get nodeSize() {
		return this.isLeaf ? 1 : 2 + this.content.size;
	}
	get childCount() {
		return this.content.childCount;
	}
	child(e) {
		return this.content.child(e);
	}
	maybeChild(e) {
		return this.content.maybeChild(e);
	}
	forEach(e) {
		this.content.forEach(e);
	}
	nodesBetween(e, t, n, r = 0) {
		this.content.nodesBetween(e, t, n, r, this);
	}
	descendants(e) {
		this.nodesBetween(0, this.content.size, e);
	}
	get textContent() {
		return this.isLeaf && this.type.spec.leafText ? this.type.spec.leafText(this) : this.textBetween(0, this.content.size, "");
	}
	textBetween(e, t, n, r) {
		return this.content.textBetween(e, t, n, r);
	}
	get firstChild() {
		return this.content.firstChild;
	}
	get lastChild() {
		return this.content.lastChild;
	}
	eq(e) {
		return this == e || this.sameMarkup(e) && this.content.eq(e.content);
	}
	sameMarkup(e) {
		return this.hasMarkup(e.type, e.attrs, e.marks);
	}
	hasMarkup(e, t, n) {
		return this.type == e && f(this.attrs, t || e.defaultAttrs || se) && p.sameSet(this.marks, n || p.none);
	}
	copy(t = null) {
		return t == this.content ? this : new e(this.type, this.attrs, t, this.marks);
	}
	mark(t) {
		return t == this.marks ? this : new e(this.type, this.attrs, this.content, t);
	}
	cut(e, t = this.content.size) {
		return e == 0 && t == this.content.size ? this : this.copy(this.content.cut(e, t));
	}
	slice(e, t = this.content.size, n = !1) {
		if (e == t) return h.empty;
		let r = this.resolve(e), i = this.resolve(t), a = n ? 0 : r.sharedDepth(t), o = r.start(a);
		return new h(r.node(a).content.cut(r.pos - o, i.pos - o), r.depth - a, i.depth - a);
	}
	replace(e, t, n) {
		return v(this.resolve(e), this.resolve(t), n);
	}
	nodeAt(e) {
		for (let t = this;;) {
			let { index: n, offset: r } = t.content.findIndex(e);
			if (t = t.maybeChild(n), !t) return null;
			if (r == e || t.isText) return t;
			e -= r + 1;
		}
	}
	childAfter(e) {
		let { index: t, offset: n } = this.content.findIndex(e);
		return {
			node: this.content.maybeChild(t),
			index: t,
			offset: n
		};
	}
	childBefore(e) {
		if (e == 0) return {
			node: null,
			index: 0,
			offset: 0
		};
		let { index: t, offset: n } = this.content.findIndex(e);
		if (n < e) return {
			node: this.content.child(t),
			index: t,
			offset: n
		};
		let r = this.content.child(t - 1);
		return {
			node: r,
			index: t - 1,
			offset: n - r.nodeSize
		};
	}
	resolve(e) {
		return ne.resolveCached(this, e);
	}
	resolveNoCache(e) {
		return ne.resolve(this, e);
	}
	rangeHasMark(e, t, n) {
		let r = !1;
		return t > e && this.nodesBetween(e, t, (e) => (n.isInSet(e.marks) && (r = !0), !r)), r;
	}
	get isBlock() {
		return this.type.isBlock;
	}
	get isTextblock() {
		return this.type.isTextblock;
	}
	get inlineContent() {
		return this.type.inlineContent;
	}
	get isInline() {
		return this.type.isInline;
	}
	get isText() {
		return this.type.isText;
	}
	get isLeaf() {
		return this.type.isLeaf;
	}
	get isAtom() {
		return this.type.isAtom;
	}
	toString() {
		if (this.type.spec.toDebugString) return this.type.spec.toDebugString(this);
		let e = this.type.name;
		return this.content.size && (e += "(" + this.content.toStringInner() + ")"), ue(this.marks, e);
	}
	contentMatchAt(e) {
		let t = this.type.contentMatch.matchFragment(this.content, 0, e);
		if (!t) throw Error("Called contentMatchAt on a node with invalid content");
		return t;
	}
	canReplace(e, t, n = l.empty, r = 0, i = n.childCount) {
		let a = this.contentMatchAt(e).matchFragment(n, r, i), o = a && a.matchFragment(this.content, t);
		if (!o || !o.validEnd) return !1;
		for (let e = r; e < i; e++) if (!this.type.allowsMarks(n.child(e).marks)) return !1;
		return !0;
	}
	canReplaceWith(e, t, n, r) {
		if (r && !this.type.allowsMarks(r)) return !1;
		let i = this.contentMatchAt(e).matchType(n), a = i && i.matchFragment(this.content, t);
		return a ? a.validEnd : !1;
	}
	canAppend(e) {
		return e.content.size ? this.canReplace(this.childCount, this.childCount, e.content) : this.type.compatibleContent(e.type);
	}
	check() {
		this.type.checkContent(this.content), this.type.checkAttrs(this.attrs);
		let e = p.none;
		for (let t = 0; t < this.marks.length; t++) {
			let n = this.marks[t];
			n.type.checkAttrs(n.attrs), e = n.addToSet(e);
		}
		if (!p.sameSet(e, this.marks)) throw RangeError(`Invalid collection of marks for node ${this.type.name}: ${this.marks.map((e) => e.type.name)}`);
		this.content.forEach((e) => e.check());
	}
	toJSON() {
		let e = { type: this.type.name };
		for (let t in this.attrs) {
			e.attrs = this.attrs;
			break;
		}
		return this.content.size && (e.content = this.content.toJSON()), this.marks.length && (e.marks = this.marks.map((e) => e.toJSON())), e;
	}
	static fromJSON(e, t) {
		if (!t) throw RangeError("Invalid input for Node.fromJSON");
		let n;
		if (t.marks) {
			if (!Array.isArray(t.marks)) throw RangeError("Invalid mark data for Node.fromJSON");
			n = t.marks.map(e.markFromJSON);
		}
		if (t.type == "text") {
			if (typeof t.text != "string") throw RangeError("Invalid text node in JSON");
			return e.text(t.text, n);
		}
		let r = l.fromJSON(e, t.content), i = e.nodeType(t.type).create(t.attrs, r, n);
		return i.type.checkAttrs(i.attrs), i;
	}
};
ce.prototype.text = void 0;
var le = class e extends ce {
	constructor(e, t, n, r) {
		if (super(e, t, null, r), !n) throw RangeError("Empty text nodes are not allowed");
		this.text = n;
	}
	toString() {
		return this.type.spec.toDebugString ? this.type.spec.toDebugString(this) : ue(this.marks, JSON.stringify(this.text));
	}
	get textContent() {
		return this.text;
	}
	textBetween(e, t) {
		return this.text.slice(e, t);
	}
	get nodeSize() {
		return this.text.length;
	}
	mark(t) {
		return t == this.marks ? this : new e(this.type, this.attrs, this.text, t);
	}
	withText(t) {
		return t == this.text ? this : new e(this.type, this.attrs, t, this.marks);
	}
	cut(e = 0, t = this.text.length) {
		return e == 0 && t == this.text.length ? this : this.withText(this.text.slice(e, t));
	}
	eq(e) {
		return this.sameMarkup(e) && this.text == e.text;
	}
	toJSON() {
		let e = super.toJSON();
		return e.text = this.text, e;
	}
};
function ue(e, t) {
	for (let n = e.length - 1; n >= 0; n--) t = e[n].type.name + "(" + t + ")";
	return t;
}
var de = class e {
	constructor(e) {
		this.validEnd = e, this.next = [], this.wrapCache = [];
	}
	static parse(t, n) {
		let r = new fe(t, n);
		if (r.next == null) return e.empty;
		let i = pe(r);
		r.next && r.err("Unexpected trailing text");
		let a = Ce(be(i));
		return we(a, r), a;
	}
	matchType(e) {
		for (let t = 0; t < this.next.length; t++) if (this.next[t].type == e) return this.next[t].next;
		return null;
	}
	matchFragment(e, t = 0, n = e.childCount) {
		let r = this;
		for (let i = t; r && i < n; i++) r = r.matchType(e.child(i).type);
		return r;
	}
	get inlineContent() {
		return this.next.length != 0 && this.next[0].type.isInline;
	}
	get defaultType() {
		for (let e = 0; e < this.next.length; e++) {
			let { type: t } = this.next[e];
			if (!(t.isText || t.hasRequiredAttrs())) return t;
		}
		return null;
	}
	compatible(e) {
		for (let t = 0; t < this.next.length; t++) for (let n = 0; n < e.next.length; n++) if (this.next[t].type == e.next[n].type) return !0;
		return !1;
	}
	fillBefore(e, t = !1, n = 0) {
		let r = [this];
		function i(a, o) {
			let s = a.matchFragment(e, n);
			if (s && (!t || s.validEnd)) return l.from(o.map((e) => e.createAndFill()));
			for (let e = 0; e < a.next.length; e++) {
				let { type: t, next: n } = a.next[e];
				if (!(t.isText || t.hasRequiredAttrs()) && r.indexOf(n) == -1) {
					r.push(n);
					let e = i(n, o.concat(t));
					if (e) return e;
				}
			}
			return null;
		}
		return i(this, []);
	}
	findWrapping(e) {
		for (let t = 0; t < this.wrapCache.length; t += 2) if (this.wrapCache[t] == e) return this.wrapCache[t + 1];
		let t = this.computeWrapping(e);
		return this.wrapCache.push(e, t), t;
	}
	computeWrapping(e) {
		let t = Object.create(null), n = [{
			match: this,
			type: null,
			via: null
		}];
		for (; n.length;) {
			let r = n.shift(), i = r.match;
			if (i.matchType(e)) {
				let e = [];
				for (let t = r; t.type; t = t.via) e.push(t.type);
				return e.reverse();
			}
			for (let e = 0; e < i.next.length; e++) {
				let { type: a, next: o } = i.next[e];
				!a.isLeaf && !a.hasRequiredAttrs() && !(a.name in t) && (!r.type || o.validEnd) && (n.push({
					match: a.contentMatch,
					type: a,
					via: r
				}), t[a.name] = !0);
			}
		}
		return null;
	}
	get edgeCount() {
		return this.next.length;
	}
	edge(e) {
		if (e >= this.next.length) throw RangeError(`There's no ${e}th edge in this content match`);
		return this.next[e];
	}
	toString() {
		let e = [];
		function t(n) {
			e.push(n);
			for (let r = 0; r < n.next.length; r++) e.indexOf(n.next[r].next) == -1 && t(n.next[r].next);
		}
		return t(this), e.map((t, n) => {
			let r = n + (t.validEnd ? "*" : " ") + " ";
			for (let n = 0; n < t.next.length; n++) r += (n ? ", " : "") + t.next[n].type.name + "->" + e.indexOf(t.next[n].next);
			return r;
		}).join("\n");
	}
};
de.empty = new de(!0);
var fe = class {
	constructor(e, t) {
		this.string = e, this.nodeTypes = t, this.inline = null, this.pos = 0, this.tokens = e.split(/\s*(?=\b|\W|$)/), this.tokens[this.tokens.length - 1] == "" && this.tokens.pop(), this.tokens[0] == "" && this.tokens.shift();
	}
	get next() {
		return this.tokens[this.pos];
	}
	eat(e) {
		return this.next == e && (this.pos++ || !0);
	}
	err(e) {
		throw SyntaxError(e + " (in content expression '" + this.string + "')");
	}
};
function pe(e) {
	let t = [];
	do
		t.push(me(e));
	while (e.eat("|"));
	return t.length == 1 ? t[0] : {
		type: "choice",
		exprs: t
	};
}
function me(e) {
	let t = [];
	do
		t.push(he(e));
	while (e.next && e.next != ")" && e.next != "|");
	return t.length == 1 ? t[0] : {
		type: "seq",
		exprs: t
	};
}
function he(e) {
	let t = ye(e);
	for (;;) if (e.eat("+")) t = {
		type: "plus",
		expr: t
	};
	else if (e.eat("*")) t = {
		type: "star",
		expr: t
	};
	else if (e.eat("?")) t = {
		type: "opt",
		expr: t
	};
	else if (e.eat("{")) t = _e(e, t);
	else break;
	return t;
}
function ge(e) {
	/\D/.test(e.next) && e.err("Expected number, got '" + e.next + "'");
	let t = Number(e.next);
	return e.pos++, t;
}
function _e(e, t) {
	let n = ge(e), r = n;
	return e.eat(",") && (r = e.next == "}" ? -1 : ge(e)), e.eat("}") || e.err("Unclosed braced range"), {
		type: "range",
		min: n,
		max: r,
		expr: t
	};
}
function ve(e, t) {
	let n = e.nodeTypes, r = n[t];
	if (r) return [r];
	let i = [];
	for (let e in n) {
		let r = n[e];
		r.isInGroup(t) && i.push(r);
	}
	return i.length == 0 && e.err("No node type or group '" + t + "' found"), i;
}
function ye(e) {
	if (e.eat("(")) {
		let t = pe(e);
		return e.eat(")") || e.err("Missing closing paren"), t;
	}
	if (/\W/.test(e.next)) e.err("Unexpected token '" + e.next + "'");
	else {
		let t = ve(e, e.next).map((t) => (e.inline == null ? e.inline = t.isInline : e.inline != t.isInline && e.err("Mixing inline and block content"), {
			type: "name",
			value: t
		}));
		return e.pos++, t.length == 1 ? t[0] : {
			type: "choice",
			exprs: t
		};
	}
}
function be(e) {
	let t = [[]];
	return i(a(e, 0), n()), t;
	function n() {
		return t.push([]) - 1;
	}
	function r(e, n, r) {
		let i = {
			term: r,
			to: n
		};
		return t[e].push(i), i;
	}
	function i(e, t) {
		e.forEach((e) => e.to = t);
	}
	function a(e, t) {
		if (e.type == "choice") return e.exprs.reduce((e, n) => e.concat(a(n, t)), []);
		if (e.type == "seq") for (let r = 0;; r++) {
			let o = a(e.exprs[r], t);
			if (r == e.exprs.length - 1) return o;
			i(o, t = n());
		}
		else if (e.type == "star") {
			let o = n();
			return r(t, o), i(a(e.expr, o), o), [r(o)];
		} else if (e.type == "plus") {
			let o = n();
			return i(a(e.expr, t), o), i(a(e.expr, o), o), [r(o)];
		} else if (e.type == "opt") return [r(t)].concat(a(e.expr, t));
		else if (e.type == "range") {
			let o = t;
			for (let t = 0; t < e.min; t++) {
				let t = n();
				i(a(e.expr, o), t), o = t;
			}
			if (e.max == -1) i(a(e.expr, o), o);
			else for (let t = e.min; t < e.max; t++) {
				let t = n();
				r(o, t), i(a(e.expr, o), t), o = t;
			}
			return [r(o)];
		} else if (e.type == "name") return [r(t, void 0, e.value)];
		else throw Error("Unknown expr type");
	}
}
function xe(e, t) {
	return t - e;
}
function Se(e, t) {
	let n = [];
	return r(t), n.sort(xe);
	function r(t) {
		let i = e[t];
		if (i.length == 1 && !i[0].term) return r(i[0].to);
		n.push(t);
		for (let e = 0; e < i.length; e++) {
			let { term: t, to: a } = i[e];
			!t && n.indexOf(a) == -1 && r(a);
		}
	}
}
function Ce(e) {
	let t = Object.create(null);
	return n(Se(e, 0));
	function n(r) {
		let i = [];
		r.forEach((t) => {
			e[t].forEach(({ term: t, to: n }) => {
				if (!t) return;
				let r;
				for (let e = 0; e < i.length; e++) i[e][0] == t && (r = i[e][1]);
				Se(e, n).forEach((e) => {
					r || i.push([t, r = []]), r.indexOf(e) == -1 && r.push(e);
				});
			});
		});
		let a = t[r.join(",")] = new de(r.indexOf(e.length - 1) > -1);
		for (let e = 0; e < i.length; e++) {
			let r = i[e][1].sort(xe);
			a.next.push({
				type: i[e][0],
				next: t[r.join(",")] || n(r)
			});
		}
		return a;
	}
}
function we(e, t) {
	for (let n = 0, r = [e]; n < r.length; n++) {
		let e = r[n], i = !e.validEnd, a = [];
		for (let t = 0; t < e.next.length; t++) {
			let { type: n, next: o } = e.next[t];
			a.push(n.name), i && !(n.isText || n.hasRequiredAttrs()) && (i = !1), r.indexOf(o) == -1 && r.push(o);
		}
		i && t.err("Only non-generatable nodes (" + a.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
	}
}
function Te(e) {
	let t = Object.create(null);
	for (let n in e) {
		let r = e[n];
		if (!r.hasDefault) return null;
		t[n] = r.default;
	}
	return t;
}
function Ee(e, t) {
	let n = Object.create(null);
	for (let r in e) {
		let i = t && t[r];
		if (i === void 0) {
			let t = e[r];
			if (t.hasDefault) i = t.default;
			else throw RangeError("No value supplied for attribute " + r);
		}
		n[r] = i;
	}
	return n;
}
function De(e, t, n, r) {
	for (let i in t) if (!(i in e)) throw RangeError(`Unsupported attribute ${i} for ${n} of type ${r}`);
	for (let n in e) e[n].validate && e[n].validate(t[n]);
}
function Oe(e, t) {
	let n = Object.create(null);
	if (t) for (let r in t) n[r] = new je(e, r, t[r]);
	return n;
}
var ke = class e {
	constructor(e, t, n) {
		this.name = e, this.schema = t, this.spec = n, this.markSet = null, this.groups = n.group ? n.group.split(" ") : [], this.attrs = Oe(e, n.attrs), this.defaultAttrs = Te(this.attrs), this.contentMatch = null, this.inlineContent = null, this.isBlock = !(n.inline || e == "text"), this.isText = e == "text";
	}
	get isInline() {
		return !this.isBlock;
	}
	get isTextblock() {
		return this.isBlock && this.inlineContent;
	}
	get isLeaf() {
		return this.contentMatch == de.empty;
	}
	get isAtom() {
		return this.isLeaf || !!this.spec.atom;
	}
	isInGroup(e) {
		return this.groups.indexOf(e) > -1;
	}
	get whitespace() {
		return this.spec.whitespace || (this.spec.code ? "pre" : "normal");
	}
	hasRequiredAttrs() {
		for (let e in this.attrs) if (this.attrs[e].isRequired) return !0;
		return !1;
	}
	compatibleContent(e) {
		return this == e || this.contentMatch.compatible(e.contentMatch);
	}
	computeAttrs(e) {
		return !e && this.defaultAttrs ? this.defaultAttrs : Ee(this.attrs, e);
	}
	create(e = null, t, n) {
		if (this.isText) throw Error("NodeType.create can't construct text nodes");
		return new ce(this, this.computeAttrs(e), l.from(t), p.setFrom(n));
	}
	createChecked(e = null, t, n) {
		return t = l.from(t), this.checkContent(t), new ce(this, this.computeAttrs(e), t, p.setFrom(n));
	}
	createAndFill(e = null, t, n) {
		if (e = this.computeAttrs(e), t = l.from(t), t.size) {
			let e = this.contentMatch.fillBefore(t);
			if (!e) return null;
			t = e.append(t);
		}
		let r = this.contentMatch.matchFragment(t), i = r && r.fillBefore(l.empty, !0);
		return i ? new ce(this, e, t.append(i), p.setFrom(n)) : null;
	}
	validContent(e) {
		let t = this.contentMatch.matchFragment(e);
		if (!t || !t.validEnd) return !1;
		for (let t = 0; t < e.childCount; t++) if (!this.allowsMarks(e.child(t).marks)) return !1;
		return !0;
	}
	checkContent(e) {
		if (!this.validContent(e)) throw RangeError(`Invalid content for node ${this.name}: ${e.toString().slice(0, 50)}`);
	}
	checkAttrs(e) {
		De(this.attrs, e, "node", this.name);
	}
	allowsMarkType(e) {
		return this.markSet == null || this.markSet.indexOf(e) > -1;
	}
	allowsMarks(e) {
		if (this.markSet == null) return !0;
		for (let t = 0; t < e.length; t++) if (!this.allowsMarkType(e[t].type)) return !1;
		return !0;
	}
	allowedMarks(e) {
		if (this.markSet == null) return e;
		let t;
		for (let n = 0; n < e.length; n++) this.allowsMarkType(e[n].type) ? t && t.push(e[n]) : t ||= e.slice(0, n);
		return t ? t.length ? t : p.none : e;
	}
	static compile(t, n) {
		let r = Object.create(null);
		t.forEach((t, i) => r[t] = new e(t, n, i));
		let i = n.spec.topNode || "doc";
		if (!r[i]) throw RangeError("Schema is missing its top node type ('" + i + "')");
		if (!r.text) throw RangeError("Every schema needs a 'text' type");
		for (let e in r.text.attrs) throw RangeError("The text node type should not have attributes");
		return r;
	}
};
function Ae(e, t, n) {
	let r = n.split("|");
	return (n) => {
		let i = n === null ? "null" : typeof n;
		if (r.indexOf(i) < 0) throw RangeError(`Expected value of type ${r} for attribute ${t} on type ${e}, got ${i}`);
	};
}
var je = class {
	constructor(e, t, n) {
		this.hasDefault = Object.prototype.hasOwnProperty.call(n, "default"), this.default = n.default, this.validate = typeof n.validate == "string" ? Ae(e, t, n.validate) : n.validate;
	}
	get isRequired() {
		return !this.hasDefault;
	}
}, Me = class e {
	constructor(e, t, n, r) {
		this.name = e, this.rank = t, this.schema = n, this.spec = r, this.attrs = Oe(e, r.attrs), this.excluded = null;
		let i = Te(this.attrs);
		this.instance = i ? new p(this, i) : null;
	}
	create(e = null) {
		return !e && this.instance ? this.instance : new p(this, Ee(this.attrs, e));
	}
	static compile(t, n) {
		let r = Object.create(null), i = 0;
		return t.forEach((t, a) => r[t] = new e(t, i++, n, a)), r;
	}
	removeFromSet(e) {
		for (var t = 0; t < e.length; t++) e[t].type == this && (e = e.slice(0, t).concat(e.slice(t + 1)), t--);
		return e;
	}
	isInSet(e) {
		for (let t = 0; t < e.length; t++) if (e[t].type == this) return e[t];
	}
	checkAttrs(e) {
		De(this.attrs, e, "mark", this.name);
	}
	excludes(e) {
		return this.excluded.indexOf(e) > -1;
	}
}, Ne = class {
	constructor(e) {
		this.linebreakReplacement = null, this.cached = Object.create(null);
		let t = this.spec = {};
		for (let n in e) t[n] = e[n];
		t.nodes = i.from(e.nodes), t.marks = i.from(e.marks || {}), this.nodes = ke.compile(this.spec.nodes, this), this.marks = Me.compile(this.spec.marks, this);
		let n = Object.create(null);
		for (let e in this.nodes) {
			if (e in this.marks) throw RangeError(e + " can not be both a node and a mark");
			let t = this.nodes[e], r = t.spec.content || "", i = t.spec.marks;
			if (t.contentMatch = n[r] || (n[r] = de.parse(r, this.nodes)), t.inlineContent = t.contentMatch.inlineContent, t.spec.linebreakReplacement) {
				if (this.linebreakReplacement) throw RangeError("Multiple linebreak nodes defined");
				if (!t.isInline || !t.isLeaf) throw RangeError("Linebreak replacement nodes must be inline leaf nodes");
				this.linebreakReplacement = t;
			}
			t.markSet = i == "_" ? null : i ? Pe(this, i.split(" ")) : i == "" || !t.inlineContent ? [] : null;
		}
		for (let e in this.marks) {
			let t = this.marks[e], n = t.spec.excludes;
			t.excluded = n == null ? [t] : n == "" ? [] : Pe(this, n.split(" "));
		}
		this.nodeFromJSON = (e) => ce.fromJSON(this, e), this.markFromJSON = (e) => p.fromJSON(this, e), this.topNodeType = this.nodes[this.spec.topNode || "doc"], this.cached.wrappings = Object.create(null);
	}
	node(e, t = null, n, r) {
		if (typeof e == "string") e = this.nodeType(e);
		else if (!(e instanceof ke)) throw RangeError("Invalid node type: " + e);
		else if (e.schema != this) throw RangeError("Node type from different schema used (" + e.name + ")");
		return e.createChecked(t, n, r);
	}
	text(e, t) {
		let n = this.nodes.text;
		return new le(n, n.defaultAttrs, e, p.setFrom(t));
	}
	mark(e, t) {
		return typeof e == "string" && (e = this.marks[e]), e.create(t);
	}
	nodeType(e) {
		let t = this.nodes[e];
		if (!t) throw RangeError("Unknown node type: " + e);
		return t;
	}
};
function Pe(e, t) {
	let n = [];
	for (let r = 0; r < t.length; r++) {
		let i = t[r], a = e.marks[i], o = a;
		if (a) n.push(a);
		else for (let t in e.marks) {
			let r = e.marks[t];
			(i == "_" || r.spec.group && r.spec.group.split(" ").indexOf(i) > -1) && n.push(o = r);
		}
		if (!o) throw SyntaxError("Unknown mark type: '" + t[r] + "'");
	}
	return n;
}
function Fe(e) {
	return e.tag != null;
}
function Ie(e) {
	return e.style != null;
}
var Le = class e {
	constructor(e, t) {
		this.schema = e, this.rules = t, this.tags = [], this.styles = [];
		let n = this.matchedStyles = [];
		t.forEach((e) => {
			if (Fe(e)) this.tags.push(e);
			else if (Ie(e)) {
				let t = /[^=]*/.exec(e.style)[0];
				n.indexOf(t) < 0 && n.push(t), this.styles.push(e);
			}
		}), this.normalizeLists = !this.tags.some((t) => {
			if (!/^(ul|ol)\b/.test(t.tag) || !t.node) return !1;
			let n = e.nodes[t.node];
			return n.contentMatch.matchType(n);
		});
	}
	parse(e, t = {}) {
		let n = new Ke(this, t, !1);
		return n.addAll(e, p.none, t.from, t.to), n.finish();
	}
	parseSlice(e, t = {}) {
		let n = new Ke(this, t, !0);
		return n.addAll(e, p.none, t.from, t.to), h.maxOpen(n.finish());
	}
	matchTag(e, t, n) {
		for (let r = n ? this.tags.indexOf(n) + 1 : 0; r < this.tags.length; r++) {
			let n = this.tags[r];
			if (Je(e, n.tag) && (n.namespace === void 0 || e.namespaceURI == n.namespace) && (!n.context || t.matchesContext(n.context))) {
				if (n.getAttrs) {
					let t = n.getAttrs(e);
					if (t === !1) continue;
					n.attrs = t || void 0;
				}
				return n;
			}
		}
	}
	matchStyle(e, t, n, r) {
		for (let i = r ? this.styles.indexOf(r) + 1 : 0; i < this.styles.length; i++) {
			let r = this.styles[i], a = r.style;
			if (!(a.indexOf(e) != 0 || r.context && !n.matchesContext(r.context) || a.length > e.length && (a.charCodeAt(e.length) != 61 || a.slice(e.length + 1) != t))) {
				if (r.getAttrs) {
					let e = r.getAttrs(t);
					if (e === !1) continue;
					r.attrs = e || void 0;
				}
				return r;
			}
		}
	}
	static schemaRules(e) {
		let t = [];
		function n(e) {
			let n = e.priority == null ? 50 : e.priority, r = 0;
			for (; r < t.length; r++) {
				let e = t[r];
				if ((e.priority == null ? 50 : e.priority) < n) break;
			}
			t.splice(r, 0, e);
		}
		for (let t in e.marks) {
			let r = e.marks[t].spec.parseDOM;
			r && r.forEach((e) => {
				n(e = Ye(e)), e.mark || e.ignore || e.clearMark || (e.mark = t);
			});
		}
		for (let t in e.nodes) {
			let r = e.nodes[t].spec.parseDOM;
			r && r.forEach((e) => {
				n(e = Ye(e)), e.node || e.ignore || e.mark || (e.node = t);
			});
		}
		return t;
	}
	static fromSchema(t) {
		return t.cached.domParser || (t.cached.domParser = new e(t, e.schemaRules(t)));
	}
}, Re = {
	address: !0,
	article: !0,
	aside: !0,
	blockquote: !0,
	body: !0,
	canvas: !0,
	dd: !0,
	div: !0,
	dl: !0,
	fieldset: !0,
	figcaption: !0,
	figure: !0,
	footer: !0,
	form: !0,
	h1: !0,
	h2: !0,
	h3: !0,
	h4: !0,
	h5: !0,
	h6: !0,
	header: !0,
	hgroup: !0,
	hr: !0,
	li: !0,
	noscript: !0,
	ol: !0,
	output: !0,
	p: !0,
	pre: !0,
	section: !0,
	table: !0,
	tfoot: !0,
	ul: !0
}, ze = {
	head: !0,
	noscript: !0,
	object: !0,
	script: !0,
	style: !0,
	title: !0
}, Be = {
	ol: !0,
	ul: !0
}, Ve = 1, He = 2, Ue = 4;
function We(e, t, n) {
	return t == null ? e && e.whitespace == "pre" ? 3 : n & -5 : (t ? Ve : 0) | (t === "full" ? He : 0);
}
var Ge = class {
	constructor(e, t, n, r, i, a) {
		this.type = e, this.attrs = t, this.marks = n, this.solid = r, this.options = a, this.content = [], this.activeMarks = p.none, this.match = i || (a & Ue ? null : e.contentMatch);
	}
	findWrapping(e) {
		if (!this.match) {
			if (!this.type) return [];
			let t = this.type.contentMatch.fillBefore(l.from(e));
			if (t) this.match = this.type.contentMatch.matchFragment(t);
			else {
				let t = this.type.contentMatch, n;
				return (n = t.findWrapping(e.type)) ? (this.match = t, n) : null;
			}
		}
		return this.match.findWrapping(e.type);
	}
	finish(e) {
		if (!(this.options & Ve)) {
			let e = this.content[this.content.length - 1], t;
			if (e && e.isText && (t = /[ \t\r\n\u000c]+$/.exec(e.text))) {
				let n = e;
				e.text.length == t[0].length ? this.content.pop() : this.content[this.content.length - 1] = n.withText(n.text.slice(0, n.text.length - t[0].length));
			}
		}
		let t = l.from(this.content);
		return !e && this.match && (t = t.append(this.match.fillBefore(l.empty, !0))), this.type ? this.type.create(this.attrs, t, this.marks) : t;
	}
	inlineContext(e) {
		return this.type ? this.type.inlineContent : this.content.length ? this.content[0].isInline : e.parentNode && !Re.hasOwnProperty(e.parentNode.nodeName.toLowerCase());
	}
}, Ke = class {
	constructor(e, t, n) {
		this.parser = e, this.options = t, this.isOpen = n, this.open = 0, this.localPreserveWS = !1;
		let r = t.topNode, i, a = We(null, t.preserveWhitespace, 0) | (n ? Ue : 0);
		i = r ? new Ge(r.type, r.attrs, p.none, !0, t.topMatch || r.type.contentMatch, a) : n ? new Ge(null, null, p.none, !0, null, a) : new Ge(e.schema.topNodeType, null, p.none, !0, null, a), this.nodes = [i], this.find = t.findPositions, this.needsBlock = !1;
	}
	get top() {
		return this.nodes[this.open];
	}
	addDOM(e, t) {
		e.nodeType == 3 ? this.addTextNode(e, t) : e.nodeType == 1 && this.addElement(e, t);
	}
	addTextNode(e, t) {
		let n = e.nodeValue, r = this.top, i = r.options & He ? "full" : this.localPreserveWS || (r.options & Ve) > 0, { schema: a } = this.parser;
		if (i === "full" || r.inlineContext(e) || /[^ \t\r\n\u000c]/.test(n)) {
			if (!i) {
				if (n = n.replace(/[ \t\r\n\u000c]+/g, " "), /^[ \t\r\n\u000c]/.test(n) && this.open == this.nodes.length - 1) {
					let t = r.content[r.content.length - 1], i = e.previousSibling;
					(!t || i && i.nodeName == "BR" || t.isText && /[ \t\r\n\u000c]$/.test(t.text)) && (n = n.slice(1));
				}
			} else if (i === "full") n = n.replace(/\r\n?/g, "\n");
			else if (a.linebreakReplacement && /[\r\n]/.test(n) && this.top.findWrapping(a.linebreakReplacement.create())) {
				let e = n.split(/\r?\n|\r/);
				for (let n = 0; n < e.length; n++) n && this.insertNode(a.linebreakReplacement.create(), t, !0), e[n] && this.insertNode(a.text(e[n]), t, !/\S/.test(e[n]));
				n = "";
			} else n = n.replace(/\r?\n|\r/g, " ");
			n && this.insertNode(a.text(n), t, !/\S/.test(n)), this.findInText(e);
		} else this.findInside(e);
	}
	addElement(e, t, n) {
		let r = this.localPreserveWS, i = this.top;
		(e.tagName == "PRE" || /pre/.test(e.style && e.style.whiteSpace)) && (this.localPreserveWS = !0);
		let a = e.nodeName.toLowerCase(), o;
		Be.hasOwnProperty(a) && this.parser.normalizeLists && qe(e);
		let s = this.options.ruleFromNode && this.options.ruleFromNode(e) || (o = this.parser.matchTag(e, this, n));
		out: if (s ? s.ignore : ze.hasOwnProperty(a)) this.findInside(e), this.ignoreFallback(e, t);
		else if (!s || s.skip || s.closeParent) {
			s && s.closeParent ? this.open = Math.max(0, this.open - 1) : s && s.skip.nodeType && (e = s.skip);
			let n, r = this.needsBlock;
			if (Re.hasOwnProperty(a)) i.content.length && i.content[0].isInline && this.open && (this.open--, i = this.top), n = !0, i.type || (this.needsBlock = !0);
			else if (!e.firstChild) {
				this.leafFallback(e, t);
				break out;
			}
			let o = s && s.skip ? t : this.readStyles(e, t);
			o && this.addAll(e, o), n && this.sync(i), this.needsBlock = r;
		} else {
			let n = this.readStyles(e, t);
			n && this.addElementByRule(e, s, n, s.consuming === !1 ? o : void 0);
		}
		this.localPreserveWS = r;
	}
	leafFallback(e, t) {
		e.nodeName == "BR" && this.top.type && this.top.type.inlineContent && this.addTextNode(e.ownerDocument.createTextNode("\n"), t);
	}
	ignoreFallback(e, t) {
		e.nodeName == "BR" && (!this.top.type || !this.top.type.inlineContent) && this.findPlace(this.parser.schema.text("-"), t, !0);
	}
	readStyles(e, t) {
		let n = e.style;
		if (n && n.length) for (let e = 0; e < this.parser.matchedStyles.length; e++) {
			let r = this.parser.matchedStyles[e], i = n.getPropertyValue(r);
			if (i) for (let e;;) {
				let n = this.parser.matchStyle(r, i, this, e);
				if (!n) break;
				if (n.ignore) return null;
				if (t = n.clearMark ? t.filter((e) => !n.clearMark(e)) : t.concat(this.parser.schema.marks[n.mark].create(n.attrs)), n.consuming === !1) e = n;
				else break;
			}
		}
		return t;
	}
	addElementByRule(e, t, n, r) {
		let i, a;
		if (t.node) {
			if (a = this.parser.schema.nodes[t.node], a.isLeaf) this.insertNode(a.create(t.attrs), n, e.nodeName == "BR") || this.leafFallback(e, n);
			else {
				let e = this.enter(a, t.attrs || null, n, t.preserveWhitespace);
				e && (i = !0, n = e);
			}
		} else {
			let e = this.parser.schema.marks[t.mark];
			n = n.concat(e.create(t.attrs));
		}
		let o = this.top;
		if (a && a.isLeaf) this.findInside(e);
		else if (r) this.addElement(e, n, r);
		else if (t.getContent) this.findInside(e), t.getContent(e, this.parser.schema).forEach((e) => this.insertNode(e, n, !1));
		else {
			let r = e;
			typeof t.contentElement == "string" ? r = e.querySelector(t.contentElement) : typeof t.contentElement == "function" ? r = t.contentElement(e) : t.contentElement && (r = t.contentElement), this.findAround(e, r, !0), this.addAll(r, n), this.findAround(e, r, !1);
		}
		i && this.sync(o) && this.open--;
	}
	addAll(e, t, n, r) {
		let i = n || 0;
		for (let a = n ? e.childNodes[n] : e.firstChild, o = r == null ? null : e.childNodes[r]; a != o; a = a.nextSibling, ++i) this.findAtPoint(e, i), this.addDOM(a, t);
		this.findAtPoint(e, i);
	}
	findPlace(e, t, n) {
		let r, i;
		for (let t = this.open, a = 0; t >= 0; t--) {
			let o = this.nodes[t], s = o.findWrapping(e);
			if (s && (!r || r.length > s.length + a) && (r = s, i = o, !s.length)) break;
			if (o.solid) {
				if (n) break;
				a += 2;
			}
		}
		if (!r) return null;
		this.sync(i);
		for (let e = 0; e < r.length; e++) t = this.enterInner(r[e], null, t, !1);
		return t;
	}
	insertNode(e, t, n) {
		if (e.isInline && this.needsBlock && !this.top.type) {
			let e = this.textblockFromContext();
			e && (t = this.enterInner(e, null, t));
		}
		let r = this.findPlace(e, t, n);
		if (r) {
			this.closeExtra();
			let t = this.top;
			t.match &&= t.match.matchType(e.type);
			let n = p.none;
			for (let i of r.concat(e.marks)) (t.type ? t.type.allowsMarkType(i.type) : Xe(i.type, e.type)) && (n = i.addToSet(n));
			return t.content.push(e.mark(n)), !0;
		}
		return !1;
	}
	enter(e, t, n, r) {
		let i = this.findPlace(e.create(t), n, !1);
		return i &&= this.enterInner(e, t, n, !0, r), i;
	}
	enterInner(e, t, n, r = !1, i) {
		this.closeExtra();
		let a = this.top;
		a.match = a.match && a.match.matchType(e);
		let o = We(e, i, a.options);
		a.options & Ue && a.content.length == 0 && (o |= Ue);
		let s = p.none;
		return n = n.filter((t) => !(a.type ? a.type.allowsMarkType(t.type) : Xe(t.type, e)) || (s = t.addToSet(s), !1)), this.nodes.push(new Ge(e, t, s, r, null, o)), this.open++, n;
	}
	closeExtra(e = !1) {
		let t = this.nodes.length - 1;
		if (t > this.open) {
			for (; t > this.open; t--) this.nodes[t - 1].content.push(this.nodes[t].finish(e));
			this.nodes.length = this.open + 1;
		}
	}
	finish() {
		return this.open = 0, this.closeExtra(this.isOpen), this.nodes[0].finish(!!(this.isOpen || this.options.topOpen));
	}
	sync(e) {
		for (let t = this.open; t >= 0; t--) if (this.nodes[t] == e) return this.open = t, !0;
		else this.localPreserveWS && (this.nodes[t].options |= Ve);
		return !1;
	}
	get currentPos() {
		this.closeExtra();
		let e = 0;
		for (let t = this.open; t >= 0; t--) {
			let n = this.nodes[t].content;
			for (let t = n.length - 1; t >= 0; t--) e += n[t].nodeSize;
			t && e++;
		}
		return e;
	}
	findAtPoint(e, t) {
		if (this.find) for (let n = 0; n < this.find.length; n++) this.find[n].node == e && this.find[n].offset == t && (this.find[n].pos = this.currentPos);
	}
	findInside(e) {
		if (this.find) for (let t = 0; t < this.find.length; t++) this.find[t].pos == null && e.nodeType == 1 && e.contains(this.find[t].node) && (this.find[t].pos = this.currentPos);
	}
	findAround(e, t, n) {
		if (e != t && this.find) for (let r = 0; r < this.find.length; r++) this.find[r].pos == null && e.nodeType == 1 && e.contains(this.find[r].node) && t.compareDocumentPosition(this.find[r].node) & (n ? 2 : 4) && (this.find[r].pos = this.currentPos);
	}
	findInText(e) {
		if (this.find) for (let t = 0; t < this.find.length; t++) this.find[t].node == e && (this.find[t].pos = this.currentPos - (e.nodeValue.length - this.find[t].offset));
	}
	matchesContext(e) {
		if (e.indexOf("|") > -1) return e.split(/\s*\|\s*/).some(this.matchesContext, this);
		let t = e.split("/"), n = this.options.context, r = !this.isOpen && (!n || n.parent.type == this.nodes[0].type), i = -(n ? n.depth + 1 : 0) + +!r, a = (e, o) => {
			for (; e >= 0; e--) {
				let s = t[e];
				if (s == "") {
					if (e == t.length - 1 || e == 0) continue;
					for (; o >= i; o--) if (a(e - 1, o)) return !0;
					return !1;
				}
				{
					let e = o > 0 || o == 0 && r ? this.nodes[o].type : n && o >= i ? n.node(o - i).type : null;
					if (!e || e.name != s && !e.isInGroup(s)) return !1;
					o--;
				}
			}
			return !0;
		};
		return a(t.length - 1, this.open);
	}
	textblockFromContext() {
		let e = this.options.context;
		if (e) for (let t = e.depth; t >= 0; t--) {
			let n = e.node(t).contentMatchAt(e.indexAfter(t)).defaultType;
			if (n && n.isTextblock && n.defaultAttrs) return n;
		}
		for (let e in this.parser.schema.nodes) {
			let t = this.parser.schema.nodes[e];
			if (t.isTextblock && t.defaultAttrs) return t;
		}
	}
};
function qe(e) {
	for (let t = e.firstChild, n = null; t; t = t.nextSibling) {
		let e = t.nodeType == 1 ? t.nodeName.toLowerCase() : null;
		e && Be.hasOwnProperty(e) && n ? (n.appendChild(t), t = n) : e == "li" ? n = t : e && (n = null);
	}
}
function Je(e, t) {
	return (e.matches || e.msMatchesSelector || e.webkitMatchesSelector || e.mozMatchesSelector).call(e, t);
}
function Ye(e) {
	let t = {};
	for (let n in e) t[n] = e[n];
	return t;
}
function Xe(e, t) {
	let n = t.schema.nodes;
	for (let r in n) {
		let i = n[r];
		if (!i.allowsMarkType(e)) continue;
		let a = [], o = (e) => {
			a.push(e);
			for (let n = 0; n < e.edgeCount; n++) {
				let { type: r, next: i } = e.edge(n);
				if (r == t || a.indexOf(i) < 0 && o(i)) return !0;
			}
		};
		if (o(i.contentMatch)) return !0;
	}
}
var Ze = class e {
	constructor(e, t) {
		this.nodes = e, this.marks = t;
	}
	serializeFragment(e, t = {}, n) {
		n ||= $e(t).createDocumentFragment();
		let r = n, i = [];
		return e.forEach((e) => {
			if (i.length || e.marks.length) {
				let n = 0, a = 0;
				for (; n < i.length && a < e.marks.length;) {
					let t = e.marks[a];
					if (!this.marks[t.type.name]) {
						a++;
						continue;
					}
					if (!t.eq(i[n][0]) || t.type.spec.spanning === !1) break;
					n++, a++;
				}
				for (; n < i.length;) r = i.pop()[1];
				for (; a < e.marks.length;) {
					let n = e.marks[a++], o = this.serializeMark(n, e.isInline, t);
					o && (i.push([n, r]), r.appendChild(o.dom), r = o.contentDOM || o.dom);
				}
			}
			r.appendChild(this.serializeNodeInner(e, t));
		}), n;
	}
	serializeNodeInner(e, t) {
		if (e.isText) return $e(t).createTextNode(e.text);
		let { dom: n, contentDOM: r } = rt($e(t), this.nodes[e.type.name](e), null, e.attrs);
		if (r) {
			if (e.isLeaf) throw RangeError("Content hole not allowed in a leaf node spec");
			this.serializeFragment(e.content, t, r);
		}
		return n;
	}
	serializeNode(e, t = {}) {
		let n = this.serializeNodeInner(e, t);
		for (let r = e.marks.length - 1; r >= 0; r--) {
			let i = this.serializeMark(e.marks[r], e.isInline, t);
			i && ((i.contentDOM || i.dom).appendChild(n), n = i.dom);
		}
		return n;
	}
	serializeMark(e, t, n = {}) {
		let r = this.marks[e.type.name];
		return r && rt($e(n), r(e, t), null, e.attrs);
	}
	static renderSpec(e, t, n = null, r) {
		return typeof t == "string" ? { dom: e.createTextNode(t) } : rt(e, t, n, r);
	}
	static fromSchema(t) {
		return t.cached.domSerializer || (t.cached.domSerializer = new e(this.nodesFromSchema(t), this.marksFromSchema(t)));
	}
	static nodesFromSchema(e) {
		let t = Qe(e.nodes);
		return t.text ||= (e) => e.text, t;
	}
	static marksFromSchema(e) {
		return Qe(e.marks);
	}
};
function Qe(e) {
	let t = {};
	for (let n in e) {
		let r = e[n].spec.toDOM;
		r && (t[n] = r);
	}
	return t;
}
function $e(e) {
	return e.document || window.document;
}
var et = /* @__PURE__ */ new WeakMap();
function tt(e) {
	let t = et.get(e);
	return t === void 0 && et.set(e, t = nt(e)), t;
}
function nt(e) {
	let t = null;
	function n(e) {
		if (e && typeof e == "object") {
			if (Array.isArray(e)) {
				if (typeof e[0] == "string") t ||= [], t.push(e);
				else for (let t = 0; t < e.length; t++) n(e[t]);
			} else for (let t in e) n(e[t]);
		}
	}
	return n(e), t;
}
function rt(e, t, n, r) {
	if (t.nodeType == 1) return { dom: t };
	if (t.dom && t.dom.nodeType == 1) return t;
	let i = t[0], a;
	if (typeof i != "string") throw RangeError("Invalid array passed to renderSpec");
	if (r && (a = tt(r)) && a.indexOf(t) > -1) throw RangeError("Using an array from an attribute object as a DOM spec. This may be an attempted cross site scripting attack.");
	let o = i.indexOf(" ");
	o > 0 && (n = i.slice(0, o), i = i.slice(o + 1));
	let s, c = n ? e.createElementNS(n, i) : e.createElement(i), l = t[1], u = 1;
	if (l && typeof l == "object" && l.nodeType == null && !Array.isArray(l)) {
		u = 2;
		for (let e in l) if (l[e] != null) {
			let t = e.indexOf(" ");
			t > 0 ? c.setAttributeNS(e.slice(0, t), e.slice(t + 1), l[e]) : e == "style" && c.style ? c.style.cssText = l[e] : c.setAttribute(e, l[e]);
		}
	}
	for (let i = u; i < t.length; i++) {
		let a = t[i];
		if (a === 0) {
			if (i < t.length - 1 || i > u) throw RangeError("Content hole must be the only child of its parent node");
			return {
				dom: c,
				contentDOM: c
			};
		}
		if (typeof a == "string") c.appendChild(e.createTextNode(a));
		else {
			let { dom: t, contentDOM: i } = rt(e, a, n, r);
			if (c.appendChild(t), i) {
				if (s) throw RangeError("Multiple content holes");
				s = i;
			}
		}
	}
	return {
		dom: c,
		contentDOM: s
	};
}
//#endregion
//#region ../../node_modules/prosemirror-transform/dist/index.js
var it = 65535, at = 2 ** 16;
function ot(e, t) {
	return e + t * at;
}
function st(e) {
	return e & it;
}
function ct(e) {
	return (e - (e & it)) / at;
}
var lt = 1, ut = 2, dt = 4, ft = 8, pt = class {
	constructor(e, t, n) {
		this.pos = e, this.delInfo = t, this.recover = n;
	}
	get deleted() {
		return (this.delInfo & ft) > 0;
	}
	get deletedBefore() {
		return (this.delInfo & 5) > 0;
	}
	get deletedAfter() {
		return (this.delInfo & 6) > 0;
	}
	get deletedAcross() {
		return (this.delInfo & dt) > 0;
	}
}, mt = class e {
	constructor(t, n = !1) {
		if (this.ranges = t, this.inverted = n, !t.length && e.empty) return e.empty;
	}
	recover(e) {
		let t = 0, n = st(e);
		if (!this.inverted) for (let e = 0; e < n; e++) t += this.ranges[e * 3 + 2] - this.ranges[e * 3 + 1];
		return this.ranges[n * 3] + t + ct(e);
	}
	mapResult(e, t = 1) {
		return this._map(e, t, !1);
	}
	map(e, t = 1) {
		return this._map(e, t, !0);
	}
	_map(e, t, n) {
		let r = 0, i = this.inverted ? 2 : 1, a = this.inverted ? 1 : 2;
		for (let o = 0; o < this.ranges.length; o += 3) {
			let s = this.ranges[o] - (this.inverted ? r : 0);
			if (s > e) break;
			let c = this.ranges[o + i], l = this.ranges[o + a], u = s + c;
			if (e <= u) {
				let i = c ? e == s ? -1 : e == u ? 1 : t : t, a = s + r + (i < 0 ? 0 : l);
				if (n) return a;
				let d = e == (t < 0 ? s : u) ? null : ot(o / 3, e - s), f = e == s ? ut : e == u ? lt : dt;
				return (t < 0 ? e != s : e != u) && (f |= ft), new pt(a, f, d);
			}
			r += l - c;
		}
		return n ? e + r : new pt(e + r, 0, null);
	}
	touches(e, t) {
		let n = 0, r = st(t), i = this.inverted ? 2 : 1, a = this.inverted ? 1 : 2;
		for (let t = 0; t < this.ranges.length; t += 3) {
			let o = this.ranges[t] - (this.inverted ? n : 0);
			if (o > e) break;
			let s = this.ranges[t + i];
			if (e <= o + s && t == r * 3) return !0;
			n += this.ranges[t + a] - s;
		}
		return !1;
	}
	forEach(e) {
		let t = this.inverted ? 2 : 1, n = this.inverted ? 1 : 2;
		for (let r = 0, i = 0; r < this.ranges.length; r += 3) {
			let a = this.ranges[r], o = a - (this.inverted ? i : 0), s = a + (this.inverted ? 0 : i), c = this.ranges[r + t], l = this.ranges[r + n];
			e(o, o + c, s, s + l), i += l - c;
		}
	}
	invert() {
		return new e(this.ranges, !this.inverted);
	}
	toString() {
		return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
	}
	static offset(t) {
		return t == 0 ? e.empty : new e(t < 0 ? [
			0,
			-t,
			0
		] : [
			0,
			0,
			t
		]);
	}
};
mt.empty = new mt([]);
var ht = class e {
	constructor(e, t, n = 0, r = e ? e.length : 0) {
		this.mirror = t, this.from = n, this.to = r, this._maps = e || [], this.ownData = !(e || t);
	}
	get maps() {
		return this._maps;
	}
	slice(t = 0, n = this.maps.length) {
		return new e(this._maps, this.mirror, t, n);
	}
	appendMap(e, t) {
		this.ownData ||= (this._maps = this._maps.slice(), this.mirror = this.mirror && this.mirror.slice(), !0), this.to = this._maps.push(e), t != null && this.setMirror(this._maps.length - 1, t);
	}
	appendMapping(e) {
		for (let t = 0, n = this._maps.length; t < e._maps.length; t++) {
			let r = e.getMirror(t);
			this.appendMap(e._maps[t], r != null && r < t ? n + r : void 0);
		}
	}
	getMirror(e) {
		if (this.mirror) {
			for (let t = 0; t < this.mirror.length; t++) if (this.mirror[t] == e) return this.mirror[t + (t % 2 ? -1 : 1)];
		}
	}
	setMirror(e, t) {
		this.mirror ||= [], this.mirror.push(e, t);
	}
	appendMappingInverted(e) {
		for (let t = e.maps.length - 1, n = this._maps.length + e._maps.length; t >= 0; t--) {
			let r = e.getMirror(t);
			this.appendMap(e._maps[t].invert(), r != null && r > t ? n - r - 1 : void 0);
		}
	}
	invert() {
		let t = new e();
		return t.appendMappingInverted(this), t;
	}
	map(e, t = 1) {
		if (this.mirror) return this._map(e, t, !0);
		for (let n = this.from; n < this.to; n++) e = this._maps[n].map(e, t);
		return e;
	}
	mapResult(e, t = 1) {
		return this._map(e, t, !1);
	}
	_map(e, t, n) {
		let r = 0;
		for (let n = this.from; n < this.to; n++) {
			let i = this._maps[n].mapResult(e, t);
			if (i.recover != null) {
				let t = this.getMirror(n);
				if (t != null && t > n && t < this.to) {
					n = t, e = this._maps[t].recover(i.recover);
					continue;
				}
			}
			r |= i.delInfo, e = i.pos;
		}
		return n ? e : new pt(e, r, null);
	}
}, gt = Object.create(null), E = class {
	getMap() {
		return mt.empty;
	}
	merge(e) {
		return null;
	}
	static fromJSON(e, t) {
		if (!t || !t.stepType) throw RangeError("Invalid input for Step.fromJSON");
		let n = gt[t.stepType];
		if (!n) throw RangeError(`No step type ${t.stepType} defined`);
		return n.fromJSON(e, t);
	}
	static jsonID(e, t) {
		if (e in gt) throw RangeError("Duplicate use of step JSON ID " + e);
		return gt[e] = t, t.prototype.jsonID = e, t;
	}
}, D = class e {
	constructor(e, t) {
		this.doc = e, this.failed = t;
	}
	static ok(t) {
		return new e(t, null);
	}
	static fail(t) {
		return new e(null, t);
	}
	static fromReplace(t, n, r, i) {
		try {
			return e.ok(t.replace(n, r, i));
		} catch (t) {
			if (t instanceof m) return e.fail(t.message);
			throw t;
		}
	}
};
function _t(e, t, n) {
	let r = [];
	for (let i = 0; i < e.childCount; i++) {
		let a = e.child(i);
		a.content.size && (a = a.copy(_t(a.content, t, a))), a.isInline && (a = t(a, n, i)), r.push(a);
	}
	return l.fromArray(r);
}
var vt = class e extends E {
	constructor(e, t, n) {
		super(), this.from = e, this.to = t, this.mark = n;
	}
	apply(e) {
		let t = e.slice(this.from, this.to), n = e.resolve(this.from), r = n.node(n.sharedDepth(this.to)), i = new h(_t(t.content, (e, t) => !e.isAtom || !t.type.allowsMarkType(this.mark.type) ? e : e.mark(this.mark.addToSet(e.marks)), r), t.openStart, t.openEnd);
		return D.fromReplace(e, this.from, this.to, i);
	}
	invert() {
		return new yt(this.from, this.to, this.mark);
	}
	map(t) {
		let n = t.mapResult(this.from, 1), r = t.mapResult(this.to, -1);
		return n.deleted && r.deleted || n.pos >= r.pos ? null : new e(n.pos, r.pos, this.mark);
	}
	merge(t) {
		return t instanceof e && t.mark.eq(this.mark) && this.from <= t.to && this.to >= t.from ? new e(Math.min(this.from, t.from), Math.max(this.to, t.to), this.mark) : null;
	}
	toJSON() {
		return {
			stepType: "addMark",
			mark: this.mark.toJSON(),
			from: this.from,
			to: this.to
		};
	}
	static fromJSON(t, n) {
		if (typeof n.from != "number" || typeof n.to != "number") throw RangeError("Invalid input for AddMarkStep.fromJSON");
		return new e(n.from, n.to, t.markFromJSON(n.mark));
	}
};
E.jsonID("addMark", vt);
var yt = class e extends E {
	constructor(e, t, n) {
		super(), this.from = e, this.to = t, this.mark = n;
	}
	apply(e) {
		let t = e.slice(this.from, this.to), n = new h(_t(t.content, (e) => e.mark(this.mark.removeFromSet(e.marks)), e), t.openStart, t.openEnd);
		return D.fromReplace(e, this.from, this.to, n);
	}
	invert() {
		return new vt(this.from, this.to, this.mark);
	}
	map(t) {
		let n = t.mapResult(this.from, 1), r = t.mapResult(this.to, -1);
		return n.deleted && r.deleted || n.pos >= r.pos ? null : new e(n.pos, r.pos, this.mark);
	}
	merge(t) {
		return t instanceof e && t.mark.eq(this.mark) && this.from <= t.to && this.to >= t.from ? new e(Math.min(this.from, t.from), Math.max(this.to, t.to), this.mark) : null;
	}
	toJSON() {
		return {
			stepType: "removeMark",
			mark: this.mark.toJSON(),
			from: this.from,
			to: this.to
		};
	}
	static fromJSON(t, n) {
		if (typeof n.from != "number" || typeof n.to != "number") throw RangeError("Invalid input for RemoveMarkStep.fromJSON");
		return new e(n.from, n.to, t.markFromJSON(n.mark));
	}
};
E.jsonID("removeMark", yt);
var bt = class e extends E {
	constructor(e, t) {
		super(), this.pos = e, this.mark = t;
	}
	apply(e) {
		let t = e.nodeAt(this.pos);
		if (!t) return D.fail("No node at mark step's position");
		let n = t.type.create(t.attrs, null, this.mark.addToSet(t.marks));
		return D.fromReplace(e, this.pos, this.pos + 1, new h(l.from(n), 0, +!t.isLeaf));
	}
	invert(t) {
		let n = t.nodeAt(this.pos);
		if (n) {
			let t = this.mark.addToSet(n.marks);
			if (t.length == n.marks.length) {
				for (let r = 0; r < n.marks.length; r++) if (!n.marks[r].isInSet(t)) return new e(this.pos, n.marks[r]);
				return new e(this.pos, this.mark);
			}
		}
		return new xt(this.pos, this.mark);
	}
	map(t) {
		let n = t.mapResult(this.pos, 1);
		return n.deletedAfter ? null : new e(n.pos, this.mark);
	}
	toJSON() {
		return {
			stepType: "addNodeMark",
			pos: this.pos,
			mark: this.mark.toJSON()
		};
	}
	static fromJSON(t, n) {
		if (typeof n.pos != "number") throw RangeError("Invalid input for AddNodeMarkStep.fromJSON");
		return new e(n.pos, t.markFromJSON(n.mark));
	}
};
E.jsonID("addNodeMark", bt);
var xt = class e extends E {
	constructor(e, t) {
		super(), this.pos = e, this.mark = t;
	}
	apply(e) {
		let t = e.nodeAt(this.pos);
		if (!t) return D.fail("No node at mark step's position");
		let n = t.type.create(t.attrs, null, this.mark.removeFromSet(t.marks));
		return D.fromReplace(e, this.pos, this.pos + 1, new h(l.from(n), 0, +!t.isLeaf));
	}
	invert(e) {
		let t = e.nodeAt(this.pos);
		return !t || !this.mark.isInSet(t.marks) ? this : new bt(this.pos, this.mark);
	}
	map(t) {
		let n = t.mapResult(this.pos, 1);
		return n.deletedAfter ? null : new e(n.pos, this.mark);
	}
	toJSON() {
		return {
			stepType: "removeNodeMark",
			pos: this.pos,
			mark: this.mark.toJSON()
		};
	}
	static fromJSON(t, n) {
		if (typeof n.pos != "number") throw RangeError("Invalid input for RemoveNodeMarkStep.fromJSON");
		return new e(n.pos, t.markFromJSON(n.mark));
	}
};
E.jsonID("removeNodeMark", xt);
var St = class e extends E {
	constructor(e, t, n, r = !1) {
		super(), this.from = e, this.to = t, this.slice = n, this.structure = r;
	}
	apply(e) {
		return this.structure && wt(e, this.from, this.to) ? D.fail("Structure replace would overwrite content") : D.fromReplace(e, this.from, this.to, this.slice);
	}
	getMap() {
		return new mt([
			this.from,
			this.to - this.from,
			this.slice.size
		]);
	}
	invert(t) {
		return new e(this.from, this.from + this.slice.size, t.slice(this.from, this.to));
	}
	map(t) {
		let n = t.mapResult(this.to, -1), r = this.from == this.to && e.MAP_BIAS < 0 ? n : t.mapResult(this.from, 1);
		return r.deletedAcross && n.deletedAcross ? null : new e(r.pos, Math.max(r.pos, n.pos), this.slice, this.structure);
	}
	merge(t) {
		if (!(t instanceof e) || t.structure || this.structure) return null;
		if (this.from + this.slice.size == t.from && !this.slice.openEnd && !t.slice.openStart) {
			let n = this.slice.size + t.slice.size == 0 ? h.empty : new h(this.slice.content.append(t.slice.content), this.slice.openStart, t.slice.openEnd);
			return new e(this.from, this.to + (t.to - t.from), n, this.structure);
		}
		if (t.to == this.from && !this.slice.openStart && !t.slice.openEnd) {
			let n = this.slice.size + t.slice.size == 0 ? h.empty : new h(t.slice.content.append(this.slice.content), t.slice.openStart, this.slice.openEnd);
			return new e(t.from, this.to, n, this.structure);
		}
		return null;
	}
	toJSON() {
		let e = {
			stepType: "replace",
			from: this.from,
			to: this.to
		};
		return this.slice.size && (e.slice = this.slice.toJSON()), this.structure && (e.structure = !0), e;
	}
	static fromJSON(t, n) {
		if (typeof n.from != "number" || typeof n.to != "number") throw RangeError("Invalid input for ReplaceStep.fromJSON");
		return new e(n.from, n.to, h.fromJSON(t, n.slice), !!n.structure);
	}
};
St.MAP_BIAS = 1, E.jsonID("replace", St);
var Ct = class e extends E {
	constructor(e, t, n, r, i, a, o = !1) {
		super(), this.from = e, this.to = t, this.gapFrom = n, this.gapTo = r, this.slice = i, this.insert = a, this.structure = o;
	}
	apply(e) {
		if (this.structure && (wt(e, this.from, this.gapFrom) || wt(e, this.gapTo, this.to))) return D.fail("Structure gap-replace would overwrite content");
		let t = e.slice(this.gapFrom, this.gapTo);
		if (t.openStart || t.openEnd) return D.fail("Gap is not a flat range");
		let n = this.slice.insertAt(this.insert, t.content);
		return n ? D.fromReplace(e, this.from, this.to, n) : D.fail("Content does not fit in gap");
	}
	getMap() {
		return new mt([
			this.from,
			this.gapFrom - this.from,
			this.insert,
			this.gapTo,
			this.to - this.gapTo,
			this.slice.size - this.insert
		]);
	}
	invert(t) {
		let n = this.gapTo - this.gapFrom;
		return new e(this.from, this.from + this.slice.size + n, this.from + this.insert, this.from + this.insert + n, t.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
	}
	map(t) {
		let n = t.mapResult(this.from, 1), r = t.mapResult(this.to, -1), i = this.from == this.gapFrom ? n.pos : t.map(this.gapFrom, -1), a = this.to == this.gapTo ? r.pos : t.map(this.gapTo, 1);
		return n.deletedAcross && r.deletedAcross || i < n.pos || a > r.pos ? null : new e(n.pos, r.pos, i, a, this.slice, this.insert, this.structure);
	}
	toJSON() {
		let e = {
			stepType: "replaceAround",
			from: this.from,
			to: this.to,
			gapFrom: this.gapFrom,
			gapTo: this.gapTo,
			insert: this.insert
		};
		return this.slice.size && (e.slice = this.slice.toJSON()), this.structure && (e.structure = !0), e;
	}
	static fromJSON(t, n) {
		if (typeof n.from != "number" || typeof n.to != "number" || typeof n.gapFrom != "number" || typeof n.gapTo != "number" || typeof n.insert != "number") throw RangeError("Invalid input for ReplaceAroundStep.fromJSON");
		return new e(n.from, n.to, n.gapFrom, n.gapTo, h.fromJSON(t, n.slice), n.insert, !!n.structure);
	}
};
E.jsonID("replaceAround", Ct);
function wt(e, t, n) {
	let r = e.resolve(t), i = n - t, a = r.depth;
	for (; i > 0 && a > 0 && r.indexAfter(a) == r.node(a).childCount;) a--, i--;
	if (i > 0) {
		let e = r.node(a).maybeChild(r.indexAfter(a));
		for (; i > 0;) {
			if (!e || e.isLeaf) return !0;
			e = e.firstChild, i--;
		}
	}
	return !1;
}
function Tt(e, t, n, r) {
	let i = [], a = [], o, s;
	e.doc.nodesBetween(t, n, (e, c, l) => {
		if (!e.isInline) return;
		let u = e.marks;
		if (!r.isInSet(u) && l.type.allowsMarkType(r.type)) {
			let l = Math.max(c, t), d = Math.min(c + e.nodeSize, n), f = r.addToSet(u);
			for (let e = 0; e < u.length; e++) u[e].isInSet(f) || (o && o.to == l && o.mark.eq(u[e]) ? o.to = d : i.push(o = new yt(l, d, u[e])));
			s && s.to == l ? s.to = d : a.push(s = new vt(l, d, r));
		}
	}), i.forEach((t) => e.step(t)), a.forEach((t) => e.step(t));
}
function Et(e, t, n, r) {
	let i = [], a = 0;
	e.doc.nodesBetween(t, n, (e, o) => {
		if (!e.isInline) return;
		a++;
		let s = null;
		if (r instanceof Me) {
			let t = e.marks, n;
			for (; n = r.isInSet(t);) (s ||= []).push(n), t = n.removeFromSet(t);
		} else r ? r.isInSet(e.marks) && (s = [r]) : s = e.marks;
		if (s && s.length) {
			let r = Math.min(o + e.nodeSize, n);
			for (let e = 0; e < s.length; e++) {
				let n = s[e], c;
				for (let e = 0; e < i.length; e++) {
					let t = i[e];
					t.step == a - 1 && n.eq(i[e].style) && (c = t);
				}
				c ? (c.to = r, c.step = a) : i.push({
					style: n,
					from: Math.max(o, t),
					to: r,
					step: a
				});
			}
		}
	}), i.forEach((t) => e.step(new yt(t.from, t.to, t.style)));
}
function Dt(e, t, n, r = n.contentMatch, i = !0) {
	let a = e.doc.nodeAt(t), o = [], s = t + 1;
	for (let t = 0; t < a.childCount; t++) {
		let c = a.child(t), u = s + c.nodeSize, d = r.matchType(c.type);
		if (!d) o.push(new St(s, u, h.empty));
		else {
			r = d;
			for (let t = 0; t < c.marks.length; t++) n.allowsMarkType(c.marks[t].type) || e.step(new yt(s, u, c.marks[t]));
			if (i && c.isText && n.whitespace != "pre") {
				let e, t = /\r?\n|\r/g, r;
				for (; e = t.exec(c.text);) r ||= new h(l.from(n.schema.text(" ", n.allowedMarks(c.marks))), 0, 0), o.push(new St(s + e.index, s + e.index + e[0].length, r));
			}
		}
		s = u;
	}
	if (!r.validEnd) {
		let t = r.fillBefore(l.empty, !0);
		e.replace(s, s, new h(t, 0, 0));
	}
	for (let t = o.length - 1; t >= 0; t--) e.step(o[t]);
}
function Ot(e, t, n) {
	return (t == 0 || e.canReplace(t, e.childCount)) && (n == e.childCount || e.canReplace(0, n));
}
function kt(e) {
	let t = e.parent.content.cutByIndex(e.startIndex, e.endIndex);
	for (let n = e.depth, r = 0, i = 0;; --n) {
		let a = e.$from.node(n), o = e.$from.index(n) + r, s = e.$to.indexAfter(n) - i;
		if (n < e.depth && a.canReplace(o, s, t)) return n;
		if (n == 0 || a.type.spec.isolating || !Ot(a, o, s)) break;
		o && (r = 1), s < a.childCount && (i = 1);
	}
	return null;
}
function At(e, t, n) {
	let { $from: r, $to: i, depth: a } = t, o = r.before(a + 1), s = i.after(a + 1), c = o, u = s, d = l.empty, f = 0;
	for (let e = a, t = !1; e > n; e--) t || r.index(e) > 0 ? (t = !0, d = l.from(r.node(e).copy(d)), f++) : c--;
	let p = l.empty, m = 0;
	for (let e = a, t = !1; e > n; e--) t || i.after(e + 1) < i.end(e) ? (t = !0, p = l.from(i.node(e).copy(p)), m++) : u++;
	e.step(new Ct(c, u, o, s, new h(d.append(p), f, m), d.size - f, !0));
}
function jt(e, t, n = null, r = e) {
	let i = Nt(e, t), a = i && Pt(r, t);
	return a ? i.map(Mt).concat({
		type: t,
		attrs: n
	}).concat(a.map(Mt)) : null;
}
function Mt(e) {
	return {
		type: e,
		attrs: null
	};
}
function Nt(e, t) {
	let { parent: n, startIndex: r, endIndex: i } = e, a = n.contentMatchAt(r).findWrapping(t);
	if (!a) return null;
	let o = a.length ? a[0] : t;
	return n.canReplaceWith(r, i, o) ? a : null;
}
function Pt(e, t) {
	let { parent: n, startIndex: r, endIndex: i } = e, a = n.child(r), o = t.contentMatch.findWrapping(a.type);
	if (!o) return null;
	let s = (o.length ? o[o.length - 1] : t).contentMatch;
	for (let e = r; s && e < i; e++) s = s.matchType(n.child(e).type);
	return !s || !s.validEnd ? null : o;
}
function Ft(e, t, n) {
	let r = l.empty;
	for (let e = n.length - 1; e >= 0; e--) {
		if (r.size) {
			let t = n[e].type.contentMatch.matchFragment(r);
			if (!t || !t.validEnd) throw RangeError("Wrapper type given to Transform.wrap does not form valid content of its parent wrapper");
		}
		r = l.from(n[e].type.create(n[e].attrs, r));
	}
	let i = t.start, a = t.end;
	e.step(new Ct(i, a, i, a, new h(r, 0, 0), n.length, !0));
}
function It(e, t, n, r, i) {
	if (!r.isTextblock) throw RangeError("Type given to setBlockType should be a textblock");
	let a = e.steps.length;
	e.doc.nodesBetween(t, n, (t, n) => {
		let o = typeof i == "function" ? i(t) : i;
		if (t.isTextblock && !t.hasMarkup(r, o) && zt(e.doc, e.mapping.slice(a).map(n), r)) {
			let i = null;
			if (r.schema.linebreakReplacement) {
				let e = r.whitespace == "pre", t = !!r.contentMatch.matchType(r.schema.linebreakReplacement);
				e && !t ? i = !1 : !e && t && (i = !0);
			}
			i === !1 && Rt(e, t, n, a), Dt(e, e.mapping.slice(a).map(n, 1), r, void 0, i === null);
			let s = e.mapping.slice(a), c = s.map(n, 1), u = s.map(n + t.nodeSize, 1);
			return e.step(new Ct(c, u, c + 1, u - 1, new h(l.from(r.create(o, null, t.marks)), 0, 0), 1, !0)), i === !0 && Lt(e, t, n, a), !1;
		}
	});
}
function Lt(e, t, n, r) {
	t.forEach((i, a) => {
		if (i.isText) {
			let o, s = /\r?\n|\r/g;
			for (; o = s.exec(i.text);) {
				let i = e.mapping.slice(r).map(n + 1 + a + o.index);
				e.replaceWith(i, i + 1, t.type.schema.linebreakReplacement.create());
			}
		}
	});
}
function Rt(e, t, n, r) {
	t.forEach((i, a) => {
		if (i.type == i.type.schema.linebreakReplacement) {
			let i = e.mapping.slice(r).map(n + 1 + a);
			e.replaceWith(i, i + 1, t.type.schema.text("\n"));
		}
	});
}
function zt(e, t, n) {
	let r = e.resolve(t), i = r.index();
	return r.parent.canReplaceWith(i, i + 1, n);
}
function Bt(e, t, n, r, i) {
	let a = e.doc.nodeAt(t);
	if (!a) throw RangeError("No node at given position");
	n ||= a.type;
	let o = n.create(r, null, i || a.marks);
	if (a.isLeaf) return e.replaceWith(t, t + a.nodeSize, o);
	if (!n.validContent(a.content)) throw RangeError("Invalid content for node type " + n.name);
	e.step(new Ct(t, t + a.nodeSize, t + 1, t + a.nodeSize - 1, new h(l.from(o), 0, 0), 1, !0));
}
function Vt(e, t, n = 1, r) {
	let i = e.resolve(t), a = i.depth - n, o = r && r[r.length - 1] || i.parent;
	if (a < 0 || i.parent.type.spec.isolating || !i.parent.canReplace(i.index(), i.parent.childCount) || !o.type.validContent(i.parent.content.cutByIndex(i.index(), i.parent.childCount))) return !1;
	for (let e = i.depth - 1, t = n - 2; e > a; e--, t--) {
		let n = i.node(e), a = i.index(e);
		if (n.type.spec.isolating) return !1;
		let o = n.content.cutByIndex(a, n.childCount), s = r && r[t + 1];
		s && (o = o.replaceChild(0, s.type.create(s.attrs)));
		let c = r && r[t] || n;
		if (!n.canReplace(a + 1, n.childCount) || !c.type.validContent(o)) return !1;
	}
	let s = i.indexAfter(a), c = r && r[0];
	return i.node(a).canReplaceWith(s, s, c ? c.type : i.node(a + 1).type);
}
function Ht(e, t, n = 1, r) {
	let i = e.doc.resolve(t), a = l.empty, o = l.empty;
	for (let e = i.depth, t = i.depth - n, s = n - 1; e > t; e--, s--) {
		a = l.from(i.node(e).copy(a));
		let t = r && r[s];
		o = l.from(t ? t.type.create(t.attrs, o) : i.node(e).copy(o));
	}
	e.step(new St(t, t, new h(a.append(o), n, n), !0));
}
function Ut(e, t) {
	let n = e.resolve(t), r = n.index();
	return Gt(n.nodeBefore, n.nodeAfter) && n.parent.canReplace(r, r + 1);
}
function Wt(e, t) {
	t.content.size || e.type.compatibleContent(t.type);
	let n = e.contentMatchAt(e.childCount), { linebreakReplacement: r } = e.type.schema;
	for (let i = 0; i < t.childCount; i++) {
		let a = t.child(i), o = a.type == r ? e.type.schema.nodes.text : a.type;
		if (n = n.matchType(o), !n || !e.type.allowsMarks(a.marks)) return !1;
	}
	return n.validEnd;
}
function Gt(e, t) {
	return !!(e && t && !e.isLeaf && Wt(e, t));
}
function Kt(e, t, n = -1) {
	let r = e.resolve(t);
	for (let e = r.depth;; e--) {
		let i, a, o = r.index(e);
		if (e == r.depth ? (i = r.nodeBefore, a = r.nodeAfter) : n > 0 ? (i = r.node(e + 1), o++, a = r.node(e).maybeChild(o)) : (i = r.node(e).maybeChild(o - 1), a = r.node(e + 1)), i && !i.isTextblock && Gt(i, a) && r.node(e).canReplace(o, o + 1)) return t;
		if (e == 0) break;
		t = n < 0 ? r.before(e) : r.after(e);
	}
}
function qt(e, t, n) {
	let r = null, { linebreakReplacement: i } = e.doc.type.schema, a = e.doc.resolve(t - n), o = a.node().type;
	if (i && o.inlineContent) {
		let e = o.whitespace == "pre", t = !!o.contentMatch.matchType(i);
		e && !t ? r = !1 : !e && t && (r = !0);
	}
	let s = e.steps.length;
	if (r === !1) {
		let r = e.doc.resolve(t + n);
		Rt(e, r.node(), r.before(), s);
	}
	o.inlineContent && Dt(e, t + n - 1, o, a.node().contentMatchAt(a.index()), r == null);
	let c = e.mapping.slice(s), l = c.map(t - n);
	if (e.step(new St(l, c.map(t + n, -1), h.empty, !0)), r === !0) {
		let t = e.doc.resolve(l);
		Lt(e, t.node(), t.before(), e.steps.length);
	}
	return e;
}
function Jt(e, t, n) {
	let r = e.resolve(t);
	if (r.parent.canReplaceWith(r.index(), r.index(), n)) return t;
	if (r.parentOffset == 0) for (let e = r.depth - 1; e >= 0; e--) {
		let t = r.index(e);
		if (r.node(e).canReplaceWith(t, t, n)) return r.before(e + 1);
		if (t > 0) return null;
	}
	if (r.parentOffset == r.parent.content.size) for (let e = r.depth - 1; e >= 0; e--) {
		let t = r.indexAfter(e);
		if (r.node(e).canReplaceWith(t, t, n)) return r.after(e + 1);
		if (t < r.node(e).childCount) return null;
	}
	return null;
}
function Yt(e, t, n) {
	let r = e.resolve(t);
	if (!n.content.size) return t;
	let i = n.content;
	for (let e = 0; e < n.openStart; e++) i = i.firstChild.content;
	for (let e = 1; e <= (n.openStart == 0 && n.size ? 2 : 1); e++) for (let t = r.depth; t >= 0; t--) {
		let n = t == r.depth ? 0 : r.pos <= (r.start(t + 1) + r.end(t + 1)) / 2 ? -1 : 1, a = r.index(t) + +(n > 0), o = r.node(t), s = !1;
		if (e == 1) s = o.canReplace(a, a, i);
		else {
			let e = o.contentMatchAt(a).findWrapping(i.firstChild.type);
			s = e && o.canReplaceWith(a, a, e[0]);
		}
		if (s) return n == 0 ? r.pos : n < 0 ? r.before(t + 1) : r.after(t + 1);
	}
	return null;
}
function Xt(e, t, n = t, r = h.empty) {
	if (t == n && !r.size) return null;
	let i = e.resolve(t), a = e.resolve(n);
	return Zt(i, a, r) ? new St(t, n, r) : new Qt(i, a, r).fit();
}
function Zt(e, t, n) {
	return !n.openStart && !n.openEnd && e.start() == t.start() && e.parent.canReplace(e.index(), t.index(), n.content);
}
var Qt = class {
	constructor(e, t, n) {
		this.$from = e, this.$to = t, this.unplaced = n, this.frontier = [], this.placed = l.empty;
		for (let t = 0; t <= e.depth; t++) {
			let n = e.node(t);
			this.frontier.push({
				type: n.type,
				match: n.contentMatchAt(e.indexAfter(t))
			});
		}
		for (let t = e.depth; t > 0; t--) this.placed = l.from(e.node(t).copy(this.placed));
	}
	get depth() {
		return this.frontier.length - 1;
	}
	fit() {
		for (; this.unplaced.size;) {
			let e = this.findFittable();
			e ? this.placeNodes(e) : this.openMore() || this.dropNode();
		}
		let e = this.mustMoveInline(), t = this.placed.size - this.depth - this.$from.depth, n = this.$from, r = this.close(e < 0 ? this.$to : n.doc.resolve(e));
		if (!r) return null;
		let i = this.placed, a = n.depth, o = r.depth;
		for (; a && o && i.childCount == 1;) i = i.firstChild.content, a--, o--;
		let s = new h(i, a, o);
		return e > -1 ? new Ct(n.pos, e, this.$to.pos, this.$to.end(), s, t) : s.size || n.pos != this.$to.pos ? new St(n.pos, r.pos, s) : null;
	}
	findFittable() {
		let e = this.unplaced.openStart;
		for (let t = this.unplaced.content, n = 0, r = this.unplaced.openEnd; n < e; n++) {
			let i = t.firstChild;
			if (t.childCount > 1 && (r = 0), i.type.spec.isolating && r <= n) {
				e = n;
				break;
			}
			t = i.content;
		}
		for (let t = 1; t <= 2; t++) for (let n = t == 1 ? e : this.unplaced.openStart; n >= 0; n--) {
			let e, r = null;
			n ? (r = tn(this.unplaced.content, n - 1).firstChild, e = r.content) : e = this.unplaced.content;
			let i = e.firstChild;
			for (let e = this.depth; e >= 0; e--) {
				let { type: a, match: o } = this.frontier[e], s, c = null;
				if (t == 1 && (i ? o.matchType(i.type) || (c = o.fillBefore(l.from(i), !1)) : r && a.compatibleContent(r.type))) return {
					sliceDepth: n,
					frontierDepth: e,
					parent: r,
					inject: c
				};
				if (t == 2 && i && (s = o.findWrapping(i.type))) return {
					sliceDepth: n,
					frontierDepth: e,
					parent: r,
					wrap: s
				};
				if (r && o.matchType(r.type)) break;
			}
		}
	}
	openMore() {
		let { content: e, openStart: t, openEnd: n } = this.unplaced;
		return sn(e, -1) <= t ? !1 : (this.unplaced.size > 1 && sn(e, 1) > n && n++, this.unplaced = new h(e, t + 1, n), !0);
	}
	dropNode() {
		let { content: e, openStart: t, openEnd: n } = this.unplaced, r = tn(e, t);
		if (r.childCount <= 1 && t > 0) {
			let i = e.size - t <= t + r.size;
			this.unplaced = new h($t(e, t - 1, 1), t - 1, i ? t - 1 : n);
		} else this.unplaced = new h($t(e, t, 1), t, n);
	}
	placeNodes({ sliceDepth: e, frontierDepth: t, parent: n, inject: r, wrap: i }) {
		for (; this.depth > t;) this.closeFrontierNode();
		if (i) for (let e = 0; e < i.length; e++) this.openFrontierNode(i[e]);
		let a = this.unplaced, o = n ? n.content : a.content, s = a.openStart - e, c = 0, u = [], { match: d, type: f } = this.frontier[t];
		if (r) {
			for (let e = 0; e < r.childCount; e++) u.push(r.child(e));
			d = d.matchFragment(r);
		}
		let p = o.size + e - (a.content.size - a.openEnd);
		for (; c < o.childCount;) {
			let e = o.child(c), t = d.matchType(e.type);
			if (!t) break;
			c++, (c > 1 || s == 0 || e.content.size) && (d = t, u.push(nn(e.mark(f.allowedMarks(e.marks)), c == 1 ? s : 0, c == o.childCount ? p : -1)));
		}
		let m = c == o.childCount;
		m || (p = -1), this.placed = en(this.placed, t, l.from(u)), this.frontier[t].match = d, m && p < 0 && n && n.type == this.frontier[this.depth].type && this.frontier.length > 1 && this.closeFrontierNode();
		for (let e = 0, t = o; e < p; e++) {
			let e = t.lastChild;
			this.frontier.push({
				type: e.type,
				match: e.contentMatchAt(e.childCount)
			}), t = e.content;
		}
		this.unplaced = m ? e == 0 ? h.empty : new h($t(a.content, e - 1, 1), e - 1, p < 0 ? a.openEnd : e - 1) : new h($t(a.content, e, c), a.openStart, a.openEnd);
	}
	mustMoveInline() {
		if (!this.$to.parent.isTextblock) return -1;
		let e = this.frontier[this.depth], t;
		if (!e.type.isTextblock || !rn(this.$to, this.$to.depth, e.type, e.match, !1) || this.$to.depth == this.depth && (t = this.findCloseLevel(this.$to)) && t.depth == this.depth) return -1;
		let { depth: n } = this.$to, r = this.$to.after(n);
		for (; n > 1 && r == this.$to.end(--n);) ++r;
		return r;
	}
	findCloseLevel(e) {
		scan: for (let t = Math.min(this.depth, e.depth); t >= 0; t--) {
			let { match: n, type: r } = this.frontier[t], i = t < e.depth && e.end(t + 1) == e.pos + (e.depth - (t + 1)), a = rn(e, t, r, n, i);
			if (a) {
				for (let n = t - 1; n >= 0; n--) {
					let { match: t, type: r } = this.frontier[n], i = rn(e, n, r, t, !0);
					if (!i || i.childCount) continue scan;
				}
				return {
					depth: t,
					fit: a,
					move: i ? e.doc.resolve(e.after(t + 1)) : e
				};
			}
		}
	}
	close(e) {
		let t = this.findCloseLevel(e);
		if (!t) return null;
		for (; this.depth > t.depth;) this.closeFrontierNode();
		t.fit.childCount && (this.placed = en(this.placed, t.depth, t.fit)), e = t.move;
		for (let n = t.depth + 1; n <= e.depth; n++) {
			let t = e.node(n), r = t.type.contentMatch.fillBefore(t.content, !0, e.index(n));
			this.openFrontierNode(t.type, t.attrs, r);
		}
		return e;
	}
	openFrontierNode(e, t = null, n) {
		let r = this.frontier[this.depth];
		r.match = r.match.matchType(e), this.placed = en(this.placed, this.depth, l.from(e.create(t, n))), this.frontier.push({
			type: e,
			match: e.contentMatch
		});
	}
	closeFrontierNode() {
		let e = this.frontier.pop().match.fillBefore(l.empty, !0);
		e.childCount && (this.placed = en(this.placed, this.frontier.length, e));
	}
};
function $t(e, t, n) {
	return t == 0 ? e.cutByIndex(n, e.childCount) : e.replaceChild(0, e.firstChild.copy($t(e.firstChild.content, t - 1, n)));
}
function en(e, t, n) {
	return t == 0 ? e.append(n) : e.replaceChild(e.childCount - 1, e.lastChild.copy(en(e.lastChild.content, t - 1, n)));
}
function tn(e, t) {
	for (let n = 0; n < t; n++) e = e.firstChild.content;
	return e;
}
function nn(e, t, n) {
	if (t <= 0) return e;
	let r = e.content;
	return t > 1 && (r = r.replaceChild(0, nn(r.firstChild, t - 1, r.childCount == 1 ? n - 1 : 0))), t > 0 && (r = e.type.contentMatch.fillBefore(r).append(r), n <= 0 && (r = r.append(e.type.contentMatch.matchFragment(r).fillBefore(l.empty, !0)))), e.copy(r);
}
function rn(e, t, n, r, i) {
	let a = e.node(t), o = i ? e.indexAfter(t) : e.index(t);
	if (o == a.childCount && !n.compatibleContent(a.type)) return null;
	let s = r.fillBefore(a.content, !0, o);
	return s && !an(n, a.content, o) ? s : null;
}
function an(e, t, n) {
	for (let r = n; r < t.childCount; r++) if (!e.allowsMarks(t.child(r).marks)) return !0;
	return !1;
}
function on(e) {
	return e.spec.defining || e.spec.definingForContent;
}
function sn(e, t) {
	for (let n = 0;; n++) {
		let r = t < 0 ? e.firstChild : e.lastChild;
		if (!r || r.isAtom) return n;
		e = r.content;
	}
}
function cn(e, t, n, r) {
	if (!r.size) return e.deleteRange(t, n);
	let i = e.doc.resolve(t), a = e.doc.resolve(n);
	if (Zt(i, a, r)) return e.step(new St(t, n, r));
	let o = fn(i, a);
	o[o.length - 1] == 0 && o.pop();
	let s = -(i.depth + 1);
	o.unshift(s);
	for (let e = i.depth, t = i.pos - 1; e > 0; e--, t--) {
		let n = i.node(e).type.spec;
		if (n.defining || n.definingAsContext || n.isolating) break;
		o.indexOf(e) > -1 ? s = e : i.before(e) == t && o.splice(1, 0, -e);
	}
	let c = o.indexOf(s), l = [], u = r.openStart;
	for (let e = r.content, t = 0;; t++) {
		let n = e.firstChild;
		if (l.push(n), t == r.openStart) break;
		e = n.content;
	}
	for (let e = u - 1; e >= 0; e--) {
		let t = l[e], n = on(t.type);
		if (n && !t.sameMarkup(i.node(Math.abs(s) - 1))) u = e;
		else if (n || !t.type.isTextblock) break;
	}
	for (let t = r.openStart; t >= 0; t--) {
		let s = (t + u + 1) % (r.openStart + 1), d = l[s];
		if (d) for (let t = 0; t < o.length; t++) {
			let l = o[(t + c) % o.length], u = !0;
			l < 0 && (u = !1, l = -l);
			let f = i.node(l - 1), p = i.index(l - 1);
			if (f.canReplaceWith(p, p, d.type, d.marks)) return e.replace(i.before(l), u ? a.after(l) : n, new h(ln(r.content, 0, r.openStart, s), s, r.openEnd));
		}
	}
	let d = e.steps.length;
	for (let s = o.length - 1; s >= 0 && (e.replace(t, n, r), !(e.steps.length > d)); s--) {
		let e = o[s];
		e < 0 || (t = i.before(e), n = a.after(e));
	}
}
function ln(e, t, n, r, i) {
	if (t < n) {
		let i = e.firstChild;
		e = e.replaceChild(0, i.copy(ln(i.content, t + 1, n, r, i)));
	}
	if (t > r) {
		let t = i.contentMatchAt(0), n = t.fillBefore(e).append(e);
		e = n.append(t.matchFragment(n).fillBefore(l.empty, !0));
	}
	return e;
}
function un(e, t, n, r) {
	if (!r.isInline && t == n && e.doc.resolve(t).parent.content.size) {
		let i = Jt(e.doc, t, r.type);
		i != null && (t = n = i);
	}
	e.replaceRange(t, n, new h(l.from(r), 0, 0));
}
function dn(e, t, n) {
	let r = e.doc.resolve(t), i = e.doc.resolve(n);
	if (r.parent.isTextblock && i.parent.isTextblock && r.start() != i.start() && r.parentOffset == 0 && i.parentOffset == 0) {
		let a = r.sharedDepth(n), o = !1;
		for (let e = r.depth; e > a; e--) r.node(e).type.spec.isolating && (o = !0);
		for (let e = i.depth; e > a; e--) i.node(e).type.spec.isolating && (o = !0);
		if (!o) {
			for (let e = r.depth; e > 0 && t == r.start(e); e--) t = r.before(e);
			for (let e = i.depth; e > 0 && n == i.start(e); e--) n = i.before(e);
			r = e.doc.resolve(t), i = e.doc.resolve(n);
		}
	}
	let a = fn(r, i);
	for (let t = 0; t < a.length; t++) {
		let n = a[t], o = t == a.length - 1;
		if (o && n == 0 || r.node(n).type.contentMatch.validEnd) return e.delete(r.start(n), i.end(n));
		if (n > 0 && (o || r.node(n - 1).canReplace(r.index(n - 1), i.indexAfter(n - 1)))) return e.delete(r.before(n), i.after(n));
	}
	for (let a = 1; a <= r.depth && a <= i.depth; a++) if (t - r.start(a) == r.depth - a && n > r.end(a) && i.end(a) - n != i.depth - a && r.start(a - 1) == i.start(a - 1) && r.node(a - 1).canReplace(r.index(a - 1), i.index(a - 1))) return e.delete(r.before(a), n);
	e.delete(t, n);
}
function fn(e, t) {
	let n = [], r = Math.min(e.depth, t.depth);
	for (let i = r; i >= 0; i--) {
		let r = e.start(i);
		if (r < e.pos - (e.depth - i) || t.end(i) > t.pos + (t.depth - i) || e.node(i).type.spec.isolating || t.node(i).type.spec.isolating) break;
		(r == t.start(i) || i == e.depth && i == t.depth && e.parent.inlineContent && t.parent.inlineContent && i && t.start(i - 1) == r - 1) && n.push(i);
	}
	return n;
}
var pn = class e extends E {
	constructor(e, t, n) {
		super(), this.pos = e, this.attr = t, this.value = n;
	}
	apply(e) {
		let t = e.nodeAt(this.pos);
		if (!t) return D.fail("No node at attribute step's position");
		let n = Object.create(null);
		for (let e in t.attrs) n[e] = t.attrs[e];
		n[this.attr] = this.value;
		let r = t.type.create(n, null, t.marks);
		return D.fromReplace(e, this.pos, this.pos + 1, new h(l.from(r), 0, +!t.isLeaf));
	}
	getMap() {
		return mt.empty;
	}
	invert(t) {
		return new e(this.pos, this.attr, t.nodeAt(this.pos).attrs[this.attr]);
	}
	map(t) {
		let n = t.mapResult(this.pos, 1);
		return n.deletedAfter ? null : new e(n.pos, this.attr, this.value);
	}
	toJSON() {
		return {
			stepType: "attr",
			pos: this.pos,
			attr: this.attr,
			value: this.value
		};
	}
	static fromJSON(t, n) {
		if (typeof n.pos != "number" || typeof n.attr != "string") throw RangeError("Invalid input for AttrStep.fromJSON");
		return new e(n.pos, n.attr, n.value);
	}
};
E.jsonID("attr", pn);
var mn = class e extends E {
	constructor(e, t) {
		super(), this.attr = e, this.value = t;
	}
	apply(e) {
		let t = Object.create(null);
		for (let n in e.attrs) t[n] = e.attrs[n];
		t[this.attr] = this.value;
		let n = e.type.create(t, e.content, e.marks);
		return D.ok(n);
	}
	getMap() {
		return mt.empty;
	}
	invert(t) {
		return new e(this.attr, t.attrs[this.attr]);
	}
	map(e) {
		return this;
	}
	toJSON() {
		return {
			stepType: "docAttr",
			attr: this.attr,
			value: this.value
		};
	}
	static fromJSON(t, n) {
		if (typeof n.attr != "string") throw RangeError("Invalid input for DocAttrStep.fromJSON");
		return new e(n.attr, n.value);
	}
};
E.jsonID("docAttr", mn);
var hn = class extends Error {};
hn = function e(t) {
	let n = Error.call(this, t);
	return n.__proto__ = e.prototype, n;
}, hn.prototype = Object.create(Error.prototype), hn.prototype.constructor = hn, hn.prototype.name = "TransformError";
var gn = class {
	constructor(e) {
		this.doc = e, this.steps = [], this.docs = [], this.mapping = new ht();
	}
	get before() {
		return this.docs.length ? this.docs[0] : this.doc;
	}
	step(e) {
		let t = this.maybeStep(e);
		if (t.failed) throw new hn(t.failed);
		return this;
	}
	maybeStep(e) {
		let t = e.apply(this.doc);
		return t.failed || this.addStep(e, t.doc), t;
	}
	get docChanged() {
		return this.steps.length > 0;
	}
	changedRange() {
		let e = 1e9, t = -1e9;
		for (let n = 0; n < this.mapping.maps.length; n++) {
			let r = this.mapping.maps[n];
			n && (e = r.map(e, 1), t = r.map(t, -1)), r.forEach((n, r, i, a) => {
				e = Math.min(e, i), t = Math.max(t, a);
			});
		}
		return e == 1e9 ? null : {
			from: e,
			to: t
		};
	}
	addStep(e, t) {
		this.docs.push(this.doc), this.steps.push(e), this.mapping.appendMap(e.getMap()), this.doc = t;
	}
	replace(e, t = e, n = h.empty) {
		let r = Xt(this.doc, e, t, n);
		return r && this.step(r), this;
	}
	replaceWith(e, t, n) {
		return this.replace(e, t, new h(l.from(n), 0, 0));
	}
	delete(e, t) {
		return this.replace(e, t, h.empty);
	}
	insert(e, t) {
		return this.replaceWith(e, e, t);
	}
	replaceRange(e, t, n) {
		return cn(this, e, t, n), this;
	}
	replaceRangeWith(e, t, n) {
		return un(this, e, t, n), this;
	}
	deleteRange(e, t) {
		return dn(this, e, t), this;
	}
	lift(e, t) {
		return At(this, e, t), this;
	}
	join(e, t = 1) {
		return qt(this, e, t), this;
	}
	wrap(e, t) {
		return Ft(this, e, t), this;
	}
	setBlockType(e, t = e, n, r = null) {
		return It(this, e, t, n, r), this;
	}
	setNodeMarkup(e, t, n = null, r) {
		return Bt(this, e, t, n, r), this;
	}
	setNodeAttribute(e, t, n) {
		return this.step(new pn(e, t, n)), this;
	}
	setDocAttribute(e, t) {
		return this.step(new mn(e, t)), this;
	}
	addNodeMark(e, t) {
		return this.step(new bt(e, t)), this;
	}
	removeNodeMark(e, t) {
		let n = this.doc.nodeAt(e);
		if (!n) throw RangeError("No node at position " + e);
		if (t instanceof p) t.isInSet(n.marks) && this.step(new xt(e, t));
		else {
			let r = n.marks, i, a = [];
			for (; i = t.isInSet(r);) a.push(new xt(e, i)), r = i.removeFromSet(r);
			for (let e = a.length - 1; e >= 0; e--) this.step(a[e]);
		}
		return this;
	}
	split(e, t = 1, n) {
		return Ht(this, e, t, n), this;
	}
	addMark(e, t, n) {
		return Tt(this, e, t, n), this;
	}
	removeMark(e, t, n) {
		return Et(this, e, t, n), this;
	}
	clearIncompatible(e, t, n) {
		return Dt(this, e, t, n), this;
	}
}, _n = /* @__PURE__ */ t({
	AddMarkStep: () => vt,
	AddNodeMarkStep: () => bt,
	AttrStep: () => pn,
	DocAttrStep: () => mn,
	MapResult: () => pt,
	Mapping: () => ht,
	RemoveMarkStep: () => yt,
	RemoveNodeMarkStep: () => xt,
	ReplaceAroundStep: () => Ct,
	ReplaceStep: () => St,
	Step: () => E,
	StepMap: () => mt,
	StepResult: () => D,
	Transform: () => gn,
	TransformError: () => hn,
	canJoin: () => Ut,
	canSplit: () => Vt,
	dropPoint: () => Yt,
	findWrapping: () => jt,
	insertPoint: () => Jt,
	joinPoint: () => Kt,
	liftTarget: () => kt,
	replaceStep: () => Xt
}), vn = Object.create(null), O = class {
	constructor(e, t, n) {
		this.$anchor = e, this.$head = t, this.ranges = n || [new yn(e.min(t), e.max(t))];
	}
	get anchor() {
		return this.$anchor.pos;
	}
	get head() {
		return this.$head.pos;
	}
	get from() {
		return this.$from.pos;
	}
	get to() {
		return this.$to.pos;
	}
	get $from() {
		return this.ranges[0].$from;
	}
	get $to() {
		return this.ranges[0].$to;
	}
	get empty() {
		let e = this.ranges;
		for (let t = 0; t < e.length; t++) if (e[t].$from.pos != e[t].$to.pos) return !1;
		return !0;
	}
	content() {
		return this.$from.doc.slice(this.from, this.to, !0);
	}
	replace(e, t = h.empty) {
		let n = t.content.lastChild, r = null;
		for (let e = 0; e < t.openEnd; e++) r = n, n = n.lastChild;
		let i = e.steps.length, a = this.ranges;
		for (let o = 0; o < a.length; o++) {
			let { $from: s, $to: c } = a[o], l = e.mapping.slice(i);
			e.replaceRange(l.map(s.pos), l.map(c.pos), o ? h.empty : t), o == 0 && Dn(e, i, (n ? n.isInline : r && r.isTextblock) ? -1 : 1);
		}
	}
	replaceWith(e, t) {
		let n = e.steps.length, r = this.ranges;
		for (let i = 0; i < r.length; i++) {
			let { $from: a, $to: o } = r[i], s = e.mapping.slice(n), c = s.map(a.pos), l = s.map(o.pos);
			i ? e.deleteRange(c, l) : (e.replaceRangeWith(c, l, t), Dn(e, n, t.isInline ? -1 : 1));
		}
	}
	static findFrom(e, t, n = !1) {
		let r = e.parent.inlineContent ? new k(e) : En(e.node(0), e.parent, e.pos, e.index(), t, n);
		if (r) return r;
		for (let r = e.depth - 1; r >= 0; r--) {
			let i = t < 0 ? En(e.node(0), e.node(r), e.before(r + 1), e.index(r), t, n) : En(e.node(0), e.node(r), e.after(r + 1), e.index(r) + 1, t, n);
			if (i) return i;
		}
		return null;
	}
	static near(e, t = 1) {
		return this.findFrom(e, t) || this.findFrom(e, -t) || new wn(e.node(0));
	}
	static atStart(e) {
		return En(e, e, 0, 0, 1) || new wn(e);
	}
	static atEnd(e) {
		return En(e, e, e.content.size, e.childCount, -1) || new wn(e);
	}
	static fromJSON(e, t) {
		if (!t || !t.type) throw RangeError("Invalid input for Selection.fromJSON");
		let n = vn[t.type];
		if (!n) throw RangeError(`No selection type ${t.type} defined`);
		return n.fromJSON(e, t);
	}
	static jsonID(e, t) {
		if (e in vn) throw RangeError("Duplicate use of selection JSON ID " + e);
		return vn[e] = t, t.prototype.jsonID = e, t;
	}
	getBookmark() {
		return k.between(this.$anchor, this.$head).getBookmark();
	}
};
O.prototype.visible = !0;
var yn = class {
	constructor(e, t) {
		this.$from = e, this.$to = t;
	}
}, bn = !1;
function xn(e) {
	!bn && !e.parent.inlineContent && (bn = !0, console.warn("TextSelection endpoint not pointing into a node with inline content (" + e.parent.type.name + ")"));
}
var k = class e extends O {
	constructor(e, t = e) {
		xn(e), xn(t), super(e, t);
	}
	get $cursor() {
		return this.$anchor.pos == this.$head.pos ? this.$head : null;
	}
	map(t, n) {
		let r = t.resolve(n.map(this.head));
		if (!r.parent.inlineContent) return O.near(r);
		let i = t.resolve(n.map(this.anchor));
		return new e(i.parent.inlineContent ? i : r, r);
	}
	replace(e, t = h.empty) {
		if (super.replace(e, t), t == h.empty) {
			let t = this.$from.marksAcross(this.$to);
			t && e.ensureMarks(t);
		}
	}
	eq(t) {
		return t instanceof e && t.anchor == this.anchor && t.head == this.head;
	}
	getBookmark() {
		return new Sn(this.anchor, this.head);
	}
	toJSON() {
		return {
			type: "text",
			anchor: this.anchor,
			head: this.head
		};
	}
	static fromJSON(t, n) {
		if (typeof n.anchor != "number" || typeof n.head != "number") throw RangeError("Invalid input for TextSelection.fromJSON");
		return new e(t.resolve(n.anchor), t.resolve(n.head));
	}
	static create(e, t, n = t) {
		let r = e.resolve(t);
		return new this(r, n == t ? r : e.resolve(n));
	}
	static between(t, n, r) {
		let i = t.pos - n.pos;
		if ((!r || i) && (r = i >= 0 ? 1 : -1), !n.parent.inlineContent) {
			let e = O.findFrom(n, r, !0) || O.findFrom(n, -r, !0);
			if (e) n = e.$head;
			else return O.near(n, r);
		}
		return t.parent.inlineContent || (i == 0 ? t = n : (t = (O.findFrom(t, -r, !0) || O.findFrom(t, r, !0)).$anchor, t.pos < n.pos != i < 0 && (t = n))), new e(t, n);
	}
};
O.jsonID("text", k);
var Sn = class e {
	constructor(e, t) {
		this.anchor = e, this.head = t;
	}
	map(t) {
		return new e(t.map(this.anchor), t.map(this.head));
	}
	resolve(e) {
		return k.between(e.resolve(this.anchor), e.resolve(this.head));
	}
}, A = class e extends O {
	constructor(e) {
		let t = e.nodeAfter, n = e.node(0).resolve(e.pos + t.nodeSize);
		super(e, n), this.node = t;
	}
	map(t, n) {
		let { deleted: r, pos: i } = n.mapResult(this.anchor), a = t.resolve(i);
		return r ? O.near(a) : new e(a);
	}
	content() {
		return new h(l.from(this.node), 0, 0);
	}
	eq(t) {
		return t instanceof e && t.anchor == this.anchor;
	}
	toJSON() {
		return {
			type: "node",
			anchor: this.anchor
		};
	}
	getBookmark() {
		return new Cn(this.anchor);
	}
	static fromJSON(t, n) {
		if (typeof n.anchor != "number") throw RangeError("Invalid input for NodeSelection.fromJSON");
		return new e(t.resolve(n.anchor));
	}
	static create(t, n) {
		return new e(t.resolve(n));
	}
	static isSelectable(e) {
		return !e.isText && e.type.spec.selectable !== !1;
	}
};
A.prototype.visible = !1, O.jsonID("node", A);
var Cn = class e {
	constructor(e) {
		this.anchor = e;
	}
	map(t) {
		let { deleted: n, pos: r } = t.mapResult(this.anchor);
		return n ? new Sn(r, r) : new e(r);
	}
	resolve(e) {
		let t = e.resolve(this.anchor), n = t.nodeAfter;
		return n && A.isSelectable(n) ? new A(t) : O.near(t);
	}
}, wn = class e extends O {
	constructor(e) {
		super(e.resolve(0), e.resolve(e.content.size));
	}
	replace(e, t = h.empty) {
		if (t == h.empty) {
			e.delete(0, e.doc.content.size);
			let t = O.atStart(e.doc);
			t.eq(e.selection) || e.setSelection(t);
		} else super.replace(e, t);
	}
	toJSON() {
		return { type: "all" };
	}
	static fromJSON(t) {
		return new e(t);
	}
	map(t) {
		return new e(t);
	}
	eq(t) {
		return t instanceof e;
	}
	getBookmark() {
		return Tn;
	}
};
O.jsonID("all", wn);
var Tn = {
	map() {
		return this;
	},
	resolve(e) {
		return new wn(e);
	}
};
function En(e, t, n, r, i, a = !1) {
	if (t.inlineContent) return k.create(e, n);
	for (let o = r - (i > 0 ? 0 : 1); i > 0 ? o < t.childCount : o >= 0; o += i) {
		let r = t.child(o);
		if (!r.isAtom) {
			let t = En(e, r, n + i, i < 0 ? r.childCount : 0, i, a);
			if (t) return t;
		} else if (!a && A.isSelectable(r)) return A.create(e, n - (i < 0 ? r.nodeSize : 0));
		n += r.nodeSize * i;
	}
	return null;
}
function Dn(e, t, n) {
	let r = e.steps.length - 1;
	if (r < t) return;
	let i = e.steps[r];
	if (!(i instanceof St || i instanceof Ct)) return;
	let a = e.mapping.maps[r], o;
	a.forEach((e, t, n, r) => {
		o ??= r;
	}), e.setSelection(O.near(e.doc.resolve(o), n));
}
var On = 1, kn = 2, An = 4, jn = class extends gn {
	constructor(e) {
		super(e.doc), this.curSelectionFor = 0, this.updated = 0, this.meta = Object.create(null), this.time = Date.now(), this.curSelection = e.selection, this.storedMarks = e.storedMarks;
	}
	get selection() {
		return this.curSelectionFor < this.steps.length && (this.curSelection = this.curSelection.map(this.doc, this.mapping.slice(this.curSelectionFor)), this.curSelectionFor = this.steps.length), this.curSelection;
	}
	setSelection(e) {
		if (e.$from.doc != this.doc) throw RangeError("Selection passed to setSelection must point at the current document");
		return this.curSelection = e, this.curSelectionFor = this.steps.length, this.updated = (this.updated | On) & -3, this.storedMarks = null, this;
	}
	get selectionSet() {
		return (this.updated & On) > 0;
	}
	setStoredMarks(e) {
		return this.storedMarks = e, this.updated |= kn, this;
	}
	ensureMarks(e) {
		return p.sameSet(this.storedMarks || this.selection.$from.marks(), e) || this.setStoredMarks(e), this;
	}
	addStoredMark(e) {
		return this.ensureMarks(e.addToSet(this.storedMarks || this.selection.$head.marks()));
	}
	removeStoredMark(e) {
		return this.ensureMarks(e.removeFromSet(this.storedMarks || this.selection.$head.marks()));
	}
	get storedMarksSet() {
		return (this.updated & kn) > 0;
	}
	addStep(e, t) {
		super.addStep(e, t), this.updated &= -3, this.storedMarks = null;
	}
	setTime(e) {
		return this.time = e, this;
	}
	replaceSelection(e) {
		return this.selection.replace(this, e), this;
	}
	replaceSelectionWith(e, t = !0) {
		let n = this.selection;
		return t && (e = e.mark(this.storedMarks || (n.empty ? n.$from.marks() : n.$from.marksAcross(n.$to) || p.none))), n.replaceWith(this, e), this;
	}
	deleteSelection() {
		return this.selection.replace(this), this;
	}
	insertText(e, t, n) {
		let r = this.doc.type.schema;
		if (t == null) return e ? this.replaceSelectionWith(r.text(e), !0) : this.deleteSelection();
		{
			if (n ??= t, !e) return this.deleteRange(t, n);
			let i = this.storedMarks;
			if (!i) {
				let e = this.doc.resolve(t);
				i = n == t ? e.marks() : e.marksAcross(this.doc.resolve(n));
			}
			return this.replaceRangeWith(t, n, r.text(e, i)), !this.selection.empty && this.selection.to == t + e.length && this.setSelection(O.near(this.selection.$to)), this;
		}
	}
	setMeta(e, t) {
		return this.meta[typeof e == "string" ? e : e.key] = t, this;
	}
	getMeta(e) {
		return this.meta[typeof e == "string" ? e : e.key];
	}
	get isGeneric() {
		for (let e in this.meta) return !1;
		return !0;
	}
	scrollIntoView() {
		return this.updated |= An, this;
	}
	get scrolledIntoView() {
		return (this.updated & An) > 0;
	}
};
function Mn(e, t) {
	return !t || !e ? e : e.bind(t);
}
var Nn = class {
	constructor(e, t, n) {
		this.name = e, this.init = Mn(t.init, n), this.apply = Mn(t.apply, n);
	}
}, Pn = [
	new Nn("doc", {
		init(e) {
			return e.doc || e.schema.topNodeType.createAndFill();
		},
		apply(e) {
			return e.doc;
		}
	}),
	new Nn("selection", {
		init(e, t) {
			return e.selection || O.atStart(t.doc);
		},
		apply(e) {
			return e.selection;
		}
	}),
	new Nn("storedMarks", {
		init(e) {
			return e.storedMarks || null;
		},
		apply(e, t, n, r) {
			return r.selection.$cursor ? e.storedMarks : null;
		}
	}),
	new Nn("scrollToSelection", {
		init() {
			return 0;
		},
		apply(e, t) {
			return e.scrolledIntoView ? t + 1 : t;
		}
	})
], Fn = class {
	constructor(e, t) {
		this.schema = e, this.plugins = [], this.pluginsByKey = Object.create(null), this.fields = Pn.slice(), t && t.forEach((e) => {
			if (this.pluginsByKey[e.key]) throw RangeError("Adding different instances of a keyed plugin (" + e.key + ")");
			this.plugins.push(e), this.pluginsByKey[e.key] = e, e.spec.state && this.fields.push(new Nn(e.key, e.spec.state, e));
		});
	}
}, In = class e {
	constructor(e) {
		this.config = e;
	}
	get schema() {
		return this.config.schema;
	}
	get plugins() {
		return this.config.plugins;
	}
	apply(e) {
		return this.applyTransaction(e).state;
	}
	filterTransaction(e, t = -1) {
		for (let n = 0; n < this.config.plugins.length; n++) if (n != t) {
			let t = this.config.plugins[n];
			if (t.spec.filterTransaction && !t.spec.filterTransaction.call(t, e, this)) return !1;
		}
		return !0;
	}
	applyTransaction(e) {
		if (!this.filterTransaction(e)) return {
			state: this,
			transactions: []
		};
		let t = [e], n = this.applyInner(e), r = null;
		for (;;) {
			let i = !1;
			for (let a = 0; a < this.config.plugins.length; a++) {
				let o = this.config.plugins[a];
				if (o.spec.appendTransaction) {
					let s = r ? r[a].n : 0, c = r ? r[a].state : this, l = s < t.length && o.spec.appendTransaction.call(o, s ? t.slice(s) : t, c, n);
					if (l && n.filterTransaction(l, a)) {
						if (l.setMeta("appendedTransaction", e), !r) {
							r = [];
							for (let e = 0; e < this.config.plugins.length; e++) r.push(e < a ? {
								state: n,
								n: t.length
							} : {
								state: this,
								n: 0
							});
						}
						t.push(l), n = n.applyInner(l), i = !0;
					}
					r && (r[a] = {
						state: n,
						n: t.length
					});
				}
			}
			if (!i) return {
				state: n,
				transactions: t
			};
		}
	}
	applyInner(t) {
		if (!t.before.eq(this.doc)) throw RangeError("Applying a mismatched transaction");
		let n = new e(this.config), r = this.config.fields;
		for (let e = 0; e < r.length; e++) {
			let i = r[e];
			n[i.name] = i.apply(t, this[i.name], this, n);
		}
		return n;
	}
	get tr() {
		return new jn(this);
	}
	static create(t) {
		let n = new Fn(t.doc ? t.doc.type.schema : t.schema, t.plugins), r = new e(n);
		for (let e = 0; e < n.fields.length; e++) r[n.fields[e].name] = n.fields[e].init(t, r);
		return r;
	}
	reconfigure(t) {
		let n = new Fn(this.schema, t.plugins), r = n.fields, i = new e(n);
		for (let e = 0; e < r.length; e++) {
			let n = r[e].name;
			i[n] = this.hasOwnProperty(n) ? this[n] : r[e].init(t, i);
		}
		return i;
	}
	toJSON(e) {
		let t = {
			doc: this.doc.toJSON(),
			selection: this.selection.toJSON()
		};
		if (this.storedMarks && (t.storedMarks = this.storedMarks.map((e) => e.toJSON())), e && typeof e == "object") for (let n in e) {
			if (n == "doc" || n == "selection") throw RangeError("The JSON fields `doc` and `selection` are reserved");
			let r = e[n], i = r.spec.state;
			i && i.toJSON && (t[n] = i.toJSON.call(r, this[r.key]));
		}
		return t;
	}
	static fromJSON(t, n, r) {
		if (!n) throw RangeError("Invalid input for EditorState.fromJSON");
		if (!t.schema) throw RangeError("Required config field 'schema' missing");
		let i = new Fn(t.schema, t.plugins), a = new e(i);
		return i.fields.forEach((e) => {
			if (e.name == "doc") a.doc = ce.fromJSON(t.schema, n.doc);
			else if (e.name == "selection") a.selection = O.fromJSON(a.doc, n.selection);
			else if (e.name == "storedMarks") n.storedMarks && (a.storedMarks = n.storedMarks.map(t.schema.markFromJSON));
			else {
				if (r) for (let i in r) {
					let o = r[i], s = o.spec.state;
					if (o.key == e.name && s && s.fromJSON && Object.prototype.hasOwnProperty.call(n, i)) {
						a[e.name] = s.fromJSON.call(o, t, n[i], a);
						return;
					}
				}
				a[e.name] = e.init(t, a);
			}
		}), a;
	}
};
function Ln(e, t, n) {
	for (let r in e) {
		let i = e[r];
		i instanceof Function ? i = i.bind(t) : r == "handleDOMEvents" && (i = Ln(i, t, {})), n[r] = i;
	}
	return n;
}
var j = class {
	constructor(e) {
		this.spec = e, this.props = {}, e.props && Ln(e.props, this, this.props), this.key = e.key ? e.key.key : zn("plugin");
	}
	getState(e) {
		return e[this.key];
	}
}, Rn = Object.create(null);
function zn(e) {
	return e in Rn ? e + "$" + ++Rn[e] : (Rn[e] = 0, e + "$");
}
var M = class {
	constructor(e = "key") {
		this.key = zn(e);
	}
	get(e) {
		return e.config.pluginsByKey[this.key];
	}
	getState(e) {
		return e[this.key];
	}
}, Bn = (e, t) => !e.selection.empty && (t && t(e.tr.deleteSelection().scrollIntoView()), !0);
function Vn(e, t) {
	let { $cursor: n } = e.selection;
	return !n || (t ? !t.endOfTextblock("backward", e) : n.parentOffset > 0) ? null : n;
}
var Hn = (e, t, n) => {
	let r = Vn(e, n);
	if (!r) return !1;
	let i = Jn(r);
	if (!i) {
		let n = r.blockRange(), i = n && kt(n);
		return i != null && (t && t(e.tr.lift(n, i).scrollIntoView()), !0);
	}
	let a = i.nodeBefore;
	if (pr(e, i, t, -1)) return !0;
	if (r.parent.content.size == 0 && (Kn(a, "end") || A.isSelectable(a))) for (let n = r.depth;; n--) {
		let o = Xt(e.doc, r.before(n), r.after(n), h.empty);
		if (o && o.slice.size < o.to - o.from) {
			if (t) {
				let n = e.tr.step(o);
				n.setSelection(Kn(a, "end") ? O.findFrom(n.doc.resolve(n.mapping.map(i.pos, -1)), -1) : A.create(n.doc, i.pos - a.nodeSize)), t(n.scrollIntoView());
			}
			return !0;
		}
		if (n == 1 || r.node(n - 1).childCount > 1) break;
	}
	return a.isAtom && i.depth == r.depth - 1 ? (t && t(e.tr.delete(i.pos - a.nodeSize, i.pos).scrollIntoView()), !0) : !1;
}, Un = (e, t, n) => {
	let r = Vn(e, n);
	if (!r) return !1;
	let i = Jn(r);
	return i ? Gn(e, i, t) : !1;
}, Wn = (e, t, n) => {
	let r = Yn(e, n);
	if (!r) return !1;
	let i = Qn(r);
	return i ? Gn(e, i, t) : !1;
};
function Gn(e, t, n) {
	let r = t.nodeBefore, i = t.pos - 1;
	for (; !r.isTextblock; i--) {
		if (r.type.spec.isolating) return !1;
		let e = r.lastChild;
		if (!e) return !1;
		r = e;
	}
	let a = t.nodeAfter, o = t.pos + 1;
	for (; !a.isTextblock; o++) {
		if (a.type.spec.isolating) return !1;
		let e = a.firstChild;
		if (!e) return !1;
		a = e;
	}
	let s = Xt(e.doc, i, o, h.empty);
	if (!s || s.from != i || s instanceof St && s.slice.size >= o - i) return !1;
	if (n) {
		let t = e.tr.step(s);
		t.setSelection(k.create(t.doc, i)), n(t.scrollIntoView());
	}
	return !0;
}
function Kn(e, t, n = !1) {
	for (let r = e; r; r = t == "start" ? r.firstChild : r.lastChild) {
		if (r.isTextblock) return !0;
		if (n && r.childCount != 1) return !1;
	}
	return !1;
}
var qn = (e, t, n) => {
	let { $head: r, empty: i } = e.selection, a = r;
	if (!i) return !1;
	if (r.parent.isTextblock) {
		if (n ? !n.endOfTextblock("backward", e) : r.parentOffset > 0) return !1;
		a = Jn(r);
	}
	let o = a && a.nodeBefore;
	return !o || !A.isSelectable(o) ? !1 : (t && t(e.tr.setSelection(A.create(e.doc, a.pos - o.nodeSize)).scrollIntoView()), !0);
};
function Jn(e) {
	if (!e.parent.type.spec.isolating) for (let t = e.depth - 1; t >= 0; t--) {
		if (e.index(t) > 0) return e.doc.resolve(e.before(t + 1));
		if (e.node(t).type.spec.isolating) break;
	}
	return null;
}
function Yn(e, t) {
	let { $cursor: n } = e.selection;
	return !n || (t ? !t.endOfTextblock("forward", e) : n.parentOffset < n.parent.content.size) ? null : n;
}
var Xn = (e, t, n) => {
	let r = Yn(e, n);
	if (!r) return !1;
	let i = Qn(r);
	if (!i) return !1;
	let a = i.nodeAfter;
	if (pr(e, i, t, 1)) return !0;
	if (r.parent.content.size == 0 && (Kn(a, "start") || A.isSelectable(a))) {
		let n = Xt(e.doc, r.before(), r.after(), h.empty);
		if (n && n.slice.size < n.to - n.from) {
			if (t) {
				let r = e.tr.step(n);
				r.setSelection(Kn(a, "start") ? O.findFrom(r.doc.resolve(r.mapping.map(i.pos)), 1) : A.create(r.doc, r.mapping.map(i.pos))), t(r.scrollIntoView());
			}
			return !0;
		}
	}
	return a.isAtom && i.depth == r.depth - 1 ? (t && t(e.tr.delete(i.pos, i.pos + a.nodeSize).scrollIntoView()), !0) : !1;
}, Zn = (e, t, n) => {
	let { $head: r, empty: i } = e.selection, a = r;
	if (!i) return !1;
	if (r.parent.isTextblock) {
		if (n ? !n.endOfTextblock("forward", e) : r.parentOffset < r.parent.content.size) return !1;
		a = Qn(r);
	}
	let o = a && a.nodeAfter;
	return !o || !A.isSelectable(o) ? !1 : (t && t(e.tr.setSelection(A.create(e.doc, a.pos)).scrollIntoView()), !0);
};
function Qn(e) {
	if (!e.parent.type.spec.isolating) for (let t = e.depth - 1; t >= 0; t--) {
		let n = e.node(t);
		if (e.index(t) + 1 < n.childCount) return e.doc.resolve(e.after(t + 1));
		if (n.type.spec.isolating) break;
	}
	return null;
}
var $n = (e, t) => {
	let n = e.selection, r = n instanceof A, i;
	if (r) {
		if (n.node.isTextblock || !Ut(e.doc, n.from)) return !1;
		i = n.from;
	} else if (i = Kt(e.doc, n.from, -1), i == null) return !1;
	if (t) {
		let n = e.tr.join(i);
		r && n.setSelection(A.create(n.doc, i - e.doc.resolve(i).nodeBefore.nodeSize)), t(n.scrollIntoView());
	}
	return !0;
}, er = (e, t) => {
	let n = e.selection, r;
	if (n instanceof A) {
		if (n.node.isTextblock || !Ut(e.doc, n.to)) return !1;
		r = n.to;
	} else if (r = Kt(e.doc, n.to, 1), r == null) return !1;
	return t && t(e.tr.join(r).scrollIntoView()), !0;
}, tr = (e, t) => {
	let { $from: n, $to: r } = e.selection, i = n.blockRange(r), a = i && kt(i);
	return a != null && (t && t(e.tr.lift(i, a).scrollIntoView()), !0);
}, nr = (e, t) => {
	let { $head: n, $anchor: r } = e.selection;
	return !n.parent.type.spec.code || !n.sameParent(r) ? !1 : (t && t(e.tr.insertText("\n").scrollIntoView()), !0);
};
function rr(e) {
	for (let t = 0; t < e.edgeCount; t++) {
		let { type: n } = e.edge(t);
		if (n.isTextblock && !n.hasRequiredAttrs()) return n;
	}
	return null;
}
var ir = (e, t) => {
	let { $head: n, $anchor: r } = e.selection;
	if (!n.parent.type.spec.code || !n.sameParent(r)) return !1;
	let i = n.node(-1), a = n.indexAfter(-1), o = rr(i.contentMatchAt(a));
	if (!o || !i.canReplaceWith(a, a, o)) return !1;
	if (t) {
		let r = n.after(), i = e.tr.replaceWith(r, r, o.createAndFill());
		i.setSelection(O.near(i.doc.resolve(r), 1)), t(i.scrollIntoView());
	}
	return !0;
}, ar = (e, t) => {
	let n = e.selection, { $from: r, $to: i } = n;
	if (n instanceof wn || r.parent.inlineContent || i.parent.inlineContent) return !1;
	let a = rr(i.parent.contentMatchAt(i.indexAfter()));
	if (!a || !a.isTextblock) return !1;
	if (t) {
		let n = (!r.parentOffset && i.index() < i.parent.childCount ? r : i).pos, o = e.tr.insert(n, a.createAndFill());
		o.setSelection(k.create(o.doc, n + 1)), t(o.scrollIntoView());
	}
	return !0;
}, or = (e, t) => {
	let { $cursor: n } = e.selection;
	if (!n || n.parent.content.size) return !1;
	if (n.depth > 1 && n.after() != n.end(-1)) {
		let r = n.before();
		if (Vt(e.doc, r)) return t && t(e.tr.split(r).scrollIntoView()), !0;
	}
	let r = n.blockRange(), i = r && kt(r);
	return i != null && (t && t(e.tr.lift(r, i).scrollIntoView()), !0);
};
function sr(e) {
	return (t, n) => {
		if (t.selection instanceof A && t.selection.node.isBlock) {
			let { $from: e } = t.selection;
			return !e.parentOffset || !Vt(t.doc, e.pos) ? !1 : (n && n(t.tr.split(e.pos).scrollIntoView()), !0);
		}
		if (!t.selection.$from.depth) return !1;
		let r = t.tr;
		!t.selection.empty && (t.selection instanceof k || t.selection instanceof wn) && r.deleteSelection();
		let { $from: i } = r.selection, a = r.steps.length, o = [], s, c, l = !1, u = !1;
		for (let t = i.depth;; t--) if (i.node(t).isBlock) {
			l = i.end(t) == i.pos + (i.depth - t), u = i.start(t) == i.pos - (i.depth - t), c = rr(i.node(t - 1).contentMatchAt(i.indexAfter(t - 1)));
			let n = e && e(i.parent, l, i);
			o.unshift(n || (l && c ? { type: c } : null)), s = t;
			break;
		} else {
			if (t == 1) return !1;
			o.unshift(null);
		}
		let d = i.pos, f = Vt(r.doc, d, o.length, o);
		if (f ||= (o[0] = c ? { type: c } : null, Vt(r.doc, d, o.length, o)), !f) return !1;
		if (r.split(d, o.length, o), !l && u && i.node(s).type != c) {
			let e = r.mapping.slice(a), t = e.map(i.before(s)), n = r.doc.resolve(t);
			c && i.node(s - 1).canReplaceWith(n.index(), n.index() + 1, c) && r.setNodeMarkup(e.map(i.before(s)), c);
		}
		return n && n(r.scrollIntoView()), !0;
	};
}
var cr = sr(), lr = (e, t) => cr(e, t && ((n) => {
	let r = e.storedMarks || e.selection.$to.parentOffset && e.selection.$from.marks();
	r && n.ensureMarks(r), t(n);
})), ur = (e, t) => {
	let { $from: n, to: r } = e.selection, i, a = n.sharedDepth(r);
	return a != 0 && (i = n.before(a), t && t(e.tr.setSelection(A.create(e.doc, i))), !0);
}, dr = (e, t) => (t && t(e.tr.setSelection(new wn(e.doc))), !0);
function fr(e, t, n) {
	let r = t.nodeBefore, i = t.nodeAfter, a = t.index();
	return !r || !i || !r.type.compatibleContent(i.type) ? !1 : !r.content.size && t.parent.canReplace(a - 1, a) ? (n && n(e.tr.delete(t.pos - r.nodeSize, t.pos).scrollIntoView()), !0) : !t.parent.canReplace(a, a + 1) || !(i.isTextblock || Ut(e.doc, t.pos)) ? !1 : (n && n(e.tr.join(t.pos).scrollIntoView()), !0);
}
function pr(e, t, n, r) {
	let i = t.nodeBefore, a = t.nodeAfter, o, s, c = i.type.spec.isolating || a.type.spec.isolating;
	if (!c && fr(e, t, n)) return !0;
	let u = !c && t.parent.canReplace(t.index(), t.index() + 1);
	if (u && (o = (s = i.contentMatchAt(i.childCount)).findWrapping(a.type)) && s.matchType(o[0] || a.type).validEnd) {
		if (n) {
			let r = t.pos + a.nodeSize, s = l.empty;
			for (let e = o.length - 1; e >= 0; e--) s = l.from(o[e].create(null, s));
			s = l.from(i.copy(s));
			let c = e.tr.step(new Ct(t.pos - 1, r, t.pos, r, new h(s, 1, 0), o.length, !0)), u = c.doc.resolve(r + 2 * o.length);
			u.nodeAfter && u.nodeAfter.type == i.type && Ut(c.doc, u.pos) && c.join(u.pos), n(c.scrollIntoView());
		}
		return !0;
	}
	let d = a.type.spec.isolating || r > 0 && c ? null : O.findFrom(t, 1), f = d && d.$from.blockRange(d.$to), p = f && kt(f);
	if (p != null && p >= t.depth) return n && n(e.tr.lift(f, p).scrollIntoView()), !0;
	if (u && Kn(a, "start", !0) && Kn(i, "end")) {
		let r = i, o = [];
		for (; o.push(r), !r.isTextblock;) r = r.lastChild;
		let s = a, c = 1;
		for (; !s.isTextblock; s = s.firstChild) c++;
		if (r.canReplace(r.childCount, r.childCount, s.content)) {
			if (n) {
				let r = l.empty;
				for (let e = o.length - 1; e >= 0; e--) r = l.from(o[e].copy(r));
				n(e.tr.step(new Ct(t.pos - o.length, t.pos + a.nodeSize, t.pos + c, t.pos + a.nodeSize - c, new h(r, o.length, 0), 0, !0)).scrollIntoView());
			}
			return !0;
		}
	}
	return !1;
}
function mr(e) {
	return function(t, n) {
		let r = t.selection, i = e < 0 ? r.$from : r.$to, a = i.depth;
		for (; i.node(a).isInline;) {
			if (!a) return !1;
			a--;
		}
		return i.node(a).isTextblock ? (n && n(t.tr.setSelection(k.create(t.doc, e < 0 ? i.start(a) : i.end(a)))), !0) : !1;
	};
}
var hr = mr(-1), gr = mr(1);
function _r(e, t = null) {
	return function(n, r) {
		let { $from: i, $to: a } = n.selection, o = i.blockRange(a), s = o && jt(o, e, t);
		return s ? (r && r(n.tr.wrap(o, s).scrollIntoView()), !0) : !1;
	};
}
function vr(e, t = null) {
	return function(n, r) {
		let i = !1;
		for (let r = 0; r < n.selection.ranges.length && !i; r++) {
			let { $from: { pos: a }, $to: { pos: o } } = n.selection.ranges[r];
			n.doc.nodesBetween(a, o, (r, a) => {
				if (i) return !1;
				if (r.isTextblock && !r.hasMarkup(e, t)) {
					if (r.type == e) i = !0;
					else {
						let t = n.doc.resolve(a), r = t.index();
						i = t.parent.canReplaceWith(r, r + 1, e);
					}
				}
			});
		}
		if (!i) return !1;
		if (r) {
			let i = n.tr;
			for (let r = 0; r < n.selection.ranges.length; r++) {
				let { $from: { pos: a }, $to: { pos: o } } = n.selection.ranges[r];
				i.setBlockType(a, o, e, t);
			}
			r(i.scrollIntoView());
		}
		return !0;
	};
}
function yr(e, t, n, r) {
	for (let i = 0; i < t.length; i++) {
		let { $from: a, $to: o } = t[i], s = a.depth == 0 && e.inlineContent && e.type.allowsMarkType(n);
		if (e.nodesBetween(a.pos, o.pos, (e, t) => {
			if (s || !r && e.isAtom && e.isInline && t >= a.pos && t + e.nodeSize <= o.pos) return !1;
			s = e.inlineContent && e.type.allowsMarkType(n);
		}), s) return !0;
	}
	return !1;
}
function br(e) {
	let t = [];
	for (let n = 0; n < e.length; n++) {
		let { $from: r, $to: i } = e[n];
		r.doc.nodesBetween(r.pos, i.pos, (e, n) => {
			if (e.isAtom && e.content.size && e.isInline && n >= r.pos && n + e.nodeSize <= i.pos) return n + 1 > r.pos && t.push(new yn(r, r.doc.resolve(n + 1))), r = r.doc.resolve(n + 1 + e.content.size), !1;
		}), r.pos < i.pos && t.push(new yn(r, i));
	}
	return t;
}
function xr(e, t = null, n) {
	let r = (n && n.removeWhenPresent) !== !1, i = (n && n.enterInlineAtoms) !== !1, a = !(n && n.includeWhitespace);
	return function(n, o) {
		let { empty: s, $cursor: c, ranges: l } = n.selection;
		if (s && !c || !yr(n.doc, l, e, i)) return !1;
		if (o) {
			if (c) e.isInSet(n.storedMarks || c.marks()) ? o(n.tr.removeStoredMark(e)) : o(n.tr.addStoredMark(e.create(t)));
			else {
				let s, c = n.tr;
				i || (l = br(l)), s = r ? !l.some((t) => n.doc.rangeHasMark(t.$from.pos, t.$to.pos, e)) : !l.every((t) => {
					let n = !1;
					return c.doc.nodesBetween(t.$from.pos, t.$to.pos, (r, i, a) => {
						if (n) return !1;
						n = !e.isInSet(r.marks) && !!a && a.type.allowsMarkType(e) && !(r.isText && /^\s*$/.test(r.textBetween(Math.max(0, t.$from.pos - i), Math.min(r.nodeSize, t.$to.pos - i))));
					}), !n;
				});
				for (let n = 0; n < l.length; n++) {
					let { $from: r, $to: i } = l[n];
					if (!s) c.removeMark(r.pos, i.pos, e);
					else {
						let n = r.pos, o = i.pos, s = r.nodeAfter, l = i.nodeBefore, u = a && s && s.isText ? /^\s*/.exec(s.text)[0].length : 0, d = a && l && l.isText ? /\s*$/.exec(l.text)[0].length : 0;
						n + u < o && (n += u, o -= d), c.addMark(n, o, e.create(t));
					}
				}
				o(c.scrollIntoView());
			}
		}
		return !0;
	};
}
function Sr(e, t) {
	return (n) => {
		if (!n.isGeneric) return e(n);
		let r = [];
		for (let e = 0; e < n.mapping.maps.length; e++) {
			let t = n.mapping.maps[e];
			for (let e = 0; e < r.length; e++) r[e] = t.map(r[e]);
			t.forEach((e, t, n, i) => r.push(n, i));
		}
		let i = [];
		for (let e = 0; e < r.length; e += 2) {
			let a = r[e], o = r[e + 1], s = n.doc.resolve(a), c = s.sharedDepth(o), l = s.node(c);
			for (let e = s.indexAfter(c), n = s.after(c + 1); n <= o; ++e) {
				let r = l.maybeChild(e);
				if (!r) break;
				if (e && i.indexOf(n) == -1) {
					let a = l.child(e - 1);
					a.type == r.type && t(a, r) && i.push(n);
				}
				n += r.nodeSize;
			}
		}
		i.sort((e, t) => e - t);
		for (let e = i.length - 1; e >= 0; e--) Ut(n.doc, i[e]) && n.join(i[e]);
		e(n);
	};
}
function Cr(e, t) {
	let n = Array.isArray(t) ? (e) => t.indexOf(e.type.name) > -1 : t;
	return (t, r, i) => e(t, r && Sr(r, n), i);
}
function wr(...e) {
	return function(t, n, r) {
		for (let i = 0; i < e.length; i++) if (e[i](t, n, r)) return !0;
		return !1;
	};
}
var Tr = wr(Bn, Hn, qn), Er = wr(Bn, Xn, Zn), Dr = {
	Enter: wr(nr, ar, or, cr),
	"Mod-Enter": ir,
	Backspace: Tr,
	"Mod-Backspace": Tr,
	"Shift-Backspace": Tr,
	Delete: Er,
	"Mod-Delete": Er,
	"Mod-a": dr
}, Or = {
	"Ctrl-h": Dr.Backspace,
	"Alt-Backspace": Dr["Mod-Backspace"],
	"Ctrl-d": Dr.Delete,
	"Ctrl-Alt-Backspace": Dr["Mod-Delete"],
	"Alt-Delete": Dr["Mod-Delete"],
	"Alt-d": Dr["Mod-Delete"],
	"Ctrl-a": hr,
	"Ctrl-e": gr
};
for (let e in Dr) Or[e] = Dr[e];
var kr = (typeof navigator < "u" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os < "u" && os.platform && os.platform() == "darwin") ? Or : Dr, Ar = /* @__PURE__ */ t({
	autoJoin: () => Cr,
	baseKeymap: () => kr,
	chainCommands: () => wr,
	createParagraphNear: () => ar,
	deleteSelection: () => Bn,
	exitCode: () => ir,
	joinBackward: () => Hn,
	joinDown: () => er,
	joinForward: () => Xn,
	joinTextblockBackward: () => Un,
	joinTextblockForward: () => Wn,
	joinUp: () => $n,
	lift: () => tr,
	liftEmptyBlock: () => or,
	macBaseKeymap: () => Or,
	newlineInCode: () => nr,
	pcBaseKeymap: () => Dr,
	selectAll: () => dr,
	selectNodeBackward: () => qn,
	selectNodeForward: () => Zn,
	selectParentNode: () => ur,
	selectTextblockEnd: () => gr,
	selectTextblockStart: () => hr,
	setBlockType: () => vr,
	splitBlock: () => cr,
	splitBlockAs: () => sr,
	splitBlockKeepMarks: () => lr,
	toggleMark: () => xr,
	wrapIn: () => _r
}), jr = /* @__PURE__ */ t({
	AllSelection: () => wn,
	EditorState: () => In,
	NodeSelection: () => A,
	Plugin: () => j,
	PluginKey: () => M,
	Selection: () => O,
	SelectionRange: () => yn,
	TextSelection: () => k,
	Transaction: () => jn
}), Mr = /* @__PURE__ */ t({
	ContentMatch: () => de,
	DOMParser: () => Le,
	DOMSerializer: () => Ze,
	Fragment: () => l,
	Mark: () => p,
	MarkType: () => Me,
	Node: () => ce,
	NodeRange: () => oe,
	NodeType: () => ke,
	ReplaceError: () => m,
	ResolvedPos: () => ne,
	Schema: () => Ne,
	Slice: () => h
}), Nr = ["ol", 0], Pr = ["ul", 0], Fr = ["li", 0], Ir = {
	attrs: { order: {
		default: 1,
		validate: "number"
	} },
	parseDOM: [{
		tag: "ol",
		getAttrs(e) {
			return { order: e.hasAttribute("start") ? +e.getAttribute("start") : 1 };
		}
	}],
	toDOM(e) {
		return e.attrs.order == 1 ? Nr : [
			"ol",
			{ start: e.attrs.order },
			0
		];
	}
}, Lr = {
	parseDOM: [{ tag: "ul" }],
	toDOM() {
		return Pr;
	}
}, Rr = {
	parseDOM: [{ tag: "li" }],
	toDOM() {
		return Fr;
	},
	defining: !0
};
function zr(e, t) {
	let n = {};
	for (let t in e) n[t] = e[t];
	for (let e in t) n[e] = t[e];
	return n;
}
function Br(e, t, n) {
	return e.append({
		ordered_list: zr(Ir, {
			content: "list_item+",
			group: n
		}),
		bullet_list: zr(Lr, {
			content: "list_item+",
			group: n
		}),
		list_item: zr(Rr, { content: t })
	});
}
function Vr(e, t = null) {
	return function(n, r) {
		let { $from: i, $to: a } = n.selection, o = i.blockRange(a);
		if (!o) return !1;
		let s = r ? n.tr : null;
		return Hr(s, o, e, t) ? (r && r(s.scrollIntoView()), !0) : !1;
	};
}
function Hr(e, t, n, r = null) {
	let i = !1, a = t, o = t.$from.doc;
	if (t.depth >= 2 && t.$from.node(t.depth - 1).type.compatibleContent(n) && t.startIndex == 0) {
		if (t.$from.index(t.depth - 1) == 0) return !1;
		let e = o.resolve(t.start - 2);
		a = new oe(e, e, t.depth), t.endIndex < t.parent.childCount && (t = new oe(t.$from, o.resolve(t.$to.end(t.depth)), t.depth)), i = !0;
	}
	let s = jt(a, n, r, t);
	return s ? (e && Ur(e, t, s, i, n), !0) : !1;
}
function Ur(e, t, n, r, i) {
	let a = l.empty;
	for (let e = n.length - 1; e >= 0; e--) a = l.from(n[e].type.create(n[e].attrs, a));
	e.step(new Ct(t.start - (r ? 2 : 0), t.end, t.start, t.end, new h(a, 0, 0), n.length, !0));
	let o = 0;
	for (let e = 0; e < n.length; e++) n[e].type == i && (o = e + 1);
	let s = n.length - o, c = t.start + n.length - (r ? 2 : 0), u = t.parent;
	for (let n = t.startIndex, r = t.endIndex, i = !0; n < r; n++, i = !1) !i && Vt(e.doc, c, s) && (e.split(c, s), c += 2 * s), c += u.child(n).nodeSize;
	return e;
}
function Wr(e, t) {
	return function(n, r) {
		let { $from: i, $to: a, node: o } = n.selection;
		if (o && o.isBlock || i.depth < 2 || !i.sameParent(a)) return !1;
		let s = i.node(-1);
		if (s.type != e) return !1;
		if (i.parent.content.size == 0 && i.node(-1).childCount == i.indexAfter(-1)) {
			if (i.depth == 3 || i.node(-3).type != e || i.index(-2) != i.node(-2).childCount - 1) return !1;
			if (r) {
				let t = l.empty, a = i.index(-1) ? 1 : i.index(-2) ? 2 : 3;
				for (let e = i.depth - a; e >= i.depth - 3; e--) t = l.from(i.node(e).copy(t));
				let o = i.indexAfter(-1) < i.node(-2).childCount ? 1 : i.indexAfter(-2) < i.node(-3).childCount ? 2 : 3;
				t = t.append(l.from(e.createAndFill()));
				let s = i.before(i.depth - (a - 1)), c = n.tr.replace(s, i.after(-o), new h(t, 4 - a, 0)), u = -1;
				c.doc.nodesBetween(s, c.doc.content.size, (e, t) => {
					if (u > -1) return !1;
					e.isTextblock && e.content.size == 0 && (u = t + 1);
				}), u > -1 && c.setSelection(O.near(c.doc.resolve(u))), r(c.scrollIntoView());
			}
			return !0;
		}
		let c = a.pos == i.end() ? s.contentMatchAt(0).defaultType : null, u = n.tr.delete(i.pos, a.pos), d = c ? [t ? {
			type: e,
			attrs: t
		} : null, { type: c }] : void 0;
		return Vt(u.doc, i.pos, 2, d) ? (r && r(u.split(i.pos, 2, d).scrollIntoView()), !0) : !1;
	};
}
function Gr(e, t) {
	let n = Wr(e, t);
	return (e, t) => n(e, t && ((n) => {
		let r = e.storedMarks || e.selection.$to.parentOffset && e.selection.$from.marks();
		r && n.ensureMarks(r), t(n);
	}));
}
function Kr(e) {
	return function(t, n) {
		let { $from: r, $to: i } = t.selection, a = r.blockRange(i, (t) => t.childCount > 0 && t.firstChild.type == e);
		return a ? n ? r.node(a.depth - 1).type == e ? qr(t, n, e, a) : Jr(t, n, a) : !0 : !1;
	};
}
function qr(e, t, n, r) {
	let i = e.tr, a = r.end, o = r.$to.end(r.depth);
	a < o && (i.step(new Ct(a - 1, o, a, o, new h(l.from(n.create(null, r.parent.copy())), 1, 0), 1, !0)), r = new oe(i.doc.resolve(r.$from.pos), i.doc.resolve(o), r.depth));
	let s = kt(r);
	if (s == null) return !1;
	i.lift(r, s);
	let c = i.doc.resolve(i.mapping.map(a, -1) - 1);
	return Ut(i.doc, c.pos) && c.nodeBefore.type == c.nodeAfter.type && i.join(c.pos), t(i.scrollIntoView()), !0;
}
function Jr(e, t, n) {
	let r = e.tr, i = n.parent;
	for (let e = n.end, t = n.endIndex - 1, a = n.startIndex; t > a; t--) e -= i.child(t).nodeSize, r.delete(e - 1, e + 1);
	let a = r.doc.resolve(n.start), o = a.nodeAfter;
	if (r.mapping.map(n.end) != n.start + a.nodeAfter.nodeSize) return !1;
	let s = n.startIndex == 0, c = n.endIndex == i.childCount, u = a.node(-1), d = a.index(-1);
	if (!u.canReplace(d + +!s, d + 1, o.content.append(c ? l.empty : l.from(i)))) return !1;
	let f = a.pos, p = f + o.nodeSize;
	return r.step(new Ct(f - +!!s, p + +!!c, f + 1, p - 1, new h((s ? l.empty : l.from(i.copy(l.empty))).append(c ? l.empty : l.from(i.copy(l.empty))), +!s, +!c), +!s)), t(r.scrollIntoView()), !0;
}
function Yr(e) {
	return function(t, n) {
		let { $from: r, $to: i } = t.selection, a = r.blockRange(i, (t) => t.childCount > 0 && t.firstChild.type == e);
		if (!a) return !1;
		let o = a.startIndex;
		if (o == 0) return !1;
		let s = a.parent, c = s.child(o - 1);
		if (c.type != e) return !1;
		if (n) {
			let r = c.lastChild && c.lastChild.type == s.type, i = l.from(r ? e.create() : null), o = new h(l.from(e.create(null, l.from(s.type.create(null, i)))), r ? 3 : 1, 0), u = a.start, d = a.end;
			n(t.tr.step(new Ct(u - (r ? 3 : 1), d, u, d, o, 1, !0)).scrollIntoView());
		}
		return !0;
	};
}
//#endregion
//#region ../../node_modules/@tiptap/pm/dist/schema-list/index.js
var Xr = /* @__PURE__ */ t({
	addListNodes: () => Br,
	bulletList: () => Lr,
	liftListItem: () => Kr,
	listItem: () => Rr,
	orderedList: () => Ir,
	sinkListItem: () => Yr,
	splitListItem: () => Wr,
	splitListItemKeepMarks: () => Gr,
	wrapInList: () => Vr,
	wrapRangeInList: () => Hr
}), N = function(e) {
	for (var t = 0;; t++) if (e = e.previousSibling, !e) return t;
}, Zr = function(e) {
	let t = e.assignedSlot || e.parentNode;
	return t && t.nodeType == 11 ? t.host : t;
}, Qr = null, $r = function(e, t, n) {
	let r = Qr ||= document.createRange();
	return r.setEnd(e, n ?? e.nodeValue.length), r.setStart(e, t || 0), r;
}, ei = function() {
	Qr = null;
}, ti = function(e, t, n, r) {
	return n && (ri(e, t, n, r, -1) || ri(e, t, n, r, 1));
}, ni = /^(img|br|input|textarea|hr)$/i;
function ri(e, t, n, r, i) {
	for (;;) {
		if (e == n && t == r) return !0;
		if (t == (i < 0 ? 0 : ii(e))) {
			let n = e.parentNode;
			if (!n || n.nodeType != 1 || ci(e) || ni.test(e.nodeName) || e.contentEditable == "false") return !1;
			t = N(e) + (i < 0 ? 0 : 1), e = n;
		} else if (e.nodeType == 1) {
			let n = e.childNodes[t + (i < 0 ? -1 : 0)];
			if (n.nodeType == 1 && n.contentEditable == "false") {
				if (n.pmViewDesc?.ignoreForSelection) t += i;
				else return !1;
			} else e = n, t = i < 0 ? ii(e) : 0;
		} else return !1;
	}
}
function ii(e) {
	return e.nodeType == 3 ? e.nodeValue.length : e.childNodes.length;
}
function ai(e, t) {
	for (;;) {
		if (e.nodeType == 3 && t) return e;
		if (e.nodeType == 1 && t > 0) {
			if (e.contentEditable == "false") return null;
			e = e.childNodes[t - 1], t = ii(e);
		} else if (e.parentNode && !ci(e)) t = N(e), e = e.parentNode;
		else return null;
	}
}
function oi(e, t) {
	for (;;) {
		if (e.nodeType == 3 && t < e.nodeValue.length) return e;
		if (e.nodeType == 1 && t < e.childNodes.length) {
			if (e.contentEditable == "false") return null;
			e = e.childNodes[t], t = 0;
		} else if (e.parentNode && !ci(e)) t = N(e) + 1, e = e.parentNode;
		else return null;
	}
}
function si(e, t, n) {
	for (let r = t == 0, i = t == ii(e); r || i;) {
		if (e == n) return !0;
		let t = N(e);
		if (e = e.parentNode, !e) return !1;
		r &&= t == 0, i &&= t == ii(e);
	}
}
function ci(e) {
	let t;
	for (let n = e; n && !(t = n.pmViewDesc); n = n.parentNode);
	return t && t.node && t.node.isBlock && (t.dom == e || t.contentDOM == e);
}
var li = function(e) {
	return e.focusNode && ti(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset);
};
function ui(e, t) {
	let n = document.createEvent("Event");
	return n.initEvent("keydown", !0, !0), n.keyCode = e, n.key = n.code = t, n;
}
function di(e) {
	let t = e.activeElement;
	for (; t && t.shadowRoot;) t = t.shadowRoot.activeElement;
	return t;
}
function fi(e, t, n) {
	if (e.caretPositionFromPoint) try {
		let r = e.caretPositionFromPoint(t, n);
		if (r) return {
			node: r.offsetNode,
			offset: Math.min(ii(r.offsetNode), r.offset)
		};
	} catch {}
	if (e.caretRangeFromPoint) {
		let r = e.caretRangeFromPoint(t, n);
		if (r) return {
			node: r.startContainer,
			offset: Math.min(ii(r.startContainer), r.startOffset)
		};
	}
}
var pi = typeof navigator < "u" ? navigator : null, mi = typeof document < "u" ? document : null, hi = pi && pi.userAgent || "", gi = /Edge\/(\d+)/.exec(hi), _i = /MSIE \d/.exec(hi), vi = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(hi), yi = !!(_i || vi || gi), bi = _i ? document.documentMode : vi ? +vi[1] : gi ? +gi[1] : 0, xi = !yi && /gecko\/(\d+)/i.test(hi);
xi && +(/Firefox\/(\d+)/.exec(hi) || [0, 0])[1];
var Si = !yi && /Chrome\/(\d+)/.exec(hi), P = !!Si, Ci = Si ? +Si[1] : 0, F = !yi && !!pi && /Apple Computer/.test(pi.vendor), wi = F && (/Mobile\/\w+/.test(hi) || !!pi && pi.maxTouchPoints > 2), Ti = wi || (pi ? /Mac/.test(pi.platform) : !1), Ei = pi ? /Win/.test(pi.platform) : !1, Di = /Android \d/.test(hi), Oi = !!mi && "webkitFontSmoothing" in mi.documentElement.style, ki = Oi ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function Ai(e) {
	let t = e.defaultView && e.defaultView.visualViewport;
	return t ? {
		left: 0,
		right: t.width,
		top: 0,
		bottom: t.height
	} : {
		left: 0,
		right: e.documentElement.clientWidth,
		top: 0,
		bottom: e.documentElement.clientHeight
	};
}
function ji(e, t) {
	return typeof e == "number" ? e : e[t];
}
function Mi(e) {
	let t = e.getBoundingClientRect(), n = t.width / e.offsetWidth || 1, r = t.height / e.offsetHeight || 1;
	return {
		left: t.left,
		right: t.left + e.clientWidth * n,
		top: t.top,
		bottom: t.top + e.clientHeight * r
	};
}
function Ni(e, t, n) {
	if (!Ji(t) && t.left == 0) return;
	let r = e.someProp("scrollThreshold") || 0, i = e.someProp("scrollMargin") || 5, a = e.dom.ownerDocument;
	for (let o = n || e.dom; o;) {
		if (o.nodeType != 1) {
			o = Zr(o);
			continue;
		}
		let e = o, n = e == a.body, s = n ? Ai(a) : Mi(e), c = 0, l = 0;
		if (t.top < s.top + ji(r, "top") ? l = -(s.top - t.top + ji(i, "top")) : t.bottom > s.bottom - ji(r, "bottom") && (l = t.bottom - t.top > s.bottom - s.top ? t.top + ji(i, "top") - s.top : t.bottom - s.bottom + ji(i, "bottom")), t.left < s.left + ji(r, "left") ? c = -(s.left - t.left + ji(i, "left")) : t.right > s.right - ji(r, "right") && (c = t.right - s.right + ji(i, "right")), c || l) {
			if (n) a.defaultView.scrollBy(c, l);
			else {
				let n = e.scrollLeft, r = e.scrollTop;
				l && (e.scrollTop += l), c && (e.scrollLeft += c);
				let i = e.scrollLeft - n, a = e.scrollTop - r;
				t = {
					left: t.left - i,
					top: t.top - a,
					right: t.right - i,
					bottom: t.bottom - a
				};
			}
		}
		let u = n ? "fixed" : getComputedStyle(o).position;
		if (/^(fixed|sticky)$/.test(u)) break;
		o = u == "absolute" ? o.offsetParent : Zr(o);
	}
}
function Pi(e) {
	let t = e.dom.getBoundingClientRect(), n = Math.max(0, t.top), r, i;
	for (let a = (t.left + t.right) / 2, o = n + 1; o < Math.min(innerHeight, t.bottom); o += 5) {
		let t = e.root.elementFromPoint(a, o);
		if (!t || t == e.dom || !e.dom.contains(t)) continue;
		let s = t.getBoundingClientRect();
		if (s.top >= n - 20) {
			r = t, i = s.top;
			break;
		}
	}
	return {
		refDOM: r,
		refTop: i,
		stack: Fi(e.dom)
	};
}
function Fi(e) {
	let t = [], n = e.ownerDocument;
	for (let r = e; r && (t.push({
		dom: r,
		top: r.scrollTop,
		left: r.scrollLeft
	}), e != n); r = Zr(r));
	return t;
}
function Ii({ refDOM: e, refTop: t, stack: n }) {
	let r = e ? e.getBoundingClientRect().top : 0;
	Li(n, r == 0 ? 0 : r - t);
}
function Li(e, t) {
	for (let n = 0; n < e.length; n++) {
		let { dom: r, top: i, left: a } = e[n];
		r.scrollTop != i + t && (r.scrollTop = i + t), r.scrollLeft != a && (r.scrollLeft = a);
	}
}
var Ri = null;
function zi(e) {
	if (e.setActive) return e.setActive();
	if (Ri) return e.focus(Ri);
	let t = Fi(e);
	e.focus(Ri == null ? { get preventScroll() {
		return Ri = { preventScroll: !0 }, !0;
	} } : void 0), Ri || (Ri = !1, Li(t, 0));
}
function Bi(e, t) {
	let n, r = 2e8, i, a = 0, o = t.top, s = t.top, c, l;
	for (let u = e.firstChild, d = 0; u; u = u.nextSibling, d++) {
		let e;
		if (u.nodeType == 1) e = u.getClientRects();
		else if (u.nodeType == 3) e = $r(u).getClientRects();
		else continue;
		for (let f = 0; f < e.length; f++) {
			let p = e[f];
			if (p.top <= o && p.bottom >= s) {
				o = Math.max(p.bottom, o), s = Math.min(p.top, s);
				let e = p.left > t.left ? p.left - t.left : p.right < t.left ? t.left - p.right : 0;
				if (e < r) {
					n = u, r = e, i = e && n.nodeType == 3 ? {
						left: p.right < t.left ? p.right : p.left,
						top: t.top
					} : t, u.nodeType == 1 && e && (a = d + +(t.left >= (p.left + p.right) / 2));
					continue;
				}
			} else p.top > t.top && !c && p.left <= t.left && p.right >= t.left && (c = u, l = {
				left: Math.max(p.left, Math.min(p.right, t.left)),
				top: p.top
			});
			!n && (t.left >= p.right && t.top >= p.top || t.left >= p.left && t.top >= p.bottom) && (a = d + 1);
		}
	}
	return !n && c && (n = c, i = l, r = 0), n && n.nodeType == 3 ? Vi(n, i) : !n || r && n.nodeType == 1 ? {
		node: e,
		offset: a
	} : Bi(n, i);
}
function Vi(e, t) {
	let n = e.nodeValue.length, r = document.createRange(), i;
	for (let a = 0; a < n; a++) {
		r.setEnd(e, a + 1), r.setStart(e, a);
		let n = Yi(r, 1);
		if (n.top != n.bottom && Hi(t, n)) {
			i = {
				node: e,
				offset: a + +(t.left >= (n.left + n.right) / 2)
			};
			break;
		}
	}
	return r.detach(), i || {
		node: e,
		offset: 0
	};
}
function Hi(e, t) {
	return e.left >= t.left - 1 && e.left <= t.right + 1 && e.top >= t.top - 1 && e.top <= t.bottom + 1;
}
function Ui(e, t) {
	let n = e.parentNode;
	return n && /^li$/i.test(n.nodeName) && t.left < e.getBoundingClientRect().left ? n : e;
}
function Wi(e, t, n) {
	let { node: r, offset: i } = Bi(t, n), a = -1;
	if (r.nodeType == 1 && !r.firstChild) {
		let e = r.getBoundingClientRect();
		a = e.left != e.right && n.left > (e.left + e.right) / 2 ? 1 : -1;
	}
	return e.docView.posFromDOM(r, i, a);
}
function Gi(e, t, n, r) {
	let i = -1;
	for (let n = t, a = !1; n != e.dom;) {
		let t = e.docView.nearestDesc(n, !0), o;
		if (!t) return null;
		if (t.dom.nodeType == 1 && (t.node.isBlock && t.parent || !t.contentDOM) && ((o = t.dom.getBoundingClientRect()).width || o.height) && (t.node.isBlock && t.parent && !/^T(R|BODY|HEAD|FOOT)$/.test(t.dom.nodeName) && (!a && o.left > r.left || o.top > r.top ? i = t.posBefore : (!a && o.right < r.left || o.bottom < r.top) && (i = t.posAfter), a = !0), !t.contentDOM && i < 0 && !t.node.isText)) return (t.node.isBlock ? r.top < (o.top + o.bottom) / 2 : r.left < (o.left + o.right) / 2) ? t.posBefore : t.posAfter;
		n = t.dom.parentNode;
	}
	return i > -1 ? i : e.docView.posFromDOM(t, n, -1);
}
function Ki(e, t, n) {
	let r = e.childNodes.length;
	if (r && n.top < n.bottom) for (let i = Math.max(0, Math.min(r - 1, Math.floor(r * (t.top - n.top) / (n.bottom - n.top)) - 2)), a = i;;) {
		let n = e.childNodes[a];
		if (n.nodeType == 1) {
			let e = n.getClientRects();
			for (let r = 0; r < e.length; r++) {
				let i = e[r];
				if (Hi(t, i)) return Ki(n, t, i);
			}
		}
		if ((a = (a + 1) % r) == i) break;
	}
	return e;
}
function qi(e, t) {
	let n = e.dom.ownerDocument, r, i = 0, a = fi(n, t.left, t.top);
	a && ({node: r, offset: i} = a);
	let o = (e.root.elementFromPoint ? e.root : n).elementFromPoint(t.left, t.top), s;
	if (!o || !e.dom.contains(o.nodeType == 1 ? o : o.parentNode)) {
		let n = e.dom.getBoundingClientRect();
		if (!Hi(t, n) || (o = Ki(e.dom, t, n), !o)) return null;
	}
	if (F) for (let e = o; r && e; e = Zr(e)) e.draggable && (r = void 0);
	if (o = Ui(o, t), r) {
		if (xi && r.nodeType == 1 && (i = Math.min(i, r.childNodes.length), i < r.childNodes.length)) {
			let e = r.childNodes[i], n;
			e.nodeName == "IMG" && (n = e.getBoundingClientRect()).right <= t.left && n.bottom > t.top && i++;
		}
		let n;
		Oi && i && r.nodeType == 1 && (n = r.childNodes[i - 1]).nodeType == 1 && n.contentEditable == "false" && n.getBoundingClientRect().top >= t.top && i--, r == e.dom && i == r.childNodes.length - 1 && r.lastChild.nodeType == 1 && t.top > r.lastChild.getBoundingClientRect().bottom ? s = e.state.doc.content.size : (i == 0 || r.nodeType != 1 || r.childNodes[i - 1].nodeName != "BR") && (s = Gi(e, r, i, t));
	}
	s ??= Wi(e, o, t);
	let c = e.docView.nearestDesc(o, !0);
	return {
		pos: s,
		inside: c ? c.posAtStart - c.border : -1
	};
}
function Ji(e) {
	return e.top < e.bottom || e.left < e.right;
}
function Yi(e, t) {
	let n = e.getClientRects();
	if (n.length) {
		let e = n[t < 0 ? 0 : n.length - 1];
		if (Ji(e)) return e;
	}
	return Array.prototype.find.call(n, Ji) || e.getBoundingClientRect();
}
var Xi = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
function Zi(e, t, n) {
	let { node: r, offset: i, atom: a } = e.docView.domFromPos(t, n < 0 ? -1 : 1), o = Oi || xi;
	if (r.nodeType == 3) {
		if (o && (Xi.test(r.nodeValue) || (n < 0 ? !i : i == r.nodeValue.length))) {
			let e = Yi($r(r, i, i), n);
			if (xi && i && /\s/.test(r.nodeValue[i - 1]) && i < r.nodeValue.length) {
				let t = Yi($r(r, i - 1, i - 1), -1);
				if (t.top == e.top) {
					let n = Yi($r(r, i, i + 1), -1);
					if (n.top != e.top) return Qi(n, n.left < t.left);
				}
			}
			return e;
		}
		{
			let e = i, t = i, a = n < 0 ? 1 : -1;
			return n < 0 && !i ? (t++, a = -1) : n >= 0 && i == r.nodeValue.length ? (e--, a = 1) : n < 0 ? e-- : t++, Qi(Yi($r(r, e, t), a), a < 0);
		}
	}
	if (!e.state.doc.resolve(t - (a || 0)).parent.inlineContent) {
		if (a == null && i && (n < 0 || i == ii(r))) {
			let e = r.childNodes[i - 1];
			if (e.nodeType == 1) return $i(e.getBoundingClientRect(), !1);
		}
		if (a == null && i < ii(r)) {
			let e = r.childNodes[i];
			if (e.nodeType == 1) return $i(e.getBoundingClientRect(), !0);
		}
		return $i(r.getBoundingClientRect(), n >= 0);
	}
	if (a == null && i && (n < 0 || i == ii(r))) {
		let e = r.childNodes[i - 1], t = e.nodeType == 3 ? $r(e, ii(e) - +!o) : e.nodeType == 1 && (e.nodeName != "BR" || !e.nextSibling) ? e : null;
		if (t) return Qi(Yi(t, 1), !1);
	}
	if (a == null && i < ii(r)) {
		let e = r.childNodes[i];
		for (; e.pmViewDesc && e.pmViewDesc.ignoreForCoords;) e = e.nextSibling;
		let t = e ? e.nodeType == 3 ? $r(e, 0, +!o) : e.nodeType == 1 ? e : null : null;
		if (t) return Qi(Yi(t, -1), !0);
	}
	return Qi(Yi(r.nodeType == 3 ? $r(r) : r, -n), n >= 0);
}
function Qi(e, t) {
	if (e.width == 0) return e;
	let n = t ? e.left : e.right;
	return {
		top: e.top,
		bottom: e.bottom,
		left: n,
		right: n
	};
}
function $i(e, t) {
	if (e.height == 0) return e;
	let n = t ? e.top : e.bottom;
	return {
		top: n,
		bottom: n,
		left: e.left,
		right: e.right
	};
}
function ea(e, t, n) {
	let r = e.state, i = e.root.activeElement;
	r != t && e.updateState(t), i != e.dom && e.focus();
	try {
		return n();
	} finally {
		r != t && e.updateState(r), i != e.dom && i && i.focus();
	}
}
function ta(e, t, n) {
	let r = t.selection, i = n == "up" ? r.$from : r.$to;
	return ea(e, t, () => {
		let { node: t } = e.docView.domFromPos(i.pos, n == "up" ? -1 : 1);
		for (;;) {
			let n = e.docView.nearestDesc(t, !0);
			if (!n) break;
			if (n.node.isBlock) {
				t = n.contentDOM || n.dom;
				break;
			}
			t = n.dom.parentNode;
		}
		let r = Zi(e, i.pos, 1);
		for (let e = t.firstChild; e; e = e.nextSibling) {
			let t;
			if (e.nodeType == 1) t = e.getClientRects();
			else if (e.nodeType == 3) t = $r(e, 0, e.nodeValue.length).getClientRects();
			else continue;
			for (let e = 0; e < t.length; e++) {
				let i = t[e];
				if (i.bottom > i.top + 1 && (n == "up" ? r.top - i.top > (i.bottom - r.top) * 2 : i.bottom - r.bottom > (r.bottom - i.top) * 2)) return !1;
			}
		}
		return !0;
	});
}
var na = /[\u0590-\u08ac]/;
function ra(e, t, n) {
	let { $head: r } = t.selection;
	if (!r.parent.isTextblock) return !1;
	let i = r.parentOffset, a = !i, o = i == r.parent.content.size, s = e.domSelection();
	return s ? !na.test(r.parent.textContent) || !s.modify ? n == "left" || n == "backward" ? a : o : ea(e, t, () => {
		let { focusNode: t, focusOffset: i, anchorNode: a, anchorOffset: o } = e.domSelectionRange(), c = s.caretBidiLevel;
		s.modify("move", n, "character");
		let l = r.depth ? e.docView.domAfterPos(r.before()) : e.dom, { focusNode: u, focusOffset: d } = e.domSelectionRange(), f = u && !l.contains(u.nodeType == 1 ? u : u.parentNode) || t == u && i == d;
		try {
			s.collapse(a, o), t && (t != a || i != o) && s.extend && s.extend(t, i);
		} catch {}
		return c != null && (s.caretBidiLevel = c), f;
	}) : r.pos == r.start() || r.pos == r.end();
}
var ia = null, aa = null, oa = !1;
function sa(e, t, n) {
	return ia == t && aa == n ? oa : (ia = t, aa = n, oa = n == "up" || n == "down" ? ta(e, t, n) : ra(e, t, n));
}
var ca = 0, la = 1, ua = 2, da = 3, fa = class {
	constructor(e, t, n, r) {
		this.parent = e, this.children = t, this.dom = n, this.contentDOM = r, this.dirty = ca, n.pmViewDesc = this;
	}
	matchesWidget(e) {
		return !1;
	}
	matchesMark(e) {
		return !1;
	}
	matchesNode(e, t, n) {
		return !1;
	}
	matchesHack(e) {
		return !1;
	}
	parseRule(e) {
		return null;
	}
	stopEvent(e) {
		return !1;
	}
	get size() {
		let e = 0;
		for (let t = 0; t < this.children.length; t++) e += this.children[t].size;
		return e;
	}
	get border() {
		return 0;
	}
	destroy() {
		this.parent = void 0, this.dom.pmViewDesc == this && (this.dom.pmViewDesc = void 0);
		for (let e = 0; e < this.children.length; e++) this.children[e].destroy();
	}
	posBeforeChild(e) {
		for (let t = 0, n = this.posAtStart;; t++) {
			let r = this.children[t];
			if (r == e) return n;
			n += r.size;
		}
	}
	get posBefore() {
		return this.parent.posBeforeChild(this);
	}
	get posAtStart() {
		return this.parent ? this.parent.posBeforeChild(this) + this.border : 0;
	}
	get posAfter() {
		return this.posBefore + this.size;
	}
	get posAtEnd() {
		return this.posAtStart + this.size - 2 * this.border;
	}
	localPosFromDOM(e, t, n) {
		if (this.contentDOM && this.contentDOM.contains(e.nodeType == 1 ? e : e.parentNode)) {
			if (n < 0) {
				let n, r;
				if (e == this.contentDOM) n = e.childNodes[t - 1];
				else {
					for (; e.parentNode != this.contentDOM;) e = e.parentNode;
					n = e.previousSibling;
				}
				for (; n && !((r = n.pmViewDesc) && r.parent == this);) n = n.previousSibling;
				return n ? this.posBeforeChild(r) + r.size : this.posAtStart;
			}
			{
				let n, r;
				if (e == this.contentDOM) n = e.childNodes[t];
				else {
					for (; e.parentNode != this.contentDOM;) e = e.parentNode;
					n = e.nextSibling;
				}
				for (; n && !((r = n.pmViewDesc) && r.parent == this);) n = n.nextSibling;
				return n ? this.posBeforeChild(r) : this.posAtEnd;
			}
		}
		let r;
		if (e == this.dom && this.contentDOM) r = t > N(this.contentDOM);
		else if (this.contentDOM && this.contentDOM != this.dom && this.dom.contains(this.contentDOM)) r = e.compareDocumentPosition(this.contentDOM) & 2;
		else if (this.dom.firstChild) {
			if (t == 0) for (let t = e;; t = t.parentNode) {
				if (t == this.dom) {
					r = !1;
					break;
				}
				if (t.previousSibling) break;
			}
			if (r == null && t == e.childNodes.length) for (let t = e;; t = t.parentNode) {
				if (t == this.dom) {
					r = !0;
					break;
				}
				if (t.nextSibling) break;
			}
		}
		return r ?? n > 0 ? this.posAtEnd : this.posAtStart;
	}
	nearestDesc(e, t = !1) {
		for (let n = !0, r = e; r; r = r.parentNode) {
			let i = this.getDesc(r), a;
			if (i && (!t || i.node)) {
				if (n && (a = i.nodeDOM) && !(a.nodeType == 1 ? a.contains(e.nodeType == 1 ? e : e.parentNode) : a == e)) n = !1;
				else return i;
			}
		}
	}
	getDesc(e) {
		let t = e.pmViewDesc;
		for (let e = t; e; e = e.parent) if (e == this) return t;
	}
	posFromDOM(e, t, n) {
		for (let r = e; r; r = r.parentNode) {
			let i = this.getDesc(r);
			if (i) return i.localPosFromDOM(e, t, n);
		}
		return -1;
	}
	descAt(e) {
		for (let t = 0, n = 0; t < this.children.length; t++) {
			let r = this.children[t], i = n + r.size;
			if (n == e && i != n) {
				for (; !r.border && r.children.length;) for (let e = 0; e < r.children.length; e++) {
					let t = r.children[e];
					if (t.size) {
						r = t;
						break;
					}
				}
				return r;
			}
			if (e < i) return r.descAt(e - n - r.border);
			n = i;
		}
	}
	domFromPos(e, t) {
		if (!this.contentDOM) return {
			node: this.dom,
			offset: 0,
			atom: e + 1
		};
		let n = 0, r = 0;
		for (let t = 0; n < this.children.length; n++) {
			let i = this.children[n], a = t + i.size;
			if (a > e || i instanceof ya) {
				r = e - t;
				break;
			}
			t = a;
		}
		if (r) return this.children[n].domFromPos(r - this.children[n].border, t);
		for (let e; n && !(e = this.children[n - 1]).size && e instanceof pa && e.side >= 0; n--);
		if (t <= 0) {
			let e, r = !0;
			for (; e = n ? this.children[n - 1] : null, e && e.dom.parentNode != this.contentDOM; n--, r = !1);
			return e && t && r && !e.border && !e.domAtom ? e.domFromPos(e.size, t) : {
				node: this.contentDOM,
				offset: e ? N(e.dom) + 1 : 0
			};
		}
		{
			let e, r = !0;
			for (; e = n < this.children.length ? this.children[n] : null, e && e.dom.parentNode != this.contentDOM; n++, r = !1);
			return e && r && !e.border && !e.domAtom ? e.domFromPos(0, t) : {
				node: this.contentDOM,
				offset: e ? N(e.dom) : this.contentDOM.childNodes.length
			};
		}
	}
	parseRange(e, t, n = 0) {
		if (this.children.length == 0) return {
			node: this.contentDOM,
			from: e,
			to: t,
			fromOffset: 0,
			toOffset: this.contentDOM.childNodes.length
		};
		let r = -1, i = -1;
		for (let a = n, o = 0;; o++) {
			let n = this.children[o], s = a + n.size;
			if (r == -1 && e <= s) {
				let i = a + n.border;
				if (e >= i && t <= s - n.border && n.node && n.contentDOM && this.contentDOM.contains(n.contentDOM)) return n.parseRange(e, t, i);
				e = a;
				for (let t = o; t > 0; t--) {
					let n = this.children[t - 1];
					if (n.size && n.dom.parentNode == this.contentDOM && !n.emptyChildAt(1)) {
						r = N(n.dom) + 1;
						break;
					}
					e -= n.size;
				}
				r == -1 && (r = 0);
			}
			if (r > -1 && (s > t || o == this.children.length - 1)) {
				t = s;
				for (let e = o + 1; e < this.children.length; e++) {
					let n = this.children[e];
					if (n.size && n.dom.parentNode == this.contentDOM && !n.emptyChildAt(-1)) {
						i = N(n.dom);
						break;
					}
					t += n.size;
				}
				i == -1 && (i = this.contentDOM.childNodes.length);
				break;
			}
			a = s;
		}
		return {
			node: this.contentDOM,
			from: e,
			to: t,
			fromOffset: r,
			toOffset: i
		};
	}
	emptyChildAt(e) {
		if (this.border || !this.contentDOM || !this.children.length) return !1;
		let t = this.children[e < 0 ? 0 : this.children.length - 1];
		return t.size == 0 || t.emptyChildAt(e);
	}
	domAfterPos(e) {
		let { node: t, offset: n } = this.domFromPos(e, 0);
		if (t.nodeType != 1 || n == t.childNodes.length) throw RangeError("No node after pos " + e);
		return t.childNodes[n];
	}
	setSelection(e, t, n, r = !1) {
		let i = Math.min(e, t), a = Math.max(e, t);
		for (let o = 0, s = 0; o < this.children.length; o++) {
			let c = this.children[o], l = s + c.size;
			if (i > s && a < l) return c.setSelection(e - s - c.border, t - s - c.border, n, r);
			s = l;
		}
		let o = this.domFromPos(e, e ? -1 : 1), s = t == e ? o : this.domFromPos(t, t ? -1 : 1), c = n.root.getSelection(), l = n.domSelectionRange(), u = !1;
		if ((xi || F) && e == t) {
			let { node: e, offset: t } = o;
			if (e.nodeType == 3) {
				if (u = !!(t && e.nodeValue[t - 1] == "\n"), u && t == e.nodeValue.length) for (let t = e, n; t; t = t.parentNode) {
					if (n = t.nextSibling) {
						n.nodeName == "BR" && (o = s = {
							node: n.parentNode,
							offset: N(n) + 1
						});
						break;
					}
					let e = t.pmViewDesc;
					if (e && e.node && e.node.isBlock) break;
				}
			} else {
				let n = e.childNodes[t - 1];
				u = n && (n.nodeName == "BR" || n.contentEditable == "false");
			}
		}
		if (xi && l.focusNode && l.focusNode != s.node && l.focusNode.nodeType == 1) {
			let e = l.focusNode.childNodes[l.focusOffset];
			e && e.contentEditable == "false" && (r = !0);
		}
		if (!(r || u && F) && ti(o.node, o.offset, l.anchorNode, l.anchorOffset) && ti(s.node, s.offset, l.focusNode, l.focusOffset)) return;
		let d = !1;
		if ((c.extend || e == t) && !(u && xi)) {
			c.collapse(o.node, o.offset);
			try {
				e != t && c.extend(s.node, s.offset), d = !0;
			} catch {}
		}
		if (!d) {
			if (e > t) {
				let e = o;
				o = s, s = e;
			}
			let n = document.createRange();
			n.setEnd(s.node, s.offset), n.setStart(o.node, o.offset), c.removeAllRanges(), c.addRange(n);
		}
	}
	ignoreMutation(e) {
		return !this.contentDOM && e.type != "selection";
	}
	get contentLost() {
		return this.contentDOM && this.contentDOM != this.dom && !this.dom.contains(this.contentDOM);
	}
	markDirty(e, t) {
		for (let n = 0, r = 0; r < this.children.length; r++) {
			let i = this.children[r], a = n + i.size;
			if (n == a ? e <= a && t >= n : e < a && t > n) {
				let r = n + i.border, o = a - i.border;
				if (e >= r && t <= o) {
					this.dirty = e == n || t == a ? ua : la, e == r && t == o && (i.contentLost || i.dom.parentNode != this.contentDOM) ? i.dirty = da : i.markDirty(e - r, t - r);
					return;
				}
				i.dirty = i.dom == i.contentDOM && i.dom.parentNode == this.contentDOM && !i.children.length ? ua : da;
			}
			n = a;
		}
		this.dirty = ua;
	}
	markParentsDirty() {
		let e = 1;
		for (let t = this.parent; t; t = t.parent, e++) {
			let n = e == 1 ? ua : la;
			t.dirty < n && (t.dirty = n);
		}
	}
	get domAtom() {
		return !1;
	}
	get ignoreForCoords() {
		return !1;
	}
	get ignoreForSelection() {
		return !1;
	}
	isText(e) {
		return !1;
	}
}, pa = class extends fa {
	constructor(e, t, n, r) {
		let i, a = t.type.toDOM;
		if (typeof a == "function" && (a = a(n, () => {
			if (!i) return r;
			if (i.parent) return i.parent.posBeforeChild(i);
		})), !t.type.spec.raw) {
			if (a.nodeType != 1) {
				let e = document.createElement("span");
				e.appendChild(a), a = e;
			}
			a.hasAttribute("contenteditable") || (a.contentEditable = "false"), a.classList.add("ProseMirror-widget");
		}
		super(e, [], a, null), this.widget = t, this.widget = t, i = this;
	}
	matchesWidget(e) {
		return this.dirty == ca && e.type.eq(this.widget.type);
	}
	parseRule() {
		return { ignore: !0 };
	}
	stopEvent(e) {
		let t = this.widget.spec.stopEvent;
		return t ? t(e) : !1;
	}
	ignoreMutation(e) {
		return e.type != "selection" || this.widget.spec.ignoreSelection;
	}
	destroy() {
		this.widget.type.destroy(this.dom), super.destroy();
	}
	get domAtom() {
		return !0;
	}
	get ignoreForSelection() {
		return !!this.widget.type.spec.relaxedSide;
	}
	get side() {
		return this.widget.type.side;
	}
}, ma = class extends fa {
	constructor(e, t, n, r) {
		super(e, [], t, null), this.textDOM = n, this.text = r;
	}
	get size() {
		return this.text.length;
	}
	localPosFromDOM(e, t) {
		return e == this.textDOM ? this.posAtStart + t : this.posAtStart + (t ? this.size : 0);
	}
	domFromPos(e) {
		return {
			node: this.textDOM,
			offset: e
		};
	}
	ignoreMutation(e) {
		return e.type === "characterData" && e.target.nodeValue == e.oldValue;
	}
}, ha = class e extends fa {
	constructor(e, t, n, r, i) {
		super(e, [], n, r), this.mark = t, this.spec = i;
	}
	static create(t, n, r, i) {
		let a = i.nodeViews[n.type.name], o = a && a(n, i, r);
		return (!o || !o.dom) && (o = Ze.renderSpec(document, n.type.spec.toDOM(n, r), null, n.attrs)), new e(t, n, o.dom, o.contentDOM || o.dom, o);
	}
	parseRule() {
		return this.dirty & da || this.mark.type.spec.reparseInView ? null : {
			mark: this.mark.type.name,
			attrs: this.mark.attrs,
			contentElement: this.contentDOM
		};
	}
	matchesMark(e) {
		return this.dirty != da && this.mark.eq(e);
	}
	markDirty(e, t) {
		if (super.markDirty(e, t), this.dirty != ca) {
			let e = this.parent;
			for (; !e.node;) e = e.parent;
			e.dirty < this.dirty && (e.dirty = this.dirty), this.dirty = ca;
		}
	}
	slice(t, n, r) {
		let i = e.create(this.parent, this.mark, !0, r), a = this.children, o = this.size;
		n < o && (a = Ia(a, n, o, r)), t > 0 && (a = Ia(a, 0, t, r));
		for (let e = 0; e < a.length; e++) a[e].parent = i;
		return i.children = a, i;
	}
	ignoreMutation(e) {
		return this.spec.ignoreMutation ? this.spec.ignoreMutation(e) : super.ignoreMutation(e);
	}
	destroy() {
		this.spec.destroy && this.spec.destroy(), super.destroy();
	}
}, ga = class e extends fa {
	constructor(e, t, n, r, i, a, o) {
		super(e, [], i, a), this.node = t, this.outerDeco = n, this.innerDeco = r, this.nodeDOM = o;
	}
	static create(t, n, r, i, a, o) {
		let s = a.nodeViews[n.type.name], c, l = s && s(n, a, () => {
			if (!c) return o;
			if (c.parent) return c.parent.posBeforeChild(c);
		}, r, i), u = l && l.dom, d = l && l.contentDOM;
		if (n.isText) {
			if (!u) u = document.createTextNode(n.text);
			else if (u.nodeType != 3) throw RangeError("Text must be rendered as a DOM text node");
		} else if (!u) {
			let e = Ze.renderSpec(document, n.type.spec.toDOM(n), null, n.attrs);
			({dom: u, contentDOM: d} = e);
		}
		!d && !n.isText && u.nodeName != "BR" && (u.hasAttribute("contenteditable") || (u.contentEditable = "false"), n.type.spec.draggable && (u.draggable = !0));
		let f = u;
		return u = Da(u, r, n), l ? c = new ba(t, n, r, i, u, d || null, f, l) : n.isText ? new va(t, n, r, i, u, f) : new e(t, n, r, i, u, d || null, f);
	}
	parseRule(e) {
		if (this.node.type.spec.reparseInView) return null;
		let t = {
			node: this.node.type.name,
			attrs: this.node.attrs
		};
		if (this.node.type.whitespace == "pre" && (t.preserveWhitespace = "full"), !this.contentDOM) t.getContent = () => this.node.content;
		else if (!this.contentLost) t.contentElement = this.contentDOM;
		else {
			for (let e = this.children.length - 1; e >= 0; e--) {
				let n = this.children[e];
				if (this.dom.contains(n.dom.parentNode)) {
					t.contentElement = n.dom.parentNode;
					break;
				}
			}
			if (!t.contentElement) {
				let n = e && e.find((t) => t.nodeType == 1 && e.indexOf(t.parentNode) < 0 && this.dom.contains(t));
				n ? t.contentElement = n : t.getContent = () => l.empty;
			}
		}
		return t;
	}
	matchesNode(e, t, n) {
		return this.dirty == ca && e.eq(this.node) && Oa(t, this.outerDeco) && n.eq(this.innerDeco);
	}
	get size() {
		return this.node.nodeSize;
	}
	get border() {
		return +!this.node.isLeaf;
	}
	updateChildren(e, t) {
		let n = this.node.inlineContent, r = t, i = e.composing ? this.localCompositionInfo(e, t) : null, a = i && i.pos > -1 ? i : null, o = i && i.pos < 0, s = new Aa(this, a && a.node, e);
		Na(this.node, this.innerDeco, (t, i, a) => {
			t.spec.marks ? s.syncToMarks(t.spec.marks, n, e, i) : t.type.side >= 0 && !a && s.syncToMarks(i == this.node.childCount ? p.none : this.node.child(i).marks, n, e, i), s.placeWidget(t, e, r);
		}, (t, a, c, l) => {
			s.syncToMarks(t.marks, n, e, l);
			let u;
			s.findNodeMatch(t, a, c, l) || o && e.state.selection.from > r && e.state.selection.to < r + t.nodeSize && (u = s.findIndexWithChild(i.node)) > -1 && s.updateNodeAt(t, a, c, u, e) || s.updateNextNode(t, a, c, e, l, r) || s.addNode(t, a, c, e, r), r += t.nodeSize;
		}), s.syncToMarks([], n, e, 0), this.node.isTextblock && s.addTextblockHacks(), s.destroyRest(), (s.changed || this.dirty == ua) && (a && this.protectLocalComposition(e, a), xa(this.contentDOM, this.children, e), wi && Pa(this.dom));
	}
	localCompositionInfo(e, t) {
		let { from: n, to: r } = e.state.selection;
		if (!(e.state.selection instanceof k) || n < t || r > t + this.node.content.size) return null;
		let i = e.input.compositionNode;
		if (!i || !this.dom.contains(i.parentNode)) return null;
		if (this.node.inlineContent) {
			let e = i.nodeValue, a = Fa(this.node.content, e, n - t, r - t);
			return a < 0 ? null : {
				node: i,
				pos: a,
				text: e
			};
		}
		return {
			node: i,
			pos: -1,
			text: ""
		};
	}
	protectLocalComposition(e, { node: t, pos: n, text: r }) {
		if (this.getDesc(t)) return;
		let i = t;
		for (; i.parentNode != this.contentDOM; i = i.parentNode) {
			for (; i.previousSibling;) i.parentNode.removeChild(i.previousSibling);
			for (; i.nextSibling;) i.parentNode.removeChild(i.nextSibling);
			i.pmViewDesc && (i.pmViewDesc = void 0);
		}
		let a = new ma(this, i, t, r);
		e.input.compositionNodes.push(a), this.children = Ia(this.children, n, n + r.length, e, a);
	}
	update(e, t, n, r) {
		return this.dirty == da || !e.sameMarkup(this.node) ? !1 : (this.updateInner(e, t, n, r), !0);
	}
	updateInner(e, t, n, r) {
		this.updateOuterDeco(t), this.node = e, this.innerDeco = n, this.contentDOM && this.updateChildren(r, this.posAtStart), this.dirty = ca;
	}
	updateOuterDeco(e) {
		if (Oa(e, this.outerDeco)) return;
		let t = this.nodeDOM.nodeType != 1, n = this.dom;
		this.dom = Ta(this.dom, this.nodeDOM, wa(this.outerDeco, this.node, t), wa(e, this.node, t)), this.dom != n && (n.pmViewDesc = void 0, this.dom.pmViewDesc = this), this.outerDeco = e;
	}
	selectNode() {
		this.nodeDOM.nodeType == 1 && (this.nodeDOM.classList.add("ProseMirror-selectednode"), (this.contentDOM || !this.node.type.spec.draggable) && (this.nodeDOM.draggable = !0));
	}
	deselectNode() {
		this.nodeDOM.nodeType == 1 && (this.nodeDOM.classList.remove("ProseMirror-selectednode"), (this.contentDOM || !this.node.type.spec.draggable) && this.nodeDOM.removeAttribute("draggable"));
	}
	get domAtom() {
		return this.node.isAtom;
	}
};
function _a(e, t, n, r, i) {
	Da(r, t, e);
	let a = new ga(void 0, e, t, n, r, r, r);
	return a.contentDOM && a.updateChildren(i, 0), a;
}
var va = class e extends ga {
	constructor(e, t, n, r, i, a) {
		super(e, t, n, r, i, null, a);
	}
	parseRule() {
		let e = this.nodeDOM.parentNode;
		for (; e && e != this.dom && !e.pmIsDeco;) e = e.parentNode;
		return { skip: e || !0 };
	}
	update(e, t, n, r) {
		return this.dirty == da || this.dirty != ca && !this.inParent() || !e.sameMarkup(this.node) ? !1 : (this.updateOuterDeco(t), (this.dirty != ca || e.text != this.node.text) && e.text != this.nodeDOM.nodeValue && (this.nodeDOM.nodeValue = e.text, r.trackWrites == this.nodeDOM && (r.trackWrites = null)), this.node = e, this.dirty = ca, !0);
	}
	inParent() {
		let e = this.parent.contentDOM;
		for (let t = this.nodeDOM; t; t = t.parentNode) if (t == e) return !0;
		return !1;
	}
	domFromPos(e) {
		return {
			node: this.nodeDOM,
			offset: e
		};
	}
	localPosFromDOM(e, t, n) {
		return e == this.nodeDOM ? this.posAtStart + Math.min(t, this.node.text.length) : super.localPosFromDOM(e, t, n);
	}
	ignoreMutation(e) {
		return e.type != "characterData" && e.type != "selection";
	}
	slice(t, n, r) {
		let i = this.node.cut(t, n), a = document.createTextNode(i.text);
		return new e(this.parent, i, this.outerDeco, this.innerDeco, a, a);
	}
	markDirty(e, t) {
		super.markDirty(e, t), this.dom != this.nodeDOM && (e == 0 || t == this.nodeDOM.nodeValue.length) && (this.dirty = da);
	}
	get domAtom() {
		return !1;
	}
	isText(e) {
		return this.node.text == e;
	}
}, ya = class extends fa {
	parseRule() {
		return { ignore: !0 };
	}
	matchesHack(e) {
		return this.dirty == ca && this.dom.nodeName == e;
	}
	get domAtom() {
		return !0;
	}
	get ignoreForCoords() {
		return this.dom.nodeName == "IMG";
	}
}, ba = class extends ga {
	constructor(e, t, n, r, i, a, o, s) {
		super(e, t, n, r, i, a, o), this.spec = s;
	}
	update(e, t, n, r) {
		if (this.dirty == da) return !1;
		if (this.spec.update && (this.node.type == e.type || this.spec.multiType)) {
			let i = this.spec.update(e, t, n);
			return i && this.updateInner(e, t, n, r), i;
		}
		return !this.contentDOM && !e.isLeaf ? !1 : super.update(e, t, n, r);
	}
	selectNode() {
		this.spec.selectNode ? this.spec.selectNode() : super.selectNode();
	}
	deselectNode() {
		this.spec.deselectNode ? this.spec.deselectNode() : super.deselectNode();
	}
	setSelection(e, t, n, r) {
		this.spec.setSelection ? this.spec.setSelection(e, t, n.root) : super.setSelection(e, t, n, r);
	}
	destroy() {
		this.spec.destroy && this.spec.destroy(), super.destroy();
	}
	stopEvent(e) {
		return this.spec.stopEvent ? this.spec.stopEvent(e) : !1;
	}
	ignoreMutation(e) {
		return this.spec.ignoreMutation ? this.spec.ignoreMutation(e) : super.ignoreMutation(e);
	}
};
function xa(e, t, n) {
	let r = e.firstChild, i = !1;
	for (let a = 0; a < t.length; a++) {
		let o = t[a], s = o.dom;
		if (s.parentNode == e) {
			for (; s != r;) r = ka(r), i = !0;
			r = r.nextSibling;
		} else i = !0, e.insertBefore(s, r);
		if (o instanceof ha) {
			let t = r ? r.previousSibling : e.lastChild;
			xa(o.contentDOM, o.children, n), r = t ? t.nextSibling : e.firstChild;
		}
	}
	for (; r;) r = ka(r), i = !0;
	i && n.trackWrites == e && (n.trackWrites = null);
}
var Sa = function(e) {
	e && (this.nodeName = e);
};
Sa.prototype = Object.create(null);
var Ca = [new Sa()];
function wa(e, t, n) {
	if (e.length == 0) return Ca;
	let r = n ? Ca[0] : new Sa(), i = [r];
	for (let a = 0; a < e.length; a++) {
		let o = e[a].type.attrs;
		if (o) {
			o.nodeName && i.push(r = new Sa(o.nodeName));
			for (let e in o) {
				let a = o[e];
				a != null && (n && i.length == 1 && i.push(r = new Sa(t.isInline ? "span" : "div")), e == "class" ? r.class = (r.class ? r.class + " " : "") + a : e == "style" ? r.style = (r.style ? r.style + ";" : "") + a : e != "nodeName" && (r[e] = a));
			}
		}
	}
	return i;
}
function Ta(e, t, n, r) {
	if (n == Ca && r == Ca) return t;
	let i = t;
	for (let t = 0; t < r.length; t++) {
		let a = r[t], o = n[t];
		if (t) {
			let t;
			o && o.nodeName == a.nodeName && i != e && (t = i.parentNode) && t.nodeName.toLowerCase() == a.nodeName ? i = t : (t = document.createElement(a.nodeName), t.pmIsDeco = !0, t.appendChild(i), o = Ca[0], i = t);
		}
		Ea(i, o || Ca[0], a);
	}
	return i;
}
function Ea(e, t, n) {
	for (let r in t) r != "class" && r != "style" && r != "nodeName" && !(r in n) && e.removeAttribute(r);
	for (let r in n) r != "class" && r != "style" && r != "nodeName" && n[r] != t[r] && e.setAttribute(r, n[r]);
	if (t.class != n.class) {
		let r = t.class ? t.class.split(" ").filter(Boolean) : [], i = n.class ? n.class.split(" ").filter(Boolean) : [];
		for (let t = 0; t < r.length; t++) i.indexOf(r[t]) == -1 && e.classList.remove(r[t]);
		for (let t = 0; t < i.length; t++) r.indexOf(i[t]) == -1 && e.classList.add(i[t]);
		e.classList.length == 0 && e.removeAttribute("class");
	}
	if (t.style != n.style) {
		if (t.style) {
			let n = /\s*([\w\-\xa1-\uffff]+)\s*:(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\(.*?\)|[^;])*/g, r;
			for (; r = n.exec(t.style);) e.style.removeProperty(r[1]);
		}
		n.style && (e.style.cssText += n.style);
	}
}
function Da(e, t, n) {
	return Ta(e, e, Ca, wa(t, n, e.nodeType != 1));
}
function Oa(e, t) {
	if (e.length != t.length) return !1;
	for (let n = 0; n < e.length; n++) if (!e[n].type.eq(t[n].type)) return !1;
	return !0;
}
function ka(e) {
	let t = e.nextSibling;
	return e.parentNode.removeChild(e), t;
}
var Aa = class {
	constructor(e, t, n) {
		this.lock = t, this.view = n, this.index = 0, this.stack = [], this.changed = !1, this.top = e, this.preMatch = ja(e.node.content, e);
	}
	destroyBetween(e, t) {
		if (e != t) {
			for (let n = e; n < t; n++) this.top.children[n].destroy();
			this.top.children.splice(e, t - e), this.changed = !0;
		}
	}
	destroyRest() {
		this.destroyBetween(this.index, this.top.children.length);
	}
	syncToMarks(e, t, n, r) {
		let i = 0, a = this.stack.length >> 1, o = Math.min(a, e.length);
		for (; i < o && (i == a - 1 ? this.top : this.stack[i + 1 << 1]).matchesMark(e[i]) && e[i].type.spec.spanning !== !1;) i++;
		for (; i < a;) this.destroyRest(), this.top.dirty = ca, this.index = this.stack.pop(), this.top = this.stack.pop(), a--;
		for (; a < e.length;) {
			this.stack.push(this.top, this.index + 1);
			let i = -1, o = this.top.children.length;
			r < this.preMatch.index && (o = Math.min(this.index + 3, o));
			for (let t = this.index; t < o; t++) {
				let n = this.top.children[t];
				if (n.matchesMark(e[a]) && !this.isLocked(n.dom)) {
					i = t;
					break;
				}
			}
			if (i < 0 && this.index < this.top.children.length) {
				let t = this.top.children[this.index];
				t instanceof ha && t.dirty != da && t.mark.type == e[a].type && t.spec.update && !this.isLocked(t.dom) && t.spec.update(e[a]) && (t.mark = e[a], i = this.index, this.changed = !0);
			}
			if (i > -1) i > this.index && (this.changed = !0, this.destroyBetween(this.index, i)), this.top = this.top.children[this.index];
			else {
				let r = ha.create(this.top, e[a], t, n);
				this.top.children.splice(this.index, 0, r), this.top = r, this.changed = !0;
			}
			this.index = 0, a++;
		}
	}
	findNodeMatch(e, t, n, r) {
		let i = -1, a;
		if (r >= this.preMatch.index && (a = this.preMatch.matches[r - this.preMatch.index]).parent == this.top && a.matchesNode(e, t, n)) i = this.top.children.indexOf(a, this.index);
		else for (let r = this.index, a = Math.min(this.top.children.length, r + 5); r < a; r++) {
			let a = this.top.children[r];
			if (a.matchesNode(e, t, n) && !this.preMatch.matched.has(a)) {
				i = r;
				break;
			}
		}
		return i < 0 ? !1 : (this.destroyBetween(this.index, i), this.index++, !0);
	}
	updateNodeAt(e, t, n, r, i) {
		let a = this.top.children[r];
		return a.dirty == da && a.dom == a.contentDOM && (a.dirty = ua), a.update(e, t, n, i) ? (this.destroyBetween(this.index, r), this.index++, !0) : !1;
	}
	findIndexWithChild(e) {
		for (;;) {
			let t = e.parentNode;
			if (!t) return -1;
			if (t == this.top.contentDOM) {
				let t = e.pmViewDesc;
				if (t) {
					for (let e = this.index; e < this.top.children.length; e++) if (this.top.children[e] == t) return e;
				}
				return -1;
			}
			e = t;
		}
	}
	updateNextNode(e, t, n, r, i, a) {
		for (let o = this.index; o < this.top.children.length; o++) {
			let s = this.top.children[o];
			if (s instanceof ga) {
				let c = this.preMatch.matched.get(s);
				if (c != null && c != i) return !1;
				let l = s.dom, u, d = this.isLocked(l) && !(e.isText && s.node && s.node.isText && s.nodeDOM.nodeValue == e.text && s.dirty != da && Oa(t, s.outerDeco));
				if (!d && s.update(e, t, n, r)) return this.destroyBetween(this.index, o), s.dom != l && (this.changed = !0), this.index++, !0;
				if (!d && (u = this.recreateWrapper(s, e, t, n, r, a))) return this.destroyBetween(this.index, o), this.top.children[this.index] = u, u.contentDOM && (u.dirty = ua, u.updateChildren(r, a + 1), u.dirty = ca), this.changed = !0, this.index++, !0;
				break;
			}
		}
		return !1;
	}
	recreateWrapper(e, t, n, r, i, a) {
		if (e.dirty || t.isAtom || !e.children.length || !e.node.content.eq(t.content) || !Oa(n, e.outerDeco) || !r.eq(e.innerDeco)) return null;
		let o = ga.create(this.top, t, n, r, i, a);
		if (o.contentDOM) {
			o.children = e.children, e.children = [];
			for (let e of o.children) e.parent = o;
		}
		return e.destroy(), o;
	}
	addNode(e, t, n, r, i) {
		let a = ga.create(this.top, e, t, n, r, i);
		a.contentDOM && a.updateChildren(r, i + 1), this.top.children.splice(this.index++, 0, a), this.changed = !0;
	}
	placeWidget(e, t, n) {
		let r = this.index < this.top.children.length ? this.top.children[this.index] : null;
		if (r && r.matchesWidget(e) && (e == r.widget || !r.widget.type.toDOM.parentNode)) this.index++;
		else {
			let r = new pa(this.top, e, t, n);
			this.top.children.splice(this.index++, 0, r), this.changed = !0;
		}
	}
	addTextblockHacks() {
		let e = this.top.children[this.index - 1], t = this.top;
		for (; e instanceof ha;) t = e, e = t.children[t.children.length - 1];
		(!e || !(e instanceof va) || /\n$/.test(e.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(e.node.text)) && ((F || P) && e && e.dom.contentEditable == "false" && this.addHackNode("IMG", t), this.addHackNode("BR", this.top));
	}
	addHackNode(e, t) {
		if (t == this.top && this.index < t.children.length && t.children[this.index].matchesHack(e)) this.index++;
		else {
			let n = document.createElement(e);
			e == "IMG" && (n.className = "ProseMirror-separator", n.alt = ""), e == "BR" && (n.className = "ProseMirror-trailingBreak");
			let r = new ya(this.top, [], n, null);
			t == this.top ? t.children.splice(this.index++, 0, r) : t.children.push(r), this.changed = !0;
		}
	}
	isLocked(e) {
		return this.lock && (e == this.lock || e.nodeType == 1 && e.contains(this.lock.parentNode));
	}
};
function ja(e, t) {
	let n = t, r = n.children.length, i = e.childCount, a = /* @__PURE__ */ new Map(), o = [];
	outer: for (; i > 0;) {
		let s;
		for (;;) if (r) {
			let e = n.children[r - 1];
			if (e instanceof ha) n = e, r = e.children.length;
			else {
				s = e, r--;
				break;
			}
		} else if (n == t) break outer;
		else r = n.parent.children.indexOf(n), n = n.parent;
		let c = s.node;
		if (c) {
			if (c != e.child(i - 1)) break;
			--i, a.set(s, i), o.push(s);
		}
	}
	return {
		index: i,
		matched: a,
		matches: o.reverse()
	};
}
function Ma(e, t) {
	return e.type.side - t.type.side;
}
function Na(e, t, n, r) {
	let i = t.locals(e), a = 0;
	if (i.length == 0) {
		for (let n = 0; n < e.childCount; n++) {
			let o = e.child(n);
			r(o, i, t.forChild(a, o), n), a += o.nodeSize;
		}
		return;
	}
	let o = 0, s = [], c = null;
	for (let l = 0;;) {
		let u, d;
		for (; o < i.length && i[o].to == a;) {
			let e = i[o++];
			e.widget && (u ? (d ||= [u]).push(e) : u = e);
		}
		if (u) {
			if (d) {
				d.sort(Ma);
				for (let e = 0; e < d.length; e++) n(d[e], l, !!c);
			} else n(u, l, !!c);
		}
		let f, p;
		if (c) p = -1, f = c, c = null;
		else if (l < e.childCount) p = l, f = e.child(l++);
		else break;
		for (let e = 0; e < s.length; e++) s[e].to <= a && s.splice(e--, 1);
		for (; o < i.length && i[o].from <= a && i[o].to > a;) s.push(i[o++]);
		let m = a + f.nodeSize;
		if (f.isText) {
			let e = m;
			o < i.length && i[o].from < e && (e = i[o].from);
			for (let t = 0; t < s.length; t++) s[t].to < e && (e = s[t].to);
			e < m && (c = f.cut(e - a), f = f.cut(0, e - a), m = e, p = -1);
		} else for (; o < i.length && i[o].to < m;) o++;
		let h = f.isInline && !f.isLeaf ? s.filter((e) => !e.inline) : s.slice();
		r(f, h, t.forChild(a, f), p), a = m;
	}
}
function Pa(e) {
	if (e.nodeName == "UL" || e.nodeName == "OL") {
		let t = e.style.cssText;
		e.style.cssText = t + "; list-style: square !important", window.getComputedStyle(e).listStyle, e.style.cssText = t;
	}
}
function Fa(e, t, n, r) {
	for (let i = 0, a = 0; i < e.childCount && a <= r;) {
		let o = e.child(i++), s = a;
		if (a += o.nodeSize, !o.isText) continue;
		let c = o.text;
		for (; i < e.childCount;) {
			let t = e.child(i++);
			if (a += t.nodeSize, !t.isText) break;
			c += t.text;
		}
		if (a >= n) {
			if (a >= r && c.slice(r - t.length - s, r - s) == t) return r - t.length;
			let e = s < r ? c.lastIndexOf(t, r - s - 1) : -1;
			if (e >= 0 && e + t.length + s >= n) return s + e;
			if (n == r && c.length >= r + t.length - s && c.slice(r - s, r - s + t.length) == t) return r;
		}
	}
	return -1;
}
function Ia(e, t, n, r, i) {
	let a = [];
	for (let o = 0, s = 0; o < e.length; o++) {
		let c = e[o], l = s, u = s += c.size;
		l >= n || u <= t ? a.push(c) : (l < t && a.push(c.slice(0, t - l, r)), i &&= (a.push(i), void 0), u > n && a.push(c.slice(n - l, c.size, r)));
	}
	return a;
}
function La(e, t = null) {
	let n = e.domSelectionRange(), r = e.state.doc;
	if (!n.focusNode) return null;
	let i = e.docView.nearestDesc(n.focusNode), a = i && i.size == 0, o = e.docView.posFromDOM(n.focusNode, n.focusOffset, 1);
	if (o < 0) return null;
	let s = r.resolve(o), c, l;
	if (li(n)) {
		for (c = o; i && !i.node;) i = i.parent;
		let e = i.node;
		if (i && e.isAtom && A.isSelectable(e) && i.parent && !(e.isInline && si(n.focusNode, n.focusOffset, i.dom))) {
			let e = i.posBefore;
			l = new A(o == e ? s : r.resolve(e));
		}
	} else {
		if (n instanceof e.dom.ownerDocument.defaultView.Selection && n.rangeCount > 1) {
			let t = o, i = o;
			for (let r = 0; r < n.rangeCount; r++) {
				let a = n.getRangeAt(r);
				t = Math.min(t, e.docView.posFromDOM(a.startContainer, a.startOffset, 1)), i = Math.max(i, e.docView.posFromDOM(a.endContainer, a.endOffset, -1));
			}
			if (t < 0) return null;
			[c, o] = i == e.state.selection.anchor ? [i, t] : [t, i], s = r.resolve(o);
		} else c = e.docView.posFromDOM(n.anchorNode, n.anchorOffset, 1);
		if (c < 0) return null;
	}
	let u = r.resolve(c);
	if (!l) {
		let n = t == "pointer" || e.state.selection.head < s.pos && !a ? 1 : -1;
		l = Ja(e, u, s, n);
	}
	return l;
}
function Ra(e) {
	return e.editable ? e.hasFocus() : Xa(e) && document.activeElement && document.activeElement.contains(e.dom);
}
function za(e, t = !1) {
	let n = e.state.selection;
	if (Ka(e, n), !Ra(e)) return;
	let r = e.input.mouseDown;
	if (!t && P && r) {
		let t = e.domSelectionRange(), n = e.domObserver.currentSelection;
		if (t.anchorNode && n.anchorNode && ti(t.anchorNode, t.anchorOffset, n.anchorNode, n.anchorOffset) && r.delaySelUpdate()) {
			e.domObserver.setCurSelection();
			return;
		}
	}
	if (e.domObserver.disconnectSelection(), e.cursorWrapper) Ga(e);
	else {
		let { anchor: r, head: i } = n, a, o;
		Ba && !(n instanceof k) && (n.$from.parent.inlineContent || (a = Va(e, n.from)), !n.empty && !n.$from.parent.inlineContent && (o = Va(e, n.to))), e.docView.setSelection(r, i, e, t), Ba && (a && Ua(a), o && Ua(o)), n.visible ? e.dom.classList.remove("ProseMirror-hideselection") : (e.dom.classList.add("ProseMirror-hideselection"), "onselectionchange" in document && Wa(e));
	}
	e.domObserver.setCurSelection(), e.domObserver.connectSelection();
}
var Ba = F || P && Ci < 63;
function Va(e, t) {
	let { node: n, offset: r } = e.docView.domFromPos(t, 0), i = r < n.childNodes.length ? n.childNodes[r] : null, a = r ? n.childNodes[r - 1] : null;
	if (F && i && i.contentEditable == "false") return Ha(i);
	if ((!i || i.contentEditable == "false") && (!a || a.contentEditable == "false")) {
		if (i) return Ha(i);
		if (a) return Ha(a);
	}
}
function Ha(e) {
	return e.contentEditable = "true", F && e.draggable && (e.draggable = !1, e.wasDraggable = !0), e;
}
function Ua(e) {
	e.contentEditable = "false", e.wasDraggable &&= (e.draggable = !0, null);
}
function Wa(e) {
	let t = e.dom.ownerDocument;
	t.removeEventListener("selectionchange", e.input.hideSelectionGuard);
	let n = e.domSelectionRange(), r = n.anchorNode, i = n.anchorOffset;
	t.addEventListener("selectionchange", e.input.hideSelectionGuard = () => {
		(n.anchorNode != r || n.anchorOffset != i) && (t.removeEventListener("selectionchange", e.input.hideSelectionGuard), setTimeout(() => {
			(!Ra(e) || e.state.selection.visible) && e.dom.classList.remove("ProseMirror-hideselection");
		}, 20));
	});
}
function Ga(e) {
	let t = e.domSelection();
	if (!t) return;
	let n = e.cursorWrapper.dom, r = n.nodeName == "IMG";
	r ? t.collapse(n.parentNode, N(n) + 1) : t.collapse(n, 0), !r && !e.state.selection.visible && yi && bi <= 11 && (n.disabled = !0, n.disabled = !1);
}
function Ka(e, t) {
	if (t instanceof A) {
		let n = e.docView.descAt(t.from);
		n != e.lastSelectedViewDesc && (qa(e), n && n.selectNode(), e.lastSelectedViewDesc = n);
	} else qa(e);
}
function qa(e) {
	e.lastSelectedViewDesc &&= (e.lastSelectedViewDesc.parent && e.lastSelectedViewDesc.deselectNode(), void 0);
}
function Ja(e, t, n, r) {
	return e.someProp("createSelectionBetween", (r) => r(e, t, n)) || k.between(t, n, r);
}
function Ya(e) {
	return e.editable && !e.hasFocus() ? !1 : Xa(e);
}
function Xa(e) {
	let t = e.domSelectionRange();
	if (!t.anchorNode) return !1;
	try {
		return e.dom.contains(t.anchorNode.nodeType == 3 ? t.anchorNode.parentNode : t.anchorNode) && (e.editable || e.dom.contains(t.focusNode.nodeType == 3 ? t.focusNode.parentNode : t.focusNode));
	} catch {
		return !1;
	}
}
function Za(e) {
	let t = e.docView.domFromPos(e.state.selection.anchor, 0), n = e.domSelectionRange();
	return ti(t.node, t.offset, n.anchorNode, n.anchorOffset);
}
function Qa(e, t) {
	let { $anchor: n, $head: r } = e.selection, i = t > 0 ? n.max(r) : n.min(r), a = i.parent.inlineContent ? i.depth ? e.doc.resolve(t > 0 ? i.after() : i.before()) : null : i;
	return a && O.findFrom(a, t);
}
function $a(e, t) {
	return e.dispatch(e.state.tr.setSelection(t).scrollIntoView()), !0;
}
function eo(e, t, n) {
	let r = e.state.selection;
	if (r instanceof k) {
		if (n.indexOf("s") > -1) {
			let { $head: n } = r, i = n.textOffset ? null : t < 0 ? n.nodeBefore : n.nodeAfter;
			if (!i || i.isText || !i.isLeaf) return !1;
			let a = e.state.doc.resolve(n.pos + i.nodeSize * (t < 0 ? -1 : 1));
			return $a(e, new k(r.$anchor, a));
		}
		if (!r.empty) return !1;
		if (e.endOfTextblock(t > 0 ? "forward" : "backward")) {
			let n = Qa(e.state, t);
			return n && n instanceof A ? $a(e, n) : !1;
		}
		if (!(Ti && n.indexOf("m") > -1)) {
			let n = r.$head, i = n.textOffset ? null : t < 0 ? n.nodeBefore : n.nodeAfter, a;
			if (!i || i.isText) return !1;
			let o = t < 0 ? n.pos - i.nodeSize : n.pos;
			return i.isAtom || (a = e.docView.descAt(o)) && !a.contentDOM ? A.isSelectable(i) ? $a(e, new A(t < 0 ? e.state.doc.resolve(n.pos - i.nodeSize) : n)) : Oi ? $a(e, new k(e.state.doc.resolve(t < 0 ? o : o + i.nodeSize))) : !1 : !1;
		}
	} else if (r instanceof A && r.node.isInline) return $a(e, new k(t > 0 ? r.$to : r.$from));
	else {
		let n = Qa(e.state, t);
		return n ? $a(e, n) : !1;
	}
}
function to(e) {
	return e.nodeType == 3 ? e.nodeValue.length : e.childNodes.length;
}
function no(e, t) {
	let n = e.pmViewDesc;
	return n ? n.size == 0 && (t < 0 || e.nextSibling || e.nodeName != "BR") : e.nodeType == 1 && e.contentEditable == "false";
}
function ro(e, t) {
	return t < 0 ? io(e) : ao(e);
}
function io(e) {
	let t = e.domSelectionRange(), n = t.focusNode, r = t.focusOffset;
	if (!n) return;
	let i, a, o = !1;
	for (xi && n.nodeType == 1 && r < to(n) && no(n.childNodes[r], -1) && (o = !0);;) if (r > 0) {
		if (n.nodeType != 1) break;
		{
			let e = n.childNodes[r - 1];
			if (no(e, -1)) i = n, a = --r;
			else if (e.nodeType == 3) n = e, r = n.nodeValue.length;
			else break;
		}
	} else if (oo(n)) break;
	else {
		let t = n.previousSibling;
		for (; t && no(t, -1);) i = n.parentNode, a = N(t), t = t.previousSibling;
		if (t) n = t, r = to(n);
		else {
			if (n = n.parentNode, n == e.dom) break;
			r = 0;
		}
	}
	o ? lo(e, n, r) : i && lo(e, i, a);
}
function ao(e) {
	let t = e.domSelectionRange(), n = t.focusNode, r = t.focusOffset;
	if (!n) return;
	let i = to(n), a, o;
	for (;;) if (r < i) {
		if (n.nodeType != 1) break;
		let e = n.childNodes[r];
		if (no(e, 1)) a = n, o = ++r;
		else break;
	} else if (oo(n)) break;
	else {
		let t = n.nextSibling;
		for (; t && no(t, 1);) a = t.parentNode, o = N(t) + 1, t = t.nextSibling;
		if (t) n = t, r = 0, i = to(n);
		else {
			if (n = n.parentNode, n == e.dom) break;
			r = i = 0;
		}
	}
	a && lo(e, a, o);
}
function oo(e) {
	let t = e.pmViewDesc;
	return t && t.node && t.node.isBlock;
}
function so(e, t) {
	for (; e && t == e.childNodes.length && !ci(e);) t = N(e) + 1, e = e.parentNode;
	for (; e && t < e.childNodes.length;) {
		let n = e.childNodes[t];
		if (n.nodeType == 3) return n;
		if (n.nodeType == 1 && n.contentEditable == "false") break;
		e = n, t = 0;
	}
}
function co(e, t) {
	for (; e && !t && !ci(e);) t = N(e), e = e.parentNode;
	for (; e && t;) {
		let n = e.childNodes[t - 1];
		if (n.nodeType == 3) return n;
		if (n.nodeType == 1 && n.contentEditable == "false") break;
		e = n, t = e.childNodes.length;
	}
}
function lo(e, t, n) {
	if (t.nodeType != 3) {
		let e, r;
		(r = so(t, n)) ? (t = r, n = 0) : (e = co(t, n)) && (t = e, n = e.nodeValue.length);
	}
	let r = e.domSelection();
	if (!r) return;
	if (li(r)) {
		let e = document.createRange();
		e.setEnd(t, n), e.setStart(t, n), r.removeAllRanges(), r.addRange(e);
	} else r.extend && r.extend(t, n);
	e.domObserver.setCurSelection();
	let { state: i } = e;
	setTimeout(() => {
		e.state == i && za(e);
	}, 50);
}
function uo(e, t) {
	let n = e.state.doc.resolve(t);
	if (!(P || Ei) && n.parent.inlineContent) {
		let r = e.coordsAtPos(t);
		if (t > n.start()) {
			let n = e.coordsAtPos(t - 1), i = (n.top + n.bottom) / 2;
			if (i > r.top && i < r.bottom && Math.abs(n.left - r.left) > 1) return n.left < r.left ? "ltr" : "rtl";
		}
		if (t < n.end()) {
			let n = e.coordsAtPos(t + 1), i = (n.top + n.bottom) / 2;
			if (i > r.top && i < r.bottom && Math.abs(n.left - r.left) > 1) return n.left > r.left ? "ltr" : "rtl";
		}
	}
	return getComputedStyle(e.dom).direction == "rtl" ? "rtl" : "ltr";
}
function fo(e, t, n) {
	let r = e.state.selection;
	if (r instanceof k && !r.empty || n.indexOf("s") > -1 || Ti && n.indexOf("m") > -1) return !1;
	let { $from: i, $to: a } = r;
	if (!i.parent.inlineContent || e.endOfTextblock(t < 0 ? "up" : "down")) {
		let n = Qa(e.state, t);
		if (n && n instanceof A) return $a(e, n);
	}
	if (!i.parent.inlineContent) {
		let n = t < 0 ? i : a, o = r instanceof wn ? O.near(n, t) : O.findFrom(n, t);
		return o ? $a(e, o) : !1;
	}
	return !1;
}
function po(e, t) {
	if (!(e.state.selection instanceof k)) return !0;
	let { $head: n, $anchor: r, empty: i } = e.state.selection;
	if (!n.sameParent(r)) return !0;
	if (!i) return !1;
	if (e.endOfTextblock(t > 0 ? "forward" : "backward")) return !0;
	let a = !n.textOffset && (t < 0 ? n.nodeBefore : n.nodeAfter);
	if (a && !a.isText) {
		let r = e.state.tr;
		return t < 0 ? r.delete(n.pos - a.nodeSize, n.pos) : r.delete(n.pos, n.pos + a.nodeSize), e.dispatch(r), !0;
	}
	return !1;
}
function mo(e, t, n) {
	e.domObserver.stop(), t.contentEditable = n, e.domObserver.start();
}
function ho(e) {
	if (!F || e.state.selection.$head.parentOffset > 0) return !1;
	let { focusNode: t, focusOffset: n } = e.domSelectionRange();
	if (t && t.nodeType == 1 && n == 0 && t.firstChild && t.firstChild.contentEditable == "false") {
		let n = t.firstChild;
		mo(e, n, "true"), setTimeout(() => mo(e, n, "false"), 20);
	}
	return !1;
}
function go(e) {
	let t = "";
	return e.ctrlKey && (t += "c"), e.metaKey && (t += "m"), e.altKey && (t += "a"), e.shiftKey && (t += "s"), t;
}
function _o(e, t) {
	let n = t.keyCode, r = go(t);
	if (n == 8 || Ti && n == 72 && r == "c") return po(e, -1) || ro(e, -1);
	if (n == 46 && !t.shiftKey || Ti && n == 68 && r == "c") return po(e, 1) || ro(e, 1);
	if (n == 13 || n == 27) return !0;
	if (n == 37 || Ti && n == 66 && r == "c") {
		let t = n == 37 ? uo(e, e.state.selection.from) == "ltr" ? -1 : 1 : -1;
		return eo(e, t, r) || ro(e, t);
	}
	if (n == 39 || Ti && n == 70 && r == "c") {
		let t = n == 39 ? uo(e, e.state.selection.from) == "ltr" ? 1 : -1 : 1;
		return eo(e, t, r) || ro(e, t);
	}
	return n == 38 || Ti && n == 80 && r == "c" ? fo(e, -1, r) || ro(e, -1) : n == 40 || Ti && n == 78 && r == "c" ? ho(e) || fo(e, 1, r) || ro(e, 1) : !(r != (Ti ? "m" : "c") || n != 66 && n != 73 && n != 89 && n != 90);
}
function vo(e, t) {
	e.someProp("transformCopied", (n) => {
		t = n(t, e);
	});
	let n = [], { content: r, openStart: i, openEnd: a } = t;
	for (; i > 1 && a > 1 && r.childCount == 1 && r.firstChild.childCount == 1;) {
		i--, a--;
		let e = r.firstChild;
		n.push(e.type.name, e.attrs == e.type.defaultAttrs ? null : e.attrs), r = e.content;
	}
	let o = e.someProp("clipboardSerializer") || Ze.fromSchema(e.state.schema), s = Oo(), c = s.createElement("div");
	c.appendChild(o.serializeFragment(r, { document: s }));
	let l = c.firstChild, u, d = 0;
	for (; l && l.nodeType == 1 && (u = Do[l.nodeName.toLowerCase()]);) {
		for (let e = u.length - 1; e >= 0; e--) {
			let t = s.createElement(u[e]);
			for (; c.firstChild;) t.appendChild(c.firstChild);
			c.appendChild(t), d++;
		}
		l = c.firstChild;
	}
	return l && l.nodeType == 1 && l.setAttribute("data-pm-slice", `${i} ${a}${d ? ` -${d}` : ""} ${JSON.stringify(n)}`), {
		dom: c,
		text: e.someProp("clipboardTextSerializer", (n) => n(t, e)) || t.content.textBetween(0, t.content.size, "\n\n"),
		slice: t
	};
}
function yo(e, t, n, r, i) {
	let a = i.parent.type.spec.code, o, s;
	if (!n && !t) return null;
	let c = !!t && (r || a || !n);
	if (c) {
		if (e.someProp("transformPastedText", (n) => {
			t = n(t, a || r, e);
		}), a) return s = new h(l.from(e.state.schema.text(t.replace(/\r\n?/g, "\n"))), 0, 0), e.someProp("transformPasted", (t) => {
			s = t(s, e, !0);
		}), s;
		let n = e.someProp("clipboardTextParser", (n) => n(t, i, r, e));
		if (n) s = n;
		else {
			let n = i.marks(), { schema: r } = e.state, a = Ze.fromSchema(r);
			o = document.createElement("div"), t.split(/(?:\r\n?|\n)+/).forEach((e) => {
				let t = o.appendChild(document.createElement("p"));
				e && t.appendChild(a.serializeNode(r.text(e, n)));
			});
		}
	} else e.someProp("transformPastedHTML", (t) => {
		n = t(n, e);
	}), o = jo(n), Oi && Mo(o);
	let u = o && o.querySelector("[data-pm-slice]"), d = u && /^(\d+) (\d+)(?: -(\d+))? (.*)/.exec(u.getAttribute("data-pm-slice") || "");
	if (d && d[3]) for (let e = +d[3]; e > 0; e--) {
		let e = o.firstChild;
		for (; e && e.nodeType != 1;) e = e.nextSibling;
		if (!e) break;
		o = e;
	}
	if (s ||= (e.someProp("clipboardParser") || e.someProp("domParser") || Le.fromSchema(e.state.schema)).parseSlice(o, {
		preserveWhitespace: !!(c || d),
		context: i,
		ruleFromNode(e) {
			return e.nodeName == "BR" && !e.nextSibling && e.parentNode && !bo.test(e.parentNode.nodeName) ? { ignore: !0 } : null;
		}
	}), d) s = No(Eo(s, +d[1], +d[2]), d[4]);
	else if (s = h.maxOpen(xo(s.content, i), !0), s.openStart || s.openEnd) {
		let e = 0, t = 0;
		for (let t = s.content.firstChild; e < s.openStart && !t.type.spec.isolating; e++, t = t.firstChild);
		for (let e = s.content.lastChild; t < s.openEnd && !e.type.spec.isolating; t++, e = e.lastChild);
		s = Eo(s, e, t);
	}
	return e.someProp("transformPasted", (t) => {
		s = t(s, e, c);
	}), s;
}
var bo = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
function xo(e, t) {
	if (e.childCount < 2) return e;
	for (let n = t.depth; n >= 0; n--) {
		let r = t.node(n).contentMatchAt(t.index(n)), i, a = [];
		if (e.forEach((e) => {
			if (!a) return;
			let t = r.findWrapping(e.type), n;
			if (!t) return a = null;
			if (n = a.length && i.length && Co(t, i, e, a[a.length - 1], 0)) a[a.length - 1] = n;
			else {
				a.length && (a[a.length - 1] = wo(a[a.length - 1], i.length));
				let n = So(e, t);
				a.push(n), r = r.matchType(n.type), i = t;
			}
		}), a) return l.from(a);
	}
	return e;
}
function So(e, t, n = 0) {
	for (let r = t.length - 1; r >= n; r--) e = t[r].create(null, l.from(e));
	return e;
}
function Co(e, t, n, r, i) {
	if (i < e.length && i < t.length && e[i] == t[i]) {
		let a = Co(e, t, n, r.lastChild, i + 1);
		if (a) return r.copy(r.content.replaceChild(r.childCount - 1, a));
		if (r.contentMatchAt(r.childCount).matchType(i == e.length - 1 ? n.type : e[i + 1])) return r.copy(r.content.append(l.from(So(n, e, i + 1))));
	}
}
function wo(e, t) {
	if (t == 0) return e;
	let n = e.content.replaceChild(e.childCount - 1, wo(e.lastChild, t - 1)), r = e.contentMatchAt(e.childCount).fillBefore(l.empty, !0);
	return e.copy(n.append(r));
}
function To(e, t, n, r, i, a) {
	let o = t < 0 ? e.firstChild : e.lastChild, s = o.content;
	return e.childCount > 1 && (a = 0), i < r - 1 && (s = To(s, t, n, r, i + 1, a)), i >= n && (s = t < 0 ? o.contentMatchAt(0).fillBefore(s, a <= i).append(s) : s.append(o.contentMatchAt(o.childCount).fillBefore(l.empty, !0))), e.replaceChild(t < 0 ? 0 : e.childCount - 1, o.copy(s));
}
function Eo(e, t, n) {
	return t < e.openStart && (e = new h(To(e.content, -1, t, e.openStart, 0, e.openEnd), t, e.openEnd)), n < e.openEnd && (e = new h(To(e.content, 1, n, e.openEnd, 0, 0), e.openStart, n)), e;
}
var Do = {
	thead: ["table"],
	tbody: ["table"],
	tfoot: ["table"],
	caption: ["table"],
	colgroup: ["table"],
	col: ["table", "colgroup"],
	tr: ["table", "tbody"],
	td: [
		"table",
		"tbody",
		"tr"
	],
	th: [
		"table",
		"tbody",
		"tr"
	]
};
function Oo() {
	return document.implementation.createHTMLDocument("title");
}
var ko = null;
function Ao(e) {
	let t = window.trustedTypes;
	if (!t) return e;
	if (!ko) {
		if (ko = t.defaultPolicy) try {
			return ko.createHTML(e);
		} catch {}
		ko = t.createPolicy("ProseMirrorClipboard", { createHTML: (e) => e });
	}
	return ko.createHTML(e);
}
function jo(e) {
	let t = /^(\s*<meta [^>]*>)*/.exec(e);
	t && (e = e.slice(t[0].length));
	let n = Oo(), r = n.body, i = /<([a-z][^>\s]+)/i.exec(e), a;
	if ((a = i && Do[i[1].toLowerCase()]) && (e = a.map((e) => "<" + e + ">").join("") + e + a.map((e) => "</" + e + ">").reverse().join("")), r.innerHTML = Ao(e), a) for (let e = 0; e < a.length; e++) r = r.querySelector(a[e]) || r;
	for (let e = 0; e < n.styleSheets.length; e++) {
		let t = n.styleSheets[e];
		for (let e = 0; e < t.rules.length; e++) {
			let n = t.rules[e];
			if (n instanceof CSSStyleRule) {
				let e = r.querySelectorAll(n.selectorText);
				for (let t = 0; t < e.length; t++) e[t].style.cssText += n.style.cssText;
			}
		}
	}
	return r;
}
function Mo(e) {
	let t = e.querySelectorAll(P ? "span:not([class]):not([style])" : "span.Apple-converted-space");
	for (let n = 0; n < t.length; n++) {
		let r = t[n];
		r.childNodes.length == 1 && r.textContent == "\xA0" && r.parentNode && r.parentNode.replaceChild(e.ownerDocument.createTextNode(" "), r);
	}
}
function No(e, t) {
	if (!e.size) return e;
	let n = e.content.firstChild.type.schema, r;
	try {
		r = JSON.parse(t);
	} catch {
		return e;
	}
	let { content: i, openStart: a, openEnd: o } = e;
	for (let e = r.length - 2; e >= 0; e -= 2) {
		let t = n.nodes[r[e]];
		if (!t || t.hasRequiredAttrs()) break;
		try {
			t.checkAttrs(r[e + 1]);
		} catch {
			break;
		}
		i = l.from(t.create(r[e + 1], i)), a++, o++;
	}
	return new h(i, a, o);
}
var Po = {}, Fo = {}, Io = {
	touchstart: !0,
	touchmove: !0
}, Lo = class {
	constructor() {
		this.shiftKey = !1, this.mouseDown = null, this.lastKeyCode = null, this.lastKeyCodeTime = 0, this.lastClick = {
			time: 0,
			x: 0,
			y: 0,
			type: "",
			button: 0
		}, this.lastSelectionOrigin = null, this.lastSelectionTime = 0, this.lastIOSEnter = 0, this.lastIOSEnterFallbackTimeout = -1, this.lastFocus = 0, this.lastTouch = 0, this.lastChromeDelete = 0, this.composing = !1, this.compositionNode = null, this.composingTimeout = -1, this.compositionNodes = [], this.compositionEndedAt = -2e8, this.compositionID = 1, this.badSafariComposition = !1, this.compositionPendingChanges = 0, this.domChangeCount = 0, this.eventHandlers = Object.create(null), this.hideSelectionGuard = null;
	}
};
function Ro(e) {
	for (let t in Po) {
		let n = Po[t];
		e.dom.addEventListener(t, e.input.eventHandlers[t] = (t) => {
			Uo(e, t) && !Ho(e, t) && (e.editable || !(t.type in Fo)) && n(e, t);
		}, Io[t] ? { passive: !0 } : void 0);
	}
	F && e.dom.addEventListener("input", () => null), Vo(e);
}
function zo(e, t) {
	e.input.lastSelectionOrigin = t, e.input.lastSelectionTime = Date.now();
}
function Bo(e) {
	e.input.mouseDown && e.input.mouseDown.done(), e.domObserver.stop();
	for (let t in e.input.eventHandlers) e.dom.removeEventListener(t, e.input.eventHandlers[t]);
	clearTimeout(e.input.composingTimeout), clearTimeout(e.input.lastIOSEnterFallbackTimeout);
}
function Vo(e) {
	e.someProp("handleDOMEvents", (t) => {
		for (let n in t) e.input.eventHandlers[n] || e.dom.addEventListener(n, e.input.eventHandlers[n] = (t) => Ho(e, t));
	});
}
function Ho(e, t) {
	return e.someProp("handleDOMEvents", (n) => {
		let r = n[t.type];
		return r ? r(e, t) || t.defaultPrevented : !1;
	});
}
function Uo(e, t) {
	if (!t.bubbles) return !0;
	if (t.defaultPrevented) return !1;
	for (let n = t.target; n != e.dom; n = n.parentNode) if (!n || n.nodeType == 11 || n.pmViewDesc && n.pmViewDesc.stopEvent(t)) return !1;
	return !0;
}
function Wo(e, t) {
	!Ho(e, t) && Po[t.type] && (e.editable || !(t.type in Fo)) && Po[t.type](e, t);
}
Fo.keydown = (e, t) => {
	let n = t;
	if (e.input.shiftKey = n.keyCode == 16 || n.shiftKey, !cs(e) && (e.input.lastKeyCode = n.keyCode, e.input.lastKeyCodeTime = Date.now(), !(Di && P && n.keyCode == 13))) {
		if (n.keyCode != 229 && e.domObserver.forceFlush(), wi && n.keyCode == 13 && !n.ctrlKey && !n.altKey && !n.metaKey) {
			let t = Date.now();
			e.input.lastIOSEnter = t, e.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
				e.input.lastIOSEnter == t && (e.someProp("handleKeyDown", (t) => t(e, ui(13, "Enter"))), e.input.lastIOSEnter = 0);
			}, 200);
		} else e.someProp("handleKeyDown", (t) => t(e, n)) || _o(e, n) ? n.preventDefault() : zo(e, "key");
	}
}, Fo.keyup = (e, t) => {
	t.keyCode == 16 && (e.input.shiftKey = !1);
}, Fo.keypress = (e, t) => {
	let n = t;
	if (cs(e) || !n.charCode || n.ctrlKey && !n.altKey || Ti && n.metaKey) return;
	if (e.someProp("handleKeyPress", (t) => t(e, n))) {
		n.preventDefault();
		return;
	}
	let r = e.state.selection;
	if (!(r instanceof k) || !r.$from.sameParent(r.$to)) {
		let t = String.fromCharCode(n.charCode), i = () => e.state.tr.insertText(t).scrollIntoView();
		!/[\r\n]/.test(t) && !e.someProp("handleTextInput", (n) => n(e, r.$from.pos, r.$to.pos, t, i)) && e.dispatch(i()), n.preventDefault();
	}
};
function Go(e) {
	return {
		left: e.clientX,
		top: e.clientY
	};
}
function Ko(e, t) {
	let n = t.x - e.clientX, r = t.y - e.clientY;
	return n * n + r * r < 100;
}
function qo(e, t, n, r, i) {
	if (r == -1) return !1;
	let a = e.state.doc.resolve(r);
	for (let r = a.depth + 1; r > 0; r--) if (e.someProp(t, (t) => r > a.depth ? t(e, n, a.nodeAfter, a.before(r), i, !0) : t(e, n, a.node(r), a.before(r), i, !1))) return !0;
	return !1;
}
function Jo(e, t, n) {
	if (e.focused || e.focus(), e.state.selection.eq(t)) return;
	let r = e.state.tr.setSelection(t);
	n == "pointer" && r.setMeta("pointer", !0), e.dispatch(r);
}
function Yo(e, t) {
	if (t == -1) return !1;
	let n = e.state.doc.resolve(t), r = n.nodeAfter;
	return r && r.isAtom && A.isSelectable(r) ? (Jo(e, new A(n), "pointer"), !0) : !1;
}
function Xo(e, t) {
	if (t == -1) return !1;
	let n = e.state.selection, r, i;
	n instanceof A && (r = n.node);
	let a = e.state.doc.resolve(t);
	for (let e = a.depth + 1; e > 0; e--) {
		let t = e > a.depth ? a.nodeAfter : a.node(e);
		if (A.isSelectable(t)) {
			i = r && n.$from.depth > 0 && e >= n.$from.depth && a.before(n.$from.depth + 1) == n.$from.pos ? a.before(n.$from.depth) : a.before(e);
			break;
		}
	}
	return i != null && (Jo(e, A.create(e.state.doc, i), "pointer"), !0);
}
function Zo(e, t, n, r, i) {
	return qo(e, "handleClickOn", t, n, r) || e.someProp("handleClick", (n) => n(e, t, r)) || (i ? Xo(e, n) : Yo(e, n));
}
function Qo(e, t, n, r) {
	return qo(e, "handleDoubleClickOn", t, n, r) || e.someProp("handleDoubleClick", (n) => n(e, t, r));
}
function $o(e, t, n, r) {
	return qo(e, "handleTripleClickOn", t, n, r) || e.someProp("handleTripleClick", (n) => n(e, t, r)) || es(e, n, r);
}
function es(e, t, n) {
	if (n.button != 0) return !1;
	let r = ts(e, t, !0), i = e.state.doc;
	return r ? (Jo(e, r, "pointer"), r instanceof k && i.eq(e.state.doc) && (e.input.mouseDown = new ss(e, r)), !0) : !1;
}
function ts(e, t, n) {
	let r = e.state.doc;
	if (t == -1) return r.inlineContent ? k.create(r, 0, r.content.size) : null;
	let i = r.resolve(t);
	for (let e = i.depth + 1; e > 0; e--) {
		let t = e > i.depth ? i.nodeAfter : i.node(e), a = i.before(e);
		if (t.inlineContent) return k.create(r, a + 1, a + 1 + t.content.size);
		if (n && A.isSelectable(t)) return A.create(r, a);
	}
	return null;
}
function ns(e) {
	return ms(e);
}
var rs = Ti ? "metaKey" : "ctrlKey";
Po.mousedown = (e, t) => {
	let n = t;
	e.input.shiftKey = n.shiftKey;
	let r = ns(e), i = Date.now(), a = "singleClick";
	i - e.input.lastClick.time < 500 && Ko(n, e.input.lastClick) && !n[rs] && e.input.lastClick.button == n.button && (e.input.lastClick.type == "singleClick" ? a = "doubleClick" : e.input.lastClick.type == "doubleClick" && (a = "tripleClick")), e.input.lastClick = {
		time: i,
		x: n.clientX,
		y: n.clientY,
		type: a,
		button: n.button
	}, e.input.mouseDown && e.input.mouseDown.done();
	let o = e.posAtCoords(Go(n));
	o && (a == "singleClick" ? e.input.mouseDown = new as(e, o, n, !!r) : (a == "doubleClick" ? Qo : $o)(e, o.pos, o.inside, n) ? n.preventDefault() : zo(e, "pointer"));
};
var is = class {
	constructor(e) {
		this.view = e, this.mightDrag = null, e.root.addEventListener("mouseup", this.up = this.up.bind(this)), e.root.addEventListener("mousemove", this.move = this.move.bind(this));
	}
	up(e) {
		this.done();
	}
	move(e) {
		e.buttons == 0 && this.done();
	}
	done() {
		this.view.root.removeEventListener("mouseup", this.up), this.view.root.removeEventListener("mousemove", this.move), this.view.input.mouseDown == this && (this.view.input.mouseDown = null);
	}
	delaySelUpdate() {
		return !1;
	}
}, as = class extends is {
	constructor(e, t, n, r) {
		super(e), this.pos = t, this.event = n, this.flushed = r, this.delayedSelectionSync = !1, this.startDoc = e.state.doc, this.selectNode = !!n[rs], this.allowDefault = n.shiftKey;
		let i, a;
		if (t.inside > -1) i = e.state.doc.nodeAt(t.inside), a = t.inside;
		else {
			let n = e.state.doc.resolve(t.pos);
			i = n.parent, a = n.depth ? n.before() : 0;
		}
		let o = r ? null : n.target, s = o ? e.docView.nearestDesc(o, !0) : null;
		this.target = s && s.nodeDOM.nodeType == 1 ? s.nodeDOM : null;
		let { selection: c } = e.state;
		n.button == 0 && (i.type.spec.draggable && i.type.spec.selectable !== !1 || c instanceof A && c.from <= a && c.to > a) && (this.mightDrag = {
			node: i,
			pos: a,
			addAttr: !(!this.target || this.target.draggable),
			setUneditable: !!(this.target && xi && !this.target.hasAttribute("contentEditable"))
		}), this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable) && (this.view.domObserver.stop(), this.mightDrag.addAttr && (this.target.draggable = !0), this.mightDrag.setUneditable && setTimeout(() => {
			this.view.input.mouseDown == this && this.target.setAttribute("contentEditable", "false");
		}, 20), this.view.domObserver.start()), zo(e, "pointer");
	}
	done() {
		super.done(), this.mightDrag && this.target && (this.view.domObserver.stop(), this.mightDrag.addAttr && this.target.removeAttribute("draggable"), this.mightDrag.setUneditable && this.target.removeAttribute("contentEditable"), this.view.domObserver.start()), this.delayedSelectionSync && setTimeout(() => {
			this.view.isDestroyed || za(this.view);
		});
	}
	up(e) {
		if (this.done(), !this.view.dom.contains(e.target)) return;
		let t = this.pos;
		this.view.state.doc != this.startDoc && (t = this.view.posAtCoords(Go(e))), this.updateAllowDefault(e), this.allowDefault || !t ? zo(this.view, "pointer") : Zo(this.view, t.pos, t.inside, e, this.selectNode) ? e.preventDefault() : e.button == 0 && (this.flushed || F && this.mightDrag && !this.mightDrag.node.isAtom || P && !this.view.state.selection.visible && Math.min(Math.abs(t.pos - this.view.state.selection.from), Math.abs(t.pos - this.view.state.selection.to)) <= 2) ? (Jo(this.view, O.near(this.view.state.doc.resolve(t.pos)), "pointer"), e.preventDefault()) : zo(this.view, "pointer");
	}
	move(e) {
		this.updateAllowDefault(e), zo(this.view, "pointer"), super.move(e);
	}
	updateAllowDefault(e) {
		!this.allowDefault && (Math.abs(this.event.x - e.clientX) > 4 || Math.abs(this.event.y - e.clientY) > 4) && (this.allowDefault = !0);
	}
	delaySelUpdate() {
		return this.allowDefault ? (this.delayedSelectionSync = !0, !0) : !1;
	}
}, ss = class extends is {
	constructor(e, t) {
		super(e), this.startSelection = t, this.startDoc = e.state.doc;
	}
	move(e) {
		if (e.buttons == 0 || this.view.isDestroyed || !this.view.state.doc.eq(this.startDoc)) {
			this.done();
			return;
		}
		e.preventDefault(), zo(this.view, "pointer");
		let t = this.view.posAtCoords(Go(e)), n = t && ts(this.view, t.inside, !1);
		if (!n) return;
		let { doc: r } = this.view.state, i = this.startSelection, [a, o] = n.from < i.from ? [i.to, n.from] : [i.from, n.to];
		Jo(this.view, k.create(r, a, o), "pointer");
	}
};
Po.touchstart = (e) => {
	e.input.lastTouch = Date.now(), ns(e), zo(e, "pointer");
}, Po.touchmove = (e) => {
	e.input.lastTouch = Date.now(), zo(e, "pointer");
}, Po.contextmenu = (e) => ns(e);
function cs(e, t) {
	return e.composing ? !0 : F && Math.abs(Date.now() - e.input.compositionEndedAt) < 500 ? (e.input.compositionEndedAt = -2e8, !0) : !1;
}
var ls = Di ? 5e3 : -1;
Fo.compositionstart = Fo.compositionupdate = (e) => {
	if (!e.composing) {
		e.domObserver.flush();
		let { state: t } = e, n = t.selection.$to;
		if (t.selection instanceof k && t.selection.empty && (t.storedMarks || !n.textOffset && n.parentOffset && n.nodeBefore.marks.some((e) => e.type.spec.inclusive === !1) || P && Ei && us(e))) e.markCursor = e.state.storedMarks || n.marks(), ms(e, !0), e.markCursor = null;
		else if (ms(e, !t.selection.empty), xi && t.selection.empty && n.parentOffset && !n.textOffset && n.nodeBefore.marks.length) {
			let t = e.domSelectionRange();
			for (let n = t.focusNode, r = t.focusOffset; n && n.nodeType == 1 && r != 0;) {
				let t = r < 0 ? n.lastChild : n.childNodes[r - 1];
				if (!t) break;
				if (t.nodeType == 3) {
					let n = e.domSelection();
					n && n.collapse(t, t.nodeValue.length);
					break;
				}
				n = t, r = -1;
			}
		}
		e.input.composing = !0;
	}
	ds(e, ls);
};
function us(e) {
	let { focusNode: t, focusOffset: n } = e.domSelectionRange();
	if (!t || t.nodeType != 1 || n >= t.childNodes.length) return !1;
	let r = t.childNodes[n];
	return r.nodeType == 1 && r.contentEditable == "false";
}
Fo.compositionend = (e, t) => {
	e.composing && (e.input.composing = !1, e.input.compositionEndedAt = Date.now(), e.input.compositionPendingChanges = e.domObserver.pendingRecords().length ? e.input.compositionID : 0, e.input.compositionNode = null, e.input.badSafariComposition ? e.domObserver.forceFlush() : e.input.compositionPendingChanges && Promise.resolve().then(() => e.domObserver.flush()), e.input.compositionID++, ds(e, 20));
};
function ds(e, t) {
	clearTimeout(e.input.composingTimeout), t > -1 && (e.input.composingTimeout = setTimeout(() => ms(e), t));
}
function fs(e) {
	for (e.composing && (e.input.composing = !1, e.input.compositionEndedAt = Date.now()); e.input.compositionNodes.length > 0;) e.input.compositionNodes.pop().markParentsDirty();
}
function ps(e) {
	let t = e.domSelectionRange();
	if (!t.focusNode) return null;
	let n = ai(t.focusNode, t.focusOffset), r = oi(t.focusNode, t.focusOffset);
	if (n && r && n != r) {
		let t = r.pmViewDesc, i = e.domObserver.lastChangedTextNode;
		if (n == i || r == i) return i;
		if (!t || !t.isText(r.nodeValue)) return r;
		if (e.input.compositionNode == r) {
			let e = n.pmViewDesc;
			if (e && e.isText(n.nodeValue)) return r;
		}
	}
	return n || r;
}
function ms(e, t = !1) {
	if (!(Di && e.domObserver.flushingSoon >= 0)) {
		if (e.domObserver.forceFlush(), fs(e), t || e.docView && e.docView.dirty) {
			let n = La(e), r = e.state.selection;
			return n && !n.eq(r) ? e.dispatch(e.state.tr.setSelection(n)) : (e.markCursor || t) && !r.$from.node(r.$from.sharedDepth(r.to)).inlineContent ? e.dispatch(e.state.tr.deleteSelection()) : e.updateState(e.state), !0;
		}
		return !1;
	}
}
function hs(e, t) {
	if (!e.dom.parentNode) return;
	let n = e.dom.parentNode.appendChild(document.createElement("div"));
	n.appendChild(t), n.style.cssText = "position: fixed; left: -10000px; top: 10px";
	let r = getSelection(), i = document.createRange();
	i.selectNodeContents(t), e.dom.blur(), r.removeAllRanges(), r.addRange(i), setTimeout(() => {
		n.parentNode && n.parentNode.removeChild(n), e.focus();
	}, 50);
}
var gs = yi && bi < 15 || wi && ki < 604;
Po.copy = Fo.cut = (e, t) => {
	let n = t, r = e.state.selection, i = n.type == "cut";
	if (r.empty) return;
	let a = gs ? null : n.clipboardData, { dom: o, text: s } = vo(e, r.content());
	a ? (n.preventDefault(), a.clearData(), a.setData("text/html", o.innerHTML), a.setData("text/plain", s)) : hs(e, o), i && e.dispatch(e.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
function _s(e) {
	return e.openStart == 0 && e.openEnd == 0 && e.content.childCount == 1 ? e.content.firstChild : null;
}
function vs(e, t) {
	if (!e.dom.parentNode) return;
	let n = e.input.shiftKey || e.state.selection.$from.parent.type.spec.code, r = e.dom.parentNode.appendChild(document.createElement(n ? "textarea" : "div"));
	n || (r.contentEditable = "true"), r.style.cssText = "position: fixed; left: -10000px; top: 10px", r.focus();
	let i = e.input.shiftKey && e.input.lastKeyCode != 45;
	setTimeout(() => {
		e.focus(), r.parentNode && r.parentNode.removeChild(r), n ? ys(e, r.value, null, i, t) : ys(e, r.textContent, r.innerHTML, i, t);
	}, 50);
}
function ys(e, t, n, r, i) {
	let a = yo(e, t, n, r, e.state.selection.$from);
	if (e.someProp("handlePaste", (t) => t(e, i, a || h.empty))) return !0;
	if (!a) return !1;
	let o = _s(a), s = o ? e.state.tr.replaceSelectionWith(o, r) : e.state.tr.replaceSelection(a);
	return e.dispatch(s.scrollIntoView().setMeta("paste", !0).setMeta("uiEvent", "paste")), !0;
}
function bs(e) {
	let t = e.getData("text/plain") || e.getData("Text");
	if (t) return t;
	let n = e.getData("text/uri-list");
	return n ? n.replace(/\r?\n/g, " ") : "";
}
Fo.paste = (e, t) => {
	let n = t;
	if (e.composing && !Di) return;
	let r = gs ? null : n.clipboardData, i = e.input.shiftKey && e.input.lastKeyCode != 45;
	r && ys(e, bs(r), r.getData("text/html"), i, n) ? n.preventDefault() : vs(e, n);
};
var xs = class {
	constructor(e, t, n) {
		this.slice = e, this.move = t, this.node = n;
	}
}, Ss = Ti ? "altKey" : "ctrlKey";
function Cs(e, t) {
	let n;
	return e.someProp("dragCopies", (e) => {
		n ||= e(t);
	}), n == null ? !t[Ss] : !n;
}
Po.dragstart = (e, t) => {
	let n = t, r = e.input.mouseDown;
	if (r && r.done(), !n.dataTransfer) return;
	let i = e.state.selection, a = i.empty ? null : e.posAtCoords(Go(n)), o;
	if (!(a && a.pos >= i.from && a.pos <= (i instanceof A ? i.to - 1 : i.to))) {
		if (r && r.mightDrag) o = A.create(e.state.doc, r.mightDrag.pos);
		else if (n.target && n.target.nodeType == 1) {
			let t = e.docView.nearestDesc(n.target, !0);
			t && t.node.type.spec.draggable && t != e.docView && (o = A.create(e.state.doc, t.posBefore));
		}
	}
	let { dom: s, text: c, slice: l } = vo(e, (o || e.state.selection).content());
	(!n.dataTransfer.files.length || !P || Ci > 120) && n.dataTransfer.clearData(), n.dataTransfer.setData(gs ? "Text" : "text/html", s.innerHTML), n.dataTransfer.effectAllowed = "copyMove", gs || n.dataTransfer.setData("text/plain", c), e.dragging = new xs(l, Cs(e, n), o);
}, Po.dragend = (e) => {
	let t = e.dragging;
	window.setTimeout(() => {
		e.dragging == t && (e.dragging = null);
	}, 50);
}, Fo.dragover = Fo.dragenter = (e, t) => t.preventDefault(), Fo.drop = (e, t) => {
	try {
		ws(e, t, e.dragging);
	} finally {
		e.dragging = null;
	}
};
function ws(e, t, n) {
	if (!t.dataTransfer) return;
	let r = e.posAtCoords(Go(t));
	if (!r) return;
	let i = e.state.doc.resolve(r.pos), a = n && n.slice;
	a ? e.someProp("transformPasted", (t) => {
		a = t(a, e, !1);
	}) : a = yo(e, bs(t.dataTransfer), gs ? null : t.dataTransfer.getData("text/html"), !1, i);
	let o = !!(n && Cs(e, t));
	if (e.someProp("handleDrop", (n) => n(e, t, a || h.empty, o))) {
		t.preventDefault();
		return;
	}
	if (!a) return;
	t.preventDefault();
	let s = a ? Yt(e.state.doc, i.pos, a) : i.pos;
	s ??= i.pos;
	let c = e.state.tr;
	if (o) {
		let { node: e } = n;
		e ? e.replace(c) : c.deleteSelection();
	}
	let l = c.mapping.map(s), u = a.openStart == 0 && a.openEnd == 0 && a.content.childCount == 1, d = c.doc;
	if (u ? c.replaceRangeWith(l, l, a.content.firstChild) : c.replaceRange(l, l, a), c.doc.eq(d)) return;
	let f = c.doc.resolve(l);
	if (u && A.isSelectable(a.content.firstChild) && f.nodeAfter && f.nodeAfter.sameMarkup(a.content.firstChild)) c.setSelection(new A(f));
	else {
		let t = c.mapping.map(s);
		c.mapping.maps[c.mapping.maps.length - 1].forEach((e, n, r, i) => t = i), c.setSelection(Ja(e, f, c.doc.resolve(t)));
	}
	e.focus(), e.dispatch(c.setMeta("uiEvent", "drop"));
}
Po.focus = (e) => {
	e.input.lastFocus = Date.now(), e.focused || (e.domObserver.stop(), e.dom.classList.add("ProseMirror-focused"), e.domObserver.start(), e.focused = !0, setTimeout(() => {
		e.docView && e.hasFocus() && !e.domObserver.currentSelection.eq(e.domSelectionRange()) && za(e);
	}, 20));
}, Po.blur = (e, t) => {
	let n = t;
	e.focused &&= (e.domObserver.stop(), e.dom.classList.remove("ProseMirror-focused"), e.domObserver.start(), n.relatedTarget && e.dom.contains(n.relatedTarget) && e.domObserver.currentSelection.clear(), !1);
}, Po.beforeinput = (e, t) => {
	if (Di && t.inputType == "deleteContentBackward") {
		e.domObserver.flushSoon();
		let { domChangeCount: t } = e.input;
		setTimeout(() => {
			if (e.input.domChangeCount != t || (e.dom.blur(), e.focus(), e.someProp("handleKeyDown", (t) => t(e, ui(8, "Backspace"))))) return;
			let { $cursor: n } = e.state.selection;
			n && n.pos > 0 && e.dispatch(e.state.tr.delete(n.pos - 1, n.pos).scrollIntoView());
		}, 50);
	}
};
for (let e in Fo) Po[e] = Fo[e];
function Ts(e, t) {
	if (e == t) return !0;
	for (let n in e) if (e[n] !== t[n]) return !1;
	for (let n in t) if (!(n in e)) return !1;
	return !0;
}
var Es = class e {
	constructor(e, t) {
		this.toDOM = e, this.spec = t || As, this.side = this.spec.side || 0;
	}
	map(e, t, n, r) {
		let { pos: i, deleted: a } = e.mapResult(t.from + r, this.side < 0 ? -1 : 1);
		return a ? null : new I(i - n, i - n, this);
	}
	valid() {
		return !0;
	}
	eq(t) {
		return this == t || t instanceof e && (this.spec.key && this.spec.key == t.spec.key || this.toDOM == t.toDOM && Ts(this.spec, t.spec));
	}
	destroy(e) {
		this.spec.destroy && this.spec.destroy(e);
	}
}, Ds = class e {
	constructor(e, t) {
		this.attrs = e, this.spec = t || As;
	}
	map(e, t, n, r) {
		let i = e.map(t.from + r, this.spec.inclusiveStart ? -1 : 1) - n, a = e.map(t.to + r, this.spec.inclusiveEnd ? 1 : -1) - n;
		return i >= a ? null : new I(i, a, this);
	}
	valid(e, t) {
		return t.from < t.to;
	}
	eq(t) {
		return this == t || t instanceof e && Ts(this.attrs, t.attrs) && Ts(this.spec, t.spec);
	}
	static is(t) {
		return t.type instanceof e;
	}
	destroy() {}
}, Os = class e {
	constructor(e, t) {
		this.attrs = e, this.spec = t || As;
	}
	map(e, t, n, r) {
		let i = e.mapResult(t.from + r, 1);
		if (i.deleted) return null;
		let a = e.mapResult(t.to + r, -1);
		return a.deleted || a.pos <= i.pos ? null : new I(i.pos - n, a.pos - n, this);
	}
	valid(e, t) {
		let { index: n, offset: r } = e.content.findIndex(t.from), i;
		return r == t.from && !(i = e.child(n)).isText && r + i.nodeSize == t.to;
	}
	eq(t) {
		return this == t || t instanceof e && Ts(this.attrs, t.attrs) && Ts(this.spec, t.spec);
	}
	destroy() {}
}, I = class e {
	constructor(e, t, n) {
		this.from = e, this.to = t, this.type = n;
	}
	copy(t, n) {
		return new e(t, n, this.type);
	}
	eq(e, t = 0) {
		return this.type.eq(e.type) && this.from + t == e.from && this.to + t == e.to;
	}
	map(e, t, n) {
		return this.type.map(e, this, t, n);
	}
	static widget(t, n, r) {
		return new e(t, t, new Es(n, r));
	}
	static inline(t, n, r, i) {
		return new e(t, n, new Ds(r, i));
	}
	static node(t, n, r, i) {
		return new e(t, n, new Os(r, i));
	}
	get spec() {
		return this.type.spec;
	}
	get inline() {
		return this.type instanceof Ds;
	}
	get widget() {
		return this.type instanceof Es;
	}
}, ks = [], As = {}, L = class e {
	constructor(e, t) {
		this.local = e.length ? e : ks, this.children = t.length ? t : ks;
	}
	static create(e, t) {
		return t.length ? Ls(t, e, 0, As) : R;
	}
	find(e, t, n) {
		let r = [];
		return this.findInner(e ?? 0, t ?? 1e9, r, 0, n), r;
	}
	findInner(e, t, n, r, i) {
		for (let a = 0; a < this.local.length; a++) {
			let o = this.local[a];
			o.from <= t && o.to >= e && (!i || i(o.spec)) && n.push(o.copy(o.from + r, o.to + r));
		}
		for (let a = 0; a < this.children.length; a += 3) if (this.children[a] < t && this.children[a + 1] > e) {
			let o = this.children[a] + 1;
			this.children[a + 2].findInner(e - o, t - o, n, r + o, i);
		}
	}
	map(e, t, n) {
		return this == R || e.maps.length == 0 ? this : this.mapInner(e, t, 0, 0, n || As);
	}
	mapInner(t, n, r, i, a) {
		let o;
		for (let e = 0; e < this.local.length; e++) {
			let s = this.local[e].map(t, r, i);
			s && s.type.valid(n, s) ? (o ||= []).push(s) : a.onRemove && a.onRemove(this.local[e].spec);
		}
		return this.children.length ? Ms(this.children, o || [], t, n, r, i, a) : o ? new e(o.sort(Rs), ks) : R;
	}
	add(t, n) {
		return n.length ? this == R ? e.create(t, n) : this.addInner(t, n, 0) : this;
	}
	addInner(t, n, r) {
		let i, a = 0;
		t.forEach((e, t) => {
			let o = t + r, s;
			if (s = Fs(n, e, o)) {
				for (i ||= this.children.slice(); a < i.length && i[a] < t;) a += 3;
				i[a] == t ? i[a + 2] = i[a + 2].addInner(e, s, o + 1) : i.splice(a, 0, t, t + e.nodeSize, Ls(s, e, o + 1, As)), a += 3;
			}
		});
		let o = Ns(a ? Is(n) : n, -r);
		for (let e = 0; e < o.length; e++) o[e].type.valid(t, o[e]) || o.splice(e--, 1);
		return new e(o.length ? this.local.concat(o).sort(Rs) : this.local, i || this.children);
	}
	remove(e) {
		return e.length == 0 || this == R ? this : this.removeInner(e, 0);
	}
	removeInner(t, n) {
		let r = this.children, i = this.local;
		for (let e = 0; e < r.length; e += 3) {
			let i, a = r[e] + n, o = r[e + 1] + n;
			for (let e = 0, n; e < t.length; e++) (n = t[e]) && n.from > a && n.to < o && (t[e] = null, (i ||= []).push(n));
			if (!i) continue;
			r == this.children && (r = this.children.slice());
			let s = r[e + 2].removeInner(i, a + 1);
			s == R ? (r.splice(e, 3), e -= 3) : r[e + 2] = s;
		}
		if (i.length) {
			for (let e = 0, r; e < t.length; e++) if (r = t[e]) for (let e = 0; e < i.length; e++) i[e].eq(r, n) && (i == this.local && (i = this.local.slice()), i.splice(e--, 1));
		}
		return r == this.children && i == this.local ? this : i.length || r.length ? new e(i, r) : R;
	}
	forChild(t, n) {
		if (this == R) return this;
		if (n.isLeaf) return e.empty;
		let r, i;
		for (let e = 0; e < this.children.length; e += 3) if (this.children[e] >= t) {
			this.children[e] == t && (r = this.children[e + 2]);
			break;
		}
		let a = t + 1, o = a + n.content.size;
		for (let e = 0; e < this.local.length; e++) {
			let t = this.local[e];
			if (t.from < o && t.to > a && t.type instanceof Ds) {
				let e = Math.max(a, t.from) - a, n = Math.min(o, t.to) - a;
				e < n && (i ||= []).push(t.copy(e, n));
			}
		}
		if (i) {
			let t = new e(i.sort(Rs), ks);
			return r ? new js([t, r]) : t;
		}
		return r || R;
	}
	eq(t) {
		if (this == t) return !0;
		if (!(t instanceof e) || this.local.length != t.local.length || this.children.length != t.children.length) return !1;
		for (let e = 0; e < this.local.length; e++) if (!this.local[e].eq(t.local[e])) return !1;
		for (let e = 0; e < this.children.length; e += 3) if (this.children[e] != t.children[e] || this.children[e + 1] != t.children[e + 1] || !this.children[e + 2].eq(t.children[e + 2])) return !1;
		return !0;
	}
	locals(e) {
		return zs(this.localsInner(e));
	}
	localsInner(e) {
		if (this == R) return ks;
		if (e.inlineContent || !this.local.some(Ds.is)) return this.local;
		let t = [];
		for (let e = 0; e < this.local.length; e++) this.local[e].type instanceof Ds || t.push(this.local[e]);
		return t;
	}
	forEachSet(e) {
		e(this);
	}
};
L.empty = new L([], []), L.removeOverlap = zs;
var R = L.empty, js = class e {
	constructor(e) {
		this.members = e;
	}
	map(t, n) {
		let r = this.members.map((e) => e.map(t, n, As));
		return e.from(r);
	}
	forChild(t, n) {
		if (n.isLeaf) return L.empty;
		let r = [];
		for (let i = 0; i < this.members.length; i++) {
			let a = this.members[i].forChild(t, n);
			a != R && (a instanceof e ? r = r.concat(a.members) : r.push(a));
		}
		return e.from(r);
	}
	eq(t) {
		if (!(t instanceof e) || t.members.length != this.members.length) return !1;
		for (let e = 0; e < this.members.length; e++) if (!this.members[e].eq(t.members[e])) return !1;
		return !0;
	}
	locals(e) {
		let t, n = !0;
		for (let r = 0; r < this.members.length; r++) {
			let i = this.members[r].localsInner(e);
			if (i.length) {
				if (!t) t = i;
				else {
					n &&= (t = t.slice(), !1);
					for (let e = 0; e < i.length; e++) t.push(i[e]);
				}
			}
		}
		return t ? zs(n ? t : t.sort(Rs)) : ks;
	}
	static from(t) {
		switch (t.length) {
			case 0: return R;
			case 1: return t[0];
			default: return new e(t.every((e) => e instanceof L) ? t : t.reduce((e, t) => e.concat(t instanceof L ? t : t.members), []));
		}
	}
	forEachSet(e) {
		for (let t = 0; t < this.members.length; t++) this.members[t].forEachSet(e);
	}
};
function Ms(e, t, n, r, i, a, o) {
	let s = e.slice();
	for (let e = 0, t = a; e < n.maps.length; e++) {
		let r = 0;
		n.maps[e].forEach((e, n, i, a) => {
			let o = a - i - (n - e);
			for (let i = 0; i < s.length; i += 3) {
				let a = s[i + 1];
				if (a < 0 || e > a + t - r) continue;
				let c = s[i] + t - r;
				n >= c ? s[i + 1] = e <= c ? -2 : -1 : e >= t && o && (s[i] += o, s[i + 1] += o);
			}
			r += o;
		}), t = n.maps[e].map(t, -1);
	}
	let c = !1;
	for (let t = 0; t < s.length; t += 3) if (s[t + 1] < 0) {
		if (s[t + 1] == -2) {
			c = !0, s[t + 1] = -1;
			continue;
		}
		let l = n.map(e[t] + a), u = l - i;
		if (u < 0 || u >= r.content.size) {
			c = !0;
			continue;
		}
		let d = n.map(e[t + 1] + a, -1) - i, { index: f, offset: p } = r.content.findIndex(u), m = r.maybeChild(f);
		if (m && p == u && p + m.nodeSize == d) {
			let r = s[t + 2].mapInner(n, m, l + 1, e[t] + a + 1, o);
			r == R ? (s[t + 1] = -2, c = !0) : (s[t] = u, s[t + 1] = d, s[t + 2] = r);
		} else c = !0;
	}
	if (c) {
		let c = Ls(Ps(s, e, t, n, i, a, o), r, 0, o);
		t = c.local;
		for (let e = 0; e < s.length; e += 3) s[e + 1] < 0 && (s.splice(e, 3), e -= 3);
		for (let e = 0, t = 0; e < c.children.length; e += 3) {
			let n = c.children[e];
			for (; t < s.length && s[t] < n;) t += 3;
			s.splice(t, 0, c.children[e], c.children[e + 1], c.children[e + 2]);
		}
	}
	return new L(t.sort(Rs), s);
}
function Ns(e, t) {
	if (!t || !e.length) return e;
	let n = [];
	for (let r = 0; r < e.length; r++) {
		let i = e[r];
		n.push(new I(i.from + t, i.to + t, i.type));
	}
	return n;
}
function Ps(e, t, n, r, i, a, o) {
	function s(e, t) {
		for (let a = 0; a < e.local.length; a++) {
			let s = e.local[a].map(r, i, t);
			s ? n.push(s) : o.onRemove && o.onRemove(e.local[a].spec);
		}
		for (let n = 0; n < e.children.length; n += 3) s(e.children[n + 2], e.children[n] + t + 1);
	}
	for (let n = 0; n < e.length; n += 3) e[n + 1] == -1 && s(e[n + 2], t[n] + a + 1);
	return n;
}
function Fs(e, t, n) {
	if (t.isLeaf) return null;
	let r = n + t.nodeSize, i = null;
	for (let t = 0, a; t < e.length; t++) (a = e[t]) && a.from > n && a.to < r && ((i ||= []).push(a), e[t] = null);
	return i;
}
function Is(e) {
	let t = [];
	for (let n = 0; n < e.length; n++) e[n] != null && t.push(e[n]);
	return t;
}
function Ls(e, t, n, r) {
	let i = [], a = !1;
	t.forEach((t, o) => {
		let s = Fs(e, t, o + n);
		if (s) {
			a = !0;
			let e = Ls(s, t, n + o + 1, r);
			e != R && i.push(o, o + t.nodeSize, e);
		}
	});
	let o = Ns(a ? Is(e) : e, -n).sort(Rs);
	for (let e = 0; e < o.length; e++) o[e].type.valid(t, o[e]) || (r.onRemove && r.onRemove(o[e].spec), o.splice(e--, 1));
	return o.length || i.length ? new L(o, i) : R;
}
function Rs(e, t) {
	return e.from - t.from || e.to - t.to;
}
function zs(e) {
	let t = e;
	for (let n = 0; n < t.length - 1; n++) {
		let r = t[n];
		if (r.from != r.to) for (let i = n + 1; i < t.length; i++) {
			let a = t[i];
			if (a.from == r.from) {
				a.to != r.to && (t == e && (t = e.slice()), t[i] = a.copy(a.from, r.to), Bs(t, i + 1, a.copy(r.to, a.to)));
				continue;
			}
			a.from < r.to && (t == e && (t = e.slice()), t[n] = r.copy(r.from, a.from), Bs(t, i, r.copy(a.from, r.to)));
			break;
		}
	}
	return t;
}
function Bs(e, t, n) {
	for (; t < e.length && Rs(n, e[t]) > 0;) t++;
	e.splice(t, 0, n);
}
function Vs(e) {
	let t = [];
	return e.someProp("decorations", (n) => {
		let r = n(e.state);
		r && r != R && t.push(r);
	}), e.cursorWrapper && t.push(L.create(e.state.doc, [e.cursorWrapper.deco])), js.from(t);
}
var Hs = {
	childList: !0,
	characterData: !0,
	characterDataOldValue: !0,
	attributes: !0,
	attributeOldValue: !0,
	subtree: !0
}, Us = yi && bi <= 11, Ws = class {
	constructor() {
		this.anchorNode = null, this.anchorOffset = 0, this.focusNode = null, this.focusOffset = 0;
	}
	set(e) {
		this.anchorNode = e.anchorNode, this.anchorOffset = e.anchorOffset, this.focusNode = e.focusNode, this.focusOffset = e.focusOffset;
	}
	clear() {
		this.anchorNode = this.focusNode = null;
	}
	eq(e) {
		return e.anchorNode == this.anchorNode && e.anchorOffset == this.anchorOffset && e.focusNode == this.focusNode && e.focusOffset == this.focusOffset;
	}
}, Gs = class {
	constructor(e, t) {
		this.view = e, this.handleDOMChange = t, this.queue = [], this.flushingSoon = -1, this.observer = null, this.currentSelection = new Ws(), this.onCharData = null, this.suppressingSelectionUpdates = !1, this.lastChangedTextNode = null, this.observer = window.MutationObserver && new window.MutationObserver((t) => {
			for (let e = 0; e < t.length; e++) this.queue.push(t[e]);
			yi && bi <= 11 && t.some((e) => e.type == "childList" && e.removedNodes.length || e.type == "characterData" && e.oldValue.length > e.target.nodeValue.length) ? this.flushSoon() : F && e.composing && t.some((e) => e.type == "childList" && e.target.nodeName == "TR") ? (e.input.badSafariComposition = !0, this.flushSoon()) : this.flush();
		}), Us && (this.onCharData = (e) => {
			this.queue.push({
				target: e.target,
				type: "characterData",
				oldValue: e.prevValue
			}), this.flushSoon();
		}), this.onSelectionChange = this.onSelectionChange.bind(this);
	}
	flushSoon() {
		this.flushingSoon < 0 && (this.flushingSoon = window.setTimeout(() => {
			this.flushingSoon = -1, this.flush();
		}, 20));
	}
	forceFlush() {
		this.flushingSoon > -1 && (window.clearTimeout(this.flushingSoon), this.flushingSoon = -1, this.flush());
	}
	start() {
		this.observer && (this.observer.takeRecords(), this.observer.observe(this.view.dom, Hs)), this.onCharData && this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData), this.connectSelection();
	}
	stop() {
		if (this.observer) {
			let e = this.observer.takeRecords();
			if (e.length) {
				for (let t = 0; t < e.length; t++) this.queue.push(e[t]);
				window.setTimeout(() => this.flush(), 20);
			}
			this.observer.disconnect();
		}
		this.onCharData && this.view.dom.removeEventListener("DOMCharacterDataModified", this.onCharData), this.disconnectSelection();
	}
	connectSelection() {
		this.view.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
	}
	disconnectSelection() {
		this.view.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
	}
	suppressSelectionUpdates() {
		this.suppressingSelectionUpdates = !0, setTimeout(() => this.suppressingSelectionUpdates = !1, 50);
	}
	onSelectionChange() {
		if (Ya(this.view)) {
			if (this.suppressingSelectionUpdates) return za(this.view);
			if (yi && bi <= 11 && !this.view.state.selection.empty) {
				let e = this.view.domSelectionRange();
				if (e.focusNode && ti(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset)) return this.flushSoon();
			}
			this.flush();
		}
	}
	setCurSelection() {
		this.currentSelection.set(this.view.domSelectionRange());
	}
	ignoreSelectionChange(e) {
		if (!e.focusNode) return !0;
		let t = /* @__PURE__ */ new Set(), n;
		for (let n = e.focusNode; n; n = Zr(n)) t.add(n);
		for (let r = e.anchorNode; r; r = Zr(r)) if (t.has(r)) {
			n = r;
			break;
		}
		let r = n && this.view.docView.nearestDesc(n);
		if (r && r.ignoreMutation({
			type: "selection",
			target: n.nodeType == 3 ? n.parentNode : n
		})) return this.setCurSelection(), !0;
	}
	pendingRecords() {
		if (this.observer) for (let e of this.observer.takeRecords()) this.queue.push(e);
		return this.queue;
	}
	flush() {
		let { view: e } = this;
		if (!e.docView || this.flushingSoon > -1) return;
		let t = this.pendingRecords();
		t.length && (this.queue = []);
		let n = e.domSelectionRange(), r = !this.suppressingSelectionUpdates && !this.currentSelection.eq(n) && Ya(e) && !this.ignoreSelectionChange(n), i = -1, a = -1, o = !1, s = [];
		if (e.editable) for (let e = 0; e < t.length; e++) {
			let n = this.registerMutation(t[e], s);
			n && (i = i < 0 ? n.from : Math.min(n.from, i), a = a < 0 ? n.to : Math.max(n.to, a), n.typeOver && (o = !0));
		}
		if (s.some((e) => e.nodeName == "BR") && (e.input.lastKeyCode == 8 || e.input.lastKeyCode == 46 || P && (e.composing || e.input.compositionEndedAt > Date.now() - 50) && t.some((e) => e.type == "childList" && e.removedNodes.length))) {
			for (let e of s) if (e.nodeName == "BR" && e.parentNode) {
				let t = e.nextSibling;
				for (; t && t.nodeType == 1;) {
					if (t.contentEditable == "false") {
						e.parentNode.removeChild(e);
						break;
					}
					t = t.firstChild;
				}
			}
		} else if (xi && s.length) {
			let t = s.filter((e) => e.nodeName == "BR");
			if (t.length == 2) {
				let [e, n] = t;
				e.parentNode && e.parentNode.parentNode == n.parentNode ? n.remove() : e.remove();
			} else {
				let { focusNode: n } = this.currentSelection;
				for (let r of t) {
					let t = r.parentNode;
					t && t.nodeName == "LI" && (!n || Zs(e, n) != t) && r.remove();
				}
			}
		}
		let c = null;
		i < 0 && r && e.input.lastFocus > Date.now() - 200 && Math.max(e.input.lastTouch, e.input.lastClick.time) < Date.now() - 300 && li(n) && (c = La(e)) && c.eq(O.near(e.state.doc.resolve(0), 1)) ? (e.input.lastFocus = 0, za(e), this.currentSelection.set(n), e.scrollToSelection()) : (i > -1 || r) && (i > -1 && (e.docView.markDirty(i, a), Js(e)), e.input.badSafariComposition && (e.input.badSafariComposition = !1, Qs(e, s)), this.handleDOMChange(i, a, o, s), e.docView && e.docView.dirty ? e.updateState(e.state) : this.currentSelection.eq(n) || za(e), this.currentSelection.set(n));
	}
	registerMutation(e, t) {
		if (t.indexOf(e.target) > -1) return null;
		let n = this.view.docView.nearestDesc(e.target);
		if (e.type == "attributes" && (n == this.view.docView || e.attributeName == "contenteditable" || e.attributeName == "style" && !e.oldValue && !e.target.getAttribute("style")) || !n || n.ignoreMutation(e)) return null;
		if (e.type == "childList") {
			for (let n = 0; n < e.addedNodes.length; n++) {
				let r = e.addedNodes[n];
				t.push(r), r.nodeType == 3 && (this.lastChangedTextNode = r);
			}
			if (n.contentDOM && n.contentDOM != n.dom && !n.contentDOM.contains(e.target)) return {
				from: n.posBefore,
				to: n.posAfter
			};
			let r = e.previousSibling, i = e.nextSibling;
			if (yi && bi <= 11 && e.addedNodes.length) for (let t = 0; t < e.addedNodes.length; t++) {
				let { previousSibling: n, nextSibling: a } = e.addedNodes[t];
				(!n || Array.prototype.indexOf.call(e.addedNodes, n) < 0) && (r = n), (!a || Array.prototype.indexOf.call(e.addedNodes, a) < 0) && (i = a);
			}
			let a = r && r.parentNode == e.target ? N(r) + 1 : 0, o = n.localPosFromDOM(e.target, a, -1), s = i && i.parentNode == e.target ? N(i) : e.target.childNodes.length;
			return {
				from: o,
				to: n.localPosFromDOM(e.target, s, 1)
			};
		}
		return e.type == "attributes" ? {
			from: n.posAtStart - n.border,
			to: n.posAtEnd + n.border
		} : (this.lastChangedTextNode = e.target, {
			from: n.posAtStart,
			to: n.posAtEnd,
			typeOver: e.target.nodeValue == e.oldValue
		});
	}
}, Ks = /* @__PURE__ */ new WeakMap(), qs = !1;
function Js(e) {
	if (!Ks.has(e) && (Ks.set(e, null), [
		"normal",
		"nowrap",
		"pre-line"
	].indexOf(getComputedStyle(e.dom).whiteSpace) !== -1)) {
		if (e.requiresGeckoHackNode = xi, qs) return;
		console.warn("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package."), qs = !0;
	}
}
function Ys(e, t) {
	let n = t.startContainer, r = t.startOffset, i = t.endContainer, a = t.endOffset, o = e.domAtPos(e.state.selection.anchor);
	return ti(o.node, o.offset, i, a) && ([n, r, i, a] = [
		i,
		a,
		n,
		r
	]), {
		anchorNode: n,
		anchorOffset: r,
		focusNode: i,
		focusOffset: a
	};
}
function Xs(e, t) {
	if (t.getComposedRanges) {
		let n = t.getComposedRanges(e.root)[0];
		if (n) return Ys(e, n);
	}
	let n;
	function r(e) {
		e.preventDefault(), e.stopImmediatePropagation(), n = e.getTargetRanges()[0];
	}
	return e.dom.addEventListener("beforeinput", r, !0), document.execCommand("indent"), e.dom.removeEventListener("beforeinput", r, !0), n ? Ys(e, n) : null;
}
function Zs(e, t) {
	for (let n = t.parentNode; n && n != e.dom; n = n.parentNode) {
		let t = e.docView.nearestDesc(n, !0);
		if (t && t.node.isBlock) return n;
	}
	return null;
}
function Qs(e, t) {
	let { focusNode: n, focusOffset: r } = e.domSelectionRange();
	for (let i of t) if (i.parentNode?.nodeName == "TR") {
		let t = i.nextSibling;
		for (; t && t.nodeName != "TD" && t.nodeName != "TH";) t = t.nextSibling;
		if (t) {
			let a = t;
			for (;;) {
				let e = a.firstChild;
				if (!e || e.nodeType != 1 || e.contentEditable == "false" || /^(BR|IMG)$/.test(e.nodeName)) break;
				a = e;
			}
			a.insertBefore(i, a.firstChild), n == i && e.domSelection().collapse(i, r);
		} else i.parentNode.removeChild(i);
	}
}
function $s(e, t, n, r) {
	let { node: i, fromOffset: a, toOffset: o, from: s, to: c } = e.docView.parseRange(t, n), l = e.domSelectionRange(), u, d = l.anchorNode;
	if (d && e.dom.contains(d.nodeType == 1 ? d : d.parentNode) && (u = [{
		node: d,
		offset: l.anchorOffset
	}], li(l) || u.push({
		node: l.focusNode,
		offset: l.focusOffset
	})), P && e.input.lastKeyCode === 8) for (let e = o; e > a; e--) {
		let t = i.childNodes[e - 1], n = t.pmViewDesc;
		if (t.nodeName == "BR" && !n) {
			o = e;
			break;
		}
		if (!n || n.size) break;
	}
	let f = e.state.doc, p = e.someProp("domParser") || Le.fromSchema(e.state.schema), m = f.resolve(s), h = null, g = p.parse(i, {
		topNode: m.parent,
		topMatch: m.parent.contentMatchAt(m.index()),
		topOpen: !0,
		from: a,
		to: o,
		preserveWhitespace: m.parent.type.whitespace != "pre" || "full",
		findPositions: u,
		ruleFromNode: ec(r),
		context: m
	});
	if (u && u[0].pos != null) {
		let e = u[0].pos, t = u[1] && u[1].pos;
		t ??= e, h = {
			anchor: e + s,
			head: t + s
		};
	}
	return {
		doc: g,
		sel: h,
		from: s,
		to: c
	};
}
var ec = (e) => (t) => {
	let n = t.pmViewDesc;
	if (n) return n.parseRule(e);
	if (t.nodeName == "BR" && t.parentNode) {
		if (F && /^(ul|ol)$/i.test(t.parentNode.nodeName)) {
			let e = document.createElement("div");
			return e.appendChild(document.createElement("li")), { skip: e };
		}
		if (t.parentNode.lastChild == t || F && /^(tr|table)$/i.test(t.parentNode.nodeName)) return { ignore: !0 };
	} else if (t.nodeName == "IMG" && t.getAttribute("mark-placeholder")) return { ignore: !0 };
	return null;
}, tc = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|img|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
function nc(e, t, n, r, i) {
	let a = e.input.compositionPendingChanges || (e.composing ? e.input.compositionID : 0);
	if (e.input.compositionPendingChanges = 0, t < 0) {
		let t = e.input.lastSelectionTime > Date.now() - 50 ? e.input.lastSelectionOrigin : null, n = La(e, t);
		if (n && !e.state.selection.eq(n)) {
			if (P && Di && e.input.lastKeyCode === 13 && Date.now() - 100 < e.input.lastKeyCodeTime && e.someProp("handleKeyDown", (t) => t(e, ui(13, "Enter")))) return;
			let r = e.state.tr.setSelection(n);
			t == "pointer" ? r.setMeta("pointer", !0) : t == "key" && r.scrollIntoView(), a && r.setMeta("composition", a), e.dispatch(r);
		}
		return;
	}
	let o = e.state.doc.resolve(t), s = o.sharedDepth(n);
	t = o.before(s + 1), n = e.state.doc.resolve(n).after(s + 1);
	let c = e.state.selection, l = $s(e, t, n, i), u = e.state.doc, d = u.slice(l.from, l.to), f, p;
	e.input.lastKeyCode === 8 && Date.now() - 100 < e.input.lastKeyCodeTime ? (f = e.state.selection.to, p = "end") : (f = e.state.selection.from, p = "start"), e.input.lastKeyCode = null;
	let m = sc(d.content, l.doc.content, l.from, f, p);
	if (m && e.input.domChangeCount++, (wi && e.input.lastIOSEnter > Date.now() - 225 || Di) && i.some((e) => e.nodeType == 1 && !tc.test(e.nodeName)) && (!m || m.endA >= m.endB) && e.someProp("handleKeyDown", (t) => t(e, ui(13, "Enter")))) {
		e.input.lastIOSEnter = 0;
		return;
	}
	if (!m) {
		if (r && c instanceof k && !c.empty && c.$head.sameParent(c.$anchor) && !e.composing && !(l.sel && l.sel.anchor != l.sel.head)) m = {
			start: c.from,
			endA: c.to,
			endB: c.to
		};
		else {
			if (l.sel) {
				let t = rc(e, e.state.doc, l.sel);
				if (t && !t.eq(e.state.selection)) {
					let n = e.state.tr.setSelection(t);
					a && n.setMeta("composition", a), e.dispatch(n);
				}
			}
			return;
		}
	}
	e.state.selection.from < e.state.selection.to && m.start == m.endB && e.state.selection instanceof k && (m.start > e.state.selection.from && m.start <= e.state.selection.from + 2 && e.state.selection.from >= l.from ? m.start = e.state.selection.from : m.endA < e.state.selection.to && m.endA >= e.state.selection.to - 2 && e.state.selection.to <= l.to && (m.endB += e.state.selection.to - m.endA, m.endA = e.state.selection.to)), yi && bi <= 11 && m.endB == m.start + 1 && m.endA == m.start && m.start > l.from && l.doc.textBetween(m.start - l.from - 1, m.start - l.from + 1) == " \xA0" && (m.start--, m.endA--, m.endB--);
	let h = l.doc.resolveNoCache(m.start - l.from), g = l.doc.resolveNoCache(m.endB - l.from), _ = u.resolve(m.start), v = h.sameParent(g) && h.parent.inlineContent && _.end() >= m.endA;
	if ((wi && e.input.lastIOSEnter > Date.now() - 225 && (!v || i.some((e) => e.nodeName == "DIV" || e.nodeName == "P")) || !v && h.pos < l.doc.content.size && (!h.sameParent(g) || !h.parent.inlineContent) && h.pos < g.pos && !/\S/.test(l.doc.textBetween(h.pos, g.pos, "", ""))) && e.someProp("handleKeyDown", (t) => t(e, ui(13, "Enter")))) {
		e.input.lastIOSEnter = 0;
		return;
	}
	if (e.state.selection.anchor > m.start && ac(u, m.start, m.endA, h, g) && e.someProp("handleKeyDown", (t) => t(e, ui(8, "Backspace")))) {
		Di && P && e.domObserver.suppressSelectionUpdates();
		return;
	}
	P && m.endB == m.start && (e.input.lastChromeDelete = Date.now()), Di && !v && h.start() != g.start() && g.parentOffset == 0 && h.depth == g.depth && l.sel && l.sel.anchor == l.sel.head && l.sel.head == m.endA && (m.endB -= 2, g = l.doc.resolveNoCache(m.endB - l.from), setTimeout(() => {
		e.someProp("handleKeyDown", function(t) {
			return t(e, ui(13, "Enter"));
		});
	}, 20));
	let y = m.start, b = m.endA, x = (t) => {
		let n = t || e.state.tr.replace(y, b, l.doc.slice(m.start - l.from, m.endB - l.from));
		if (l.sel) {
			let t = rc(e, n.doc, l.sel);
			t && !(P && e.composing && t.empty && (m.start != m.endB || e.input.lastChromeDelete < Date.now() - 100) && (t.head == y || t.head == n.mapping.map(b) - 1) || yi && t.empty && t.head == y) && n.setSelection(t);
		}
		return a && n.setMeta("composition", a), n.scrollIntoView();
	}, S;
	if (v) {
		if (h.pos == g.pos) {
			yi && bi <= 11 && h.parentOffset == 0 && (e.domObserver.suppressSelectionUpdates(), setTimeout(() => za(e), 20));
			let t = x(e.state.tr.delete(y, b)), n = u.resolve(m.start).marksAcross(u.resolve(m.endA));
			n && t.ensureMarks(n), e.dispatch(t);
		} else if (m.endA == m.endB && (S = ic(h.parent.content.cut(h.parentOffset, g.parentOffset), _.parent.content.cut(_.parentOffset, m.endA - _.start())))) {
			let t = x(e.state.tr);
			S.type == "add" ? t.addMark(y, b, S.mark) : t.removeMark(y, b, S.mark), e.dispatch(t);
		} else if (h.parent.child(h.index()).isText && h.index() == g.index() - +!g.textOffset) {
			let t = h.parent.textBetween(h.parentOffset, g.parentOffset), n = () => x(e.state.tr.insertText(t, y, b));
			e.someProp("handleTextInput", (r) => r(e, y, b, t, n)) || e.dispatch(n());
		} else e.dispatch(x());
	} else e.dispatch(x());
}
function rc(e, t, n) {
	return Math.max(n.anchor, n.head) > t.content.size ? null : Ja(e, t.resolve(n.anchor), t.resolve(n.head));
}
function ic(e, t) {
	let n = e.firstChild.marks, r = t.firstChild.marks, i = n, a = r, o, s, c;
	for (let e = 0; e < r.length; e++) i = r[e].removeFromSet(i);
	for (let e = 0; e < n.length; e++) a = n[e].removeFromSet(a);
	if (i.length == 1 && a.length == 0) s = i[0], o = "add", c = (e) => e.mark(s.addToSet(e.marks));
	else if (i.length == 0 && a.length == 1) s = a[0], o = "remove", c = (e) => e.mark(s.removeFromSet(e.marks));
	else return null;
	let u = [];
	for (let e = 0; e < t.childCount; e++) u.push(c(t.child(e)));
	if (l.from(u).eq(e)) return {
		mark: s,
		type: o
	};
}
function ac(e, t, n, r, i) {
	if (n - t <= i.pos - r.pos || oc(r, !0, !1) < i.pos) return !1;
	let a = e.resolve(t);
	if (!r.parent.isTextblock) {
		let e = a.nodeAfter;
		return e != null && n == t + e.nodeSize;
	}
	if (a.parentOffset < a.parent.content.size || !a.parent.isTextblock) return !1;
	let o = e.resolve(oc(a, !0, !0));
	return !o.parent.isTextblock || o.pos > n || oc(o, !0, !1) < n ? !1 : r.parent.content.cut(r.parentOffset).eq(o.parent.content);
}
function oc(e, t, n) {
	let r = e.depth, i = t ? e.end() : e.pos;
	for (; r > 0 && (t || e.indexAfter(r) == e.node(r).childCount);) r--, i++, t = !1;
	if (n) {
		let t = e.node(r).maybeChild(e.indexAfter(r));
		for (; t && !t.isLeaf;) t = t.firstChild, i++;
	}
	return i;
}
function sc(e, t, n, r, i) {
	let a = e.findDiffStart(t, n), o = n + e.size, s = n + t.size;
	if (a == null) return null;
	let { a: c, b: l } = e.findDiffEnd(t, o, s);
	if (i == "end") {
		let e = Math.max(0, a - Math.min(c, l));
		r -= c + e - a;
	}
	if (c < a && o < s) {
		let e = r <= a && r >= c ? a - r : 0;
		a -= e, l = a + (l - c), c = a;
	} else if (l < a) {
		let e = r <= a && r >= l ? a - r : 0;
		a -= e, c = a + (c - l), l = a;
	}
	return {
		start: a,
		endA: c,
		endB: l
	};
}
var cc = yo, lc = ms, uc = class {
	constructor(e, t) {
		this._root = null, this.focused = !1, this.trackWrites = null, this.mounted = !1, this.markCursor = null, this.cursorWrapper = null, this.lastSelectedViewDesc = void 0, this.input = new Lo(), this.prevDirectPlugins = [], this.pluginViews = [], this.requiresGeckoHackNode = !1, this.dragging = null, this._props = t, this.state = t.state, this.directPlugins = t.plugins || [], this.directPlugins.forEach(_c), this.dispatch = this.dispatch.bind(this), this.dom = e && e.mount || document.createElement("div"), e && (e.appendChild ? e.appendChild(this.dom) : typeof e == "function" ? e(this.dom) : e.mount && (this.mounted = !0)), this.editable = pc(this), fc(this), this.nodeViews = hc(this), this.docView = _a(this.state.doc, dc(this), Vs(this), this.dom, this), this.domObserver = new Gs(this, (e, t, n, r) => nc(this, e, t, n, r)), this.domObserver.start(), Ro(this), this.updatePluginViews();
	}
	get composing() {
		return this.input.composing;
	}
	get props() {
		if (this._props.state != this.state) {
			let e = this._props;
			this._props = {};
			for (let t in e) this._props[t] = e[t];
			this._props.state = this.state;
		}
		return this._props;
	}
	update(e) {
		e.handleDOMEvents != this._props.handleDOMEvents && Vo(this);
		let t = this._props;
		this._props = e, e.plugins && (e.plugins.forEach(_c), this.directPlugins = e.plugins), this.updateStateInner(e.state, t);
	}
	setProps(e) {
		let t = {};
		for (let e in this._props) t[e] = this._props[e];
		t.state = this.state;
		for (let n in e) t[n] = e[n];
		this.update(t);
	}
	updateState(e) {
		this.updateStateInner(e, this._props);
	}
	updateStateInner(e, t) {
		let n = this.state, r = !1, i = !1;
		e.storedMarks && this.composing && (fs(this), i = !0), this.state = e;
		let a = n.plugins != e.plugins || this._props.plugins != t.plugins;
		if (a || this._props.plugins != t.plugins || this._props.nodeViews != t.nodeViews) {
			let e = hc(this);
			gc(e, this.nodeViews) && (this.nodeViews = e, r = !0);
		}
		(a || t.handleDOMEvents != this._props.handleDOMEvents) && Vo(this), this.editable = pc(this), fc(this);
		let o = Vs(this), s = dc(this), c = n.plugins != e.plugins && !n.doc.eq(e.doc) ? "reset" : e.scrollToSelection > n.scrollToSelection ? "to selection" : "preserve", l = r || !this.docView.matchesNode(e.doc, s, o);
		(l || !e.selection.eq(n.selection)) && (i = !0);
		let u = c == "preserve" && i && this.dom.style.overflowAnchor == null && Pi(this);
		if (i) {
			this.domObserver.stop();
			let t = l && (yi || P) && !this.composing && !n.selection.empty && !e.selection.empty && mc(n.selection, e.selection);
			if (l) {
				let n = P ? this.trackWrites = this.domSelectionRange().focusNode : null;
				this.composing && (this.input.compositionNode = ps(this)), (r || !this.docView.update(e.doc, s, o, this)) && (this.docView.updateOuterDeco(s), this.docView.destroy(), this.docView = _a(e.doc, s, o, this.dom, this)), n && (!this.trackWrites || !this.dom.contains(this.trackWrites)) && (t = !0);
			}
			let i = this.input.mouseDown;
			t || !(i && this.domObserver.currentSelection.eq(this.domSelectionRange()) && Za(this) && i.delaySelUpdate()) ? za(this, t) : (Ka(this, e.selection), this.domObserver.setCurSelection()), this.domObserver.start();
		}
		this.updatePluginViews(n), this.dragging?.node && !n.doc.eq(e.doc) && this.updateDraggedNode(this.dragging, n), c == "reset" ? this.dom.scrollTop = 0 : c == "to selection" ? this.scrollToSelection() : u && Ii(u);
	}
	scrollToSelection() {
		let e = this.domSelectionRange().focusNode;
		if (e && this.dom.contains(e.nodeType == 1 ? e : e.parentNode) && !this.someProp("handleScrollToSelection", (e) => e(this))) {
			if (this.state.selection instanceof A) {
				let t = this.docView.domAfterPos(this.state.selection.from);
				t.nodeType == 1 && Ni(this, t.getBoundingClientRect(), e);
			} else Ni(this, this.coordsAtPos(this.state.selection.head, 1), e);
		}
	}
	destroyPluginViews() {
		let e;
		for (; e = this.pluginViews.pop();) e.destroy && e.destroy();
	}
	updatePluginViews(e) {
		if (!e || e.plugins != this.state.plugins || this.directPlugins != this.prevDirectPlugins) {
			this.prevDirectPlugins = this.directPlugins, this.destroyPluginViews();
			for (let e = 0; e < this.directPlugins.length; e++) {
				let t = this.directPlugins[e];
				t.spec.view && this.pluginViews.push(t.spec.view(this));
			}
			for (let e = 0; e < this.state.plugins.length; e++) {
				let t = this.state.plugins[e];
				t.spec.view && this.pluginViews.push(t.spec.view(this));
			}
		} else for (let t = 0; t < this.pluginViews.length; t++) {
			let n = this.pluginViews[t];
			n.update && n.update(this, e);
		}
	}
	updateDraggedNode(e, t) {
		let n = e.node, r = -1;
		if (n.from < this.state.doc.content.size && this.state.doc.nodeAt(n.from) == n.node) r = n.from;
		else {
			let e = n.from + (this.state.doc.content.size - t.doc.content.size);
			(e > 0 && e < this.state.doc.content.size && this.state.doc.nodeAt(e)) == n.node && (r = e);
		}
		this.dragging = new xs(e.slice, e.move, r < 0 ? void 0 : A.create(this.state.doc, r));
	}
	someProp(e, t) {
		let n = this._props && this._props[e], r;
		if (n != null && (r = t ? t(n) : n)) return r;
		for (let n = 0; n < this.directPlugins.length; n++) {
			let i = this.directPlugins[n].props[e];
			if (i != null && (r = t ? t(i) : i)) return r;
		}
		let i = this.state.plugins;
		if (i) for (let n = 0; n < i.length; n++) {
			let a = i[n].props[e];
			if (a != null && (r = t ? t(a) : a)) return r;
		}
	}
	hasFocus() {
		if (yi) {
			let e = this.root.activeElement;
			if (e == this.dom) return !0;
			if (!e || !this.dom.contains(e)) return !1;
			for (; e && this.dom != e && this.dom.contains(e);) {
				if (e.contentEditable == "false") return !1;
				e = e.parentElement;
			}
			return !0;
		}
		return this.root.activeElement == this.dom;
	}
	focus() {
		this.domObserver.stop(), this.editable && zi(this.dom), za(this), this.domObserver.start();
	}
	get root() {
		let e = this._root;
		if (e == null) {
			for (let e = this.dom.parentNode; e; e = e.parentNode) if (e.nodeType == 9 || e.nodeType == 11 && e.host) return e.getSelection || (Object.getPrototypeOf(e).getSelection = () => e.ownerDocument.getSelection()), this._root = e;
		}
		return e || document;
	}
	updateRoot() {
		this._root = null;
	}
	posAtCoords(e) {
		return qi(this, e);
	}
	coordsAtPos(e, t = 1) {
		return Zi(this, e, t);
	}
	domAtPos(e, t = 0) {
		return this.docView.domFromPos(e, t);
	}
	nodeDOM(e) {
		let t = this.docView.descAt(e);
		return t ? t.nodeDOM : null;
	}
	posAtDOM(e, t, n = -1) {
		let r = this.docView.posFromDOM(e, t, n);
		if (r == null) throw RangeError("DOM position not inside the editor");
		return r;
	}
	endOfTextblock(e, t) {
		return sa(this, t || this.state, e);
	}
	pasteHTML(e, t) {
		return ys(this, "", e, !1, t || new ClipboardEvent("paste"));
	}
	pasteText(e, t) {
		return ys(this, e, null, !0, t || new ClipboardEvent("paste"));
	}
	serializeForClipboard(e) {
		return vo(this, e);
	}
	destroy() {
		this.docView && (Bo(this), this.destroyPluginViews(), this.mounted ? (this.docView.update(this.state.doc, [], Vs(this), this), this.dom.textContent = "") : this.dom.parentNode && this.dom.parentNode.removeChild(this.dom), this.docView.destroy(), this.docView = null, ei());
	}
	get isDestroyed() {
		return this.docView == null;
	}
	dispatchEvent(e) {
		return Wo(this, e);
	}
	domSelectionRange() {
		let e = this.domSelection();
		return e ? F && this.root.nodeType === 11 && di(this.dom.ownerDocument) == this.dom && Xs(this, e) || e : {
			focusNode: null,
			focusOffset: 0,
			anchorNode: null,
			anchorOffset: 0
		};
	}
	domSelection() {
		return this.root.getSelection();
	}
};
uc.prototype.dispatch = function(e) {
	let t = this._props.dispatchTransaction;
	t ? t.call(this, e) : this.updateState(this.state.apply(e));
};
function dc(e) {
	let t = Object.create(null);
	return t.class = "ProseMirror", t.contenteditable = String(e.editable), e.someProp("attributes", (n) => {
		if (typeof n == "function" && (n = n(e.state)), n) for (let e in n) e == "class" ? t.class += " " + n[e] : e == "style" ? t.style = (t.style ? t.style + ";" : "") + n[e] : !t[e] && e != "contenteditable" && e != "nodeName" && (t[e] = String(n[e]));
	}), t.translate ||= "no", [I.node(0, e.state.doc.content.size, t)];
}
function fc(e) {
	if (e.markCursor) {
		let t = document.createElement("img");
		t.className = "ProseMirror-separator", t.setAttribute("mark-placeholder", "true"), t.setAttribute("alt", ""), e.cursorWrapper = {
			dom: t,
			deco: I.widget(e.state.selection.from, t, {
				raw: !0,
				marks: e.markCursor
			})
		};
	} else e.cursorWrapper = null;
}
function pc(e) {
	return !e.someProp("editable", (t) => t(e.state) === !1);
}
function mc(e, t) {
	let n = Math.min(e.$anchor.sharedDepth(e.head), t.$anchor.sharedDepth(t.head));
	return e.$anchor.start(n) != t.$anchor.start(n);
}
function hc(e) {
	let t = Object.create(null);
	function n(e) {
		for (let n in e) Object.prototype.hasOwnProperty.call(t, n) || (t[n] = e[n]);
	}
	return e.someProp("nodeViews", n), e.someProp("markViews", n), t;
}
function gc(e, t) {
	let n = 0, r = 0;
	for (let r in e) {
		if (e[r] != t[r]) return !0;
		n++;
	}
	for (let e in t) r++;
	return n != r;
}
function _c(e) {
	if (e.spec.state || e.spec.filterTransaction || e.spec.appendTransaction) throw RangeError("Plugins passed directly to the view must not have a state component");
}
for (var vc = /* @__PURE__ */ t({
	Decoration: () => I,
	DecorationSet: () => L,
	EditorView: () => uc,
	__endComposition: () => lc,
	__parseFromClipboard: () => cc
}), yc = {
	8: "Backspace",
	9: "Tab",
	10: "Enter",
	12: "NumLock",
	13: "Enter",
	16: "Shift",
	17: "Control",
	18: "Alt",
	20: "CapsLock",
	27: "Escape",
	32: " ",
	33: "PageUp",
	34: "PageDown",
	35: "End",
	36: "Home",
	37: "ArrowLeft",
	38: "ArrowUp",
	39: "ArrowRight",
	40: "ArrowDown",
	44: "PrintScreen",
	45: "Insert",
	46: "Delete",
	59: ";",
	61: "=",
	91: "Meta",
	92: "Meta",
	106: "*",
	107: "+",
	108: ",",
	109: "-",
	110: ".",
	111: "/",
	144: "NumLock",
	145: "ScrollLock",
	160: "Shift",
	161: "Shift",
	162: "Control",
	163: "Control",
	164: "Alt",
	165: "Alt",
	173: "-",
	186: ";",
	187: "=",
	188: ",",
	189: "-",
	190: ".",
	191: "/",
	192: "`",
	219: "[",
	220: "\\",
	221: "]",
	222: "'"
}, bc = {
	48: ")",
	49: "!",
	50: "@",
	51: "#",
	52: "$",
	53: "%",
	54: "^",
	55: "&",
	56: "*",
	57: "(",
	59: ":",
	61: "+",
	173: "_",
	186: ":",
	187: "+",
	188: "<",
	189: "_",
	190: ">",
	191: "?",
	192: "~",
	219: "{",
	220: "|",
	221: "}",
	222: "\""
}, xc = typeof navigator < "u" && /Mac/.test(navigator.platform), Sc = typeof navigator < "u" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent), z = 0; z < 10; z++) yc[48 + z] = yc[96 + z] = String(z);
for (var z = 1; z <= 24; z++) yc[z + 111] = "F" + z;
for (var z = 65; z <= 90; z++) yc[z] = String.fromCharCode(z + 32), bc[z] = String.fromCharCode(z);
for (var Cc in yc) bc.hasOwnProperty(Cc) || (bc[Cc] = yc[Cc]);
function wc(e) {
	var t = !(xc && e.metaKey && e.shiftKey && !e.ctrlKey && !e.altKey || Sc && e.shiftKey && e.key && e.key.length == 1 || e.key == "Unidentified") && e.key || (e.shiftKey ? bc : yc)[e.keyCode] || e.key || "Unidentified";
	return t == "Esc" && (t = "Escape"), t == "Del" && (t = "Delete"), t == "Left" && (t = "ArrowLeft"), t == "Up" && (t = "ArrowUp"), t == "Right" && (t = "ArrowRight"), t == "Down" && (t = "ArrowDown"), t;
}
//#endregion
//#region ../../node_modules/prosemirror-keymap/dist/index.js
var Tc = typeof navigator < "u" && /Mac|iP(hone|[oa]d)/.test(navigator.platform), Ec = typeof navigator < "u" && /Win/.test(navigator.platform);
function Dc(e) {
	let t = e.split(/-(?!$)/), n = t[t.length - 1];
	n == "Space" && (n = " ");
	let r, i, a, o;
	for (let e = 0; e < t.length - 1; e++) {
		let n = t[e];
		if (/^(cmd|meta|m)$/i.test(n)) o = !0;
		else if (/^a(lt)?$/i.test(n)) r = !0;
		else if (/^(c|ctrl|control)$/i.test(n)) i = !0;
		else if (/^s(hift)?$/i.test(n)) a = !0;
		else if (/^mod$/i.test(n)) Tc ? o = !0 : i = !0;
		else throw Error("Unrecognized modifier name: " + n);
	}
	return r && (n = "Alt-" + n), i && (n = "Ctrl-" + n), o && (n = "Meta-" + n), a && (n = "Shift-" + n), n;
}
function Oc(e) {
	let t = Object.create(null);
	for (let n in e) t[Dc(n)] = e[n];
	return t;
}
function kc(e, t, n = !0) {
	return t.altKey && (e = "Alt-" + e), t.ctrlKey && (e = "Ctrl-" + e), t.metaKey && (e = "Meta-" + e), n && t.shiftKey && (e = "Shift-" + e), e;
}
function Ac(e) {
	return new j({ props: { handleKeyDown: jc(e) } });
}
function jc(e) {
	let t = Oc(e);
	return function(e, n) {
		let r = wc(n), i, a = t[kc(r, n)];
		if (a && a(e.state, e.dispatch, e)) return !0;
		if (r.length == 1 && r != " ") {
			if (n.shiftKey) {
				let i = t[kc(r, n, !1)];
				if (i && i(e.state, e.dispatch, e)) return !0;
			}
			if ((n.altKey || n.metaKey || n.ctrlKey) && !(Ec && n.ctrlKey && n.altKey) && (i = yc[n.keyCode]) && i != r) {
				let r = t[kc(i, n)];
				if (r && r(e.state, e.dispatch, e)) return !0;
			}
		}
		return !1;
	};
}
//#endregion
//#region ../../node_modules/@tiptap/pm/dist/keymap/index.js
var Mc = /* @__PURE__ */ t({
	keydownHandler: () => jc,
	keymap: () => Ac
}), Nc = /* @__PURE__ */ t({
	CommandManager: () => Fc,
	DECORATION_MANAGER_PLUGIN_KEY: () => zd,
	Decoration: () => Pp,
	DecorationManager: () => hf,
	Editor: () => Np,
	Extendable: () => cp,
	Extension: () => W,
	Fragment: () => Zp,
	InlineDecoration: () => Fp,
	InputRule: () => ip,
	MappablePosition: () => cd,
	Mark: () => lp,
	MarkView: () => rp,
	Node: () => G,
	NodeDecoration: () => Ip,
	NodePos: () => jp,
	NodeView: () => rm,
	PasteRule: () => up,
	ResizableNodeView: () => tm,
	ResizableNodeview: () => nm,
	Tracker: () => sm,
	WidgetDecoration: () => Lp,
	attrsEqual: () => gf,
	callOrReturn: () => H,
	canInsertNode: () => _f,
	combineTransactionSteps: () => Ql,
	commands: () => Ud,
	createAtomBlockMarkdownSpec: () => Uf,
	createBlockMarkdownSpec: () => Wf,
	createChainableState: () => Pc,
	createDocument: () => Yl,
	createElement: () => $p,
	createInlineMarkdownSpec: () => qf,
	createMappablePosition: () => ud,
	createNodeFromContent: () => _l,
	createStyleTag: () => vf,
	createWidgetDecoration: () => Bp,
	decodeHtmlEntities: () => xf,
	defaultBlockAt: () => xl,
	deleteProps: () => Bl,
	elementFromString: () => hl,
	encodeHtmlEntities: () => Sf,
	escapeForRegEx: () => yf,
	extensions: () => Op,
	findChildren: () => $l,
	findChildrenInRange: () => eu,
	findDuplicates: () => _u,
	findParentNode: () => nu,
	findParentNodeClosestToPos: () => tu,
	flattenExtensions: () => ru,
	fromString: () => fu,
	generateHTML: () => xu,
	generateJSON: () => Su,
	generateText: () => Eu,
	getAttributes: () => Ou,
	getAttributesFromExtensions: () => cu,
	getChangedRanges: () => ju,
	getDebugJSON: () => Mu,
	getExtensionField: () => V,
	getHTMLFromFragment: () => iu,
	getMarkAttributes: () => Zl,
	getMarkRange: () => tl,
	getMarkType: () => nl,
	getMarksBetween: () => Nu,
	getNodeAtPosition: () => Pu,
	getNodeAttributes: () => Du,
	getNodeType: () => B,
	getPreviousBlockSibling: () => Fu,
	getRenderedAttributes: () => du,
	getSchema: () => bu,
	getSchemaByResolvedExtensions: () => gu,
	getSchemaTypeByName: () => Iu,
	getSchemaTypeNameByName: () => zl,
	getSplittedAttributes: () => Lu,
	getStyleProperty: () => bf,
	getText: () => wu,
	getTextBetween: () => Cu,
	getTextContentFromNodes: () => Ru,
	getTextSerializersFromSchema: () => Tu,
	getUpdatedPosition: () => ld,
	h: () => $p,
	injectExtensionAttributesToParseRule: () => pu,
	inputRulesPlugin: () => sp,
	isActive: () => Bu,
	isAndroid: () => cl,
	isAtEndOfNode: () => Vu,
	isAtStartOfNode: () => Hu,
	isEmptyObject: () => ou,
	isExtensionRulesEnabled: () => Uu,
	isFirefox: () => Cf,
	isFunction: () => au,
	isList: () => Wu,
	isMacOS: () => jl,
	isMarkActive: () => zu,
	isNodeActive: () => Pl,
	isNodeEmpty: () => Gu,
	isNodeSelection: () => Ku,
	isNodeViewSelected: () => qu,
	isNumber: () => wf,
	isPlainObject: () => Ef,
	isProseMirrorAddMarkStep: () => Yu,
	isProseMirrorAddNodeMarkStep: () => Xu,
	isProseMirrorAttrStep: () => Zu,
	isProseMirrorCellSelection: () => Qu,
	isProseMirrorDocAttrStep: () => $u,
	isProseMirrorFragment: () => ed,
	isProseMirrorNodeSelection: () => td,
	isProseMirrorRemoveMarkStep: () => nd,
	isProseMirrorRemoveNodeMarkStep: () => rd,
	isProseMirrorReplaceAroundStep: () => id,
	isProseMirrorReplaceStep: () => ad,
	isProseMirrorSlice: () => od,
	isProseMirrorStep: () => Ju,
	isProseMirrorStepResult: () => sd,
	isRegExp: () => Zc,
	isSafari: () => ul,
	isString: () => Df,
	isTextSelection: () => al,
	isiOS: () => ll,
	liveWidgetKeys: () => mf,
	markInputRule: () => Vp,
	markPasteRule: () => im,
	markdown: () => Qf,
	marksEqual: () => ep,
	mergeAttributes: () => U,
	mergeDeep: () => tp,
	minMax: () => ol,
	nodeInputRule: () => Hp,
	nodePasteRule: () => am,
	objectIncludes: () => Qc,
	parseAttributes: () => Vf,
	parseIndentedBlocks: () => Jf,
	pasteRulesPlugin: () => hp,
	posToDOMRect: () => dd,
	removeDuplicates: () => ku,
	renderNestedMarkdownContent: () => Zf,
	resolveExtensions: () => yu,
	resolveFocusPosition: () => sl,
	rewriteUnknownContent: () => pd,
	selectionToInsertionEnd: () => yl,
	serializeAttributes: () => Hf,
	sortExtensions: () => vu,
	splitExtensions: () => su,
	textInputRule: () => Wp,
	textPasteRule: () => om,
	textblockTypeInputRule: () => Up,
	updateMarkViewAttributes: () => np,
	wrappingInputRule: () => Gp
});
function Pc(e) {
	let { state: t, transaction: n } = e, { selection: r } = n, { doc: i } = n, { storedMarks: a } = n;
	return {
		...t,
		apply: t.apply.bind(t),
		applyTransaction: t.applyTransaction.bind(t),
		plugins: t.plugins,
		schema: t.schema,
		reconfigure: t.reconfigure.bind(t),
		toJSON: t.toJSON.bind(t),
		get storedMarks() {
			return a;
		},
		get selection() {
			return r;
		},
		get doc() {
			return i;
		},
		get tr() {
			return r = n.selection, i = n.doc, a = n.storedMarks, n;
		}
	};
}
var Fc = class e {
	constructor(e) {
		this.editor = e.editor, this.rawCommands = this.editor.extensionManager.commands, this.customState = e.state;
	}
	get hasCustomState() {
		return !!this.customState;
	}
	get state() {
		return this.customState || this.editor.state;
	}
	get commands() {
		let { rawCommands: e, editor: t, state: n } = this, { view: r } = t, { tr: i } = n, a = this.buildProps(i);
		return Object.fromEntries(Object.entries(e).map(([e, t]) => [e, (...e) => {
			let n = t(...e)(a);
			return !i.getMeta("preventDispatch") && !this.hasCustomState && r.dispatch(i), n;
		}]));
	}
	get chain() {
		return () => this.createChain();
	}
	get can() {
		return () => this.createCan();
	}
	createChain(e, t = !0) {
		let { rawCommands: n, editor: r, state: i } = this, { view: a } = r, o = [], s = !!e, c = e || i.tr, l = () => (!s && t && !c.getMeta("preventDispatch") && !this.hasCustomState && a.dispatch(c), o.every((e) => e === !0)), u = {
			...Object.fromEntries(Object.entries(n).map(([e, n]) => [e, (...e) => {
				let r = this.buildProps(c, t), i = n(...e)(r);
				return o.push(i), u;
			}])),
			run: l
		};
		return u;
	}
	static createFakeChain() {
		let e = new Proxy({}, { get: (t, n) => {
			if (n !== "then") return n === "run" ? () => !1 : () => e;
		} });
		return e;
	}
	createCan(e) {
		let { rawCommands: t, state: n } = this, r = e || n.tr, i = this.buildProps(r, !1);
		return {
			...Object.fromEntries(Object.entries(t).map(([e, t]) => [e, (...e) => t(...e)({
				...i,
				dispatch: void 0
			})])),
			chain: () => this.createChain(r, !1)
		};
	}
	static createFallbackCan() {
		let t = e.createFakeChain();
		return new Proxy({ chain: () => t }, { get: (e, t) => {
			if (t !== "then") return t === "chain" ? e.chain : () => !1;
		} });
	}
	buildProps(e, t = !0) {
		let { rawCommands: n, editor: r, state: i } = this, { view: a } = r, o = {
			tr: e,
			editor: r,
			view: a,
			state: Pc({
				state: i,
				transaction: e
			}),
			dispatch: t ? () => void 0 : void 0,
			chain: () => this.createChain(e, t),
			can: () => this.createCan(e),
			get commands() {
				return Object.fromEntries(Object.entries(n).map(([e, t]) => [e, (...e) => t(...e)(o)]));
			}
		};
		return o;
	}
}, Ic = () => ({ editor: e, view: t }) => (requestAnimationFrame(() => {
	if (!e.isDestroyed) {
		var n;
		t.dom.blur(), (n = window) == null || (n = n.getSelection()) == null || n.removeAllRanges();
	}
}), !0), Lc = (e = !0) => ({ commands: t }) => t.setContent("", { emitUpdate: e }), Rc = () => ({ state: e, tr: t, dispatch: n }) => {
	let { selection: r } = t, { ranges: i } = r;
	return n && i.forEach(({ $from: n, $to: r }) => {
		e.doc.nodesBetween(n.pos, r.pos, (e, n) => {
			if (e.type.isText) return;
			let { doc: r, mapping: i } = t, a = r.resolve(i.map(n)), o = r.resolve(i.map(n + e.nodeSize)), s = a.blockRange(o);
			if (!s) return;
			let c = kt(s);
			if (e.type.isTextblock) {
				let { defaultType: e } = a.parent.contentMatchAt(a.index());
				t.setNodeMarkup(s.start, e);
			}
			(c || c === 0) && t.lift(s, c);
		});
	}), !0;
}, zc = (e) => (t) => e(t), Bc = () => ({ state: e, dispatch: t }) => ar(e, t), Vc = (e, t) => ({ editor: n, tr: r }) => {
	let { state: i } = n, a = i.doc.slice(e.from, e.to);
	r.deleteRange(e.from, e.to);
	let o = r.mapping.map(t);
	return r.insert(o, a.content), r.setSelection(new k(r.doc.resolve(Math.max(o - 1, 0)))), !0;
}, Hc = () => ({ tr: e, dispatch: t }) => {
	let { selection: n } = e, r = n.$anchor.node();
	if (r.content.size > 0) return !1;
	let i = e.selection.$anchor;
	for (let n = i.depth; n > 0; --n) if (i.node(n).type === r.type) {
		if (t) {
			let t = i.before(n), r = i.after(n);
			e.delete(t, r).scrollIntoView();
		}
		return !0;
	}
	return !1;
};
function B(e, t) {
	if (typeof e == "string") {
		if (!t.nodes[e]) throw Error(`There is no node type named '${e}'. Maybe you forgot to add the extension?`);
		return t.nodes[e];
	}
	return e;
}
var Uc = (e) => ({ tr: t, state: n, dispatch: r }) => {
	let i = B(e, n.schema), a = t.selection.$anchor;
	for (let e = a.depth; e > 0; --e) if (a.node(e).type === i) {
		if (r) {
			let n = a.before(e), r = a.after(e);
			t.delete(n, r).scrollIntoView();
		}
		return !0;
	}
	return !1;
}, Wc = (e) => ({ tr: t, dispatch: n }) => {
	let { from: r, to: i } = e;
	return n && t.delete(r, i), !0;
}, Gc = (e) => e.content ? /^text(\*|\+)/.test(e.content) : !1, Kc = (e, t, n) => {
	if (!e.parent.isInline || n === "left" && e.pos > e.start() || n === "right" && e.pos < e.end()) return e.pos;
	let r = t.nodes[e.parent.type.name].spec;
	return Gc(r) ? n === "left" ? e.start() - 1 : e.end() + 1 : e.pos;
}, qc = (e, t, n) => ({
	from: Kc(e, n, "left"),
	to: Kc(t, n, "right")
}), Jc = () => ({ state: e, dispatch: t }) => {
	if (e.selection.empty) return !1;
	if (t) {
		let n = e.tr, { ranges: r } = e.selection, i = n.steps.length;
		r.forEach((t) => {
			let r = n.mapping.slice(i), { from: a, to: o } = qc(n.doc.resolve(r.map(t.$from.pos)), n.doc.resolve(r.map(t.$to.pos)), e.schema);
			n.deleteRange(a, o);
		}), n.selection.empty || n.setSelection(k.near(n.doc.resolve(n.selection.from))), n.scrollIntoView(), t(n);
	}
	return !0;
}, Yc = () => ({ commands: e }) => e.keyboardShortcut("Enter"), Xc = () => ({ state: e, dispatch: t }) => ir(e, t);
function Zc(e) {
	return Object.prototype.toString.call(e) === "[object RegExp]";
}
function Qc(e, t, n = { strict: !0 }) {
	let r = Object.keys(t);
	return !r.length || r.every((r) => n.strict ? t[r] === e[r] : Zc(t[r]) ? t[r].test(e[r]) : t[r] === e[r]);
}
function $c(e, t, n = {}) {
	return e.find((e) => e.type === t && Qc(Object.fromEntries(Object.keys(n).map((t) => [t, e.attrs[t]])), n));
}
function el(e, t, n = {}) {
	return !!$c(e, t, n);
}
function tl(e, t, n) {
	if (!e || !t) return;
	let r = e.parent.childAfter(e.parentOffset);
	if ((!r.node || !r.node.marks.some((e) => e.type === t)) && (r = e.parent.childBefore(e.parentOffset)), !r.node || !r.node.marks.some((e) => e.type === t)) return;
	if (!n) {
		let e = r.node.marks.find((e) => e.type === t);
		e && (n = e.attrs);
	}
	if (!$c([...r.node.marks], t, n)) return;
	let i = r.index, a = e.start() + r.offset, o = i + 1, s = a + r.node.nodeSize;
	for (; i > 0 && el([...e.parent.child(i - 1).marks], t, n);) --i, a -= e.parent.child(i).nodeSize;
	for (; o < e.parent.childCount && el([...e.parent.child(o).marks], t, n);) s += e.parent.child(o).nodeSize, o += 1;
	return {
		from: a,
		to: s
	};
}
function nl(e, t) {
	if (typeof e == "string") {
		if (!t.marks[e]) throw Error(`There is no mark type named '${e}'. Maybe you forgot to add the extension?`);
		return t.marks[e];
	}
	return e;
}
var rl = (e, t) => ({ tr: n, state: r, dispatch: i }) => {
	let a = nl(e, r.schema), { doc: o, selection: s } = n, { $from: c, from: l, to: u } = s;
	if (i) {
		let e = tl(c, a, t);
		if (e && e.from <= l && e.to >= u) {
			let t = k.create(o, e.from, e.to);
			n.setSelection(t);
		}
	}
	return !0;
}, il = (e) => (t) => {
	let n = typeof e == "function" ? e(t) : e;
	for (let e = 0; e < n.length; e += 1) if (n[e](t)) return !0;
	return !1;
};
function al(e) {
	return e instanceof k;
}
function ol(e = 0, t = 0, n = 0) {
	return Math.min(Math.max(e, t), n);
}
function sl(e, t = null) {
	if (!t) return null;
	let n = O.atStart(e), r = O.atEnd(e);
	if (t === "start" || t === !0) return n;
	if (t === "end") return r;
	let i = n.from, a = r.to;
	return t === "all" ? k.create(e, ol(0, i, a), ol(e.content.size, i, a)) : k.create(e, ol(t, i, a), ol(t, i, a));
}
function cl() {
	return ["Android"].includes(navigator.platform) || /android/i.test(navigator.userAgent);
}
function ll() {
	return [
		"iPad Simulator",
		"iPhone Simulator",
		"iPod Simulator",
		"iPad",
		"iPhone",
		"iPod"
	].includes(navigator.platform) || navigator.userAgent.includes("Mac") && "ontouchend" in document;
}
function ul() {
	return typeof navigator < "u" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}
var dl = (e = null, t = {}) => ({ editor: n, view: r, tr: i, dispatch: a }) => {
	t = {
		scrollIntoView: !0,
		...t
	};
	let o = () => {
		(ll() || cl()) && r.dom.focus(), ul() && !ll() && !cl() && r.dom.focus({ preventScroll: !0 }), requestAnimationFrame(() => {
			n.isDestroyed || (r.focus(), t?.scrollIntoView && n.commands.scrollIntoView());
		});
	};
	try {
		if (r.hasFocus() && e === null || e === !1) return !0;
	} catch {
		return !1;
	}
	if (a && e === null && !al(n.state.selection)) return o(), !0;
	let s = sl(i.doc, e) || n.state.selection, c = n.state.selection.eq(s);
	return a && (c || i.setSelection(s), c && i.storedMarks && i.setStoredMarks(i.storedMarks), o()), !0;
}, fl = (e, t) => (n) => e.every((e, r) => t(e, {
	...n,
	index: r
})), pl = (e, t) => ({ tr: n, commands: r }) => r.insertContentAt({
	from: n.selection.from,
	to: n.selection.to
}, e, t), ml = (e) => {
	let t = e.childNodes;
	for (let n = t.length - 1; n >= 0; --n) {
		let r = t[n];
		r.nodeType === 3 && r.nodeValue && /^(\n\s\s|\n)$/.test(r.nodeValue) ? e.removeChild(r) : r.nodeType === 1 && ml(r);
	}
	return e;
};
function hl(e) {
	if (typeof window > "u") throw Error("[tiptap error]: there is no window object available, so this function cannot be used");
	let t = `<body>${e}</body>`, n = new window.DOMParser().parseFromString(t, "text/html").body;
	return ml(n);
}
function gl(e) {
	return typeof e?.nodesBetween == "function";
}
function _l(e, t, n) {
	if (gl(e)) return e;
	let r = typeof e == "object" && !!e;
	n = {
		slice: !0,
		parseOptions: {},
		...n
	};
	let i = typeof e == "string";
	if (r) try {
		if (Array.isArray(e) && e.length > 0) return l.fromArray(e.map((e) => t.nodeFromJSON(e)));
		let r = t.nodeFromJSON(e);
		return n.errorOnInvalidContent && r.check(), r;
	} catch (r) {
		if (n.errorOnInvalidContent) throw Error("[tiptap error]: Invalid JSON content", { cause: r });
		return console.warn("[tiptap warn]: Invalid content.", "Passed value:", e, "Error:", r), _l("", t, n);
	}
	if (i) {
		if (n.errorOnInvalidContent) {
			let r = !1, i = "", a = new Ne({
				topNode: t.spec.topNode,
				marks: t.spec.marks,
				nodes: t.spec.nodes.append({ __tiptap__private__unknown__catch__all__node: {
					content: "inline*",
					group: "block",
					parseDOM: [{
						tag: "*",
						getAttrs: (e) => (r = !0, i = typeof e == "string" ? e : e.outerHTML, null)
					}]
				} })
			});
			if (n.slice ? Le.fromSchema(a).parseSlice(hl(e), n.parseOptions) : Le.fromSchema(a).parse(hl(e), n.parseOptions), n.errorOnInvalidContent && r) throw Error("[tiptap error]: Invalid HTML content", { cause: /* @__PURE__ */ Error(`Invalid element found: ${i}`) });
		}
		let r = Le.fromSchema(t);
		return n.slice ? r.parseSlice(hl(e), n.parseOptions).content : r.parse(hl(e), n.parseOptions);
	}
	return _l("", t, n);
}
function vl(e) {
	return !("type" in e);
}
function yl(e, t, n) {
	let r = e.steps.length - 1;
	if (r < t) return;
	let i = e.steps[r];
	if (!(i instanceof St || i instanceof Ct)) return;
	let a = e.mapping.maps[r], o = 0;
	a.forEach((e, t, n, r) => {
		o === 0 && (o = r);
	}), e.setSelection(O.near(e.doc.resolve(o), n));
}
var bl = (e, t, n) => ({ tr: r, dispatch: i, editor: a }) => {
	if (i) {
		n = {
			parseOptions: a.options.parseOptions,
			updateSelection: !0,
			applyInputRules: !1,
			applyPasteRules: !1,
			...n
		};
		let i, o = (e) => {
			a.emit("contentError", {
				editor: a,
				error: e,
				disableCollaboration: () => {
					"collaboration" in a.storage && typeof a.storage.collaboration == "object" && a.storage.collaboration && (a.storage.collaboration.isDisabled = !0);
				}
			});
		}, s = {
			preserveWhitespace: "full",
			...n.parseOptions
		};
		if (!n.errorOnInvalidContent && !a.options.enableContentCheck && a.options.emitContentError) try {
			_l(t, a.schema, {
				parseOptions: s,
				errorOnInvalidContent: !0
			});
		} catch (e) {
			o(e);
		}
		try {
			i = _l(t, a.schema, {
				parseOptions: s,
				errorOnInvalidContent: n.errorOnInvalidContent ?? a.options.enableContentCheck
			});
		} catch (e) {
			return o(e), !1;
		}
		let { from: c, to: u } = typeof e == "number" ? {
			from: e,
			to: e
		} : {
			from: e.from,
			to: e.to
		}, d = !0, f = !0, p = vl(i) ? i.content : [i];
		if (p.forEach((e) => {
			e.check(), d = d ? e.isText && e.marks.length === 0 : !1, f = f ? e.isBlock : !1;
		}), c === u && f) {
			let { parent: e } = r.doc.resolve(c);
			e.isTextblock && !e.type.spec.code && !e.childCount && (--c, u += 1);
		}
		let m;
		if (d) m = Array.isArray(t) ? t.map((e) => e.text || "").join("") : gl(t) ? p.map((e) => e.text ?? "").join("") : typeof t == "object" && t && t.text ? t.text : t, r.insertText(m, c, u);
		else {
			m = l.from(p);
			let e = r.doc.resolve(c), t = e.node(), n = e.parentOffset === 0, i = t.isText || t.isTextblock, a = t.content.size > 0;
			n && i && a && f && (c = Math.max(0, c - 1)), r.replaceWith(c, u, p);
		}
		n.updateSelection && yl(r, r.steps.length - 1, -1), n.applyInputRules && r.setMeta("applyInputRules", {
			from: c,
			text: m
		}), n.applyPasteRules && r.setMeta("applyPasteRules", {
			from: c,
			text: m
		});
	}
	return !0;
};
function xl(e) {
	for (let t = 0; t < e.edgeCount; t += 1) {
		let { type: n } = e.edge(t);
		if (n.isTextblock && !n.hasRequiredAttrs()) return n;
	}
	return null;
}
var Sl = (e = {}) => ({ tr: t, dispatch: n, editor: r }) => {
	let { pos: i, attrs: a, content: o, updateSelection: s = !0 } = e, c;
	c = typeof i == "number" ? t.doc.resolve(i) : i || t.selection.$from;
	let l = xl(c.parent.contentMatchAt(c.index()));
	if (!l) return !1;
	let u = Object.keys(l.spec.attrs || {}), d = a ? Object.fromEntries(Object.entries(a).filter(([e]) => u.includes(e))) : {}, f;
	if (o) {
		let e = _l(o, r.schema);
		f = l.createAndFill(d, e);
	} else f = l.createAndFill(d);
	return f ? (n && (t.insert(c.pos, f), s && yl(t, t.steps.length - 1, -1)), !0) : !1;
}, Cl = () => ({ state: e, dispatch: t }) => $n(e, t), wl = () => ({ state: e, dispatch: t }) => er(e, t), Tl = () => ({ state: e, dispatch: t }) => Hn(e, t), El = () => ({ state: e, dispatch: t }) => Xn(e, t), Dl = () => ({ state: e, dispatch: t, tr: n }) => {
	try {
		let r = Kt(e.doc, e.selection.$from.pos, -1);
		return r != null && (n.join(r, 2), t && t(n), !0);
	} catch {
		return !1;
	}
}, Ol = () => ({ state: e, dispatch: t, tr: n }) => {
	try {
		let r = Kt(e.doc, e.selection.$from.pos, 1);
		return r != null && (n.join(r, 2), t && t(n), !0);
	} catch {
		return !1;
	}
}, kl = () => ({ state: e, dispatch: t }) => Un(e, t), Al = () => ({ state: e, dispatch: t }) => Wn(e, t);
function jl() {
	return typeof navigator < "u" && /Mac/.test(navigator.platform);
}
function Ml(e) {
	let t = e.split(/-(?!$)/), n = t[t.length - 1];
	n === "Space" && (n = " ");
	let r, i, a, o;
	for (let e = 0; e < t.length - 1; e += 1) {
		let n = t[e];
		if (/^(cmd|meta|m)$/i.test(n)) o = !0;
		else if (/^a(lt)?$/i.test(n)) r = !0;
		else if (/^(c|ctrl|control)$/i.test(n)) i = !0;
		else if (/^s(hift)?$/i.test(n)) a = !0;
		else if (/^mod$/i.test(n)) ll() || jl() ? o = !0 : i = !0;
		else throw Error(`Unrecognized modifier name: ${n}`);
	}
	return r && (n = `Alt-${n}`), i && (n = `Ctrl-${n}`), o && (n = `Meta-${n}`), a && (n = `Shift-${n}`), n;
}
var Nl = (e) => ({ editor: t, view: n, tr: r, dispatch: i }) => {
	let a = Ml(e).split(/-(?!$)/), o = a.find((e) => ![
		"Alt",
		"Ctrl",
		"Meta",
		"Shift"
	].includes(e)), s = new KeyboardEvent("keydown", {
		key: o === "Space" ? " " : o,
		altKey: a.includes("Alt"),
		ctrlKey: a.includes("Ctrl"),
		metaKey: a.includes("Meta"),
		shiftKey: a.includes("Shift"),
		bubbles: !0,
		cancelable: !0
	});
	return t.captureTransaction(() => {
		n.someProp("handleKeyDown", (e) => e(n, s));
	})?.steps.forEach((e) => {
		let t = e.map(r.mapping);
		t && i && r.maybeStep(t);
	}), !0;
};
function Pl(e, t, n = {}) {
	let { from: r, to: i, empty: a } = e.selection, o = t ? B(t, e.schema) : null, s = [];
	e.doc.nodesBetween(r, i, (e, t) => {
		if (e.isText) return;
		let n = Math.max(r, t), a = Math.min(i, t + e.nodeSize);
		s.push({
			node: e,
			from: n,
			to: a
		});
	});
	let c = i - r, l = s.filter((e) => !o || o.name === e.node.type.name).filter((e) => Qc(e.node.attrs, n, { strict: !1 }));
	return a ? !!l.length : l.reduce((e, t) => e + t.to - t.from, 0) >= c;
}
var Fl = (e, t = {}) => ({ state: n, dispatch: r }) => Pl(n, B(e, n.schema), t) ? tr(n, r) : !1, Il = () => ({ state: e, dispatch: t }) => or(e, t), Ll = (e) => ({ state: t, dispatch: n }) => Kr(B(e, t.schema))(t, n), Rl = () => ({ state: e, dispatch: t }) => nr(e, t);
function zl(e, t) {
	return t.nodes[e] ? "node" : t.marks[e] ? "mark" : null;
}
function Bl(e, t) {
	let n = typeof t == "string" ? [t] : t;
	return Object.keys(e).reduce((t, r) => (n.includes(r) || (t[r] = e[r]), t), {});
}
var Vl = (e, t) => ({ tr: n, state: r, dispatch: i }) => {
	let a = null, o = null, s = zl(typeof e == "string" ? e : e.name, r.schema);
	if (!s) return !1;
	s === "node" && (a = B(e, r.schema)), s === "mark" && (o = nl(e, r.schema));
	let c = !1;
	return n.selection.ranges.forEach((e) => {
		r.doc.nodesBetween(e.$from.pos, e.$to.pos, (e, r) => {
			a && a === e.type && (c = !0, i && n.setNodeMarkup(r, void 0, Bl(e.attrs, t))), o && e.marks.length && e.marks.forEach((a) => {
				o === a.type && (c = !0, i && n.addMark(r, r + e.nodeSize, o.create(Bl(a.attrs, t))));
			});
		});
	}), c;
}, Hl = () => ({ tr: e, dispatch: t }) => (t && e.scrollIntoView(), !0), Ul = () => ({ tr: e, dispatch: t }) => {
	if (t) {
		let t = new wn(e.doc);
		e.setSelection(t);
	}
	return !0;
}, Wl = () => ({ state: e, dispatch: t }) => qn(e, t), Gl = () => ({ state: e, dispatch: t }) => Zn(e, t), Kl = () => ({ state: e, dispatch: t }) => ur(e, t), ql = () => ({ state: e, dispatch: t }) => gr(e, t), Jl = () => ({ state: e, dispatch: t }) => hr(e, t);
function Yl(e, t, n = {}, r = {}) {
	return _l(e, t, {
		slice: !1,
		parseOptions: n,
		errorOnInvalidContent: r.errorOnInvalidContent
	});
}
var Xl = (e, { errorOnInvalidContent: t, emitUpdate: n = !0, parseOptions: r = {} } = {}) => ({ editor: i, tr: a, dispatch: o, commands: s }) => {
	let { doc: c } = a;
	if (r.preserveWhitespace !== "full") {
		let s = Yl(e, i.schema, r, { errorOnInvalidContent: t ?? i.options.enableContentCheck });
		if (o) {
			let e = vl(s) ? s.content : [s];
			a.replaceWith(0, c.content.size, e).setMeta("preventUpdate", !n);
		}
		return !0;
	}
	return o && a.setMeta("preventUpdate", !n), s.insertContentAt({
		from: 0,
		to: c.content.size
	}, e, {
		parseOptions: r,
		errorOnInvalidContent: t ?? i.options.enableContentCheck
	});
};
function Zl(e, t) {
	let n = nl(t, e.schema), { from: r, to: i, empty: a } = e.selection, o = [];
	a ? (e.storedMarks && o.push(...e.storedMarks), o.push(...e.selection.$head.marks())) : e.doc.nodesBetween(r, i, (e) => {
		o.push(...e.marks);
	});
	let s = o.find((e) => e.type.name === n.name);
	return s ? { ...s.attrs } : {};
}
function Ql(e, t) {
	let n = new gn(e);
	return t.forEach((e) => {
		e.steps.forEach((e) => {
			n.step(e);
		});
	}), n;
}
function $l(e, t) {
	let n = [];
	return e.descendants((e, r) => {
		t(e) && n.push({
			node: e,
			pos: r
		});
	}), n;
}
function eu(e, t, n) {
	let r = [];
	return e.nodesBetween(t.from, t.to, (e, t) => {
		n(e) && r.push({
			node: e,
			pos: t
		});
	}), r;
}
function tu(e, t) {
	for (let n = e.depth; n > 0; --n) {
		let r = e.node(n);
		if (t(r)) return {
			pos: n > 0 ? e.before(n) : 0,
			start: e.start(n),
			depth: n,
			node: r
		};
	}
}
function nu(e) {
	return (t) => tu(t.$from, e);
}
function V(e, t, n) {
	return e.config[t] === void 0 && e.parent ? V(e.parent, t, n) : typeof e.config[t] == "function" ? e.config[t].bind({
		...n,
		parent: e.parent ? V(e.parent, t, n) : null
	}) : e.config[t];
}
function ru(e) {
	return e.map((e) => {
		let t = V(e, "addExtensions", {
			name: e.name,
			options: e.options,
			storage: e.storage
		});
		return t ? [e, ...ru(t())] : e;
	}).flat(10);
}
function iu(e, t) {
	let n = Ze.fromSchema(t).serializeFragment(e), r = document.implementation.createHTMLDocument().createElement("div");
	return r.appendChild(n), r.innerHTML;
}
function au(e) {
	return typeof e == "function";
}
function H(e, t = void 0, ...n) {
	return au(e) ? t ? e.bind(t)(...n) : e(...n) : e;
}
function ou(e = {}) {
	return Object.keys(e).length === 0 && e.constructor === Object;
}
function su(e) {
	return {
		baseExtensions: e.filter((e) => e.type === "extension"),
		nodeExtensions: e.filter((e) => e.type === "node"),
		markExtensions: e.filter((e) => e.type === "mark")
	};
}
function cu(e) {
	let t = [], { nodeExtensions: n, markExtensions: r } = su(e), i = [...n, ...r], a = {
		default: null,
		validate: void 0,
		rendered: !0,
		renderHTML: null,
		parseHTML: null,
		keepOnSplit: !0,
		isRequired: !1
	}, o = n.filter((e) => e.name !== "text").map((e) => e.name), s = r.map((e) => e.name), c = [...o, ...s];
	return e.forEach((e) => {
		let n = V(e, "addGlobalAttributes", {
			name: e.name,
			options: e.options,
			storage: e.storage,
			extensions: i
		});
		n && n().forEach((e) => {
			let n;
			n = Array.isArray(e.types) ? e.types : e.types === "*" ? c : e.types === "nodes" ? o : e.types === "marks" ? s : [], n.forEach((n) => {
				Object.entries(e.attributes).forEach(([e, r]) => {
					t.push({
						type: n,
						name: e,
						attribute: {
							...a,
							...r
						}
					});
				});
			});
		});
	}), i.forEach((e) => {
		let n = V(e, "addAttributes", {
			name: e.name,
			options: e.options,
			storage: e.storage
		});
		if (!n) return;
		let r = n();
		Object.entries(r).forEach(([n, r]) => {
			let i = {
				...a,
				...r
			};
			typeof i?.default == "function" && (i.default = i.default()), i?.isRequired && i?.default === void 0 && delete i.default, t.push({
				type: e.name,
				name: n,
				attribute: i
			});
		});
	}), t;
}
function lu(e) {
	let t = [], n = "", r = !1, i = !1, a = 0, o = e.length;
	for (let s = 0; s < o; s += 1) {
		let o = e[s];
		if (o === "'" && !i) {
			r = !r, n += o;
			continue;
		}
		if (o === "\"" && !r) {
			i = !i, n += o;
			continue;
		}
		if (!r && !i) {
			if (o === "(") {
				a += 1, n += o;
				continue;
			}
			if (o === ")" && a > 0) {
				--a, n += o;
				continue;
			}
			if (o === ";" && a === 0) {
				t.push(n), n = "";
				continue;
			}
		}
		n += o;
	}
	return n && t.push(n), t;
}
function uu(e) {
	let t = [], n = lu(e || ""), r = n.length;
	for (let e = 0; e < r; e += 1) {
		let r = n[e], i = r.indexOf(":");
		if (i === -1) continue;
		let a = r.slice(0, i).trim(), o = r.slice(i + 1).trim();
		a && o && t.push([a, o]);
	}
	return t;
}
function U(...e) {
	return e.filter((e) => !!e).reduce((e, t) => {
		let n = { ...e };
		return Object.entries(t).forEach(([e, t]) => {
			if (e === "__proto__") {
				Object.defineProperty(n, e, {
					configurable: !0,
					enumerable: !0,
					value: t,
					writable: !0
				});
				return;
			}
			if (!n[e]) {
				n[e] = t;
				return;
			}
			if (e === "class") {
				let r = t ? String(t).split(" ") : [], i = n[e] ? n[e].split(" ") : [], a = r.filter((e) => !i.includes(e));
				n[e] = [...i, ...a].join(" ");
			} else if (e === "style") {
				let r = new Map([...uu(n[e]), ...uu(t)]);
				n[e] = Array.from(r.entries()).map(([e, t]) => `${e}: ${t}`).join("; ");
			} else n[e] = t;
		}), n;
	}, {});
}
function du(e, t) {
	return t.filter((t) => t.type === e.type.name).filter((e) => e.attribute.rendered).map((t) => t.attribute.renderHTML ? t.attribute.renderHTML(e.attrs) || {} : { [t.name]: e.attrs[t.name] }).reduce((e, t) => U(e, t), {});
}
function fu(e) {
	return typeof e == "string" ? e.match(/^[+-]?(?:\d*\.)?\d+$/) ? Number(e) : e === "true" || e !== "false" && e : e;
}
function pu(e, t) {
	return "style" in e ? e : {
		...e,
		getAttrs: (n) => {
			let r = e.getAttrs ? e.getAttrs(n) : e.attrs;
			if (r === !1) return !1;
			let i = t.reduce((e, t) => {
				let r = t.attribute.parseHTML ? t.attribute.parseHTML(n) : fu(n.getAttribute(t.name));
				return r == null ? e : {
					...e,
					[t.name]: r
				};
			}, {});
			return {
				...r,
				...i
			};
		}
	};
}
function mu(e) {
	return Object.fromEntries(Object.entries(e).filter(([e, t]) => e === "attrs" && ou(t) ? !1 : t != null));
}
function hu(e) {
	var t, n;
	let r = {};
	return !(e != null && (t = e.attribute) != null && t.isRequired) && "default" in (e?.attribute || {}) && (r.default = e.attribute.default), (e == null || (n = e.attribute) == null ? void 0 : n.validate) !== void 0 && (r.validate = e.attribute.validate), [e.name, r];
}
function gu(e, t) {
	let n = cu(e), { nodeExtensions: r, markExtensions: i } = su(e), a = r.find((e) => V(e, "topNode"))?.name;
	return new Ne({
		topNode: a,
		nodes: Object.fromEntries(r.map((r) => {
			let i = n.filter((e) => e.type === r.name), a = {
				name: r.name,
				options: r.options,
				storage: r.storage,
				editor: t
			}, o = mu({
				...e.reduce((e, t) => {
					let n = V(t, "extendNodeSchema", a);
					return {
						...e,
						...n ? n(r) : {}
					};
				}, {}),
				content: H(V(r, "content", a)),
				marks: H(V(r, "marks", a)),
				group: H(V(r, "group", a)),
				inline: H(V(r, "inline", a)),
				atom: H(V(r, "atom", a)),
				selectable: H(V(r, "selectable", a)),
				draggable: H(V(r, "draggable", a)),
				code: H(V(r, "code", a)),
				whitespace: H(V(r, "whitespace", a)),
				linebreakReplacement: H(V(r, "linebreakReplacement", a)),
				defining: H(V(r, "defining", a)),
				isolating: H(V(r, "isolating", a)),
				attrs: Object.fromEntries(i.map(hu))
			}), s = H(V(r, "parseHTML", a));
			s && (o.parseDOM = s.map((e) => pu(e, i)));
			let c = V(r, "renderHTML", a);
			c && (o.toDOM = (e) => c({
				node: e,
				HTMLAttributes: du(e, i)
			}));
			let l = V(r, "renderText", a);
			return l && (o.toText = l), [r.name, o];
		})),
		marks: Object.fromEntries(i.map((r) => {
			let i = n.filter((e) => e.type === r.name), a = {
				name: r.name,
				options: r.options,
				storage: r.storage,
				editor: t
			}, o = mu({
				...e.reduce((e, t) => {
					let n = V(t, "extendMarkSchema", a);
					return {
						...e,
						...n ? n(r) : {}
					};
				}, {}),
				inclusive: H(V(r, "inclusive", a)),
				excludes: H(V(r, "excludes", a)),
				group: H(V(r, "group", a)),
				spanning: H(V(r, "spanning", a)),
				code: H(V(r, "code", a)),
				attrs: Object.fromEntries(i.map(hu))
			}), s = H(V(r, "parseHTML", a));
			s && (o.parseDOM = s.map((e) => pu(e, i)));
			let c = V(r, "renderHTML", a);
			return c && (o.toDOM = (e) => c({
				mark: e,
				HTMLAttributes: du(e, i)
			})), [r.name, o];
		}))
	});
}
function _u(e) {
	let t = e.filter((t, n) => e.indexOf(t) !== n);
	return Array.from(new Set(t));
}
function vu(e) {
	return e.sort((e, t) => {
		let n = V(e, "priority") || 100, r = V(t, "priority") || 100;
		return n > r ? -1 : +(n < r);
	});
}
function yu(e) {
	let t = vu(ru(e)), n = _u(t.map((e) => e.name));
	return n.length && console.warn(`[tiptap warn]: Duplicate extension names found: [${n.map((e) => `'${e}'`).join(", ")}]. This can lead to issues.`), t;
}
function bu(e, t) {
	return gu(yu(e), t);
}
function xu(e, t) {
	let n = bu(t);
	return iu(ce.fromJSON(n, e).content, n);
}
function Su(e, t) {
	let n = bu(t), r = hl(e);
	return Le.fromSchema(n).parse(r).toJSON();
}
function Cu(e, t, n) {
	let { from: r, to: i } = t, { blockSeparator: a = "\n\n", textSerializers: o = {} } = n || {}, s = "";
	return e.nodesBetween(r, i, (e, n, c, l) => {
		e.isBlock && n > r && (s += a);
		let u = o?.[e.type.name];
		if (u) return c && (s += u({
			node: e,
			pos: n,
			parent: c,
			index: l,
			range: t
		})), !1;
		if (e.isText) {
			var d;
			s += e == null || (d = e.text) == null ? void 0 : d.slice(Math.max(r, n) - n, i - n);
		}
	}), s;
}
function wu(e, t) {
	return Cu(e, {
		from: 0,
		to: e.content.size
	}, t);
}
function Tu(e) {
	return Object.fromEntries(Object.entries(e.nodes).filter(([, e]) => e.spec.toText).map(([e, t]) => [e, t.spec.toText]));
}
function Eu(e, t, n) {
	let { blockSeparator: r = "\n\n", textSerializers: i = {} } = n || {}, a = bu(t);
	return wu(ce.fromJSON(a, e), {
		blockSeparator: r,
		textSerializers: {
			...Tu(a),
			...i
		}
	});
}
function Du(e, t) {
	let n = B(t, e.schema), { from: r, to: i } = e.selection, a = [];
	e.doc.nodesBetween(r, i, (e) => {
		a.push(e);
	});
	let o = a.reverse().find((e) => e.type.name === n.name);
	return o ? { ...o.attrs } : {};
}
function Ou(e, t) {
	let n = zl(typeof t == "string" ? t : t.name, e.schema);
	return n === "node" ? Du(e, t) : n === "mark" ? Zl(e, t) : {};
}
function ku(e, t = JSON.stringify) {
	let n = {};
	return e.filter((e) => {
		let r = t(e);
		return Object.prototype.hasOwnProperty.call(n, r) ? !1 : n[r] = !0;
	});
}
function Au(e) {
	let t = ku(e);
	return t.length === 1 ? t : t.filter((e, n) => !t.filter((e, t) => t !== n).some((t) => e.oldRange.from >= t.oldRange.from && e.oldRange.to <= t.oldRange.to && e.newRange.from >= t.newRange.from && e.newRange.to <= t.newRange.to));
}
function ju(e) {
	let { mapping: t, steps: n } = e, r = [];
	return t.maps.forEach((e, i) => {
		let a = [];
		if (e.ranges.length) e.forEach((e, t) => {
			a.push({
				from: e,
				to: t
			});
		});
		else {
			let { from: e, to: t } = n[i];
			if (e === void 0 || t === void 0) return;
			a.push({
				from: e,
				to: t
			});
		}
		a.forEach(({ from: e, to: n }) => {
			let a = t.slice(i).map(e, -1), o = t.slice(i).map(n), s = t.invert().map(a, -1), c = t.invert().map(o);
			r.push({
				oldRange: {
					from: s,
					to: c
				},
				newRange: {
					from: a,
					to: o
				}
			});
		});
	}), Au(r);
}
function Mu(e, t = 0) {
	let n = e.type === e.type.schema.topNodeType ? 0 : 1, r = t, i = r + e.nodeSize, a = e.marks.map((e) => {
		let t = { type: e.type.name };
		return Object.keys(e.attrs).length && (t.attrs = { ...e.attrs }), t;
	}), o = { ...e.attrs }, s = {
		type: e.type.name,
		from: r,
		to: i
	};
	return Object.keys(o).length && (s.attrs = o), a.length && (s.marks = a), e.content.childCount && (s.content = [], e.forEach((e, r) => {
		var i;
		(i = s.content) == null || i.push(Mu(e, t + r + n));
	})), e.text && (s.text = e.text), s;
}
function Nu(e, t, n) {
	let r = [];
	return e === t ? n.resolve(e).marks().forEach((t) => {
		let i = tl(n.resolve(e), t.type);
		i && r.push({
			mark: t,
			...i
		});
	}) : n.nodesBetween(e, t, (e, t) => {
		e && e?.nodeSize !== void 0 && r.push(...e.marks.map((n) => ({
			from: t,
			to: t + e.nodeSize,
			mark: n
		})));
	}), r;
}
var Pu = (e, t, n, r = 20) => {
	let i = e.doc.resolve(n), a = r, o = null;
	for (; a > 0 && o === null;) {
		let e = i.node(a);
		e?.type.name === t ? o = e : --a;
	}
	return [o, a];
}, Fu = (e) => {
	let t = e.depth - 1;
	if (t < 0) return null;
	let n = e.index(t);
	return n === 0 ? null : e.node(t).child(n - 1);
};
function Iu(e, t) {
	return t.nodes[e] || t.marks[e] || null;
}
function Lu(e, t, n) {
	return Object.fromEntries(Object.entries(n).filter(([n]) => {
		let r = e.find((e) => e.type === t && e.name === n);
		return r ? r.attribute.keepOnSplit : !1;
	}));
}
var Ru = (e, t = 500) => {
	let n = "", r = e.parentOffset;
	return e.parent.nodesBetween(Math.max(0, r - t), r, (e, t, i, a) => {
		var o;
		let s = (o = e.type.spec).toText?.call(o, {
			node: e,
			pos: t,
			parent: i,
			index: a
		}) || e.textContent || "%leaf%";
		n += e.isAtom && !e.isText ? s : s.slice(0, Math.max(0, r - t));
	}), n;
};
function zu(e, t, n = {}) {
	let { empty: r, ranges: i } = e.selection, a = t ? nl(t, e.schema) : null;
	if (r) return !!(e.storedMarks || e.selection.$from.marks()).filter((e) => !a || a.name === e.type.name).find((e) => Qc(e.attrs, n, { strict: !1 }));
	let o = 0, s = [];
	if (i.forEach(({ $from: t, $to: n }) => {
		let r = t.pos, i = n.pos;
		e.doc.nodesBetween(r, i, (e, t) => {
			if (a && e.inlineContent && !e.type.allowsMarkType(a)) return !1;
			if (!e.isText && !e.marks.length) return;
			let n = Math.max(r, t), c = Math.min(i, t + e.nodeSize), l = c - n;
			o += l, s.push(...e.marks.map((e) => ({
				mark: e,
				from: n,
				to: c
			})));
		});
	}), o === 0) return !1;
	let c = s.filter((e) => !a || a.name === e.mark.type.name).filter((e) => Qc(e.mark.attrs, n, { strict: !1 })).reduce((e, t) => e + t.to - t.from, 0), l = s.filter((e) => !a || e.mark.type !== a && e.mark.type.excludes(a)).reduce((e, t) => e + t.to - t.from, 0);
	return (c > 0 ? c + l : c) >= o;
}
function Bu(e, t, n = {}) {
	if (!t) return Pl(e, null, n) || zu(e, null, n);
	let r = zl(t, e.schema);
	return r === "node" ? Pl(e, t, n) : r === "mark" && zu(e, t, n);
}
var Vu = (e, t) => {
	let { $from: n, $to: r, $anchor: i } = e.selection;
	if (t) {
		let n = nu((e) => e.type.name === t)(e.selection);
		if (!n) return !1;
		let r = e.doc.resolve(n.pos + 1);
		return i.pos + 1 === r.end();
	}
	return !(r.parentOffset < r.parent.nodeSize - 2 || n.pos !== r.pos);
}, Hu = (e) => {
	let { $from: t, $to: n } = e.selection;
	return !(t.parentOffset > 0 || t.pos !== n.pos);
};
function Uu(e, t) {
	return Array.isArray(t) ? t.some((t) => (typeof t == "string" ? t : t.name) === e.name) : t;
}
function Wu(e, t) {
	let { nodeExtensions: n } = su(t), r = n.find((t) => t.name === e);
	if (!r) return !1;
	let i = H(V(r, "group", {
		name: r.name,
		options: r.options,
		storage: r.storage
	}));
	return typeof i == "string" && i.split(" ").includes("list");
}
function Gu(e, { checkChildren: t = !0, ignoreWhitespace: n = !1 } = {}) {
	if (n) {
		if (e.type.name === "hardBreak") return !0;
		if (e.isText) return !/\S/.test(e.text ?? "");
	}
	if (e.isText) return !e.text;
	if (e.isAtom || e.isLeaf) return !1;
	if (e.content.childCount === 0) return !0;
	if (t) {
		let r = !0;
		return e.content.forEach((e) => {
			r !== !1 && (Gu(e, {
				ignoreWhitespace: n,
				checkChildren: t
			}) || (r = !1));
		}), r;
	}
	return !1;
}
function Ku(e) {
	return e instanceof A;
}
function qu({ selection: e, pos: t, nodeSize: n, selectedOnTextSelection: r = !1 }) {
	let { from: i, to: a } = e;
	return !!(i <= t && a >= t + n || r && al(e) && i > t && a < t + n);
}
function Ju(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	return typeof t.apply == "function" && typeof t.getMap == "function" && typeof t.invert == "function" && typeof t.map == "function" && typeof t.merge == "function" && typeof t.toJSON == "function";
}
function Yu(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	if (!Ju(t)) return !1;
	let n = t.toJSON();
	return !(typeof n != "object" || !n || n.stepType !== "addMark");
}
function Xu(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	if (!Ju(t)) return !1;
	let n = t.toJSON();
	return !(typeof n != "object" || !n || n.stepType !== "addNodeMark");
}
function Zu(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	if (!Ju(t)) return !1;
	let n = t.toJSON();
	return !(typeof n != "object" || !n || n.stepType !== "attr");
}
function Qu(e) {
	return typeof e != "object" || !e ? !1 : "forEachCell" in e && typeof e.forEachCell == "function";
}
function $u(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	if (!Ju(t)) return !1;
	let n = t.toJSON();
	return !(typeof n != "object" || !n || n.stepType !== "docAttr");
}
function ed(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	return !(!Array.isArray(t.content) || typeof t.size != "number" || typeof t.nodesBetween != "function" || typeof t.descendants != "function" || typeof t.textBetween != "function" || typeof t.append != "function" || typeof t.cut != "function" || typeof t.eq != "function" || typeof t.child != "function" || typeof t.forEach != "function");
}
function td(e) {
	return typeof e != "object" || !e ? !1 : "node" in e && e.node != null;
}
function nd(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	if (!Ju(t)) return !1;
	let n = t.toJSON();
	return !(typeof n != "object" || !n || n.stepType !== "removeMark");
}
function rd(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	if (!Ju(t)) return !1;
	let n = t.toJSON();
	return !(typeof n != "object" || !n || n.stepType !== "removeNodeMark");
}
function id(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	if (!Ju(t)) return !1;
	let n = t.toJSON();
	return !(typeof n != "object" || !n || n.stepType !== "replaceAround");
}
function ad(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	if (!Ju(t)) return !1;
	let n = t.toJSON();
	return !(typeof n != "object" || !n || n.stepType !== "replace");
}
function od(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e, n = Number.isInteger(t.openStart) && t.openStart >= 0, r = Number.isInteger(t.openEnd) && t.openEnd >= 0, i = typeof t.size == "number" && typeof t.eq == "function" && typeof t.toJSON == "function";
	if (!n || !r || !i) return !1;
	let a = t.content;
	return !(typeof a != "object" || !a || !ed(a));
}
function sd(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e, n = t.doc !== null && typeof t.doc == "object" && t.failed === null, r = typeof t.failed == "string" && t.doc === null;
	return !(!n && !r);
}
var cd = class e {
	constructor(e) {
		this.position = e;
	}
	static fromJSON(t) {
		return new e(t.position);
	}
	toJSON() {
		return { position: this.position };
	}
};
function ld(e, t) {
	let n = t.mapping.mapResult(e.position);
	return {
		position: new cd(n.pos),
		mapResult: n
	};
}
function ud(e) {
	return new cd(e);
}
function dd(e, t, n) {
	let r = e.state.doc.content.size, i = ol(t, 0, r), a = ol(n, 0, r), o = e.coordsAtPos(i), s = e.coordsAtPos(a, -1), c = Math.min(o.top, s.top), l = Math.max(o.bottom, s.bottom), u = Math.min(o.left, s.left), d = Math.max(o.right, s.right), f = {
		top: c,
		bottom: l,
		left: u,
		right: d,
		width: d - u,
		height: l - c,
		x: u,
		y: c
	};
	return {
		...f,
		toJSON: () => f
	};
}
function fd({ json: e, validMarks: t, validNodes: n, options: r, rewrittenContent: i = [] }) {
	return e.marks && Array.isArray(e.marks) && (e.marks = e.marks.filter((e) => {
		if (e == null) return !1;
		let n = typeof e == "string" ? e : e.type;
		return t.has(n) ? !0 : (i.push({
			original: JSON.parse(JSON.stringify(e)),
			unsupported: n
		}), !1);
	})), e.content && Array.isArray(e.content) && (e.content = e.content.map((e) => e == null ? null : fd({
		json: e,
		validMarks: t,
		validNodes: n,
		options: r,
		rewrittenContent: i
	}).json).filter((e) => e != null)), e.type && !n.has(e.type) ? (i.push({
		original: JSON.parse(JSON.stringify(e)),
		unsupported: e.type
	}), e.content && Array.isArray(e.content) && r?.fallbackToParagraph !== !1 ? (e.type = "paragraph", {
		json: e,
		rewrittenContent: i
	}) : {
		json: null,
		rewrittenContent: i
	}) : {
		json: e,
		rewrittenContent: i
	};
}
function pd(e, t, n) {
	return fd({
		json: e,
		validNodes: new Set(Object.keys(t.nodes)),
		validMarks: new Set(Object.keys(t.marks)),
		options: n
	});
}
function md(e, t, n) {
	let { selection: r } = t, i = null;
	if (al(r) && (i = r.$cursor), i) {
		let t = e.storedMarks ?? i.marks();
		return i.parent.type.allowsMarkType(n) && (!!n.isInSet(t) || !t.some((e) => e.type.excludes(n)));
	}
	let { ranges: a } = r;
	return a.some(({ $from: t, $to: r }) => {
		let i = t.depth === 0 && e.doc.inlineContent && e.doc.type.allowsMarkType(n);
		return e.doc.nodesBetween(t.pos, r.pos, (e, t, r) => {
			if (i) return !1;
			if (e.isInline) {
				let t = !r || r.type.allowsMarkType(n), a = !!n.isInSet(e.marks) || !e.marks.some((e) => e.type.excludes(n));
				i = t && a;
			}
			return !i;
		}), i;
	});
}
var hd = (e, t = {}) => ({ tr: n, state: r, dispatch: i }) => {
	let { selection: a } = n, { empty: o, ranges: s } = a, c = nl(e, r.schema);
	if (i) {
		if (o) {
			let e = Zl(r, c);
			n.addStoredMark(c.create({
				...e,
				...t
			}));
		} else s.forEach((e) => {
			let i = e.$from.pos, a = e.$to.pos;
			r.doc.nodesBetween(i, a, (e, r) => {
				let o = Math.max(r, i), s = Math.min(r + e.nodeSize, a);
				e.marks.find((e) => e.type === c) ? e.marks.forEach((e) => {
					c === e.type && n.addMark(o, s, c.create({
						...e.attrs,
						...t
					}));
				}) : n.addMark(o, s, c.create(t));
			});
		});
	}
	return md(r, n, c);
}, gd = (e, t) => ({ tr: n }) => (n.setMeta(e, t), !0), _d = (e, t = {}) => ({ state: n, dispatch: r, chain: i }) => {
	let a = B(e, n.schema), o;
	return n.selection.$anchor.sameParent(n.selection.$head) && (o = n.selection.$anchor.parent.attrs), a.isTextblock ? i().command(({ commands: e }) => vr(a, {
		...o,
		...t
	})(n) ? !0 : e.clearNodes()).command(({ state: e }) => vr(a, {
		...o,
		...t
	})(e, r)).run() : (console.warn("[tiptap warn]: Currently \"setNode()\" only supports text block nodes."), !1);
}, vd = (e) => ({ tr: t, dispatch: n }) => {
	if (n) {
		let { doc: n } = t, r = ol(e, 0, n.content.size), i = A.create(n, r);
		t.setSelection(i);
	}
	return !0;
}, yd = (e, t) => ({ tr: n, state: r, dispatch: i }) => {
	let { selection: a } = r, o, s;
	return typeof t == "number" ? (o = t, s = t) : t && "from" in t && "to" in t ? (o = t.from, s = t.to) : (o = a.from, s = a.to), i && n.doc.nodesBetween(o, s, (t, r) => {
		t.isText || n.setNodeMarkup(r, void 0, {
			...t.attrs,
			dir: e
		});
	}), !0;
}, bd = (e) => ({ tr: t, dispatch: n }) => {
	if (n) {
		let { doc: n } = t, { from: r, to: i } = typeof e == "number" ? {
			from: e,
			to: e
		} : e, a = k.atStart(n).from, o = k.atEnd(n).to, s = ol(r, a, o), c = ol(i, a, o), l = k.create(n, s, c);
		t.setSelection(l);
	}
	return !0;
}, xd = (e) => ({ state: t, dispatch: n }) => Yr(B(e, t.schema))(t, n);
function Sd(e, t) {
	let n = e.storedMarks || e.selection.$to.parentOffset && e.selection.$from.marks();
	if (n) {
		let r = n.filter((e) => t?.includes(e.type.name));
		e.tr.ensureMarks(r);
	}
}
var Cd = ({ keepMarks: e = !0 } = {}) => ({ tr: t, state: n, dispatch: r, editor: i }) => {
	let { selection: a, doc: o } = t, { $from: s, $to: c } = a, l = i.extensionManager.attributes, u = Lu(l, s.node().type.name, s.node().attrs);
	if (a instanceof A && a.node.isBlock) return !s.parentOffset || !Vt(o, s.pos) ? !1 : (r && (e && Sd(n, i.extensionManager.splittableMarks), t.split(s.pos).scrollIntoView()), !0);
	if (!s.parent.isBlock) return !1;
	let d = c.parentOffset === c.parent.content.size, f = s.depth === 0 ? void 0 : xl(s.node(-1).contentMatchAt(s.indexAfter(-1))), p = d && f ? [{
		type: f,
		attrs: u
	}] : void 0, m = Vt(t.doc, t.mapping.map(s.pos), 1, p);
	if (!p && !m && Vt(t.doc, t.mapping.map(s.pos), 1, f ? [{ type: f }] : void 0) && (m = !0, p = f ? [{
		type: f,
		attrs: u
	}] : void 0), r) {
		if (m && (a instanceof k && t.deleteSelection(), t.split(t.mapping.map(s.pos), 1, p), f && !d && !s.parentOffset && s.parent.type !== f)) {
			let e = t.mapping.map(s.before()), n = t.doc.resolve(e);
			s.node(-1).canReplaceWith(n.index(), n.index() + 1, f) && t.setNodeMarkup(t.mapping.map(s.before()), f);
		}
		e && Sd(n, i.extensionManager.splittableMarks), t.scrollIntoView();
	}
	return m;
}, wd = (e, t = {}) => ({ tr: n, state: r, dispatch: i, editor: a }) => {
	let o = B(e, r.schema), { $from: s, $to: c } = r.selection, u = r.selection.node;
	if (u && u.isBlock || s.depth < 2 || !s.sameParent(c)) return !1;
	let d = s.node(-1);
	if (d.type !== o) return !1;
	let f = a.extensionManager.attributes;
	if (s.parent.content.size === 0 && s.node(-1).childCount === s.indexAfter(-1)) {
		if (s.depth === 2 || s.node(-3).type !== o || s.index(-2) !== s.node(-2).childCount - 1) return !1;
		if (i) {
			let e = l.empty, r = s.index(-1) ? 1 : s.index(-2) ? 2 : 3;
			for (let t = s.depth - r; t >= s.depth - 3; --t) e = l.from(s.node(t).copy(e));
			let i = s.indexAfter(-1) < s.node(-2).childCount ? 1 : s.indexAfter(-2) < s.node(-3).childCount ? 2 : 3, a = {
				...Lu(f, s.node().type.name, s.node().attrs),
				...t
			}, c = o.contentMatch.defaultType?.createAndFill(a) || void 0;
			e = e.append(l.from(o.createAndFill(null, c) || void 0));
			let u = s.before(s.depth - (r - 1));
			n.replace(u, s.after(-i), new h(e, 4 - r, 0));
			let d = -1;
			n.doc.nodesBetween(u, n.doc.content.size, (e, t) => {
				if (d > -1) return !1;
				e.isTextblock && e.content.size === 0 && (d = t + 1);
			}), d > -1 && n.setSelection(k.near(n.doc.resolve(d))), n.scrollIntoView();
		}
		return !0;
	}
	let p = c.pos === s.end() ? d.contentMatchAt(0).defaultType : null, m = {
		...Lu(f, d.type.name, d.attrs),
		...t
	}, g = {
		...Lu(f, s.node().type.name, s.node().attrs),
		...t
	};
	n.delete(s.pos, c.pos);
	let _ = p ? [{
		type: o,
		attrs: m
	}, {
		type: p,
		attrs: g
	}] : [{
		type: o,
		attrs: m
	}];
	if (!Vt(n.doc, s.pos, 2)) return !1;
	if (i) {
		let { selection: e, storedMarks: t } = r, { splittableMarks: o } = a.extensionManager, c = t || e.$to.parentOffset && e.$from.marks();
		if (n.split(s.pos, 2, _).scrollIntoView(), !c || !i) return !0;
		let l = c.filter((e) => o.includes(e.type.name));
		n.ensureMarks(l);
	}
	return !0;
};
function Td(e) {
	return !e || e === "1" ? null : e;
}
function Ed(e, t) {
	return Td(e) === Td(t);
}
var Dd = (e, t) => {
	let n = nu((e) => e.type === t)(e.selection);
	if (!n) return !0;
	let r = e.doc.resolve(Math.max(0, n.pos - 1)).before(n.depth);
	if (r === void 0) return !0;
	let i = e.doc.nodeAt(r);
	return !(n.node.type === i?.type && Ut(e.doc, n.pos)) || !Ed(n.node.attrs.type, i?.attrs.type) || e.join(n.pos), !0;
}, Od = (e, t) => {
	let n = nu((e) => e.type === t)(e.selection);
	if (!n) return !0;
	let r = e.doc.resolve(n.start).after(n.depth);
	if (r === void 0) return !0;
	let i = e.doc.nodeAt(r);
	return !(n.node.type === i?.type && Ut(e.doc, r)) || !Ed(n.node.attrs.type, i?.attrs.type) || e.join(r), !0;
};
function kd(e) {
	let t = e.doc, n = t.firstChild;
	if (!n) return null;
	let r = t.resolve(1), i = t.resolve(n.nodeSize - 1);
	return k.between(r, i);
}
var Ad = (e, t, n, r = {}) => ({ editor: i, tr: a, state: o, dispatch: s, chain: c, commands: l, can: u }) => {
	let { extensions: d, splittableMarks: f } = i.extensionManager, p = B(e, o.schema), m = B(t, o.schema), { selection: h, storedMarks: g } = o, { $from: _, $to: v } = h, y = _.blockRange(v), b = g || h.$to.parentOffset && h.$from.marks();
	if (!y) return !1;
	let x = nu((e) => Wu(e.type.name, d))(h), S = h.from === 0 && h.to === o.doc.content.size, C = o.doc.content.content, w = C.length === 1 ? C[0] : null, T = S && w && Wu(w.type.name, d) ? {
		node: w,
		pos: 0,
		depth: 0
	} : null, ee = x ?? T, te = !!x && y.depth >= 1 && y.depth - x.depth <= 1, ne = !!T;
	if ((te || ne) && ee) {
		if (ee.node.type === p) return S && ne ? c().command(({ tr: e, dispatch: t }) => {
			let n = kd(e);
			return n ? (e.setSelection(n), t && t(e), !0) : !1;
		}).liftListItem(m).run() : l.liftListItem(m);
		if (Wu(ee.node.type.name, d) && p.validContent(ee.node.content)) return c().command(() => (a.setNodeMarkup(ee.pos, p), !0)).command(() => Dd(a, p)).command(() => Od(a, p)).run();
	}
	return !n || !b || !s ? c().command(() => u().wrapInList(p, r) ? !0 : l.clearNodes()).wrapInList(p, r).command(() => Dd(a, p)).command(() => Od(a, p)).run() : c().command(() => {
		let e = u().wrapInList(p, r), t = b.filter((e) => f.includes(e.type.name));
		return a.ensureMarks(t), e ? !0 : l.clearNodes();
	}).wrapInList(p, r).command(() => Dd(a, p)).command(() => Od(a, p)).run();
}, jd = (e, t = {}, n = {}) => ({ state: r, commands: i }) => {
	let { extendEmptyMarkRange: a = !1 } = n, o = nl(e, r.schema);
	return zu(r, o, t) ? i.unsetMark(o, { extendEmptyMarkRange: a }) : i.setMark(o, t);
}, Md = (e, t, n = {}) => ({ state: r, commands: i }) => {
	let a = B(e, r.schema), o = B(t, r.schema), s = Pl(r, a, n), c;
	return r.selection.$anchor.sameParent(r.selection.$head) && (c = r.selection.$anchor.parent.attrs), s ? i.setNode(o, c) : i.setNode(a, {
		...c,
		...n
	});
}, Nd = (e, t = {}) => ({ state: n, commands: r }) => {
	let i = B(e, n.schema);
	return Pl(n, i, t) ? r.lift(i) : r.wrapIn(i, t);
}, Pd = () => ({ state: e, dispatch: t }) => {
	let n = e.plugins;
	for (let r = 0; r < n.length; r += 1) {
		let i = n[r], a;
		if (i.spec.isInputRules && (a = i.getState(e))) {
			if (t) {
				let t = e.tr, n = a.transform;
				for (let e = n.steps.length - 1; e >= 0; --e) t.step(n.steps[e].invert(n.docs[e]));
				if (a.text) {
					let n = t.doc.resolve(a.from).marks();
					t.replaceWith(a.from, a.to, e.schema.text(a.text, n));
				} else t.delete(a.from, a.to);
			}
			return !0;
		}
	}
	return !1;
}, Fd = (e = {}) => ({ tr: t, dispatch: n, editor: r }) => {
	let { ignoreClearable: i = !1 } = e, { selection: a } = t, { empty: o, ranges: s } = a;
	if (o) return !0;
	let { nonClearableMarks: c } = r.extensionManager;
	if (n) {
		let e = Object.values(r.schema.marks).filter((e) => i || !c.includes(e.name));
		s.forEach((n) => {
			for (let r of e) t.removeMark(n.$from.pos, n.$to.pos, r);
		});
	}
	return !0;
}, Id = (e, t = {}) => ({ tr: n, state: r, dispatch: i }) => {
	let { extendEmptyMarkRange: a = !1 } = t, { selection: o } = n, s = nl(e, r.schema), { $from: c, empty: l, ranges: u } = o;
	if (!i) return !0;
	if (l && a) {
		let { from: e, to: t } = o, r = tl(c, s, c.marks().find((e) => e.type === s)?.attrs);
		r && (e = r.from, t = r.to), n.removeMark(e, t, s);
	} else u.forEach((e) => {
		n.removeMark(e.$from.pos, e.$to.pos, s);
	});
	return n.removeStoredMark(s), !0;
}, Ld = (e) => ({ tr: t, state: n, dispatch: r }) => {
	let { selection: i } = n, a, o;
	return typeof e == "number" ? (a = e, o = e) : e && "from" in e && "to" in e ? (a = e.from, o = e.to) : (a = i.from, o = i.to), r && t.doc.nodesBetween(a, o, (e, n) => {
		if (e.isText) return;
		let r = { ...e.attrs };
		delete r.dir, t.setNodeMarkup(n, void 0, r);
	}), !0;
}, Rd = (e, t = {}) => ({ tr: n, state: r, dispatch: i }) => {
	let a = null, o = null, s = zl(typeof e == "string" ? e : e.name, r.schema);
	if (!s) return !1;
	s === "node" && (a = B(e, r.schema)), s === "mark" && (o = nl(e, r.schema));
	let c = !1;
	return n.selection.ranges.forEach((e) => {
		let s = e.$from.pos, l = e.$to.pos, u, d, f, p;
		n.selection.empty ? r.doc.nodesBetween(s, l, (e, t) => {
			a && a === e.type && (c = !0, f = Math.max(t, s), p = Math.min(t + e.nodeSize, l), u = t, d = e);
		}) : r.doc.nodesBetween(s, l, (e, r) => {
			r < s && a && a === e.type && (c = !0, f = Math.max(r, s), p = Math.min(r + e.nodeSize, l), u = r, d = e), r >= s && r <= l && (a && a === e.type && (c = !0, i && n.setNodeMarkup(r, void 0, {
				...e.attrs,
				...t
			})), o && e.marks.length && e.marks.forEach((a) => {
				if (o === a.type && (c = !0, i)) {
					let i = Math.max(r, s), c = Math.min(r + e.nodeSize, l);
					n.addMark(i, c, o.create({
						...a.attrs,
						...t
					}));
				}
			}));
		}), d && (u !== void 0 && i && n.setNodeMarkup(u, void 0, {
			...d.attrs,
			...t
		}), o && d.marks.length && d.marks.forEach((e) => {
			o === e.type && i && n.addMark(f, p, o.create({
				...e.attrs,
				...t
			}));
		}));
	}), c;
}, zd = new M("__tiptap_decorations__"), Bd = (e) => ({ tr: t, dispatch: n }) => (n && t.setMeta(zd, {
	type: "force",
	name: e
}), !0), Vd = (e, t = {}) => ({ state: n, dispatch: r }) => _r(B(e, n.schema), t)(n, r), Hd = (e, t = {}) => ({ state: n, dispatch: r }) => Vr(B(e, n.schema), t)(n, r), Ud = /* @__PURE__ */ r({
	blur: () => Ic,
	clearContent: () => Lc,
	clearNodes: () => Rc,
	command: () => zc,
	createParagraphNear: () => Bc,
	cut: () => Vc,
	deleteCurrentNode: () => Hc,
	deleteNode: () => Uc,
	deleteRange: () => Wc,
	deleteSelection: () => Jc,
	enter: () => Yc,
	exitCode: () => Xc,
	extendMarkRange: () => rl,
	first: () => il,
	focus: () => dl,
	forEach: () => fl,
	insertContent: () => pl,
	insertContentAt: () => bl,
	insertDefaultBlock: () => Sl,
	joinBackward: () => Tl,
	joinDown: () => wl,
	joinForward: () => El,
	joinItemBackward: () => Dl,
	joinItemForward: () => Ol,
	joinTextblockBackward: () => kl,
	joinTextblockForward: () => Al,
	joinUp: () => Cl,
	keyboardShortcut: () => Nl,
	lift: () => Fl,
	liftEmptyBlock: () => Il,
	liftListItem: () => Ll,
	newlineInCode: () => Rl,
	resetAttributes: () => Vl,
	scrollIntoView: () => Hl,
	selectAll: () => Ul,
	selectNodeBackward: () => Wl,
	selectNodeForward: () => Gl,
	selectParentNode: () => Kl,
	selectTextblockEnd: () => ql,
	selectTextblockStart: () => Jl,
	setContent: () => Xl,
	setMark: () => hd,
	setMeta: () => gd,
	setNode: () => _d,
	setNodeSelection: () => vd,
	setTextDirection: () => yd,
	setTextSelection: () => bd,
	sinkListItem: () => xd,
	splitBlock: () => Cd,
	splitListItem: () => wd,
	toggleList: () => Ad,
	toggleMark: () => jd,
	toggleNode: () => Md,
	toggleWrap: () => Nd,
	undoInputRule: () => Pd,
	unsetAllMarks: () => Fd,
	unsetMark: () => Id,
	unsetTextDirection: () => Ld,
	updateAttributes: () => Rd,
	updateDecorations: () => Bd,
	wrapIn: () => Vd,
	wrapInList: () => Hd
}), Wd = /* @__PURE__ */ new WeakMap();
function Gd(e, t) {
	Wd.set(e, (Wd.get(e) ?? 0) + 1);
	try {
		return t();
	} finally {
		let t = (Wd.get(e) ?? 1) - 1;
		t > 0 ? Wd.set(e, t) : Wd.delete(e);
	}
}
function Kd(e) {
	return Wd.has(e);
}
var qd = class {
	constructor() {
		this.callbacks = {};
	}
	on(e, t) {
		return this.callbacks[e] || (this.callbacks[e] = []), this.callbacks[e].push(t), this;
	}
	emit(e, ...t) {
		let n = this.callbacks[e];
		return n && n.forEach((e) => e.apply(this, t)), this;
	}
	off(e, t) {
		let n = this.callbacks[e];
		return n && (t ? this.callbacks[e] = n.filter((e) => e !== t) : delete this.callbacks[e]), this;
	}
	once(e, t) {
		let n = (...r) => {
			this.off(e, n), t.apply(this, r);
		};
		return this.on(e, n);
	}
	removeAllListeners() {
		this.callbacks = {};
	}
}, Jd = typeof process < "u" && process.env.NODE_ENV !== "production";
function Yd(e) {
	return e.kind === "widget";
}
function Xd(e, t) {
	let n = [], r = /* @__PURE__ */ new Set();
	for (let i of e) i.kind === "widget" && Yd(i) && r.add(i.key), n.push(i.toPMDecoration(t));
	return {
		decorations: n,
		widgetKeys: r
	};
}
function Zd(e, t, n) {
	let { decorations: r, widgetKeys: i } = Xd(t, n);
	return {
		set: L.create(e, r),
		widgetKeys: i
	};
}
function Qd({ position: e, from: t, to: n, docSize: r }) {
	return e < t ? !1 : e < n || e === n && n === r;
}
function $d({ decorations: e, from: t, to: n, docSize: r, extensionName: i, warnedExtensions: a }) {
	return e.filter((e) => Qd({
		position: e.anchor,
		from: t,
		to: n,
		docSize: r
	}) ? !0 : (e.anchor === n || a.has(i) || (a.add(i), console.warn(`[tiptap warn]: Extension "${i}" returned a decoration outside the requested range [${t}, ${n}). It was ignored.`)), !1));
}
function ef(e) {
	let t = e.spec?.key;
	return typeof t == "string" ? t : void 0;
}
function tf(e) {
	let t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map();
	for (let r of e.find()) {
		let e = ef(r);
		if (!e) continue;
		let i = r.spec.extensionName ?? "unknown", a = t.get(e) ?? /* @__PURE__ */ new Set();
		a.add(i), t.set(e, a), n.set(e, (n.get(e) ?? 0) + 1);
	}
	return Array.from(t, ([e, t]) => ({
		key: e,
		extensions: t
	})).filter(({ key: e }) => (n.get(e) ?? 0) > 1);
}
function nf(e) {
	return e.jsonID === "attr";
}
function rf(e) {
	let t = !1;
	if (e.getMap().forEach(() => {
		t = !0;
	}), t || nf(e)) return !0;
	let n = e;
	return typeof n.from == "number" && typeof n.to == "number";
}
function af(e, t) {
	let n = null, r = 0, i = 0;
	for (let a = 0; a < e.childCount && !(i > t.to); a += 1) {
		let o = i + e.child(a).nodeSize;
		o >= t.from && (n === null && (n = i), r = o), i = o;
	}
	return n === null ? null : {
		from: n,
		to: r
	};
}
function of(e, t) {
	if (e.steps.some((e) => !rf(e))) return { type: "full" };
	let n = ju(e).map(({ newRange: e }) => e);
	e.steps.forEach((t, r) => {
		if (!nf(t)) return;
		let i = e.mapping.slice(r);
		n.push({
			from: i.map(t.pos, -1),
			to: i.map(t.pos + 1)
		});
	});
	let r = [];
	for (let e of n) {
		let n = af(t, e);
		n && r.push(n);
	}
	r.sort((e, t) => e.from - t.from);
	let i = [];
	for (let e of r) {
		let t = i[i.length - 1];
		t && e.from <= t.to ? t.to = Math.max(t.to, e.to) : i.push({ ...e });
	}
	return {
		type: "ranges",
		ranges: i
	};
}
function sf(e, t, n, r) {
	return e.map(t, n, { onRemove: (e) => {
		let t = e?.key;
		typeof t == "string" && r.delete(t);
	} });
}
function cf(e, t, n) {
	let r = t.decorationSetsByExtension[e] ?? L.empty, i = new Set(t.widgetKeysByExtension[e] ?? []);
	return {
		set: sf(r, n.mapping, n.doc, i),
		widgetKeys: i
	};
}
function lf(e, t) {
	let n = Object.values(t).flatMap((e) => e.find());
	return L.create(e, n);
}
function uf(e) {
	let t = /* @__PURE__ */ new Set();
	for (let n of Object.values(e)) for (let e of n) t.add(e);
	return t;
}
function df(e, t) {
	switch (t.update ?? "document") {
		case "document":
			if (t.createInRange) throw Error(`[tiptap error]: Extension "${e}" provides createInRange() but does not use the "changedRanges" decoration update strategy.`);
			return;
		case "changedRanges":
			if (!t.createInRange) throw Error(`[tiptap error]: Extension "${e}" uses the "changedRanges" decoration update strategy but does not provide createInRange().`);
			return;
		case "manual":
			if (t.createInRange) throw Error(`[tiptap error]: Extension "${e}" uses the "manual" decoration update strategy, which is not compatible with createInRange(). createInRange() requires the "changedRanges" strategy.`);
			if (t.shouldUpdate) throw Error(`[tiptap error]: Extension "${e}" cannot combine the "manual" decoration update strategy with shouldUpdate().`);
			return;
		default: throw Error(`[tiptap error]: Extension "${e}" uses an unknown decoration update strategy. Expected "document", "changedRanges", or "manual".`);
	}
}
function ff(e, t, n) {
	return n ? !0 : e.update === "manual" ? !1 : e.shouldUpdate ? e.shouldUpdate(t) : t.tr.docChanged;
}
var pf = /* @__PURE__ */ new Set();
function mf(e) {
	var t;
	return ((t = e.extensionManager) == null || (t = t.decorationManager) == null ? void 0 : t.liveWidgetKeys()) ?? pf;
}
var hf = class {
	constructor(e) {
		this.warnedWidgetKeys = /* @__PURE__ */ new Set(), this.warnedOutOfRangeExtensions = /* @__PURE__ */ new Set(), this.handleBeforeTransaction = ({ nextState: e }) => {
			let t = zd.getState(e);
			t && this.warnDuplicateWidgetKeys(t);
		}, this.editor = e.editor, this.entries = this.resolveEntries(e.entries), this.entries.forEach(({ name: e, spec: t }) => df(e, t)), this.plugin = this.entries.length > 0 ? this.createPlugin() : null, this.editor.on("beforeTransaction", this.handleBeforeTransaction);
	}
	destroy() {
		this.editor.off("beforeTransaction", this.handleBeforeTransaction);
	}
	liveWidgetKeys() {
		return zd.getState(this.editor.state)?.widgetKeys ?? pf;
	}
	get mountedView() {
		return this.editor.isDestroyed ? null : this.editor.view;
	}
	resolveEntries(e) {
		let t = [];
		for (let { name: n, addDecorations: r } of e) {
			let e = r();
			e && t.push({
				name: n,
				spec: e
			});
		}
		return t;
	}
	createPlugin() {
		let { editor: e, entries: t } = this;
		return new j({
			key: zd,
			state: {
				init: (e, n) => {
					let r = {}, i = {};
					for (let { name: e, spec: a } of t) {
						let { set: t, widgetKeys: o } = this.buildFullSet(e, a, n);
						r[e] = t, i[e] = o;
					}
					let a = {
						decorationSetsByExtension: r,
						widgetKeysByExtension: i,
						mergedDecorationSet: this.buildMergedSet(n.doc, r),
						widgetKeys: uf(i)
					};
					return this.warnDuplicateWidgetKeys(a), a;
				},
				apply: (n, r, i, a) => {
					let o = n.getMeta(zd), s = o?.type === "force" && !o.name, c = o?.type === "force" ? o.name : void 0, l = {}, u = {}, d = /* @__PURE__ */ new Set();
					return Gd(e, () => {
						for (let { name: o, spec: f } of t) {
							let t = s || c === o;
							if (!ff(f, {
								editor: e,
								tr: n,
								oldState: i,
								newState: a
							}, t)) {
								let e = cf(o, r, n);
								l[o] = e.set, u[o] = e.widgetKeys;
							} else if (f.update === "changedRanges" && n.docChanged && !t) {
								let e = this.applyChangedRangesRecompute(o, f, r, n, a);
								l[o] = e.set, u[o] = e.widgetKeys, d.add(o);
							} else {
								let { set: e, widgetKeys: t } = this.buildFullSet(o, f, a);
								l[o] = e, u[o] = t, d.add(o);
							}
						}
					}), d.size === 0 && !n.docChanged ? r : {
						decorationSetsByExtension: l,
						widgetKeysByExtension: u,
						mergedDecorationSet: this.mergeAfterApply({
							entries: t,
							previous: r,
							tr: n,
							decorationSetsByExtension: l,
							recomputedNames: d
						}),
						widgetKeys: uf(u)
					};
				}
			},
			props: { decorations(e) {
				return zd.getState(e)?.mergedDecorationSet ?? L.empty;
			} }
		});
	}
	applyChangedRangesRecompute(e, t, n, r, i) {
		let a = of(r, i.doc);
		return a.type === "full" ? this.buildFullSet(e, t, i) : this.rebuildRanges(e, t, n, r, i, a.ranges);
	}
	rebuildRanges(e, t, n, r, i, a) {
		let o = n.decorationSetsByExtension[e] ?? L.empty, s = new Set(n.widgetKeysByExtension[e] ?? []), c = sf(o, r.mapping, r.doc, s), l = i.doc.content.size;
		for (let { from: n, to: r } of a) {
			let a = c.find(n, r).filter((e) => Qd({
				position: e.from,
				from: n,
				to: r,
				docSize: l
			}));
			for (let e of a) {
				let t = ef(e);
				t && s.delete(t);
			}
			c = c.remove(a);
			let { decorations: o, widgetKeys: u } = Xd($d({
				decorations: this.runCreate(e, "createInRange", () => t.createInRange({
					editor: this.editor,
					state: i,
					view: this.mountedView,
					from: n,
					to: r
				})),
				from: n,
				to: r,
				docSize: l,
				extensionName: e,
				warnedExtensions: this.warnedOutOfRangeExtensions
			}), e);
			c = c.add(i.doc, o);
			for (let e of u) s.add(e);
		}
		return {
			set: c,
			widgetKeys: s
		};
	}
	buildFullSet(e, t, n) {
		let r = this.runCreate(e, "create", () => t.create({
			editor: this.editor,
			state: n,
			view: this.mountedView
		}));
		return Zd(n.doc, r, e);
	}
	runCreate(e, t, n) {
		try {
			return n();
		} catch (n) {
			return console.error(`[tiptap error]: Extension "${e}" threw in \`addDecorations().${t}()\`. Its decorations were dropped for this update.`, n), [];
		}
	}
	warnDuplicateWidgetKeys(e) {
		if (!Jd) return;
		if (e.widgetKeys.size === 0) {
			this.warnedWidgetKeys.clear();
			return;
		}
		let t = tf(e.mergedDecorationSet), n = new Set(t.map(({ key: e }) => e));
		for (let { key: e, extensions: n } of t) {
			if (this.warnedWidgetKeys.has(e)) continue;
			let t = Array.from(n).map((e) => `"${e}"`).join(", ");
			console.warn(`[tiptap warn]: Duplicate widget decoration key "${e}" in extension${n.size === 1 ? "" : "s"} ${t}. Widget decoration keys must be globally unique, otherwise ProseMirror misplaces the widget DOM. Use a stable, unique key (e.g. \`comment-\${id}\`).`);
		}
		this.warnedWidgetKeys = n;
	}
	buildMergedSet(e, t) {
		let n = Object.keys(t);
		return n.length === 1 ? t[n[0]] : lf(e, t);
	}
	mergeAfterApply({ entries: e, previous: t, tr: n, decorationSetsByExtension: r, recomputedNames: i }) {
		return e.length === 1 ? r[e[0].name] : i.size === 0 ? t.mergedDecorationSet.map(n.mapping, n.doc) : lf(n.doc, r);
	}
};
function gf(e, t) {
	if (e === t) return !0;
	if (!e || !t) return !1;
	let n = Object.keys(e), r = Object.keys(t);
	return n.length === r.length && n.every((n) => Object.prototype.hasOwnProperty.call(t, n) && Object.is(e[n], t[n]));
}
function _f(e, t) {
	let { selection: n } = e, { $from: r } = n;
	if (n instanceof A) {
		let e = r.index();
		return r.parent.canReplaceWith(e, e + 1, t);
	}
	let i = r.depth;
	for (; i >= 0;) {
		let e = r.index(i);
		if (r.node(i).contentMatchAt(e).matchType(t)) return !0;
		--i;
	}
	return !1;
}
function vf(e, t, n) {
	let r = document.querySelector(`style[data-tiptap-style${n ? `-${n}` : ""}]`);
	if (r !== null) return r;
	let i = document.createElement("style");
	return t && i.setAttribute("nonce", t), i.setAttribute(`data-tiptap-style${n ? `-${n}` : ""}`, ""), i.innerHTML = e, document.getElementsByTagName("head")[0].appendChild(i), i;
}
function yf(e) {
	return e.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}
function bf(e, t) {
	let n = e.getAttribute("style");
	if (!n) return null;
	let r = n.split(";").map((e) => e.trim()).filter(Boolean), i = t.toLowerCase();
	for (let e = r.length - 1; e >= 0; --e) {
		let t = r[e], n = t.indexOf(":");
		if (n !== -1 && t.slice(0, n).trim().toLowerCase() === i) return t.slice(n + 1).trim();
	}
	return null;
}
function xf(e) {
	return e.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&amp;/g, "&");
}
function Sf(e) {
	return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Cf() {
	return typeof navigator < "u" && /Firefox/.test(navigator.userAgent);
}
function wf(e) {
	return typeof e == "number";
}
function Tf(e) {
	return Object.prototype.toString.call(e).slice(8, -1);
}
function Ef(e) {
	return Tf(e) === "Object" && e.constructor === Object && Object.getPrototypeOf(e) === Object.prototype;
}
function Df(e) {
	return typeof e == "string";
}
function Of(e) {
	return /\s/.test(e);
}
function kf(e) {
	return /^[a-zA-Z]$/.test(e);
}
function Af(e) {
	return /^\w$/.test(e);
}
function jf(e, t) {
	for (; t < e.length && Of(e[t]);) t += 1;
	return t;
}
function Mf(e, t) {
	for (; t < e.length && !Of(e[t]);) t += 1;
	return t;
}
function Nf(e, t, n) {
	for (; t < e.length && (Af(e[t]) || n && e[t] === "-");) t += 1;
	return t;
}
function Pf(e, t) {
	let n = e[t], r = t + 1, i = Nf(e, r, !0);
	return i === r ? { nextIndex: Mf(e, i) } : {
		token: {
			type: n === "." ? "class" : "id",
			name: e.slice(r, i)
		},
		nextIndex: Mf(e, i)
	};
}
function Ff(e, t) {
	let n = e.indexOf(e[t], t + 1);
	return { nextIndex: Mf(e, n === -1 ? t : n + 1) };
}
function If(e, t, n, r) {
	let i = r ? jf(e, n) : n;
	if (e[i] !== "=") return;
	i = r ? jf(e, i + 1) : i + 1;
	let a = e[i];
	if (a !== "\"" && a !== "'") return;
	let o = e.indexOf(a, i + 1);
	if (o !== -1) return {
		token: {
			type: "keyValue",
			name: t,
			value: e.slice(i + 1, o)
		},
		nextIndex: Mf(e, o + 1)
	};
}
function Lf(e, t, n) {
	let r = n === "pandoc", i = Nf(e, t + 1, r), a = e.slice(t, i), o = If(e, a, i, r);
	if (o) return o;
	let s = i === e.length || Of(e[i]);
	return {
		token: r && s ? {
			type: "boolean",
			name: a
		} : void 0,
		nextIndex: n === "shortcode" ? Mf(e, i) : i
	};
}
function Rf(e, t, n) {
	let r = e[t];
	return n === "pandoc" && (r === "." || r === "#") ? Pf(e, t) : r === "\"" || r === "'" ? Ff(e, t) : (n === "pandoc" ? kf(r) : Af(r)) ? Lf(e, t, n) : { nextIndex: Mf(e, t) };
}
function zf(e, t) {
	let n = [], r = 0;
	for (; r < e.length && (r = jf(e, r), !(r >= e.length));) {
		let i = Rf(e, r, t);
		i.token && n.push(i.token), r = i.nextIndex;
	}
	return n;
}
function Bf(e) {
	let t = {}, n = e.filter((e) => e.type === "class").map((e) => e.name), r = e.find((e) => e.type === "id");
	return n.length > 0 && (t.class = n.join(" ")), r && (t.id = r.name), e.forEach((e) => {
		e.type === "keyValue" && (t[e.name] = e.value);
	}), e.forEach((e) => {
		e.type === "boolean" && (t[e.name] = !0);
	}), t;
}
function Vf(e) {
	return e?.trim() ? Bf(zf(e, "pandoc")) : {};
}
function Hf(e) {
	if (!e || Object.keys(e).length === 0) return "";
	let t = [];
	return e.class && String(e.class).split(/\s+/).filter(Boolean).forEach((e) => t.push(`.${e}`)), e.id && t.push(`#${e.id}`), Object.entries(e).forEach(([e, n]) => {
		e !== "class" && e !== "id" && (n === !0 ? t.push(e) : n !== !1 && n != null && t.push(`${e}="${String(n)}"`));
	}), t.join(" ");
}
function Uf(e) {
	let { nodeName: t, name: n, parseAttributes: r = Vf, serializeAttributes: i = Hf, defaultAttributes: a = {}, requiredAttributes: o = [], allowedAttributes: s } = e, c = n || t, l = (e) => {
		if (!s) return e;
		let t = {};
		return s.forEach((n) => {
			n in e && (t[n] = e[n]);
		}), t;
	};
	return {
		parseMarkdown: (e, n) => {
			let r = {
				...a,
				...e.attributes
			};
			return n.createNode(t, r, []);
		},
		markdownTokenizer: {
			name: t,
			level: "block",
			start(e) {
				let t = RegExp(`^:::${c}(?:\\s|$)`, "m"), n = e.match(t)?.index;
				return n === void 0 ? -1 : n;
			},
			tokenize(e, n, i) {
				let a = RegExp(`^:::${c}(?:\\s+\\{([^}]*)\\})?\\s*:::(?:\\n|$)`), s = e.match(a);
				if (!s) return;
				let l = s[1] || "", u = r(l);
				if (!o.find((e) => !(e in u))) return {
					type: t,
					raw: s[0],
					attributes: u
				};
			}
		},
		renderMarkdown: (e) => {
			let t = l(e.attrs || {}), n = i(t), r = n ? ` {${n}}` : "";
			return `:::${c}${r} :::`;
		}
	};
}
function Wf(e) {
	let { nodeName: t, name: n, getContent: r, parseAttributes: i = Vf, serializeAttributes: a = Hf, defaultAttributes: o = {}, content: s = "block", allowedAttributes: c } = e, l = n || t, u = (e) => {
		if (!c) return e;
		let t = {};
		return c.forEach((n) => {
			n in e && (t[n] = e[n]);
		}), t;
	};
	return {
		parseMarkdown: (e, n) => {
			let i;
			if (r) {
				let t = r(e);
				i = typeof t == "string" ? [{
					type: "text",
					text: t
				}] : t;
			} else i = s === "block" ? n.parseChildren(e.tokens || []) : n.parseInline(e.tokens || []);
			let a = {
				...o,
				...e.attributes
			};
			return n.createNode(t, a, i);
		},
		markdownTokenizer: {
			name: t,
			level: "block",
			start(e) {
				let t = RegExp(`^:::${l}`, "m"), n = e.match(t)?.index;
				return n === void 0 ? -1 : n;
			},
			tokenize(e, n, r) {
				let a = RegExp(`^:::${l}(?:\\s+\\{([^}]*)\\})?\\s*\\n`), o = e.match(a);
				if (!o) return;
				let [c, u = ""] = o, d = i(u), f = 1, p = c.length, m = "", h = /^:::([\w-]*)(\s.*)?/gm, g = e.slice(p);
				for (h.lastIndex = 0;;) {
					let n = h.exec(g);
					if (n === null) break;
					let i = n.index, a = n[1];
					if (!n[2]?.endsWith(":::")) {
						if (a) f += 1;
						else if (--f, f === 0) {
							let a = g.slice(0, i);
							m = a.trim();
							let o = e.slice(0, p + i + n[0].length), c = [];
							if (m) {
								if (s === "block") for (c = r.blockTokens(a), c.forEach((e) => {
									e.text && (!e.tokens || e.tokens.length === 0) && (e.tokens = r.inlineTokens(e.text));
								}); c.length > 0;) {
									let e = c[c.length - 1];
									if (e.type === "paragraph" && (!e.text || e.text.trim() === "")) c.pop();
									else break;
								}
								else c = r.inlineTokens(m);
							}
							return {
								type: t,
								raw: o,
								attributes: d,
								content: m,
								tokens: c
							};
						}
					}
				}
			}
		},
		renderMarkdown: (e, t) => {
			let n = u(e.attrs || {}), r = a(n), i = r ? ` {${r}}` : "", o = t.renderChildren(e.content || [], "\n\n");
			return `:::${l}${i}\n\n${o}\n\n:::`;
		}
	};
}
function Gf(e) {
	let t = {};
	return zf(e, "shortcode").forEach((e) => {
		e.type === "keyValue" && (t[e.name] = e.value);
	}), t;
}
function Kf(e) {
	return Object.entries(e).filter(([, e]) => e != null).map(([e, t]) => `${e}="${t}"`).join(" ");
}
function qf(e) {
	let { nodeName: t, name: n, getContent: r, parseAttributes: i = Gf, serializeAttributes: a = Kf, defaultAttributes: o = {}, selfClosing: s = !1, allowedAttributes: c } = e, l = n || t, u = (e) => {
		if (!c) return e;
		let t = {};
		return c.forEach((n) => {
			let r = typeof n == "string" ? n : n.name, i = typeof n == "string" ? void 0 : n.skipIfDefault;
			if (r in e) {
				let n = e[r];
				if (i !== void 0 && n === i) return;
				t[r] = n;
			}
		}), t;
	}, d = l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return {
		parseMarkdown: (e, n) => {
			let i = {
				...o,
				...e.attributes
			};
			if (s) return n.createNode(t, i);
			let a = r ? r(e) : e.content || "";
			return a ? n.createNode(t, i, [n.createTextNode(a)]) : n.createNode(t, i, []);
		},
		markdownTokenizer: {
			name: t,
			level: "inline",
			start(e) {
				let t = RegExp(s ? `\\[${d}\\s*[^\\]]*\\]` : `\\[${d}\\s*[^\\]]*\\][\\s\\S]*?\\[\\/${d}\\]`), n = e.match(t)?.index;
				return n === void 0 ? -1 : n;
			},
			tokenize(e, n, r) {
				let a = RegExp(s ? `^\\[${d}\\s*([^\\]]*)\\]` : `^\\[${d}\\s*([^\\]]*)\\]([\\s\\S]*?)\\[\\/${d}\\]`), o = e.match(a);
				if (!o) return;
				let c = "", l = "";
				if (s) {
					let [, e] = o;
					l = e;
				} else {
					let [, e, t] = o;
					l = e, c = t || "";
				}
				let u = i(l.trim());
				return {
					type: t,
					raw: o[0],
					content: c.trim(),
					attributes: u
				};
			}
		},
		renderMarkdown: (e) => {
			let t = "";
			r ? t = r(e) : e.content && e.content.length > 0 && (t = e.content.filter((e) => e.type === "text").map((e) => e.text).join(""));
			let n = u(e.attrs || {}), i = a(n), o = i ? ` ${i}` : "";
			return s ? `[${l}${o}]` : `[${l}${o}]${t}[/${l}]`;
		}
	};
}
function Jf(e, t, n) {
	let r = e.split("\n"), i = [], a = "", o = 0, s = t.baseIndentSize || 2;
	for (; o < r.length;) {
		let e = r[o], u = e.match(t.itemPattern);
		if (!u) {
			if (i.length > 0) break;
			if (e.trim() === "") {
				o += 1, a = `${a}${e}\n`;
				continue;
			}
			return;
		}
		let d = t.extractItemData(u), { indentLevel: f, mainContent: p } = d;
		a = `${a}${e}\n`;
		let m = [p];
		for (o += 1; o < r.length;) {
			var c;
			let e = r[o];
			if (e.trim() === "") {
				var l;
				let t = r.slice(o + 1).findIndex((e) => e.trim() !== "");
				if (t === -1) break;
				if ((((l = r[o + 1 + t].match(/^(\s*)/)) == null || (l = l[1]) == null ? void 0 : l.length) || 0) > f) {
					m.push(e), a = `${a}${e}\n`, o += 1;
					continue;
				}
				break;
			}
			if ((((c = e.match(/^(\s*)/)) == null || (c = c[1]) == null ? void 0 : c.length) || 0) > f) m.push(e), a = `${a}${e}\n`, o += 1;
			else break;
		}
		let h, g = m.slice(1);
		if (g.length > 0) {
			let e = g.map((e) => e.slice(f + s)).join("\n");
			e.trim() && (h = t.customNestedParser ? t.customNestedParser(e) : n.blockTokens(e));
		}
		let _ = t.createToken(d, h);
		i.push(_);
	}
	if (i.length !== 0) return {
		items: i,
		raw: a
	};
}
var Yf = 4;
function Xf(e) {
	let t = 0;
	for (let n of e) t = n === "	" ? t + Yf - t % Yf : t + 1;
	return t;
}
function Zf(e, t, n, r, i) {
	if (!e || !Array.isArray(e.content)) return "";
	let a = typeof n == "function" ? n(r) : n, [o, ...s] = e.content, c = `${a}${t.renderChildren([o])}`;
	return s && s.length > 0 && s.forEach((e, n) => {
		let r = t.renderChild?.call(t, e, n + 1) ?? t.renderChildren([e]);
		if (r != null) {
			let n = (e) => {
				if (!i?.alignNestedToPrefix) return t.indent(e);
				let n = t.indent(""), r = Xf(a);
				return (Xf(n) >= r ? n : " ".repeat(r)) + e;
			}, o = r.split("\n").map((e) => n(e || "")).join("\n");
			c += e.type === "paragraph" ? `\n\n${o}` : `\n${o}`;
		}
	}), c;
}
var Qf = /* @__PURE__ */ r({
	createAtomBlockMarkdownSpec: () => Uf,
	createBlockMarkdownSpec: () => Wf,
	createInlineMarkdownSpec: () => qf,
	parseAttributes: () => Vf,
	parseIndentedBlocks: () => Jf,
	renderNestedMarkdownContent: () => Zf,
	serializeAttributes: () => Hf
});
function $f(e) {
	return typeof e.type == "string" ? e.type : e.type.name;
}
function ep(e, t) {
	if (e.length !== t.length) return !1;
	let n = Array.from({ length: t.length }, () => !1);
	return e.every((e) => {
		let r = $f(e), i = t.findIndex((t, i) => !n[i] && r === $f(t) && gf(e.attrs, t.attrs));
		return i !== -1 && (n[i] = !0, !0);
	});
}
function tp(e, t) {
	let n = { ...e };
	return Ef(e) && Ef(t) && Object.keys(t).forEach((r) => {
		Ef(t[r]) && Ef(e[r]) ? n[r] = tp(e[r], t[r]) : n[r] = t[r];
	}), n;
}
function np(e, t, n = {}) {
	let { state: r } = t, { doc: i, tr: a } = r, o = e;
	i.descendants((t, r) => {
		let i = a.mapping.map(r), s = a.mapping.map(r) + t.nodeSize, c = null;
		if (t.marks.forEach((e) => {
			if (e !== o) return !1;
			c = e;
		}), !c) return;
		let l = !1;
		if (Object.keys(n).forEach((e) => {
			n[e] !== c.attrs[e] && (l = !0);
		}), l) {
			let t = e.type.create({
				...e.attrs,
				...n
			});
			a.removeMark(i, s, e.type), a.addMark(i, s, t);
		}
	}), a.docChanged && t.view.dispatch(a);
}
var rp = class {
	constructor(e, t, n) {
		this.component = e, this.editor = t.editor, this.options = { ...n }, this.mark = t.mark, this.HTMLAttributes = t.HTMLAttributes;
	}
	get dom() {
		return this.editor.view.dom;
	}
	get contentDOM() {
		return null;
	}
	updateAttributes(e, t) {
		np(t || this.mark, this.editor, e);
	}
	ignoreMutation(e) {
		return !this.dom || !this.contentDOM ? !0 : typeof this.options.ignoreMutation == "function" ? this.options.ignoreMutation({ mutation: e }) : e.type === "selection" || this.contentDOM.contains(e.target) && e.type === "childList" && (ll() || cl()) && this.editor.isFocused && [...Array.from(e.addedNodes), ...Array.from(e.removedNodes)].every((e) => e.isContentEditable) ? !1 : this.contentDOM === e.target && e.type === "attributes" || !this.contentDOM.contains(e.target);
	}
}, ip = class {
	constructor(e) {
		this.find = e.find, this.handler = e.handler, this.undoable = e.undoable ?? !0;
	}
}, ap = (e, t) => {
	if (Zc(t)) return t.exec(e);
	let n = t(e);
	if (!n) return null;
	let r = [n.text];
	return r.index = n.index, r.input = e, r.data = n.data, n.replaceWith && (n.text.includes(n.replaceWith) || console.warn("[tiptap warn]: \"inputRuleMatch.replaceWith\" must be part of \"inputRuleMatch.text\"."), r.push(n.replaceWith)), r;
};
function op(e) {
	let { editor: t, from: n, to: r, text: i, rules: a, plugin: o } = e, { view: s } = t;
	if (s.composing) return !1;
	let c = s.state.doc.resolve(n);
	if (c.parent.type.spec.code || (c.nodeBefore || c.nodeAfter)?.marks.find((e) => e.type.spec.code)) return !1;
	let l = !1, u = Ru(c) + i;
	return a.forEach((e) => {
		if (l) return;
		let a = ap(u, e.find);
		if (!a) return;
		let d = a[0].length - i.length;
		if (d > 0) {
			let e = c.parentOffset - d;
			if (e < 0 || c.parent.textBetween(e, c.parentOffset) !== a[0].slice(0, d)) return;
		}
		let f = s.state.tr, p = Pc({
			state: s.state,
			transaction: f
		}), m = {
			from: n - (a[0].length - i.length),
			to: r
		}, { commands: h, chain: g, can: _ } = new Fc({
			editor: t,
			state: p
		});
		e.handler({
			state: p,
			range: m,
			match: a,
			commands: h,
			chain: g,
			can: _
		}) !== null && f.steps.length && (e.undoable && f.setMeta(o, {
			transform: f,
			from: n,
			to: r,
			text: i
		}), s.dispatch(f), l = !0);
	}), l;
}
function sp(e) {
	let { editor: t, rules: n } = e, r = new j({
		state: {
			init() {
				return null;
			},
			apply(e, i, a) {
				let o = e.getMeta(r);
				if (o) return o;
				let s = e.getMeta("applyInputRules");
				return s && setTimeout(() => {
					let { text: e } = s;
					e = typeof e == "string" ? e : iu(l.from(e), a.schema);
					let { from: i } = s, o = i + e.length;
					op({
						editor: t,
						from: i,
						to: o,
						text: e,
						rules: n,
						plugin: r
					});
				}), e.selectionSet || e.docChanged ? null : i;
			}
		},
		props: {
			handleTextInput(e, i, a, o) {
				return op({
					editor: t,
					from: i,
					to: a,
					text: o,
					rules: n,
					plugin: r
				});
			},
			handleDOMEvents: { compositionend: (e) => (setTimeout(() => {
				let { $cursor: i } = e.state.selection;
				i && op({
					editor: t,
					from: i.pos,
					to: i.pos,
					text: "",
					rules: n,
					plugin: r
				});
			}), !1) },
			handleKeyDown(e, i) {
				if (i.key !== "Enter") return !1;
				let { $cursor: a } = e.state.selection;
				return a ? op({
					editor: t,
					from: a.pos,
					to: a.pos,
					text: "\n",
					rules: n,
					plugin: r
				}) : !1;
			}
		},
		isInputRules: !0
	});
	return r;
}
var cp = class {
	constructor(e = {}) {
		this.type = "extendable", this.parent = null, this.child = null, this.name = "", this.config = { name: this.name }, this.config = {
			...this.config,
			...e
		}, this.name = this.config.name;
	}
	get options() {
		return { ...H(V(this, "addOptions", { name: this.name })) };
	}
	get storage() {
		return { ...H(V(this, "addStorage", {
			name: this.name,
			options: this.options
		})) };
	}
	configure(e = {}) {
		let t = this.extend({
			...this.config,
			addOptions: () => tp(this.options, e)
		});
		return t.name = this.name, t.parent = this.parent, this.child = null, t;
	}
	extend(e = {}) {
		let t = new this.constructor({
			...this.config,
			...e
		});
		return t.parent = this, this.child = t, t.name = "name" in e ? e.name : t.parent.name, t;
	}
}, lp = class e extends cp {
	constructor(...e) {
		super(...e), this.type = "mark";
	}
	static create(t = {}) {
		let n = typeof t == "function" ? t() : t;
		return new e(n);
	}
	static handleExit({ editor: e, mark: t }) {
		let { tr: n } = e.state, r = e.state.selection.$from;
		if (r.pos === r.end()) {
			let i = r.marks();
			if (!i.find((e) => e?.type.name === t.name)) return !1;
			let a = i.find((e) => e?.type.name === t.name);
			return a && n.removeStoredMark(a), n.insertText(" ", r.pos), e.view.dispatch(n), !0;
		}
		return !1;
	}
	configure(e) {
		return super.configure(e);
	}
	extend(e) {
		let t = typeof e == "function" ? e() : e;
		return super.extend(t);
	}
}, up = class {
	constructor(e) {
		this.find = e.find, this.handler = e.handler;
	}
}, dp = (e, t, n) => {
	if (Zc(t)) return [...e.matchAll(t)];
	let r = t(e, n);
	return r ? r.map((t) => {
		let n = [t.text];
		return n.index = t.index, n.input = e, n.data = t.data, t.replaceWith && (t.text.includes(t.replaceWith) || console.warn("[tiptap warn]: \"pasteRuleMatch.replaceWith\" must be part of \"pasteRuleMatch.text\"."), n.push(t.replaceWith)), n;
	}) : [];
};
function fp(e) {
	let { editor: t, state: n, from: r, to: i, rule: a, pasteEvent: o, dropEvent: s } = e, { commands: c, chain: l, can: u } = new Fc({
		editor: t,
		state: n
	}), d = [];
	return n.doc.nodesBetween(r, i, (e, t) => {
		var f;
		if ((f = e.type) != null && (f = f.spec) != null && f.code || !(e.isText || e.isTextblock || e.isInline)) return;
		let p = e.content?.size ?? e.nodeSize ?? 0, m = Math.max(r, t), h = Math.min(i, t + p);
		m >= h || dp(e.isText ? e.text || "" : e.textBetween(m - t, h - t, void 0, "￼"), a.find, o).forEach((e) => {
			if (e.index === void 0) return;
			let t = m + e.index + 1, r = t + e[0].length, i = {
				from: n.tr.mapping.map(t),
				to: n.tr.mapping.map(r)
			}, f = a.handler({
				state: n,
				range: i,
				match: e,
				commands: c,
				chain: l,
				can: u,
				pasteEvent: o,
				dropEvent: s
			});
			d.push(f);
		});
	}), d.every((e) => e !== null);
}
var pp = null, mp = (e) => {
	var t;
	let n = new ClipboardEvent("paste", { clipboardData: new DataTransfer() });
	return (t = n.clipboardData) == null || t.setData("text/html", e), n;
};
function hp(e) {
	let { editor: t, rules: n } = e, r = null, i = !1, a = !1, o = typeof ClipboardEvent < "u" ? new ClipboardEvent("paste") : null, s;
	try {
		s = typeof DragEvent < "u" ? new DragEvent("drop") : null;
	} catch {
		s = null;
	}
	let c = ({ state: e, from: n, to: r, rule: i, pasteEvt: a }) => {
		let c = e.tr, l = Pc({
			state: e,
			transaction: c
		});
		if (fp({
			editor: t,
			state: l,
			from: Math.max(n - 1, 0),
			to: r.b - 1,
			rule: i,
			pasteEvent: a,
			dropEvent: s
		}) && c.steps.length) {
			try {
				s = typeof DragEvent < "u" ? new DragEvent("drop") : null;
			} catch {
				s = null;
			}
			return o = typeof ClipboardEvent < "u" ? new ClipboardEvent("paste") : null, c;
		}
	};
	return n.map((e) => new j({
		view(e) {
			let n = (n) => {
				r = e.dom.parentElement?.contains(n.target) ? e.dom.parentElement : null, r && (pp = t);
			}, i = () => {
				pp &&= null;
			};
			return window.addEventListener("dragstart", n), window.addEventListener("dragend", i), { destroy() {
				window.removeEventListener("dragstart", n), window.removeEventListener("dragend", i);
			} };
		},
		props: { handleDOMEvents: {
			drop: (e, t) => {
				if (a = r === e.dom.parentElement, s = t, !a) {
					let e = pp;
					e?.isEditable && setTimeout(() => {
						let t = e.state.selection;
						t && e.commands.deleteRange({
							from: t.from,
							to: t.to
						});
					}, 10);
				}
				return !1;
			},
			paste: (e, t) => {
				let n = t.clipboardData?.getData("text/html");
				return o = t, i = !!n?.includes("data-pm-slice"), !1;
			}
		} },
		appendTransaction: (t, n, r) => {
			let s = t[0], u = s.getMeta("uiEvent") === "paste" && !i, d = s.getMeta("uiEvent") === "drop" && !a, f = s.getMeta("applyPasteRules"), p = !!f;
			if (!u && !d && !p) return;
			if (p) {
				let { text: t } = f;
				t = typeof t == "string" ? t : iu(l.from(t), r.schema);
				let { from: n } = f, i = n + t.length, a = mp(t);
				return c({
					rule: e,
					state: r,
					from: n,
					to: { b: i },
					pasteEvt: a
				});
			}
			let m = n.doc.content.findDiffStart(r.doc.content), h = n.doc.content.findDiffEnd(r.doc.content);
			if (wf(m) && h && m !== h.b) return c({
				rule: e,
				state: r,
				from: m,
				to: h,
				pasteEvt: o
			});
		}
	}));
}
var gp = class {
	constructor(e, t) {
		this.splittableMarks = [], this.nonClearableMarks = [], this.decorationManager = null, this.editor = t, this.baseExtensions = e, this.extensions = yu(e), this.schema = gu(this.extensions, t), this.setupExtensions();
	}
	get commands() {
		return this.extensions.reduce((e, t) => {
			let n = V(t, "addCommands", {
				name: t.name,
				options: t.options,
				storage: this.editor.extensionStorage[t.name],
				editor: this.editor,
				type: Iu(t.name, this.schema)
			});
			return n ? {
				...e,
				...n()
			} : e;
		}, {});
	}
	get plugins() {
		let { editor: e } = this, t = vu([...this.extensions].reverse()).flatMap((t) => {
			let n = {
				name: t.name,
				options: t.options,
				storage: this.editor.extensionStorage[t.name],
				editor: e,
				type: Iu(t.name, this.schema)
			}, r = [], i = V(t, "addKeyboardShortcuts", n), a = {};
			if (t.type === "mark" && V(t, "exitable", n) && (a.ArrowRight = () => lp.handleExit({
				editor: e,
				mark: t
			})), i) {
				let t = Object.fromEntries(Object.entries(i()).map(([t, n]) => [t, () => n({ editor: e })]));
				a = {
					...a,
					...t
				};
			}
			let o = Ac(a);
			r.push(o);
			let s = V(t, "addInputRules", n);
			if (Uu(t, e.options.enableInputRules) && s) {
				let t = s();
				if (t && t.length) {
					let n = sp({
						editor: e,
						rules: t
					}), i = Array.isArray(n) ? n : [n];
					r.push(...i);
				}
			}
			let c = V(t, "addPasteRules", n);
			if (Uu(t, e.options.enablePasteRules) && c) {
				let t = c();
				if (t && t.length) {
					let n = hp({
						editor: e,
						rules: t
					});
					r.push(...n);
				}
			}
			let l = V(t, "addProseMirrorPlugins", n);
			if (l) {
				let e = l();
				r.push(...e);
			}
			return r;
		}), n = this.createDecorationPlugin();
		return n && t.push(n), t;
	}
	createDecorationPlugin() {
		var e;
		let { editor: t } = this;
		(e = this.decorationManager) == null || e.destroy();
		let n = [];
		return this.extensions.forEach((e) => {
			let r = V(e, "addDecorations", {
				name: e.name,
				options: e.options,
				storage: this.editor.extensionStorage[e.name],
				editor: t,
				type: Iu(e.name, this.schema)
			});
			r && n.push({
				name: e.name,
				addDecorations: r
			});
		}), this.decorationManager = new hf({
			editor: t,
			entries: n
		}), this.decorationManager.plugin;
	}
	get attributes() {
		return cu(this.extensions);
	}
	get nodeViews() {
		let { editor: e } = this, { nodeExtensions: t } = su(this.extensions);
		return Object.fromEntries(t.filter((e) => !!V(e, "addNodeView")).map((t) => {
			let n = this.attributes.filter((e) => e.type === t.name), r = V(t, "addNodeView", {
				name: t.name,
				options: t.options,
				storage: this.editor.extensionStorage[t.name],
				editor: e,
				type: B(t.name, this.schema)
			});
			if (!r) return [];
			let i = r();
			return i ? [t.name, (r, a, o, s, c) => {
				let l = du(r, n);
				return i({
					node: r,
					view: a,
					getPos: o,
					decorations: s,
					innerDecorations: c,
					editor: e,
					extension: t,
					HTMLAttributes: l
				});
			}] : [];
		}));
	}
	dispatchTransaction(e) {
		let { editor: t } = this;
		return vu([...this.extensions].reverse()).reduceRight((e, n) => {
			let r = {
				name: n.name,
				options: n.options,
				storage: this.editor.extensionStorage[n.name],
				editor: t,
				type: Iu(n.name, this.schema)
			}, i = V(n, "dispatchTransaction", r);
			return i ? (t) => {
				i.call(r, {
					transaction: t,
					next: e
				});
			} : e;
		}, e);
	}
	transformPastedHTML(e) {
		let { editor: t } = this;
		return vu([...this.extensions]).reduce((e, n) => {
			let r = {
				name: n.name,
				options: n.options,
				storage: this.editor.extensionStorage[n.name],
				editor: t,
				type: Iu(n.name, this.schema)
			}, i = V(n, "transformPastedHTML", r);
			return i ? (t, n) => {
				let a = e(t, n);
				return i.call(r, a);
			} : e;
		}, e || ((e) => e));
	}
	get markViews() {
		let { editor: e } = this, { markExtensions: t } = su(this.extensions);
		return Object.fromEntries(t.filter((e) => !!V(e, "addMarkView")).map((t) => {
			let n = this.attributes.filter((e) => e.type === t.name), r = V(t, "addMarkView", {
				name: t.name,
				options: t.options,
				storage: this.editor.extensionStorage[t.name],
				editor: e,
				type: nl(t.name, this.schema)
			});
			return r ? [t.name, (i, a, o) => {
				let s = du(i, n);
				return r()({
					mark: i,
					view: a,
					inline: o,
					editor: e,
					extension: t,
					HTMLAttributes: s,
					updateAttributes: (t) => {
						np(i, e, t);
					}
				});
			}] : [];
		}));
	}
	destroy() {
		var e;
		(e = this.decorationManager) == null || e.destroy(), this.extensions.forEach((e) => {
			let t = e;
			for (; t.parent;) {
				let e = t.parent;
				e.child === t && (e.child = null), t = e;
			}
		}), this.extensions = [], this.baseExtensions = [], this.decorationManager = null, this.schema = null, this.editor = null;
	}
	setupExtensions() {
		let e = this.extensions;
		this.editor.extensionStorage = Object.fromEntries(e.map((e) => [e.name, e.storage])), e.forEach((e) => {
			let t = {
				name: e.name,
				options: e.options,
				storage: this.editor.extensionStorage[e.name],
				editor: this.editor,
				type: Iu(e.name, this.schema)
			};
			e.type === "mark" && ((H(V(e, "keepOnSplit", t)) ?? !0) && this.splittableMarks.push(e.name), (H(V(e, "clearable", t)) ?? !0) || this.nonClearableMarks.push(e.name));
			let n = V(e, "onBeforeCreate", t), r = V(e, "onCreate", t), i = V(e, "onUpdate", t), a = V(e, "onSelectionUpdate", t), o = V(e, "onTransaction", t), s = V(e, "onFocus", t), c = V(e, "onBlur", t), l = V(e, "onDestroy", t);
			n && this.editor.on("beforeCreate", n), r && this.editor.on("create", r), i && this.editor.on("update", i), a && this.editor.on("selectionUpdate", a), o && this.editor.on("transaction", o), s && this.editor.on("focus", s), c && this.editor.on("blur", c), l && this.editor.on("destroy", l);
		});
	}
};
gp.resolve = yu, gp.sort = vu, gp.flatten = ru;
var W = class e extends cp {
	constructor(...e) {
		super(...e), this.type = "extension";
	}
	static create(t = {}) {
		let n = typeof t == "function" ? t() : t;
		return new e(n);
	}
	configure(e) {
		return super.configure(e);
	}
	extend(e) {
		let t = typeof e == "function" ? e() : e;
		return super.extend(t);
	}
}, _p = W.create({
	name: "clipboardTextSerializer",
	addOptions() {
		return { blockSeparator: void 0 };
	},
	addProseMirrorPlugins() {
		return [new j({
			key: new M("clipboardTextSerializer"),
			props: { clipboardTextSerializer: () => {
				let { editor: e } = this, { state: t, schema: n } = e, { doc: r, selection: i } = t, a = Tu(n), { blockSeparator: o } = this.options, s = {
					...o === void 0 ? {} : { blockSeparator: o },
					textSerializers: a
				};
				return [...i.ranges].sort((e, t) => e.$from.pos - t.$from.pos).map(({ $from: e, $to: t }) => Cu(r, {
					from: e.pos,
					to: t.pos
				}, s)).join(o ?? "\n\n");
			} }
		})];
	}
}), vp = W.create({
	name: "commands",
	addCommands() {
		return { ...Ud };
	}
}), yp = W.create({
	name: "delete",
	onUpdate({ transaction: e, appendedTransactions: t }) {
		var n;
		let r = () => {
			var n, r;
			if (((n = this.editor.options.coreExtensionOptions) == null || (n = n.delete) == null || (r = n.filterTransaction) == null ? void 0 : r.call(n, e)) ?? e.getMeta("y-sync$")) return;
			let i = Ql(e.before, [e, ...t]);
			ju(i).forEach((t) => {
				i.mapping.mapResult(t.oldRange.from).deletedAfter && i.mapping.mapResult(t.oldRange.to).deletedBefore && i.before.nodesBetween(t.oldRange.from, t.oldRange.to, (n, r) => {
					let a = r + n.nodeSize - 2, o = t.oldRange.from <= r && a <= t.oldRange.to;
					this.editor.emit("delete", {
						type: "node",
						node: n,
						from: r,
						to: a,
						newFrom: i.mapping.map(r),
						newTo: i.mapping.map(a),
						deletedRange: t.oldRange,
						newRange: t.newRange,
						partial: !o,
						editor: this.editor,
						transaction: e,
						combinedTransform: i
					});
				});
			});
			let a = i.mapping;
			i.steps.forEach((t, n) => {
				if (t instanceof yt) {
					let r = a.slice(n).map(t.from, -1), o = a.slice(n).map(t.to), s = a.invert().map(r, -1), c = a.invert().map(o), l = r > 0 && i.doc.nodeAt(r - 1)?.marks.some((e) => e.eq(t.mark)), u = i.doc.nodeAt(o)?.marks.some((e) => e.eq(t.mark));
					this.editor.emit("delete", {
						type: "mark",
						mark: t.mark,
						from: t.from,
						to: t.to,
						deletedRange: {
							from: s,
							to: c
						},
						newRange: {
							from: r,
							to: o
						},
						partial: !!(u || l),
						editor: this.editor,
						transaction: e,
						combinedTransform: i
					});
				}
			});
		};
		((n = this.editor.options.coreExtensionOptions) == null || (n = n.delete) == null ? void 0 : n.async) ?? !0 ? setTimeout(r, 0) : r();
	}
}), bp = W.create({
	name: "drop",
	addProseMirrorPlugins() {
		return [new j({
			key: new M("tiptapDrop"),
			props: { handleDrop: (e, t, n, r) => {
				this.editor.emit("drop", {
					editor: this.editor,
					event: t,
					slice: n,
					moved: r
				});
			} }
		})];
	}
}), xp = W.create({
	name: "editable",
	addProseMirrorPlugins() {
		return [new j({
			key: new M("editable"),
			props: { editable: () => this.editor.options.editable }
		})];
	}
}), Sp = new M("focusEvents"), Cp = W.create({
	name: "focusEvents",
	addProseMirrorPlugins() {
		let { editor: e } = this;
		return [new j({
			key: Sp,
			props: { handleDOMEvents: {
				focus: (t, n) => {
					e.isFocused = !0;
					let r = e.state.tr.setMeta("focus", { event: n }).setMeta("addToHistory", !1);
					return t.dispatch(r), !1;
				},
				blur: (t, n) => {
					e.isFocused = !1;
					let r = e.state.tr.setMeta("blur", { event: n }).setMeta("addToHistory", !1);
					return t.dispatch(r), !1;
				}
			} }
		})];
	}
}), wp = W.create({
	name: "keymap",
	addKeyboardShortcuts() {
		let e = () => this.editor.commands.first(({ commands: e }) => [
			() => e.undoInputRule(),
			() => e.command(({ tr: t }) => {
				let { selection: n, doc: r } = t, { empty: i, $anchor: a } = n, { pos: o, parent: s } = a, c = a.parent.isTextblock && o > 0 ? t.doc.resolve(o - 1) : a, l = c.parent.type.spec.isolating, u = a.pos - a.parentOffset, d = l && c.parent.childCount === 1 ? u === a.pos : O.atStart(r).from === o;
				return !i || !s.type.isTextblock || s.textContent.length || !d || d && a.parent.type.name === "paragraph" ? !1 : e.clearNodes();
			}),
			() => e.deleteSelection(),
			() => e.joinBackward(),
			() => e.selectNodeBackward()
		]), t = () => this.editor.commands.first(({ commands: e }) => [
			() => e.deleteSelection(),
			() => e.deleteCurrentNode(),
			() => e.joinForward(),
			() => e.selectNodeForward()
		]), n = {
			Enter: () => this.editor.commands.first(({ commands: e }) => [
				() => e.newlineInCode(),
				() => e.createParagraphNear(),
				() => e.liftEmptyBlock(),
				() => e.splitBlock()
			]),
			"Mod-Enter": () => this.editor.commands.exitCode(),
			Backspace: e,
			"Mod-Backspace": e,
			"Shift-Backspace": e,
			Delete: t,
			"Mod-Delete": t,
			"Mod-a": () => this.editor.commands.selectAll()
		}, r = { ...n }, i = {
			...n,
			"Ctrl-h": e,
			"Alt-Backspace": e,
			"Ctrl-d": t,
			"Ctrl-Alt-Backspace": t,
			"Alt-Delete": t,
			"Alt-d": t,
			"Ctrl-a": () => this.editor.commands.selectTextblockStart(),
			"Ctrl-e": () => this.editor.commands.selectTextblockEnd()
		};
		return ll() || jl() ? i : r;
	},
	addProseMirrorPlugins() {
		return [new j({
			key: new M("clearDocument"),
			appendTransaction: (e, t, n) => {
				if (e.some((e) => e.getMeta("composition"))) return;
				let r = e.some((e) => e.docChanged) && !t.doc.eq(n.doc), i = e.some((e) => e.getMeta("preventClearDocument"));
				if (!r || i) return;
				let { empty: a, from: o, to: s } = t.selection, c = O.atStart(t.doc).from, l = O.atEnd(t.doc).to;
				if (a || o !== c || s !== l || !Gu(n.doc)) return;
				let u = n.tr, d = Pc({
					state: n,
					transaction: u
				}), { commands: f } = new Fc({
					editor: this.editor,
					state: d
				});
				if (f.clearNodes(), u.steps.length) return u;
			}
		})];
	}
}), Tp = W.create({
	name: "paste",
	addProseMirrorPlugins() {
		return [new j({
			key: new M("tiptapPaste"),
			props: { handlePaste: (e, t, n) => {
				this.editor.emit("paste", {
					editor: this.editor,
					event: t,
					slice: n
				});
			} }
		})];
	}
}), Ep = W.create({
	name: "tabindex",
	addOptions() {
		return { value: void 0 };
	},
	addProseMirrorPlugins() {
		return [new j({
			key: new M("tabindex"),
			props: { attributes: () => !this.editor.isEditable && this.options.value === void 0 ? {} : { tabindex: this.options.value ?? "0" } }
		})];
	}
}), Dp = W.create({
	name: "textDirection",
	addOptions() {
		return { direction: void 0 };
	},
	addGlobalAttributes() {
		if (!this.options.direction) return [];
		let { nodeExtensions: e } = su(this.extensions);
		return [{
			types: e.filter((e) => e.name !== "text").map((e) => e.name),
			attributes: { dir: {
				default: this.options.direction,
				parseHTML: (e) => {
					let t = e.getAttribute("dir");
					return t && (t === "ltr" || t === "rtl" || t === "auto") ? t : this.options.direction;
				},
				renderHTML: (e) => e.dir ? { dir: e.dir } : {}
			} }
		}];
	},
	addProseMirrorPlugins() {
		return [new j({
			key: new M("textDirection"),
			props: { attributes: () => {
				let e = this.options.direction;
				return e ? { dir: e } : {};
			} }
		})];
	}
}), Op = /* @__PURE__ */ r({
	ClipboardTextSerializer: () => _p,
	Commands: () => vp,
	Delete: () => yp,
	Drop: () => bp,
	Editable: () => xp,
	FocusEvents: () => Cp,
	Keymap: () => wp,
	Paste: () => Tp,
	Tabindex: () => Ep,
	TextDirection: () => Dp,
	focusEventsPluginKey: () => Sp
}), kp = !1;
function Ap(e) {
	if (kp) return;
	kp = !0;
	let t;
	try {
		t = St.fromJSON(e, {
			from: 0,
			to: 0
		}).slice.content;
	} catch {
		return;
	}
	t instanceof l || console.warn("[tiptap warn]: prosemirror-model is loaded more than once. Wrapping and splitting nodes will fail. Deduplicate it in your lock file, or alias it to a single copy in your bundler.");
}
var jp = class e {
	get name() {
		return this.node.type.name;
	}
	constructor(e, t, n = !1, r = null) {
		this.currentNode = null, this.actualDepth = null, this.isBlock = n, this.resolvedPos = e, this.editor = t, this.currentNode = r;
	}
	get node() {
		return this.currentNode || this.resolvedPos.node();
	}
	get element() {
		return this.editor.view.domAtPos(this.pos).node;
	}
	get depth() {
		return this.actualDepth ?? this.resolvedPos.depth;
	}
	get pos() {
		return this.resolvedPos.pos;
	}
	get content() {
		return this.node.content;
	}
	set content(e) {
		let t = this.from, n = this.to;
		if (this.isBlock) {
			if (this.content.size === 0) {
				console.error(`You can’t set content on a block node. Tried to set content on ${this.name} at ${this.pos}`);
				return;
			}
			t = this.from + 1, n = this.to - 1;
		}
		this.editor.commands.insertContentAt({
			from: t,
			to: n
		}, e);
	}
	get attributes() {
		return this.node.attrs;
	}
	get textContent() {
		return this.node.textContent;
	}
	get size() {
		return this.node.nodeSize;
	}
	get from() {
		return this.isBlock ? this.pos : this.resolvedPos.start(this.resolvedPos.depth);
	}
	get range() {
		return {
			from: this.from,
			to: this.to
		};
	}
	get to() {
		return this.isBlock ? this.pos + this.size : this.resolvedPos.end(this.resolvedPos.depth) + +!this.node.isText;
	}
	get parent() {
		if (this.depth === 0) return null;
		let t = this.resolvedPos.start(this.resolvedPos.depth - 1), n = this.resolvedPos.doc.resolve(t);
		return new e(n, this.editor);
	}
	get before() {
		let t = this.resolvedPos.doc.resolve(this.from - (this.isBlock ? 1 : 2));
		return t.depth !== this.depth && (t = this.resolvedPos.doc.resolve(this.from - 3)), new e(t, this.editor);
	}
	get after() {
		let t = this.resolvedPos.doc.resolve(this.to + (this.isBlock ? 2 : 1));
		return t.depth !== this.depth && (t = this.resolvedPos.doc.resolve(this.to + 3)), new e(t, this.editor);
	}
	get children() {
		let t = [];
		return this.node.content.forEach((n, r) => {
			let i = n.isBlock && !n.isTextblock, a = n.isAtom && !n.isText, o = n.isInline, s = this.pos + r + +!a;
			if (s < 0 || s > this.resolvedPos.doc.nodeSize - 2) return;
			let c = this.resolvedPos.doc.resolve(s);
			if (!i && !o && c.depth <= this.depth) return;
			let l = new e(c, this.editor, i, i || o ? n : null);
			i && (l.actualDepth = this.depth + 1), t.push(l);
		}), t;
	}
	get firstChild() {
		return this.children[0] || null;
	}
	get lastChild() {
		let e = this.children;
		return e[e.length - 1] || null;
	}
	closest(e, t = {}) {
		let n = null, r = this.parent;
		for (; r && !n;) {
			if (r.node.type.name === e) {
				if (Object.keys(t).length > 0) {
					let e = r.node.attrs, n = Object.keys(t);
					for (let r = 0; r < n.length; r += 1) {
						let i = n[r];
						if (e[i] !== t[i]) break;
					}
				} else n = r;
			}
			r = r.parent;
		}
		return n;
	}
	querySelector(e, t = {}) {
		return this.querySelectorAll(e, t, !0)[0] || null;
	}
	querySelectorAll(e, t = {}, n = !1) {
		let r = [];
		if (!this.children || this.children.length === 0) return r;
		let i = Object.keys(t);
		return this.children.forEach((a) => {
			n && r.length > 0 || (a.node.type.name === e && i.every((e) => t[e] === a.node.attrs[e]) && r.push(a), !(n && r.length > 0) && (r = r.concat(a.querySelectorAll(e, t, n))));
		}), r;
	}
	setAttribute(e) {
		let { tr: t } = this.editor.state;
		t.setNodeMarkup(this.from, void 0, {
			...this.node.attrs,
			...e
		}), this.editor.view.dispatch(t);
	}
}, Mp = ".ProseMirror {\n  position: relative;\n}\n\n.ProseMirror {\n  word-wrap: break-word;\n  white-space: pre-wrap;\n  white-space: break-spaces;\n  -webkit-font-variant-ligatures: none;\n  font-variant-ligatures: none;\n  font-feature-settings: \"liga\" 0; /* the above doesn't seem to work in Edge */\n}\n\n.ProseMirror [contenteditable=\"false\"] {\n  white-space: normal;\n}\n\n.ProseMirror [contenteditable=\"false\"] [contenteditable=\"true\"] {\n  white-space: pre-wrap;\n}\n\n.ProseMirror pre {\n  white-space: pre-wrap;\n}\n\nimg.ProseMirror-separator {\n  display: inline !important;\n  border: none !important;\n  margin: 0 !important;\n  width: 0 !important;\n  height: 0 !important;\n}\n\n.ProseMirror-gapcursor {\n  display: none;\n  pointer-events: none;\n  position: absolute;\n  margin: 0;\n}\n\n.ProseMirror-gapcursor:after {\n  content: \"\";\n  display: block;\n  position: absolute;\n  top: -2px;\n  width: 20px;\n  border-top: 1px solid black;\n  animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;\n}\n\n@keyframes ProseMirror-cursor-blink {\n  to {\n    visibility: hidden;\n  }\n}\n\n.ProseMirror-hideselection *::selection {\n  background: transparent;\n}\n\n.ProseMirror-hideselection *::-moz-selection {\n  background: transparent;\n}\n\n.ProseMirror-hideselection * {\n  caret-color: transparent;\n}\n\n.ProseMirror-focused .ProseMirror-gapcursor {\n  display: block;\n}", Np = class extends qd {
	constructor(e = {}) {
		super(), this.css = null, this.className = "tiptap", this.editorView = null, this.isFocused = !1, this.destroyed = !1, this.isInitialized = !1, this.extensionStorage = {}, this.instanceId = Math.random().toString(36).slice(2, 9), this.hasWarnedStaleDecorationRead = !1, this.options = {
			element: typeof document < "u" ? document.createElement("div") : null,
			content: "",
			injectCSS: !0,
			injectNonce: void 0,
			extensions: [],
			autofocus: !1,
			editable: !0,
			textDirection: void 0,
			editorProps: {},
			parseOptions: {},
			coreExtensionOptions: {},
			enableInputRules: !0,
			enablePasteRules: !0,
			enableCoreExtensions: !0,
			enableContentCheck: !1,
			emitContentError: !1,
			onBeforeCreate: () => null,
			onCreate: () => null,
			onMount: () => null,
			onUnmount: () => null,
			onUpdate: () => null,
			onSelectionUpdate: () => null,
			onTransaction: () => null,
			onFocus: () => null,
			onBlur: () => null,
			onDestroy: () => null,
			onContentError: ({ error: e }) => {
				throw e;
			},
			onPaste: () => null,
			onDrop: () => null,
			onDelete: () => null,
			enableExtensionDispatchTransaction: !0
		}, this.isCapturingTransaction = !1, this.capturedTransaction = null, this.utils = {
			getUpdatedPosition: ld,
			createMappablePosition: ud
		}, this.setOptions(e), this.createExtensionManager(), this.createCommandManager(), this.createSchema(), this.on("beforeCreate", this.options.onBeforeCreate), this.emit("beforeCreate", { editor: this }), this.on("mount", this.options.onMount), this.on("unmount", this.options.onUnmount), this.on("contentError", this.options.onContentError), this.on("create", this.options.onCreate), this.on("update", this.options.onUpdate), this.on("selectionUpdate", this.options.onSelectionUpdate), this.on("transaction", this.options.onTransaction), this.on("focus", this.options.onFocus), this.on("blur", this.options.onBlur), this.on("destroy", this.options.onDestroy), this.on("drop", ({ event: e, slice: t, moved: n }) => this.options.onDrop(e, t, n)), this.on("paste", ({ event: e, slice: t }) => this.options.onPaste(e, t)), this.on("delete", this.options.onDelete);
		let t = this.createDoc();
		if (!this.editorState) {
			let e = sl(t, this.options.autofocus);
			this.editorState = In.create({
				doc: t,
				schema: this.schema,
				selection: e || void 0
			});
		}
		Ap(this.schema), this.options.element && this.mount(this.options.element);
	}
	mount(e) {
		if (typeof document > "u") throw Error("[tiptap error]: The editor cannot be mounted because there is no 'document' defined in this environment.");
		this.createView(e), this.emit("mount", { editor: this }), this.css && !document.head.contains(this.css) && document.head.appendChild(this.css), window.setTimeout(() => {
			this.isDestroyed || (this.options.autofocus !== !1 && this.options.autofocus !== null && this.commands.focus(this.options.autofocus), this.emit("create", { editor: this }), this.isInitialized = !0);
		}, 0);
	}
	unmount() {
		if (this.editorView) {
			this.editorState = this.editorView.state;
			let e = this.editorView.dom;
			e?.editor && delete e.editor, this.editorView.destroy();
		}
		if (this.editorView = null, this.isInitialized = !1, this.css && !document.querySelectorAll(`.${this.className}`).length) try {
			typeof this.css.remove == "function" ? this.css.remove() : this.css.parentNode && this.css.parentNode.removeChild(this.css);
		} catch (e) {
			console.warn("Failed to remove CSS element:", e);
		}
		this.css = null, this.emit("unmount", { editor: this });
	}
	get storage() {
		return this.extensionStorage;
	}
	get commands() {
		return this.commandManager.commands;
	}
	chain() {
		return this.commandManager ? this.commandManager.chain() : Fc.createFakeChain();
	}
	can() {
		return this.commandManager ? this.commandManager.can() : Fc.createFallbackCan();
	}
	injectCSS() {
		this.options.injectCSS && typeof document < "u" && (this.css = vf(Mp, this.options.injectNonce));
	}
	setOptions(e = {}) {
		this.options = {
			...this.options,
			...e
		}, this.editorView && this.state && !this.isDestroyed && (this.options.editorProps && this.view.setProps(this.options.editorProps), this.view.updateState(this.state));
	}
	setEditable(e, t = !0) {
		this.setOptions({ editable: e }), t && this.emit("update", {
			editor: this,
			transaction: this.state.tr,
			appendedTransactions: []
		});
	}
	get isEditable() {
		return this.options.editable && this.view && this.view.editable;
	}
	get view() {
		return this.editorView ? this.editorView : new Proxy({
			state: this.editorState,
			updateState: (e) => {
				this.editorState = e;
			},
			dispatch: (e) => {
				this.dispatchTransaction(e);
			},
			composing: !1,
			dragging: null,
			editable: !0,
			isDestroyed: !1
		}, { get: (e, t) => {
			if (this.editorView) return this.editorView[t];
			if (t === "state") return this.editorState;
			if (t in e) return Reflect.get(e, t);
			throw Error(`[tiptap error]: The editor view is not available. Cannot access view['${t}']. The editor may not be mounted yet.`);
		} });
	}
	get state() {
		return Jd && !this.hasWarnedStaleDecorationRead && Kd(this) && (this.hasWarnedStaleDecorationRead = !0, console.warn("[tiptap warn]: `editor.state` was read while decoration `create()` was running. It returns the pre-transaction document. Use the `state` argument passed to `create()` instead. Helpers like `editor.isActive()` read `editor.state` too, so pass `state` to their standalone versions instead of calling them on the editor.")), this.editorView && (this.editorState = this.view.state), this.editorState;
	}
	registerPlugin(e, t) {
		let n = au(t) ? t(e, [...this.state.plugins]) : [...this.state.plugins, e], r = this.state.reconfigure({ plugins: n });
		return this.view.updateState(r), r;
	}
	unregisterPlugin(e) {
		if (this.isDestroyed) return;
		let t = this.state.plugins, n = t;
		if ([].concat(e).forEach((e) => {
			let t = typeof e == "string" ? `${e}$` : e.key;
			n = n.filter((e) => !e.key.startsWith(t));
		}), t.length === n.length) return;
		let r = this.state.reconfigure({ plugins: n });
		return this.view.updateState(r), r;
	}
	createExtensionManager() {
		var e, t;
		let n = [...this.options.enableCoreExtensions ? [
			xp,
			_p.configure({ blockSeparator: (e = this.options.coreExtensionOptions) == null || (e = e.clipboardTextSerializer) == null ? void 0 : e.blockSeparator }),
			vp,
			Cp,
			wp,
			Ep.configure({ value: (t = this.options.coreExtensionOptions) == null || (t = t.tabindex) == null ? void 0 : t.value }),
			bp,
			Tp,
			yp,
			Dp.configure({ direction: this.options.textDirection })
		].filter((e) => typeof this.options.enableCoreExtensions != "object" || this.options.enableCoreExtensions[e.name] !== !1) : [], ...this.options.extensions].filter((e) => [
			"extension",
			"node",
			"mark"
		].includes(e?.type));
		this.extensionManager = new gp(n, this);
	}
	createCommandManager() {
		this.commandManager = new Fc({ editor: this });
	}
	createSchema() {
		this.schema = this.extensionManager.schema;
	}
	createDoc() {
		let e;
		try {
			e = Yl(this.options.content, this.schema, this.options.parseOptions, { errorOnInvalidContent: this.options.enableContentCheck });
		} catch (e) {
			if (!(e instanceof Error) || !["[tiptap error]: Invalid JSON content", "[tiptap error]: Invalid HTML content"].includes(e.message)) throw e;
			let t = Yl(this.options.content, this.schema, this.options.parseOptions, { errorOnInvalidContent: !1 });
			return this.editorState = In.create({
				doc: t,
				schema: this.schema,
				selection: sl(t, this.options.autofocus) || void 0
			}), this.emit("contentError", {
				editor: this,
				error: e,
				disableCollaboration: () => {
					"collaboration" in this.storage && typeof this.storage.collaboration == "object" && this.storage.collaboration && (this.storage.collaboration.isDisabled = !0), this.options.extensions = this.options.extensions.filter((e) => e.name !== "collaboration"), this.createExtensionManager();
				}
			}), this.editorState.doc;
		}
		return e;
	}
	createView(e) {
		let { editorProps: t, enableExtensionDispatchTransaction: n } = this.options, r = t.dispatchTransaction || this.dispatchTransaction.bind(this), i = n ? this.extensionManager.dispatchTransaction(r) : r, a = t.transformPastedHTML, o = this.extensionManager.transformPastedHTML(a);
		this.editorView = new uc(e, {
			...t,
			attributes: {
				role: "textbox",
				...t?.attributes
			},
			dispatchTransaction: i,
			transformPastedHTML: o,
			state: this.editorState,
			markViews: this.extensionManager.markViews,
			nodeViews: this.extensionManager.nodeViews
		});
		let s = this.state.reconfigure({ plugins: this.extensionManager.plugins });
		this.view.updateState(s), this.prependClass(), this.injectCSS();
		let c = this.view.dom;
		c.editor = this;
	}
	createNodeViews() {
		this.view.isDestroyed || this.view.setProps({
			markViews: this.extensionManager.markViews,
			nodeViews: this.extensionManager.nodeViews
		});
	}
	prependClass() {
		this.view.dom.className = `${this.className} ${this.view.dom.className}`;
	}
	captureTransaction(e) {
		this.isCapturingTransaction = !0, e(), this.isCapturingTransaction = !1;
		let t = this.capturedTransaction;
		return this.capturedTransaction = null, t;
	}
	dispatchTransaction(e) {
		if (this.view.isDestroyed) return;
		if (this.isCapturingTransaction) {
			if (!this.capturedTransaction) {
				this.capturedTransaction = e;
				return;
			}
			e.steps.forEach((e) => this.capturedTransaction?.step(e));
			return;
		}
		let { state: t, transactions: n } = this.state.applyTransaction(e), r = !this.state.selection.eq(t.selection), i = n.includes(e), a = this.state;
		if (this.emit("beforeTransaction", {
			editor: this,
			transaction: e,
			nextState: t
		}), !i) return;
		this.view.updateState(t), this.emit("transaction", {
			editor: this,
			transaction: e,
			appendedTransactions: n.slice(1)
		}), r && this.emit("selectionUpdate", {
			editor: this,
			transaction: e
		});
		let o = n.findLast((e) => e.getMeta("focus") || e.getMeta("blur")), s = o?.getMeta("focus"), c = o?.getMeta("blur");
		s && this.emit("focus", {
			editor: this,
			event: s.event,
			transaction: o
		}), c && this.emit("blur", {
			editor: this,
			event: c.event,
			transaction: o
		}), !(e.getMeta("preventUpdate") || !n.some((e) => e.docChanged) || a.doc.eq(t.doc)) && this.emit("update", {
			editor: this,
			transaction: e,
			appendedTransactions: n.slice(1)
		});
	}
	getAttributes(e) {
		return Ou(this.state, e);
	}
	isActive(e, t) {
		let n = typeof e == "string" ? e : null, r = typeof e == "string" ? t : e;
		return Bu(this.state, n, r);
	}
	getJSON() {
		return this.state.doc.toJSON();
	}
	getHTML() {
		return iu(this.state.doc.content, this.schema);
	}
	getText(e) {
		let { blockSeparator: t = "\n\n", textSerializers: n = {} } = e || {};
		return wu(this.state.doc, {
			blockSeparator: t,
			textSerializers: {
				...Tu(this.schema),
				...n
			}
		});
	}
	get isEmpty() {
		return Gu(this.state.doc);
	}
	destroy() {
		this.destroyed || (this.destroyed = !0, this.emit("destroy"), this.unmount(), this.removeAllListeners(), this.extensionManager.destroy(), this.extensionManager = null, this.schema = null, this.commandManager = null, this.extensionStorage = {});
	}
	get isDestroyed() {
		return this.editorView?.isDestroyed ?? !0;
	}
	$node(e, t) {
		return this.$doc?.querySelector(e, t) || null;
	}
	$nodes(e, t) {
		return this.$doc?.querySelectorAll(e, t) || null;
	}
	$pos(e) {
		let t = this.state.doc.resolve(e), n = e > 0 && t.nodeAfter && !t.nodeAfter.isText && t.nodeAfter.isAtom ? t.nodeAfter : null;
		return new jp(t, this, !1, n);
	}
	get $doc() {
		return this.$pos(0);
	}
}, Pp = class {
	static Inline(e, t, n = {}, r) {
		return new Fp(e, t, n, r);
	}
	static Node(e, t, n = {}, r) {
		return new Ip(e, t, n, r);
	}
	static Widget(e, t, n) {
		let { key: r, ...i } = n;
		return new Lp(e, t, r, i);
	}
}, Fp = class extends Pp {
	constructor(e, t, n = {}, r) {
		super(), this.kind = "inline", this.from = e, this.to = t, this.attrs = n, this.spec = r;
	}
	get anchor() {
		return this.from;
	}
	toPMDecoration(e) {
		let t = e ? {
			...this.spec,
			extensionName: e
		} : this.spec;
		return I.inline(this.from, this.to, this.attrs, t);
	}
}, Ip = class extends Pp {
	constructor(e, t, n = {}, r) {
		super(), this.kind = "node", this.from = e, this.to = t, this.attrs = n, this.spec = r;
	}
	get anchor() {
		return this.from;
	}
	toPMDecoration(e) {
		let t = e ? {
			...this.spec,
			extensionName: e
		} : this.spec;
		return I.node(this.from, this.to, this.attrs, t);
	}
}, Lp = class extends Pp {
	constructor(e, t, n, r) {
		super(), this.kind = "widget", this.pos = e, this.render = t, this.key = n, this.spec = r;
	}
	get anchor() {
		return this.pos;
	}
	toPMDecoration(e) {
		let t = e ? {
			...this.spec,
			key: this.key,
			extensionName: e
		} : {
			...this.spec,
			key: this.key
		};
		return I.widget(this.pos, this.render, t);
	}
};
function Rp(e, t) {
	let n = e, r = n[t];
	if (!r) {
		r = {
			renderers: /* @__PURE__ */ new Map(),
			props: /* @__PURE__ */ new Map(),
			pendingProps: /* @__PURE__ */ new Map(),
			flushScheduled: !1
		}, n[t] = r;
		let i = r;
		e.on("destroy", () => {
			i.pendingProps.clear(), i.renderers.forEach((e) => e.destroy()), i.renderers.clear(), i.props.clear();
		});
	}
	return r;
}
function zp(e) {
	e.flushScheduled = !1;
	for (let [t, n] of e.pendingProps) {
		let r = e.renderers.get(t);
		r && (r.updateProps(n), e.props.set(t, { ...n }));
	}
	e.pendingProps.clear();
}
function Bp(e) {
	let { editor: t, pos: n, key: r, props: i, cacheKey: a, context: o, create: s, materialize: c, side: l, relaxedSide: u, marks: d, stopEvent: f, ignoreSelection: p, destroy: m } = e, h = Rp(t, a);
	if (h.renderers.has(r)) {
		let e = h.pendingProps.get(r) ?? h.props.get(r);
		(!e || !gf(e, i)) && (h.pendingProps.set(r, i), h.flushScheduled || (h.flushScheduled = !0, queueMicrotask(() => zp(h))));
	}
	return Pp.Widget(n, (e, t) => {
		let n = {
			...i,
			...o(t)
		}, a = h.renderers.get(r);
		return a ? a.updateProps(n) : (a = s(n), h.renderers.set(r, a), h.props.set(r, { ...i })), c(a);
	}, {
		key: r,
		side: l,
		relaxedSide: u,
		marks: d,
		stopEvent: f,
		ignoreSelection: p,
		destroy: (e) => {
			if (!mf(t).has(r)) try {
				var n;
				(n = h.renderers.get(r)) == null || n.destroy(), h.renderers.delete(r), h.props.delete(r), h.pendingProps.delete(r);
			} finally {
				m?.(e);
			}
		}
	});
}
function Vp(e) {
	return new ip({
		find: e.find,
		handler: ({ state: t, range: n, match: r }) => {
			let i = H(e.getAttributes, void 0, r);
			if (i === !1 || i === null) return null;
			let { tr: a } = t, o = r[r.length - 1], s = r[0];
			if (o) {
				let r = s.search(/\S/), c = n.from + s.indexOf(o), l = c + o.length;
				if (Nu(n.from, n.to, t.doc).filter((t) => t.mark.type.excluded.find((n) => n === e.type && n !== t.mark.type)).filter((e) => e.to > c).length) return null;
				l < n.to && a.delete(l, n.to), c > n.from && a.delete(n.from + r, c);
				let u = n.from + r + o.length;
				a.addMark(n.from + r, u, e.type.create(i || {})), a.removeStoredMark(e.type);
			}
		},
		undoable: e.undoable
	});
}
function Hp(e) {
	return new ip({
		find: e.find,
		handler: ({ state: t, range: n, match: r }) => {
			let i = H(e.getAttributes, void 0, r) || {}, { tr: a } = t, o = n.from, s = n.to, c = e.type.create(i);
			if (r[1]) {
				let e = o + r[0].lastIndexOf(r[1]);
				e > s ? e = s : s = e + r[1].length;
				let t = r[0][r[0].length - 1];
				a.insertText(t, o + r[0].length - 1), a.replaceWith(e, s, c);
			} else if (r[0]) {
				let t = e.type.isInline ? o : o - 1;
				a.insert(t, e.type.create(i)).delete(a.mapping.map(o), a.mapping.map(s));
			}
			a.scrollIntoView();
		},
		undoable: e.undoable
	});
}
function Up(e) {
	return new ip({
		find: e.find,
		handler: ({ state: t, range: n, match: r }) => {
			let i = t.doc.resolve(n.from), a = H(e.getAttributes, void 0, r) || {};
			if (!i.node(-1).canReplaceWith(i.index(-1), i.indexAfter(-1), e.type)) return null;
			t.tr.delete(n.from, n.to).setBlockType(n.from, n.from, e.type, a);
		},
		undoable: e.undoable
	});
}
function Wp(e) {
	return new ip({
		find: e.find,
		handler: ({ state: t, range: n, match: r }) => {
			let i = e.replace, a = n.from, o = n.to;
			if (r[1]) {
				let e = r[0].lastIndexOf(r[1]);
				i += r[0].slice(e + r[1].length), a += e;
				let t = a - o;
				t > 0 && (i = r[0].slice(e - t, e) + i, a = o);
			}
			t.tr.insertText(i, a, o);
		},
		undoable: e.undoable
	});
}
function Gp(e) {
	return new ip({
		find: e.find,
		handler: ({ state: t, range: n, match: r, chain: i }) => {
			let a = H(e.getAttributes, void 0, r) || {}, o = t.tr.delete(n.from, n.to), s = o.doc.resolve(n.from).blockRange(), c = s && jt(s, e.type, a);
			if (!c) return null;
			if (o.wrap(s, c), e.keepMarks && e.editor) {
				let { selection: n, storedMarks: r } = t, { splittableMarks: i } = e.editor.extensionManager, a = r || n.$to.parentOffset && n.$from.marks();
				if (a) {
					let e = a.filter((e) => i.includes(e.type.name));
					o.ensureMarks(e);
				}
			}
			if (e.keepAttributes) {
				let t = e.type.name === "bulletList" || e.type.name === "orderedList" ? "listItem" : "taskList";
				i().updateAttributes(t, a).run();
			}
			let l = o.doc.resolve(n.from - 1).nodeBefore;
			l && l.type === e.type && Ut(o.doc, n.from - 1) && (!e.joinPredicate || e.joinPredicate(r, l)) && o.join(n.from - 1);
		},
		undoable: e.undoable
	});
}
var Kp = /* @__PURE__ */ new WeakSet(), qp = /* @__PURE__ */ new WeakSet();
function Jp(e) {
	let t = e;
	return Kp.add(t), t;
}
function Yp(e) {
	return Array.isArray(e) && Kp.has(e);
}
function Xp(e) {
	return e.flatMap((e) => e == null ? [] : Array.isArray(e) && qp.has(e) && !Yp(e) ? Xp(e) : [e]);
}
function Zp(e) {
	return qp.add(e.children), e.children;
}
function Qp(e, t) {
	if (e === "slot") return 0;
	if (e instanceof Function) {
		let n = e(t);
		return Array.isArray(n) && !Yp(n) && !qp.has(n) ? Jp(n) : n;
	}
	let { children: n, ...r } = t ?? {};
	if (e === "svg") throw Error("SVG elements are not supported in the JSX syntax, use the array syntax instead");
	if (Array.isArray(n)) {
		if (Yp(n)) return Jp([
			e,
			r,
			n
		]);
		if (n.length === 0) return Jp([e, r]);
		let t = Xp(n);
		return t.length === 0 ? Jp([e, r]) : Jp([
			e,
			r,
			...t
		]);
	}
	return Jp(n == null ? [e, r] : [
		e,
		r,
		n
	]);
}
var $p = (e, t) => Qp(e, t), em = (e) => "touches" in e, tm = class {
	constructor(e) {
		var t;
		this.directions = [
			"bottom-left",
			"bottom-right",
			"top-left",
			"top-right"
		], this.minSize = {
			height: 8,
			width: 8
		}, this.preserveAspectRatio = !1, this.classNames = {
			container: "",
			wrapper: "",
			handle: "",
			resizing: ""
		}, this.initialWidth = 0, this.initialHeight = 0, this.aspectRatio = 1, this.isResizing = !1, this.activeHandle = null, this.startX = 0, this.startY = 0, this.startWidth = 0, this.startHeight = 0, this.isShiftKeyPressed = !1, this.lastEditableState = void 0, this.handleMap = /* @__PURE__ */ new Map(), this.handleMouseMove = (e) => {
			if (!this.isResizing || !this.activeHandle) return;
			let t = e.clientX - this.startX, n = e.clientY - this.startY;
			this.handleResize(t, n);
		}, this.handleTouchMove = (e) => {
			if (!this.isResizing || !this.activeHandle) return;
			let t = e.touches[0];
			if (!t) return;
			let n = t.clientX - this.startX, r = t.clientY - this.startY;
			this.handleResize(n, r);
		}, this.handleMouseUp = () => {
			if (!this.isResizing) return;
			let e = this.element.offsetWidth, t = this.element.offsetHeight;
			this.onCommit(e, t), this.isResizing = !1, this.activeHandle = null, this.container.dataset.resizeState = "false", this.classNames.resizing && this.container.classList.remove(this.classNames.resizing), document.removeEventListener("mousemove", this.handleMouseMove), document.removeEventListener("mouseup", this.handleMouseUp), document.removeEventListener("keydown", this.handleKeyDown), document.removeEventListener("keyup", this.handleKeyUp);
		}, this.handleKeyDown = (e) => {
			e.key === "Shift" && (this.isShiftKeyPressed = !0);
		}, this.handleKeyUp = (e) => {
			e.key === "Shift" && (this.isShiftKeyPressed = !1);
		}, this.node = e.node, this.editor = e.editor, this.element = e.element, this.element.draggable = !1, this.contentElement = e.contentElement, this.getPos = e.getPos, this.onResize = e.onResize, this.onCommit = e.onCommit, this.onUpdate = e.onUpdate, e.options?.min && (this.minSize = {
			...this.minSize,
			...e.options.min
		}), e.options?.max && (this.maxSize = e.options.max), e != null && (t = e.options) != null && t.directions && (this.directions = e.options.directions), e.options?.preserveAspectRatio && (this.preserveAspectRatio = e.options.preserveAspectRatio), e.options?.className && (this.classNames = {
			container: e.options.className.container || "",
			wrapper: e.options.className.wrapper || "",
			handle: e.options.className.handle || "",
			resizing: e.options.className.resizing || ""
		}), e.options?.createCustomHandle && (this.createCustomHandle = e.options.createCustomHandle), this.wrapper = this.createWrapper(), this.container = this.createContainer(), this.applyInitialSize(), this.attachHandles(), this.editor.on("update", this.handleEditorUpdate.bind(this));
	}
	get dom() {
		return this.container;
	}
	get contentDOM() {
		return this.contentElement ?? null;
	}
	handleEditorUpdate() {
		let e = this.editor.isEditable;
		e !== this.lastEditableState && (this.lastEditableState = e, e ? e && this.handleMap.size === 0 && this.attachHandles() : this.removeHandles());
	}
	update(e, t, n) {
		return e.type === this.node.type && (this.node = e, !this.onUpdate || this.onUpdate(e, t, n));
	}
	destroy() {
		this.isResizing && (this.container.dataset.resizeState = "false", this.classNames.resizing && this.container.classList.remove(this.classNames.resizing), document.removeEventListener("mousemove", this.handleMouseMove), document.removeEventListener("mouseup", this.handleMouseUp), document.removeEventListener("keydown", this.handleKeyDown), document.removeEventListener("keyup", this.handleKeyUp), this.isResizing = !1, this.activeHandle = null), this.editor.off("update", this.handleEditorUpdate.bind(this)), this.container.remove();
	}
	createContainer() {
		let e = document.createElement("div");
		return e.dataset.resizeContainer = "", e.dataset.node = this.node.type.name, e.style.display = this.node.type.isInline ? "inline-flex" : "flex", this.classNames.container && (e.className = this.classNames.container), e.appendChild(this.wrapper), e;
	}
	createWrapper() {
		let e = document.createElement("div");
		return e.style.position = "relative", e.style.display = "block", e.dataset.resizeWrapper = "", this.classNames.wrapper && (e.className = this.classNames.wrapper), e.appendChild(this.element), e;
	}
	createHandle(e) {
		let t = document.createElement("div");
		return t.dataset.resizeHandle = e, t.style.position = "absolute", this.classNames.handle && (t.className = this.classNames.handle), t;
	}
	positionHandle(e, t) {
		let n = t.includes("top"), r = t.includes("bottom"), i = t.includes("left"), a = t.includes("right");
		n && (e.style.top = "0"), r && (e.style.bottom = "0"), i && (e.style.left = "0"), a && (e.style.right = "0"), (t === "top" || t === "bottom") && (e.style.left = "0", e.style.right = "0"), (t === "left" || t === "right") && (e.style.top = "0", e.style.bottom = "0");
	}
	attachHandles() {
		this.directions.forEach((e) => {
			let t;
			t = this.createCustomHandle ? this.createCustomHandle(e) : this.createHandle(e), t instanceof HTMLElement || (console.warn(`[ResizableNodeView] createCustomHandle("${e}") did not return an HTMLElement. Falling back to default handle.`), t = this.createHandle(e)), this.createCustomHandle || this.positionHandle(t, e), t.addEventListener("mousedown", (t) => this.handleResizeStart(t, e)), t.addEventListener("touchstart", (t) => this.handleResizeStart(t, e)), this.handleMap.set(e, t), this.wrapper.appendChild(t);
		});
	}
	removeHandles() {
		this.handleMap.forEach((e) => e.remove()), this.handleMap.clear();
	}
	applyInitialSize() {
		let e = this.node.attrs.width, t = this.node.attrs.height;
		e ? (this.element.style.width = `${e}px`, this.initialWidth = e) : this.initialWidth = this.element.offsetWidth, t ? (this.element.style.height = `${t}px`, this.initialHeight = t) : this.initialHeight = this.element.offsetHeight, this.initialWidth > 0 && this.initialHeight > 0 && (this.aspectRatio = this.initialWidth / this.initialHeight);
	}
	handleResizeStart(e, t) {
		e.preventDefault(), e.stopPropagation(), this.isResizing = !0, this.activeHandle = t, em(e) ? (this.startX = e.touches[0].clientX, this.startY = e.touches[0].clientY) : (this.startX = e.clientX, this.startY = e.clientY), this.startWidth = this.element.offsetWidth, this.startHeight = this.element.offsetHeight, this.startWidth > 0 && this.startHeight > 0 && (this.aspectRatio = this.startWidth / this.startHeight), this.getPos(), this.container.dataset.resizeState = "true", this.classNames.resizing && this.container.classList.add(this.classNames.resizing), document.addEventListener("mousemove", this.handleMouseMove), document.addEventListener("touchmove", this.handleTouchMove), document.addEventListener("mouseup", this.handleMouseUp), document.addEventListener("keydown", this.handleKeyDown), document.addEventListener("keyup", this.handleKeyUp);
	}
	handleResize(e, t) {
		if (!this.activeHandle) return;
		let n = this.preserveAspectRatio || this.isShiftKeyPressed, { width: r, height: i } = this.calculateNewDimensions(this.activeHandle, e, t), a = this.applyConstraints(r, i, n);
		this.element.style.width = `${a.width}px`, this.element.style.height = `${a.height}px`, this.onResize && this.onResize(a.width, a.height);
	}
	calculateNewDimensions(e, t, n) {
		let r = this.startWidth, i = this.startHeight, a = e.includes("right"), o = e.includes("left"), s = e.includes("bottom"), c = e.includes("top");
		return a ? r = this.startWidth + t : o && (r = this.startWidth - t), s ? i = this.startHeight + n : c && (i = this.startHeight - n), (e === "right" || e === "left") && (r = this.startWidth + (a ? t : -t)), (e === "top" || e === "bottom") && (i = this.startHeight + (s ? n : -n)), this.preserveAspectRatio || this.isShiftKeyPressed ? this.applyAspectRatio(r, i, e) : {
			width: r,
			height: i
		};
	}
	applyConstraints(e, t, n) {
		if (!n) {
			let n = Math.max(this.minSize.width, e), r = Math.max(this.minSize.height, t);
			return this.maxSize?.width && (n = Math.min(this.maxSize.width, n)), this.maxSize?.height && (r = Math.min(this.maxSize.height, r)), {
				width: n,
				height: r
			};
		}
		let r = e, i = t;
		return r < this.minSize.width && (r = this.minSize.width, i = r / this.aspectRatio), i < this.minSize.height && (i = this.minSize.height, r = i * this.aspectRatio), this.maxSize?.width && r > this.maxSize.width && (r = this.maxSize.width, i = r / this.aspectRatio), this.maxSize?.height && i > this.maxSize.height && (i = this.maxSize.height, r = i * this.aspectRatio), {
			width: r,
			height: i
		};
	}
	applyAspectRatio(e, t, n) {
		return n === "left" || n === "right" ? {
			width: e,
			height: e / this.aspectRatio
		} : n === "top" || n === "bottom" ? {
			width: t * this.aspectRatio,
			height: t
		} : {
			width: e,
			height: e / this.aspectRatio
		};
	}
}, nm = tm, G = class e extends cp {
	constructor(...e) {
		super(...e), this.type = "node";
	}
	static create(t = {}) {
		let n = typeof t == "function" ? t() : t;
		return new e(n);
	}
	configure(e) {
		return super.configure(e);
	}
	extend(e) {
		let t = typeof e == "function" ? e() : e;
		return super.extend(t);
	}
}, rm = class {
	constructor(e, t, n) {
		this.isDragging = !1, this.component = e, this.editor = t.editor, this.options = {
			stopEvent: null,
			ignoreMutation: null,
			...n
		}, this.extension = t.extension, this.node = t.node, this.decorations = t.decorations, this.innerDecorations = t.innerDecorations, this.view = t.view, this.HTMLAttributes = t.HTMLAttributes, this.getPos = () => {
			try {
				return t.getPos();
			} catch {
				return;
			}
		}, this.mount();
	}
	mount() {}
	get dom() {
		return this.editor.view.dom;
	}
	get contentDOM() {
		return null;
	}
	onDragStart(e) {
		let { view: t } = this.editor, n = e.target, r = n.nodeType === 3 ? n.parentElement?.closest("[data-drag-handle]") : n.closest("[data-drag-handle]");
		if (!this.dom || this.contentDOM?.contains(n) || !r) return;
		let i = 0, a = 0;
		if (this.dom !== r) {
			let t = this.dom.getBoundingClientRect(), n = r.getBoundingClientRect(), o = e.offsetX ?? e.nativeEvent?.offsetX, s = e.offsetY ?? e.nativeEvent?.offsetY;
			i = n.x - t.x + o, a = n.y - t.y + s;
		}
		let o = this.dom.cloneNode(!0);
		try {
			let e = this.dom.getBoundingClientRect();
			o.style.width = `${Math.round(e.width)}px`, o.style.height = `${Math.round(e.height)}px`, o.style.boxSizing = "border-box", o.style.pointerEvents = "none";
		} catch {}
		let s = null;
		try {
			var c;
			s = document.createElement("div"), s.style.position = "absolute", s.style.top = "-9999px", s.style.left = "-9999px", s.style.pointerEvents = "none", s.appendChild(o), document.body.appendChild(s), (c = e.dataTransfer) == null || c.setDragImage(o, i, a);
		} finally {
			s && setTimeout(() => {
				try {
					s?.remove();
				} catch {}
			}, 0);
		}
		let l = this.getPos();
		if (typeof l != "number") return;
		let u = A.create(t.state.doc, l), d = t.state.tr.setSelection(u);
		t.dispatch(d);
	}
	stopEvent(e) {
		if (!this.dom) return !1;
		if (typeof this.options.stopEvent == "function") return this.options.stopEvent({ event: e });
		let t = e.target;
		if (!this.dom.contains(t) || this.contentDOM?.contains(t)) return !1;
		let n = e.type.startsWith("drag"), r = e.type === "dragover" || e.type === "dragenter", i = e.type === "drop";
		if (([
			"INPUT",
			"BUTTON",
			"SELECT",
			"TEXTAREA"
		].includes(t.tagName) || t.isContentEditable) && !i && !n) return !0;
		let { isEditable: a } = this.editor, { isDragging: o } = this, s = !!this.node.type.spec.draggable, c = A.isSelectable(this.node), l = e.type === "copy", u = e.type === "paste", d = e.type === "cut", f = e.type === "mousedown";
		if (!s && c && n && e.target === this.dom && e.preventDefault(), s && n && !o && e.target === this.dom) return e.preventDefault(), !1;
		if (s && a && !o && f) {
			let e = t.closest("[data-drag-handle]");
			e && (this.dom === e || this.dom.contains(e)) && (this.isDragging = !0, document.addEventListener("dragend", () => {
				this.isDragging = !1;
			}, { once: !0 }), document.addEventListener("drop", () => {
				this.isDragging = !1;
			}, { once: !0 }), document.addEventListener("mouseup", () => {
				this.isDragging = !1;
			}, { once: !0 }));
		}
		return !(o || r || i || l || u || d || f && c);
	}
	ignoreMutation(e) {
		return !this.dom || !this.contentDOM ? !0 : typeof this.options.ignoreMutation == "function" ? this.options.ignoreMutation({ mutation: e }) : this.node.isLeaf || this.node.isAtom ? !0 : e.type === "selection" || this.contentDOM.contains(e.target) && e.type === "childList" && (ll() || cl()) && this.editor.isFocused && [...Array.from(e.addedNodes), ...Array.from(e.removedNodes)].every((e) => e.isContentEditable) ? !1 : this.contentDOM === e.target && e.type === "attributes" || !this.contentDOM.contains(e.target);
	}
	updateAttributes(e) {
		this.editor.commands.command(({ tr: t }) => {
			let n = this.getPos();
			return typeof n == "number" && (t.setNodeMarkup(n, void 0, {
				...this.node.attrs,
				...e
			}), !0);
		});
	}
	deleteNode() {
		let e = this.getPos();
		if (typeof e != "number") return;
		let t = e + this.node.nodeSize;
		this.editor.commands.deleteRange({
			from: e,
			to: t
		});
	}
};
function im(e) {
	return new up({
		find: e.find,
		handler: ({ state: t, range: n, match: r, pasteEvent: i }) => {
			let a = H(e.getAttributes, void 0, r, i);
			if (a === !1 || a === null) return null;
			let { tr: o } = t, s = r[r.length - 1], c = r[0], l = n.to;
			if (s) {
				let i = c.search(/\S/), u = n.from + c.indexOf(s), d = u + s.length;
				if (Nu(n.from, n.to, t.doc).filter((t) => t.mark.type.excluded.find((n) => n === e.type && n !== t.mark.type)).filter((e) => e.to > u).length) return null;
				d < n.to && o.delete(d, n.to), u > n.from && o.delete(n.from + i, u), l = n.from + i + s.length, o.addMark(n.from + i, l, e.type.create(a || {})), r.index !== void 0 && r.input !== void 0 && r.index + r[0].length >= r.input.length || o.removeStoredMark(e.type);
			}
		}
	});
}
function am(e) {
	return new up({
		find: e.find,
		handler({ match: t, chain: n, range: r, pasteEvent: i }) {
			let a = H(e.getAttributes, void 0, t, i), o = H(e.getContent, void 0, a);
			if (a === !1 || a === null) return null;
			let s = {
				type: e.type.name,
				attrs: a
			};
			o && (s.content = o), t.input && n().deleteRange(r).insertContentAt(r.from, s);
		}
	});
}
function om(e) {
	return new up({
		find: e.find,
		handler: ({ state: t, range: n, match: r }) => {
			let i = e.replace, a = n.from, o = n.to;
			if (r[1]) {
				let e = r[0].lastIndexOf(r[1]);
				i += r[0].slice(e + r[1].length), a += e;
				let t = a - o;
				t > 0 && (i = r[0].slice(e - t, e) + i, a = o);
			}
			t.tr.insertText(i, a, o);
		}
	});
}
var sm = class {
	constructor(e) {
		this.transaction = e, this.currentStep = this.transaction.steps.length;
	}
	map(e) {
		let t = !1;
		return {
			position: this.transaction.steps.slice(this.currentStep).reduce((e, n) => {
				let r = n.getMap().mapResult(e);
				return r.deleted && (t = !0), r.pos;
			}, e),
			deleted: t
		};
	}
};
//#endregion
//#region ../../node_modules/prosemirror-dropcursor/dist/index.js
function cm(e = {}) {
	return new j({ view(t) {
		return new lm(t, e);
	} });
}
var lm = class {
	constructor(e, t) {
		this.editorView = e, this.cursorPos = null, this.element = null, this.timeout = -1, this.lastDragEvent = null, this.width = t.width ?? 1, this.color = t.color === !1 ? void 0 : t.color || "black", this.class = t.class, this.handlers = [
			"dragover",
			"dragend",
			"drop",
			"dragleave"
		].map((t) => {
			let n = (e) => {
				this[t](e);
			};
			return e.dom.addEventListener(t, n), {
				name: t,
				handler: n
			};
		});
	}
	destroy() {
		this.handlers.forEach(({ name: e, handler: t }) => this.editorView.dom.removeEventListener(e, t));
	}
	update(e, t) {
		if (this.cursorPos != null && t.doc != e.state.doc) {
			if (this.lastDragEvent) {
				let e = this.computeTarget(this.lastDragEvent);
				e == this.cursorPos ? this.updateOverlay() : this.setCursor(e);
			} else this.updateOverlay();
		}
	}
	setCursor(e) {
		e != this.cursorPos && (this.cursorPos = e, e == null ? (this.element.parentNode.removeChild(this.element), this.element = null) : this.updateOverlay());
	}
	updateOverlay() {
		let e = this.editorView.state.doc.resolve(this.cursorPos), t = !e.parent.inlineContent, n, r = this.editorView.dom, i = r.getBoundingClientRect(), a = i.width / r.offsetWidth, o = i.height / r.offsetHeight;
		if (t) {
			let t = e.nodeBefore, r = e.nodeAfter;
			if (t || r) {
				let e = this.editorView.nodeDOM(this.cursorPos - (t ? t.nodeSize : 0));
				if (e) {
					let i = e.getBoundingClientRect(), a = t ? i.bottom : i.top;
					t && r && (a = (a + this.editorView.nodeDOM(this.cursorPos).getBoundingClientRect().top) / 2);
					let s = this.width / 2 * o;
					n = {
						left: i.left,
						right: i.right,
						top: a - s,
						bottom: a + s
					};
				}
			}
		}
		if (!n) {
			let e = this.editorView.coordsAtPos(this.cursorPos), t = this.width / 2 * a;
			n = {
				left: e.left - t,
				right: e.left + t,
				top: e.top,
				bottom: e.bottom
			};
		}
		let s = this.editorView.dom.offsetParent;
		this.element || (this.element = s.appendChild(document.createElement("div")), this.class && (this.element.className = this.class), this.element.style.cssText = "position: absolute; z-index: 50; pointer-events: none;", this.color && (this.element.style.backgroundColor = this.color)), this.element.classList.toggle("prosemirror-dropcursor-block", t), this.element.classList.toggle("prosemirror-dropcursor-inline", !t);
		let c, l;
		if (!s || s == document.body && getComputedStyle(s).position == "static") c = -pageXOffset, l = -pageYOffset;
		else {
			let e = s.getBoundingClientRect(), t = e.width / s.offsetWidth, n = e.height / s.offsetHeight;
			c = e.left - s.scrollLeft * t, l = e.top - s.scrollTop * n;
		}
		this.element.style.left = (n.left - c) / a + "px", this.element.style.top = (n.top - l) / o + "px", this.element.style.width = (n.right - n.left) / a + "px", this.element.style.height = (n.bottom - n.top) / o + "px";
	}
	scheduleRemoval(e) {
		clearTimeout(this.timeout), this.timeout = setTimeout(() => this.setCursor(null), e);
	}
	computeTarget(e) {
		let t = this.editorView.posAtCoords({
			left: e.clientX,
			top: e.clientY
		}), n = t && t.inside >= 0 && this.editorView.state.doc.nodeAt(t.inside), r = n && n.type.spec.disableDropCursor, i = typeof r == "function" ? r(this.editorView, t, e) : r;
		if (!t || i) return null;
		let a = t.pos;
		if (this.editorView.dragging && this.editorView.dragging.slice) {
			let e = Yt(this.editorView.state.doc, a, this.editorView.dragging.slice);
			e != null && (a = e);
		}
		return a;
	}
	dragover(e) {
		if (!this.editorView.editable) return;
		this.lastDragEvent = e;
		let t = this.computeTarget(e);
		t != null && (this.setCursor(t), this.scheduleRemoval(5e3));
	}
	dragend() {
		this.scheduleRemoval(20);
	}
	drop() {
		this.scheduleRemoval(20);
	}
	dragleave(e) {
		this.editorView.dom.contains(e.relatedTarget) || this.setCursor(null);
	}
}, um = /* @__PURE__ */ t({ dropCursor: () => cm }), dm = class e extends O {
	constructor(e) {
		super(e, e);
	}
	map(t, n) {
		let r = t.resolve(n.map(this.head));
		return e.valid(r) ? new e(r) : O.near(r);
	}
	content() {
		return h.empty;
	}
	eq(t) {
		return t instanceof e && t.head == this.head;
	}
	toJSON() {
		return {
			type: "gapcursor",
			pos: this.head
		};
	}
	static fromJSON(t, n) {
		if (typeof n.pos != "number") throw RangeError("Invalid input for GapCursor.fromJSON");
		return new e(t.resolve(n.pos));
	}
	getBookmark() {
		return new fm(this.anchor);
	}
	static valid(e) {
		let t = e.parent;
		if (t.inlineContent || !mm(e) || !hm(e)) return !1;
		let n = t.type.spec.allowGapCursor;
		if (n != null) return n;
		let r = t.contentMatchAt(e.index()).defaultType;
		return r && r.isTextblock;
	}
	static findGapCursorFrom(t, n, r = !1) {
		search: for (;;) {
			if (!r && e.valid(t)) return t;
			let i = t.pos, a = null;
			for (let r = t.depth;; r--) {
				let o = t.node(r);
				if (n > 0 ? t.indexAfter(r) < o.childCount : t.index(r) > 0) {
					a = o.child(n > 0 ? t.indexAfter(r) : t.index(r) - 1);
					break;
				}
				if (r == 0) return null;
				i += n;
				let s = t.doc.resolve(i);
				if (e.valid(s)) return s;
			}
			for (;;) {
				let o = n > 0 ? a.firstChild : a.lastChild;
				if (!o) {
					if (a.isAtom && !a.isText && !A.isSelectable(a)) {
						t = t.doc.resolve(i + a.nodeSize * n), r = !1;
						continue search;
					}
					break;
				}
				a = o, i += n;
				let s = t.doc.resolve(i);
				if (e.valid(s)) return s;
			}
			return null;
		}
	}
};
dm.prototype.visible = !1, dm.findFrom = dm.findGapCursorFrom, O.jsonID("gapcursor", dm);
var fm = class e {
	constructor(e) {
		this.pos = e;
	}
	map(t) {
		return new e(t.map(this.pos));
	}
	resolve(e) {
		let t = e.resolve(this.pos);
		return dm.valid(t) ? new dm(t) : O.near(t);
	}
};
function pm(e) {
	return e.isAtom || e.spec.isolating || e.spec.createGapCursor;
}
function mm(e) {
	for (let t = e.depth; t >= 0; t--) {
		let n = e.index(t), r = e.node(t);
		if (n == 0) {
			if (r.type.spec.isolating) return !0;
			continue;
		}
		for (let e = r.child(n - 1);; e = e.lastChild) {
			if (e.childCount == 0 && !e.inlineContent || pm(e.type)) return !0;
			if (e.inlineContent) return !1;
		}
	}
	return !0;
}
function hm(e) {
	for (let t = e.depth; t >= 0; t--) {
		let n = e.indexAfter(t), r = e.node(t);
		if (n == r.childCount) {
			if (r.type.spec.isolating) return !0;
			continue;
		}
		for (let e = r.child(n);; e = e.firstChild) {
			if (e.childCount == 0 && !e.inlineContent || pm(e.type)) return !0;
			if (e.inlineContent) return !1;
		}
	}
	return !0;
}
function gm() {
	return new j({ props: {
		decorations: xm,
		createSelectionBetween(e, t, n) {
			return t.pos == n.pos && dm.valid(n) ? new dm(n) : null;
		},
		handleClick: ym,
		handleKeyDown: _m,
		handleDOMEvents: { beforeinput: bm }
	} });
}
var _m = jc({
	ArrowLeft: vm("horiz", -1),
	ArrowRight: vm("horiz", 1),
	ArrowUp: vm("vert", -1),
	ArrowDown: vm("vert", 1)
});
function vm(e, t) {
	let n = e == "vert" ? t > 0 ? "down" : "up" : t > 0 ? "right" : "left";
	return function(e, r, i) {
		let a = e.selection, o = t > 0 ? a.$to : a.$from, s = a.empty;
		if (a instanceof k) {
			if (!i.endOfTextblock(n) || o.depth == 0) return !1;
			s = !1, o = e.doc.resolve(t > 0 ? o.after() : o.before());
		}
		let c = dm.findGapCursorFrom(o, t, s);
		return c ? (r && r(e.tr.setSelection(new dm(c))), !0) : !1;
	};
}
function ym(e, t, n) {
	if (!e || !e.editable) return !1;
	let r = e.state.doc.resolve(t);
	if (!dm.valid(r)) return !1;
	let i = e.posAtCoords({
		left: n.clientX,
		top: n.clientY
	});
	return i && i.inside > -1 && A.isSelectable(e.state.doc.nodeAt(i.inside)) ? !1 : (e.dispatch(e.state.tr.setSelection(new dm(r))), !0);
}
function bm(e, t) {
	if (t.inputType != "insertCompositionText" || !(e.state.selection instanceof dm)) return !1;
	let { $from: n } = e.state.selection, r = n.parent.contentMatchAt(n.index()).findWrapping(e.state.schema.nodes.text);
	if (!r) return !1;
	let i = l.empty;
	for (let e = r.length - 1; e >= 0; e--) i = l.from(r[e].createAndFill(null, i));
	let a = e.state.tr.replace(n.pos, n.pos, new h(i, 0, 0));
	return a.setSelection(k.near(a.doc.resolve(n.pos + 1))), e.dispatch(a), !1;
}
function xm(e) {
	if (!(e.selection instanceof dm)) return null;
	let t = document.createElement("div");
	return t.className = "ProseMirror-gapcursor", L.create(e.doc, [I.widget(e.selection.head, t, { key: "gapcursor" })]);
}
//#endregion
//#region ../../node_modules/@tiptap/pm/dist/gapcursor/index.js
var Sm = /* @__PURE__ */ t({
	GapCursor: () => dm,
	gapCursor: () => gm
}), Cm = 200, K = function() {};
K.prototype.append = function(e) {
	return e.length ? (e = K.from(e), !this.length && e || e.length < Cm && this.leafAppend(e) || this.length < Cm && e.leafPrepend(this) || this.appendInner(e)) : this;
}, K.prototype.prepend = function(e) {
	return e.length ? K.from(e).append(this) : this;
}, K.prototype.appendInner = function(e) {
	return new Tm(this, e);
}, K.prototype.slice = function(e, t) {
	return e === void 0 && (e = 0), t === void 0 && (t = this.length), e >= t ? K.empty : this.sliceInner(Math.max(0, e), Math.min(this.length, t));
}, K.prototype.get = function(e) {
	if (!(e < 0 || e >= this.length)) return this.getInner(e);
}, K.prototype.forEach = function(e, t, n) {
	t === void 0 && (t = 0), n === void 0 && (n = this.length), t <= n ? this.forEachInner(e, t, n, 0) : this.forEachInvertedInner(e, t, n, 0);
}, K.prototype.map = function(e, t, n) {
	t === void 0 && (t = 0), n === void 0 && (n = this.length);
	var r = [];
	return this.forEach(function(t, n) {
		return r.push(e(t, n));
	}, t, n), r;
}, K.from = function(e) {
	return e instanceof K ? e : e && e.length ? new wm(e) : K.empty;
};
var wm = /* @__PURE__ */ function(e) {
	function t(t) {
		e.call(this), this.values = t;
	}
	e && (t.__proto__ = e), t.prototype = Object.create(e && e.prototype), t.prototype.constructor = t;
	var n = {
		length: { configurable: !0 },
		depth: { configurable: !0 }
	};
	return t.prototype.flatten = function() {
		return this.values;
	}, t.prototype.sliceInner = function(e, n) {
		return e == 0 && n == this.length ? this : new t(this.values.slice(e, n));
	}, t.prototype.getInner = function(e) {
		return this.values[e];
	}, t.prototype.forEachInner = function(e, t, n, r) {
		for (var i = t; i < n; i++) if (e(this.values[i], r + i) === !1) return !1;
	}, t.prototype.forEachInvertedInner = function(e, t, n, r) {
		for (var i = t - 1; i >= n; i--) if (e(this.values[i], r + i) === !1) return !1;
	}, t.prototype.leafAppend = function(e) {
		if (this.length + e.length <= Cm) return new t(this.values.concat(e.flatten()));
	}, t.prototype.leafPrepend = function(e) {
		if (this.length + e.length <= Cm) return new t(e.flatten().concat(this.values));
	}, n.length.get = function() {
		return this.values.length;
	}, n.depth.get = function() {
		return 0;
	}, Object.defineProperties(t.prototype, n), t;
}(K);
K.empty = new wm([]);
var Tm = /* @__PURE__ */ function(e) {
	function t(t, n) {
		e.call(this), this.left = t, this.right = n, this.length = t.length + n.length, this.depth = Math.max(t.depth, n.depth) + 1;
	}
	return e && (t.__proto__ = e), t.prototype = Object.create(e && e.prototype), t.prototype.constructor = t, t.prototype.flatten = function() {
		return this.left.flatten().concat(this.right.flatten());
	}, t.prototype.getInner = function(e) {
		return e < this.left.length ? this.left.get(e) : this.right.get(e - this.left.length);
	}, t.prototype.forEachInner = function(e, t, n, r) {
		var i = this.left.length;
		if (t < i && this.left.forEachInner(e, t, Math.min(n, i), r) === !1 || n > i && this.right.forEachInner(e, Math.max(t - i, 0), Math.min(this.length, n) - i, r + i) === !1) return !1;
	}, t.prototype.forEachInvertedInner = function(e, t, n, r) {
		var i = this.left.length;
		if (t > i && this.right.forEachInvertedInner(e, t - i, Math.max(n, i) - i, r + i) === !1 || n < i && this.left.forEachInvertedInner(e, Math.min(t, i), n, r) === !1) return !1;
	}, t.prototype.sliceInner = function(e, t) {
		if (e == 0 && t == this.length) return this;
		var n = this.left.length;
		return t <= n ? this.left.slice(e, t) : e >= n ? this.right.slice(e - n, t - n) : this.left.slice(e, n).append(this.right.slice(0, t - n));
	}, t.prototype.leafAppend = function(e) {
		var n = this.right.leafAppend(e);
		if (n) return new t(this.left, n);
	}, t.prototype.leafPrepend = function(e) {
		var n = this.left.leafPrepend(e);
		if (n) return new t(n, this.right);
	}, t.prototype.appendInner = function(e) {
		return this.left.depth >= Math.max(this.right.depth, e.depth) + 1 ? new t(this.left, new t(this.right, e)) : new t(this, e);
	}, t;
}(K), Em = 500, Dm = class e {
	constructor(e, t) {
		this.items = e, this.eventCount = t;
	}
	popEvent(t, n) {
		if (this.eventCount == 0) return null;
		let r = this.items.length;
		for (;; r--) if (this.items.get(r - 1).selection) {
			--r;
			break;
		}
		let i, a;
		n && (i = this.remapping(r, this.items.length), a = i.maps.length);
		let o = t.tr, s, c, l = [], u = [];
		return this.items.forEach((t, n) => {
			if (!t.step) {
				i || (i = this.remapping(r, n + 1), a = i.maps.length), a--, u.push(t);
				return;
			}
			if (i) {
				u.push(new km(t.map));
				let e = t.step.map(i.slice(a)), n;
				e && o.maybeStep(e).doc && (n = o.mapping.maps[o.mapping.maps.length - 1], l.push(new km(n, void 0, void 0, l.length + u.length))), a--, n && i.appendMap(n, a);
			} else o.maybeStep(t.step);
			if (t.selection) return s = i ? t.selection.map(i.slice(a)) : t.selection, c = new e(this.items.slice(0, r).append(u.reverse().concat(l)), this.eventCount - 1), !1;
		}, this.items.length, 0), {
			remaining: c,
			transform: o,
			selection: s
		};
	}
	addTransform(t, n, r, i) {
		let a = [], o = this.eventCount, s = this.items, c = !i && s.length ? s.get(s.length - 1) : null;
		for (let e = 0; e < t.steps.length; e++) {
			let r = t.steps[e].invert(t.docs[e]), l = new km(t.mapping.maps[e], r, n), u;
			(u = c && c.merge(l)) && (l = u, e ? a.pop() : s = s.slice(0, s.length - 1)), a.push(l), n &&= (o++, void 0), i || (c = l);
		}
		let l = o - r.depth;
		return l > jm && (s = Om(s, l), o -= l), new e(s.append(a), o);
	}
	remapping(e, t) {
		let n = new ht();
		return this.items.forEach((t, r) => {
			let i = t.mirrorOffset != null && r - t.mirrorOffset >= e ? n.maps.length - t.mirrorOffset : void 0;
			n.appendMap(t.map, i);
		}, e, t), n;
	}
	addMaps(t) {
		return this.eventCount == 0 ? this : new e(this.items.append(t.map((e) => new km(e))), this.eventCount);
	}
	rebased(t, n) {
		if (!this.eventCount) return this;
		let r = [], i = Math.max(0, this.items.length - n), a = t.mapping, o = t.steps.length, s = this.eventCount;
		this.items.forEach((e) => {
			e.selection && s--;
		}, i);
		let c = n;
		this.items.forEach((e) => {
			let n = a.getMirror(--c);
			if (n == null) return;
			o = Math.min(o, n);
			let i = a.maps[n];
			if (e.step) {
				let o = t.steps[n].invert(t.docs[n]), l = e.selection && e.selection.map(a.slice(c + 1, n));
				l && s++, r.push(new km(i, o, l));
			} else r.push(new km(i));
		}, i);
		let l = [];
		for (let e = n; e < o; e++) l.push(new km(a.maps[e]));
		let u = this.items.slice(0, i).append(l).append(r), d = new e(u, s);
		return d.emptyItemCount() > Em && (d = d.compress(this.items.length - r.length)), d;
	}
	emptyItemCount() {
		let e = 0;
		return this.items.forEach((t) => {
			t.step || e++;
		}), e;
	}
	compress(t = this.items.length) {
		let n = this.remapping(0, t), r = n.maps.length, i = [], a = 0;
		return this.items.forEach((e, o) => {
			if (o >= t) i.push(e), e.selection && a++;
			else if (e.step) {
				let t = e.step.map(n.slice(r)), o = t && t.getMap();
				if (r--, o && n.appendMap(o, r), t) {
					let s = e.selection && e.selection.map(n.slice(r));
					s && a++;
					let c = new km(o.invert(), t, s), l, u = i.length - 1;
					(l = i.length && i[u].merge(c)) ? i[u] = l : i.push(c);
				}
			} else e.map && r--;
		}, this.items.length, 0), new e(K.from(i.reverse()), a);
	}
};
Dm.empty = new Dm(K.empty, 0);
function Om(e, t) {
	let n;
	return e.forEach((e, r) => {
		if (e.selection && t-- == 0) return n = r, !1;
	}), e.slice(n);
}
var km = class e {
	constructor(e, t, n, r) {
		this.map = e, this.step = t, this.selection = n, this.mirrorOffset = r;
	}
	merge(t) {
		if (this.step && t.step && !t.selection) {
			let n = t.step.merge(this.step);
			if (n) return new e(n.getMap().invert(), n, this.selection);
		}
	}
}, Am = class {
	constructor(e, t, n, r, i) {
		this.done = e, this.undone = t, this.prevRanges = n, this.prevTime = r, this.prevComposition = i;
	}
}, jm = 20;
function Mm(e, t, n, r) {
	let i = n.getMeta(Vm), a;
	if (i) return i.historyState;
	n.getMeta(Hm) && (e = new Am(e.done, e.undone, null, 0, -1));
	let o = n.getMeta("appendedTransaction");
	if (n.steps.length == 0) return e;
	if (o && o.getMeta(Vm)) return o.getMeta(Vm).redo ? new Am(e.done.addTransform(n, void 0, r, zm(t)), e.undone, Pm(n.mapping.maps), e.prevTime, e.prevComposition) : new Am(e.done, e.undone.addTransform(n, void 0, r, zm(t)), null, e.prevTime, e.prevComposition);
	if (n.getMeta("addToHistory") !== !1 && !(o && o.getMeta("addToHistory") === !1)) {
		let i = n.getMeta("composition"), a = e.prevTime == 0 || !o && e.prevComposition != i && (e.prevTime < (n.time || 0) - r.newGroupDelay || !Nm(n, e.prevRanges)), s = o ? Fm(e.prevRanges, n.mapping) : Pm(n.mapping.maps);
		return new Am(e.done.addTransform(n, a ? t.selection.getBookmark() : void 0, r, zm(t)), Dm.empty, s, n.time, i ?? e.prevComposition);
	}
	return (a = n.getMeta("rebased")) ? new Am(e.done.rebased(n, a), e.undone.rebased(n, a), Fm(e.prevRanges, n.mapping), e.prevTime, e.prevComposition) : new Am(e.done.addMaps(n.mapping.maps), e.undone.addMaps(n.mapping.maps), Fm(e.prevRanges, n.mapping), e.prevTime, e.prevComposition);
}
function Nm(e, t) {
	if (!t) return !1;
	if (!e.docChanged) return !0;
	let n = !1;
	return e.mapping.maps[0].forEach((e, r) => {
		for (let i = 0; i < t.length; i += 2) e <= t[i + 1] && r >= t[i] && (n = !0);
	}), n;
}
function Pm(e) {
	let t = [];
	for (let n = e.length - 1; n >= 0 && t.length == 0; n--) e[n].forEach((e, n, r, i) => t.push(r, i));
	return t;
}
function Fm(e, t) {
	if (!e) return null;
	let n = [];
	for (let r = 0; r < e.length; r += 2) {
		let i = t.map(e[r], 1), a = t.map(e[r + 1], -1);
		i <= a && n.push(i, a);
	}
	return n;
}
function Im(e, t, n) {
	let r = zm(t), i = Vm.get(t).spec.config, a = (n ? e.undone : e.done).popEvent(t, r);
	if (!a) return null;
	let o = a.selection.resolve(a.transform.doc), s = (n ? e.done : e.undone).addTransform(a.transform, t.selection.getBookmark(), i, r), c = new Am(n ? s : a.remaining, n ? a.remaining : s, null, 0, -1);
	return a.transform.setSelection(o).setMeta(Vm, {
		redo: n,
		historyState: c
	});
}
var Lm = !1, Rm = null;
function zm(e) {
	let t = e.plugins;
	if (Rm != t) {
		Lm = !1, Rm = t;
		for (let e = 0; e < t.length; e++) if (t[e].spec.historyPreserveItems) {
			Lm = !0;
			break;
		}
	}
	return Lm;
}
function Bm(e) {
	return e.setMeta(Hm, !0);
}
var Vm = new M("history"), Hm = new M("closeHistory");
function Um(e = {}) {
	return e = {
		depth: e.depth || 100,
		newGroupDelay: e.newGroupDelay || 500
	}, new j({
		key: Vm,
		state: {
			init() {
				return new Am(Dm.empty, Dm.empty, null, 0, -1);
			},
			apply(t, n, r) {
				return Mm(n, r, t, e);
			}
		},
		config: e,
		props: { handleDOMEvents: { beforeinput(e, t) {
			let n = t.inputType, r = n == "historyUndo" ? Gm : n == "historyRedo" ? Km : null;
			return !r || !e.editable ? !1 : (t.preventDefault(), r(e.state, e.dispatch));
		} } }
	});
}
function Wm(e, t) {
	return (n, r) => {
		let i = Vm.getState(n);
		if (!i || (e ? i.undone : i.done).eventCount == 0) return !1;
		if (r) {
			let a = Im(i, n, e);
			a && r(t ? a.scrollIntoView() : a);
		}
		return !0;
	};
}
var Gm = Wm(!1, !0), Km = Wm(!0, !0), qm = Wm(!1, !1), Jm = Wm(!0, !1);
function Ym(e) {
	let t = Vm.getState(e);
	return t ? t.done.eventCount : 0;
}
function Xm(e) {
	let t = Vm.getState(e);
	return t ? t.undone.eventCount : 0;
}
function Zm(e) {
	return e.getMeta(Vm) != null;
}
//#endregion
//#region ../../node_modules/@tiptap/pm/dist/history/index.js
var Qm = /* @__PURE__ */ t({
	closeHistory: () => Bm,
	history: () => Um,
	isHistoryTransaction: () => Zm,
	redo: () => Km,
	redoDepth: () => Xm,
	redoNoScroll: () => Jm,
	undo: () => Gm,
	undoDepth: () => Ym,
	undoNoScroll: () => qm
});
W.create({
	name: "characterCount",
	addOptions() {
		return {
			limit: null,
			autoTrim: !0,
			mode: "textSize",
			textCounter: (e) => e.length,
			wordCounter: (e) => e.split(" ").filter((e) => e !== "").length
		};
	},
	addStorage() {
		return {
			characters: () => 0,
			words: () => 0
		};
	},
	onBeforeCreate() {
		this.storage.characters = (e) => {
			let t = e?.node || this.editor.state.doc;
			if ((e?.mode || this.options.mode) === "textSize") {
				let e = t.textBetween(0, t.content.size, void 0, " ");
				return this.options.textCounter(e);
			}
			return t.nodeSize;
		}, this.storage.words = (e) => {
			let t = e?.node || this.editor.state.doc, n = t.textBetween(0, t.content.size, " ", " ");
			return this.options.wordCounter(n);
		};
	},
	addProseMirrorPlugins() {
		let e = !1;
		return [new j({
			key: new M("characterCount"),
			appendTransaction: (t, n, r) => {
				if (e) return;
				let i = this.options.limit, a = this.options.autoTrim;
				if (i == null || i === 0 || a === !1) {
					e = !0;
					return;
				}
				let o = this.storage.characters({ node: r.doc });
				if (o > i) {
					let t = o - i;
					console.warn(`[CharacterCount] Initial content exceeded limit of ${i} characters. Content was automatically trimmed.`);
					let n = r.tr.deleteRange(0, t);
					return e = !0, n;
				}
				e = !0;
			},
			filterTransaction: (e, t) => {
				let n = this.options.limit;
				if (!e.docChanged || n === 0 || n == null) return !0;
				let r = this.storage.characters({ node: t.doc }), i = this.storage.characters({ node: e.doc });
				if (i <= n || r > n && i > n && i <= r) return !0;
				if (r > n && i > n && i > r || !e.getMeta("paste")) return !1;
				let a = e.selection.$head.pos, o = a - (i - n), s = a;
				return e.deleteRange(o, s), !(this.storage.characters({ node: e.doc }) > n);
			}
		})];
	}
});
var $m = W.create({
	name: "dropCursor",
	addOptions() {
		return {
			color: "currentColor",
			width: 1,
			class: void 0
		};
	},
	addProseMirrorPlugins() {
		return [cm(this.options)];
	}
});
W.create({
	name: "focus",
	addOptions() {
		return {
			className: "has-focus",
			mode: "all"
		};
	},
	addProseMirrorPlugins() {
		return [new j({
			key: new M("focus"),
			props: { decorations: ({ doc: e, selection: t }) => {
				let { isEditable: n, isFocused: r } = this.editor, { anchor: i } = t, a = [];
				if (!n || !r) return L.create(e, []);
				let o = 0;
				this.options.mode === "deepest" && e.descendants((e, t) => {
					if (!e.isText) {
						if (!(i >= t && i <= t + e.nodeSize - 1)) return !1;
						o += 1;
					}
				});
				let s = 0;
				return e.descendants((e, t) => {
					if (e.isText || !(i >= t && i <= t + e.nodeSize - 1)) return !1;
					if (s += 1, this.options.mode === "deepest" && o - s > 0 || this.options.mode === "shallowest" && s > 1) return this.options.mode === "deepest";
					a.push(I.node(t, t + e.nodeSize, { class: this.options.className }));
				}), L.create(e, a);
			} }
		})];
	}
});
var eh = W.create({
	name: "gapCursor",
	addProseMirrorPlugins() {
		return [gm()];
	},
	extendNodeSchema(e) {
		return { allowGapCursor: H(V(e, "allowGapCursor", {
			name: e.name,
			options: e.options,
			storage: e.storage
		})) ?? null };
	}
}), th = "placeholder", nh = new M("tiptap__placeholder");
function rh(e) {
	let { editor: t, placeholder: n, dataAttribute: r, pos: i, node: a, isEmptyDoc: o, hasAnchor: s, classes: { emptyNode: c, emptyEditor: l } } = e, u = [c];
	return o && u.push(l), I.node(i, i + a.nodeSize, {
		class: u.join(" "),
		[r]: typeof n == "function" ? n({
			editor: t,
			node: a,
			pos: i,
			hasAnchor: s
		}) : n
	});
}
function ih(e, t) {
	return typeof e == "function" ? e(t) : e;
}
function ah({ editor: e, options: t, dataAttribute: n, doc: r, selection: i, from: a, to: o }) {
	let { anchor: s } = i, c = [], l = e.isEmpty;
	return r.nodesBetween(a, o, (r, i) => {
		let a = s >= i && s <= i + r.nodeSize, o = !r.isLeaf && Gu(r);
		return r.type.isTextblock && (a || !t.showOnlyCurrent) && o && c.push(rh({
			editor: e,
			isEmptyDoc: l,
			dataAttribute: n,
			hasAnchor: a,
			placeholder: t.placeholder,
			classes: {
				emptyEditor: t.emptyEditorClass,
				emptyNode: ih(t.emptyNodeClass, {
					editor: e,
					node: r,
					pos: i,
					hasAnchor: a
				})
			},
			node: r,
			pos: i
		})), t.includeChildren;
	}), c;
}
function oh({ editor: e, options: t, dataAttribute: n, doc: r, selection: i }) {
	if (!e.isEditable && t.showOnlyWhenEditable) return null;
	let { anchor: a } = i, o = [], s = e.isEmpty;
	if (t.showOnlyCurrent && !t.includeChildren) {
		let i = r.resolve(a), c = i.depth > 0 ? i.node(1) : i.nodeAfter, l = i.depth > 0 ? i.before(1) : a;
		if (c && c.type.isTextblock && Gu(c)) {
			let r = a >= l && a <= l + c.nodeSize;
			o.push(rh({
				editor: e,
				isEmptyDoc: s,
				dataAttribute: n,
				hasAnchor: r,
				placeholder: t.placeholder,
				classes: {
					emptyEditor: t.emptyEditorClass,
					emptyNode: ih(t.emptyNodeClass, {
						editor: e,
						node: c,
						pos: l,
						hasAnchor: r
					})
				},
				node: c,
				pos: l
			}));
		}
	} else o.push(...ah({
		editor: e,
		options: t,
		dataAttribute: n,
		doc: r,
		selection: i,
		from: 0,
		to: r.content.size
	}));
	return L.create(r, o);
}
function sh(e, t) {
	let n = e.resolve(t);
	if (n.depth === 0) {
		let e = n.nodeAfter ?? n.nodeBefore;
		if (!e) return {
			from: t,
			to: t
		};
		let r = n.nodeAfter ? t : t - e.nodeSize;
		return {
			from: r,
			to: r + e.nodeSize
		};
	}
	let r = n.before(1);
	return {
		from: r,
		to: r + n.node(1).nodeSize
	};
}
function ch(e, t) {
	return {
		from: Math.max(0, t.from - 1),
		to: Math.min(e.content.size, t.to - 1)
	};
}
function lh(e, t, n) {
	let r = [];
	return e.forEach((e, i) => {
		let a = i, o = a + e.nodeSize, s = a + 1, c = o + 1;
		s < n && c > t && r.push({
			from: a,
			to: o
		});
	}), r;
}
function uh(e) {
	if (e.length === 0) return [];
	let t = [...e].sort((e, t) => e.from - t.from), n = [{ ...t[0] }];
	for (let e = 1; e < t.length; e += 1) {
		let r = n[n.length - 1], i = t[e];
		i.from <= r.to ? r.to = Math.max(r.to, i.to) : n.push({ ...i });
	}
	return n;
}
function dh(e, t) {
	let n = lh(e, t.from, t.to);
	return n.push(ch(e, sh(e, t.from))), t.to > t.from ? n.push(ch(e, sh(e, Math.min(t.to, e.content.size + 1) - 1))) : t.from < e.content.size + 1 && n.push(ch(e, sh(e, Math.min(t.from + 1, e.content.size)))), n;
}
function fh(e, t, n) {
	let r = [];
	if (e.docChanged) {
		let t = ju(e);
		for (let e of t) r.push(...dh(n.doc, e.newRange));
	}
	return e.selectionSet && (r.push(ch(n.doc, sh(n.doc, e.mapping.map(t.selection.anchor)))), r.push(ch(n.doc, sh(n.doc, n.selection.anchor)))), uh(r);
}
function ph(e, t, n) {
	let r = Math.max(0, Math.min(e, n.content.size));
	return {
		from: r,
		to: Math.max(r, Math.min(t, n.content.size))
	};
}
function mh({ decorations: e, ranges: t, editor: n, options: r, dataAttribute: i, doc: a, selection: o }) {
	let s = e;
	for (let e of t) {
		let { from: t, to: c } = ph(e.from, e.to, a), l = s.find(t, c).filter((e) => e.from >= t && e.to <= c);
		l.length && (s = s.remove(l));
		let u = ah({
			editor: n,
			options: r,
			dataAttribute: i,
			doc: a,
			selection: o,
			from: t,
			to: c
		});
		u.length && (s = s.add(a, u));
	}
	return s;
}
function hh({ editor: e, options: t, dataAttribute: n }) {
	return {
		init(r, i) {
			return oh({
				editor: e,
				options: t,
				dataAttribute: n,
				doc: i.doc,
				selection: i.selection
			}) ?? L.empty;
		},
		apply(r, i, a, o) {
			return !r.docChanged && !r.selectionSet ? i : mh({
				decorations: i.map(r.mapping, r.doc),
				ranges: fh(r, a, o),
				editor: e,
				options: t,
				dataAttribute: n,
				doc: o.doc,
				selection: o.selection
			});
		}
	};
}
function gh(e) {
	return e.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").replace(/^[0-9-]+/, "").replace(/^-+/, "").toLowerCase();
}
function _h({ editor: e, options: t }) {
	let n = t.dataAttribute ? `data-${gh(t.dataAttribute)}` : `data-${th}`, r = t.showOnlyCurrent && !t.includeChildren;
	return new j({
		key: nh,
		...r ? {} : { state: hh({
			editor: e,
			options: t,
			dataAttribute: n
		}) },
		props: { decorations: r ? ({ doc: r, selection: i }) => oh({
			editor: e,
			options: t,
			dataAttribute: n,
			doc: r,
			selection: i
		}) : (n) => t.showOnlyWhenEditable && !e.isEditable ? L.empty : nh.getState(n) ?? L.empty }
	});
}
var vh = W.create({
	name: "placeholder",
	addOptions() {
		return {
			emptyEditorClass: "is-editor-empty",
			emptyNodeClass: "is-empty",
			dataAttribute: th,
			placeholder: "Write something …",
			showOnlyWhenEditable: !0,
			showOnlyCurrent: !0,
			includeChildren: !1
		};
	},
	addProseMirrorPlugins() {
		return [_h({
			editor: this.editor,
			options: this.options
		})];
	}
});
function yh(e, t) {
	return !e.selection.empty && !Ku(e.selection) && t.isEditable;
}
function bh(e, t) {
	return yh(e, t) && !t.isFocused && !t.view.dragging;
}
function xh() {
	var e;
	(e = window.getSelection()) == null || e.removeAllRanges();
}
function Sh(e) {
	e.focus();
}
W.create({
	name: "selection",
	addOptions() {
		return { className: "selection" };
	},
	addProseMirrorPlugins() {
		let { editor: e, options: t } = this;
		return [new j({
			key: new M("selection"),
			props: {
				decorations(n) {
					return bh(n, e) ? L.create(n.doc, [I.inline(n.selection.from, n.selection.to, { class: t.className })]) : null;
				},
				handleDOMEvents: {
					blur(t) {
						return yh(t.state, e) && xh(), !1;
					},
					focus(t) {
						return yh(t.state, e) && requestAnimationFrame(() => {
							!e.isDestroyed && t.hasFocus() && Sh(t);
						}), !1;
					}
				}
			}
		})];
	}
});
function Ch({ types: e, node: t }) {
	return t && Array.isArray(e) && e.includes(t.type) || t?.type === e;
}
W.create({
	name: "trailingNode",
	addOptions() {
		return {
			node: void 0,
			notAfter: []
		};
	},
	addProseMirrorPlugins() {
		let e = new M(this.name), t = this.options.node || this.editor.schema.topNodeType.contentMatch.defaultType?.name || "paragraph", n = Object.entries(this.editor.schema.nodes).map(([, e]) => e).filter((e) => (this.options.notAfter || []).concat(t).includes(e.name));
		return [new j({
			key: e,
			appendTransaction: (n, r, i) => {
				let { doc: a, tr: o, schema: s } = i, c = e.getState(i), l = a.content.size, u = s.nodes[t];
				if (!n.some((e) => e.getMeta("skipTrailingNode")) && c) return o.insert(l, u.create());
			},
			state: {
				init: (e, t) => {
					let r = t.tr.doc.lastChild;
					return !Ch({
						node: r,
						types: n
					});
				},
				apply: (e, t) => {
					if (!e.docChanged || e.getMeta("__uniqueIDTransaction")) return t;
					let r = e.doc.lastChild;
					return !Ch({
						node: r,
						types: n
					});
				}
			}
		})];
	}
});
var wh = W.create({
	name: "undoRedo",
	addOptions() {
		return {
			depth: 100,
			newGroupDelay: 500
		};
	},
	addCommands() {
		return {
			undo: () => ({ state: e, dispatch: t }) => Gm(e, t),
			redo: () => ({ state: e, dispatch: t }) => Km(e, t)
		};
	},
	addProseMirrorPlugins() {
		return [Um(this.options)];
	},
	addKeyboardShortcuts() {
		return {
			"Mod-z": () => this.editor.commands.undo(),
			"Shift-Mod-z": () => this.editor.commands.redo(),
			"Mod-y": () => this.editor.commands.redo(),
			"Mod-я": () => this.editor.commands.undo(),
			"Shift-Mod-я": () => this.editor.commands.redo()
		};
	}
}), Th = /* @__PURE__ */ new Map();
function Eh(e, t) {
	Th.set(e, t);
}
var Dh = /* @__PURE__ */ new Map();
function Oh(e, t) {
	Dh.set(e, [...Dh.get(e) ?? [], t]);
}
function kh(e, t) {
	let n = [], r = [];
	return e.forEach(({ id: e, options: i }) => {
		let a = Th.get(e);
		if (!a) {
			console.error(`[rich-editor-plus] No JS extension is registered for [${e}].`), r.push(e);
			return;
		}
		n.push(...[].concat(a(i ?? {}, t)).map((n) => (Dh.get(e) ?? []).reduce((e, n) => n(e, {
			options: i ?? {},
			tiptap: t
		}) ?? e, n)));
	}), {
		extensions: [...new Map(n.map((e) => [e.name, e])).values()],
		missing: r
	};
}
var Ah = /* @__PURE__ */ new Map();
function jh(e, t) {
	let n = [...new Set(e.flatMap(({ modules: e }) => e ?? []))];
	return Promise.all(n.map((e) => (Ah.has(e) || Ah.set(e, import(
		/* @vite-ignore */
		e
).then((e) => {
		typeof e.default == "function" && e.default(t);
	}).catch((t) => {
		Ah.delete(e), console.error(`[rich-editor-plus] Could not load the plugin module [${e}].`, t);
	})), Ah.get(e))));
}
var Mh = /* @__PURE__ */ new Map();
function Nh(e, t) {
	Mh.set(e, t);
}
function Ph(e, t) {
	return Mh.get(e)?.(t) ?? {};
}
//#endregion
//#region resources/js/blocks/active-block.js
function Fh({ selection: e, doc: t }) {
	return e instanceof A && e.$from.depth === 0 ? {
		node: e.node,
		pos: e.from
	} : e.$from.depth < 1 ? e.empty || !t.firstChild ? null : {
		node: t.firstChild,
		pos: 0
	} : {
		node: e.$from.node(1),
		pos: e.$from.before(1)
	};
}
function Ih({ $from: e }) {
	for (let t = e.depth; t > 0; t--) {
		let { name: n } = e.node(t).type;
		if (n === "listItem" || n === "blockquote") return {
			name: n,
			depth: t
		};
	}
	return null;
}
function Lh(e) {
	let t = Ih(e);
	return t?.name === "listItem" ? e.$from.node(t.depth - 1) : null;
}
function Rh({ selection: e }) {
	return e instanceof A && e.node.isBlock && e.$from.depth > 0;
}
function zh({ selection: e, doc: t }) {
	let n = 0, r = !1;
	return t.forEach((t, i) => {
		i < e.to && i + t.nodeSize > e.from && (n++, r ||= t.type.name !== "paragraph");
	}), n > 1 && !r ? n : 0;
}
function Bh({ selection: e, doc: t }) {
	let n = Fh({
		selection: e,
		doc: t
	});
	return !!n && e.to > n.pos + n.node.nodeSize;
}
//#endregion
//#region resources/js/blocks/block-types.js
var Vh = (e) => Object.entries(e).map(([e, t]) => ({
	name: e,
	...t
}));
function Hh(e, t) {
	return e.find(({ node: { name: e, attributes: n } }) => e === t.type.name && Object.entries(n ?? {}).every(([e, n]) => t.attrs[e] === n));
}
function Uh(e, t) {
	return t.action || typeof e.chain()[t.command] == "function" ? !0 : (console.warn(`[rich-editor-plus] The editor has no [${t.command}] command.`), !1);
}
function Wh(e, t) {
	let n = [], r = (e, r) => {
		if (!e.type.spec.code) {
			n.push({
				start: r,
				size: e.content.size,
				content: e.content
			});
			return;
		}
		let i = r;
		e.textContent.split("\n").forEach((e) => {
			n.push({
				start: i,
				size: e.length,
				content: e === "" ? null : t.text(e)
			}), i += e.length + 1;
		});
	};
	return e.node.isTextblock ? r(e.node, e.pos + 1) : e.node.descendants((t, n) => !t.isTextblock || (r(t, e.pos + 2 + n), !1)), n.length ? n : [{
		start: e.pos + 1,
		size: 0,
		content: null
	}];
}
function Gh(e, t) {
	let { schema: n } = e.doc.type, r = Wh(t, n);
	e.replaceWith(t.pos, t.pos + t.node.nodeSize, r.map(({ content: e }) => n.nodes.paragraph.create(null, e)));
	let i = t.pos + 1, a = r.map((e) => {
		let t = {
			...e,
			contentStart: i
		};
		return i += e.size + 2, t;
	});
	return {
		end: i - 1,
		mapPosition: (e) => {
			let t = a.find(({ start: t, size: n }) => e >= t && e <= t + n) ?? a[0];
			return t.contentStart + Math.min(Math.max(e - t.start, 0), t.size);
		}
	};
}
function Kh(e, t, n) {
	let { state: r } = e;
	if (zh(r)) return !!t.multiBlock && Uh(e, t) && e.chain().focus()[t.command](...t.arguments ?? []).run();
	let i = Fh(r);
	if (!i || !t.switchable || Bh(r) || Rh(r) || !Uh(e, t)) return !1;
	let a = Hh(n, i.node);
	if (!a?.switchable || a.name === t.name) return !1;
	let { anchor: o, head: s } = r.selection, c, l, u, d = e.chain().focus().command(({ tr: e }) => {
		let { end: t, mapPosition: n } = Gh(e, i);
		return c = n(o), l = n(s), u = e.mapping.maps.length, e.setSelection(k.between(e.doc.resolve(i.pos), e.doc.resolve(t))), !0;
	});
	return t.node.name !== "paragraph" && d[t.command](...t.arguments ?? []), d.command(({ tr: e }) => {
		let t = e.mapping.slice(u);
		return e.setSelection(k.between(e.doc.resolve(t.map(c)), e.doc.resolve(t.map(l)))), !0;
	}).run(), !0;
}
function qh(e, t, n, r) {
	return Uh(e, t) ? t.action ? (r(t.action, Ph(t.action, e)), !0) : t.switchable ? Kh(e, t, n) : e.chain().focus()[t.command](...t.arguments ?? []).run() : !1;
}
//#endregion
//#region resources/js/content-check.js
function Jh(e) {
	return e === "json";
}
function Yh(e, t) {
	let n = null, r = new Np({
		...e,
		enableContentCheck: Jh(t),
		onContentError: ({ error: e }) => {
			n = e;
		}
	});
	return n ? (console.error("[rich-editor-plus] The stored content does not fit this editor.", n), r.destroy(), {
		editor: null,
		error: n
	}) : {
		editor: r,
		error: null
	};
}
function Xh(e, t, n) {
	try {
		return e.commands.setContent(t, {
			emitUpdate: !1,
			errorOnInvalidContent: Jh(n)
		});
	} catch (t) {
		return console.error("[rich-editor-plus] The new content does not fit this editor.", t), e.setEditable(!1, !1), e.view.dispatch(e.state.tr), !1;
	}
}
//#endregion
//#region ../../node_modules/@tiptap/core/dist/jsx-runtime/jsx-runtime.js
var Zh = /* @__PURE__ */ new WeakSet(), Qh = /* @__PURE__ */ new WeakSet();
function $h(e) {
	let t = e;
	return Zh.add(t), t;
}
function eg(e) {
	return Array.isArray(e) && Zh.has(e);
}
function tg(e) {
	return e.flatMap((e) => e == null ? [] : Array.isArray(e) && Qh.has(e) && !eg(e) ? tg(e) : [e]);
}
function ng(e, t) {
	if (e === "slot") return 0;
	if (e instanceof Function) {
		let n = e(t);
		return Array.isArray(n) && !eg(n) && !Qh.has(n) ? $h(n) : n;
	}
	let { children: n, ...r } = t ?? {};
	if (e === "svg") throw Error("SVG elements are not supported in the JSX syntax, use the array syntax instead");
	if (Array.isArray(n)) {
		if (eg(n)) return $h([
			e,
			r,
			n
		]);
		if (n.length === 0) return $h([e, r]);
		let t = tg(n);
		return t.length === 0 ? $h([e, r]) : $h([
			e,
			r,
			...t
		]);
	}
	return $h(n == null ? [e, r] : [
		e,
		r,
		n
	]);
}
var rg = (e, t) => ng(e, t), ig = (e, t) => {
	let { state: n } = e, { selection: r } = n;
	if (!r.empty) return !1;
	let { $from: i } = r;
	if (i.parentOffset !== 0) return !1;
	let a = i.depth - 1;
	if (a < 0) return !1;
	let o = i.node(a), s = i.index(a);
	if (s === 0) return !1;
	if (o.type === t) return e.commands.lift(t.name);
	let c = o.child(s - 1);
	if (c.type !== t || !c.lastChild?.isTextblock) return !1;
	let l = i.before() - 1 - 1;
	return e.commands.command(({ tr: e, dispatch: t }) => {
		if (!t) return !0;
		let n = i.parent.content, r = new h(n, 0, 0);
		return e.replace(l, i.after(), r), e.setSelection(k.create(e.doc, l + n.size)), e.scrollIntoView(), t(e), !0;
	});
}, ag = /^\s*>\s$/, og = G.create({
	name: "blockquote",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	content: "block+",
	group: "block",
	defining: !0,
	parseHTML() {
		return [{ tag: "blockquote" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return /* @__PURE__ */ rg("blockquote", {
			...U(this.options.HTMLAttributes, e),
			children: /* @__PURE__ */ rg("slot", {})
		});
	},
	parseMarkdown: (e, t) => {
		let n = t.parseBlockChildren ?? t.parseChildren;
		return t.createNode("blockquote", void 0, n(e.tokens || []));
	},
	renderMarkdown: (e, t) => {
		if (!e.content) return "";
		let n = [];
		return e.content.forEach((e, r) => {
			let i = (t.renderChild?.call(t, e, r) ?? t.renderChildren([e])).split("\n").map((e) => e.trim() === "" ? ">" : `> ${e}`);
			n.push(i.join("\n"));
		}), n.join("\n>\n");
	},
	addCommands() {
		return {
			setBlockquote: () => ({ commands: e }) => e.wrapIn(this.name),
			toggleBlockquote: () => ({ commands: e }) => e.toggleWrap(this.name),
			unsetBlockquote: () => ({ commands: e }) => e.lift(this.name)
		};
	},
	addKeyboardShortcuts() {
		return {
			"Mod-Shift-b": () => this.editor.commands.toggleBlockquote(),
			Backspace: () => ig(this.editor, this.type)
		};
	},
	addInputRules() {
		return [Gp({
			find: ag,
			type: this.type
		})];
	}
}), sg = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))$/, cg = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))/g, lg = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/, ug = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))/g, dg = lp.create({
	name: "bold",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	parseHTML() {
		return [
			{ tag: "strong" },
			{
				tag: "b",
				getAttrs: (e) => e.style.fontWeight !== "normal" && null
			},
			{
				style: "font-weight=400",
				clearMark: (e) => e.type.name === this.name
			},
			{
				style: "font-weight",
				getAttrs: (e) => /^(bold(er)?|[5-9]\d{2,})$/.test(e) && null
			}
		];
	},
	renderHTML({ HTMLAttributes: e }) {
		return /* @__PURE__ */ rg("strong", {
			...U(this.options.HTMLAttributes, e),
			children: /* @__PURE__ */ rg("slot", {})
		});
	},
	markdownTokenName: "strong",
	parseMarkdown: (e, t) => t.applyMark("bold", t.parseInline(e.tokens || [])),
	markdownOptions: { htmlReopen: {
		open: "<strong>",
		close: "</strong>"
	} },
	renderMarkdown: (e, t) => `**${t.renderChildren(e)}**`,
	addCommands() {
		return {
			setBold: () => ({ commands: e }) => e.setMark(this.name),
			toggleBold: () => ({ commands: e }) => e.toggleMark(this.name),
			unsetBold: () => ({ commands: e }) => e.unsetMark(this.name)
		};
	},
	addKeyboardShortcuts() {
		return {
			"Mod-b": () => this.editor.commands.toggleBold(),
			"Mod-B": () => this.editor.commands.toggleBold()
		};
	},
	addInputRules() {
		return [Vp({
			find: sg,
			type: this.type
		}), Vp({
			find: lg,
			type: this.type
		})];
	},
	addPasteRules() {
		return [im({
			find: cg,
			type: this.type
		}), im({
			find: ug,
			type: this.type
		})];
	}
}), fg = 4, pg = /^```([a-z]+)?[\s\n]$/, mg = /^~~~([a-z]+)?[\s\n]$/, hg = G.create({
	name: "codeBlock",
	addOptions() {
		return {
			languageClassPrefix: "language-",
			exitOnTripleEnter: !0,
			exitOnArrowDown: !0,
			exitOnArrowUp: !0,
			defaultLanguage: null,
			enableTabIndentation: !1,
			tabSize: fg,
			HTMLAttributes: {}
		};
	},
	content: "text*",
	marks: "",
	group: "block",
	code: !0,
	defining: !0,
	addAttributes() {
		return { language: {
			default: this.options.defaultLanguage,
			parseHTML: (e) => {
				let { languageClassPrefix: t } = this.options;
				return t && [...e.firstElementChild?.classList || []].filter((e) => e.startsWith(t)).map((e) => e.replace(t, ""))[0] || null;
			},
			rendered: !1
		} };
	},
	parseHTML() {
		return [{
			tag: "pre",
			preserveWhitespace: "full"
		}];
	},
	renderHTML({ node: e, HTMLAttributes: t }) {
		return [
			"pre",
			U(this.options.HTMLAttributes, t),
			[
				"code",
				{ class: e.attrs.language ? this.options.languageClassPrefix + e.attrs.language : null },
				0
			]
		];
	},
	markdownTokenName: "code",
	parseMarkdown: (e, t) => e.raw?.startsWith("```") === !1 && e.raw?.startsWith("~~~") === !1 && e.codeBlockStyle !== "indented" ? [] : t.createNode("codeBlock", { language: e.lang || null }, e.text ? [t.createTextNode(e.text)] : []),
	renderMarkdown: (e, t) => {
		let n = "", r = e.attrs?.language || "";
		return n = e.content ? [
			`\`\`\`${r}`,
			t.renderChildren(e.content),
			"```"
		].join("\n") : `\`\`\`${r}\n\n\`\`\``, n;
	},
	addCommands() {
		return {
			setCodeBlock: (e) => ({ commands: t }) => t.setNode(this.name, e),
			toggleCodeBlock: (e) => ({ commands: t }) => t.toggleNode(this.name, "paragraph", e)
		};
	},
	addKeyboardShortcuts() {
		return {
			"Mod-Alt-c": () => this.editor.commands.toggleCodeBlock(),
			Backspace: () => {
				let { empty: e, $anchor: t } = this.editor.state.selection, n = t.pos === 1;
				return !e || t.parent.type.name !== this.name ? !1 : n || !t.parent.textContent.length ? this.editor.commands.clearNodes() : !1;
			},
			Tab: ({ editor: e }) => {
				if (!this.options.enableTabIndentation) return !1;
				let t = this.options.tabSize ?? fg, { state: n } = e, { selection: r } = n, { $from: i, empty: a } = r;
				if (i.parent.type !== this.type) return !1;
				let o = " ".repeat(t);
				return a ? e.commands.insertContent(o) : e.commands.command(({ tr: e }) => {
					let { from: t, to: i } = r, a = n.doc.textBetween(t, i, "\n", "\n").split("\n").map((e) => o + e).join("\n");
					return e.replaceWith(t, i, n.schema.text(a)), !0;
				});
			},
			"Shift-Tab": ({ editor: e }) => {
				if (!this.options.enableTabIndentation) return !1;
				let t = this.options.tabSize ?? fg, { state: n } = e, { selection: r } = n, { $from: i, empty: a } = r;
				return i.parent.type === this.type ? a ? e.commands.command(({ tr: e }) => {
					let { pos: r } = i, a = i.start(), o = i.end(), s = n.doc.textBetween(a, o, "\n", "\n").split("\n"), c = 0, l = 0, u = r - a;
					for (let e = 0; e < s.length; e += 1) {
						if (l + s[e].length >= u) {
							c = e;
							break;
						}
						l += s[e].length + 1;
					}
					let d = s[c].match(/^ */)?.[0] || "", f = Math.min(d.length, t);
					if (f === 0) return !0;
					let p = a;
					for (let e = 0; e < c; e += 1) p += s[e].length + 1;
					return e.delete(p, p + f), r - p <= f && e.setSelection(k.create(e.doc, p)), !0;
				}) : e.commands.command(({ tr: e }) => {
					let { from: i, to: a } = r, o = n.doc.textBetween(i, a, "\n", "\n").split("\n").map((e) => {
						let n = e.match(/^ */)?.[0] || "", r = Math.min(n.length, t);
						return e.slice(r);
					}).join("\n");
					return e.replaceWith(i, a, n.schema.text(o)), !0;
				}) : !1;
			},
			Enter: ({ editor: e }) => {
				if (!this.options.exitOnTripleEnter) return !1;
				let { state: t } = e, { selection: n } = t, { $from: r, empty: i } = n;
				if (!i || r.parent.type !== this.type) return !1;
				let a = r.parentOffset === r.parent.nodeSize - 2, o = r.parent.textContent.endsWith("\n\n");
				return !a || !o ? !1 : e.chain().command(({ tr: e }) => (e.delete(r.pos - 2, r.pos), !0)).exitCode().run();
			},
			ArrowUp: ({ editor: e }) => {
				if (!this.options.exitOnArrowUp) return !1;
				let { state: t } = e, { selection: n } = t, { $from: r, empty: i } = n;
				if (!i || r.parent.type !== this.type || r.parentOffset !== 0) return !1;
				let a = r.before();
				return a > 0 ? !1 : e.commands.insertDefaultBlock({ pos: a });
			},
			ArrowDown: ({ editor: e }) => {
				if (!this.options.exitOnArrowDown) return !1;
				let { state: t } = e, { selection: n, doc: r } = t, { $from: i, empty: a } = n;
				if (!a || i.parent.type !== this.type || i.parentOffset !== i.parent.nodeSize - 2) return !1;
				let o = i.after();
				return o === void 0 ? !1 : r.nodeAt(o) ? e.commands.command(({ tr: e }) => (e.setSelection(O.near(r.resolve(o))), !0)) : e.commands.exitCode();
			}
		};
	},
	addInputRules() {
		return [Up({
			find: pg,
			type: this.type,
			getAttributes: (e) => ({ language: e[1] })
		}), Up({
			find: mg,
			type: this.type,
			getAttributes: (e) => ({ language: e[1] })
		})];
	},
	addProseMirrorPlugins() {
		return [new j({
			key: new M("codeBlockVSCodeHandler"),
			props: { handlePaste: (e, t) => {
				if (!t.clipboardData || this.editor.isActive(this.type.name)) return !1;
				let n = t.clipboardData.getData("text/plain"), r = t.clipboardData.getData("vscode-editor-data"), i = (r ? JSON.parse(r) : void 0)?.mode;
				if (!n || !i) return !1;
				let { tr: a, schema: o } = e.state, s = o.text(n.replace(/\r\n?/g, "\n"));
				return a.replaceSelectionWith(this.type.create({ language: i }, s)), a.selection.$from.parent.type !== this.type && a.setSelection(k.near(a.doc.resolve(Math.max(0, a.selection.from - 2)))), a.setMeta("paste", !0), e.dispatch(a), !0;
			} }
		})];
	}
}), gg = G.create({
	name: "doc",
	topNode: !0,
	content: "block+",
	renderMarkdown: (e, t) => e.content ? t.renderChildren(e.content, "\n\n") : ""
}), _g = G.create({
	name: "hardBreak",
	markdownTokenName: "br",
	addOptions() {
		return {
			keepMarks: !0,
			HTMLAttributes: {}
		};
	},
	inline: !0,
	group: "inline",
	selectable: !1,
	linebreakReplacement: !0,
	parseHTML() {
		return [{ tag: "br" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return ["br", U(this.options.HTMLAttributes, e)];
	},
	renderText() {
		return "\n";
	},
	renderMarkdown: () => "  \n",
	parseMarkdown: () => ({ type: "hardBreak" }),
	addCommands() {
		return { setHardBreak: () => ({ commands: e, chain: t, state: n, editor: r }) => e.first([() => e.exitCode(), () => e.command(() => {
			let { selection: e, storedMarks: i } = n;
			if (e.$from.parent.type.spec.isolating) return !1;
			let { keepMarks: a } = this.options, { splittableMarks: o } = r.extensionManager, s = i || e.$to.parentOffset && e.$from.marks();
			return t().insertContent({ type: this.name }).command(({ tr: e, dispatch: t }) => {
				if (t && s && a) {
					let t = s.filter((e) => o.includes(e.type.name));
					e.ensureMarks(t);
				}
				return !0;
			}).scrollIntoView().run();
		})]) };
	},
	addKeyboardShortcuts() {
		return {
			"Mod-Enter": () => this.editor.commands.setHardBreak(),
			"Shift-Enter": () => this.editor.commands.setHardBreak()
		};
	}
}), vg = G.create({
	name: "heading",
	addOptions() {
		return {
			levels: [
				1,
				2,
				3,
				4,
				5,
				6
			],
			HTMLAttributes: {}
		};
	},
	content: "inline*",
	group: "block",
	defining: !0,
	addAttributes() {
		return { level: {
			default: 1,
			rendered: !1
		} };
	},
	parseHTML() {
		return this.options.levels.map((e) => ({
			tag: `h${e}`,
			attrs: { level: e }
		}));
	},
	renderHTML({ node: e, HTMLAttributes: t }) {
		return [
			`h${this.options.levels.includes(e.attrs.level) ? e.attrs.level : this.options.levels[0]}`,
			U(this.options.HTMLAttributes, t),
			0
		];
	},
	parseMarkdown: (e, t) => t.createNode("heading", { level: e.depth || 1 }, t.parseInline(e.tokens || [])),
	renderMarkdown: (e, t) => {
		let n = e.attrs?.level ? parseInt(e.attrs.level, 10) : 1, r = "#".repeat(n);
		return e.content ? `${r} ${t.renderChildren(e.content)}` : "";
	},
	addCommands() {
		return {
			setHeading: (e) => ({ commands: t }) => this.options.levels.includes(e.level) ? t.setNode(this.name, e) : !1,
			toggleHeading: (e) => ({ commands: t }) => this.options.levels.includes(e.level) ? t.toggleNode(this.name, "paragraph", e) : !1
		};
	},
	addKeyboardShortcuts() {
		return this.options.levels.reduce((e, t) => ({
			...e,
			[`Mod-Alt-${t}`]: () => this.editor.commands.toggleHeading({ level: t })
		}), {});
	},
	addInputRules() {
		return this.options.levels.map((e) => Up({
			find: RegExp(`^(#{${Math.min(...this.options.levels)},${e}})\\s$`),
			type: this.type,
			getAttributes: { level: e }
		}));
	}
}), yg = G.create({
	name: "horizontalRule",
	addOptions() {
		return {
			HTMLAttributes: {},
			nextNodeType: "paragraph"
		};
	},
	group: "block",
	parseHTML() {
		return [{ tag: "hr" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return ["hr", U(this.options.HTMLAttributes, e)];
	},
	markdownTokenName: "hr",
	parseMarkdown: (e, t) => t.createNode("horizontalRule"),
	renderMarkdown: () => "---",
	addCommands() {
		return { setHorizontalRule: () => ({ chain: e, state: t }) => {
			if (!_f(t, t.schema.nodes[this.name])) return !1;
			let { selection: n } = t, { $to: r } = n, i = e();
			return Ku(n) ? i.insertContentAt(r.pos, { type: this.name }) : i.insertContent({ type: this.name }), i.command(({ state: e, tr: t, dispatch: n }) => {
				if (n) {
					let { $to: n } = t.selection, r = n.end();
					if (n.nodeAfter) n.nodeAfter.isTextblock ? t.setSelection(k.create(t.doc, n.pos + 1)) : n.nodeAfter.isBlock ? t.setSelection(A.create(t.doc, n.pos)) : t.setSelection(k.create(t.doc, n.pos));
					else {
						let i = (e.schema.nodes[this.options.nextNodeType] || n.parent.type.contentMatch.defaultType)?.create();
						i && (t.insert(r, i), t.setSelection(k.create(t.doc, r + 1)));
					}
					t.scrollIntoView();
				}
				return !0;
			}).run();
		} };
	},
	addInputRules() {
		return [Hp({
			find: /^(?:---|—-|___\s|\*\*\*\s)$/,
			type: this.type
		})];
	}
}), bg = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))$/, xg = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))/g, Sg = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))$/, Cg = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))/g, wg = lp.create({
	name: "italic",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	parseHTML() {
		return [
			{ tag: "em" },
			{
				tag: "i",
				getAttrs: (e) => e.style.fontStyle !== "normal" && null
			},
			{
				style: "font-style=normal",
				clearMark: (e) => e.type.name === this.name
			},
			{ style: "font-style=italic" }
		];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"em",
			U(this.options.HTMLAttributes, e),
			0
		];
	},
	addCommands() {
		return {
			setItalic: () => ({ commands: e }) => e.setMark(this.name),
			toggleItalic: () => ({ commands: e }) => e.toggleMark(this.name),
			unsetItalic: () => ({ commands: e }) => e.unsetMark(this.name)
		};
	},
	markdownTokenName: "em",
	parseMarkdown: (e, t) => t.applyMark("italic", t.parseInline(e.tokens || [])),
	markdownOptions: { htmlReopen: {
		open: "<em>",
		close: "</em>"
	} },
	renderMarkdown: (e, t) => `*${t.renderChildren(e)}*`,
	addKeyboardShortcuts() {
		return {
			"Mod-i": () => this.editor.commands.toggleItalic(),
			"Mod-I": () => this.editor.commands.toggleItalic()
		};
	},
	addInputRules() {
		return [Vp({
			find: bg,
			type: this.type
		}), Vp({
			find: Sg,
			type: this.type
		})];
	},
	addPasteRules() {
		return [im({
			find: xg,
			type: this.type
		}), im({
			find: Cg,
			type: this.type
		})];
	}
}), Tg = "aaa1rp3bb0ott3vie4c1le2ogado5udhabi7c0ademy5centure6ountant0s9o1tor4d0s1ult4e0g1ro2tna4f0l1rica5g0akhan5ency5i0g1rbus3force5tel5kdn3l0ibaba4pay4lfinanz6state5y2sace3tom5m0azon4ericanexpress7family11x2fam3ica3sterdam8nalytics7droid5quan4z2o0l2partments8p0le4q0uarelle8r0ab1mco4chi3my2pa2t0e3s0da2ia2sociates9t0hleta5torney7u0ction5di0ble3o3spost5thor3o0s4w0s2x0a2z0ure5ba0by2idu3namex4d1k2r0celona5laycard4s5efoot5gains6seball5ketball8uhaus5yern5b0c1t1va3cg1n2d1e0ats2uty4er2rlin4st0buy5t2f1g1h0arti5i0ble3d1ke2ng0o3o1z2j1lack0friday9ockbuster8g1omberg7ue3m0s1w2n0pparibas9o0ats3ehringer8fa2m1nd2o0k0ing5sch2tik2on4t1utique6x2r0adesco6idgestone9oadway5ker3ther5ussels7s1t1uild0ers6siness6y1zz3v1w1y1z0h3ca0b1fe2l0l1vinklein9m0era3p2non3petown5ital0one8r0avan4ds2e0er0s4s2sa1e1h1ino4t0ering5holic7ba1n1re3c1d1enter4o1rn3f0a1d2g1h0anel2nel4rity4se2t2eap3intai5ristmas6ome4urch5i0priani6rcle4sco3tadel4i0c2y3k1l0aims4eaning6ick2nic1que6othing5ud3ub0med6m1n1o0ach3des3ffee4llege4ogne5m0mbank4unity6pany2re3uter5sec4ndos3struction8ulting7tact3ractors9oking4l1p2rsica5untry4pon0s4rses6pa2r0edit0card4union9icket5own3s1uise0s6u0isinella9v1w1x1y0mru3ou3z2dad1nce3ta1e1ing3sun4y2clk3ds2e0al0er2s3gree4livery5l1oitte5ta3mocrat6ntal2ist5si0gn4v2hl2iamonds6et2gital5rect0ory7scount3ver5h2y2j1k1m1np2o0cs1tor4g1mains5t1wnload7rive4tv2ubai3pont4rban5vag2r2z2earth3t2c0o2deka3u0cation8e1g1mail3erck5nergy4gineer0ing9terprises10pson4quipment8r0icsson6ni3s0q1tate5t1u0rovision8s2vents5xchange6pert3osed4ress5traspace10fage2il1rwinds6th3mily4n0s2rm0ers5shion4t3edex3edback6rrari3ero6i0delity5o2lm2nal1nce1ial7re0stone6mdale6sh0ing5t0ness6j1k1lickr3ghts4r2orist4wers5y2m1o0o0d1tball6rd1ex2sale4um3undation8x2r0ee1senius7l1ogans4ntier7tr2ujitsu5n0d2rniture7tbol5yi3ga0l0lery3o1up4me0s3p1rden4y2b0iz3d0n2e0a1nt0ing5orge5f1g0ee3h1i0ft0s3ves2ing5l0ass3e1obal2o4m0ail3bh2o1x2n1odaddy5ld0point6f2odyear5g0le4p1t1v2p1q1r0ainger5phics5tis4een3ipe3ocery4up4s1t1u0cci3ge2ide2tars5ru3w1y2hair2mburg5ngout5us3bo2dfc0bank7ealth0care8lp1sinki6re1mes5iphop4samitsu7tachi5v2k0t2m1n1ockey4ldings5iday5medepot5goods5s0ense7nda3rse3spital5t0ing5t0els3mail5use3w2r1sbc3t1u0ghes5yatt3undai7ibm2cbc2e1u2d1e0ee3fm2kano4l1m0amat4db2mo0bilien9n0c1dustries8finiti5o2g1k1stitute6urance4e4t0ernational10uit4vestments10o1piranga7q1r0ish4s0maili5t0anbul7t0au2v3jaguar4va3cb2e0ep2tzt3welry6io2ll2m0p2nj2o0bs1urg4t1y2p0morgan6rs3uegos4niper7kaufen5ddi3e0rryhotels6properties14fh2g1h1i0a1ds2m1ndle4tchen5wi3m1n1oeln3matsu5sher5p0mg2n2r0d1ed3uokgroup8w1y0oto4z2la0caixa5mborghini8er3nd0rover6xess5salle5t0ino3robe5w0yer5b1c1ds2ease3clerc5frak4gal2o2xus4gbt3i0dl2fe0insurance9style7ghting6ke2lly3mited4o2ncoln4k2ve1ing5k1lc1p2oan0s3cker3us3l1ndon4tte1o3ve3pl0financial11r1s1t0d0a3u0ndbeck6xe1ury5v1y2ma0drid4if1son4keup4n0agement7go3p1rket0ing3s4riott5shalls7ttel5ba2c0kinsey7d1e0d0ia3et2lbourne7me1orial6n0u2rck0msd7g1h1iami3crosoft7l1ni1t2t0subishi9k1l0b1s2m0a2n1o0bi0le4da2e1i1m1nash3ey2ster5rmon3tgage6scow4to0rcycles9v0ie4p1q1r1s0d2t0n1r2u0seum3ic4v1w1x1y1z2na0b1goya4me2vy3ba2c1e0c1t0bank4flix4work5ustar5w0s2xt0direct7us4f0l2g0o2hk2i0co2ke1on3nja3ssan1y5l1o0kia3rton4w0ruz3tv4p1r0a1w2tt2u1yc2z2obi1server7ffice5kinawa6layan0group9lo3m0ega4ne1g1l0ine5oo2pen3racle3nge4g0anic5igins6saka4tsuka4t2vh3pa0ge2nasonic7ris2s1tners4s1y3y2ccw3e0t2f0izer5g1h0armacy6d1ilips5one2to0graphy6s4ysio5ics1tet2ures6d1n0g1k2oneer5zza4k1l0ace2y0station9umbing5s3m1n0c2ohl2ker3litie5rn2st3r0axi3ess3ime3o0d0uctions8f1gressive8mo2perties3y5tection8u0dential9s1t1ub2w0c2y2qa1pon3uebec3st5racing4dio4e0ad1lestate6tor2y4cipes5d0umbrella9hab3ise0n3t2liance6n0t0als5pair3ort3ublican8st0aurant8view0s5xroth6ich0ardli6oh3l1o1p2o0cks3deo3gers4om3s0vp3u0gby3hr2n2w0e2yukyu6sa0arland6fe0ty4kura4le1on3msclub4ung5ndvik0coromant12ofi4p1rl2s1ve2xo3b0i1s2c0b1haeffler7midt4olarships8ol3ule3warz5ience5ot3d1e0arch3t2cure1ity6ek2lect4ner3rvices6ven3w1x0y3fr2g1h0angrila6rp3ell3ia1ksha5oes2p0ping5uji3w3i0lk2na1gles5te3j1k0i0n2y0pe4l0ing4m0art3ile4n0cf3o0ccer3ial4ftbank4ware6hu2lar2utions7ng1y2y2pa0ce3ort2t3r0l2s1t0ada2ples4r1tebank4farm7c0group6ockholm6rage3e3ream4udio2y3yle4u0cks3pplies3y2ort5rf1gery5zuki5v1watch4iss4x1y0dney4stems6z2tab1ipei4lk2obao4rget4tamotors6r2too4x0i3c0i2d0k2eam2ch0nology8l1masek5nnis4va3f1g1h0d1eater2re6iaa2ckets5enda4ps2res2ol4j0maxx4x2k0maxx5l1m0all4n1o0day3kyo3ols3p1ray3shiba5tal3urs3wn2yota3s3r0ade1ing4ining5vel0ers0insurance16ust3v2t1ube2i1nes3shu4v0s2w1z2ua1bank3s2g1k1nicom3versity8o2ol2ps2s1y1z2va0cations7na1guard7c1e0gas3ntures6risign5mögensberater2ung14sicherung10t2g1i0ajes4deo3g1king4llas4n1p1rgin4sa1ion4va1o3laanderen9n1odka3lvo3te1ing3o2yage5u2wales2mart4ter4ng0gou5tch0es6eather0channel12bcam3er2site5d0ding5ibo2r3f1hoswho6ien2ki2lliamhill9n0dows4e1ners6me2oodside6rk0s2ld3w2s1tc1f3xbox3erox4ihuan4n2xx2yz3yachts4hoo3maxun5ndex5e1odobashi7ga2kohama6u0tube6t1un3za0ppos4ra3ero3ip2m1one3uerich6w2", Eg = "ελ1υ2бг1ел3дети4ею2католик6ом3мкд2он1сква6онлайн5рг3рус2ф2сайт3рб3укр3қаз3հայ3ישראל5קום3ابوظبي5رامكو5لاردن4بحرين5جزائر5سعودية6عليان5مغرب5مارات5یران5بارت2زار4يتك3ھارت5تونس4سودان3رية5شبكة4عراق2ب2مان4فلسطين6قطر3كاثوليك6وم3مصر2ليسيا5وريتانيا7قع4همراه5پاکستان7ڀارت4कॉम3नेट3भारत0म्3ोत5संगठन5বাংলা5ভারত2ৰত4ਭਾਰਤ4ભારત4ଭାରତ4இந்தியா6லங்கை6சிங்கப்பூர்11భారత్5ಭಾರತ4ഭാരതം5ලංකා4คอม3ไทย3ລາວ3გე2みんな3アマゾン4クラウド4グーグル4コム2ストア3セール3ファッション6ポイント4世界2中信1国1國1文网3亚马逊3企业2佛山2信息2健康2八卦2公司1益2台湾1灣2商城1店1标2嘉里0大酒店5在线2大拿2天主教3娱乐2家電2广东2微博2慈善2我爱你3手机2招聘2政务1府2新加坡2闻2时尚2書籍2机构2淡马锡3游戏2澳門2点看2移动2组织机构4网址1店1站1络2联通2谷歌2购物2通販2集团2電訊盈科4飞利浦3食品2餐厅2香格里拉3港2닷넷1컴2삼성2한국2", Dg = "numeric", Og = "ascii", kg = "alpha", Ag = "asciinumeric", jg = "alphanumeric", Mg = "domain", Ng = "emoji", Pg = "scheme", Fg = "slashscheme", Ig = "whitespace";
function Lg(e, t) {
	return e in t || (t[e] = []), t[e];
}
function Rg(e, t, n) {
	t[Dg] && (t[Ag] = !0, t[jg] = !0), t[Og] && (t[Ag] = !0, t[kg] = !0), t[Ag] && (t[jg] = !0), t[kg] && (t[jg] = !0), t[jg] && (t[Mg] = !0), t[Ng] && (t[Mg] = !0);
	for (let r in t) {
		let t = Lg(r, n);
		t.indexOf(e) < 0 && t.push(e);
	}
}
function zg(e, t) {
	let n = {};
	for (let r in t) t[r].indexOf(e) >= 0 && (n[r] = !0);
	return n;
}
function Bg(e = null) {
	this.j = {}, this.jr = [], this.jd = null, this.t = e;
}
Bg.groups = {}, Bg.prototype = {
	accepts() {
		return !!this.t;
	},
	go(e) {
		let t = this, n = t.j[e];
		if (n) return n;
		for (let n = 0; n < t.jr.length; n++) {
			let r = t.jr[n][0], i = t.jr[n][1];
			if (i && r.test(e)) return i;
		}
		return t.jd;
	},
	has(e, t = !1) {
		return t ? e in this.j : !!this.go(e);
	},
	ta(e, t, n, r) {
		for (let i = 0; i < e.length; i++) this.tt(e[i], t, n, r);
	},
	tr(e, t, n, r) {
		r ||= Bg.groups;
		let i;
		return t && t.j ? i = t : (i = new Bg(t), n && r && Rg(t, n, r)), this.jr.push([e, i]), i;
	},
	ts(e, t, n, r) {
		let i = this, a = e.length;
		if (!a) return i;
		for (let t = 0; t < a - 1; t++) i = i.tt(e[t]);
		return i.tt(e[a - 1], t, n, r);
	},
	tt(e, t, n, r) {
		r ||= Bg.groups;
		let i = this;
		if (t && t.j) return i.j[e] = t, t;
		let a = t, o, s = i.go(e);
		return s ? (o = new Bg(), Object.assign(o.j, s.j), o.jr.push.apply(o.jr, s.jr), o.jd = s.jd, o.t = s.t) : o = new Bg(), a && (r && (o.t && typeof o.t == "string" ? Rg(a, Object.assign(zg(o.t, r), n), r) : n && Rg(a, n, r)), o.t = a), i.j[e] = o, o;
	}
};
var q = (e, t, n, r, i) => e.ta(t, n, r, i), J = (e, t, n, r, i) => e.tr(t, n, r, i), Vg = (e, t, n, r, i) => e.ts(t, n, r, i), Y = (e, t, n, r, i) => e.tt(t, n, r, i), Hg = "WORD", Ug = "UWORD", Wg = "ASCIINUMERICAL", Gg = "ALPHANUMERICAL", Kg = "LOCALHOST", qg = "TLD", Jg = "UTLD", Yg = "SCHEME", Xg = "SLASH_SCHEME", Zg = "NUM", Qg = "WS", $g = "NL", e_ = "OPENBRACE", t_ = "CLOSEBRACE", n_ = "OPENBRACKET", r_ = "CLOSEBRACKET", i_ = "OPENPAREN", a_ = "CLOSEPAREN", o_ = "OPENANGLEBRACKET", s_ = "CLOSEANGLEBRACKET", c_ = "FULLWIDTHLEFTPAREN", l_ = "FULLWIDTHRIGHTPAREN", u_ = "LEFTCORNERBRACKET", d_ = "RIGHTCORNERBRACKET", f_ = "LEFTWHITECORNERBRACKET", p_ = "RIGHTWHITECORNERBRACKET", m_ = "FULLWIDTHLESSTHAN", h_ = "FULLWIDTHGREATERTHAN", g_ = "AMPERSAND", __ = "APOSTROPHE", v_ = "ASTERISK", y_ = "AT", b_ = "BACKSLASH", x_ = "BACKTICK", S_ = "CARET", C_ = "COLON", w_ = "COMMA", T_ = "DOLLAR", E_ = "DOT", D_ = "EQUALS", O_ = "EXCLAMATION", k_ = "HYPHEN", A_ = "PERCENT", j_ = "PIPE", M_ = "PLUS", N_ = "POUND", P_ = "QUERY", F_ = "QUOTE", I_ = "FULLWIDTHMIDDLEDOT", L_ = "SEMI", R_ = "SLASH", z_ = "TILDE", B_ = "UNDERSCORE", V_ = "EMOJI", H_ = "SYM", U_ = /*#__PURE__*/ Object.freeze({
	__proto__: null,
	ALPHANUMERICAL: Gg,
	AMPERSAND: g_,
	APOSTROPHE: __,
	ASCIINUMERICAL: Wg,
	ASTERISK: v_,
	AT: y_,
	BACKSLASH: b_,
	BACKTICK: x_,
	CARET: S_,
	CLOSEANGLEBRACKET: s_,
	CLOSEBRACE: t_,
	CLOSEBRACKET: r_,
	CLOSEPAREN: a_,
	COLON: C_,
	COMMA: w_,
	DOLLAR: T_,
	DOT: E_,
	EMOJI: V_,
	EQUALS: D_,
	EXCLAMATION: O_,
	FULLWIDTHGREATERTHAN: h_,
	FULLWIDTHLEFTPAREN: c_,
	FULLWIDTHLESSTHAN: m_,
	FULLWIDTHMIDDLEDOT: I_,
	FULLWIDTHRIGHTPAREN: l_,
	HYPHEN: k_,
	LEFTCORNERBRACKET: u_,
	LEFTWHITECORNERBRACKET: f_,
	LOCALHOST: Kg,
	NL: $g,
	NUM: Zg,
	OPENANGLEBRACKET: o_,
	OPENBRACE: e_,
	OPENBRACKET: n_,
	OPENPAREN: i_,
	PERCENT: A_,
	PIPE: j_,
	PLUS: M_,
	POUND: N_,
	QUERY: P_,
	QUOTE: F_,
	RIGHTCORNERBRACKET: d_,
	RIGHTWHITECORNERBRACKET: p_,
	SCHEME: Yg,
	SEMI: L_,
	SLASH: R_,
	SLASH_SCHEME: Xg,
	SYM: H_,
	TILDE: z_,
	TLD: qg,
	UNDERSCORE: B_,
	UTLD: Jg,
	UWORD: Ug,
	WORD: Hg,
	WS: Qg
}), W_ = /[a-z]/, G_ = /\p{L}/u, K_ = /\p{Emoji}/u, q_ = /\d/, J_ = /\s/, Y_ = "\r", X_ = "\n", Z_ = "️", Q_ = "‍", $_ = "￼", ev = null, tv = null;
function nv(e = []) {
	let t = {};
	Bg.groups = t;
	let n = new Bg();
	ev ??= ov(Tg), tv ??= ov(Eg), Y(n, "'", __), Y(n, "{", e_), Y(n, "}", t_), Y(n, "[", n_), Y(n, "]", r_), Y(n, "(", i_), Y(n, ")", a_), Y(n, "<", o_), Y(n, ">", s_), Y(n, "（", c_), Y(n, "）", l_), Y(n, "「", u_), Y(n, "」", d_), Y(n, "『", f_), Y(n, "』", p_), Y(n, "＜", m_), Y(n, "＞", h_), Y(n, "&", g_), Y(n, "*", v_), Y(n, "@", y_), Y(n, "`", x_), Y(n, "^", S_), Y(n, ":", C_), Y(n, ",", w_), Y(n, "$", T_), Y(n, ".", E_), Y(n, "=", D_), Y(n, "!", O_), Y(n, "-", k_), Y(n, "%", A_), Y(n, "|", j_), Y(n, "+", M_), Y(n, "#", N_), Y(n, "?", P_), Y(n, "\"", F_), Y(n, "/", R_), Y(n, ";", L_), Y(n, "~", z_), Y(n, "_", B_), Y(n, "\\", b_), Y(n, "・", I_);
	let r = J(n, q_, Zg, { [Dg]: !0 });
	J(r, q_, r);
	let i = J(r, W_, Wg, { [Ag]: !0 }), a = J(r, G_, Gg, { [jg]: !0 }), o = J(n, W_, Hg, { [Og]: !0 });
	J(o, q_, i), J(o, W_, o), J(i, q_, i), J(i, W_, i);
	let s = J(n, G_, Ug, { [kg]: !0 });
	J(s, W_), J(s, q_, a), J(s, G_, s), J(a, q_, a), J(a, W_), J(a, G_, a);
	let c = Y(n, X_, $g, { [Ig]: !0 }), l = Y(n, Y_, Qg, { [Ig]: !0 }), u = J(n, J_, Qg, { [Ig]: !0 });
	Y(n, $_, u), Y(l, X_, c), Y(l, $_, u), J(l, J_, u), Y(u, Y_), Y(u, X_), J(u, J_, u), Y(u, $_, u);
	let d = J(n, K_, V_, { [Ng]: !0 });
	Y(d, "#"), J(d, K_, d), Y(d, Z_, d);
	let f = Y(d, Q_);
	Y(f, "#"), J(f, K_, d);
	let p = [[W_, o], [q_, i]], m = [
		[W_, null],
		[G_, s],
		[q_, a]
	];
	for (let e = 0; e < ev.length; e++) av(n, ev[e], qg, Hg, p);
	for (let e = 0; e < tv.length; e++) av(n, tv[e], Jg, Ug, m);
	Rg(qg, {
		tld: !0,
		ascii: !0
	}, t), Rg(Jg, {
		utld: !0,
		alpha: !0
	}, t), av(n, "file", Yg, Hg, p), av(n, "mailto", Yg, Hg, p), av(n, "http", Xg, Hg, p), av(n, "https", Xg, Hg, p), av(n, "ftp", Xg, Hg, p), av(n, "ftps", Xg, Hg, p), Rg(Yg, {
		scheme: !0,
		ascii: !0
	}, t), Rg(Xg, {
		slashscheme: !0,
		ascii: !0
	}, t), e = e.sort((e, t) => e[0] > t[0] ? 1 : -1);
	for (let t = 0; t < e.length; t++) {
		let r = e[t][0], i = e[t][1] ? { [Pg]: !0 } : { [Fg]: !0 };
		r.indexOf("-") >= 0 ? i[Mg] = !0 : W_.test(r) ? q_.test(r) ? i[Ag] = !0 : i[Og] = !0 : i[Dg] = !0, Vg(n, r, r, i);
	}
	return Vg(n, "localhost", Kg, { ascii: !0 }), n.jd = new Bg(H_), {
		start: n,
		tokens: Object.assign({ groups: t }, U_)
	};
}
function rv(e, t) {
	let n = iv(t.replace(/[A-Z]/g, (e) => e.toLowerCase())), r = n.length, i = [], a = 0, o = 0;
	for (; o < r;) {
		let s = e, c = null, l = 0, u = null, d = -1, f = -1;
		for (; o < r && (c = s.go(n[o]));) s = c, s.accepts() ? (d = 0, f = 0, u = s) : d >= 0 && (d += n[o].length, f++), l += n[o].length, a += n[o].length, o++;
		a -= d, o -= f, l -= d, i.push({
			t: u.t,
			v: t.slice(a - l, a),
			s: a - l,
			e: a
		});
	}
	return i;
}
function iv(e) {
	let t = [], n = e.length, r = 0;
	for (; r < n;) {
		let i = e.charCodeAt(r), a, o = i < 55296 || i > 56319 || r + 1 === n || (a = e.charCodeAt(r + 1)) < 56320 || a > 57343 ? e[r] : e.slice(r, r + 2);
		t.push(o), r += o.length;
	}
	return t;
}
function av(e, t, n, r, i) {
	let a, o = t.length;
	for (let n = 0; n < o - 1; n++) {
		let o = t[n];
		e.j[o] ? a = e.j[o] : (a = new Bg(r), a.jr = i.slice(), e.j[o] = a), e = a;
	}
	return a = new Bg(n), a.jr = i.slice(), e.j[t[o - 1]] = a, a;
}
function ov(e) {
	let t = [], n = [], r = 0;
	for (; r < e.length;) {
		let i = 0;
		for (; "0123456789".indexOf(e[r + i]) >= 0;) i++;
		if (i > 0) {
			t.push(n.join(""));
			for (let t = parseInt(e.substring(r, r + i), 10); t > 0; t--) n.pop();
			r += i;
		} else n.push(e[r]), r++;
	}
	return t;
}
var sv = {
	defaultProtocol: "http",
	events: null,
	format: lv,
	formatHref: lv,
	nl2br: !1,
	tagName: "a",
	target: null,
	rel: null,
	validate: !0,
	truncate: Infinity,
	className: null,
	attributes: null,
	ignoreTags: [],
	render: null
};
function cv(e, t = null) {
	let n = Object.assign({}, sv);
	e && (n = Object.assign(n, e instanceof cv ? e.o : e));
	let r = n.ignoreTags, i = [];
	for (let e = 0; e < r.length; e++) i.push(r[e].toUpperCase());
	this.o = n, t && (this.defaultRender = t), this.ignoreTags = i;
}
cv.prototype = {
	o: sv,
	ignoreTags: [],
	defaultRender(e) {
		return e;
	},
	check(e) {
		return this.get("validate", e.toString(), e);
	},
	get(e, t, n) {
		let r = t != null, i = this.o[e];
		return i && (typeof i == "object" ? (i = n.t in i ? i[n.t] : sv[e], typeof i == "function" && r && (i = i(t, n))) : typeof i == "function" && r && (i = i(t, n.t, n)), i);
	},
	getObj(e, t, n) {
		let r = this.o[e];
		return typeof r == "function" && t != null && (r = r(t, n.t, n)), r;
	},
	render(e) {
		let t = e.render(this);
		return (this.get("render", null, e) || this.defaultRender)(t, e.t, e);
	}
};
function lv(e) {
	return e;
}
function uv(e, t) {
	this.t = "token", this.v = e, this.tk = t;
}
uv.prototype = {
	isLink: !1,
	toString() {
		return this.v;
	},
	toHref(e) {
		return this.toString();
	},
	toFormattedString(e) {
		let t = this.toString(), n = e.get("truncate", t, this), r = e.get("format", t, this);
		return n && r.length > n ? r.substring(0, n) + "…" : r;
	},
	toFormattedHref(e) {
		return e.get("formatHref", this.toHref(e.get("defaultProtocol")), this);
	},
	startIndex() {
		return this.tk[0].s;
	},
	endIndex() {
		return this.tk[this.tk.length - 1].e;
	},
	toObject(e = sv.defaultProtocol) {
		return {
			type: this.t,
			value: this.toString(),
			isLink: this.isLink,
			href: this.toHref(e),
			start: this.startIndex(),
			end: this.endIndex()
		};
	},
	toFormattedObject(e) {
		return {
			type: this.t,
			value: this.toFormattedString(e),
			isLink: this.isLink,
			href: this.toFormattedHref(e),
			start: this.startIndex(),
			end: this.endIndex()
		};
	},
	validate(e) {
		return e.get("validate", this.toString(), this);
	},
	render(e) {
		let t = this, n = this.toHref(e.get("defaultProtocol")), r = e.get("formatHref", n, this), i = e.get("tagName", n, t), a = this.toFormattedString(e), o = {}, s = e.get("className", n, t), c = e.get("target", n, t), l = e.get("rel", n, t), u = e.getObj("attributes", n, t), d = e.getObj("events", n, t);
		return o.href = r, s && (o.class = s), c && (o.target = c), l && (o.rel = l), u && Object.assign(o, u), {
			tagName: i,
			attributes: o,
			content: a,
			eventListeners: d
		};
	}
};
function dv(e, t) {
	class n extends uv {
		constructor(t, n) {
			super(t, n), this.t = e;
		}
	}
	for (let e in t) n.prototype[e] = t[e];
	return n.t = e, n;
}
var fv = dv("email", {
	isLink: !0,
	toHref() {
		return "mailto:" + this.toString();
	}
}), pv = dv("text"), mv = dv("nl"), hv = dv("url", {
	isLink: !0,
	toHref(e = sv.defaultProtocol) {
		return this.hasProtocol() ? this.v : `${e}://${this.v}`;
	},
	hasProtocol() {
		let e = this.tk;
		return e.length >= 2 && e[0].t !== Kg && e[1].t === C_;
	}
}), gv = (e) => new Bg(e);
function _v({ groups: e }) {
	let t = e.domain.concat([
		g_,
		v_,
		y_,
		b_,
		x_,
		S_,
		T_,
		D_,
		k_,
		Zg,
		A_,
		j_,
		M_,
		N_,
		R_,
		H_,
		z_,
		B_
	]), n = [
		__,
		C_,
		w_,
		E_,
		O_,
		A_,
		P_,
		F_,
		L_,
		o_,
		s_,
		e_,
		t_,
		r_,
		n_,
		i_,
		a_,
		c_,
		l_,
		u_,
		d_,
		f_,
		p_,
		m_,
		h_
	], r = [
		g_,
		__,
		v_,
		b_,
		x_,
		S_,
		T_,
		D_,
		k_,
		e_,
		t_,
		A_,
		j_,
		M_,
		N_,
		P_,
		R_,
		H_,
		z_,
		B_
	], i = gv(), a = Y(i, z_);
	q(a, r, a), q(a, e.domain, a);
	let o = gv(), s = gv(), c = gv();
	q(i, e.domain, o), q(i, e.scheme, s), q(i, e.slashscheme, c), q(o, r, a), q(o, e.domain, o);
	let l = Y(o, y_);
	Y(a, y_, l), Y(s, y_, l), Y(c, y_, l);
	let u = Y(a, E_);
	q(u, r, a), q(u, e.domain, a);
	let d = gv();
	q(l, e.domain, d), q(d, e.domain, d);
	let f = Y(d, E_);
	q(f, e.domain, d);
	let p = gv(fv);
	q(f, e.tld, p), q(f, e.utld, p), Y(l, Kg, p);
	let m = Y(d, k_);
	Y(m, k_, m), q(m, e.domain, d), q(p, e.domain, d), Y(p, E_, f), Y(p, k_, m);
	let h = Y(o, k_), g = Y(o, E_);
	Y(h, k_, h), q(h, e.domain, o), q(g, r, a), q(g, e.domain, o);
	let _ = gv(hv);
	q(g, e.tld, _), q(g, e.utld, _), q(_, e.domain, o), q(_, r, a), Y(_, E_, g), Y(_, k_, h), Y(_, y_, l);
	let v = Y(_, C_), y = gv(hv);
	q(v, e.numeric, y);
	let b = gv(hv), x = gv();
	q(b, t, b), q(b, n, x), q(x, t, b), q(x, n, x), Y(_, R_, b), Y(y, R_, b);
	let S = Y(s, C_), C = Y(Y(Y(c, C_), R_), R_);
	q(s, e.domain, o), Y(s, E_, g), Y(s, k_, h), q(c, e.domain, o), Y(c, E_, g), Y(c, k_, h), q(S, e.domain, b), Y(S, R_, b), Y(S, P_, b), q(C, e.domain, b), q(C, t, b), Y(C, R_, b);
	let w = [
		[e_, t_],
		[n_, r_],
		[i_, a_],
		[o_, s_],
		[c_, l_],
		[u_, d_],
		[f_, p_],
		[m_, h_]
	];
	for (let e = 0; e < w.length; e++) {
		let [r, i] = w[e], a = Y(b, r);
		Y(x, r, a);
		let o = gv(hv);
		q(a, t, o);
		let s = gv();
		q(a, n, s), Y(a, i, b), q(o, t, o), q(o, n, s), q(s, t, o), q(s, n, s), Y(o, i, b), Y(s, i, b);
	}
	return Y(i, Kg, _), Y(i, $g, mv), {
		start: i,
		tokens: U_
	};
}
function vv(e, t, n) {
	let r = n.length, i = 0, a = [], o = [];
	for (; i < r;) {
		let s = e, c = null, l = null, u = 0, d = null, f = -1;
		for (; i < r && !(c = s.go(n[i].t));) o.push(n[i++]);
		for (; i < r && (l = c || s.go(n[i].t));) c = null, s = l, s.accepts() ? (f = 0, d = s) : f >= 0 && f++, i++, u++;
		if (f < 0) i -= u, i < r && (o.push(n[i]), i++);
		else {
			o.length > 0 && (a.push(yv(pv, t, o)), o = []), i -= f, u -= f;
			let e = d.t, r = n.slice(i - u, i);
			a.push(yv(e, t, r));
		}
	}
	return o.length > 0 && a.push(yv(pv, t, o)), a;
}
function yv(e, t, n) {
	let r = n[0].s, i = n[n.length - 1].e;
	return new e(t.slice(r, i), n);
}
var bv = typeof console < "u" && console && console.warn || (() => {}), xv = "until manual call of linkify.init(). Register all schemes and plugins before invoking linkify the first time.", X = {
	scanner: null,
	parser: null,
	tokenQueue: [],
	pluginQueue: [],
	customSchemes: [],
	initialized: !1
};
function Sv() {
	return Bg.groups = {}, X.scanner = null, X.parser = null, X.tokenQueue = [], X.pluginQueue = [], X.customSchemes = [], X.initialized = !1, X;
}
function Cv(e, t = !1) {
	if (X.initialized && bv(`linkifyjs: already initialized - will not register custom scheme "${e}" ${xv}`), !/^[0-9a-z]+(-[0-9a-z]+)*$/.test(e)) throw Error("linkifyjs: incorrect scheme format.\n1. Must only contain digits, lowercase ASCII letters or \"-\"\n2. Cannot start or end with \"-\"\n3. \"-\" cannot repeat");
	X.customSchemes.push([e, t]);
}
function wv() {
	X.scanner = nv(X.customSchemes);
	for (let e = 0; e < X.tokenQueue.length; e++) X.tokenQueue[e][1]({ scanner: X.scanner });
	X.parser = _v(X.scanner.tokens);
	for (let e = 0; e < X.pluginQueue.length; e++) X.pluginQueue[e][1]({
		scanner: X.scanner,
		parser: X.parser
	});
	return X.initialized = !0, X;
}
function Tv(e) {
	return X.initialized || wv(), vv(X.parser.start, e, rv(X.scanner.start, e));
}
Tv.scan = rv;
function Ev(e, t = null, n = null) {
	if (t && typeof t == "object") {
		if (n) throw Error(`linkifyjs: Invalid link type ${t}; must be a string`);
		n = t, t = null;
	}
	let r = new cv(n), i = Tv(e), a = [];
	for (let e = 0; e < i.length; e++) {
		let n = i[e];
		n.isLink && (!t || n.t === t) && r.check(n) && a.push(n.toFormattedObject(r));
	}
	return a;
}
//#endregion
//#region ../../node_modules/@tiptap/extension-link/dist/index.js
var Dv = "[\0- \xA0 ᠎ -\u2029 　]", Ov = new RegExp(Dv), kv = RegExp(`${Dv}$`), Av = new RegExp(Dv, "g");
function jv(e) {
	return e.length === 1 ? e[0].isLink : e.length === 3 && e[1].isLink ? ["()", "[]"].includes(e[0].value + e[2].value) : !1;
}
function Mv(e) {
	return new j({
		key: new M("autolink"),
		appendTransaction: (t, n, r) => {
			let i = t.some((e) => e.docChanged) && !n.doc.eq(r.doc), a = t.some((e) => e.getMeta("preventAutolink"));
			if (!i || a) return;
			let { tr: o } = r;
			if (ju(Ql(n.doc, [...t])).forEach(({ newRange: t }) => {
				let n = eu(r.doc, t, (e) => e.isTextblock), i, a;
				if (n.length > 1) i = n[0], a = r.doc.textBetween(i.pos, i.pos + i.node.nodeSize, void 0, " ");
				else if (n.length) {
					let e = r.doc.textBetween(t.from, t.to, " ", " ");
					if (!kv.test(e)) return;
					i = n[0], a = r.doc.textBetween(i.pos, t.to, void 0, " ");
				}
				if (i && a) {
					let t = a.split(Ov).filter(Boolean);
					if (t.length <= 0) return !1;
					let n = t[t.length - 1], s = i.pos + a.lastIndexOf(n);
					if (!n) return !1;
					let c = Tv(n).map((t) => t.toObject(e.defaultProtocol));
					if (!jv(c)) return !1;
					c.filter((e) => e.isLink).map((e) => ({
						...e,
						from: s + e.start + 1,
						to: s + e.end + 1
					})).filter((e) => !r.schema.marks.code || !r.doc.rangeHasMark(e.from, e.to, r.schema.marks.code)).filter((t) => e.validate(t.value)).filter((t) => e.shouldAutoLink(t.value)).forEach((t) => {
						Nu(t.from, t.to, r.doc).some((t) => t.mark.type === e.type) || o.addMark(t.from, t.to, e.type.create({ href: t.href }));
					});
				}
			}), o.steps.length) return o;
		}
	});
}
function Nv(e) {
	return new j({
		key: new M("handleClickLink"),
		props: { handleClick: (t, n, r) => {
			if (r.button !== 0 || !t.editable) return !1;
			let i = null;
			if (r.target instanceof HTMLAnchorElement) i = r.target;
			else {
				let t = r.target;
				if (!t) return !1;
				let n = e.editor.view.dom;
				i = t.closest("a"), i && !n.contains(i) && (i = null);
			}
			if (!i) return !1;
			let a = !1;
			if (e.enableClickSelection && (a = e.editor.commands.extendMarkRange(e.type.name)), e.openOnClick) {
				let n = Ou(t.state, e.type.name), r = i.href ?? n.href, o = i.target ?? n.target;
				r && (window.open(r, o), a = !0);
			}
			return a;
		} }
	});
}
var Pv = /\[([^[\]]+)\]\(((?:[^\s()]|\([^\s()]*\))+)(?:\s+(?:(["'])(.*?)\3|“(.*?)”|‘(.*?)’))?\)$/, Fv = /\[([^[\]]+)\]\(((?:[^\s()]|\([^\s()]*\))+)(?:\s+(?:(["'])(.*?)\3|“(.*?)”|‘(.*?)’))?\)/g;
function Iv(e, t) {
	let n = 0;
	for (let r = t - 1; r >= 0 && e[r] === "\\"; --r) n += 1;
	return n % 2 == 1;
}
function Lv(e, t) {
	let n = 0, r = 0;
	for (; r < t;) {
		if (e[r] !== "`") {
			r += 1;
			continue;
		}
		if (n === 0 && Iv(e, r)) {
			r += 1;
			continue;
		}
		let i = 0;
		for (; r < t && e[r] === "`";) i += 1, r += 1;
		n === 0 ? n = i : i === n && (n = 0);
	}
	return n > 0;
}
function Rv(e, t, n) {
	let [, r, i] = t;
	return (t.index ? e[t.index - 1] : void 0) === "!" || Iv(e, t.index ?? 0) || Lv(e, t.index ?? 0) ? !1 : !!r.trim() && n(i);
}
function zv(e) {
	let [t, n, r, , i, a, o] = e, s = i ?? a ?? o;
	return {
		index: e.index ?? 0,
		text: t,
		replaceWith: n,
		data: {
			href: r,
			title: s || null,
			markdown: !0
		}
	};
}
function Bv(e, t) {
	return e.index < t.index + t.text.length && t.index < e.index + e.text.length;
}
function Vv(e) {
	return {
		href: e.data?.href,
		title: e.data?.title ?? null
	};
}
function Hv(e) {
	let t = Vp({
		find: (t) => {
			let n = Pv.exec(t);
			return !n || !Rv(t, n, e.isAllowedHref) ? null : zv(n);
		},
		type: e.type,
		getAttributes: Vv
	});
	return new ip({
		find: t.find,
		handler: (e) => {
			let n = t.handler(e);
			return n !== null && e.state.tr.steps.length && e.state.tr.setMeta("preventAutolink", !0), n;
		}
	});
}
function Uv(e) {
	let t = im({
		find: (t) => {
			let n = [];
			for (let r of t.matchAll(Fv)) Rv(t, r, e.isAllowedHref) && n.push(zv(r));
			let r = (e.findPlainUrls?.call(e, t) ?? []).filter((e) => !n.some((t) => Bv(t, e)));
			return [...n, ...r];
		},
		type: e.type,
		getAttributes: Vv
	});
	return new up({
		find: t.find,
		handler: (e) => {
			let n = t.handler(e);
			return n !== null && e.state.tr.steps.length && e.match.data?.markdown && e.state.tr.setMeta("preventAutolink", !0), n;
		}
	});
}
function Wv(e) {
	return new j({
		key: new M("handlePasteLink"),
		props: { handlePaste: (t, n, r) => {
			let { shouldAutoLink: i } = e, { state: a } = t, { selection: o } = a, { empty: s } = o;
			if (s) return !1;
			let c = "";
			r.content.forEach((e) => {
				c += e.textContent;
			});
			let l = Ev(c, { defaultProtocol: e.defaultProtocol }).find((e) => e.isLink && e.value === c);
			return !c || !l || i !== void 0 && !i(l.value) ? !1 : e.editor.commands.setMark(e.type, { href: l.href });
		} }
	});
}
function Gv(e, t) {
	let n = [
		"http",
		"https",
		"ftp",
		"ftps",
		"mailto",
		"tel",
		"callto",
		"sms",
		"cid",
		"xmpp"
	];
	return t && t.forEach((e) => {
		let t = typeof e == "string" ? e : e.scheme;
		t && n.push(t);
	}), !e || e.replace(Av, "").match(RegExp(`^(?:(?:${n.map((e) => e.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|")}):|[^a-z]|[a-z0-9+.\\-]+(?:[^a-z+.\\-:]|$))`, "i"));
}
var Kv = lp.create({
	name: "link",
	priority: 1e3,
	keepOnSplit: !1,
	exitable: !0,
	onCreate() {
		this.options.validate && !this.options.shouldAutoLink && (this.options.shouldAutoLink = this.options.validate, console.warn("The `validate` option is deprecated. Rename to the `shouldAutoLink` option instead.")), this.options.protocols.forEach((e) => {
			if (typeof e == "string") {
				Cv(e);
				return;
			}
			Cv(e.scheme, e.optionalSlashes);
		});
	},
	onDestroy() {
		Sv();
	},
	inclusive() {
		return this.options.autolink;
	},
	addOptions() {
		return {
			openOnClick: !0,
			enableClickSelection: !1,
			linkOnPaste: !0,
			markdownLinks: !1,
			autolink: !0,
			protocols: [],
			defaultProtocol: "http",
			HTMLAttributes: {
				target: "_blank",
				rel: "noopener noreferrer nofollow",
				class: null
			},
			isAllowedUri: (e, t) => !!Gv(e, t.protocols),
			validate: (e) => !!e,
			shouldAutoLink: (e) => {
				let t = /^[a-z][a-z0-9+.-]*:\/\//i.test(e), n = /^[a-z][a-z0-9+.-]*:/i.test(e);
				if (t || n && !e.includes("@")) return !0;
				let r = (e.includes("@") ? e.split("@").pop() : e).split(/[/?#:]/)[0];
				return !(/^\d{1,3}(\.\d{1,3}){3}$/.test(r) || !/\./.test(r));
			}
		};
	},
	addAttributes() {
		return {
			href: {
				default: null,
				parseHTML(e) {
					return e.getAttribute("href");
				}
			},
			target: { default: this.options.HTMLAttributes.target ?? null },
			rel: { default: this.options.HTMLAttributes.rel ?? null },
			class: { default: this.options.HTMLAttributes.class ?? null },
			title: { default: null }
		};
	},
	parseHTML() {
		return [{
			tag: "a[href]",
			getAttrs: (e) => {
				let t = e.getAttribute("href");
				return !t || !this.options.isAllowedUri(t, {
					defaultValidate: (e) => !!Gv(e, this.options.protocols),
					protocols: this.options.protocols,
					defaultProtocol: this.options.defaultProtocol
				}) ? !1 : null;
			}
		}];
	},
	renderHTML({ HTMLAttributes: e }) {
		return this.options.isAllowedUri(e.href, {
			defaultValidate: (e) => !!Gv(e, this.options.protocols),
			protocols: this.options.protocols,
			defaultProtocol: this.options.defaultProtocol
		}) ? [
			"a",
			U(this.options.HTMLAttributes, e),
			0
		] : [
			"a",
			U(this.options.HTMLAttributes, {
				...e,
				href: ""
			}),
			0
		];
	},
	markdownTokenName: "link",
	parseMarkdown: (e, t) => t.applyMark("link", t.parseInline(e.tokens || []), {
		href: e.href,
		title: e.title || null
	}),
	renderMarkdown: (e, t) => {
		let n = e.attrs?.href ?? "", r = e.attrs?.title ?? "", i = t.renderChildren(e);
		return r ? `[${i}](${n} "${r}")` : `[${i}](${n})`;
	},
	addCommands() {
		return {
			setLink: (e) => ({ chain: t }) => {
				let { href: n } = e;
				return this.options.isAllowedUri(n, {
					defaultValidate: (e) => !!Gv(e, this.options.protocols),
					protocols: this.options.protocols,
					defaultProtocol: this.options.defaultProtocol
				}) ? t().setMark(this.name, e).setMeta("preventAutolink", !0).run() : !1;
			},
			toggleLink: (e) => ({ chain: t }) => {
				let { href: n } = e || {};
				return n && !this.options.isAllowedUri(n, {
					defaultValidate: (e) => !!Gv(e, this.options.protocols),
					protocols: this.options.protocols,
					defaultProtocol: this.options.defaultProtocol
				}) ? !1 : t().toggleMark(this.name, e, { extendEmptyMarkRange: !0 }).setMeta("preventAutolink", !0).run();
			},
			unsetLink: () => ({ chain: e }) => e().unsetMark(this.name, { extendEmptyMarkRange: !0 }).setMeta("preventAutolink", !0).run()
		};
	},
	addInputRules() {
		return this.options.markdownLinks ? [Hv({
			type: this.type,
			isAllowedHref: (e) => this.options.isAllowedUri(e, {
				defaultValidate: (e) => !!Gv(e, this.options.protocols),
				protocols: this.options.protocols,
				defaultProtocol: this.options.defaultProtocol
			})
		})] : [];
	},
	addPasteRules() {
		let e = (e) => {
			let t = [];
			if (e) {
				let { protocols: n, defaultProtocol: r } = this.options;
				Ev(e).filter((e) => e.isLink && this.options.isAllowedUri(e.value, {
					defaultValidate: (e) => !!Gv(e, n),
					protocols: n,
					defaultProtocol: r
				})).forEach((e) => {
					this.options.shouldAutoLink(e.value) && t.push({
						text: e.value,
						data: { href: e.href },
						index: e.start
					});
				});
			}
			return t;
		};
		return this.options.markdownLinks ? [Uv({
			type: this.type,
			isAllowedHref: (e) => this.options.isAllowedUri(e, {
				defaultValidate: (e) => !!Gv(e, this.options.protocols),
				protocols: this.options.protocols,
				defaultProtocol: this.options.defaultProtocol
			}),
			findPlainUrls: e
		})] : [im({
			find: e,
			type: this.type,
			getAttributes: (e) => ({ href: e.data?.href })
		})];
	},
	addProseMirrorPlugins() {
		let e = [], { protocols: t, defaultProtocol: n } = this.options;
		return this.options.autolink && e.push(Mv({
			type: this.type,
			defaultProtocol: this.options.defaultProtocol,
			validate: (e) => this.options.isAllowedUri(e, {
				defaultValidate: (e) => !!Gv(e, t),
				protocols: t,
				defaultProtocol: n
			}),
			shouldAutoLink: this.options.shouldAutoLink
		})), e.push(Nv({
			type: this.type,
			editor: this.editor,
			openOnClick: this.options.openOnClick === "whenNotEditable" || this.options.openOnClick,
			enableClickSelection: this.options.enableClickSelection
		})), this.options.linkOnPaste && e.push(Wv({
			editor: this.editor,
			defaultProtocol: this.options.defaultProtocol,
			type: this.type,
			shouldAutoLink: this.options.shouldAutoLink
		})), e;
	}
}), qv = "listItem", Jv = "textStyle", Yv = /^\s*([-+*])\s$/, Xv = G.create({
	name: "bulletList",
	addOptions() {
		return {
			itemTypeName: "listItem",
			HTMLAttributes: {},
			keepMarks: !1,
			keepAttributes: !1
		};
	},
	group: "block list",
	content() {
		return `${this.options.itemTypeName}+`;
	},
	parseHTML() {
		return [{ tag: "ul" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"ul",
			U(this.options.HTMLAttributes, e),
			0
		];
	},
	markdownTokenName: "list",
	parseMarkdown: (e, t) => e.type !== "list" || e.ordered ? [] : {
		type: "bulletList",
		content: e.items ? t.parseChildren(e.items) : []
	},
	renderMarkdown: (e, t) => e.content ? t.renderChildren(e.content, "\n") : "",
	markdownOptions: { indentsContent: !0 },
	addCommands() {
		return { toggleBulletList: () => ({ commands: e, chain: t }) => this.options.keepAttributes ? t().toggleList(this.name, this.options.itemTypeName, this.options.keepMarks).updateAttributes(qv, this.editor.getAttributes(Jv)).run() : e.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks) };
	},
	addKeyboardShortcuts() {
		return { "Mod-Shift-8": () => this.editor.commands.toggleBulletList() };
	},
	addInputRules() {
		let e = Gp({
			find: Yv,
			type: this.type
		});
		return (this.options.keepMarks || this.options.keepAttributes) && (e = Gp({
			find: Yv,
			type: this.type,
			keepMarks: this.options.keepMarks,
			keepAttributes: this.options.keepAttributes,
			getAttributes: () => this.editor.getAttributes(Jv),
			editor: this.editor
		})), [e];
	}
}), Zv = (e, t, n) => {
	let { selection: r } = e;
	if (!r.empty) return null;
	let { $from: i } = r;
	if (!i.parent.isTextblock || i.parentOffset !== i.parent.content.size) return null;
	let a = -1;
	for (let e = i.depth; e > 0; --e) if (i.node(e).type.name === t) {
		a = e;
		break;
	}
	if (a < 0) return null;
	let o = i.node(a), s = i.index(a);
	if (s + 1 >= o.childCount) return null;
	let c = o.child(s + 1);
	if (!n.includes(c.type.name)) return null;
	let l = e.schema.nodes[t], u = !1;
	if (c.forEach((e) => {
		e.type === l && e.childCount > 1 && (u = !0);
	}), !u) return null;
	let d = e.doc.resolve(i.after()).nodeAfter;
	if (!d || !n.includes(d.type.name)) return null;
	let f = [];
	return d.forEach((e) => {
		f.push(e);
	}), f.length === 0 ? null : {
		listItemDepth: a,
		nestedList: d,
		nestedListPos: i.after(),
		insertPos: i.after(a),
		items: f
	};
}, Qv = (e, t, n, r) => {
	let i = Zv(e, n, r);
	if (!i) return !1;
	let { selection: a } = e, { nestedList: o, nestedListPos: s, insertPos: c, items: u } = i, d = e.tr;
	d.delete(s, s + o.nodeSize);
	let f = d.mapping.map(c);
	return d.insert(f, l.from(u)), d.setSelection(a.map(d.doc, d.mapping)), t && t(d), !0;
}, $v = (e, t, n) => Qv(e.state, e.view.dispatch, t, n), ey = (e, t) => W.create({
	name: `${e}BranchingDeleteKeymap`,
	priority: 101,
	addKeyboardShortcuts() {
		let n = () => $v(this.editor, e, t);
		return {
			Delete: n,
			"Mod-Delete": n
		};
	}
}), ty = [
	[1e3, "m"],
	[900, "cm"],
	[500, "d"],
	[400, "cd"],
	[100, "c"],
	[90, "xc"],
	[50, "l"],
	[40, "xl"],
	[10, "x"],
	[9, "ix"],
	[5, "v"],
	[4, "iv"],
	[1, "i"]
], ny = "abcdefghijklmnopqrstuvwxyz", ry = String.raw`\d+|[ivxlcdmIVXLCDM]+|${"[a-zA-Z]{1,2}"}`;
function iy(e) {
	let t = e, n = "";
	for (let [e, r] of ty) for (; t >= e;) n += r, t -= e;
	return n;
}
function ay(e) {
	return iy(e).toUpperCase();
}
function oy(e) {
	let t = e.toLowerCase(), n = 0, r = 0;
	for (; n < t.length;) {
		let e = !1;
		for (let [i, a] of ty) if (t.startsWith(a, n)) {
			r += i, n += a.length, e = !0;
			break;
		}
		if (!e) return 0;
	}
	return r;
}
function sy(e) {
	if (!/^[ivxlcdmIVXLCDM]+$/.test(e)) return !1;
	let t = oy(e);
	return t <= 0 ? !1 : (e === e.toLowerCase() ? iy(t) : ay(t)) === e;
}
function cy(e) {
	let t = e.toLowerCase();
	if (t.length === 1) return t.charCodeAt(0) - 97 + 1;
	if (t.length === 2) {
		let e = t.charCodeAt(0) - 97, n = t.charCodeAt(1) - 97;
		return (e + 1) * 26 + n + 1;
	}
	return 0;
}
function ly(e) {
	if (e <= 26) return ny[e - 1];
	let t = Math.floor((e - 1) / 26) - 1, n = (e - 1) % 26;
	return t < 0 ? ny[n] : ny[t] + ny[n];
}
function uy(e) {
	if (e && !/^\d+$/.test(e)) {
		if (sy(e)) return e === e.toLowerCase() ? "i" : "I";
		if (/^[a-z]{1,2}$/.test(e)) return "a";
		if (/^[A-Z]{1,2}$/.test(e)) return "A";
	}
}
function dy(e) {
	if (/^\d+$/.test(e)) return parseInt(e, 10);
	let t = uy(e);
	if (t === "i" || t === "I") return oy(e);
	if (t === "a" || t === "A") {
		let t = cy(e);
		return t > 0 ? t : 1;
	}
	let n = parseInt(e, 10);
	return Number.isNaN(n) ? 1 : n;
}
function fy(e, t) {
	if (e === "numeric") return String(t);
	switch (e) {
		case "a": return ly(t);
		case "A": return ly(t).toUpperCase();
		case "i": return iy(t);
		case "I": return ay(t);
		default: return String(t);
	}
}
function py(e) {
	if (e.length === 0) return !1;
	let t = uy(e[0]) ?? "numeric", n = dy(e[0]);
	if (n < 1) return !1;
	for (let r = 0; r < e.length; r++) {
		let i = fy(t, n + r);
		if (e[r] !== i) return !1;
	}
	return !0;
}
function my(e) {
	return {
		type: uy(e),
		start: dy(e)
	};
}
function hy(e) {
	let { type: t, start: n } = my(e), r = {};
	return t && (r.type = t), n !== 1 && (r.start = n), r;
}
function gy(e, t, n = ". ") {
	let r = t + 1;
	if (!e || e === "1") return `${r}${n}`;
	switch (e) {
		case "a": return `${ly(r)}${n}`;
		case "A": return `${ly(r).toUpperCase()}${n}`;
		case "i": return `${iy(r)}${n}`;
		case "I": return `${ay(r)}${n}`;
		default: return `${r}${n}`;
	}
}
function _y(e) {
	let t = e.tokens?.[0];
	return !!(e.text && e.tokens?.length === 1 && t?.type === "list" && t.ordered && t.raw === e.text);
}
function vy(e, t) {
	return t.tokenizeInline ? t.parseInline(t.tokenizeInline(e)) : t.parseInline([{
		type: "text",
		raw: e,
		text: e
	}]);
}
var yy = G.create({
	name: "listItem",
	addOptions() {
		return {
			HTMLAttributes: {},
			bulletListTypeName: "bulletList",
			orderedListTypeName: "orderedList"
		};
	},
	content: "paragraph block*",
	defining: !0,
	parseHTML() {
		return [{ tag: "li" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"li",
			U(this.options.HTMLAttributes, e),
			0
		];
	},
	markdownTokenName: "list_item",
	parseMarkdown: (e, t) => {
		if (e.type !== "list_item") return [];
		let n = t.parseBlockChildren ?? t.parseChildren, r = [];
		if (e.tokens && e.tokens.length > 0) {
			if (_y(e)) return {
				type: "listItem",
				content: [{
					type: "paragraph",
					content: vy(e.text || "", t)
				}]
			};
			if (e.tokens.some((e) => e.type === "paragraph")) r = n(e.tokens);
			else {
				let i = e.tokens[0];
				if (i && i.type === "text" && i.tokens && i.tokens.length > 0) {
					if (r = [{
						type: "paragraph",
						content: t.parseInline(i.tokens)
					}], e.tokens.length > 1) {
						let t = n(e.tokens.slice(1));
						r.push(...t);
					}
				} else r = n(e.tokens);
			}
		}
		return r.length === 0 && (r = [{
			type: "paragraph",
			content: []
		}]), {
			type: "listItem",
			content: r
		};
	},
	renderMarkdown: (e, t, n) => Zf(e, t, (e) => {
		if (e.parentType === "bulletList") return "- ";
		if (e.parentType === "orderedList") {
			var t, n;
			let r = ((t = e.meta) == null || (t = t.parentAttrs) == null ? void 0 : t.start) || 1;
			return gy((n = e.meta) == null || (n = n.parentAttrs) == null ? void 0 : n.type, r - 1 + (e.index || 0), ". ");
		}
		return "- ";
	}, n, { alignNestedToPrefix: n?.parentType === "orderedList" }),
	addExtensions() {
		return [ey(this.name, [this.options.bulletListTypeName, this.options.orderedListTypeName])];
	},
	addKeyboardShortcuts() {
		return {
			Enter: () => this.editor.commands.splitListItem(this.name),
			Tab: () => this.editor.commands.sinkListItem(this.name),
			"Shift-Tab": () => this.editor.commands.liftListItem(this.name)
		};
	}
}), by = (e, t) => {
	let { $from: n } = t.selection, r = B(e, t.schema), i = null, a = n.depth, o = n.pos, s = null;
	for (; a > 0 && s === null;) i = n.node(a), i.type === r ? s = a : (--a, --o);
	return s === null ? null : {
		$pos: t.doc.resolve(o),
		depth: s
	};
}, xy = (e, t) => {
	let n = by(e, t);
	if (!n) return !1;
	let [, r] = Pu(t, e, n.$pos.pos + 4);
	return r;
}, Sy = (e, t, n) => {
	let { $anchor: r } = e.selection, i = Math.max(0, r.pos - 2), a = e.doc.resolve(i).node();
	return !(!a || !n.includes(a.type.name));
}, Cy = (e, t, n) => {
	if (e.commands.undoInputRule()) return !0;
	if (e.state.selection.from !== e.state.selection.to) return !1;
	if (!Pl(e.state, t) && Sy(e.state, t, n)) {
		let { $anchor: n } = e.state.selection, r = e.state.doc.resolve(n.before() - 1), i = [];
		r.node().descendants((e, n) => {
			e.type.name === t && i.push({
				node: e,
				pos: n
			});
		});
		let a = i.at(-1);
		if (!a) return !1;
		let o = e.state.doc.resolve(r.start() + a.pos + 1);
		return e.chain().cut({
			from: n.start() - 1,
			to: n.end() + 1
		}, o.end()).joinForward().run();
	}
	if (!Pl(e.state, t) || !Hu(e.state)) return !1;
	let { $from: r } = e.state.selection, i = r.depth - 1;
	return r.node(i).type !== e.schema.nodes[t] || r.index(i) !== 0 ? !1 : e.chain().liftListItem(t).run();
}, wy = (e, t) => {
	let n = xy(e, t), r = by(e, t);
	return !r || !n ? !1 : n > r.depth;
}, Ty = (e, t) => {
	let n = xy(e, t), r = by(e, t);
	return !r || !n ? !1 : n < r.depth;
}, Ey = (e, t) => {
	if (!Pl(e.state, t) || !Vu(e.state, t)) return !1;
	let { selection: n } = e.state, { $from: r, $to: i } = n;
	return !n.empty && r.sameParent(i) ? !1 : wy(t, e.state) ? e.chain().focus(e.state.selection.from + 4).lift(t).joinBackward().run() : Ty(t, e.state) ? e.chain().joinForward().joinBackward().run() : e.commands.joinItemForward();
}, Dy = (e, t, n) => {
	let { state: r } = e, { selection: i } = r;
	if (!i.empty) return !1;
	let { $from: a } = i;
	if (a.parentOffset !== 0 || !a.parent.isTextblock || Pl(r, t)) return !1;
	let o = Fu(a);
	if (!o || !n.includes(o.type.name)) return !1;
	let s = o.lastChild;
	if (!s || s.type.name !== t) return !1;
	let c = a.parent;
	if (!s.canReplace(s.childCount, s.childCount, l.from(c))) return !1;
	let u = a.before(), d = a.after(), f = u - 2;
	return e.commands.command(({ tr: e, dispatch: t }) => (t && (e.delete(u, d).insert(f, l.from(c)), e.setSelection(k.create(e.doc, f + 1)), e.scrollIntoView()), !0));
}, Oy = W.create({
	name: "listKeymap",
	addOptions() {
		return { listTypes: [{
			itemName: "listItem",
			wrapperNames: ["bulletList", "orderedList"]
		}, {
			itemName: "taskItem",
			wrapperNames: ["taskList"]
		}] };
	},
	addKeyboardShortcuts() {
		return {
			Delete: ({ editor: e }) => {
				let t = !1;
				return this.options.listTypes.forEach(({ itemName: n }) => {
					e.state.schema.nodes[n] !== void 0 && Ey(e, n) && (t = !0);
				}), t;
			},
			"Mod-Delete": ({ editor: e }) => {
				let t = !1;
				return this.options.listTypes.forEach(({ itemName: n }) => {
					e.state.schema.nodes[n] !== void 0 && Ey(e, n) && (t = !0);
				}), t;
			},
			Backspace: ({ editor: e }) => {
				let t = !1;
				return this.options.listTypes.forEach(({ itemName: n, wrapperNames: r }) => {
					e.state.schema.nodes[n] !== void 0 && Cy(e, n, r) && (t = !0);
				}), t;
			},
			"Mod-Backspace": ({ editor: e }) => {
				let t = !1;
				return this.options.listTypes.forEach(({ itemName: n, wrapperNames: r }) => {
					e.state.schema.nodes[n] !== void 0 && Cy(e, n, r) && (t = !0);
				}), t;
			},
			Tab: ({ editor: e }) => {
				for (let { itemName: t, wrapperNames: n } of this.options.listTypes) if (e.state.schema.nodes[t] !== void 0 && Dy(e, t, n)) return !0;
				return !1;
			}
		};
	}
}), ky = RegExp(`^(\\s*)(${ry})([.)])\\s+(.*)$`), Ay = /^\s/, jy = {
	heading: /^#{1,6}(?:\s|$)/,
	bulletItem: /^[-+*]\s+/,
	codeFence: /^(?:```|~~~)/,
	blockMath: /^\$\$/,
	thematicBreak: /^(?:(?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})$/
};
function My(e) {
	return ky.test(e.trimStart());
}
function Ny(e) {
	let t = e.trimStart();
	return jy.bulletItem.test(t) || My(t) || jy.heading.test(t) || jy.thematicBreak.test(t) && !t.startsWith("-") || /^>\s?/.test(t) || jy.codeFence.test(t) || jy.blockMath.test(t);
}
function Py(e) {
	return Object.values(jy).some((t) => t.test(e));
}
function Fy(e) {
	let t = [], n = [], r = !1;
	return e.forEach((e) => {
		if (r) {
			n.push(e);
			return;
		}
		if (e.trim() === "") {
			r = !0, n.push(e);
			return;
		}
		if (t.length > 0 && Ny(e)) {
			r = !0, n.push(e);
			return;
		}
		t.push(e);
	}), {
		paragraphLines: t,
		blockLines: n
	};
}
function Iy(e) {
	let t = [], n = 0, r = 0;
	for (; n < e.length;) {
		let i = e[n], a = i.match(ky);
		if (!a) break;
		let [, o, s, c, l] = a, u = o.length, d = parseInt(s, 10), f = isNaN(d) ? uy(s) : void 0, p = isNaN(d) ? dy(s) : d, m = [l], h = n + 1, g = [i], _ = !1;
		for (; h < e.length;) {
			let t = e[h];
			if (t.match(ky)) break;
			if (t.trim() === "") g.push(t), m.push(""), _ = !0, h += 1;
			else if (t.match(Ay)) {
				let e = t.length - t.trimStart().length, n = u + s.length + 1;
				g.push(t), m.push(t.slice(Math.min(e, n))), h += 1;
			} else {
				if (_ || Py(t)) break;
				g.push(t), m.push(t), h += 1;
			}
		}
		t.push({
			indent: u,
			number: p,
			type: f,
			content: m.join("\n").trim(),
			contentLines: m,
			raw: g.join("\n")
		}), r = h, n = h;
	}
	return [t, r];
}
var Ly = RegExp(`^(${ry})([.)])\\s+(.+)$`);
function Ry(e) {
	let t = e.split("\n").filter((e) => e.trim().length > 0);
	if (t.length === 0) return null;
	let n = [];
	for (let e of t) {
		let t = e.trim().match(Ly);
		if (!t) return null;
		n.push({
			marker: t[1],
			content: t[3]
		});
	}
	return py(n.map((e) => e.marker)) ? {
		type: "orderedList",
		attrs: hy(n[0].marker),
		content: n.map((e) => ({
			type: "listItem",
			content: [{
				type: "paragraph",
				content: [{
					type: "text",
					text: e.content
				}]
			}]
		}))
	} : null;
}
function zy(e, t, n) {
	let r = [], i = 0;
	for (; i < e.length;) {
		let a = e[i];
		if (a.indent === t) {
			let { paragraphLines: o, blockLines: s } = Fy(a.contentLines), c = o.join("\n").trim(), l = [];
			c && l.push({
				type: "paragraph",
				raw: c,
				tokens: n.inlineTokens(c)
			});
			let u = s.join("\n").trim();
			if (u) {
				let e = n.blockTokens(u);
				l.push(...e);
			}
			let d = i + 1, f = [];
			for (; d < e.length && e[d].indent > t;) f.push(e[d]), d += 1;
			if (f.length > 0) {
				let e = zy(f, Math.min(...f.map((e) => e.indent)), n);
				l.push({
					type: "list",
					ordered: !0,
					start: f[0].number,
					typeMarker: f[0].type,
					items: e,
					raw: f.map((e) => e.raw).join("\n")
				});
			}
			r.push({
				type: "list_item",
				raw: a.raw,
				tokens: l
			}), i = d;
		} else i += 1;
	}
	return r;
}
function By(e, t) {
	return e.map((e) => {
		if (e.type !== "list_item") return t.parseChildren([e])[0];
		let n = [];
		return e.tokens && e.tokens.length > 0 && e.tokens.forEach((e) => {
			if (e.type === "paragraph" || e.type === "list" || e.type === "blockquote" || e.type === "code") n.push(...t.parseChildren([e]));
			else if (e.type === "text" && e.tokens) {
				let r = t.parseChildren([e]);
				n.push({
					type: "paragraph",
					content: r
				});
			} else {
				let r = t.parseChildren([e]);
				r.length > 0 && n.push(...r);
			}
		}), {
			type: "listItem",
			content: n
		};
	});
}
var Vy = "listItem", Hy = "textStyle", Uy = /^(\d+)\.\s$/;
function Wy(e) {
	let t = e.match(/list-style-type\s*:\s*([^;]+)/i);
	if (!t) return null;
	switch (t[1].trim().toLowerCase()) {
		case "upper-roman": return "I";
		case "lower-roman": return "i";
		case "upper-alpha":
		case "upper-latin": return "A";
		case "lower-alpha":
		case "lower-latin": return "a";
		default: return null;
	}
}
var Gy = G.create({
	name: "orderedList",
	addOptions() {
		return {
			itemTypeName: "listItem",
			HTMLAttributes: {},
			keepMarks: !1,
			keepAttributes: !1
		};
	},
	group: "block list",
	content() {
		return `${this.options.itemTypeName}+`;
	},
	addAttributes() {
		return {
			start: {
				default: 1,
				parseHTML: (e) => e.hasAttribute("start") ? parseInt(e.getAttribute("start") || "", 10) : 1
			},
			type: {
				default: null,
				parseHTML: (e) => {
					let t = e.getAttribute("type");
					if (t) return t;
					let n = e.getAttribute("style");
					if (n) {
						let e = Wy(n);
						if (e) return e;
					}
					let r = e.querySelector("li");
					if (r) {
						let e = r.getAttribute("style");
						if (e) {
							let t = Wy(e);
							if (t) return t;
						}
					}
					return null;
				}
			}
		};
	},
	parseHTML() {
		return [{ tag: "ol" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		let { start: t, type: n, ...r } = e, i = U(this.options.HTMLAttributes, r);
		return t !== 1 && (i.start = t), n && n !== "1" && (i.type = n), [
			"ol",
			i,
			0
		];
	},
	markdownTokenName: "list",
	parseMarkdown: (e, t) => {
		if (e.type !== "list" || !e.ordered) return [];
		let n = e.start || 1, r = e.typeMarker, i = e.items ? By(e.items, t) : [], a = {};
		return n !== 1 && (a.start = n), r && (a.type = r), Object.keys(a).length > 0 ? {
			type: "orderedList",
			attrs: a,
			content: i
		} : {
			type: "orderedList",
			content: i
		};
	},
	renderMarkdown: (e, t) => e.content ? t.renderChildren(e.content, "\n") : "",
	markdownTokenizer: {
		name: "orderedList",
		level: "block",
		start: () => -1,
		tokenize: (e, t, n) => {
			let r = e.split("\n"), [i, a] = Iy(r);
			if (i.length === 0) return;
			let o = zy(i, i[0].indent, n);
			if (o.length !== 0) return {
				type: "list",
				ordered: !0,
				start: i[0]?.number || 1,
				typeMarker: i[0]?.type,
				items: o,
				raw: r.slice(0, a).join("\n")
			};
		}
	},
	markdownOptions: { indentsContent: !0 },
	addCommands() {
		return { toggleOrderedList: () => ({ commands: e, chain: t }) => this.options.keepAttributes ? t().toggleList(this.name, this.options.itemTypeName, this.options.keepMarks).updateAttributes(Vy, this.editor.getAttributes(Hy)).run() : e.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks) };
	},
	addKeyboardShortcuts() {
		return { "Mod-Shift-7": () => this.editor.commands.toggleOrderedList() };
	},
	addProseMirrorPlugins() {
		return [new j({ props: { handlePaste: (e, t) => {
			if ((t.clipboardData?.getData("text/html"))?.trim()) return !1;
			let n = t.clipboardData?.getData("text/plain");
			if (!n) return !1;
			let r = Ry(n);
			if (!r) return !1;
			try {
				let t = e.state.schema.nodeFromJSON(r), n = e.state.tr.replaceSelectionWith(t);
				return e.dispatch(n), !0;
			} catch {
				return !1;
			}
		} } })];
	},
	addInputRules() {
		let e = (e, t) => (!t.attrs.type || t.attrs.type === "1") && t.childCount + t.attrs.start === +e[1], t = Gp({
			find: Uy,
			type: this.type,
			getAttributes: (e) => ({ start: +e[1] }),
			joinPredicate: e
		});
		return (this.options.keepMarks || this.options.keepAttributes) && (t = Gp({
			find: Uy,
			type: this.type,
			keepMarks: this.options.keepMarks,
			keepAttributes: this.options.keepAttributes,
			getAttributes: (e) => ({
				start: +e[1],
				...this.editor.getAttributes(Hy)
			}),
			joinPredicate: e,
			editor: this.editor
		})), [t];
	}
}), Ky = /^\s*(\[([( |x])?\])\s$/, qy = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0", Jy = (e, t, n) => {
	var r;
	return (n == null || (r = n.checkboxLabel) == null ? void 0 : r.call(n, e, t)) || `Task item checkbox for ${e.textContent || "empty task item"}`;
}, Yy = G.create({
	name: "taskItem",
	addOptions() {
		return {
			nested: !1,
			HTMLAttributes: {},
			taskListTypeName: "taskList",
			a11y: void 0
		};
	},
	content() {
		return this.options.nested ? "paragraph block*" : "paragraph+";
	},
	defining: !0,
	addAttributes() {
		return { checked: {
			default: !1,
			keepOnSplit: !1,
			parseHTML: (e) => {
				let t = e.getAttribute("data-checked");
				return t === "" || t === "true";
			},
			renderHTML: (e) => ({ "data-checked": e.checked })
		} };
	},
	parseHTML() {
		return [{
			tag: `li[data-type="${this.name}"]`,
			priority: 51,
			contentElement: (e) => e.querySelector("div") ?? e
		}];
	},
	renderHTML({ node: e, HTMLAttributes: t }) {
		return [
			"li",
			U(this.options.HTMLAttributes, t, { "data-type": this.name }),
			[
				"label",
				["input", {
					type: "checkbox",
					checked: e.attrs.checked ? "checked" : null
				}],
				["span"]
			],
			["div", 0]
		];
	},
	parseMarkdown: (e, t) => {
		let n = [];
		if (e.tokens && e.tokens.length > 0 ? n.push(t.createNode("paragraph", {}, t.parseInline(e.tokens))) : e.text ? n.push(t.createNode("paragraph", {}, [t.createNode("text", { text: e.text })])) : n.push(t.createNode("paragraph", {}, [])), e.nestedTokens && e.nestedTokens.length > 0) {
			let r = t.parseChildren(e.nestedTokens);
			n.push(...r);
		}
		return t.createNode("taskItem", { checked: e.checked || !1 }, n);
	},
	renderMarkdown: (e, t) => Zf(e, t, `- [${e.attrs?.checked ? "x" : " "}] `),
	addExtensions() {
		return this.options.nested ? [ey(this.name, [this.options.taskListTypeName])] : [];
	},
	addKeyboardShortcuts() {
		let e = {
			Enter: () => this.editor.commands.splitListItem(this.name),
			"Shift-Tab": () => this.editor.commands.liftListItem(this.name)
		};
		return this.options.nested ? {
			...e,
			Tab: () => this.editor.commands.sinkListItem(this.name)
		} : e;
	},
	addNodeView() {
		return ({ node: e, HTMLAttributes: t, getPos: n, editor: r }) => {
			let i = document.createElement("li"), a = document.createElement("label"), o = document.createElement("span"), s = document.createElement("input"), c = document.createElement("div");
			o.style.cssText = qy;
			let l = (e) => {
				let t = Jy(e, e.attrs.checked, this.options.a11y);
				s.setAttribute("aria-label", t), o.textContent = t;
			};
			l(e), a.contentEditable = "false", s.type = "checkbox", s.addEventListener("mousedown", (e) => e.preventDefault()), s.addEventListener("change", (t) => {
				if (!r.isEditable && !this.options.onReadOnlyChecked) {
					s.checked = !s.checked;
					return;
				}
				let { checked: i } = t.target;
				r.isEditable && typeof n == "function" && r.chain().focus(void 0, { scrollIntoView: !1 }).command(({ tr: e }) => {
					let t = n();
					if (typeof t != "number") return !1;
					let r = e.doc.nodeAt(t);
					return e.setNodeMarkup(t, void 0, {
						...r?.attrs,
						checked: i
					}), !0;
				}).run(), !r.isEditable && this.options.onReadOnlyChecked && (this.options.onReadOnlyChecked(e, i) || (s.checked = !s.checked));
			}), Object.entries(this.options.HTMLAttributes).forEach(([e, t]) => {
				i.setAttribute(e, t);
			}), i.dataset.checked = e.attrs.checked, s.checked = e.attrs.checked, a.append(s, o), i.append(a, c), Object.entries(t).forEach(([e, t]) => {
				i.setAttribute(e, t);
			});
			let u = new Set(Object.keys(t));
			return {
				dom: i,
				contentDOM: c,
				update: (e) => {
					if (e.type !== this.type) return !1;
					i.dataset.checked = e.attrs.checked, s.checked = e.attrs.checked, l(e);
					let t = r.extensionManager.attributes, n = du(e, t), a = new Set(Object.keys(n)), o = this.options.HTMLAttributes;
					return u.forEach((e) => {
						a.has(e) || (e in o ? i.setAttribute(e, o[e]) : i.removeAttribute(e));
					}), Object.entries(n).forEach(([e, t]) => {
						t == null ? e in o ? i.setAttribute(e, o[e]) : i.removeAttribute(e) : i.setAttribute(e, t);
					}), u = a, !0;
				}
			};
		};
	},
	addInputRules() {
		return [Gp({
			find: Ky,
			type: this.type,
			getAttributes: (e) => ({ checked: e[e.length - 1] === "x" })
		})];
	}
}), Xy = G.create({
	name: "taskList",
	addOptions() {
		return {
			itemTypeName: "taskItem",
			HTMLAttributes: {}
		};
	},
	group: "block list",
	content() {
		return `${this.options.itemTypeName}+`;
	},
	parseHTML() {
		return [{
			tag: `ul[data-type="${this.name}"]`,
			priority: 51
		}];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"ul",
			U(this.options.HTMLAttributes, e, { "data-type": this.name }),
			0
		];
	},
	parseMarkdown: (e, t) => t.createNode("taskList", {}, t.parseChildren(e.items || [])),
	renderMarkdown: (e, t) => e.content ? t.renderChildren(e.content, "\n") : "",
	markdownTokenizer: {
		name: "taskList",
		level: "block",
		start(e) {
			let t = e.match(/^\s*[-+*]\s+\[([ xX])\]\s+/)?.index;
			return t === void 0 ? -1 : t;
		},
		tokenize(e, t, n) {
			let r = (e) => {
				let t = Jf(e, {
					itemPattern: /^(\s*)([-+*])\s+\[([ xX])\]\s+(.*)$/,
					extractItemData: (e) => ({
						indentLevel: e[1].length,
						mainContent: e[4],
						checked: e[3].toLowerCase() === "x"
					}),
					createToken: (e, t) => ({
						type: "taskItem",
						raw: "",
						mainContent: e.mainContent,
						indentLevel: e.indentLevel,
						checked: e.checked,
						text: e.mainContent,
						tokens: n.inlineTokens(e.mainContent),
						nestedTokens: t
					}),
					customNestedParser: r
				}, n);
				if (t) {
					let r = {
						type: "taskList",
						raw: t.raw,
						items: t.items
					}, i = e.slice(t.raw.length);
					return i.trim() ? [r, ...n.blockTokens(i)] : [r];
				}
				return n.blockTokens(e);
			}, i = Jf(e, {
				itemPattern: /^(\s*)([-+*])\s+\[([ xX])\]\s+(.*)$/,
				extractItemData: (e) => ({
					indentLevel: e[1].length,
					mainContent: e[4],
					checked: e[3].toLowerCase() === "x"
				}),
				createToken: (e, t) => ({
					type: "taskItem",
					raw: "",
					mainContent: e.mainContent,
					indentLevel: e.indentLevel,
					checked: e.checked,
					text: e.mainContent,
					tokens: n.inlineTokens(e.mainContent),
					nestedTokens: t
				}),
				customNestedParser: r
			}, n);
			if (i) return {
				type: "taskList",
				raw: i.raw,
				items: i.items
			};
		}
	},
	markdownOptions: { indentsContent: !0 },
	addCommands() {
		return { toggleTaskList: () => ({ commands: e }) => e.toggleList(this.name, this.options.itemTypeName) };
	},
	addKeyboardShortcuts() {
		return { "Mod-Shift-9": () => this.editor.commands.toggleTaskList() };
	}
});
W.create({
	name: "listKit",
	addExtensions() {
		let e = [];
		return this.options.bulletList !== !1 && e.push(Xv.configure(this.options.bulletList)), this.options.listItem !== !1 && e.push(yy.configure(this.options.listItem)), this.options.listKeymap !== !1 && e.push(Oy.configure(this.options.listKeymap)), this.options.orderedList !== !1 && e.push(Gy.configure(this.options.orderedList)), this.options.taskItem !== !1 && e.push(Yy.configure(this.options.taskItem)), this.options.taskList !== !1 && e.push(Xy.configure(this.options.taskList)), e;
	}
});
//#endregion
//#region ../../node_modules/@tiptap/extension-paragraph/dist/index.js
var Zy = "&nbsp;", Qy = "\xA0", $y = G.create({
	name: "paragraph",
	priority: 1e3,
	addOptions() {
		return { HTMLAttributes: {} };
	},
	group: "block",
	content: "inline*",
	parseHTML() {
		return [{ tag: "p" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"p",
			U(this.options.HTMLAttributes, e),
			0
		];
	},
	parseMarkdown: (e, t) => {
		let n = e.tokens || [];
		if (n.length === 1 && n[0].type === "image") return t.parseChildren([n[0]]);
		let r = t.parseInline(n);
		return n.length === 1 && n[0].type === "text" && (n[0].raw === Zy || n[0].text === Zy || n[0].raw === Qy || n[0].text === Qy) && r.length === 1 && r[0].type === "text" && (r[0].text === Zy || r[0].text === Qy) ? t.createNode("paragraph", void 0, []) : t.createNode("paragraph", void 0, r);
	},
	renderMarkdown: (e, t, n) => {
		if (!e) return "";
		let r = Array.isArray(e.content) ? e.content : [];
		if (r.length === 0) {
			var i, a;
			let e = Array.isArray(n == null || (i = n.previousNode) == null ? void 0 : i.content) ? n.previousNode.content : [];
			return (n == null || (a = n.previousNode) == null ? void 0 : a.type) === "paragraph" && e.length === 0 ? Zy : "";
		}
		return t.renderChildren(r);
	},
	addCommands() {
		return { setParagraph: () => ({ commands: e }) => e.setNode(this.name) };
	},
	addKeyboardShortcuts() {
		return { "Mod-Alt-0": () => this.editor.commands.setParagraph() };
	}
}), eb = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))$/, tb = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))/g, nb = lp.create({
	name: "strike",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	parseHTML() {
		return [
			{ tag: "s" },
			{ tag: "del" },
			{ tag: "strike" },
			{
				style: "text-decoration",
				consuming: !1,
				getAttrs: (e) => e.includes("line-through") ? {} : !1
			}
		];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"s",
			U(this.options.HTMLAttributes, e),
			0
		];
	},
	markdownTokenName: "del",
	parseMarkdown: (e, t) => t.applyMark("strike", t.parseInline(e.tokens || [])),
	renderMarkdown: (e, t) => `~~${t.renderChildren(e)}~~`,
	addCommands() {
		return {
			setStrike: () => ({ commands: e }) => e.setMark(this.name),
			toggleStrike: () => ({ commands: e }) => e.toggleMark(this.name),
			unsetStrike: () => ({ commands: e }) => e.unsetMark(this.name)
		};
	},
	addKeyboardShortcuts() {
		return { "Mod-Shift-s": () => this.editor.commands.toggleStrike() };
	},
	addInputRules() {
		return [Vp({
			find: eb,
			type: this.type
		})];
	},
	addPasteRules() {
		return [im({
			find: tb,
			type: this.type
		})];
	}
}), rb = G.create({
	name: "text",
	group: "inline",
	parseMarkdown: (e) => ({
		type: "text",
		text: e.text || ""
	}),
	renderMarkdown: (e) => e.text || ""
}), ib = lp.create({
	name: "underline",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	parseHTML() {
		return [{ tag: "u" }, {
			style: "text-decoration",
			consuming: !1,
			getAttrs: (e) => e.includes("underline") ? {} : !1
		}];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"u",
			U(this.options.HTMLAttributes, e),
			0
		];
	},
	parseMarkdown(e, t) {
		return t.applyMark(this.name || "underline", t.parseInline(e.tokens || []));
	},
	renderMarkdown(e, t) {
		return `++${t.renderChildren(e)}++`;
	},
	markdownTokenizer: {
		name: "underline",
		level: "inline",
		start(e) {
			return e.indexOf("++");
		},
		tokenize(e, t, n) {
			let r = /^(\+\+)([\s\S]+?)(\+\+)/.exec(e);
			if (!r) return;
			let i = r[2].trim();
			return {
				type: "underline",
				raw: r[0],
				text: i,
				tokens: n.inlineTokens(i)
			};
		}
	},
	addCommands() {
		return {
			setUnderline: () => ({ commands: e }) => e.setMark(this.name),
			toggleUnderline: () => ({ commands: e }) => e.toggleMark(this.name),
			unsetUnderline: () => ({ commands: e }) => e.unsetMark(this.name)
		};
	},
	addKeyboardShortcuts() {
		return {
			"Mod-u": () => this.editor.commands.toggleUnderline(),
			"Mod-U": () => this.editor.commands.toggleUnderline()
		};
	}
});
//#endregion
//#region resources/js/blocks/move-block.js
function ab(e, t, n, r) {
	if (t instanceof A) {
		e.setSelection(A.create(e.doc, r));
		return;
	}
	if (t instanceof k) {
		e.setSelection(k.create(e.doc, r + t.anchor - n, r + t.head - n));
		return;
	}
	e.setSelection(O.near(e.doc.resolve(r + 1)));
}
function ob(e, t, n) {
	let r = e.doc.nodeAt(t);
	if (!r) return !1;
	let i = t + r.nodeSize;
	if (n >= t && n <= i) return !1;
	let { selection: a } = e, o = a.from >= t && a.to <= i, s = n < t ? n : n - r.nodeSize;
	return e.delete(t, i), e.insert(s, r), o && ab(e, a, t, s), !0;
}
function sb(e, t) {
	let n = e.doc.nodeAt(t), r = t + n.nodeSize, { selection: i } = e;
	e.insert(r, n), ab(e, i, t, r);
}
function cb(e, t) {
	let n = t + e.doc.nodeAt(t).nodeSize;
	if (e.doc.childCount === 1) {
		e.replaceWith(t, n, e.doc.type.schema.nodes.paragraph.create()), e.setSelection(k.create(e.doc, t + 1));
		return;
	}
	e.delete(t, n), e.setSelection(O.near(e.doc.resolve(Math.min(t, e.doc.content.size))));
}
//#endregion
//#region resources/js/blocks/block-commands.js
var lb = (e) => Bh(e) || Rh(e) ? null : Fh(e), ub = [
	"bulletList",
	"orderedList",
	"blockquote"
], db = (e) => ({ tr: t, dispatch: n }) => {
	let r = lb(t);
	if (!r) return !1;
	let i = t.doc.resolve(r.pos).index(0), a = e < 0 ? t.doc.maybeChild(i - 1) : t.doc.maybeChild(i + 1);
	if (!a) return !1;
	if (n) {
		let n = e < 0 ? r.pos - a.nodeSize : r.pos + r.node.nodeSize + a.nodeSize;
		ob(t, r.pos, n), t.scrollIntoView();
	}
	return !0;
}, fb = W.create({
	name: "repBlockCommands",
	addCommands() {
		return {
			moveBlockUp: () => db(-1),
			moveBlockDown: () => db(1),
			moveBlockTo: (e, t) => ({ tr: n }) => ob(n, e, t),
			duplicateBlock: () => ({ tr: e, dispatch: t }) => {
				let n = lb(e);
				return n ? (t && sb(e, n.pos), !0) : !1;
			},
			deleteBlock: () => ({ tr: e, dispatch: t }) => {
				let n = lb(e);
				return n ? (t && cb(e, n.pos), !0) : !1;
			},
			selectParentBlock: () => ({ tr: e, dispatch: t }) => {
				let { $from: n, to: r } = e.selection;
				for (let i = n.sharedDepth(r); i > 0; i--) if (ub.includes(n.node(i).type.name)) return t && e.setSelection(A.create(e.doc, n.before(i))), !0;
				return !1;
			},
			setListType: (e) => ({ state: t, commands: n }) => {
				let r = Lh(t.selection);
				return r ? r.type.name === e || n.toggleList(e, "listItem") : !1;
			},
			increaseBlockLevel: () => ({ state: e, commands: t }) => {
				let n = Ih(e.selection)?.name;
				return n === "listItem" ? t.sinkListItem("listItem") : n === "blockquote" && t.wrapIn("blockquote");
			},
			decreaseBlockLevel: () => ({ state: e, commands: t }) => {
				let n = Ih(e.selection)?.name;
				return n === "listItem" ? t.liftListItem("listItem") : n === "blockquote" && t.lift("blockquote");
			}
		};
	},
	addKeyboardShortcuts() {
		return {
			"Alt-Shift-ArrowUp": () => this.editor.commands.moveBlockUp(),
			"Alt-Shift-ArrowDown": () => this.editor.commands.moveBlockDown()
		};
	}
}), pb = Math.min, mb = Math.max, hb = Math.round, gb = Math.floor, _b = (e) => ({
	x: e,
	y: e
}), vb = {
	left: "right",
	right: "left",
	bottom: "top",
	top: "bottom"
};
function yb(e, t, n) {
	return mb(e, pb(t, n));
}
function bb(e, t) {
	return typeof e == "function" ? e(t) : e;
}
function xb(e) {
	return e.split("-")[0];
}
function Sb(e) {
	return e.split("-")[1];
}
function Cb(e) {
	return e === "x" ? "y" : "x";
}
function wb(e) {
	return e === "y" ? "height" : "width";
}
function Tb(e) {
	let t = e[0];
	return t === "t" || t === "b" ? "y" : "x";
}
function Eb(e) {
	return Cb(Tb(e));
}
function Db(e, t, n) {
	n === void 0 && (n = !1);
	let r = Sb(e), i = Eb(e), a = wb(i), o = i === "x" ? r === (n ? "end" : "start") ? "right" : "left" : r === "start" ? "bottom" : "top";
	return t.reference[a] > t.floating[a] && (o = Ib(o)), [o, Ib(o)];
}
function Ob(e) {
	let t = Ib(e);
	return [
		kb(e),
		t,
		kb(t)
	];
}
function kb(e) {
	return e.includes("start") ? e.replace("start", "end") : e.replace("end", "start");
}
var Ab = ["left", "right"], jb = ["right", "left"], Mb = ["top", "bottom"], Nb = ["bottom", "top"];
function Pb(e, t, n) {
	switch (e) {
		case "top":
		case "bottom": return n ? t ? jb : Ab : t ? Ab : jb;
		case "left":
		case "right": return t ? Mb : Nb;
		default: return [];
	}
}
function Fb(e, t, n, r) {
	let i = Sb(e), a = Pb(xb(e), n === "start", r);
	return i && (a = a.map((e) => e + "-" + i), t && (a = a.concat(a.map(kb)))), a;
}
function Ib(e) {
	let t = xb(e);
	return vb[t] + e.slice(t.length);
}
function Lb(e) {
	return {
		top: e.top ?? 0,
		right: e.right ?? 0,
		bottom: e.bottom ?? 0,
		left: e.left ?? 0
	};
}
function Rb(e) {
	return typeof e == "number" ? {
		top: e,
		right: e,
		bottom: e,
		left: e
	} : Lb(e);
}
function zb(e) {
	let { x: t, y: n, width: r, height: i } = e;
	return {
		width: r,
		height: i,
		top: n,
		left: t,
		right: t + r,
		bottom: n + i,
		x: t,
		y: n
	};
}
//#endregion
//#region ../../node_modules/@floating-ui/core/dist/floating-ui.core.mjs
function Bb(e, t, n) {
	let { reference: r, floating: i } = e, a = Tb(t), o = Eb(t), s = wb(o), c = xb(t), l = a === "y", u = r.x + r.width / 2 - i.width / 2, d = r.y + r.height / 2 - i.height / 2, f = r[s] / 2 - i[s] / 2, p;
	switch (c) {
		case "top":
			p = {
				x: u,
				y: r.y - i.height
			};
			break;
		case "bottom":
			p = {
				x: u,
				y: r.y + r.height
			};
			break;
		case "right":
			p = {
				x: r.x + r.width,
				y: d
			};
			break;
		case "left":
			p = {
				x: r.x - i.width,
				y: d
			};
			break;
		default: p = {
			x: r.x,
			y: r.y
		};
	}
	let m = Sb(t);
	return m && (p[o] += f * (m === "end" ? 1 : -1) * (n && l ? -1 : 1)), p;
}
async function Vb(e, t) {
	t === void 0 && (t = {});
	let { x: n, y: r, platform: i, rects: a, elements: o, strategy: s } = e, { boundary: c = "clippingAncestors", rootBoundary: l = "viewport", elementContext: u = "floating", altBoundary: d = !1, padding: f = 0 } = bb(t, e), p = Rb(f), m = o[d ? u === "floating" ? "reference" : "floating" : u], h = zb(await i.getClippingRect({
		element: await (i.isElement == null ? void 0 : i.isElement(m)) ?? !0 ? m : m.contextElement || await (i.getDocumentElement == null ? void 0 : i.getDocumentElement(o.floating)),
		boundary: c,
		rootBoundary: l,
		strategy: s
	})), g = u === "floating" ? {
		x: n,
		y: r,
		width: a.floating.width,
		height: a.floating.height
	} : a.reference, _ = await (i.getOffsetParent == null ? void 0 : i.getOffsetParent(o.floating)), v = await (i.isElement == null ? void 0 : i.isElement(_)) && await (i.getScale == null ? void 0 : i.getScale(_)) || {
		x: 1,
		y: 1
	}, y = zb(i.convertOffsetParentRelativeRectToViewportRelativeRect ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
		elements: o,
		rect: g,
		offsetParent: _,
		strategy: s
	}) : g);
	return {
		top: (h.top - y.top + p.top) / v.y,
		bottom: (y.bottom - h.bottom + p.bottom) / v.y,
		left: (h.left - y.left + p.left) / v.x,
		right: (y.right - h.right + p.right) / v.x
	};
}
var Hb = 50, Ub = async (e, t, n) => {
	let { placement: r = "bottom", strategy: i = "absolute", middleware: a = [], platform: o } = n, s = o.detectOverflow ? o : {
		...o,
		detectOverflow: Vb
	}, c = await (o.isRTL == null ? void 0 : o.isRTL(t)), l = await o.getElementRects({
		reference: e,
		floating: t,
		strategy: i
	}), { x: u, y: d } = Bb(l, r, c), f = r, p = 0, m = {};
	for (let n = 0; n < a.length; n++) {
		let h = a[n];
		if (!h) continue;
		let { name: g, fn: _ } = h, { x: v, y, data: b, reset: x } = await _({
			x: u,
			y: d,
			initialPlacement: r,
			placement: f,
			strategy: i,
			middlewareData: m,
			rects: l,
			platform: s,
			elements: {
				reference: e,
				floating: t
			}
		});
		u = v ?? u, d = y ?? d, m[g] = {
			...m[g],
			...b
		}, x && p < Hb && (p++, typeof x == "object" && (x.placement && (f = x.placement), x.rects && (l = x.rects === !0 ? await o.getElementRects({
			reference: e,
			floating: t,
			strategy: i
		}) : x.rects), {x: u, y: d} = Bb(l, f, c)), n = -1);
	}
	return {
		x: u,
		y: d,
		placement: f,
		strategy: i,
		middlewareData: m
	};
}, Wb = function(e) {
	return e === void 0 && (e = {}), {
		name: "flip",
		options: e,
		async fn(t) {
			var n;
			let { placement: r, middlewareData: i, rects: a, initialPlacement: o, platform: s, elements: c } = t, { mainAxis: l = !0, crossAxis: u = !0, fallbackPlacements: d, fallbackStrategy: f = "bestFit", fallbackAxisSideDirection: p = "none", flipAlignment: m = !0, ...h } = bb(e, t);
			if ((n = i.arrow) != null && n.alignmentOffset) return {};
			let g = xb(r), _ = Tb(o), v = xb(o) === o, y = await (s.isRTL == null ? void 0 : s.isRTL(c.floating)), b = d || (v || !m ? [Ib(o)] : Ob(o)), x = p !== "none";
			!d && x && b.push(...Fb(o, m, p, y));
			let S = [o, ...b], C = await s.detectOverflow(t, h), w = [], T = i.flip?.overflows || [];
			if (l && w.push(C[g]), u) {
				let e = Db(r, a, y);
				w.push(C[e[0]], C[e[1]]);
			}
			if (T = [...T, {
				placement: r,
				overflows: w
			}], !w.every((e) => e <= 0)) {
				let e = (i.flip?.index || 0) + 1, t = S[e];
				if (t && (u !== "alignment" || _ === Tb(t) || T.every((e) => Tb(e.placement) !== _ || e.overflows[0] > 0))) return {
					data: {
						index: e,
						overflows: T
					},
					reset: { placement: t }
				};
				let n = T.filter((e) => e.overflows[0] <= 0).sort((e, t) => e.overflows[1] - t.overflows[1])[0]?.placement;
				if (!n) switch (f) {
					case "bestFit": {
						let e = T.filter((e) => {
							if (x) {
								let t = Tb(e.placement);
								return t === _ || t === "y";
							}
							return !0;
						}).map((e) => [e.placement, e.overflows.filter((e) => e > 0).reduce((e, t) => e + t, 0)]).sort((e, t) => e[1] - t[1])[0]?.[0];
						e && (n = e);
						break;
					}
					case "initialPlacement": n = o;
				}
				if (r !== n) return { reset: { placement: n } };
			}
			return {};
		}
	};
}, Gb = /*#__PURE__*/ new Set(["left", "top"]);
async function Kb(e, t) {
	let { placement: n, platform: r, elements: i } = e, a = await (r.isRTL == null ? void 0 : r.isRTL(i.floating)), o = xb(n), s = Sb(n), c = Tb(n) === "y", l = Gb.has(o) ? -1 : 1, u = a && c ? -1 : 1, d = bb(t, e), { mainAxis: f, crossAxis: p, alignmentAxis: m } = typeof d == "number" ? {
		mainAxis: d,
		crossAxis: 0,
		alignmentAxis: null
	} : {
		mainAxis: d.mainAxis || 0,
		crossAxis: d.crossAxis || 0,
		alignmentAxis: d.alignmentAxis
	};
	return s && typeof m == "number" && (p = s === "end" ? m * -1 : m), c ? {
		x: p * u,
		y: f * l
	} : {
		x: f * l,
		y: p * u
	};
}
var qb = function(e) {
	return e === void 0 && (e = 0), {
		name: "offset",
		options: e,
		async fn(t) {
			var n;
			let { x: r, y: i, placement: a, middlewareData: o } = t, s = await Kb(t, e);
			return a === o.offset?.placement && (n = o.arrow) != null && n.alignmentOffset ? {} : {
				x: r + s.x,
				y: i + s.y,
				data: {
					...s,
					placement: a
				}
			};
		}
	};
}, Jb = function(e) {
	return e === void 0 && (e = {}), {
		name: "shift",
		options: e,
		async fn(t) {
			let { x: n, y: r, placement: i, platform: a } = t, { mainAxis: o = !0, crossAxis: s = !1, limiter: c = { fn: (e) => {
				let { x: t, y: n } = e;
				return {
					x: t,
					y: n
				};
			} }, ...l } = bb(e, t), u = {
				x: n,
				y: r
			}, d = await a.detectOverflow(t, l), f = Tb(i), p = Cb(f), m = u[p], h = u[f], g = (e, t) => yb(t + d[e === "y" ? "top" : "left"], t, t - d[e === "y" ? "bottom" : "right"]);
			o && (m = g(p, m)), s && (h = g(f, h));
			let _ = c.fn({
				...t,
				[p]: m,
				[f]: h
			});
			return {
				..._,
				data: {
					x: _.x - n,
					y: _.y - r,
					enabled: {
						[p]: o,
						[f]: s
					}
				}
			};
		}
	};
};
//#endregion
//#region ../../node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.mjs
function Yb() {
	return typeof window < "u";
}
function Xb(e) {
	return $b(e) ? (e.nodeName || "").toLowerCase() : "#document";
}
function Zb(e) {
	var t;
	return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function Qb(e) {
	return (($b(e) ? e.ownerDocument : e.document) || window.document)?.documentElement;
}
function $b(e) {
	return Yb() ? e instanceof Node || e instanceof Zb(e).Node : !1;
}
function ex(e) {
	return Yb() ? e instanceof Element || e instanceof Zb(e).Element : !1;
}
function tx(e) {
	return Yb() ? e instanceof HTMLElement || e instanceof Zb(e).HTMLElement : !1;
}
function nx(e) {
	return !Yb() || typeof ShadowRoot > "u" ? !1 : e instanceof ShadowRoot || e instanceof Zb(e).ShadowRoot;
}
function rx(e) {
	let { overflow: t, overflowX: n, overflowY: r, display: i } = mx(e);
	return /auto|scroll|overlay|hidden|clip/.test(t + r + n) && i !== "inline" && i !== "contents";
}
function ix(e) {
	return /^(table|td|th)$/.test(Xb(e));
}
function ax(e) {
	try {
		if (e.matches(":popover-open")) return !0;
	} catch {}
	try {
		return e.matches(":modal");
	} catch {
		return !1;
	}
}
var ox = /transform|translate|scale|rotate|perspective|filter/, sx = /paint|layout|strict|content/, cx = (e) => !!e && e !== "none", lx;
function ux(e) {
	let t = ex(e) ? mx(e) : e;
	return cx(t.transform) || cx(t.translate) || cx(t.scale) || cx(t.rotate) || cx(t.perspective) || !fx() && (cx(t.backdropFilter) || cx(t.filter)) || ox.test(t.willChange || "") || sx.test(t.contain || "");
}
function dx(e) {
	let t = gx(e);
	for (; tx(t) && !px(t);) {
		if (ux(t)) return t;
		if (ax(t)) return null;
		t = gx(t);
	}
	return null;
}
function fx() {
	return lx ??= typeof CSS < "u" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none"), lx;
}
function px(e) {
	return /^(html|body|#document)$/.test(Xb(e));
}
function mx(e) {
	return Zb(e).getComputedStyle(e);
}
function hx(e) {
	return ex(e) ? {
		scrollLeft: e.scrollLeft,
		scrollTop: e.scrollTop
	} : {
		scrollLeft: e.scrollX,
		scrollTop: e.scrollY
	};
}
function gx(e) {
	if (Xb(e) === "html") return e;
	let t = e.assignedSlot || e.parentNode || nx(e) && e.host || Qb(e);
	return nx(t) ? t.host : t;
}
function _x(e) {
	let t = gx(e);
	return px(t) ? (e.ownerDocument || e).body : tx(t) && rx(t) ? t : _x(t);
}
function vx(e, t, n) {
	t === void 0 && (t = []), n === void 0 && (n = !0);
	let r = _x(e), i = r === e.ownerDocument?.body, a = Zb(r);
	if (i) {
		let e = yx(a);
		return t.concat(a, a.visualViewport || [], rx(r) ? r : [], e && n ? vx(e) : []);
	}
	return t.concat(r, vx(r, [], n));
}
function yx(e) {
	return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
//#endregion
//#region ../../node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs
function bx(e) {
	let t = mx(e), n = parseFloat(t.width) || 0, r = parseFloat(t.height) || 0, i = tx(e), a = i ? e.offsetWidth : n, o = i ? e.offsetHeight : r, s = hb(n) !== a || hb(r) !== o;
	return s && (n = a, r = o), {
		width: n,
		height: r,
		$: s
	};
}
function xx(e) {
	return ex(e) ? e : e.contextElement;
}
function Sx(e) {
	let t = xx(e);
	if (!tx(t)) return _b(1);
	let n = t.getBoundingClientRect(), { width: r, height: i, $: a } = bx(t), o = (a ? hb(n.width) : n.width) / r, s = (a ? hb(n.height) : n.height) / i;
	return (!o || !Number.isFinite(o)) && (o = 1), (!s || !Number.isFinite(s)) && (s = 1), {
		x: o,
		y: s
	};
}
var Cx = /*#__PURE__*/ _b(0);
function wx(e) {
	let t = Zb(e);
	return !fx() || !t.visualViewport ? Cx : {
		x: t.visualViewport.offsetLeft,
		y: t.visualViewport.offsetTop
	};
}
function Tx(e, t, n) {
	return t === void 0 && (t = !1), !!n && t && n === Zb(e);
}
function Ex(e, t, n, r) {
	t === void 0 && (t = !1), n === void 0 && (n = !1);
	let i = e.getBoundingClientRect(), a = xx(e), o = _b(1);
	t && (r ? ex(r) && (o = Sx(r)) : o = Sx(e));
	let s = Tx(a, n, r) ? wx(a) : _b(0), c = (i.left + s.x) / o.x, l = (i.top + s.y) / o.y, u = i.width / o.x, d = i.height / o.y;
	if (a && r) {
		let e = Zb(a), t = ex(r) ? Zb(r) : r, n = e, i = yx(n);
		for (; i && t !== n;) {
			let e = Sx(i), t = i.getBoundingClientRect(), r = mx(i), a = t.left + (i.clientLeft + parseFloat(r.paddingLeft)) * e.x, o = t.top + (i.clientTop + parseFloat(r.paddingTop)) * e.y;
			c *= e.x, l *= e.y, u *= e.x, d *= e.y, c += a, l += o, n = Zb(i), i = yx(n);
		}
	}
	return zb({
		width: u,
		height: d,
		x: c,
		y: l
	});
}
function Dx(e, t) {
	let n = hx(e).scrollLeft;
	return t ? t.left + n : Ex(Qb(e)).left + n;
}
function Ox(e, t) {
	let n = e.getBoundingClientRect();
	return {
		x: n.left + t.scrollLeft - Dx(e, n),
		y: n.top + t.scrollTop
	};
}
function kx(e) {
	let { elements: t, rect: n, offsetParent: r, strategy: i } = e, a = i === "fixed", o = Qb(r), s = t ? ax(t.floating) : !1;
	if (r === o || s && a) return n;
	let c = {
		scrollLeft: 0,
		scrollTop: 0
	}, l = _b(1), u = _b(0), d = tx(r);
	if ((d || !a) && ((Xb(r) !== "body" || rx(o)) && (c = hx(r)), d)) {
		let e = Ex(r);
		l = Sx(r), u.x = e.x + r.clientLeft, u.y = e.y + r.clientTop;
	}
	let f = o && !d && !a ? Ox(o, c) : _b(0);
	return {
		width: n.width * l.x,
		height: n.height * l.y,
		x: n.x * l.x - c.scrollLeft * l.x + u.x + f.x,
		y: n.y * l.y - c.scrollTop * l.y + u.y + f.y
	};
}
function Ax(e) {
	return e.getClientRects ? Array.from(e.getClientRects()) : [];
}
function jx(e) {
	let t = hx(e), n = e.ownerDocument.body, r = mb(e.scrollWidth, e.clientWidth, n.scrollWidth, n.clientWidth), i = mb(e.scrollHeight, e.clientHeight, n.scrollHeight, n.clientHeight), a = -t.scrollLeft + Dx(e), o = -t.scrollTop;
	return mx(n).direction === "rtl" && (a += mb(e.clientWidth, n.clientWidth) - r), {
		width: r,
		height: i,
		x: a,
		y: o
	};
}
var Mx = 25;
function Nx(e, t, n) {
	n === void 0 && (n = "viewport");
	let r = n === "layoutViewport", i = Zb(e), a = Qb(e), o = i.visualViewport, s = a.clientWidth, c = a.clientHeight, l = 0, u = 0;
	if (o) {
		let e = !fx() || t === "fixed";
		r ? e || (l = -o.offsetLeft, u = -o.offsetTop) : (s = o.width, c = o.height, e && (l = o.offsetLeft, u = o.offsetTop));
	}
	if (Dx(a) <= 0) {
		let e = a.ownerDocument, t = e.body, n = getComputedStyle(t), r = e.compatMode === "CSS1Compat" && parseFloat(n.marginLeft) + parseFloat(n.marginRight) || 0, i = Math.abs(a.clientWidth - t.clientWidth - r), o = getComputedStyle(a).scrollbarGutter === "stable both-edges" ? i / 2 : i;
		o <= Mx && (s -= o);
	}
	return {
		width: s,
		height: c,
		x: l,
		y: u
	};
}
function Px(e, t) {
	let n = Ex(e, !0, t === "fixed"), r = n.top + e.clientTop, i = n.left + e.clientLeft, a = Sx(e);
	return {
		width: e.clientWidth * a.x,
		height: e.clientHeight * a.y,
		x: i * a.x,
		y: r * a.y
	};
}
function Fx(e, t, n) {
	let r;
	if (t === "viewport" || t === "layoutViewport") r = Nx(e, n, t);
	else if (t === "document") r = jx(Qb(e));
	else if (ex(t)) r = Px(t, n);
	else {
		let n = wx(e);
		r = {
			x: t.x - n.x,
			y: t.y - n.y,
			width: t.width,
			height: t.height
		};
	}
	return zb(r);
}
function Ix(e, t) {
	let n = t.get(e);
	if (n) return n;
	let r = vx(e, [], !1).filter((e) => ex(e) && Xb(e) !== "body"), i = null, a = mx(e).position === "fixed", o = a ? gx(e) : e;
	for (; ex(o) && !px(o);) {
		let e = mx(o), t = ux(o), n = i ? i.position : a ? "fixed" : "";
		!t && (n === "fixed" || n === "absolute" && e.position === "static") ? r = r.filter((e) => e !== o) : i = e, o = gx(o);
	}
	return t.set(e, r), r;
}
function Lx(e) {
	let { element: t, boundary: n, rootBoundary: r, strategy: i } = e, a = [...n === "clippingAncestors" ? ax(t) ? [] : Ix(t, this._c) : [].concat(n), r], o = Fx(t, a[0], i), s = o.top, c = o.right, l = o.bottom, u = o.left;
	for (let e = 1; e < a.length; e++) {
		let n = Fx(t, a[e], i);
		s = mb(n.top, s), c = pb(n.right, c), l = pb(n.bottom, l), u = mb(n.left, u);
	}
	return {
		width: c - u,
		height: l - s,
		x: u,
		y: s
	};
}
function Rx(e) {
	let { width: t, height: n } = bx(e);
	return {
		width: t,
		height: n
	};
}
function zx(e, t, n) {
	let r = tx(t), i = Qb(t), a = n === "fixed", o = Ex(e, !0, a, t), s = {
		scrollLeft: 0,
		scrollTop: 0
	}, c = _b(0);
	if ((r || !a) && ((Xb(t) !== "body" || rx(i)) && (s = hx(t)), r)) {
		let e = Ex(t, !0, a, t);
		c.x = e.x + t.clientLeft, c.y = e.y + t.clientTop;
	}
	!r && i && (c.x = Dx(i));
	let l = i && !r && !a ? Ox(i, s) : _b(0);
	return {
		x: o.left + s.scrollLeft - c.x - l.x,
		y: o.top + s.scrollTop - c.y - l.y,
		width: o.width,
		height: o.height
	};
}
function Bx(e) {
	return mx(e).position === "static";
}
function Vx(e, t) {
	if (!tx(e) || mx(e).position === "fixed") return null;
	if (t) return t(e);
	let n = e.offsetParent;
	return Qb(e) === n && (n = n.ownerDocument.body), n;
}
function Hx(e, t) {
	let n = Zb(e);
	if (ax(e)) return n;
	if (!tx(e)) {
		let t = gx(e);
		for (; t && !px(t);) {
			if (ex(t) && !Bx(t)) return t;
			t = gx(t);
		}
		return n;
	}
	let r = Vx(e, t);
	for (; r && ix(r) && Bx(r);) r = Vx(r, t);
	return r && px(r) && Bx(r) && !ux(r) ? n : r || dx(e) || n;
}
var Ux = async function(e) {
	let t = this.getOffsetParent || Hx, n = this.getDimensions, r = await n(e.floating);
	return {
		reference: zx(e.reference, await t(e.floating), e.strategy),
		floating: {
			x: 0,
			y: 0,
			width: r.width,
			height: r.height
		}
	};
};
function Wx(e) {
	return mx(e).direction === "rtl";
}
var Gx = {
	convertOffsetParentRelativeRectToViewportRelativeRect: kx,
	getDocumentElement: Qb,
	getClippingRect: Lx,
	getOffsetParent: Hx,
	getElementRects: Ux,
	getClientRects: Ax,
	getDimensions: Rx,
	getScale: Sx,
	isElement: ex,
	isRTL: Wx
};
function Kx(e, t) {
	return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function qx(e, t, n) {
	let r = null, i, a = Qb(e);
	function o() {
		var e;
		clearTimeout(i), (e = r) == null || e.disconnect(), r = null;
	}
	function s(n, c) {
		n === void 0 && (n = !1), c === void 0 && (c = 1), o();
		let l = e.getBoundingClientRect(), { left: u, top: d, width: f, height: p } = l;
		if (n || t(), !f || !p) return;
		let m = gb(d), h = gb(a.clientWidth - (u + f)), g = gb(a.clientHeight - (d + p)), _ = gb(u), v = {
			rootMargin: -m + "px " + -h + "px " + -g + "px " + -_ + "px",
			threshold: mb(0, pb(1, c)) || 1
		}, y = !0;
		function b(t) {
			let n = t[0].intersectionRatio;
			if (!Kx(l, e.getBoundingClientRect())) return s();
			if (n !== c) {
				if (!y) return s();
				n ? s(!1, n) : i = setTimeout(() => {
					s(!1, 1e-7);
				}, 1e3);
			}
			y = !1;
		}
		try {
			r = new IntersectionObserver(b, {
				...v,
				root: a.ownerDocument
			});
		} catch {
			r = new IntersectionObserver(b, v);
		}
		r.observe(e);
	}
	let c = Zb(e), l = () => s(n);
	return c.addEventListener("resize", l), s(!0), () => {
		c.removeEventListener("resize", l), o();
	};
}
function Jx(e, t, n, r) {
	r === void 0 && (r = {});
	let { ancestorScroll: i = !0, ancestorResize: a = !0, elementResize: o = typeof ResizeObserver == "function", layoutShift: s = typeof IntersectionObserver == "function", animationFrame: c = !1 } = r, l = xx(e), u = i || a ? [...l ? vx(l) : [], ...t ? vx(t) : []] : [];
	u.forEach((e) => {
		i && e.addEventListener("scroll", n), a && e.addEventListener("resize", n);
	});
	let d = l && s ? qx(l, n, a) : null, f = -1, p = null;
	o && (p = new ResizeObserver((e) => {
		let [r] = e;
		r && r.target === l && p && t && (p.unobserve(t), cancelAnimationFrame(f), f = requestAnimationFrame(() => {
			var e;
			(e = p) == null || e.observe(t);
		})), n();
	}), l && !c && p.observe(l), t && p.observe(t));
	let m, h = c ? Ex(e) : null;
	c && g();
	function g() {
		let t = Ex(e);
		h && !Kx(h, t) && n(), h = t, m = requestAnimationFrame(g);
	}
	return n(), () => {
		var e;
		u.forEach((e) => {
			i && e.removeEventListener("scroll", n), a && e.removeEventListener("resize", n);
		}), d?.(), (e = p) == null || e.disconnect(), p = null, c && cancelAnimationFrame(m);
	};
}
var Yx = qb, Xx = Jb, Zx = Wb, Qx = (e, t, n) => {
	let r = /* @__PURE__ */ new Map(), i = n ?? {}, a = {
		...Gx,
		...i.platform,
		_c: r
	};
	return Ub(e, t, {
		...i,
		platform: a
	});
}, $x = 100, eS = 480, tS = [
	"findPrevious",
	"findNext",
	"replaceCurrent",
	"replaceAll"
], nS = (e) => e.getAttribute("aria-disabled") === "true";
function rS({ editor: e, root: t, view: n, getState: r }) {
	let i = t?.querySelector("[data-rep-find]");
	if (!i) return {};
	let a = i.querySelector("[data-rep-find-query]"), o = i.querySelector("[data-rep-find-replacement]"), s = i.querySelector("[data-rep-find-count]"), c = [...i.querySelectorAll("[data-rep-find-option]")], l = tS.map((e) => i.querySelector(`[data-rep-find-action="${e}"]`)), u = null, d = null, f = null, p = r(n.state).openCount, m = () => {
		i.style.width = t.clientWidth < eS ? `${t.clientWidth}px` : "", Qx(t, i, {
			strategy: "fixed",
			placement: "top-end",
			middleware: [Yx(({ rects: e }) => -e.floating.height - 8), Xx({
				padding: 8,
				crossAxis: !0
			})]
		}).then(({ x: e, y: t }) => {
			Object.assign(i.style, {
				left: `${e}px`,
				top: `${t}px`
			});
		});
	}, h = ({ query: e, matches: t, currentIndex: n }) => d || (e === "" ? "" : t.length ? i.dataset.repFindCountLabel.replace(":current", n + 1).replace(":total", t.length) : i.dataset.repFindNoResults), g = (e) => {
		let n = r(e.state), u = n.isOpen && e.editable;
		if (i.hidden = !u, !u) {
			f?.(), f = null;
			return;
		}
		f ??= Jx(t, i, m), n.openCount !== p && (p = n.openCount, a.value = n.query, o.value = n.replacement, requestAnimationFrame(() => {
			i.hidden || (a.focus(), a.select());
		})), c.forEach((e) => {
			e.setAttribute("aria-pressed", n[e.dataset.repFindOption] ? "true" : "false");
		}), l.forEach((e) => e.setAttribute("aria-disabled", n.matches.length ? "false" : "true"));
		let d = h(n);
		s.textContent !== d && (s.textContent = d);
	}, _ = () => {
		clearTimeout(u), u = null, a.value !== r(e.state).query && e.commands.setFindOptions({ query: a.value });
	}, v = (t, n = null) => {
		if (_(), n && nS(n)) return;
		d = null;
		let a = r(e.state).matches.length;
		e.commands[t]() && t === "replaceAll" && (d = i.dataset.repFindReplaced.replace(":count", a), g(e.view));
	}, y = ({ target: t }) => {
		if (d = null, t === o) {
			e.commands.setFindOptions({ replacement: o.value });
			return;
		}
		clearTimeout(u), u = setTimeout(_, $x);
	}, b = ({ target: t }) => {
		let n = t.closest("[data-rep-find-action]");
		if (n) {
			v(n.dataset.repFindAction, n);
			return;
		}
		let i = t.closest("[data-rep-find-option]");
		if (i) {
			let t = i.dataset.repFindOption;
			_(), d = null, e.commands.setFindOptions({ [t]: !r(e.state)[t] });
		}
	}, x = (e) => {
		if (!e.isComposing) {
			if (e.key === "Escape") {
				e.preventDefault(), e.stopPropagation(), v("closeFindReplace");
				return;
			}
			e.key !== "Enter" || e.target !== a && e.target !== o || (e.preventDefault(), e.target === o ? v("replaceCurrent") : v(e.shiftKey ? "findPrevious" : "findNext"));
		}
	};
	return i.addEventListener("input", y), i.addEventListener("click", b), i.addEventListener("keydown", x), g(n), {
		update(e, t) {
			t.doc !== e.state.doc && (d = null), g(e);
		},
		destroy() {
			clearTimeout(u), f?.(), f = null, i.removeEventListener("input", y), i.removeEventListener("click", b), i.removeEventListener("keydown", x);
		}
	};
}
//#endregion
//#region resources/js/find-replace/search.js
var iS = "￼", aS = /[\p{L}\p{N}\p{M}_]$/u, oS = /^[\p{L}\p{N}\p{M}_]/u, sS = (e) => e.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");
function cS(e) {
	let t = "";
	return e.forEach((e) => {
		t += e.isText ? e.text : iS.repeat(e.nodeSize);
	}), t;
}
var lS = (e, t, n) => !aS.test(e.slice(Math.max(0, t - 2), t)) && !oS.test(e.slice(n, n + 2));
function uS(e, { query: t, matchCase: n, wholeWord: r }) {
	if (t === "" || t.includes(iS)) return [];
	let i = new RegExp(sS(t), n ? "gu" : "giu"), a = [];
	return e.descendants((e, t) => {
		if (!e.isTextblock) return !0;
		let n = cS(e);
		i.lastIndex = 0;
		for (let e = i.exec(n); e; e = i.exec(n)) {
			let o = e.index, s = o + e[0].length;
			!r || lS(n, o, s) ? a.push({
				from: t + 1 + o,
				to: t + 1 + s
			}) : i.lastIndex = o + (n.codePointAt(o) > 65535 ? 2 : 1);
		}
		return !1;
	}), a;
}
//#endregion
//#region resources/js/find-replace/plugin.js
var dS = new M("repFindReplace"), fS = {
	isOpen: !1,
	query: "",
	replacement: "",
	matchCase: !1,
	wholeWord: !1,
	matches: [],
	currentIndex: -1,
	openCount: 0,
	decorations: L.empty
}, pS = (e, t) => {
	let n = e.findIndex(({ from: e }) => e >= t);
	return n === -1 && e.length ? 0 : n;
}, mS = (e, t, n) => {
	let r = uS(e, t);
	return {
		matches: r,
		currentIndex: pS(r, n)
	};
}, hS = (e, { isOpen: t, matches: n, currentIndex: r }) => t ? L.create(e, n.map(({ from: e, to: t }, n) => I.inline(e, t, { class: n === r ? "rep-find-match rep-find-current" : "rep-find-match" }))) : L.empty, gS = (e, { from: t, to: n }) => e.setSelection(k.create(e.doc, t, n)).scrollIntoView(), _S = (e, { matches: t, currentIndex: n }) => {
	t.length && gS(e, t[n]);
}, vS = (e, { from: t, to: n }, r) => {
	r === "" ? e.delete(t, n) : e.replaceWith(t, n, e.doc.type.schema.text(r, e.doc.nodeAt(t).marks));
}, yS = ({ doc: e, selection: t }) => {
	if (!(t instanceof k) || t.empty || !t.$from.sameParent(t.$to)) return null;
	let n = e.textBetween(t.from, t.to);
	return n === "" || n.includes("\n") ? null : n;
}, bS = W.create({
	name: "findReplace",
	addCommands() {
		let { editor: e } = this, t = () => dS.getState(e.state), n = (t) => (n) => e.isEditable && t(n), r = (e) => n((n) => {
			let r = t();
			return r.matches.length ? (n.dispatch && e(n.tr, r), !0) : !1;
		}), i = (e) => r((t, { matches: n, currentIndex: r }) => {
			let i = n[r], a = t.selection.from === i.from && t.selection.to === i.to ? (r + e + n.length) % n.length : r;
			gS(t, n[a]), t.setMeta(dS, { currentIndex: a });
		});
		return {
			openFindReplace: () => n(({ tr: e, dispatch: n }) => {
				if (n) {
					let n = t(), r = yS(e) ?? n.query;
					e.setMeta(dS, {
						isOpen: !0,
						query: r,
						openCount: n.openCount + 1,
						...mS(e.doc, {
							...n,
							query: r
						}, e.selection.from)
					});
				}
				return !0;
			}),
			closeFindReplace: () => n(({ tr: e, dispatch: t, commands: n }) => (t && (e.setMeta(dS, {
				isOpen: !1,
				matches: [],
				currentIndex: -1
			}), n.focus()), !0)),
			setFindOptions: (e) => n(({ tr: n, dispatch: r }) => {
				let i = t();
				if (!i.isOpen) return !1;
				if (r) {
					let t = {
						...i,
						...e
					};
					if ([
						"query",
						"matchCase",
						"wholeWord"
					].some((e) => t[e] !== i[e])) {
						let r = i.matches[i.currentIndex]?.from ?? n.selection.from, a = mS(n.doc, t, r);
						_S(n, a), n.setMeta(dS, {
							...e,
							...a
						});
					} else n.setMeta(dS, e);
				}
				return !0;
			}),
			findNext: () => i(1),
			findPrevious: () => i(-1),
			replaceCurrent: () => r((e, t) => {
				let n = t.matches[t.currentIndex];
				vS(e, n, t.replacement);
				let r = mS(e.doc, t, n.from + t.replacement.length);
				_S(e, r), e.setMeta(dS, r);
			}),
			replaceAll: () => r((e, t) => {
				[...t.matches].reverse().forEach((n) => vS(e, n, t.replacement)), e.setMeta(dS, mS(e.doc, t, e.selection.from));
			})
		};
	},
	addProseMirrorPlugins() {
		let { editor: e } = this;
		return [new j({
			key: dS,
			state: {
				init: () => fS,
				apply(e, t) {
					let n = e.getMeta(dS);
					if (!n && !(t.isOpen && e.docChanged)) return t;
					let r = t.matches[t.currentIndex], i = r ? e.mapping.map(r.from) : e.selection.from, a = {
						...t,
						...n ?? mS(e.doc, t, i)
					};
					return {
						...a,
						decorations: hS(e.doc, a)
					};
				}
			},
			props: { decorations: (e) => dS.getState(e).decorations },
			view: (t) => rS({
				editor: e,
				root: t.dom.closest(".rep-editor"),
				view: t,
				getState: (e) => dS.getState(e)
			})
		})];
	}
}), xS = (e, t) => `${e}\u0000${t}`, SS = (e, t) => e.replace(":label", () => t), CS = (e) => ({
	default: null,
	parseHTML: (t) => t.getAttribute(`data-${e}`),
	renderHTML: (t) => t[e] ? { [`data-${e}`]: t[e] } : {}
});
function wS(e, t, { id: n, label: r }, i) {
	return e.chain().focus().insertContentAt(t, [{
		type: "mention",
		attrs: {
			id: n,
			label: r,
			char: i
		}
	}, {
		type: "text",
		text: " "
	}]).run();
}
function TS(e) {
	let t = (t) => e.find(({ trigger: e }) => e === t)?.displayFormat ?? `${t}:label`;
	return G.create({
		name: "mention",
		group: "inline",
		inline: !0,
		atom: !0,
		selectable: !0,
		addOptions() {
			return { providers: e };
		},
		addStorage() {
			return { labels: /* @__PURE__ */ new Map() };
		},
		addAttributes() {
			return {
				id: CS("id"),
				label: CS("label"),
				char: CS("char")
			};
		},
		parseHTML() {
			return [{ tag: "span[data-type=\"mention\"]" }, {
				tag: "a[data-type=\"mention\"]",
				priority: 51
			}];
		},
		renderHTML({ node: e, HTMLAttributes: n }) {
			return [
				"span",
				{
					...n,
					"data-type": "mention",
					class: "rep-mention"
				},
				SS(t(e.attrs.char), e.attrs.label ?? "")
			];
		},
		renderText({ node: e }) {
			return SS(t(e.attrs.char), e.attrs.label ?? "");
		},
		addKeyboardShortcuts() {
			return { Backspace: () => {
				let { empty: e, $from: t, from: n } = this.editor.state.selection, r = t.nodeBefore;
				return !e || r?.type.name !== this.name ? !1 : this.editor.commands.deleteRange({
					from: n - r.nodeSize,
					to: n
				});
			} };
		},
		addNodeView() {
			let { storage: e } = this;
			return ({ node: n }) => {
				let r = document.createElement("span"), i = (n) => {
					let { id: i, char: a, label: o } = n.attrs;
					r.dataset.repMentionKey = xS(a, i), r.dataset.repMentionFormat = t(a), r.textContent = SS(t(a), e.labels.get(xS(a, i)) ?? o ?? "");
				};
				return r.className = "rep-mention", i(n), {
					dom: r,
					update(e) {
						return e.type === n.type && (i(e), !0);
					},
					ignoreMutation: () => !0
				};
			};
		}
	});
}
Eh("core/document", () => [
	gg,
	$y,
	rb,
	_g,
	wh,
	$m,
	eh,
	fb
]), Eh("core/bold", () => dg), Eh("core/italic", () => wg), Eh("core/underline", () => ib), Eh("core/strikethrough", () => nb), Eh("core/blockquote", () => og), Eh("core/heading", ({ levels: e }) => vg.configure({ levels: e })), Eh("core/bullet-list", () => [
	Xv,
	yy,
	Oy
]), Eh("core/ordered-list", () => [
	Gy,
	yy,
	Oy
]), Eh("core/code-block", () => hg), Eh("core/divider", () => yg), Eh("core/mention", ({ providers: e }) => TS(e ?? [])), Eh("core/find-replace", () => bS), Eh("core/link", ({ protocols: e, defaultProtocol: t, autolink: n, HTMLAttributes: r }) => Kv.configure({
	protocols: e,
	defaultProtocol: t,
	autolink: n,
	HTMLAttributes: r,
	openOnClick: !1
})), Nh("link", (e) => {
	let { href: t, target: n } = e.getAttributes("link");
	return {
		url: t ?? null,
		...t ? { shouldOpenInNewTab: n === "_blank" } : {}
	};
});
//#endregion
//#region resources/js/toolbar/floating-menu.js
var ES = class {
	constructor(e, { itemSelector: t, onSelect: n, onClose: r }) {
		this.element = e, this.itemSelector = t, this.onSelect = n, this.onClose = r, this.reference = null, this.cleanup = null, this.handleKeydown = (e) => this.onKeydown(e), this.handleClick = (e) => this.onClick(e), this.handleMousedown = (e) => e.preventDefault(), this.handleOutsidePointer = (e) => {
			!this.element.contains(e.target) && !this.reference?.contains(e.target) && this.close({ restoreFocus: !1 });
		}, e.addEventListener("keydown", this.handleKeydown), e.addEventListener("click", this.handleClick), e.addEventListener("mousedown", this.handleMousedown);
	}
	get isOpen() {
		return this.reference !== null;
	}
	get items() {
		return [...this.element.querySelectorAll(this.itemSelector)].filter((e) => !e.hidden);
	}
	open(e) {
		if (this.isOpen) {
			this.close();
			return;
		}
		this.reference = e, this.element.hidden = !1, e.setAttribute("aria-expanded", "true"), this.cleanup = Jx(e, this.element, () => {
			Qx(e, this.element, {
				strategy: "fixed",
				placement: "bottom-start",
				middleware: [
					Yx(4),
					Zx(),
					Xx({ padding: 8 })
				]
			}).then(({ x: e, y: t }) => {
				Object.assign(this.element.style, {
					left: `${e}px`,
					top: `${t}px`
				});
			});
		}), document.addEventListener("pointerdown", this.handleOutsidePointer);
		let { items: t } = this;
		(t.find((e) => e.getAttribute("aria-checked") === "true") ?? t[0])?.focus();
	}
	close({ restoreFocus: e = !0 } = {}) {
		if (!this.isOpen) return;
		let { reference: t } = this;
		this.reference = null, this.cleanup(), this.element.hidden = !0, t.setAttribute("aria-expanded", "false"), document.removeEventListener("pointerdown", this.handleOutsidePointer), e && t.focus(), this.onClose?.();
	}
	onClick(e) {
		let t = e.target.closest(this.itemSelector);
		t && (this.close({ restoreFocus: !1 }), this.onSelect(t));
	}
	onKeydown(e) {
		let { items: t } = this, n = t.indexOf(document.activeElement);
		if (e.key === "Tab") {
			this.close({ restoreFocus: !1 });
			return;
		}
		let r = {
			ArrowDown: t[(n + 1) % t.length],
			ArrowUp: t[(n - 1 + t.length) % t.length],
			Home: t[0],
			End: t[t.length - 1]
		}[e.key];
		if (r) {
			e.preventDefault(), r.focus();
			return;
		}
		e.key === "Escape" && (e.preventDefault(), e.stopPropagation(), this.close());
	}
	destroy() {
		this.close({ restoreFocus: !1 }), this.element.removeEventListener("keydown", this.handleKeydown), this.element.removeEventListener("click", this.handleClick), this.element.removeEventListener("mousedown", this.handleMousedown);
	}
}, DS = (e, t) => e?.setAttribute("aria-disabled", t ? "true" : "false"), OS = (e) => e.getAttribute("aria-disabled") === "true";
function kS({ selection: e }) {
	if (e instanceof A) return !1;
	let { parent: t } = e.$from;
	return !t.inlineContent || t.type.markSet === null || t.type.markSet.length > 0;
}
function AS({ editor: e, root: t, blockTypes: n }) {
	let r = t.querySelector("[data-rep-switcher-menu]"), i = t.querySelector("[data-rep-more-menu]"), a = t.querySelector("[data-rep-list-menu]"), o = t.querySelector("[data-rep-live]"), s = t.querySelectorAll("[data-rep-slash-menu] [data-rep-block-type]"), c = new ES(r, {
		itemSelector: "[data-rep-block-type]",
		onSelect: (t) => {
			e.view.focus();
			let r = n.find(({ name: e }) => e === t.dataset.repBlockType);
			r && Kh(e, r, n);
		}
	}), l = new ES(i, {
		itemSelector: "[data-rep-more-action]",
		onSelect: (t) => {
			e.view.focus(), OS(t) || e.chain().focus()[t.dataset.repMoreAction]().run();
		}
	}), u = a ? new ES(a, {
		itemSelector: "[data-rep-list-action], [data-rep-list-type]",
		onSelect: (t) => {
			e.view.focus(), !OS(t) && (t.dataset.repListType ? e.chain().focus().setListType(t.dataset.repListType).run() : e.chain().focus()[t.dataset.repListAction]().run());
		}
	}) : null, d = (e) => {
		o && (o.textContent = e ?? "");
	}, f = {
		moveUp: () => e.commands.moveBlockUp() && d(o?.dataset.repMovedUp),
		moveDown: () => e.commands.moveBlockDown() && d(o?.dataset.repMovedDown),
		switcher: (e) => c.open(e),
		more: (e) => l.open(e),
		list: (e) => u?.open(e)
	}, p = (t, n) => {
		let r = t.querySelector("[data-rep-list-tools]");
		if (!r || !a) return;
		let i = Lh(e.state.selection);
		if (r.hidden = !i, !i) return;
		let o = r.querySelector("[data-rep-control=\"list\"]"), s = i.type.name, c = a.querySelector(`[data-rep-list-type="${s}"]`);
		if (DS(o, n), a.querySelectorAll("[data-rep-list-type]").forEach((e) => {
			e.setAttribute("aria-checked", e.dataset.repListType === s ? "true" : "false");
		}), a.querySelectorAll("[data-rep-list-action]").forEach((t) => {
			DS(t, !e.can()[t.dataset.repListAction]());
		}), c && o.dataset.repCurrent !== s) {
			let e = o.dataset.repLabel.replace(":type", c.querySelector(".rep-menu-item-label").textContent);
			o.querySelector("[data-rep-list-icon]").replaceChildren(c.querySelector("svg").cloneNode(!0)), o.setAttribute("aria-label", e), o.dataset.repCurrent = s;
		}
	}, m = n.some(({ multiBlock: e }) => e), h = (e, t, i) => {
		let a = e.querySelector("[data-rep-control=\"switcher\"]");
		if (!a) return;
		let o = t?.name ?? "";
		if (a.dataset.repCurrent !== o) {
			let e = [...s].find((e) => e.dataset.repBlockType === o);
			a.querySelector("[data-rep-switcher-icon]").replaceChildren(...e?.querySelector("svg") ? [e.querySelector("svg").cloneNode(!0)] : []), a.querySelector("[data-rep-switcher-label]").textContent = t?.label ?? a.dataset.repGenericLabel, a.dataset.repCurrent = o;
		}
		r.querySelectorAll("[data-rep-block-type]").forEach((e) => {
			let { repBlockType: t } = e.dataset;
			e.setAttribute("aria-checked", t === o ? "true" : "false"), e.hidden = i > 0 && !n.find((e) => e.name === t)?.multiBlock;
		});
	}, g = (e) => {
		let t = e.target.closest("[data-rep-control]");
		t && !OS(t) && f[t.dataset.repControl]?.(t);
	}, _ = /* @__PURE__ */ new Set();
	return {
		floatingElements: [
			r,
			i,
			a
		].filter(Boolean),
		bind(e) {
			e.addEventListener("click", g), _.add(e);
		},
		sync(t) {
			let { state: r } = e, a = Fh(r);
			if (!a) return;
			let o = Bh(r), s = o || Rh(r), c = zh(r), l = t.querySelector("[data-rep-control=\"switcher\"]"), u = c ? {
				name: `blocks:${c}`,
				label: l?.dataset.repMultipleLabel.replace(":count", c),
				switchable: m
			} : Hh(n, a.node);
			h(t, u, c), p(t, o), DS(l, s && !c || !u?.switchable), DS(t.querySelector("[data-rep-control=\"moveUp\"]"), s || !e.can().moveBlockUp()), DS(t.querySelector("[data-rep-control=\"moveDown\"]"), s || !e.can().moveBlockDown()), DS(t.querySelector("[data-rep-drag-handle]"), s);
			let d = [...i.querySelectorAll("[data-rep-more-action]")];
			d.forEach((t) => DS(t, !e.can()[t.dataset.repMoreAction]?.())), DS(t.querySelector("[data-rep-control=\"more\"]"), d.every(OS));
			let f = t.querySelector("[data-rep-inline-tools]");
			f && (f.hidden = !kS(r));
		},
		closeMenus() {
			c.close({ restoreFocus: !1 }), l.close({ restoreFocus: !1 }), u?.close({ restoreFocus: !1 });
		},
		destroy() {
			_.forEach((e) => e.removeEventListener("click", g)), c.destroy(), l.destroy(), u?.destroy();
		}
	};
}
//#endregion
//#region resources/js/mentions/mention-labels.js
var jS = 100;
function MS({ editor: e, fetchLabels: t }) {
	let { labels: n } = e.storage.mention, r = /* @__PURE__ */ new Set(), i = !1, a = () => {
		let t = {};
		return e.state.doc.descendants((e) => {
			if (e.type.name !== "mention" || !e.attrs.id || !e.attrs.char) return;
			let n = xS(e.attrs.char, e.attrs.id);
			r.has(n) || (r.add(n), (t[e.attrs.char] ??= []).push(e.attrs.id));
		}), t;
	}, o = (e) => {
		let t = [];
		for (let n = 0;; n += jS) {
			let r = Object.fromEntries(Object.entries(e).map(([e, t]) => [e, t.slice(n, n + jS)]).filter(([, e]) => e.length));
			if (!Object.keys(r).length) return t;
			t.push(r);
		}
	}, s = () => {
		e.view.dom.querySelectorAll("[data-rep-mention-key]").forEach((e) => {
			let t = n.get(e.dataset.repMentionKey);
			t !== void 0 && (e.textContent = SS(e.dataset.repMentionFormat, t));
		});
	}, c = async () => {
		for (let e of o(a())) {
			let r;
			try {
				r = await t(e);
			} catch (e) {
				console.warn("[rich-editor-plus] Could not look up mention labels.", e);
				return;
			}
			if (i) return;
			Object.entries(r ?? {}).forEach(([e, t]) => {
				Object.entries(t ?? {}).forEach(([t, r]) => n.set(xS(e, t), r));
			}), s();
		}
	}, l = ({ transaction: e }) => {
		e.docChanged && c();
	};
	return e.on("transaction", l), {
		refresh: c,
		destroy() {
			i = !0, e.off("transaction", l);
		}
	};
}
//#endregion
//#region ../../node_modules/@tiptap/suggestion/dist/index.js
var NS = /* @__PURE__ */ t({
	Suggestion: () => JS,
	SuggestionPluginKey: () => qS,
	default: () => XS,
	exitSuggestion: () => YS,
	findSuggestionMatch: () => PS
});
function PS(e) {
	let { char: t, allowSpaces: n, allowToIncludeChar: r, allowedPrefixes: i, startOfLine: a, $position: o } = e, s = n && !r, c = yf(t), l = RegExp(`\\s${c}$`), u = a ? "^" : "", d = r ? "" : c, f = RegExp(s ? `${u}${c}.*?(?=\\s${d}|$)` : `${u}(?:^)?${c}[^\\s${d}]*`, "gm"), p = o.nodeBefore?.isText && o.nodeBefore.text;
	if (!p) return null;
	let m = o.pos - p.length, h = Array.from(p.matchAll(f)).pop();
	if (!h || h.input === void 0 || h.index === void 0) return null;
	let g = h.input.slice(Math.max(0, h.index - 1), h.index), _ = RegExp(`^[${i?.join("")}\0]?$`).test(g);
	if (i !== null && !_) return null;
	let v = m + h.index, y = v + h[0].length;
	return s && l.test(p.slice(y - 1, y + 1)) && (h[0] += " ", y += 1), v < o.pos && y >= o.pos ? {
		range: {
			from: v,
			to: y
		},
		query: h[0].slice(t.length),
		text: h[0]
	} : null;
}
function FS(e) {
	return e.docChanged ? e.steps.some((e) => {
		let t = e.slice;
		if (!t?.content) return !1;
		let n = t.content.textBetween(0, t.content.size, "\n");
		return /\s/.test(n);
	}) : !1;
}
function IS(e) {
	return () => {
		let t = e.state.selection.$anchor.pos, { top: n, right: r, bottom: i, left: a } = e.view.coordsAtPos(t);
		try {
			return new DOMRect(a, n, r - a, i - n);
		} catch {
			return null;
		}
	};
}
function LS(e, t, n, r) {
	return n ? () => {
		let n = r.getState(e.state)?.decorationId;
		return t.dom.querySelector(`[data-decoration-id="${n}"]`)?.getBoundingClientRect() || null;
	} : IS(e);
}
function RS({ match: e, dismissedRange: t, state: n, transaction: r, editor: i, shouldResetDismissed: a, effectiveAllowSpaces: o }) {
	return a?.({
		editor: i,
		state: n,
		range: t,
		match: e,
		transaction: r,
		allowSpaces: o
	}) ? !1 : o ? e.range.from === t.from : e.range.from === t.from && !FS(r);
}
function zS({ view: e, pluginKeyRef: t }) {
	let n = e.state.tr.setMeta(t, { exit: !0 });
	e.dispatch(n);
}
function BS({ pluginKey: e, decorationTag: t, decorationClass: n, decorationContent: r, decorationEmptyClass: i, renderer: a, dispatchExit: o }) {
	return {
		handleKeyDown(t, n) {
			var r;
			let i = e.getState(t.state);
			if (!i.active) return !1;
			if (n.key === "Escape" || n.key === "Esc") {
				var s;
				return a == null || (s = a.onKeyDown) == null || s.call(a, {
					view: t,
					event: n,
					range: i.range
				}), o(t), !0;
			}
			return (a == null || (r = a.onKeyDown) == null ? void 0 : r.call(a, {
				view: t,
				event: n,
				range: i.range
			})) || !1;
		},
		decorations(a) {
			let { active: o, range: s, decorationId: c, query: l } = e.getState(a);
			if (!o) return null;
			let u = !l?.length, d = [n];
			return u && d.push(i), L.create(a.doc, [I.inline(s.from, s.to, {
				nodeName: t,
				class: d.join(" "),
				"data-decoration-id": c || void 0,
				"data-decoration-content": r
			})]);
		}
	};
}
function VS({ editor: e, char: t, effectiveAllowSpaces: n, allowToIncludeChar: r, allowedPrefixes: i, startOfLine: a, findSuggestionMatch: o, allow: s, shouldShow: c, shouldKeepDismissed: l, pluginKey: u }) {
	return {
		init() {
			return {
				active: !1,
				range: {
					from: 0,
					to: 0
				},
				query: null,
				text: null,
				composing: !1,
				dismissedRange: null
			};
		},
		apply(d, f, p, m) {
			let { isEditable: h } = e, { composing: g } = e.view, { selection: _ } = d, { empty: v, from: y } = _, b = { ...f }, x = d.getMeta(u);
			if (x && x.exit) return b.active = !1, b.decorationId = null, b.range = {
				from: 0,
				to: 0
			}, b.query = null, b.text = null, b.dismissedRange = f.active ? { ...f.range } : f.dismissedRange, b;
			if (b.composing = g, d.docChanged && b.dismissedRange !== null && (b.dismissedRange = {
				from: d.mapping.map(b.dismissedRange.from),
				to: d.mapping.map(b.dismissedRange.to)
			}), h && (v || e.view.composing)) {
				(y < f.range.from || y > f.range.to) && !g && !f.composing && (b.active = !1);
				let u = o({
					char: t,
					allowSpaces: n,
					allowToIncludeChar: r,
					allowedPrefixes: i,
					startOfLine: a,
					$position: _.$from
				}), p = `id_${Math.floor(Math.random() * 4294967295)}`;
				u && s({
					editor: e,
					state: m,
					range: u.range,
					isActive: f.active
				}) && (!c || c({
					editor: e,
					range: u.range,
					query: u.query,
					text: u.text,
					transaction: d
				})) ? (b.dismissedRange !== null && !l({
					match: u,
					dismissedRange: b.dismissedRange,
					state: m,
					transaction: d
				}) && (b.dismissedRange = null), b.dismissedRange === null ? (b.active = !0, b.decorationId = f.decorationId || p, b.range = u.range, b.query = u.query, b.text = u.text) : b.active = !1) : (u || (b.dismissedRange = null), b.active = !1);
			} else b.active = !1;
			return b.active || (b.decorationId = null, b.range = {
				from: 0,
				to: 0
			}, b.query = null, b.text = null), b;
		}
	};
}
function HS({ editor: e, items: t }) {
	let n = null, r = null, i = null, a = () => {
		r !== null && (clearTimeout(r), r = null), i?.(), i = null;
	}, o = (e) => new Promise((t) => {
		i = t, r = setTimeout(() => {
			r = null;
			let e = i;
			i = null, e?.();
		}, e);
	}), s = () => {
		n?.abort(), a(), n = null;
	};
	return {
		abort: s,
		fetch: async (r, i) => {
			s(), n = new AbortController();
			let a = n;
			if (i > 0 && await o(i), n !== a || a.signal.aborted) return { status: "aborted" };
			try {
				let i = await t({
					editor: e,
					query: r,
					signal: a.signal
				});
				return n !== a || a.signal.aborted ? { status: "aborted" } : {
					status: "resolved",
					items: i
				};
			} catch {
				return n !== a || a.signal.aborted ? { status: "aborted" } : { status: "error" };
			}
		}
	};
}
function US({ placement: e, offset: t, flip: n, floatingUi: r }) {
	var i;
	let a = [Yx({
		mainAxis: t.mainAxis ?? 4,
		crossAxis: t.crossAxis ?? 0
	})];
	return n && a.push(Zx()), r != null && (i = r.middleware) != null && i.length && a.push(...r.middleware), {
		placement: e,
		strategy: r?.strategy ?? "absolute",
		middleware: a
	};
}
function WS(e) {
	if (e instanceof HTMLElement) return e;
	if (typeof e == "string") try {
		let t = document.querySelector(e);
		if (t) return t;
	} catch {
		return document.body;
	}
	return document.body;
}
function GS({ getReferenceRect: e, contextElement: t, config: n, container: r, dismissOnOutsideClick: i, dismiss: a }) {
	return (o, s = {}) => {
		let c = {
			getBoundingClientRect: () => e() ?? new DOMRect(),
			contextElement: t
		}, l = !1, u = !o.isConnected;
		u && WS(r).appendChild(o), s.onPosition || (o.style.visibility = "hidden", o.style.width = "max-content");
		let d = Jx(c, o, () => {
			Qx(c, o, {
				placement: n.placement,
				strategy: n.strategy,
				middleware: n.middleware
			}).then(({ x: e, y: t, placement: n, strategy: r }) => {
				if (s.onPosition) {
					s.onPosition({
						x: e,
						y: t,
						placement: n,
						strategy: r
					});
					return;
				}
				Object.assign(o.style, {
					position: r,
					left: `${e}px`,
					top: `${t}px`
				}), l || (l = !0, o.style.visibility = "");
			});
		}, s.autoUpdate), f;
		return i && (f = (e) => {
			let n = e.target;
			!(n instanceof Node) || o.contains(n) || t.contains(n) || a();
		}, document.addEventListener("pointerdown", f, !0)), () => {
			d(), f && document.removeEventListener("pointerdown", f, !0), u && o.remove();
		};
	};
}
function KS({ editor: e, pluginKey: t, items: n, renderer: r, minQueryLength: i, debounce: a, initialItems: o, placement: s, offset: c, container: l, flip: u, floatingUi: d, dismissOnOutsideClick: f, command: p, clientRectFor: m, dispatchExit: h }) {
	let g, _ = HS({
		editor: e,
		items: n
	}), v = US({
		placement: s,
		offset: c,
		flip: u,
		floatingUi: d
	});
	function y(e, t) {
		switch (e) {
			case "started":
				var n;
				r == null || (n = r.onStart) == null || n.call(r, t);
				break;
			case "updated":
				var i;
				r == null || (i = r.onUpdate) == null || i.call(r, t);
				break;
			case "stopped":
				var a;
				r == null || (a = r.onExit) == null || a.call(r, t);
		}
	}
	return {
		update: async (n, d) => {
			let b = t.getState(d), x = t.getState(n.state);
			if (!b || !x) return;
			let S = null, C = b.query !== x.query, w = b.text !== x.text, T = b.range.from !== x.range.from || b.range.to !== x.range.to, ee = C || w || T;
			if (!b.active && x.active) S = "started";
			else if (b.active && !x.active) S = "stopped";
			else if (x.active && ee) S = "updated";
			else return;
			let te = S === "stopped" ? b : x, ne = n.dom.querySelector(`[data-decoration-id="${te.decorationId}"]`), re = m(n, ne), ie = i === 0 || (te.query ? te.query.length >= i : !1), ae = (S === "started" || S === "updated") && ie;
			if (g = {
				editor: e,
				range: te.range,
				query: te.query || "",
				text: te.text || "",
				items: o ?? [],
				command: (t) => p({
					editor: e,
					range: te.range,
					props: t
				}),
				decorationNode: ne,
				clientRect: re,
				loading: ae,
				placement: s,
				offset: {
					mainAxis: c.mainAxis ?? 4,
					crossAxis: c.crossAxis ?? 0
				},
				container: l,
				flip: u,
				floatingUi: v,
				mount: GS({
					getReferenceRect: re,
					contextElement: n.dom,
					config: v,
					container: l,
					dismissOnOutsideClick: f,
					dismiss: () => h(e.view)
				})
			}, S === "started") {
				var oe;
				r == null || (oe = r.onBeforeStart) == null || oe.call(r, g);
			}
			if (S === "updated") {
				var se;
				r == null || (se = r.onBeforeUpdate) == null || se.call(r, g);
			}
			if (S === "started" && y(S, g), S === "started" || S === "updated") {
				if (!ae) _.abort(), g = {
					...g,
					items: o ?? [],
					loading: !1
				};
				else {
					g = {
						...g,
						items: o ?? [],
						loading: !0
					}, S = "updated", y(S, g);
					let e = await _.fetch(te.query || "", a);
					if (e.status === "aborted") return;
					if (!t.getState(n.state)?.active) {
						_.abort();
						return;
					}
					g = e.status === "resolved" ? {
						...g,
						items: e.items,
						loading: !1
					} : {
						...g,
						loading: !1
					};
				}
			}
			if (S === "stopped") {
				_.abort(), y(S, g), g = void 0;
				return;
			}
			S === "updated" && y(S, g);
		},
		destroy: () => {
			var e;
			_.abort(), g && (r == null || (e = r.onExit) == null || e.call(r, g));
		}
	};
}
var qS = new M("suggestion");
function JS({ pluginKey: e = qS, editor: t, char: n = "@", allowSpaces: r = !1, allowToIncludeChar: i = !1, allowedPrefixes: a = [" "], startOfLine: o = !1, decorationTag: s = "span", decorationClass: c = "suggestion", decorationContent: l = "", decorationEmptyClass: u = "is-empty", command: d = () => null, items: f = () => [], minQueryLength: p = 0, debounce: m = 0, initialItems: h, placement: g = "bottom-start", offset: _ = {}, container: v, flip: y = !0, floatingUi: b, dismissOnOutsideClick: x = !0, render: S = () => ({}), allow: C = () => !0, findSuggestionMatch: w = PS, shouldShow: T, shouldResetDismissed: ee }) {
	let te = S?.(), ne = r && !i, re = (n, r) => LS(t, n, r, e);
	function ie(e) {
		return RS({
			...e,
			editor: t,
			shouldResetDismissed: ee,
			effectiveAllowSpaces: ne
		});
	}
	let ae = (t) => zS({
		view: t,
		pluginKeyRef: e
	});
	return new j({
		key: e,
		view: () => KS({
			editor: t,
			pluginKey: e,
			items: f,
			renderer: te,
			minQueryLength: p,
			debounce: m,
			initialItems: h,
			placement: g,
			offset: _,
			container: v,
			flip: y,
			floatingUi: b,
			dismissOnOutsideClick: x,
			command: d,
			clientRectFor: re,
			dispatchExit: ae
		}),
		state: VS({
			editor: t,
			char: n,
			effectiveAllowSpaces: ne,
			allowToIncludeChar: i,
			allowedPrefixes: a,
			startOfLine: o,
			findSuggestionMatch: w,
			allow: C,
			shouldShow: T,
			shouldKeepDismissed: ie,
			pluginKey: e
		}),
		props: BS({
			pluginKey: e,
			decorationTag: s,
			decorationClass: c,
			decorationContent: l,
			decorationEmptyClass: u,
			renderer: te,
			dispatchExit: ae
		})
	});
}
function YS(e, t = qS) {
	let n = e.state.tr.setMeta(t, { exit: !0 });
	e.dispatch(n);
}
var XS = JS, ZS = {
	x: 0,
	y: 0,
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
	width: 0,
	height: 0
};
function QS({ editor: e, root: t, element: n, renderItems: r, optionFor: i }) {
	let a = null, o = [], s = 0, c = !1, l = null, u = (t) => {
		s = t, o.forEach((e, n) => {
			i(e)?.setAttribute("aria-selected", n === t ? "true" : "false");
		});
		let n = i(o[t]);
		n && (e.view.dom.setAttribute("aria-activedescendant", n.id), n.scrollIntoView({ block: "nearest" }));
	}, d = () => {
		l?.(), l = null, n.hidden = !0, e.view.dom.removeAttribute("aria-activedescendant"), e.view.dom.setAttribute("aria-expanded", "false");
	}, f = () => {
		if (n.hidden = !1, e.view.dom.setAttribute("aria-expanded", "true"), l) return;
		let t = { getBoundingClientRect: () => a?.clientRect?.() ?? ZS };
		l = Jx(t, n, () => {
			Qx(t, n, {
				strategy: "fixed",
				placement: "bottom-start",
				middleware: [
					Yx(4),
					Zx(),
					Xx({ padding: 8 })
				]
			}).then(({ x: e, y: t }) => {
				Object.assign(n.style, {
					left: `${e}px`,
					top: `${t}px`
				});
			});
		});
	}, p = (e) => e.preventDefault();
	return n.addEventListener("mousedown", p), {
		get isOpen() {
			return !n.hidden;
		},
		select(e) {
			a?.command(e);
		},
		setBusy(e) {
			c = e;
		},
		start(r) {
			a = r, t.setAttribute("data-rep-suggesting", ""), e.view.dom.setAttribute("aria-controls", n.id), e.view.dom.setAttribute("aria-autocomplete", "list");
		},
		show(e, n) {
			if (a = e, o = n, t.toggleAttribute("data-rep-suggesting", o.length > 0), r(o), !o.length) {
				d();
				return;
			}
			f(), u(0);
		},
		showStatus(n, r) {
			a = n, o = [], t.setAttribute("data-rep-suggesting", ""), r(), e.view.dom.removeAttribute("aria-activedescendant"), f();
		},
		onKeyDown(e) {
			return e.key === "Escape" || c && (e.key === "Enter" || e.key === "Tab") ? !0 : !o.length || n.hidden ? !1 : e.key === "ArrowDown" ? (u((s + 1) % o.length), !0) : e.key === "ArrowUp" ? (u((s - 1 + o.length) % o.length), !0) : e.key === "Enter" || e.key === "Tab" ? (a.command(o[s]), !0) : !1;
		},
		forget() {
			o = [], a = null, c = !1, l?.(), l = null;
		},
		exit() {
			o = [], a = null, c = !1, t.removeAttribute("data-rep-suggesting"), e.view.dom.removeAttribute("aria-controls"), e.view.dom.removeAttribute("aria-autocomplete"), d();
		},
		destroy() {
			l?.(), n.removeEventListener("mousedown", p);
		}
	};
}
function $S(e, t) {
	e.registerPlugin(t, (e, t) => [e, ...t]);
}
//#endregion
//#region resources/js/mentions/mention-menu.js
var eC = [
	" ",
	"(",
	"[",
	"{",
	"\"",
	"'"
], tC = 200, nC = 0, rC = /* @__PURE__ */ new WeakMap();
function iC(e, t, n) {
	let r = document.createElement("button"), i = document.createElement("span"), a = document.createElement("span");
	if (r.type = "button", r.tabIndex = -1, r.id = `${n}-${t}`, r.className = "rep-menu-item", r.setAttribute("role", "option"), r.setAttribute("aria-selected", "false"), r.dataset.repMentionIndex = String(t), e.avatar) {
		let t = document.createElement("img");
		t.className = "rep-mention-avatar", t.src = e.avatar, t.alt = "", r.append(t);
	}
	if (i.className = "rep-menu-item-text", a.className = "rep-menu-item-label", a.textContent = e.label, i.append(a), e.description) {
		let t = document.createElement("span");
		t.className = "rep-menu-item-description", t.textContent = e.description, i.append(t);
	}
	return r.append(i), r;
}
function aC({ editor: e, root: t, element: n, provider: r, search: i, debounce: a = tC }) {
	let o = new M(`repMention${nC += 1}`), { trigger: s, allowSpaces: c, minQueryLength: l, messages: u } = r, d = [], f = [], p = QS({
		editor: e,
		root: t,
		element: n,
		optionFor: (e) => d[f.indexOf(e)],
		renderItems: (e) => {
			f = e, d = e.map((e, t) => iC(e, t, n.id)), n.replaceChildren(...d);
		}
	}), m = (e, t) => {
		rC.set(n, o), p.showStatus(e, () => {
			let e = document.createElement("div");
			e.className = "rep-menu-status", e.textContent = t, d = [], f = [], n.replaceChildren(e);
		});
	}, h = (t) => {
		let r = t.query ?? "";
		if (r.length < l) {
			p.setBusy(!1), m(t, u.searchPrompt);
			return;
		}
		if (t.loading) {
			p.setBusy(!0), m(t, u.searching);
			return;
		}
		if (p.setBusy(!1), t.items.length) {
			rC.set(n, o), p.show(t, t.items);
			return;
		}
		if (c && /\s/.test(r)) {
			YS(e.view, o);
			return;
		}
		m(t, u.noResults);
	}, g = () => YS(e.view, o), _ = (e) => {
		let t = e.target.closest("[data-rep-mention-index]")?.dataset.repMentionIndex;
		t !== void 0 && rC.get(n) === o && p.select(f[Number(t)]);
	};
	return n.addEventListener("click", _), e.once("destroy", () => {
		p.destroy(), n.removeEventListener("click", _);
	}), JS({
		pluginKey: o,
		editor: e,
		char: s,
		allowSpaces: c,
		allowedPrefixes: eC,
		debounce: a,
		allow: ({ state: e, range: t }) => !e.doc.resolve(t.from).parent.type.spec.code,
		items: async ({ query: e }) => {
			if (e.length < l) return [];
			try {
				return await i(e, s) ?? [];
			} catch (e) {
				return console.error("[rich-editor-plus] The mention search failed.", e), [];
			}
		},
		command: ({ editor: e, range: t, props: n }) => wS(e, t, n, s),
		render: () => ({
			onStart(t) {
				p.start(t), e.on("blur", g), h(t);
			},
			onUpdate: h,
			onKeyDown: ({ event: e }) => p.onKeyDown(e),
			onExit() {
				if (e.off("blur", g), d = [], f = [], rC.get(n) !== o) {
					p.forget();
					return;
				}
				n.replaceChildren(), p.exit();
			}
		})
	});
}
//#endregion
//#region resources/js/slash/slash-menu.js
var oC = new M("repSlashMenu");
function sC(e, t) {
	let n = t.trim().toLowerCase(), r = (e) => {
		let t = e.toLowerCase();
		return t.startsWith(n) || t.split(/\s+/).some((e) => e.startsWith(n));
	};
	return e.filter(({ label: e, keywords: t }) => n === "" || [e, ...t ?? []].some(r));
}
var cC = (e) => {
	for (let t = 1; t < e.depth; t++) if (e.node(t).type.name !== "blockquote") return !1;
	return e.depth >= 1;
};
function lC({ state: e, range: t }) {
	let n = e.doc.resolve(t.from);
	return cC(n) && n.parent.type.name === "paragraph" && t.from === n.start() && t.to === n.end() && e.selection.from === t.to;
}
function uC(e, t, n, r, i) {
	if (!Uh(e, n)) return !1;
	if (e.state.doc.resolve(t.from).depth > 1 && !n.action) {
		let r = e.chain().focus().deleteRange(t);
		return n.node.name === "paragraph" ? r.run() : r[n.command](...n.arguments ?? []).run();
	}
	return e.chain().focus().deleteRange(t).run(), qh(e, n, r, i);
}
function dC({ editor: e, root: t, element: n, blockTypes: r, mountAction: i }) {
	let a = new Map([...n.querySelectorAll("[data-rep-block-type]")].map((e) => [e.dataset.repBlockType, e])), o = QS({
		editor: e,
		root: t,
		element: n,
		optionFor: (e) => a.get(e?.name),
		renderItems: (e) => {
			let t = new Set(e.map(({ name: e }) => e));
			a.forEach((e, n) => {
				e.hidden = !t.has(n);
			});
		}
	}), s = [], c = (e) => {
		e.loading || (s = e.items, o.show(e, s));
	}, l = () => YS(e.view, oC), u = (e) => {
		let t = e.target.closest("[data-rep-block-type]")?.dataset.repBlockType, n = s.find((e) => e.name === t);
		n && o.select(n);
	};
	return n.addEventListener("click", u), e.once("destroy", () => {
		o.destroy(), n.removeEventListener("click", u);
	}), JS({
		pluginKey: oC,
		editor: e,
		char: "/",
		startOfLine: !0,
		allowedPrefixes: null,
		allow: lC,
		items: ({ query: e }) => sC(r, e),
		command: ({ editor: e, range: t, props: n }) => uC(e, t, n, r, i),
		render: () => ({
			onStart(t) {
				o.start(t), e.on("blur", l), c(t);
			},
			onUpdate: c,
			onKeyDown: ({ event: e }) => o.onKeyDown(e),
			onExit() {
				e.off("blur", l), s = [], o.exit();
			}
		})
	});
}
var fC = $S, pC = "application/x-rep-block";
function mC(e) {
	let t = [];
	return e.state.doc.forEach((n, r) => {
		let i = e.nodeDOM(r);
		if (i instanceof HTMLElement) {
			let { top: e, bottom: a } = i.getBoundingClientRect();
			t.push({
				pos: r,
				end: r + n.nodeSize,
				top: e,
				bottom: a
			});
		}
	}), t;
}
function hC(e, t) {
	for (let { pos: n, top: r, bottom: i } of e) if (t < (r + i) / 2) return {
		pos: n,
		y: r
	};
	let n = e.at(-1);
	return n ? {
		pos: n.end,
		y: n.bottom
	} : null;
}
function gC({ editor: e, root: t }) {
	let n = document.createElement("div");
	n.className = "rep-drop-line", n.hidden = !0, t.append(n);
	let r = null, i = () => {
		t.hasAttribute("data-rep-drag-hold") && (t.removeAttribute("data-rep-drag-hold"), e.commands.focus());
	}, a = () => t.removeAttribute("data-rep-drag-hold"), o = () => {
		r = null, n.hidden = !0, t.removeAttribute("data-rep-dragging"), i();
	}, s = (e) => {
		e.target.closest?.("[data-rep-drag-handle]") && t.setAttribute("data-rep-drag-hold", "");
	}, c = (n) => {
		let i = n.target.closest?.("[data-rep-drag-handle]");
		if (!i) return;
		let a = Fh(e.state), o = a ? e.view.nodeDOM(a.pos) : null;
		if (i.getAttribute("aria-disabled") === "true" || !(o instanceof HTMLElement)) {
			n.preventDefault();
			return;
		}
		r = a, n.dataTransfer.effectAllowed = "move", n.dataTransfer.setData(pC, a.node.type.name), n.dataTransfer.setDragImage(o, 0, 0), t.setAttribute("data-rep-dragging", "");
	}, l = (e) => !r && [...e.dataTransfer?.types ?? []].includes(pC), u = (i) => {
		if (l(i)) {
			i.stopPropagation(), i.dataTransfer.dropEffect = "none";
			return;
		}
		if (!r) return;
		i.preventDefault(), i.stopPropagation(), i.dataTransfer.dropEffect = "move";
		let a = hC(mC(e.view), i.clientY);
		a && (n.hidden = !1, n.style.top = `${a.y - t.getBoundingClientRect().top}px`);
	}, d = (t) => {
		if (l(t)) {
			t.preventDefault(), t.stopPropagation();
			return;
		}
		if (!r) return;
		t.preventDefault(), t.stopPropagation();
		let n = e.state.doc.nodeAt(r.pos) === r.node, i = hC(mC(e.view), t.clientY);
		i && n && e.commands.moveBlockTo(r.pos, i.pos), o();
	}, f = (e) => {
		r && !t.contains(e.relatedTarget) && (n.hidden = !0);
	};
	return t.addEventListener("mousedown", s), t.addEventListener("dragstart", c), t.addEventListener("dragover", u, !0), t.addEventListener("drop", d, !0), t.addEventListener("dragleave", f), t.addEventListener("dragend", o), document.addEventListener("mouseup", i), window.addEventListener("blur", a), { destroy() {
		t.removeEventListener("mousedown", s), t.removeEventListener("dragstart", c), t.removeEventListener("dragover", u, !0), t.removeEventListener("drop", d, !0), t.removeEventListener("dragleave", f), t.removeEventListener("dragend", o), document.removeEventListener("mouseup", i), window.removeEventListener("blur", a), n.remove();
	} };
}
//#endregion
//#region resources/js/toolbar/tools.js
var _C = (e) => [...e.querySelectorAll("[data-rep-tool], [data-rep-control]")].filter((e) => !e.closest("[data-rep-block-toolbar] [hidden]")), vC = (e) => Array.isArray(e) ? {} : e ?? {};
function yC(e, t, n) {
	if (t?.action) {
		n(t.action, Ph(t.action, e));
		return;
	}
	if (!t?.command) return;
	let r = e.chain().focus();
	if (typeof r[t.command] != "function") {
		console.warn(`[rich-editor-plus] The editor has no [${t.command}] command.`);
		return;
	}
	r[t.command](...t.arguments ?? []).run();
}
function bC(e, t, n) {
	let r = !!Lh(e.state.selection);
	t.querySelectorAll("[data-rep-tool]").forEach((t) => {
		let i = n[t.dataset.repTool], a = i?.active, o = !!a && e.isActive(a.name, vC(a.attributes));
		t.setAttribute("aria-pressed", o ? "true" : "false"), t.classList.toggle("rep-tool-active", o), i?.checksAvailability && t.setAttribute("aria-disabled", e.can()[i.command](...i.arguments ?? []) ? "false" : "true"), i?.hidesInListItem && (t.hidden = r);
	}), t.querySelectorAll("[data-rep-block-tools]").forEach((e) => {
		e.hidden = [...e.querySelectorAll("[data-rep-tool]")].every((e) => e.hidden);
	});
}
function xC(e, t, n, r) {
	t.addEventListener("mousedown", (e) => {
		e.target.closest("[data-rep-tool], [data-rep-control]") && e.preventDefault();
	}), t.addEventListener("click", (i) => {
		let a = i.target.closest("[data-rep-tool]");
		a && (yC(e, n[a.dataset.repTool], r), bC(e, t, n));
	}), t.addEventListener("keydown", (n) => {
		let r = _C(t), i = r.indexOf(document.activeElement);
		if (n.key === "Escape") {
			n.preventDefault(), e.commands.focus();
			return;
		}
		if (i === -1) return;
		let a = {
			ArrowRight: r[(i + 1) % r.length],
			ArrowLeft: r[(i - 1 + r.length) % r.length],
			Home: r[0],
			End: r[r.length - 1]
		}[n.key];
		a && (n.preventDefault(), SC(t, a));
	});
}
function SC(e, t) {
	e.querySelectorAll("[data-rep-tool], [data-rep-control]").forEach((e) => {
		e.setAttribute("tabindex", e === t ? "0" : "-1");
	}), t.focus();
}
function CC(e) {
	let t = _C(e);
	t.length && SC(e, t[0]);
}
//#endregion
//#region resources/js/toolbar/block-toolbar.js
var wC = new M("repBlockToolbar");
function TC(e, { aboveBlockWithCursor: t = !1 } = {}) {
	let { selection: n } = e.state, r = n instanceof A ? e.nodeDOM(n.from) : null, i;
	if (t && n.empty) {
		let t = Fh(e.state), n = t ? e.nodeDOM(t.pos) : null;
		i = (n instanceof HTMLElement ? n : e.dom).getBoundingClientRect();
	} else i = r instanceof HTMLElement ? r.getBoundingClientRect() : dd(e, n.from, n.to);
	let { left: a, right: o, top: s, bottom: c } = i;
	return {
		x: a,
		y: s,
		left: a,
		right: o,
		top: s,
		bottom: c,
		width: o - a,
		height: c - s
	};
}
var EC = class {
	constructor(e, { toolbars: t, root: n, floatingElements: r, onShow: i, onHide: a }) {
		this.view = e, this.toolbars = t, this.root = n, this.floatingElements = r ?? [], this.onShow = i, this.onHide = a, this.current = null, this.dismissed = !1, this.isDestroyed = !1, this.isForced = !1, this.isPointerDown = !1, this.handlePointerRelease = () => {
			this.isPointerDown = !1, this.root?.removeAttribute("data-rep-selecting");
		}, document.addEventListener("mouseup", this.handlePointerRelease), document.addEventListener("dragend", this.handlePointerRelease), this.scheduleRefresh = () => requestAnimationFrame(() => {
			this.isDestroyed || (this.focusElements.some((e) => e.contains(document.activeElement)) || (this.isForced = !1), this.refresh());
		}), e.dom.addEventListener("focusin", this.scheduleRefresh), e.dom.addEventListener("focusout", this.scheduleRefresh), this.focusElements.forEach((e) => e.addEventListener("focusout", this.scheduleRefresh));
	}
	get focusElements() {
		return [...this.toolbars.values(), ...this.floatingElements];
	}
	update(e, t) {
		this.view = e, (!t.selection.eq(e.state.selection) || !t.doc.eq(e.state.doc)) && (this.dismissed = !1), this.root?.toggleAttribute("data-rep-selecting", this.isPointerDown && !e.state.selection.empty), this.hasFocus() ? this.refresh() : this.scheduleRefresh();
	}
	hasFocus() {
		return this.view.hasFocus() || this.root?.hasAttribute("data-rep-drag-hold") || this.focusElements.some((e) => e.contains(document.activeElement));
	}
	dismiss() {
		return this.current ? (this.dismissed = !0, this.refresh(), !0) : !1;
	}
	focusToolbar() {
		return this.isForced = !0, this.refresh(), this.current ? (CC(this.current.toolbar), !0) : (this.isForced = !1, !1);
	}
	refresh() {
		let e = Fh(this.view.state), t = e ? this.toolbars.get(e.node.type.name) ?? this.toolbars.get("*") : null, n = e ? this.view.nodeDOM(e.pos) : null;
		if (!t || this.view.state.selection.empty && !this.isForced && !t.hasAttribute("data-rep-show-with-cursor") || !(n instanceof HTMLElement) || !this.view.editable || this.dismissed || !this.hasFocus()) return this.hide();
		if (this.current?.toolbar === t && this.current.blockElement === n) return this.current.position();
		this.hide(), t.hidden = !1;
		let r = {
			getBoundingClientRect: () => TC(this.view, { aboveBlockWithCursor: t.hasAttribute("data-rep-show-with-cursor") }),
			contextElement: this.view.dom
		}, i = () => {
			this.root && (t.style.maxWidth = `${this.root.clientWidth}px`), Qx(r, t, {
				strategy: "fixed",
				placement: "top",
				middleware: [
					Yx(8),
					Zx(),
					Xx({ padding: 8 })
				]
			}).then(({ x: e, y: n }) => {
				Object.assign(t.style, {
					left: `${e}px`,
					top: `${n}px`
				});
			});
		}, a = Jx(r, t, i);
		this.current = {
			toolbar: t,
			blockElement: n,
			cleanup: a,
			position: i
		}, this.onShow?.();
	}
	hide() {
		this.current && (this.current.cleanup(), this.current.toolbar.hidden = !0, this.current = null, this.onHide?.());
	}
	destroy() {
		this.isDestroyed = !0, this.hide(), this.handlePointerRelease(), document.removeEventListener("mouseup", this.handlePointerRelease), document.removeEventListener("dragend", this.handlePointerRelease), this.view.dom.removeEventListener("focusin", this.scheduleRefresh), this.view.dom.removeEventListener("focusout", this.scheduleRefresh), this.focusElements.forEach((e) => e.removeEventListener("focusout", this.scheduleRefresh));
	}
};
function DC({ toolbars: e, root: t, floatingElements: n, onShow: r, onHide: i }) {
	let a = null;
	return new j({
		key: wC,
		view: (o) => a = new EC(o, {
			toolbars: e,
			root: t,
			floatingElements: n,
			onShow: r,
			onHide: i
		}),
		props: {
			handleDOMEvents: { mousedown(e, t) {
				return a && t.button === 0 && (a.isPointerDown = !0), !1;
			} },
			handleKeyDown(e, t) {
				return t.key === "Escape" && a?.dismiss() ? !0 : t.key === "F10" && t.altKey ? a?.root?.hasAttribute("data-rep-suggesting") ? !0 : !!a?.focusToolbar() : !1;
			}
		}
	});
}
//#endregion
//#region resources/js/toolbar/tooltip.js
var OC = 400, kC = 300, AC = {
	ArrowUp: ["↑", "↑"],
	ArrowDown: ["↓", "↓"],
	ArrowLeft: ["←", "←"],
	ArrowRight: ["→", "→"],
	Enter: ["↩", "Enter"],
	Backspace: ["⌫", "Backspace"],
	Delete: ["⌦", "Delete"],
	Escape: ["Esc", "Esc"],
	Space: ["Space", "Space"]
}, jC = {
	Mod: ["⌘", "Ctrl"],
	Meta: ["⌘", "Win"],
	Cmd: ["⌘", "Win"],
	Ctrl: ["⌃", "Ctrl"],
	Control: ["⌃", "Ctrl"],
	Alt: ["⌥", "Alt"],
	Shift: ["⇧", "Shift"]
}, MC = {
	Mod: null,
	Meta: "Meta",
	Cmd: "Meta",
	Ctrl: "Control",
	Control: "Control",
	Alt: "Alt",
	Shift: "Shift"
}, NC = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgentData?.platform ?? navigator.platform ?? ""), PC = (e) => {
	let t = e.split("-");
	return e.endsWith("-") && t.splice(-2, 2, "-"), t;
};
function FC(e, t = NC()) {
	return PC(e).map((e, n, r) => {
		let i = n < r.length - 1 ? jC[e] : AC[e];
		return i ? i[+!t] : e.length === 1 ? e.toUpperCase() : e;
	}).join(t ? "" : "+");
}
function IC(e, t = NC()) {
	return PC(e).map((e, n, r) => n === r.length - 1 ? e.length === 1 ? e.toUpperCase() : e : MC[e] ?? (t ? "Meta" : "Control")).join("+");
}
function LC({ root: e, toolbars: t, isMac: n = NC() }) {
	let r = document.createElement("div"), i = document.createElement("span"), a = document.createElement("kbd");
	r.className = "rep-tooltip", r.hidden = !0, r.setAttribute("aria-hidden", "true"), i.className = "rep-tooltip-label", a.className = "rep-tooltip-keys", r.append(i, a), e.append(r);
	let o = null, s = null, c = null, l = 0, u = (e) => e?.closest?.(".rep-tool"), d = (e) => e.getAttribute("aria-label") ?? e.dataset.repTooltip ?? "", f = (e) => {
		clearTimeout(c);
		let t = d(e);
		t && e.getAttribute("aria-expanded") !== "true" && (s?.(), o = e, i.textContent = t, a.textContent = e.dataset.repShortcut ? FC(e.dataset.repShortcut, n) : "", a.hidden = !e.dataset.repShortcut, r.hidden = !1, s = Jx(e, r, () => {
			Qx(e, r, {
				strategy: "fixed",
				placement: "top",
				middleware: [
					Yx(6),
					Zx(),
					Xx({ padding: 8 })
				]
			}).then(({ x: e, y: t }) => {
				Object.assign(r.style, {
					left: `${e}px`,
					top: `${t}px`
				});
			});
		}));
	}, p = (e) => {
		if (clearTimeout(c), o || Date.now() - l < kC) {
			f(e);
			return;
		}
		c = setTimeout(() => f(e), OC);
	}, m = () => {
		clearTimeout(c), o && (s?.(), s = null, o = null, r.hidden = !0, l = Date.now());
	}, h = () => {
		m(), l = 0;
	}, g = (e) => {
		try {
			return e.matches(":focus-visible");
		} catch {
			return !0;
		}
	}, _ = {
		pointerover: (e) => {
			let t = u(e.target);
			t && t !== o && p(t);
		},
		pointerout: (e) => {
			u(e.target) && !u(e.relatedTarget) && m();
		},
		pointerdown: h,
		focusin: (e) => {
			let t = u(e.target);
			t && g(t) && f(t);
		},
		focusout: (e) => {
			u(e.relatedTarget) || m();
		},
		keydown: (e) => {
			(e.key === "Escape" || e.key === "Enter" || e.key === " ") && h();
		}
	};
	return t.forEach((e) => {
		e.querySelectorAll("[data-rep-shortcut]").forEach((e) => {
			e.setAttribute("aria-keyshortcuts", IC(e.dataset.repShortcut, n));
		}), Object.entries(_).forEach(([t, n]) => e.addEventListener(t, n));
	}), {
		element: r,
		hide: h,
		destroy() {
			h(), t.forEach((e) => Object.entries(_).forEach(([t, n]) => e.removeEventListener(t, n))), r.remove();
		}
	};
}
//#endregion
//#region ../../node_modules/prosemirror-inputrules/dist/index.js
var RC = class {
	constructor(e, t, n = {}) {
		this.match = e, this.match = e, this.handler = typeof t == "string" ? zC(t) : t, this.undoable = n.undoable !== !1, this.inCode = n.inCode || !1, this.inCodeMark = n.inCodeMark !== !1;
	}
};
function zC(e) {
	return function(t, n, r, i) {
		let a = e;
		if (n[1]) {
			let e = n[0].lastIndexOf(n[1]);
			a += n[0].slice(e + n[1].length), r += e;
			let t = r - i;
			t > 0 && (a = n[0].slice(e - t, e) + a, r = i);
		}
		return t.tr.insertText(a, r, i);
	};
}
var BC = 500;
function VC({ rules: e }) {
	let t = new j({
		state: {
			init() {
				return null;
			},
			apply(e, t) {
				return e.getMeta(this) || (e.selectionSet || e.docChanged ? null : t);
			}
		},
		props: {
			handleTextInput(n, r, i, a) {
				return HC(n, r, i, a, e, t);
			},
			handleDOMEvents: { compositionend: (n) => {
				setTimeout(() => {
					let { $cursor: r } = n.state.selection;
					r && HC(n, r.pos, r.pos, "", e, t);
				});
			} }
		},
		isInputRules: !0
	});
	return t;
}
function HC(e, t, n, r, i, a) {
	if (e.composing) return !1;
	let o = e.state, s = o.doc.resolve(t), c = s.parent.textBetween(Math.max(0, s.parentOffset - BC), s.parentOffset, null, "￼") + r;
	for (let l = 0; l < i.length; l++) {
		let u = i[l];
		if (!u.inCodeMark && s.marks().some((e) => e.type.spec.code)) continue;
		if (s.parent.type.spec.code) {
			if (!u.inCode) continue;
		} else if (u.inCode === "only") continue;
		let d = u.match.exec(c);
		if (!d || d[0].length < r.length) continue;
		let f = t - (d[0].length - r.length);
		if (!u.inCodeMark) {
			let e = !1;
			if (o.doc.nodesBetween(f, s.pos, (t) => {
				t.isInline && t.marks.some((e) => e.type.spec.code) && (e = !0);
			}), e) continue;
		}
		let p = u.handler(o, d, f, n);
		if (p) return u.undoable && p.setMeta(a, {
			transform: p,
			from: t,
			to: n,
			text: r
		}), e.dispatch(p), !0;
	}
	return !1;
}
var UC = (e, t) => {
	let n = e.plugins;
	for (let r = 0; r < n.length; r++) {
		let i = n[r], a;
		if (i.spec.isInputRules && (a = i.getState(e))) {
			if (t) {
				let n = e.tr, r = a.transform;
				for (let e = r.steps.length - 1; e >= 0; e--) n.step(r.steps[e].invert(r.docs[e]));
				if (a.text) {
					let t = n.doc.resolve(a.from).marks();
					n.replaceWith(a.from, a.to, e.schema.text(a.text, t));
				} else n.delete(a.from, a.to);
				t(n);
			}
			return !0;
		}
	}
	return !1;
}, WC = new RC(/--$/, "—", { inCodeMark: !1 }), GC = new RC(/\.\.\.$/, "…", { inCodeMark: !1 }), KC = new RC(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(")$/, "“", { inCodeMark: !1 }), qC = new RC(/"$/, "”", { inCodeMark: !1 }), JC = new RC(/(?:^|[\s\{\[\(\<'"\u2018\u201C])(')$/, "‘", { inCodeMark: !1 }), YC = new RC(/'$/, "’", { inCodeMark: !1 }), XC = [
	KC,
	qC,
	JC,
	YC
];
function ZC(e, t, n = null, r) {
	return new RC(e, (e, i, a, o) => {
		let s = n instanceof Function ? n(i) : n, c = e.tr.delete(a, o), l = c.doc.resolve(a).blockRange(), u = l && jt(l, t, s);
		if (!u) return null;
		c.wrap(l, u);
		let d = c.doc.resolve(a - 1).nodeBefore;
		return d && d.type == t && Ut(c.doc, a - 1) && (!r || r(i, d)) && c.join(a - 1), c;
	});
}
function QC(e, t, n = null) {
	return new RC(e, (e, r, i, a) => {
		let o = e.doc.resolve(i), s = n instanceof Function ? n(r) : n;
		return o.node(-1).canReplaceWith(o.index(-1), o.indexAfter(-1), t) ? e.tr.delete(i, a).setBlockType(i, i, t, s) : null;
	});
}
//#endregion
//#region ../../node_modules/@tiptap/pm/dist/inputrules/index.js
var $C = /* @__PURE__ */ t({
	InputRule: () => RC,
	closeDoubleQuote: () => qC,
	closeSingleQuote: () => YC,
	ellipsis: () => GC,
	emDash: () => WC,
	inputRules: () => VC,
	openDoubleQuote: () => KC,
	openSingleQuote: () => JC,
	smartQuotes: () => XC,
	textblockTypeInputRule: () => QC,
	undoInputRule: () => UC,
	wrappingInputRule: () => ZC
}), ew, tw;
if (typeof WeakMap < "u") {
	let e = /* @__PURE__ */ new WeakMap();
	ew = (t) => e.get(t), tw = (t, n) => (e.set(t, n), n);
} else {
	let e = [], t = 0;
	ew = (t) => {
		for (let n = 0; n < e.length; n += 2) if (e[n] == t) return e[n + 1];
	}, tw = (n, r) => (t == 10 && (t = 0), e[t++] = n, e[t++] = r);
}
var Z = class {
	constructor(e, t, n, r) {
		this.width = e, this.height = t, this.map = n, this.problems = r;
	}
	findCell(e) {
		for (let t = 0; t < this.map.length; t++) {
			let n = this.map[t];
			if (n != e) continue;
			let r = t % this.width, i = t / this.width | 0, a = r + 1, o = i + 1;
			for (let e = 1; a < this.width && this.map[t + e] == n; e++) a++;
			for (let e = 1; o < this.height && this.map[t + this.width * e] == n; e++) o++;
			return {
				left: r,
				top: i,
				right: a,
				bottom: o
			};
		}
		throw RangeError(`No cell with offset ${e} found`);
	}
	colCount(e) {
		for (let t = 0; t < this.map.length; t++) if (this.map[t] == e) return t % this.width;
		throw RangeError(`No cell with offset ${e} found`);
	}
	nextCell(e, t, n) {
		let { left: r, right: i, top: a, bottom: o } = this.findCell(e);
		return t == "horiz" ? (n < 0 ? r == 0 : i == this.width) ? null : this.map[a * this.width + (n < 0 ? r - 1 : i)] : (n < 0 ? a == 0 : o == this.height) ? null : this.map[r + this.width * (n < 0 ? a - 1 : o)];
	}
	rectBetween(e, t) {
		let { left: n, right: r, top: i, bottom: a } = this.findCell(e), { left: o, right: s, top: c, bottom: l } = this.findCell(t);
		return {
			left: Math.min(n, o),
			top: Math.min(i, c),
			right: Math.max(r, s),
			bottom: Math.max(a, l)
		};
	}
	cellsInRect(e) {
		let t = [], n = {};
		for (let r = e.top; r < e.bottom; r++) for (let i = e.left; i < e.right; i++) {
			let a = r * this.width + i, o = this.map[a];
			n[o] || (n[o] = !0, !(i == e.left && i && this.map[a - 1] == o || r == e.top && r && this.map[a - this.width] == o) && t.push(o));
		}
		return t;
	}
	positionAt(e, t, n) {
		for (let r = 0, i = 0;; r++) {
			let a = i + n.child(r).nodeSize;
			if (r == e) {
				let n = t + e * this.width, r = (e + 1) * this.width;
				for (; n < r && this.map[n] < i;) n++;
				return n == r ? a - 1 : this.map[n];
			}
			i = a;
		}
	}
	static get(e) {
		return ew(e) || tw(e, nw(e));
	}
};
function nw(e) {
	if (e.type.spec.tableRole != "table") throw RangeError("Not a table node: " + e.type.name);
	let t = rw(e), n = e.childCount, r = [], i = 0, a = null, o = [];
	for (let e = 0, i = t * n; e < i; e++) r[e] = 0;
	for (let s = 0, c = 0; s < n; s++) {
		let l = e.child(s);
		c++;
		for (let e = 0;; e++) {
			for (; i < r.length && r[i] != 0;) i++;
			if (e == l.childCount) break;
			let u = l.child(e), { colspan: d, rowspan: f, colwidth: p } = u.attrs;
			for (let e = 0; e < f; e++) {
				if (e + s >= n) {
					(a ||= []).push({
						type: "overlong_rowspan",
						pos: c,
						n: f - e
					});
					break;
				}
				let l = i + e * t;
				for (let e = 0; e < d; e++) {
					r[l + e] == 0 ? r[l + e] = c : (a ||= []).push({
						type: "collision",
						row: s,
						pos: c,
						n: d - e
					});
					let n = p && p[e];
					if (n) {
						let r = (l + e) % t * 2, i = o[r];
						i == null || i != n && o[r + 1] == 1 ? (o[r] = n, o[r + 1] = 1) : i == n && o[r + 1]++;
					}
				}
			}
			i += d, c += u.nodeSize;
		}
		let u = (s + 1) * t, d = 0;
		for (; i < u;) r[i++] == 0 && d++;
		d && (a ||= []).push({
			type: "missing",
			row: s,
			n: d
		}), c++;
	}
	(t === 0 || n === 0) && (a ||= []).push({ type: "zero_sized" });
	let s = new Z(t, n, r, a), c = !1;
	for (let e = 0; !c && e < o.length; e += 2) o[e] != null && o[e + 1] < n && (c = !0);
	return c && iw(s, o, e), s;
}
function rw(e) {
	let t = -1, n = !1;
	for (let r = 0; r < e.childCount; r++) {
		let i = e.child(r), a = 0;
		if (n) for (let t = 0; t < r; t++) {
			let n = e.child(t);
			for (let e = 0; e < n.childCount; e++) {
				let i = n.child(e);
				t + i.attrs.rowspan > r && (a += i.attrs.colspan);
			}
		}
		for (let e = 0; e < i.childCount; e++) {
			let t = i.child(e);
			a += t.attrs.colspan, t.attrs.rowspan > 1 && (n = !0);
		}
		t == -1 ? t = a : t != a && (t = Math.max(t, a));
	}
	return t;
}
function iw(e, t, n) {
	e.problems ||= [];
	let r = {};
	for (let i = 0; i < e.map.length; i++) {
		let a = e.map[i];
		if (r[a]) continue;
		r[a] = !0;
		let o = n.nodeAt(a);
		if (!o) throw RangeError(`No cell with offset ${a} found`);
		let s = null, c = o.attrs;
		for (let n = 0; n < c.colspan; n++) {
			let r = t[(i + n) % e.width * 2];
			r != null && (!c.colwidth || c.colwidth[n] != r) && ((s ||= aw(c))[n] = r);
		}
		s && e.problems.unshift({
			type: "colwidth mismatch",
			pos: a,
			colwidth: s
		});
	}
}
function aw(e) {
	if (e.colwidth) return e.colwidth.slice();
	let t = [];
	for (let n = 0; n < e.colspan; n++) t.push(0);
	return t;
}
function ow(e, t) {
	if (typeof e == "string") return {};
	let n = e.getAttribute("data-colwidth"), r = n && /^\d+(,\d+)*$/.test(n) ? n.split(",").map((e) => Number(e)) : null, i = Number(e.getAttribute("colspan") || 1), a = {
		colspan: i,
		rowspan: Number(e.getAttribute("rowspan") || 1),
		colwidth: r && r.length == i ? r : null
	};
	for (let n in t) {
		let r = t[n].getFromDOM, i = r && r(e);
		i != null && (a[n] = i);
	}
	return a;
}
function sw(e, t) {
	let n = {};
	e.attrs.colspan != 1 && (n.colspan = e.attrs.colspan), e.attrs.rowspan != 1 && (n.rowspan = e.attrs.rowspan), e.attrs.colwidth && (n["data-colwidth"] = e.attrs.colwidth.join(","));
	for (let r in t) {
		let i = t[r].setDOMAttr;
		i && i(e.attrs[r], n);
	}
	return n;
}
function cw(e) {
	if (e !== null) {
		if (!Array.isArray(e)) throw TypeError("colwidth must be null or an array");
		for (let t of e) if (typeof t != "number") throw TypeError("colwidth must be null or an array of numbers");
	}
}
function lw(e) {
	let t = e.cellAttributes || {}, n = {
		colspan: {
			default: 1,
			validate: "number"
		},
		rowspan: {
			default: 1,
			validate: "number"
		},
		colwidth: {
			default: null,
			validate: cw
		}
	};
	for (let e in t) n[e] = {
		default: t[e].default,
		validate: t[e].validate
	};
	return {
		table: {
			content: "table_row+",
			tableRole: "table",
			isolating: !0,
			group: e.tableGroup,
			parseDOM: [{ tag: "table" }],
			toDOM() {
				return ["table", ["tbody", 0]];
			}
		},
		table_row: {
			content: "(table_cell | table_header)*",
			tableRole: "row",
			parseDOM: [{ tag: "tr" }],
			toDOM() {
				return ["tr", 0];
			}
		},
		table_cell: {
			content: e.cellContent,
			attrs: n,
			tableRole: "cell",
			isolating: !0,
			parseDOM: [{
				tag: "td",
				getAttrs: (e) => ow(e, t)
			}],
			toDOM(e) {
				return [
					"td",
					sw(e, t),
					0
				];
			}
		},
		table_header: {
			content: e.cellContent,
			attrs: n,
			tableRole: "header_cell",
			isolating: !0,
			parseDOM: [{
				tag: "th",
				getAttrs: (e) => ow(e, t)
			}],
			toDOM(e) {
				return [
					"th",
					sw(e, t),
					0
				];
			}
		}
	};
}
function Q(e) {
	let t = e.cached.tableNodeTypes;
	if (!t) {
		t = e.cached.tableNodeTypes = {};
		for (let n in e.nodes) {
			let r = e.nodes[n], i = r.spec.tableRole;
			i && (t[i] = r);
		}
	}
	return t;
}
var uw = new M("selectingCells");
function dw(e) {
	for (let t = e.depth - 1; t > 0; t--) if (e.node(t).type.spec.tableRole == "row") return e.node(0).resolve(e.before(t + 1));
	return null;
}
function fw(e) {
	for (let t = e.depth; t > 0; t--) {
		let n = e.node(t).type.spec.tableRole;
		if (n === "cell" || n === "header_cell") return e.node(t);
	}
	return null;
}
function pw(e) {
	let t = e.selection.$head;
	for (let e = t.depth; e > 0; e--) if (t.node(e).type.spec.tableRole == "row") return !0;
	return !1;
}
function mw(e) {
	let t = e.selection;
	if ("$anchorCell" in t && t.$anchorCell) return t.$anchorCell.pos > t.$headCell.pos ? t.$anchorCell : t.$headCell;
	if ("node" in t && t.node && t.node.type.spec.tableRole == "cell") return t.$anchor;
	let n = dw(t.$head) || hw(t.$head);
	if (n) return n;
	throw RangeError(`No cell found around position ${t.head}`);
}
function hw(e) {
	for (let t = e.nodeAfter, n = e.pos; t; t = t.firstChild, n++) {
		let r = t.type.spec.tableRole;
		if (r == "cell" || r == "header_cell") return e.doc.resolve(n);
	}
	for (let t = e.nodeBefore, n = e.pos; t; t = t.lastChild, n--) {
		let r = t.type.spec.tableRole;
		if (r == "cell" || r == "header_cell") return e.doc.resolve(n - t.nodeSize);
	}
}
function gw(e) {
	return e.parent.type.spec.tableRole == "row" && !!e.nodeAfter;
}
function _w(e) {
	return e.node(0).resolve(e.pos + e.nodeAfter.nodeSize);
}
function vw(e, t) {
	return e.depth == t.depth && e.pos >= t.start(-1) && e.pos <= t.end(-1);
}
function yw(e) {
	return Z.get(e.node(-1)).findCell(e.pos - e.start(-1));
}
function bw(e) {
	return Z.get(e.node(-1)).colCount(e.pos - e.start(-1));
}
function xw(e, t, n) {
	let r = e.node(-1), i = Z.get(r), a = e.start(-1), o = i.nextCell(e.pos - a, t, n);
	return o == null ? null : e.node(0).resolve(a + o);
}
function Sw(e, t, n = 1) {
	let r = {
		...e,
		colspan: e.colspan - n
	};
	return r.colwidth && (r.colwidth = r.colwidth.slice(), r.colwidth.splice(t, n), r.colwidth.some((e) => e > 0) || (r.colwidth = null)), r;
}
function Cw(e, t, n = 1) {
	let r = {
		...e,
		colspan: e.colspan + n
	};
	if (r.colwidth) {
		r.colwidth = r.colwidth.slice();
		for (let e = 0; e < n; e++) r.colwidth.splice(t, 0, 0);
	}
	return r;
}
function ww(e, t, n) {
	let r = Q(t.type.schema).header_cell;
	for (let i = 0; i < e.height; i++) if (t.nodeAt(e.map[n + i * e.width]).type != r) return !1;
	return !0;
}
var $ = class e extends O {
	constructor(e, t = e) {
		let n = e.node(-1), r = Z.get(n), i = e.start(-1), a = r.rectBetween(e.pos - i, t.pos - i), o = e.node(0), s = r.cellsInRect(a).filter((e) => e != t.pos - i);
		s.unshift(t.pos - i);
		let c = s.map((e) => {
			let t = n.nodeAt(e);
			if (!t) throw RangeError(`No cell with offset ${e} found`);
			let r = i + e + 1;
			return new yn(o.resolve(r), o.resolve(r + t.content.size));
		});
		super(c[0].$from, c[0].$to, c), this.$anchorCell = e, this.$headCell = t;
	}
	map(t, n) {
		let r = t.resolve(n.map(this.$anchorCell.pos)), i = t.resolve(n.map(this.$headCell.pos));
		if (gw(r) && gw(i) && vw(r, i)) {
			let t = this.$anchorCell.node(-1) != r.node(-1);
			return t && this.isRowSelection() ? e.rowSelection(r, i) : t && this.isColSelection() ? e.colSelection(r, i) : new e(r, i);
		}
		return k.between(r, i);
	}
	content() {
		let e = this.$anchorCell.node(-1), t = Z.get(e), n = this.$anchorCell.start(-1), r = t.rectBetween(this.$anchorCell.pos - n, this.$headCell.pos - n), i = {}, a = [];
		for (let n = r.top; n < r.bottom; n++) {
			let o = [];
			for (let a = n * t.width + r.left, s = r.left; s < r.right; s++, a++) {
				let n = t.map[a];
				if (i[n]) continue;
				i[n] = !0;
				let s = t.findCell(n), c = e.nodeAt(n);
				if (!c) throw RangeError(`No cell with offset ${n} found`);
				let l = r.left - s.left, u = s.right - r.right;
				if (l > 0 || u > 0) {
					let e = c.attrs;
					if (l > 0 && (e = Sw(e, 0, l)), u > 0 && (e = Sw(e, e.colspan - u, u)), s.left < r.left) {
						if (c = c.type.createAndFill(e), !c) throw RangeError(`Could not create cell with attrs ${JSON.stringify(e)}`);
					} else c = c.type.create(e, c.content);
				}
				if (s.top < r.top || s.bottom > r.bottom) {
					let e = {
						...c.attrs,
						rowspan: Math.min(s.bottom, r.bottom) - Math.max(s.top, r.top)
					};
					c = s.top < r.top ? c.type.createAndFill(e) : c.type.create(e, c.content);
				}
				o.push(c);
			}
			a.push(e.child(n).copy(l.from(o)));
		}
		let o = this.isColSelection() && this.isRowSelection() ? e : a;
		return new h(l.from(o), 1, 1);
	}
	replace(e, t = h.empty) {
		let n = e.steps.length, r = this.ranges;
		for (let i = 0; i < r.length; i++) {
			let { $from: a, $to: o } = r[i], s = e.mapping.slice(n);
			e.replace(s.map(a.pos), s.map(o.pos), i ? h.empty : t);
		}
		let i = O.findFrom(e.doc.resolve(e.mapping.slice(n).map(this.to)), -1);
		i && e.setSelection(i);
	}
	replaceWith(e, t) {
		this.replace(e, new h(l.from(t), 0, 0));
	}
	forEachCell(e) {
		let t = this.$anchorCell.node(-1), n = Z.get(t), r = this.$anchorCell.start(-1), i = n.cellsInRect(n.rectBetween(this.$anchorCell.pos - r, this.$headCell.pos - r));
		for (let n = 0; n < i.length; n++) e(t.nodeAt(i[n]), r + i[n]);
	}
	isColSelection() {
		let e = this.$anchorCell.index(-1), t = this.$headCell.index(-1);
		if (Math.min(e, t) > 0) return !1;
		let n = e + this.$anchorCell.nodeAfter.attrs.rowspan, r = t + this.$headCell.nodeAfter.attrs.rowspan;
		return Math.max(n, r) == this.$headCell.node(-1).childCount;
	}
	static colSelection(t, n = t) {
		let r = t.node(-1), i = Z.get(r), a = t.start(-1), o = i.findCell(t.pos - a), s = i.findCell(n.pos - a), c = t.node(0);
		return o.top <= s.top ? (o.top > 0 && (t = c.resolve(a + i.map[o.left])), s.bottom < i.height && (n = c.resolve(a + i.map[i.width * (i.height - 1) + s.right - 1]))) : (s.top > 0 && (n = c.resolve(a + i.map[s.left])), o.bottom < i.height && (t = c.resolve(a + i.map[i.width * (i.height - 1) + o.right - 1]))), new e(t, n);
	}
	isRowSelection() {
		let e = this.$anchorCell.node(-1), t = Z.get(e), n = this.$anchorCell.start(-1), r = t.colCount(this.$anchorCell.pos - n), i = t.colCount(this.$headCell.pos - n);
		if (Math.min(r, i) > 0) return !1;
		let a = r + this.$anchorCell.nodeAfter.attrs.colspan, o = i + this.$headCell.nodeAfter.attrs.colspan;
		return Math.max(a, o) == t.width;
	}
	eq(t) {
		return t instanceof e && t.$anchorCell.pos == this.$anchorCell.pos && t.$headCell.pos == this.$headCell.pos;
	}
	static rowSelection(t, n = t) {
		let r = t.node(-1), i = Z.get(r), a = t.start(-1), o = i.findCell(t.pos - a), s = i.findCell(n.pos - a), c = t.node(0);
		return o.left <= s.left ? (o.left > 0 && (t = c.resolve(a + i.map[o.top * i.width])), s.right < i.width && (n = c.resolve(a + i.map[i.width * (s.top + 1) - 1]))) : (s.left > 0 && (n = c.resolve(a + i.map[s.top * i.width])), o.right < i.width && (t = c.resolve(a + i.map[i.width * (o.top + 1) - 1]))), new e(t, n);
	}
	toJSON() {
		return {
			type: "cell",
			anchor: this.$anchorCell.pos,
			head: this.$headCell.pos
		};
	}
	static fromJSON(t, n) {
		return new e(t.resolve(n.anchor), t.resolve(n.head));
	}
	static create(t, n, r = n) {
		return new e(t.resolve(n), t.resolve(r));
	}
	getBookmark() {
		return new Tw(this.$anchorCell.pos, this.$headCell.pos);
	}
};
$.prototype.visible = !1, O.jsonID("cell", $);
var Tw = class e {
	constructor(e, t) {
		this.anchor = e, this.head = t;
	}
	map(t) {
		return new e(t.map(this.anchor), t.map(this.head));
	}
	resolve(e) {
		let t = e.resolve(this.anchor), n = e.resolve(this.head);
		return t.parent.type.spec.tableRole == "row" && n.parent.type.spec.tableRole == "row" && t.index() < t.parent.childCount && n.index() < n.parent.childCount && vw(t, n) ? new $(t, n) : O.near(n, 1);
	}
};
function Ew(e) {
	if (!(e.selection instanceof $)) return null;
	let t = [];
	return e.selection.forEachCell((e, n) => {
		t.push(I.node(n, n + e.nodeSize, { class: "selectedCell" }));
	}), L.create(e.doc, t);
}
function Dw({ $from: e, $to: t }) {
	if (e.pos == t.pos || e.pos < t.pos - 6) return !1;
	let n = e.pos, r = t.pos, i = e.depth;
	for (; i >= 0 && !(e.after(i + 1) < e.end(i)); i--, n++);
	for (let e = t.depth; e >= 0 && !(t.before(e + 1) > t.start(e)); e--, r--);
	return n == r && /row|table/.test(e.node(i).type.spec.tableRole);
}
function Ow({ $from: e, $to: t }) {
	let n, r;
	for (let t = e.depth; t > 0; t--) {
		let r = e.node(t);
		if (r.type.spec.tableRole === "cell" || r.type.spec.tableRole === "header_cell") {
			n = r;
			break;
		}
	}
	for (let e = t.depth; e > 0; e--) {
		let n = t.node(e);
		if (n.type.spec.tableRole === "cell" || n.type.spec.tableRole === "header_cell") {
			r = n;
			break;
		}
	}
	return n !== r && t.parentOffset === 0;
}
function kw(e, t, n) {
	let r = (t || e).selection, i = (t || e).doc, a, o;
	if (r instanceof A && (o = r.node.type.spec.tableRole)) {
		if (o == "cell" || o == "header_cell") a = $.create(i, r.from);
		else if (o == "row") {
			let e = i.resolve(r.from + 1);
			a = $.rowSelection(e, e);
		} else if (!n) {
			let e = Z.get(r.node), t = r.from + 1, n = t + e.map[e.width * e.height - 1];
			a = $.create(i, t + 1, n);
		}
	} else r instanceof k && Dw(r) ? a = k.create(i, r.from) : r instanceof k && Ow(r) && (a = k.create(i, r.$from.start(), r.$from.end()));
	return a && (t ||= e.tr).setSelection(a), t;
}
var Aw = new M("fix-tables");
function jw(e, t, n, r) {
	let i = e.childCount, a = t.childCount;
	outer: for (let o = 0, s = 0; o < a; o++) {
		let a = t.child(o);
		for (let t = s, r = Math.min(i, o + 3); t < r; t++) if (e.child(t) == a) {
			s = t + 1, n += a.nodeSize;
			continue outer;
		}
		r(a, n), s < i && e.child(s).sameMarkup(a) ? jw(e.child(s), a, n + 1, r) : a.nodesBetween(0, a.content.size, r, n + 1), n += a.nodeSize;
	}
}
function Mw(e, t) {
	let n, r = (t, r) => {
		t.type.spec.tableRole == "table" && (n = Nw(e, t, r, n));
	};
	return t ? t.doc != e.doc && jw(t.doc, e.doc, 0, r) : e.doc.descendants(r), n;
}
function Nw(e, t, n, r) {
	let i = Z.get(t);
	if (!i.problems) return r;
	r ||= e.tr;
	let a = [];
	for (let e = 0; e < i.height; e++) a.push(0);
	for (let e = 0; e < i.problems.length; e++) {
		let o = i.problems[e];
		if (o.type == "collision") {
			let e = t.nodeAt(o.pos);
			if (!e) continue;
			let i = e.attrs;
			for (let e = 0; e < i.rowspan; e++) a[o.row + e] += o.n;
			r.setNodeMarkup(r.mapping.map(n + 1 + o.pos), null, Sw(i, i.colspan - o.n, o.n));
		} else if (o.type == "missing") a[o.row] += o.n;
		else if (o.type == "overlong_rowspan") {
			let e = t.nodeAt(o.pos);
			if (!e) continue;
			r.setNodeMarkup(r.mapping.map(n + 1 + o.pos), null, {
				...e.attrs,
				rowspan: e.attrs.rowspan - o.n
			});
		} else if (o.type == "colwidth mismatch") {
			let e = t.nodeAt(o.pos);
			if (!e) continue;
			r.setNodeMarkup(r.mapping.map(n + 1 + o.pos), null, {
				...e.attrs,
				colwidth: o.colwidth
			});
		} else if (o.type == "zero_sized") {
			let e = r.mapping.map(n);
			r.delete(e, e + t.nodeSize);
		}
	}
	let o, s;
	for (let e = 0; e < a.length; e++) a[e] && (o ??= e, s = e);
	for (let c = 0, l = n + 1; c < i.height; c++) {
		let n = t.child(c), i = l + n.nodeSize, u = a[c];
		if (u > 0) {
			let t = "cell";
			n.firstChild && (t = n.firstChild.type.spec.tableRole);
			let a = [];
			for (let n = 0; n < u; n++) {
				let n = Q(e.schema)[t].createAndFill();
				n && a.push(n);
			}
			let d = (c == 0 || o == c - 1) && s == c ? l + 1 : i - 1;
			r.insert(r.mapping.map(d), a);
		}
		l = i;
	}
	return r.setMeta(Aw, { fixTables: !0 });
}
function Pw(e) {
	let t = Z.get(e), n = [], r = t.height, i = t.width;
	for (let a = 0; a < r; a++) {
		let r = [];
		for (let n = 0; n < i; n++) {
			let o = a * i + n, s = t.map[o];
			if (a > 0) {
				let e = o - i;
				if (s === t.map[e]) {
					r.push(null);
					continue;
				}
			}
			if (n > 0) {
				let e = o - 1;
				if (s === t.map[e]) {
					r.push(null);
					continue;
				}
			}
			r.push(e.nodeAt(s));
		}
		n.push(r);
	}
	return n;
}
function Fw(e, t) {
	let n = [], r = Z.get(e), i = r.height, a = r.width;
	for (let o = 0; o < i; o++) {
		let i = e.child(o), s = [];
		for (let n = 0; n < a; n++) {
			let i = t[o][n];
			if (!i) continue;
			let a = r.map[o * r.width + n], c = e.nodeAt(a);
			if (!c) continue;
			let l = c.type.createChecked(i.attrs, i.content, i.marks);
			s.push(l);
		}
		let c = i.type.createChecked(i.attrs, s, i.marks);
		n.push(c);
	}
	return e.type.createChecked(e.attrs, n, e.marks);
}
function Iw(e, t, n, r) {
	let i = t[0] > n[0] ? -1 : 1, a = e.splice(t[0], t.length), o = +(a.length % 2 == 0), s;
	return s = r === -1 && i === 1 ? n[0] - 1 : r === 1 && i === -1 ? n[n.length - 1] - o + 1 : i === -1 ? n[0] : n[n.length - 1] - o, e.splice(s, 0, ...a), e;
}
function Lw(e) {
	return e instanceof $;
}
function Rw(e) {
	return Vw((e) => e.type.spec.tableRole === "table", e);
}
function zw(e, t, n) {
	if (t == null && n == null && Lw(e)) return [e.$anchorCell, e.$headCell];
	let r = t ?? n ?? e.anchor, i = n ?? t ?? e.head, a = e.$head.doc, o = Bw(a, r), s = Bw(a, i);
	return o && s && vw(o, s) ? [o, s] : null;
}
function Bw(e, t) {
	let n = e.resolve(t);
	return dw(n) || hw(n);
}
function Vw(e, t) {
	for (let n = t.depth; n >= 0; --n) {
		let r = t.node(n);
		if (e(r)) return {
			node: r,
			pos: n === 0 ? 0 : t.before(n),
			start: t.start(n),
			depth: n
		};
	}
	return null;
}
function Hw(e, t) {
	let n = Rw(t.$from);
	if (!n) return;
	let r = Z.get(n.node);
	if (!(e < 0 || e > r.width - 1)) return r.cellsInRect({
		left: e,
		right: e + 1,
		top: 0,
		bottom: r.height
	}).map((e) => {
		let t = n.node.nodeAt(e), r = e + n.start;
		return {
			pos: r,
			start: r + 1,
			node: t,
			depth: n.depth + 2
		};
	});
}
function Uw(e, t) {
	let n = Rw(t.$from);
	if (!n) return;
	let r = Z.get(n.node);
	if (!(e < 0 || e > r.height - 1)) return r.cellsInRect({
		left: 0,
		right: r.width,
		top: e,
		bottom: e + 1
	}).map((e) => {
		let t = n.node.nodeAt(e), r = e + n.start;
		return {
			pos: r,
			start: r + 1,
			node: t,
			depth: n.depth + 2
		};
	});
}
function Ww(e, t, n = t) {
	let r = t, i = n;
	for (let n = t; n >= 0; n--) {
		let t = Hw(n, e.selection);
		t && t.forEach((e) => {
			let t = e.node.attrs.colspan + n - 1;
			t >= r && (r = n), t > i && (i = t);
		});
	}
	for (let n = t; n <= i; n++) {
		let t = Hw(n, e.selection);
		t && t.forEach((e) => {
			let t = e.node.attrs.colspan + n - 1;
			e.node.attrs.colspan > 1 && t > i && (i = t);
		});
	}
	let a = [];
	for (let t = r; t <= i; t++) {
		let n = Hw(t, e.selection);
		n && n.length > 0 && a.push(t);
	}
	r = a[0], i = a[a.length - 1];
	let o = Hw(r, e.selection), s = Uw(0, e.selection);
	if (!o || !s) return;
	let c = e.doc.resolve(o[o.length - 1].pos), l;
	for (let t = i; t >= r; t--) {
		let n = Hw(t, e.selection);
		if (n && n.length > 0) {
			for (let e = s.length - 1; e >= 0; e--) if (s[e].pos === n[0].pos) {
				l = n[0];
				break;
			}
			if (l) break;
		}
	}
	if (l) return {
		$anchor: c,
		$head: e.doc.resolve(l.pos),
		indexes: a
	};
}
function Gw(e, t, n = t) {
	let r = t, i = n;
	for (let n = t; n >= 0; n--) {
		let t = Uw(n, e.selection);
		t && t.forEach((e) => {
			let t = e.node.attrs.rowspan + n - 1;
			t >= r && (r = n), t > i && (i = t);
		});
	}
	for (let n = t; n <= i; n++) {
		let t = Uw(n, e.selection);
		t && t.forEach((e) => {
			let t = e.node.attrs.rowspan + n - 1;
			e.node.attrs.rowspan > 1 && t > i && (i = t);
		});
	}
	let a = [];
	for (let t = r; t <= i; t++) {
		let n = Uw(t, e.selection);
		n && n.length > 0 && a.push(t);
	}
	r = a[0], i = a[a.length - 1];
	let o = Uw(r, e.selection), s = Hw(0, e.selection);
	if (!o || !s) return;
	let c = e.doc.resolve(o[o.length - 1].pos), l;
	for (let t = i; t >= r; t--) {
		let n = Uw(t, e.selection);
		if (n && n.length > 0) {
			for (let e = s.length - 1; e >= 0; e--) if (s[e].pos === n[0].pos) {
				l = n[0];
				break;
			}
			if (l) break;
		}
	}
	if (l) return {
		$anchor: c,
		$head: e.doc.resolve(l.pos),
		indexes: a
	};
}
function Kw(e) {
	return e[0].map((t, n) => e.map((e) => e[n]));
}
function qw(e) {
	let { tr: t, originIndex: n, targetIndex: r, select: i, pos: a } = e, o = Rw(t.doc.resolve(a));
	if (!o) return !1;
	let s = Ww(t, n)?.indexes, c = Ww(t, r)?.indexes;
	if (!s || !c || s.includes(r)) return !1;
	let l = Jw(o.node, s, c, 0);
	if (t.replaceWith(o.pos, o.pos + o.node.nodeSize, l), !i) return !0;
	let u = Z.get(l), d = o.start, f = r, p = u.positionAt(u.height - 1, f, l), m = t.doc.resolve(d + p), h = u.positionAt(0, f, l), g = t.doc.resolve(d + h);
	return t.setSelection($.colSelection(m, g)), !0;
}
function Jw(e, t, n, r) {
	let i = Kw(Pw(e));
	return i = Iw(i, t, n, r), i = Kw(i), Fw(e, i);
}
function Yw(e) {
	let { tr: t, originIndex: n, targetIndex: r, select: i, pos: a } = e, o = Rw(t.doc.resolve(a));
	if (!o) return !1;
	let s = Gw(t, n)?.indexes, c = Gw(t, r)?.indexes;
	if (!s || !c || s.includes(r)) return !1;
	let l = Xw(o.node, s, c, 0);
	if (t.replaceWith(o.pos, o.pos + o.node.nodeSize, l), !i) return !0;
	let u = Z.get(l), d = o.start, f = r, p = u.positionAt(f, u.width - 1, l), m = t.doc.resolve(d + p), h = u.positionAt(f, 0, l), g = t.doc.resolve(d + h);
	return t.setSelection($.rowSelection(m, g)), !0;
}
function Xw(e, t, n, r) {
	let i = Pw(e);
	return i = Iw(i, t, n, r), Fw(e, i);
}
function Zw(e) {
	let t = e.selection, n = mw(e), r = n.node(-1), i = n.start(-1), a = Z.get(r);
	return {
		...t instanceof $ ? a.rectBetween(t.$anchorCell.pos - i, t.$headCell.pos - i) : a.findCell(n.pos - i),
		tableStart: i,
		map: a,
		table: r
	};
}
function Qw(e, { map: t, tableStart: n, table: r }, i) {
	let a = i > 0 ? -1 : 0;
	ww(t, r, i + a) && (a = i == 0 || i == t.width ? null : 0);
	for (let o = 0; o < t.height; o++) {
		let s = o * t.width + i;
		if (i > 0 && i < t.width && t.map[s - 1] == t.map[s]) {
			let a = t.map[s], c = r.nodeAt(a);
			e.setNodeMarkup(e.mapping.map(n + a), null, Cw(c.attrs, i - t.colCount(a))), o += c.attrs.rowspan - 1;
		} else {
			let c = a == null ? Q(r.type.schema).cell : r.nodeAt(t.map[s + a]).type, l = t.positionAt(o, i, r);
			e.insert(e.mapping.map(n + l), c.createAndFill());
		}
	}
	return e;
}
function $w(e, t) {
	if (!pw(e)) return !1;
	if (t) {
		let n = Zw(e);
		t(Qw(e.tr, n, n.left));
	}
	return !0;
}
function eT(e, t) {
	if (!pw(e)) return !1;
	if (t) {
		let n = Zw(e);
		t(Qw(e.tr, n, n.right));
	}
	return !0;
}
function tT(e, { map: t, table: n, tableStart: r }, i) {
	let a = e.mapping.maps.length;
	for (let o = 0; o < t.height;) {
		let s = o * t.width + i, c = t.map[s], l = n.nodeAt(c), u = l.attrs;
		if (i > 0 && t.map[s - 1] == c || i < t.width - 1 && t.map[s + 1] == c) e.setNodeMarkup(e.mapping.slice(a).map(r + c), null, Sw(u, i - t.colCount(c)));
		else {
			let t = e.mapping.slice(a).map(r + c);
			e.delete(t, t + l.nodeSize);
		}
		o += u.rowspan;
	}
}
function nT(e, t) {
	if (!pw(e)) return !1;
	if (t) {
		let n = Zw(e), r = e.tr;
		if (n.left == 0 && n.right == n.map.width) return !1;
		for (let e = n.right - 1; tT(r, n, e), e != n.left; e--) {
			let e = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
			if (!e) throw RangeError("No table found");
			n.table = e, n.map = Z.get(e);
		}
		t(r);
	}
	return !0;
}
function rT(e, t, n) {
	let r = Q(t.type.schema).header_cell;
	for (let i = 0; i < e.width; i++) if (t.nodeAt(e.map[i + n * e.width])?.type != r) return !1;
	return !0;
}
function iT(e, { map: t, tableStart: n, table: r }, i) {
	let a = n;
	for (let e = 0; e < i; e++) a += r.child(e).nodeSize;
	let o = [], s = i > 0 ? -1 : 0;
	rT(t, r, i + s) && (s = i == 0 || i == t.height ? null : 0);
	for (let a = 0, c = t.width * i; a < t.width; a++, c++) if (i > 0 && i < t.height && t.map[c] == t.map[c - t.width]) {
		let i = t.map[c], o = r.nodeAt(i).attrs;
		e.setNodeMarkup(n + i, null, {
			...o,
			rowspan: o.rowspan + 1
		}), a += o.colspan - 1;
	} else {
		let e = (s == null ? Q(r.type.schema).cell : r.nodeAt(t.map[c + s * t.width])?.type)?.createAndFill();
		e && o.push(e);
	}
	return e.insert(a, Q(r.type.schema).row.create(null, o)), e;
}
function aT(e, t) {
	if (!pw(e)) return !1;
	if (t) {
		let n = Zw(e);
		t(iT(e.tr, n, n.top));
	}
	return !0;
}
function oT(e, t) {
	if (!pw(e)) return !1;
	if (t) {
		let n = Zw(e);
		t(iT(e.tr, n, n.bottom));
	}
	return !0;
}
function sT(e, { map: t, table: n, tableStart: r }, i) {
	let a = 0;
	for (let e = 0; e < i; e++) a += n.child(e).nodeSize;
	let o = a + n.child(i).nodeSize, s = e.mapping.maps.length;
	e.delete(a + r, o + r);
	let c = /* @__PURE__ */ new Set();
	for (let a = 0, o = i * t.width; a < t.width; a++, o++) {
		let l = t.map[o];
		if (!c.has(l)) {
			if (c.add(l), i > 0 && l == t.map[o - t.width]) {
				let t = n.nodeAt(l).attrs;
				e.setNodeMarkup(e.mapping.slice(s).map(l + r), null, {
					...t,
					rowspan: t.rowspan - 1
				}), a += t.colspan - 1;
			} else if (i < t.height && l == t.map[o + t.width]) {
				let o = n.nodeAt(l), c = o.attrs, u = o.type.create({
					...c,
					rowspan: o.attrs.rowspan - 1
				}, o.content), d = t.positionAt(i + 1, a, n);
				e.insert(e.mapping.slice(s).map(r + d), u), a += c.colspan - 1;
			}
		}
	}
}
function cT(e, t) {
	if (!pw(e)) return !1;
	if (t) {
		let n = Zw(e), r = e.tr;
		if (n.top == 0 && n.bottom == n.map.height) return !1;
		for (let e = n.bottom - 1; sT(r, n, e), e != n.top; e--) {
			let e = n.tableStart ? r.doc.nodeAt(n.tableStart - 1) : r.doc;
			if (!e) throw RangeError("No table found");
			n.table = e, n.map = Z.get(n.table);
		}
		t(r);
	}
	return !0;
}
function lT(e) {
	let t = e.content;
	return t.childCount == 1 && t.child(0).isTextblock && t.child(0).childCount == 0;
}
function uT({ width: e, height: t, map: n }, r) {
	let i = r.top * e + r.left, a = i, o = (r.bottom - 1) * e + r.left, s = i + (r.right - r.left - 1);
	for (let t = r.top; t < r.bottom; t++) {
		if (r.left > 0 && n[a] == n[a - 1] || r.right < e && n[s] == n[s + 1]) return !0;
		a += e, s += e;
	}
	for (let a = r.left; a < r.right; a++) {
		if (r.top > 0 && n[i] == n[i - e] || r.bottom < t && n[o] == n[o + e]) return !0;
		i++, o++;
	}
	return !1;
}
function dT(e, t) {
	let n = e.selection;
	if (!(n instanceof $) || n.$anchorCell.pos == n.$headCell.pos) return !1;
	let r = Zw(e), { map: i } = r;
	if (uT(i, r)) return !1;
	if (t) {
		let n = e.tr, a = {}, o = l.empty, s, c;
		for (let e = r.top; e < r.bottom; e++) for (let t = r.left; t < r.right; t++) {
			let l = i.map[e * i.width + t], u = r.table.nodeAt(l);
			if (!a[l] && u) {
				if (a[l] = !0, s == null) s = l, c = u;
				else {
					lT(u) || (o = o.append(u.content));
					let e = n.mapping.map(l + r.tableStart);
					n.delete(e, e + u.nodeSize);
				}
			}
		}
		if (s == null || c == null) return !0;
		if (n.setNodeMarkup(s + r.tableStart, null, {
			...Cw(c.attrs, c.attrs.colspan, r.right - r.left - c.attrs.colspan),
			rowspan: r.bottom - r.top
		}), o.size > 0) {
			let e = s + 1 + c.content.size, t = lT(c) ? s + 1 : e;
			n.replaceWith(t + r.tableStart, e + r.tableStart, o);
		}
		n.setSelection(new $(n.doc.resolve(s + r.tableStart))), t(n);
	}
	return !0;
}
function fT(e, t) {
	let n = Q(e.schema);
	return pT(({ node: e }) => n[e.type.spec.tableRole])(e, t);
}
function pT(e) {
	return (t, n) => {
		let r = t.selection, i, a;
		if (r instanceof $) {
			if (r.$anchorCell.pos != r.$headCell.pos) return !1;
			i = r.$anchorCell.nodeAfter, a = r.$anchorCell.pos;
		} else {
			if (i = fw(r.$from), !i) return !1;
			a = dw(r.$from)?.pos;
		}
		if (i == null || a == null || i.attrs.colspan == 1 && i.attrs.rowspan == 1) return !1;
		if (n) {
			let o = i.attrs, s = [], c = o.colwidth;
			o.rowspan > 1 && (o = {
				...o,
				rowspan: 1
			}), o.colspan > 1 && (o = {
				...o,
				colspan: 1
			});
			let l = Zw(t), u = t.tr;
			for (let e = 0; e < l.right - l.left; e++) s.push(c ? {
				...o,
				colwidth: c && c[e] ? [c[e]] : null
			} : o);
			let d;
			for (let t = l.top; t < l.bottom; t++) {
				let n = l.map.positionAt(t, l.left, l.table);
				t == l.top && (n += i.nodeSize);
				for (let r = l.left, a = 0; r < l.right; r++, a++) (r != l.left || t != l.top) && u.insert(d = u.mapping.map(n + l.tableStart, 1), e({
					node: i,
					row: t,
					col: r
				}).createAndFill(s[a]));
			}
			u.setNodeMarkup(a, e({
				node: i,
				row: l.top,
				col: l.left
			}), s[0]), r instanceof $ && u.setSelection(new $(u.doc.resolve(r.$anchorCell.pos), d ? u.doc.resolve(d) : void 0)), n(u);
		}
		return !0;
	};
}
function mT(e, t) {
	return function(n, r) {
		if (!pw(n)) return !1;
		let i = mw(n);
		if (i.nodeAfter.attrs[e] === t) return !1;
		if (r) {
			let a = n.tr;
			n.selection instanceof $ ? n.selection.forEachCell((n, r) => {
				n.attrs[e] !== t && a.setNodeMarkup(r, null, {
					...n.attrs,
					[e]: t
				});
			}) : a.setNodeMarkup(i.pos, null, {
				...i.nodeAfter.attrs,
				[e]: t
			}), r(a);
		}
		return !0;
	};
}
function hT(e) {
	return function(t, n) {
		if (!pw(t)) return !1;
		if (n) {
			let r = Q(t.schema), i = Zw(t), a = t.tr, o = i.map.cellsInRect(e == "column" ? {
				left: i.left,
				top: 0,
				right: i.right,
				bottom: i.map.height
			} : e == "row" ? {
				left: 0,
				top: i.top,
				right: i.map.width,
				bottom: i.bottom
			} : i), s = o.map((e) => i.table.nodeAt(e));
			for (let e = 0; e < o.length; e++) s[e].type == r.header_cell && a.setNodeMarkup(i.tableStart + o[e], r.cell, s[e].attrs);
			if (a.steps.length === 0) for (let e = 0; e < o.length; e++) a.setNodeMarkup(i.tableStart + o[e], r.header_cell, s[e].attrs);
			n(a);
		}
		return !0;
	};
}
function gT(e, t, n) {
	let r = t.map.cellsInRect({
		left: 0,
		top: 0,
		right: e == "row" ? t.map.width : 1,
		bottom: e == "column" ? t.map.height : 1
	});
	for (let e = 0; e < r.length; e++) {
		let i = t.table.nodeAt(r[e]);
		if (i && i.type !== n.header_cell) return !1;
	}
	return !0;
}
function _T(e, t) {
	return t ||= { useDeprecatedLogic: !1 }, t.useDeprecatedLogic ? hT(e) : function(t, n) {
		if (!pw(t)) return !1;
		if (n) {
			let r = Q(t.schema), i = Zw(t), a = t.tr, o = gT("row", i, r), s = gT("column", i, r), c = (e === "column" ? o : e === "row" && s) ? 1 : 0, l = e == "column" ? {
				left: 0,
				top: c,
				right: 1,
				bottom: i.map.height
			} : e == "row" ? {
				left: c,
				top: 0,
				right: i.map.width,
				bottom: 1
			} : i, u = e == "column" ? s ? r.cell : r.header_cell : e == "row" ? o ? r.cell : r.header_cell : r.cell;
			i.map.cellsInRect(l).forEach((e) => {
				let t = e + i.tableStart, n = a.doc.nodeAt(t);
				n && a.setNodeMarkup(t, u, n.attrs);
			}), n(a);
		}
		return !0;
	};
}
var vT = _T("row", { useDeprecatedLogic: !0 }), yT = _T("column", { useDeprecatedLogic: !0 }), bT = _T("cell", { useDeprecatedLogic: !0 });
function xT(e, t) {
	if (t < 0) {
		let t = e.nodeBefore;
		if (t) return e.pos - t.nodeSize;
		for (let t = e.index(-1) - 1, n = e.before(); t >= 0; t--) {
			let r = e.node(-1).child(t), i = r.lastChild;
			if (i) return n - 1 - i.nodeSize;
			n -= r.nodeSize;
		}
	} else {
		if (e.index() < e.parent.childCount - 1) return e.pos + e.nodeAfter.nodeSize;
		let t = e.node(-1);
		for (let n = e.indexAfter(-1), r = e.after(); n < t.childCount; n++) {
			let e = t.child(n);
			if (e.childCount) return r + 1;
			r += e.nodeSize;
		}
	}
	return null;
}
function ST(e) {
	return function(t, n) {
		if (!pw(t)) return !1;
		let r = xT(mw(t), e);
		if (r == null) return !1;
		if (n) {
			let e = t.doc.resolve(r);
			n(t.tr.setSelection(k.between(e, _w(e))).scrollIntoView());
		}
		return !0;
	};
}
function CT(e, t) {
	let n = e.selection.$anchor;
	for (let r = n.depth; r > 0; r--) if (n.node(r).type.spec.tableRole == "table") return t && t(e.tr.delete(n.before(r), n.after(r)).scrollIntoView()), !0;
	return !1;
}
function wT(e, t) {
	let n = e.selection;
	if (!(n instanceof $)) return !1;
	if (t) {
		let r = e.tr, i = Q(e.schema).cell.createAndFill().content;
		n.forEachCell((e, t) => {
			e.content.eq(i) || r.replace(r.mapping.map(t + 1), r.mapping.map(t + e.nodeSize - 1), new h(i, 0, 0));
		}), r.docChanged && t(r);
	}
	return !0;
}
function TT(e) {
	return (t, n) => {
		let { from: r, to: i, select: a = !0, pos: o = t.selection.from } = e, s = t.tr;
		return Yw({
			tr: s,
			originIndex: r,
			targetIndex: i,
			select: a,
			pos: o
		}) ? (n?.(s), !0) : !1;
	};
}
function ET(e) {
	return (t, n) => {
		let { from: r, to: i, select: a = !0, pos: o = t.selection.from } = e, s = t.tr;
		return qw({
			tr: s,
			originIndex: r,
			targetIndex: i,
			select: a,
			pos: o
		}) ? (n?.(s), !0) : !1;
	};
}
function DT(e) {
	if (e.size === 0) return null;
	let { content: t, openStart: n, openEnd: r } = e;
	for (; t.childCount == 1 && (n > 0 && r > 0 || t.child(0).type.spec.tableRole == "table");) n--, r--, t = t.child(0).content;
	let i = t.child(0), a = i.type.spec.tableRole, o = i.type.schema, s = [];
	if (a == "row") for (let e = 0; e < t.childCount; e++) {
		let i = t.child(e).content, a = e ? 0 : Math.max(0, n - 1), c = e < t.childCount - 1 ? 0 : Math.max(0, r - 1);
		(a || c) && (i = kT(Q(o).row, new h(i, a, c)).content), s.push(i);
	}
	else if (a == "cell" || a == "header_cell") s.push(n || r ? kT(Q(o).row, new h(t, n, r)).content : t);
	else return null;
	return OT(o, s);
}
function OT(e, t) {
	let n = [];
	for (let e = 0; e < t.length; e++) {
		let r = t[e];
		for (let t = r.childCount - 1; t >= 0; t--) {
			let { rowspan: i, colspan: a } = r.child(t).attrs;
			for (let t = e; t < e + i; t++) n[t] = (n[t] || 0) + a;
		}
	}
	let r = 0;
	for (let e = 0; e < n.length; e++) r = Math.max(r, n[e]);
	for (let i = 0; i < n.length; i++) if (i >= t.length && t.push(l.empty), n[i] < r) {
		let a = Q(e).cell.createAndFill(), o = [];
		for (let e = n[i]; e < r; e++) o.push(a);
		t[i] = t[i].append(l.from(o));
	}
	return {
		height: t.length,
		width: r,
		rows: t
	};
}
function kT(e, t) {
	let n = e.createAndFill();
	return new gn(n).replace(0, n.content.size, t).doc;
}
function AT({ width: e, height: t, rows: n }, r, i) {
	if (e != r) {
		let t = [], i = [];
		for (let e = 0; e < n.length; e++) {
			let a = n[e], o = [];
			for (let n = t[e] || 0, i = 0; n < r; i++) {
				let s = a.child(i % a.childCount);
				n + s.attrs.colspan > r && (s = s.type.createChecked(Sw(s.attrs, s.attrs.colspan, n + s.attrs.colspan - r), s.content)), o.push(s), n += s.attrs.colspan;
				for (let n = 1; n < s.attrs.rowspan; n++) t[e + n] = (t[e + n] || 0) + s.attrs.colspan;
			}
			i.push(l.from(o));
		}
		n = i, e = r;
	}
	if (t != i) {
		let e = [];
		for (let r = 0, a = 0; r < i; r++, a++) {
			let o = [], s = n[a % t];
			for (let e = 0; e < s.childCount; e++) {
				let t = s.child(e);
				r + t.attrs.rowspan > i && (t = t.type.create({
					...t.attrs,
					rowspan: Math.max(1, i - t.attrs.rowspan)
				}, t.content)), o.push(t);
			}
			e.push(l.from(o));
		}
		n = e, t = i;
	}
	return {
		width: e,
		height: t,
		rows: n
	};
}
function jT(e, t, n, r, i, a, o) {
	let s = e.doc.type.schema, c = Q(s), u, d;
	if (i > t.width) for (let a = 0, s = 0; a < t.height; a++) {
		let l = n.child(a);
		s += l.nodeSize;
		let f = [], p;
		p = l.lastChild == null || l.lastChild.type == c.cell ? u ||= c.cell.createAndFill() : d ||= c.header_cell.createAndFill();
		for (let e = t.width; e < i; e++) f.push(p);
		e.insert(e.mapping.slice(o).map(s - 1 + r), f);
	}
	if (a > t.height) {
		let s = [];
		for (let e = 0, r = (t.height - 1) * t.width; e < Math.max(t.width, i); e++) {
			let i = e >= t.width ? !1 : n.nodeAt(t.map[r + e]).type == c.header_cell;
			s.push(i ? d ||= c.header_cell.createAndFill() : u ||= c.cell.createAndFill());
		}
		let f = c.row.create(null, l.from(s)), p = [];
		for (let e = t.height; e < a; e++) p.push(f);
		e.insert(e.mapping.slice(o).map(r + n.nodeSize - 2), p);
	}
	return !!(u || d);
}
function MT(e, t, n, r, i, a, o, s) {
	if (o == 0 || o == t.height) return !1;
	let c = !1;
	for (let l = i; l < a; l++) {
		let i = o * t.width + l, a = t.map[i];
		if (t.map[i - t.width] == a) {
			c = !0;
			let i = n.nodeAt(a), { top: u, left: d } = t.findCell(a);
			e.setNodeMarkup(e.mapping.slice(s).map(a + r), null, {
				...i.attrs,
				rowspan: o - u
			}), e.insert(e.mapping.slice(s).map(t.positionAt(o, d, n)), i.type.createAndFill({
				...i.attrs,
				rowspan: u + i.attrs.rowspan - o
			})), l += i.attrs.colspan - 1;
		}
	}
	return c;
}
function NT(e, t, n, r, i, a, o, s) {
	if (o == 0 || o == t.width) return !1;
	let c = !1;
	for (let l = i; l < a; l++) {
		let i = l * t.width + o, a = t.map[i];
		if (t.map[i - 1] == a) {
			c = !0;
			let i = n.nodeAt(a), u = t.colCount(a), d = e.mapping.slice(s).map(a + r);
			e.setNodeMarkup(d, null, Sw(i.attrs, o - u, i.attrs.colspan - (o - u))), e.insert(d + i.nodeSize, i.type.createAndFill(Sw(i.attrs, 0, o - u))), l += i.attrs.rowspan - 1;
		}
	}
	return c;
}
function PT(e, t, n, r, i) {
	let a = n ? e.doc.nodeAt(n - 1) : e.doc;
	if (!a) throw Error("No table found");
	let o = Z.get(a), { top: s, left: c } = r, l = c + i.width, u = s + i.height, d = e.tr, f = 0;
	function p() {
		if (a = n ? d.doc.nodeAt(n - 1) : d.doc, !a) throw Error("No table found");
		o = Z.get(a), f = d.mapping.maps.length;
	}
	jT(d, o, a, n, l, u, f) && p(), MT(d, o, a, n, c, l, s, f) && p(), MT(d, o, a, n, c, l, u, f) && p(), NT(d, o, a, n, s, u, c, f) && p(), NT(d, o, a, n, s, u, l, f) && p();
	for (let e = s; e < u; e++) {
		let t = o.positionAt(e, c, a), r = o.positionAt(e, l, a);
		d.replace(d.mapping.slice(f).map(t + n), d.mapping.slice(f).map(r + n), new h(i.rows[e - s], 0, 0));
	}
	p(), d.setSelection(new $(d.doc.resolve(n + o.positionAt(s, c, a)), d.doc.resolve(n + o.positionAt(u - 1, l - 1, a)))), t(d);
}
var FT = jc({
	ArrowLeft: LT("horiz", -1),
	ArrowRight: LT("horiz", 1),
	ArrowUp: LT("vert", -1),
	ArrowDown: LT("vert", 1),
	"Shift-ArrowLeft": RT("horiz", -1),
	"Shift-ArrowRight": RT("horiz", 1),
	"Shift-ArrowUp": RT("vert", -1),
	"Shift-ArrowDown": RT("vert", 1),
	Backspace: wT,
	"Mod-Backspace": wT,
	Delete: wT,
	"Mod-Delete": wT
});
function IT(e, t, n) {
	return !n.eq(e.selection) && (t && t(e.tr.setSelection(n).scrollIntoView()), !0);
}
function LT(e, t) {
	return (n, r, i) => {
		if (!i) return !1;
		let a = n.selection;
		if (a instanceof $) return IT(n, r, O.near(a.$headCell, t));
		if (e != "horiz" && !a.empty) return !1;
		let o = HT(i, e, t);
		if (o == null) return !1;
		if (e == "horiz") return IT(n, r, O.near(n.doc.resolve(a.head + t), t));
		{
			let i = n.doc.resolve(o), a = xw(i, e, t), s;
			return s = a ? O.near(a, 1) : t < 0 ? O.near(n.doc.resolve(i.before(-1)), -1) : O.near(n.doc.resolve(i.after(-1)), 1), IT(n, r, s);
		}
	};
}
function RT(e, t) {
	return (n, r, i) => {
		if (!i) return !1;
		let a = n.selection, o;
		if (a instanceof $) o = a;
		else {
			let r = HT(i, e, t);
			if (r == null) return !1;
			o = new $(n.doc.resolve(r));
		}
		let s = xw(o.$headCell, e, t);
		return s ? IT(n, r, new $(o.$anchorCell, s)) : !1;
	};
}
function zT(e, t) {
	let n = e.state.doc, r = dw(n.resolve(t));
	return r ? (e.dispatch(e.state.tr.setSelection(new $(r))), !0) : !1;
}
function BT(e, t, n) {
	if (!pw(e.state)) return !1;
	let r = DT(n), i = e.state.selection;
	if (i instanceof $) {
		r ||= {
			width: 1,
			height: 1,
			rows: [l.from(kT(Q(e.state.schema).cell, n))]
		};
		let t = i.$anchorCell.node(-1), a = i.$anchorCell.start(-1), o = Z.get(t).rectBetween(i.$anchorCell.pos - a, i.$headCell.pos - a);
		return r = AT(r, o.right - o.left, o.bottom - o.top), PT(e.state, e.dispatch, a, o, r), !0;
	}
	if (r) {
		let t = mw(e.state), n = t.start(-1);
		return PT(e.state, e.dispatch, n, Z.get(t.node(-1)).findCell(t.pos - n), r), !0;
	}
	return !1;
}
function VT(e, t) {
	if (t.button != 0 || t.ctrlKey || t.metaKey) return;
	let n = UT(e, t.target), r;
	if (t.shiftKey && e.state.selection instanceof $) i(e.state.selection.$anchorCell, t), t.preventDefault();
	else if (t.shiftKey && n && (r = dw(e.state.selection.$anchor)) != null && WT(e, t)?.pos != r.pos) i(r, t), t.preventDefault();
	else if (!n) return;
	function i(t, n) {
		let r = WT(e, n), i = uw.getState(e.state) == null;
		if (!r || !vw(t, r)) {
			if (i) r = t;
			else return;
		}
		let a = new $(t, r);
		if (i || !e.state.selection.eq(a)) {
			let n = e.state.tr.setSelection(a);
			i && n.setMeta(uw, t.pos), e.dispatch(n);
		}
	}
	function a() {
		e.root.removeEventListener("mouseup", a), e.root.removeEventListener("dragstart", a), e.root.removeEventListener("mousemove", o), uw.getState(e.state) != null && e.dispatch(e.state.tr.setMeta(uw, -1));
	}
	function o(r) {
		let o = r, s = uw.getState(e.state), c;
		if (s != null) c = e.state.doc.resolve(s);
		else if (UT(e, o.target) != n && (c = WT(e, t), !c)) return a();
		c && i(c, o);
	}
	e.root.addEventListener("mouseup", a), e.root.addEventListener("dragstart", a), e.root.addEventListener("mousemove", o);
}
function HT(e, t, n) {
	if (!(e.state.selection instanceof k)) return null;
	let { $head: r } = e.state.selection;
	for (let i = r.depth - 1; i >= 0; i--) {
		let a = r.node(i);
		if ((n < 0 ? r.index(i) : r.indexAfter(i)) != (n < 0 ? 0 : a.childCount)) return null;
		if (a.type.spec.tableRole == "cell" || a.type.spec.tableRole == "header_cell") {
			let a = r.before(i), o = t == "vert" ? n > 0 ? "down" : "up" : n > 0 ? "right" : "left";
			return e.endOfTextblock(o) ? a : null;
		}
	}
	return null;
}
function UT(e, t) {
	for (; t && t != e.dom; t = t.parentNode) if (t.nodeName == "TD" || t.nodeName == "TH") return t;
	return null;
}
function WT(e, t) {
	let n = e.posAtCoords({
		left: t.clientX,
		top: t.clientY
	});
	if (!n) return null;
	let { inside: r, pos: i } = n;
	return r >= 0 && dw(e.state.doc.resolve(r)) || dw(e.state.doc.resolve(i));
}
var GT = class {
	constructor(e, t) {
		this.node = e, this.defaultCellMinWidth = t, this.dom = document.createElement("div"), this.dom.className = "tableWrapper", this.table = this.dom.appendChild(document.createElement("table")), this.table.style.setProperty("--default-cell-min-width", `${t}px`), this.colgroup = this.table.appendChild(document.createElement("colgroup")), KT(e, this.colgroup, this.table, t), this.contentDOM = this.table.appendChild(document.createElement("tbody"));
	}
	update(e) {
		return e.type == this.node.type && (this.node = e, KT(e, this.colgroup, this.table, this.defaultCellMinWidth), !0);
	}
	ignoreMutation(e) {
		return e.type == "attributes" && (e.target == this.table || this.colgroup.contains(e.target));
	}
};
function KT(e, t, n, r, i, a) {
	let o = 0, s = !0, c = t.firstChild, l = e.firstChild;
	if (l) {
		for (let e = 0, n = 0; e < l.childCount; e++) {
			let { colspan: u, colwidth: d } = l.child(e).attrs;
			for (let e = 0; e < u; e++, n++) {
				let l = i == n ? a : d && d[e], u = l ? l + "px" : "";
				if (o += l || r, l || (s = !1), c) c.style.width != u && (c.style.width = u), c = c.nextSibling;
				else {
					let e = document.createElement("col");
					e.style.width = u, t.appendChild(e);
				}
			}
		}
		for (; c;) {
			var u;
			let e = c.nextSibling;
			(u = c.parentNode) == null || u.removeChild(c), c = e;
		}
		s ? (n.style.width = o + "px", n.style.minWidth = "") : (n.style.width = "", n.style.minWidth = o + "px");
	}
}
var qT = new M("tableColumnResizing");
function JT({ handleWidth: e = 5, cellMinWidth: t = 25, defaultCellMinWidth: n = 100, View: r = GT, lastColumnResizable: i = !0 } = {}) {
	let a = new j({
		key: qT,
		state: {
			init(e, t) {
				var i;
				let o = (i = a.spec) == null || (i = i.props) == null ? void 0 : i.nodeViews, s = Q(t.schema).table.name;
				return r && o && (o[s] = (e, t) => new r(e, n, t)), new YT(-1, !1);
			},
			apply(e, t) {
				return t.apply(e);
			}
		},
		props: {
			attributes: (e) => {
				let t = qT.getState(e);
				return t && t.activeHandle > -1 ? { class: "resize-cursor" } : {};
			},
			handleDOMEvents: {
				mousemove: (t, n) => {
					XT(t, n, e, i);
				},
				mouseleave: (e) => {
					ZT(e);
				},
				mousedown: (e, r) => {
					QT(e, r, t, n);
				}
			},
			decorations: (e) => {
				let t = qT.getState(e);
				if (t && t.activeHandle > -1) return sE(e, t.activeHandle);
			},
			nodeViews: {}
		}
	});
	return a;
}
var YT = class e {
	constructor(e, t) {
		this.activeHandle = e, this.dragging = t;
	}
	apply(t) {
		let n = this, r = t.getMeta(qT);
		if (r && r.setHandle != null) return new e(r.setHandle, !1);
		if (r && r.setDragging !== void 0) return new e(n.activeHandle, r.setDragging);
		if (n.activeHandle > -1 && t.docChanged) {
			let r = t.mapping.map(n.activeHandle, -1);
			return gw(t.doc.resolve(r)) || (r = -1), new e(r, n.dragging);
		}
		return n;
	}
};
function XT(e, t, n, r) {
	if (!e.editable) return;
	let i = qT.getState(e.state);
	if (i && !i.dragging) {
		let a = eE(t.target), o = -1;
		if (a) {
			let { left: r, right: i } = a.getBoundingClientRect();
			t.clientX - r <= n ? o = tE(e, t, "left", n) : i - t.clientX <= n && (o = tE(e, t, "right", n));
		}
		if (o != i.activeHandle) {
			if (!r && o !== -1) {
				let t = e.state.doc.resolve(o), n = t.node(-1), r = Z.get(n), i = t.start(-1);
				if (r.colCount(t.pos - i) + t.nodeAfter.attrs.colspan - 1 == r.width - 1) return;
			}
			rE(e, o);
		}
	}
}
function ZT(e) {
	if (!e.editable) return;
	let t = qT.getState(e.state);
	t && t.activeHandle > -1 && !t.dragging && rE(e, -1);
}
function QT(e, t, n, r) {
	if (!e.editable) return !1;
	let i = e.dom.ownerDocument.defaultView ?? window, a = qT.getState(e.state);
	if (!a || a.activeHandle == -1 || a.dragging) return !1;
	let o = e.state.doc.nodeAt(a.activeHandle), s = $T(e, a.activeHandle, o.attrs);
	e.dispatch(e.state.tr.setMeta(qT, { setDragging: {
		startX: t.clientX,
		startWidth: s
	} }));
	function c(t) {
		i.removeEventListener("mouseup", c), i.removeEventListener("mousemove", l);
		let r = qT.getState(e.state);
		r?.dragging && (iE(e, r.activeHandle, nE(r.dragging, t, n)), e.dispatch(e.state.tr.setMeta(qT, { setDragging: null })));
	}
	function l(t) {
		if (!t.which) return c(t);
		let i = qT.getState(e.state);
		if (i && i.dragging) {
			let a = nE(i.dragging, t, n);
			aE(e, i.activeHandle, a, r);
		}
	}
	return aE(e, a.activeHandle, s, r), i.addEventListener("mouseup", c), i.addEventListener("mousemove", l), t.preventDefault(), !0;
}
function $T(e, t, { colspan: n, colwidth: r }) {
	let i = r && r[r.length - 1];
	if (i) return i;
	let a = e.domAtPos(t), o = a.node.childNodes[a.offset].offsetWidth, s = n;
	if (r) for (let e = 0; e < n; e++) r[e] && (o -= r[e], s--);
	return o / s;
}
function eE(e) {
	for (; e && e.nodeName != "TD" && e.nodeName != "TH";) e = e.classList && e.classList.contains("ProseMirror") ? null : e.parentNode;
	return e;
}
function tE(e, t, n, r) {
	let i = n == "right" ? -r : r, a = e.posAtCoords({
		left: t.clientX + i,
		top: t.clientY
	});
	if (!a) return -1;
	let { pos: o } = a, s = dw(e.state.doc.resolve(o));
	if (!s) return -1;
	if (n == "right") return s.pos;
	let c = Z.get(s.node(-1)), l = s.start(-1), u = c.map.indexOf(s.pos - l);
	return u % c.width == 0 ? -1 : l + c.map[u - 1];
}
function nE(e, t, n) {
	let r = t.clientX - e.startX;
	return Math.max(n, e.startWidth + r);
}
function rE(e, t) {
	e.dispatch(e.state.tr.setMeta(qT, { setHandle: t }));
}
function iE(e, t, n) {
	let r = e.state.doc.resolve(t), i = r.node(-1), a = Z.get(i), o = r.start(-1), s = a.colCount(r.pos - o) + r.nodeAfter.attrs.colspan - 1, c = e.state.tr;
	for (let e = 0; e < a.height; e++) {
		let t = e * a.width + s;
		if (e && a.map[t] == a.map[t - a.width]) continue;
		let r = a.map[t], l = i.nodeAt(r).attrs, u = l.colspan == 1 ? 0 : s - a.colCount(r);
		if (l.colwidth && l.colwidth[u] == n) continue;
		let d = l.colwidth ? l.colwidth.slice() : oE(l.colspan);
		d[u] = n, c.setNodeMarkup(o + r, null, {
			...l,
			colwidth: d
		});
	}
	c.docChanged && e.dispatch(c);
}
function aE(e, t, n, r) {
	let i = e.state.doc.resolve(t), a = i.node(-1), o = i.start(-1), s = Z.get(a).colCount(i.pos - o) + i.nodeAfter.attrs.colspan - 1, c = e.domAtPos(i.start(-1)).node;
	for (; c && c.nodeName != "TABLE";) c = c.parentNode;
	c && KT(a, c.firstChild, c, r, s, n);
}
function oE(e) {
	return Array(e).fill(0);
}
function sE(e, t) {
	let n = [], r = e.doc.resolve(t), i = r.node(-1);
	if (!i) return L.empty;
	let a = Z.get(i), o = r.start(-1), s = a.colCount(r.pos - o) + r.nodeAfter.attrs.colspan - 1;
	for (let t = 0; t < a.height; t++) {
		let r = s + t * a.width;
		if ((s == a.width - 1 || a.map[r] != a.map[r + 1]) && (t == 0 || a.map[r] != a.map[r - a.width])) {
			let t = a.map[r], s = o + t + i.nodeAt(t).nodeSize - 1, c = document.createElement("div");
			c.className = "column-resize-handle", qT.getState(e)?.dragging && n.push(I.node(o + t, o + t + i.nodeAt(t).nodeSize, { class: "column-resize-dragging" })), n.push(I.widget(s, c));
		}
	}
	return L.create(e.doc, n);
}
function cE({ allowTableNodeSelection: e = !1 } = {}) {
	return new j({
		key: uw,
		state: {
			init() {
				return null;
			},
			apply(e, t) {
				let n = e.getMeta(uw);
				if (n != null) return n == -1 ? null : n;
				if (t == null || !e.docChanged) return t;
				let { deleted: r, pos: i } = e.mapping.mapResult(t);
				return r ? null : i;
			}
		},
		props: {
			decorations: Ew,
			handleDOMEvents: { mousedown: VT },
			createSelectionBetween(e) {
				return uw.getState(e.state) == null ? null : e.state.selection;
			},
			handleTripleClick: zT,
			handleKeyDown: FT,
			handlePaste: BT
		},
		appendTransaction(t, n, r) {
			return kw(r, Mw(r, n), e);
		}
	});
}
//#endregion
//#region resources/js/shared-modules.js
var lE = {
	core: Nc,
	suggestion: NS,
	pmState: jr,
	pmView: vc,
	pmModel: Mr,
	pmTransform: _n,
	pmCommands: Ar,
	pmKeymap: Mc,
	pmTables: /* @__PURE__ */ t({
		CellBookmark: () => Tw,
		CellSelection: () => $,
		ResizeState: () => YT,
		TableMap: () => Z,
		TableView: () => GT,
		__clipCells: () => AT,
		__insertCells: () => PT,
		__pastedCells: () => DT,
		addColSpan: () => Cw,
		addColumn: () => Qw,
		addColumnAfter: () => eT,
		addColumnBefore: () => $w,
		addRow: () => iT,
		addRowAfter: () => oT,
		addRowBefore: () => aT,
		cellAround: () => dw,
		cellNear: () => hw,
		colCount: () => bw,
		columnIsHeader: () => ww,
		columnResizing: () => JT,
		columnResizingPluginKey: () => qT,
		deleteCellSelection: () => wT,
		deleteColumn: () => nT,
		deleteRow: () => cT,
		deleteTable: () => CT,
		findCell: () => yw,
		findCellPos: () => Bw,
		findCellRange: () => zw,
		findTable: () => Rw,
		fixTables: () => Mw,
		fixTablesKey: () => Aw,
		goToNextCell: () => ST,
		handlePaste: () => BT,
		inSameTable: () => vw,
		isInTable: () => pw,
		mergeCells: () => dT,
		moveCellForward: () => _w,
		moveTableColumn: () => ET,
		moveTableRow: () => TT,
		nextCell: () => xw,
		pointsAtCell: () => gw,
		removeColSpan: () => Sw,
		removeColumn: () => tT,
		removeRow: () => sT,
		rowIsHeader: () => rT,
		selectedRect: () => Zw,
		selectionCell: () => mw,
		setCellAttr: () => mT,
		splitCell: () => fT,
		splitCellWithType: () => pT,
		tableEditing: () => cE,
		tableEditingKey: () => uw,
		tableNodeTypes: () => Q,
		tableNodes: () => lw,
		toggleHeader: () => _T,
		toggleHeaderCell: () => bT,
		toggleHeaderColumn: () => yT,
		toggleHeaderRow: () => vT,
		updateColumnsOnResize: () => KT
	}),
	pmInputrules: $C,
	pmHistory: Qm,
	pmDropcursor: um,
	pmGapcursor: Sm,
	pmSchemaList: Xr
}, { Selection: uE } = lE.pmState;
window.RichEditorPlus = window.RichEditorPlus || {}, window.RichEditorPlus.tiptap = lE, window.RichEditorPlus.registerExtension = Eh, window.RichEditorPlus.extendExtension = Oh, window.RichEditorPlus.registerActionArguments = Nh;
function dE({ blockTypes: e, contentErrorMessage: t, extensions: n, format: r, isDisabled: i, isLiveDebounced: a, isLiveOnBlur: o, key: s, liveDebounce: c, livewireId: l, loadErrorMessage: u, placeholder: d, state: f, tools: p }) {
	let m, h = !1, g = null, _ = null, v = null, y = null, b = null, x = Vh(e), S = (e) => {
		h || e.$wire.commit();
	}, C = null, w = (e) => r === "html" ? e.getHTML() : JSON.stringify(e.getJSON()), T = (e) => {
		if (r === "html" || typeof e != "string" || e === "") return e ?? null;
		try {
			return JSON.parse(e);
		} catch (t) {
			return console.error("[rich-editor-plus] The editor state is not valid JSON.", t), e;
		}
	}, ee = (e, t) => {
		if (r === "html") return t === e.getHTML();
		try {
			return e.schema.nodeFromJSON(T(t)).eq(e.state.doc);
		} catch {
			return !1;
		}
	};
	return {
		state: f,
		error: null,
		async init() {
			if (await jh(n, window.RichEditorPlus), h) return;
			let e = kh(n, lE);
			if (e.missing.length) {
				this.error = u.replace(":plugins", e.missing.join(", "));
				return;
			}
			let f = Yh({
				element: this.$refs.editor,
				editable: !i,
				extensions: [...e.extensions, vh.configure({ placeholder: ({ node: e }) => e.type.name === "paragraph" ? d : "" })],
				content: T(this.state),
				onUpdate: ({ editor: e }) => {
					this.state = w(e), a && (clearTimeout(g), g = setTimeout(() => S(this), c ?? 300));
				}
			}, r);
			if (!f.editor) {
				this.error = t;
				return;
			}
			m = f.editor, o && m.on("blur", () => S(this)), this.setUpToolbars(), this.setUpMentions(), C = (e) => {
				e.detail.livewireId === l && e.detail.key === s && this.runEditorCommands(e.detail);
			}, window.addEventListener("run-rich-editor-plus-commands", C), this.$watch("state", (e) => {
				ee(m, e) || Xh(m, T(e) ?? "", r) || (this.error = t);
			});
		},
		mountAction(e, t = {}) {
			this.$wire.mountAction(e, {
				editorSelection: m.state.selection.toJSON(),
				...t
			}, { schemaComponent: s });
		},
		runEditorCommands({ commands: e, editorSelection: t }) {
			let n = m.chain();
			t && n.command(({ tr: e }) => (e.setSelection(uE.fromJSON(m.state.doc, t)), !0)), n.focus(), e.forEach((e) => n[e.name](...e.arguments ?? [])), n.run();
		},
		setUpToolbars() {
			let e = new Map([...this.$el.querySelectorAll("[data-rep-block-toolbar]")].map((e) => [e.dataset.repBlockToolbar, e]));
			if (!e.size) return;
			let t = [...e.values()], n = (e, t) => this.mountAction(e, t);
			_ = AS({
				editor: m,
				root: this.$el,
				blockTypes: x
			}), b = LC({
				root: this.$el,
				toolbars: t
			});
			let r = () => t.forEach((e) => {
				bC(m, e, p), _.sync(e);
			});
			t.forEach((e) => {
				xC(m, e, p, n), _.bind(e);
			}), m.on("transaction", r), m.registerPlugin(DC({
				toolbars: e,
				root: this.$el,
				floatingElements: _.floatingElements,
				onShow: r,
				onHide: () => {
					b.hide(), _.closeMenus();
				}
			}));
			let i = this.$el.querySelector("[data-rep-slash-menu]");
			i && fC(m, dC({
				editor: m,
				root: this.$el,
				element: i,
				blockTypes: x,
				mountAction: n
			})), v = gC({
				editor: m,
				root: this.$el
			}), r();
		},
		setUpMentions() {
			let e = m.extensionManager.extensions.find(({ name: e }) => e === "mention");
			if (!e) return;
			let t = (e, t) => this.$wire.callSchemaComponentMethod(s, e, t);
			y = MS({
				editor: m,
				fetchLabels: (e) => t("getMentionLabelsForJs", { idsByTrigger: e })
			}), y.refresh();
			let n = this.$el.querySelector("[data-rep-mention-menu]");
			n && e.options.providers.forEach((e) => {
				$S(m, aC({
					editor: m,
					root: this.$el,
					element: n,
					provider: e,
					search: (e, n) => t("getMentionResultsForJs", {
						query: e,
						trigger: n
					})
				}));
			});
		},
		destroy() {
			h = !0, clearTimeout(g), C && window.removeEventListener("run-rich-editor-plus-commands", C), y?.destroy(), v?.destroy(), b?.destroy(), _?.destroy(), m?.destroy(), m = null;
		}
	};
}
//#endregion
export { dE as default };

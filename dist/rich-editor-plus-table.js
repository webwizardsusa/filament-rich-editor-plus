//#region \0rich-editor-plus-shared:@tiptap/core
var e = globalThis.RichEditorPlus?.tiptap;
if (!e) throw Error("[rich-editor-plus] @tiptap/core is shared by Rich Editor Plus, but the editor has not loaded. Load plugin JS through JsExtension::module(), which runs after the editor.");
var t = e.core;
if (!t) throw Error("[rich-editor-plus] This version of Rich Editor Plus does not share @tiptap/core. Update the editor, or bundle a module that does not depend on it.");
var n = [];
function r(e) {
	return e in t || n.push(e) === 1 && queueMicrotask(() => console.warn("[rich-editor-plus] @tiptap/core was built against a newer TipTap than the editor shares. Missing: " + n.join(", "))), t[e];
}
var i = /* @__PURE__ */ r("Extension"), a = /* @__PURE__ */ r("Node"), o = /* @__PURE__ */ r("callOrReturn"), s = /* @__PURE__ */ r("findParentNodeClosestToPos"), c = /* @__PURE__ */ r("getExtensionField"), l = /* @__PURE__ */ r("mergeAttributes"), u = globalThis.RichEditorPlus?.tiptap;
if (!u) throw Error("[rich-editor-plus] @tiptap/pm/state is shared by Rich Editor Plus, but the editor has not loaded. Load plugin JS through JsExtension::module(), which runs after the editor.");
var d = u.pmState;
if (!d) throw Error("[rich-editor-plus] This version of Rich Editor Plus does not share @tiptap/pm/state. Update the editor, or bundle a module that does not depend on it.");
var f = [];
function p(e) {
	return e in d || f.push(e) === 1 && queueMicrotask(() => console.warn("[rich-editor-plus] @tiptap/pm/state was built against a newer TipTap than the editor shares. Missing: " + f.join(", "))), d[e];
}
var m = /* @__PURE__ */ p("TextSelection"), h = globalThis.RichEditorPlus?.tiptap;
if (!h) throw Error("[rich-editor-plus] @tiptap/pm/tables is shared by Rich Editor Plus, but the editor has not loaded. Load plugin JS through JsExtension::module(), which runs after the editor.");
var g = h.pmTables;
if (!g) throw Error("[rich-editor-plus] This version of Rich Editor Plus does not share @tiptap/pm/tables. Update the editor, or bundle a module that does not depend on it.");
var _ = [];
function v(e) {
	return e in g || _.push(e) === 1 && queueMicrotask(() => console.warn("[rich-editor-plus] @tiptap/pm/tables was built against a newer TipTap than the editor shares. Missing: " + _.join(", "))), g[e];
}
var y = /* @__PURE__ */ v("CellSelection"), b = /* @__PURE__ */ v("addColumnAfter"), x = /* @__PURE__ */ v("addColumnBefore"), S = /* @__PURE__ */ v("addRowAfter"), C = /* @__PURE__ */ v("addRowBefore"), w = /* @__PURE__ */ v("columnResizing"), ee = /* @__PURE__ */ v("deleteColumn"), T = /* @__PURE__ */ v("deleteRow"), E = /* @__PURE__ */ v("deleteTable"), D = /* @__PURE__ */ v("fixTables"), O = /* @__PURE__ */ v("goToNextCell"), k = /* @__PURE__ */ v("mergeCells"), A = /* @__PURE__ */ v("setCellAttr"), j = /* @__PURE__ */ v("splitCell"), M = /* @__PURE__ */ v("tableEditing"), N = /* @__PURE__ */ v("toggleHeader"), te = /* @__PURE__ */ v("toggleHeaderCell");
//#endregion
//#region ../../node_modules/@tiptap/extension-table/dist/index.js
function P(e) {
	return e === "left" || e === "right" || e === "center" ? e : null;
}
function ne(e) {
	let t = (e.style.textAlign || "").trim().toLowerCase(), n = (e.getAttribute("align") || "").trim().toLowerCase();
	return P(t || n);
}
function re(e) {
	return P(e?.align);
}
function F() {
	return {
		default: null,
		parseHTML: (e) => ne(e),
		renderHTML: (e) => e.align ? { style: `text-align: ${e.align}` } : {}
	};
}
function I(e) {
	let t = e.parentElement, n = e.closest("table");
	if (!t || !n) return null;
	let r = Array.from(t.children).indexOf(e), i = n.querySelectorAll("colgroup > col")[r]?.getAttribute("width");
	return i ? [parseInt(i, 10)] : null;
}
function L(e) {
	let t = e.getAttribute("colwidth");
	return t ? t.split(",").map((e) => parseInt(e, 10)) : I(e);
}
var R = /[ \t\r\n\f]+/g;
function z(e) {
	return e.children.length > 0 ? !1 : (e.textContent ?? "").replace(R, "") === "";
}
function B(e) {
	let t = e.createAndFill();
	if (!t) throw Error(`[tiptap error]: "${e.name}" has no default content to backfill.`);
	return t.content;
}
var V = a.create({
	name: "tableCell",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	content: "block+",
	addAttributes() {
		return {
			colspan: { default: 1 },
			rowspan: { default: 1 },
			colwidth: {
				default: null,
				parseHTML: L
			},
			align: F()
		};
	},
	tableRole: "cell",
	isolating: !0,
	parseHTML() {
		return [{
			tag: "td",
			getAttrs: (e) => z(e) ? {} : !1,
			getContent: (e, t) => B(t.nodes[this.name])
		}, { tag: "td" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"td",
			l(this.options.HTMLAttributes, e),
			0
		];
	}
}), H = a.create({
	name: "tableHeader",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	content: "block+",
	addAttributes() {
		return {
			colspan: { default: 1 },
			rowspan: { default: 1 },
			colwidth: {
				default: null,
				parseHTML: L
			},
			align: F()
		};
	},
	tableRole: "header_cell",
	isolating: !0,
	parseHTML() {
		return [{
			tag: "th",
			getAttrs: (e) => z(e) ? {} : !1,
			getContent: (e, t) => B(t.nodes[this.name])
		}, { tag: "th" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"th",
			l(this.options.HTMLAttributes, e),
			0
		];
	}
}), U = a.create({
	name: "tableRow",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	content: "(tableCell | tableHeader)*",
	tableRole: "row",
	parseHTML() {
		return [{ tag: "tr" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"tr",
			l(this.options.HTMLAttributes, e),
			0
		];
	}
});
function W(e, t) {
	return t ? ["width", `${Math.max(t, e)}px`] : ["min-width", `${e}px`];
}
function G(e, t, n, r, i, a) {
	let o = 0, s = !0, c = t.firstChild, l = e.firstChild;
	if (l !== null) for (let e = 0, n = 0; e < l.childCount; e += 1) {
		let { colspan: u, colwidth: d } = l.child(e).attrs;
		for (let e = 0; e < u; e += 1, n += 1) {
			let l = i === n ? a : d && d[e], u = l ? `${l}px` : "";
			if (o += l || r, l || (s = !1), c) {
				if (c.style.width !== u) {
					let [e, t] = W(r, l);
					c.style.setProperty(e, t);
				}
				c = c.nextSibling;
			} else {
				let e = document.createElement("col"), [n, i] = W(r, l);
				e.style.setProperty(n, i), t.appendChild(e);
			}
		}
	}
	for (; c;) {
		var u;
		let e = c.nextSibling;
		(u = c.parentNode) == null || u.removeChild(c), c = e;
	}
	let d = e.attrs.style && typeof e.attrs.style == "string" && /\bwidth\s*:/i.test(e.attrs.style);
	s && !d ? (n.style.width = `${o}px`, n.style.minWidth = "") : (n.style.width = "", n.style.minWidth = `${o}px`);
}
var K = class {
	constructor(e, t, n, r = {}) {
		this.node = e, this.cellMinWidth = t, this.dom = document.createElement("div"), this.dom.className = "tableWrapper", this.table = this.dom.appendChild(document.createElement("table"));
		for (let [e, t] of Object.entries(r)) t != null && (e === "style" ? this.table.style.cssText = String(t) : this.table.setAttribute(e, String(t)));
		e.attrs.style && (this.table.style.cssText = e.attrs.style), this.colgroup = this.table.appendChild(document.createElement("colgroup")), G(e, this.colgroup, this.table, t), this.contentDOM = this.table.appendChild(document.createElement("tbody"));
	}
	update(e) {
		return e.type === this.node.type && (this.node = e, G(e, this.colgroup, this.table, this.cellMinWidth), !0);
	}
	ignoreMutation(e) {
		let t = e.target, n = this.dom.contains(t), r = this.contentDOM.contains(t);
		return !(!n || r || e.type !== "attributes" && e.type !== "childList" && e.type !== "characterData");
	}
};
function q(e, t, n, r) {
	let i = 0, a = !0, o = [], s = e.firstChild;
	if (!s) return {};
	for (let e = 0, c = 0; e < s.childCount; e += 1) {
		let { colspan: l, colwidth: u } = s.child(e).attrs;
		for (let e = 0; e < l; e += 1, c += 1) {
			let s = n === c ? r : u && u[e];
			i += s || t, s || (a = !1);
			let [l, d] = W(t, s);
			o.push(["col", { style: `${l}: ${d}` }]);
		}
	}
	let c = a ? `${i}px` : "", l = a ? "" : `${i}px`;
	return {
		colgroup: [
			"colgroup",
			{},
			...o
		],
		tableWidth: c,
		tableMinWidth: l
	};
}
function J(e, t) {
	return t ? e.createChecked(null, t) : e.createAndFill();
}
function Y(e) {
	if (e.cached.tableNodeTypes) return e.cached.tableNodeTypes;
	let t = {};
	return Object.keys(e.nodes).forEach((n) => {
		let r = e.nodes[n];
		r.spec.tableRole && (t[r.spec.tableRole] = r);
	}), e.cached.tableNodeTypes = t, t;
}
function X(e, t, n, r, i) {
	let a = Y(e), o = [], s = [];
	for (let e = 0; e < n; e += 1) {
		let e = J(a.cell, i);
		if (e && s.push(e), r) {
			let e = J(a.header_cell, i);
			e && o.push(e);
		}
	}
	let c = [];
	for (let e = 0; e < t; e += 1) c.push(a.row.createChecked(null, r && e === 0 ? o : s));
	return a.table.createChecked(null, c);
}
function ie(e) {
	return e instanceof y;
}
var Z = ({ editor: e }) => {
	let { selection: t } = e.state;
	if (!ie(t)) return !1;
	let n = 0;
	return s(t.ranges[0].$from, (e) => e.type.name === "table")?.node.descendants((e) => {
		if (e.type.name === "table") return !1;
		["tableCell", "tableHeader"].includes(e.type.name) && (n += 1);
	}), n === t.ranges.length && (e.commands.deleteTable(), !0);
};
function Q(e, t) {
	let n = e.mapping.map(t);
	if (s(e.selection.$from, (e) => e.type.name === "table")?.pos === n) return;
	let r = e.doc.nodeAt(n);
	if (!r) return;
	let i = n + r.nodeSize - 1;
	e.setSelection(m.near(e.doc.resolve(i), -1));
}
function ae(e) {
	let t = "", n = 0;
	for (; n < e.length;) {
		if (e[n] === "\\" && n + 1 < e.length) {
			t += e[n] + e[n + 1], n += 2;
			continue;
		}
		if (e[n] !== "`") {
			t += e[n++];
			continue;
		}
		let r = 0;
		for (; n + r < e.length && e[n + r] === "`";) r += 1;
		let i = n + r, a = !1;
		for (; i < e.length;) {
			if (e[i] !== "`") {
				i += 1;
				continue;
			}
			let o = 0;
			for (; i + o < e.length && e[i + o] === "`";) o += 1;
			if (o === r) {
				let o = e.slice(n + r, i);
				t += e.slice(n, n + r) + o.replace(/\\\||\|/g, (e) => e === "|" ? "\\|" : e) + e.slice(i, i + r), n = i + r, a = !0;
				break;
			}
			i += o;
		}
		a || (t += e.slice(n, n + r), n += r);
	}
	return t;
}
function oe(e) {
	return e.split("\n").map((e) => !e.includes("|") || !e.includes("`") ? e : ae(e)).join("\n");
}
function se(e) {
	return (e || "").replace(/\s+/g, " ").trim();
}
function ce(e, t, n = {}) {
	let r = n.cellLineSeparator ?? "";
	if (!e || !e.content || e.content.length === 0) return "";
	let i = [];
	e.content.forEach((e) => {
		let n = [];
		e.content && e.content.forEach((e) => {
			let i = "";
			i = e.content && Array.isArray(e.content) && e.content.length > 1 ? e.content.map((e) => t.renderChildren(e)).join(r) : e.content ? t.renderChildren(e.content) : "";
			let a = se(i.split(r).join("\n").replace(/[ \t]*\r?\n[ \t]*/g, "<br>")), o = e.type === "tableHeader", s = re(e.attrs);
			n.push({
				text: a,
				isHeader: o,
				align: s
			});
		}), i.push(n);
	});
	let a = i.reduce((e, t) => Math.max(e, t.length), 0);
	if (a === 0) return "";
	let o = Array.from({ length: a }).fill(0);
	i.forEach((e) => {
		for (let t = 0; t < a; t += 1) {
			let n = (e[t]?.text || "").length;
			n > o[t] && (o[t] = n), o[t] < 3 && (o[t] = 3);
		}
	});
	let s = (e, t) => e + " ".repeat(Math.max(0, t - e.length)), c = i[0], l = c.some((e) => e.isHeader), u = Array.from({ length: a }).fill(null);
	i.forEach((e) => {
		for (let t = 0; t < a; t += 1) !u[t] && e[t]?.align && (u[t] = e[t].align);
	});
	let d = "\n", f = Array.from({ length: a }).map((e, t) => l && c[t] && c[t].text || "");
	return d += `| ${f.map((e, t) => s(e, o[t])).join(" | ")} |\n`, d += `| ${o.map((e, t) => {
		let n = Math.max(3, e), r = u[t];
		return r === "left" ? `:${"-".repeat(n)}` : r === "right" ? `${"-".repeat(n)}:` : r === "center" ? `:${"-".repeat(n)}:` : "-".repeat(n);
	}).join(" | ")} |\n`, (l ? i.slice(1) : i).forEach((e) => {
		d += `| ${Array.from({ length: a }).fill(0).map((t, n) => s(e[n] && e[n].text || "", o[n])).join(" | ")} |\n`;
	}), d;
}
var $ = a.create({
	name: "table",
	addOptions() {
		return {
			HTMLAttributes: {},
			resizable: !1,
			renderWrapper: !1,
			handleWidth: 5,
			cellMinWidth: 25,
			View: K,
			lastColumnResizable: !0,
			allowTableNodeSelection: !1
		};
	},
	content: "tableRow+",
	tableRole: "table",
	isolating: !0,
	group: "block",
	parseHTML() {
		return [{ tag: "table" }];
	},
	renderHTML({ node: e, HTMLAttributes: t }) {
		let { colgroup: n, tableWidth: r, tableMinWidth: i } = q(e, this.options.cellMinWidth), a = t.style;
		function o() {
			return a || (r ? `width: ${r}` : `min-width: ${i}`);
		}
		let s = [
			"table",
			l(this.options.HTMLAttributes, t, { style: o() }),
			n,
			["tbody", 0]
		];
		return this.options.renderWrapper ? [
			"div",
			{ class: "tableWrapper" },
			s
		] : s;
	},
	parseMarkdown: (e, t) => {
		let n = [], r = Array.isArray(e.align) ? e.align : [];
		if (e.header) {
			let i = [];
			e.header.forEach((e, n) => {
				let a = P(r[n] ?? e.align), o = a ? { align: a } : {};
				i.push(t.createNode("tableHeader", o, [{
					type: "paragraph",
					content: t.parseInline(e.tokens)
				}]));
			}), n.push(t.createNode("tableRow", {}, i));
		}
		return e.rows && e.rows.forEach((e) => {
			let i = [];
			e.forEach((e, n) => {
				let a = P(r[n] ?? e.align), o = a ? { align: a } : {};
				i.push(t.createNode("tableCell", o, [{
					type: "paragraph",
					content: t.parseInline(e.tokens)
				}]));
			}), n.push(t.createNode("tableRow", {}, i));
		}), t.createNode("table", void 0, n);
	},
	renderMarkdown: (e, t) => ce(e, t),
	markdownTokenizer: {
		name: "table",
		level: "block",
		start: (e) => {
			let t = e.split("\n");
			if (t.length < 2) return -1;
			let n = t[1];
			return !/^[ \t|:]*-[ \t|:-]*$/.test(n) || !n.includes("|") ? -1 : t[0].includes("|") ? 0 : -1;
		},
		tokenize(e, t, n) {
			let r = e.indexOf("\n\n"), i = r >= 0 ? e.slice(0, r) : e, a = i.split("\n");
			if (a.length < 2) return;
			let o = a[1];
			if (!/^[ \t|:]*-[ \t|:-]*$/.test(o) || !o.includes("|")) return;
			let s = oe(i);
			if (s === i) return;
			let c = n.blockTokens(s)[0];
			if (c?.type !== "table" || !c.raw) return;
			let l = c.raw.split("\n").length, u = e.split("\n").slice(0, l).join("\n");
			return {
				...c,
				raw: u
			};
		}
	},
	addCommands() {
		return {
			insertTable: ({ rows: e = 3, cols: t = 3, withHeaderRow: n = !0 } = {}) => ({ tr: r, dispatch: i, editor: a }) => {
				let o = X(a.schema, e, t, n);
				if (i) {
					let e = r.selection.from + 1;
					r.replaceSelectionWith(o).scrollIntoView().setSelection(m.near(r.doc.resolve(e)));
				}
				return !0;
			},
			addColumnBefore: () => ({ state: e, dispatch: t }) => x(e, t),
			addColumnAfter: () => ({ state: e, dispatch: t }) => b(e, t),
			deleteColumn: () => ({ state: e, dispatch: t }) => {
				let n = s(e.selection.$from, (e) => e.type.name === "table");
				return ee(e, t && ((e) => {
					n && Q(e, n.pos), t(e);
				}));
			},
			addRowBefore: () => ({ state: e, dispatch: t }) => C(e, t),
			addRowAfter: () => ({ state: e, dispatch: t }) => S(e, t),
			deleteRow: () => ({ state: e, dispatch: t }) => {
				let n = s(e.selection.$from, (e) => e.type.name === "table");
				return T(e, t && ((e) => {
					n && Q(e, n.pos), t(e);
				}));
			},
			deleteTable: () => ({ state: e, dispatch: t }) => E(e, t),
			mergeCells: () => ({ state: e, dispatch: t }) => k(e, t),
			splitCell: () => ({ state: e, dispatch: t }) => j(e, t),
			toggleHeaderColumn: () => ({ state: e, dispatch: t }) => N("column")(e, t),
			toggleHeaderRow: () => ({ state: e, dispatch: t }) => N("row")(e, t),
			toggleHeaderCell: () => ({ state: e, dispatch: t }) => te(e, t),
			mergeOrSplit: () => ({ state: e, dispatch: t }) => k(e, t) ? !0 : j(e, t),
			setCellAttribute: (e, t) => ({ state: n, dispatch: r }) => A(e, t)(n, r),
			goToNextCell: () => ({ state: e, dispatch: t }) => O(1)(e, t),
			goToPreviousCell: () => ({ state: e, dispatch: t }) => O(-1)(e, t),
			fixTables: () => ({ state: e, dispatch: t }) => (t && D(e), !0),
			setCellSelection: (e) => ({ tr: t, dispatch: n }) => {
				if (n) {
					let n = y.create(t.doc, e.anchorCell, e.headCell);
					t.setSelection(n);
				}
				return !0;
			}
		};
	},
	addKeyboardShortcuts() {
		return {
			Tab: () => this.editor.commands.goToNextCell() ? !0 : this.editor.can().addRowAfter() ? this.editor.chain().addRowAfter().goToNextCell().run() : !1,
			"Shift-Tab": () => this.editor.commands.goToPreviousCell(),
			Backspace: Z,
			"Mod-Backspace": Z,
			Delete: Z,
			"Mod-Delete": Z
		};
	},
	addProseMirrorPlugins() {
		return [...this.options.resizable && this.editor.isEditable ? [w({
			handleWidth: this.options.handleWidth,
			cellMinWidth: this.options.cellMinWidth,
			defaultCellMinWidth: this.options.cellMinWidth,
			View: this.options.View,
			lastColumnResizable: this.options.lastColumnResizable
		})] : [], M({ allowTableNodeSelection: this.options.allowTableNodeSelection })];
	},
	addNodeView() {
		let e = this.options.resizable && this.editor.isEditable, t = this.options.View;
		return e || !t ? null : ({ node: e, view: n, HTMLAttributes: r }) => {
			let i = l(this.options.HTMLAttributes, r);
			return new t(e, this.options.cellMinWidth, n, i);
		};
	},
	extendNodeSchema(e) {
		return { tableRole: o(c(e, "tableRole", {
			name: e.name,
			options: e.options,
			storage: e.storage
		})) };
	}
});
i.create({
	name: "tableKit",
	addExtensions() {
		let e = [];
		return this.options.table !== !1 && e.push($.configure(this.options.table)), this.options.tableCell !== !1 && e.push(V.configure(this.options.tableCell)), this.options.tableHeader !== !1 && e.push(H.configure(this.options.tableHeader)), this.options.tableRow !== !1 && e.push(U.configure(this.options.tableRow)), e;
	}
});
//#endregion
//#region resources/js/plugins/table/index.js
function le({ registerExtension: e }) {
	e("hollyit/table", ({ resizable: e }) => [
		$.configure({ resizable: e ?? !0 }),
		U,
		H,
		V
	]);
}
//#endregion
export { le as default };

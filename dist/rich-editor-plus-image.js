//#region \0rich-editor-plus-shared:@tiptap/pm/state
var e = globalThis.RichEditorPlus?.tiptap;
if (!e) throw Error("[rich-editor-plus] @tiptap/pm/state is shared by Rich Editor Plus, but the editor has not loaded. Load plugin JS through JsExtension::module(), which runs after the editor.");
var t = e.pmState;
if (!t) throw Error("[rich-editor-plus] This version of Rich Editor Plus does not share @tiptap/pm/state. Update the editor, or bundle a module that does not depend on it.");
var n = [];
function r(e) {
	return e in t || n.push(e) === 1 && queueMicrotask(() => console.warn("[rich-editor-plus] @tiptap/pm/state was built against a newer TipTap than the editor shares. Missing: " + n.join(", "))), t[e];
}
var i = /* @__PURE__ */ r("NodeSelection"), a = /* @__PURE__ */ r("Plugin"), o = /* @__PURE__ */ r("PluginKey"), s = globalThis.RichEditorPlus?.tiptap;
if (!s) throw Error("[rich-editor-plus] @tiptap/core is shared by Rich Editor Plus, but the editor has not loaded. Load plugin JS through JsExtension::module(), which runs after the editor.");
var c = s.core;
if (!c) throw Error("[rich-editor-plus] This version of Rich Editor Plus does not share @tiptap/core. Update the editor, or bundle a module that does not depend on it.");
var l = [];
function u(e) {
	return e in c || l.push(e) === 1 && queueMicrotask(() => console.warn("[rich-editor-plus] @tiptap/core was built against a newer TipTap than the editor shares. Missing: " + l.join(", "))), c[e];
}
var d = /* @__PURE__ */ u("Extension"), f = /* @__PURE__ */ u("Node"), p = 100;
function m(e, t) {
	let n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Set(), a = null, o = (a) => {
		a.forEach((e) => i.add(e)), new Promise((n) => n(e ? e(t, "urls", { paths: a }) : {})).catch(() => ({})).then((e) => {
			let t = e?.urls && typeof e.urls == "object" ? e.urls : {};
			a.forEach((e) => {
				let a = t[e], o = typeof a == "string" && a !== "" ? a : null;
				Object.hasOwn(t, e) && n.set(e, o);
				let s = r.get(e) ?? [];
				r.delete(e), i.delete(e), s.forEach((e) => e(o));
			});
		});
	}, s = () => {
		a = null;
		let e = [...r.keys()].filter((e) => !i.has(e));
		for (let t = 0; t < e.length; t += p) o(e.slice(t, t + p));
	};
	return {
		set(e, t) {
			typeof t == "string" && t !== "" && n.set(e, t);
		},
		get(e, t) {
			if (n.has(e)) {
				t(n.get(e));
				return;
			}
			r.set(e, [...r.get(e) ?? [], t]), i.has(e) || (a ??= Promise.resolve().then(s));
		}
	};
}
//#endregion
//#region resources/js/plugins/image/attachment.js
var h = [
	"KB",
	"MB",
	"GB"
];
function g(e) {
	if (e < 1024) return `${e} B`;
	let t = e / 1024, n = 0;
	for (; t >= 1024 && n < h.length - 1;) t /= 1024, n++;
	let r = Math.round(t * 10) / 10;
	return `${r >= 10 ? Math.round(t) : r} ${h[n]}`;
}
var _ = (e) => Array.from((typeof e == "string" ? e : "").replace(/[\u0000-\u001F\u007F/\\]/g, "").replace(/^ +| +$/g, "")).slice(0, 255).join(""), v = (e) => Number.isInteger(e) ? e >= 0 ? e : null : typeof e == "string" && /^\d{1,15}$/.test(e) ? Number(e) : null, y = (e) => typeof e == "string" && /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(e) ? e : null, b = (e) => typeof e == "string" && e !== "" ? e : null, x = ({ disk: e, path: t }) => typeof e == "string" && typeof t == "string", S = (e) => e.selection instanceof i && e.selection.node.type.name === "attachment";
function C({ uploads: e = null, labels: t = {} }, { callPlugin: n } = {}) {
	let r = m(n, "hollyit/attachment"), i = (e) => {
		let t = {
			disk: b,
			path: b,
			name: _,
			size: v,
			mime: y
		};
		return Object.fromEntries(Object.entries(e ?? {}).filter(([e]) => e in t).map(([e, n]) => [e, t[e](n)]));
	};
	return f.create({
		name: "attachment",
		group: "block",
		atom: !0,
		draggable: !0,
		selectable: !0,
		priority: 55,
		addStorage() {
			return {
				uploadRoute: e ? {
					plugin: "hollyit/attachment",
					kind: "attachment",
					accept: e.accept ?? [],
					maxSize: e.maxSize ?? 0
				} : null,
				urlCache: r
			};
		},
		addAttributes() {
			let e = { renderHTML: () => ({}) };
			return {
				disk: {
					default: null,
					parseHTML: (e) => e.getAttribute("data-disk") || null,
					...e
				},
				path: {
					default: null,
					parseHTML: (e) => e.getAttribute("data-path") || null,
					...e
				},
				name: {
					default: "",
					parseHTML: (e) => _(e.querySelector("a")?.textContent ?? ""),
					...e
				},
				size: {
					default: null,
					parseHTML: (e) => v(e.getAttribute("data-size")),
					...e
				},
				mime: {
					default: null,
					parseHTML: (e) => y(e.getAttribute("data-mime")),
					...e
				}
			};
		},
		parseHTML() {
			return [{ tag: "div[data-type=\"attachment\"]" }];
		},
		renderHTML({ node: e }) {
			let t = x(e.attrs), n = v(e.attrs.size), r = y(e.attrs.mime), i = _(e.attrs.name), a = {
				class: "rep-attachment",
				"data-type": "attachment"
			};
			t && (a["data-disk"] = e.attrs.disk, a["data-path"] = e.attrs.path), n !== null && (a["data-size"] = String(n)), r !== null && (a["data-mime"] = r);
			let o = [[
				"a",
				{ download: i },
				i
			]];
			return n !== null && o.push([
				"span",
				{ class: "rep-attachment-size" },
				g(n)
			]), [
				"div",
				a,
				...o
			];
		},
		renderText({ node: e }) {
			return e.attrs.name || "";
		},
		addNodeView() {
			return ({ node: e }) => {
				let n = e, i = 0, a = document.createElement("div"), o = () => {
					let e = ++i, o = v(n.attrs.size), s = y(n.attrs.mime);
					a.classList.add("rep-attachment"), a.dataset.type = "attachment", s ? a.dataset.mime = s : delete a.dataset.mime, a.replaceChildren();
					let c = document.createElement("span");
					if (c.className = "rep-attachment-name", c.textContent = _(n.attrs.name), a.append(c), o !== null) {
						let e = document.createElement("span");
						e.className = "rep-attachment-size", e.textContent = g(o), a.append(e);
					}
					let l = document.createElement("span");
					l.className = "rep-attachment-status", a.append(l);
					let u = (e) => {
						if (!e) {
							l.textContent = t.missing ?? "File missing";
							return;
						}
						let n = document.createElement("a");
						n.className = "rep-attachment-open", n.href = e, n.target = "_blank", n.rel = "noopener noreferrer", n.textContent = t.open ?? "Open", l.replaceWith(n);
					};
					if (!x(n.attrs)) {
						u(null);
						return;
					}
					l.textContent = t.loading ?? "Loading…", r.get(n.attrs.path, (t) => {
						e === i && u(t);
					});
				};
				return o(), {
					dom: a,
					update(e) {
						if (e.type.name !== "attachment") return !1;
						let t = Object.keys(e.attrs).some((t) => e.attrs[t] !== n.attrs[t]);
						return n = e, t && o(), !0;
					}
				};
			};
		},
		addCommands() {
			return {
				insertAttachment: (e) => ({ commands: t }) => t.insertContent({
					type: "attachment",
					attrs: i(e)
				}),
				updateAttachment: (e) => ({ state: t, commands: n }) => S(t) && n.updateAttributes("attachment", i(e))
			};
		}
	});
}
//#endregion
//#region \0rich-editor-plus-shared:@tiptap/pm/view
var w = globalThis.RichEditorPlus?.tiptap;
if (!w) throw Error("[rich-editor-plus] @tiptap/pm/view is shared by Rich Editor Plus, but the editor has not loaded. Load plugin JS through JsExtension::module(), which runs after the editor.");
var T = w.pmView;
if (!T) throw Error("[rich-editor-plus] This version of Rich Editor Plus does not share @tiptap/pm/view. Update the editor, or bundle a module that does not depend on it.");
var E = [];
function D(e) {
	return e in T || E.push(e) === 1 && queueMicrotask(() => console.warn("[rich-editor-plus] @tiptap/pm/view was built against a newer TipTap than the editor shares. Missing: " + E.join(", "))), T[e];
}
var O = /* @__PURE__ */ D("Decoration"), k = /* @__PURE__ */ D("DecorationSet"), A = new o("repUploadPlaceholders"), j = 0, M = (e, t) => Object.entries(t).reduce((e, [t, n]) => e.replaceAll(`:${t}`, String(n)), e ?? ""), N = (e, t) => {
	let n = window.FilamentNotification;
	if (n) {
		new n().title(e).body(t).danger().send();
		return;
	}
	console.warn(`[rich-editor-plus] ${e}: ${t}`);
}, P = () => new a({
	key: A,
	state: {
		init: () => k.empty,
		apply(e, t) {
			let n = t.map(e.mapping, e.doc), r = e.getMeta(A);
			return r?.add && (n = n.add(e.doc, r.add.map(({ id: e, pos: t, element: n }) => O.widget(t, n, {
				id: e,
				side: 1
			})))), r?.remove && (n = n.remove(n.find(void 0, void 0, (e) => e.id === r.remove))), n;
		}
	},
	props: { decorations(e) {
		return A.getState(e);
	} }
}), F = (e) => console.error("[rich-editor-plus] File upload failed unexpectedly.", e), I = (e, t) => A.getState(e).find(void 0, void 0, (e) => e.id === t)[0]?.from ?? null, L = (e) => Object.values(e.storage).map((e) => e?.uploadRoute).filter(Boolean).sort((e, t) => (e.kind === "image" ? 0 : 1) - (t.kind === "image" ? 0 : 1)), R = {
	"application/x-zip-compressed": "application/zip",
	"application/x-zip": "application/zip",
	"text/x-csv": "text/csv",
	"application/csv": "text/csv",
	"image/jpg": "image/jpeg",
	"image/pjpeg": "image/jpeg"
}, z = ["", "application/octet-stream"], B = [
	"image/svg+xml",
	"text/html",
	"text/xml",
	"text/javascript"
], V = (e, t) => t !== "" && e.some((e) => {
	let n = String(e).toLowerCase();
	return n === t || n.endsWith("/*") && t.startsWith(n.slice(0, -1)) && !B.includes(t);
}), H = (e, t) => {
	let n = String(t.type ?? "").toLowerCase(), r = R[n] ?? n;
	return e.find(({ accept: e }) => V(e, r)) ?? (z.includes(r) ? e.find(({ kind: e }) => e === "attachment") : void 0);
}, U = (e, t) => e.kind === "image" ? {
	type: "image",
	attrs: {
		disk: t.disk,
		path: t.path,
		alt: ""
	}
} : {
	type: "attachment",
	attrs: {
		disk: t.disk,
		path: t.path,
		name: _(t.name),
		size: Number.isInteger(t.size) && t.size >= 0 ? t.size : null,
		mime: typeof t.mime == "string" ? t.mime : null
	}
}, W = (e, t) => {
	let n = null;
	return e.state.doc.descendants((e, r) => (n === null && e.type.name === "image" && e.attrs.path === t && (n = r), n === null)), n !== null && e.commands.setNodeSelection(n);
};
function G({ uploadLabels: e = {} }, t = {}) {
	let n = e, r = async (e, { id: r, file: i, route: a, element: o }) => {
		let s = (e) => e.setMeta(A, { remove: r }), c = (t) => (e.isDestroyed || e.view.dispatch(s(e.state.tr)), N(i.name, t || n.upload_failed || "The upload failed."), null), l;
		try {
			let e = await t.upload(i, { onProgress: (e) => {
				o.textContent = M(n.uploading, {
					name: i.name,
					percent: e
				});
			} });
			l = await t.callPlugin(a.plugin, "store", { key: e });
		} catch {
			return c(null);
		}
		if (e.isDestroyed) return null;
		if (!l || typeof l.disk != "string" || typeof l.path != "string") return c(typeof l?.error == "string" ? l.error : null);
		let u = I(e.state, r);
		return u === null ? c(n.place_lost) : (a.kind === "image" && e.storage.image?.urlCache?.set(l.path, l.url), e.chain().command(({ tr: e }) => (s(e), !0)).insertContentAt(u, U(a, l), { updateSelection: !1 }).run(), {
			kind: a.kind,
			path: l.path
		});
	}, i = async (e, i, a) => {
		let o = [...i], s = L(e), c = [];
		if (o.length > 10 && N(o[10].name, M(n.too_many_files, { count: 10 })), o.slice(0, 10).forEach((e) => {
			let t = H(s, e);
			if (!t) {
				N(e.name, M(n.not_accepted, { name: e.name }));
				return;
			}
			if (e.size > t.maxSize * 1024) {
				N(e.name, M(n.too_large, {
					name: e.name,
					size: g(t.maxSize * 1024)
				}));
				return;
			}
			let r = document.createElement("div");
			r.className = "rep-upload-placeholder", r.contentEditable = "false", r.textContent = M(n.uploading, {
				name: e.name,
				percent: 0
			}), c.push({
				id: `rep-upload-${++j}`,
				file: e,
				route: t,
				element: r,
				pos: a
			});
		}), !c.length) return;
		e.view.dispatch(e.state.tr.setMeta(A, { add: c }));
		let l = [];
		for (let t of c) {
			if (e.isDestroyed) break;
			let n = await r(e, t);
			n?.kind === "image" && l.push(n.path);
		}
		l.length === 1 && !e.isDestroyed && W(e, l[0]) && t.runAction?.("image");
	}, s = (e) => t.processing ? t.processing(e) : e;
	return d.create({
		name: "repFileUploads",
		addProseMirrorPlugins() {
			let e = this.editor;
			return [P(), new a({
				key: new o("repFileUploads"),
				props: {
					handlePaste(n, r) {
						let a = r.clipboardData, o = [...a?.types ?? []];
						return !e.isEditable || !t.upload || !a?.files?.length || o.includes("text/html") ? !1 : (r.preventDefault(), s(i(e, a.files, n.state.selection.from)).catch(F), !0);
					},
					handleDrop(n, r, a, o) {
						let c = r.dataTransfer?.files;
						if (o || !e.isEditable || !t.upload || !c?.length) return !1;
						let l = n.state.selection.from;
						try {
							l = n.posAtCoords({
								left: r.clientX,
								top: r.clientY
							})?.pos ?? l;
						} catch {}
						return r.preventDefault(), s(i(e, c, l)).catch(F), !0;
					}
				}
			})];
		}
	});
}
//#endregion
//#region resources/js/plugins/image/image.js
var K = [
	"left",
	"center",
	"right",
	"wide"
], q = /[\u0000-\u0020\u007F-\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/gu, J = (e) => {
	if (typeof e != "string" || e.trim() === "") return !1;
	let t = e.replace(q, "").match(/^([a-z][a-z0-9+.-]*):/i);
	return t === null || ["http", "https"].includes(t[1].toLowerCase());
}, Y = (e) => J(e) ? e.trim() : null, X = ({ disk: e, path: t }) => typeof e == "string" && typeof t == "string", Z = (e) => e.selection instanceof i && e.selection.node.type.name === "image";
function Q({ widths: e = [], defaultWidth: t = "100", defaultAlignment: n = "center", altRequired: r = !1, uploads: i = null, labels: a = {} }, { callPlugin: o, runAction: s } = {}) {
	let c = m(o, "hollyit/image"), l = (e) => K.includes(e) ? e : n, u = (n) => e.includes(String(n)) ? String(n) : t, d = (e) => typeof e == "string" ? e : "", p = (e) => {
		let t = {
			disk: (e) => typeof e == "string" && e !== "" ? e : null,
			path: (e) => typeof e == "string" && e !== "" ? e : null,
			url: Y,
			alt: d,
			caption: (e) => d(e).trim(),
			align: l,
			width: u
		};
		return Object.fromEntries(Object.entries(e ?? {}).filter(([e]) => e in t).map(([e, n]) => [e, t[e](n)]));
	};
	return f.create({
		name: "image",
		group: "block",
		atom: !0,
		draggable: !0,
		selectable: !0,
		priority: 60,
		addAttributes() {
			let e = { renderHTML: () => ({}) };
			return {
				disk: {
					default: null,
					parseHTML: (e) => e.getAttribute("data-disk") || null,
					...e
				},
				path: {
					default: null,
					parseHTML: (e) => e.getAttribute("data-path") || null,
					...e
				},
				url: {
					default: null,
					parseHTML: (e) => Y(e.tagName === "IMG" ? e.getAttribute("src") : e.getAttribute("data-url")),
					...e
				},
				alt: {
					default: "",
					parseHTML: (e) => (e.tagName === "IMG" ? e : e.querySelector("img"))?.getAttribute("alt") ?? "",
					...e
				},
				caption: {
					default: "",
					parseHTML: (e) => e.querySelector("figcaption")?.textContent.trim() ?? "",
					...e
				},
				align: {
					default: n,
					parseHTML: (e) => l(e.getAttribute("data-align")),
					...e
				},
				width: {
					default: t,
					parseHTML: (e) => u(e.getAttribute("data-width")),
					...e
				}
			};
		},
		parseHTML() {
			return [{ tag: "figure[data-type=\"image\"]" }, {
				tag: "img[src]",
				getAttrs: (e) => J(e.getAttribute("src")) ? {} : !1
			}];
		},
		renderHTML({ node: e }) {
			let { disk: t, path: n, alt: r, caption: i } = e.attrs, a = Y(e.attrs.url), o = X(e.attrs), s = {
				class: "rep-image",
				"data-type": "image"
			};
			o ? (s["data-disk"] = t, s["data-path"] = n) : a && (s["data-url"] = a), s["data-align"] = l(e.attrs.align), s["data-width"] = u(e.attrs.width);
			let c = [["img", !o && a ? {
				src: a,
				alt: d(r)
			} : { alt: d(r) }]];
			return d(i).trim() !== "" && c.push([
				"figcaption",
				{},
				d(i).trim()
			]), [
				"figure",
				s,
				...c
			];
		},
		renderText({ node: e }) {
			return e.attrs.caption || e.attrs.alt || "";
		},
		addStorage() {
			return {
				uploadRoute: i ? {
					plugin: "hollyit/image",
					kind: "image",
					accept: i.accept ?? [],
					maxSize: i.maxSize ?? 0
				} : null,
				urlCache: c
			};
		},
		addNodeView() {
			return ({ node: e, editor: t, getPos: n }) => {
				let i = e, o = 0, f = document.createElement("figure"), p = (e) => {
					let t = document.createElement("div");
					return t.className = "rep-image-placeholder", t.textContent = e, t;
				}, m = () => {
					let { alt: e, caption: m } = i.attrs, h = ++o;
					f.classList.add("rep-image"), f.dataset.type = "image", f.dataset.align = l(i.attrs.align), f.dataset.width = u(i.attrs.width), f.replaceChildren();
					let g = (t) => {
						if (!t) {
							f.prepend(p(a.missing ?? "Image missing"));
							return;
						}
						let n = document.createElement("img");
						n.src = t, n.alt = d(e), f.prepend(n);
					};
					if (d(m).trim() !== "") {
						let e = document.createElement("figcaption");
						e.textContent = d(m).trim(), f.append(e);
					}
					if (r && t.isEditable && d(e).trim() === "") {
						let e = document.createElement("button");
						e.type = "button", e.className = "rep-image-badge", e.textContent = a.needsAlt ?? "Needs alt text", e.addEventListener("mousedown", (e) => e.preventDefault()), e.addEventListener("click", (e) => {
							e.preventDefault(), e.stopPropagation();
							let r = n();
							typeof r == "number" && (t.commands.setNodeSelection(r), s?.("image"));
						}), f.append(e);
					}
					if (!X(i.attrs)) {
						g(Y(i.attrs.url));
						return;
					}
					let _ = p(a.loading ?? "Loading image…");
					f.prepend(_), c.get(i.attrs.path, (e) => {
						h === o && (_.remove(), g(e));
					});
				};
				return m(), {
					dom: f,
					update(e) {
						if (e.type.name !== "image") return !1;
						let t = Object.keys(e.attrs).some((t) => e.attrs[t] !== i.attrs[t]);
						return i = e, t && m(), !0;
					}
				};
			};
		},
		addCommands() {
			return {
				insertImage: (e) => ({ commands: t }) => t.insertContent({
					type: "image",
					attrs: p(e)
				}),
				updateImage: (e) => ({ state: t, commands: n }) => Z(t) && n.updateAttributes("image", p(e)),
				setImageAlign: (e) => ({ state: t, commands: n }) => Z(t) && K.includes(e) && n.updateAttributes("image", { align: e }),
				setImageWidth: (t) => ({ state: n, commands: r }) => Z(n) && e.includes(t) && r.updateAttributes("image", { width: t })
			};
		}
	});
}
//#endregion
//#region resources/js/plugins/image/index.js
function $({ registerExtension: e, registerActionArguments: t }) {
	e("hollyit/image", (e, t, n) => [Q(e, n), G(e, n)]), e("hollyit/attachment", (e, t, n) => [C(e, n), G(e, n)]);
	let n = (e) => (t) => {
		let { selection: n } = t.state;
		return !(n instanceof i) || n.node.type.name !== e ? {} : {
			editing: !0,
			...n.node.attrs
		};
	};
	t("image", n("image")), t("attachment", n("attachment"));
}
//#endregion
export { $ as default };

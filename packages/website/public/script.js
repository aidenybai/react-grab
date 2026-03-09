this.globalThis = this.globalThis || {};
this.globalThis.__REACT_GRAB_MODULE__ = (function (exports) {
  "use strict"; /**
   * @license MIT
   *
   * Copyright (c) 2025 Aiden Bai
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  var xp = (e, t) => e === t,
    Zt = Symbol("solid-proxy"),
    vp = typeof Proxy == "function",
    Tr = Symbol("solid-track"),
    Mi = { equals: xp },
    Cc = Pc,
    $t = 1,
    Er = 2,
    Ec = { owned: null, cleanups: null, context: null, owner: null },
    sa = {},
    Fe = null,
    J = null,
    Do = null,
    Xe = null,
    at = null,
    Ct = null,
    Ni = 0;
  function wn(e, t) {
    let n = Xe,
      o = Fe,
      r = e.length === 0,
      s = t === void 0 ? o : t,
      i = r
        ? Ec
        : {
            owned: null,
            cleanups: null,
            context: s ? s.context : null,
            owner: s,
          },
      c = r ? e : () => e(() => Et(() => $n(i)));
    ((Fe = i), (Xe = null));
    try {
      return Mt(c, !0);
    } finally {
      ((Xe = n), (Fe = o));
    }
  }
  function $(e, t) {
    t = t ? Object.assign({}, Mi, t) : Mi;
    let n = {
        value: e,
        observers: null,
        observerSlots: null,
        comparator: t.equals || void 0,
      },
      o = (r) => (typeof r == "function" && (r = r(n.value)), _c(n, r));
    return [Tc.bind(n), o];
  }
  function yc(e, t, n) {
    let o = Fi(e, t, true, $t);
    Ho(o);
  }
  function Y(e, t, n) {
    let o = Fi(e, t, false, $t);
    Ho(o);
  }
  function ge(e, t, n) {
    Cc = Tp;
    let o = Fi(e, t, false, $t);
    ((o.user = true), Ct ? Ct.push(o) : Ho(o));
  }
  function ie(e, t, n) {
    n = n ? Object.assign({}, Mi, n) : Mi;
    let o = Fi(e, t, true, 0);
    return (
      (o.observers = null),
      (o.observerSlots = null),
      (o.comparator = n.equals || void 0),
      Ho(o),
      Tc.bind(o)
    );
  }
  function Cp(e) {
    return e && typeof e == "object" && "then" in e;
  }
  function ua(e, t, n) {
    let o, r, s;
    typeof t == "function"
      ? ((o = e), (r = t), (s = {}))
      : ((o = true), (r = e), (s = t || {}));
    let i = null,
      c = sa,
      f = false,
      m = "initialValue" in s,
      h = typeof o == "function" && ie(o),
      v = new Set(),
      [H, F] = (s.storage || $)(s.initialValue),
      [y, w] = $(void 0),
      [b, g] = $(void 0, { equals: false }),
      [C, O] = $(m ? "ready" : "unresolved");
    function V(ce, W, G, A) {
      return (
        i === ce &&
          ((i = null),
          A !== void 0 && (m = true),
          (ce === c || W === c) &&
            s.onHydrated &&
            queueMicrotask(() => s.onHydrated(A, { value: W })),
          (c = sa),
          Q(W, G)),
        W
      );
    }
    function Q(ce, W) {
      Mt(() => {
        (W === void 0 && F(() => ce),
          O(W !== void 0 ? "errored" : m ? "ready" : "unresolved"),
          w(W));
        for (let G of v.keys()) G.decrement();
        v.clear();
      }, false);
    }
    function X() {
      let ce = Sr,
        W = H(),
        G = y();
      if (G !== void 0 && !i) throw G;
      return (Xe && !Xe.user && ce, W);
    }
    function ee(ce = true) {
      if (ce !== false && f) return;
      f = false;
      let W = h ? h() : o;
      if (W == null || W === false) {
        V(i, Et(H));
        return;
      }
      let G,
        A =
          c !== sa
            ? c
            : Et(() => {
                try {
                  return r(W, { value: H(), refetching: ce });
                } catch (I) {
                  G = I;
                }
              });
      if (G !== void 0) {
        V(i, void 0, Oi(G), W);
        return;
      } else if (!Cp(A)) return (V(i, A, void 0, W), A);
      return (
        (i = A),
        "v" in A
          ? (A.s === 1 ? V(i, A.v, void 0, W) : V(i, void 0, Oi(A.v), W), A)
          : ((f = true),
            queueMicrotask(() => (f = false)),
            Mt(() => {
              (O(m ? "refreshing" : "pending"), g());
            }, false),
            A.then(
              (I) => V(A, I, void 0, W),
              (I) => V(A, void 0, Oi(I), W),
            ))
      );
    }
    Object.defineProperties(X, {
      state: { get: () => C() },
      error: { get: () => y() },
      loading: {
        get() {
          let ce = C();
          return ce === "pending" || ce === "refreshing";
        },
      },
      latest: {
        get() {
          if (!m) return X();
          let ce = y();
          if (ce && !i) throw ce;
          return H();
        },
      },
    });
    let ye = Fe;
    return (
      h ? yc(() => ((ye = Fe), ee(false))) : ee(false),
      [X, { refetch: (ce) => Sc(ye, () => ee(ce)), mutate: F }]
    );
  }
  function Li(e) {
    return Mt(e, false);
  }
  function Et(e) {
    if (Xe === null) return e();
    let t = Xe;
    Xe = null;
    try {
      return Do ? Do.untrack(e) : e();
    } finally {
      Xe = t;
    }
  }
  function He(e, t, n) {
    let o = Array.isArray(e),
      r,
      s = n && n.defer;
    return (i) => {
      let c;
      if (o) {
        c = Array(e.length);
        for (let u = 0; u < e.length; u++) c[u] = e[u]();
      } else c = e();
      if (s) return ((s = false), i);
      let l = Et(() => t(c, r, i));
      return ((r = c), l);
    };
  }
  function lt(e) {
    ge(() => Et(e));
  }
  function _e(e) {
    return (
      Fe === null ||
        (Fe.cleanups === null ? (Fe.cleanups = [e]) : Fe.cleanups.push(e)),
      e
    );
  }
  function Di() {
    return Xe;
  }
  function Sc(e, t) {
    let n = Fe,
      o = Xe;
    ((Fe = e), (Xe = null));
    try {
      return Mt(t, !0);
    } catch (r) {
      Hi(r);
    } finally {
      ((Fe = n), (Xe = o));
    }
  }
  var [Zw, wc] = $(false);
  var Sr;
  function Tc() {
    let e = J;
    if (this.sources && this.state)
      if (this.state === $t) Ho(this);
      else {
        let t = at;
        ((at = null), Mt(() => Ii(this), false), (at = t));
      }
    if (Xe) {
      let t = this.observers ? this.observers.length : 0;
      (Xe.sources
        ? (Xe.sources.push(this), Xe.sourceSlots.push(t))
        : ((Xe.sources = [this]), (Xe.sourceSlots = [t])),
        this.observers
          ? (this.observers.push(Xe),
            this.observerSlots.push(Xe.sources.length - 1))
          : ((this.observers = [Xe]),
            (this.observerSlots = [Xe.sources.length - 1])));
    }
    return e && J.sources.has(this) ? this.tValue : this.value;
  }
  function _c(e, t, n) {
    let o = e.value;
    if (!e.comparator || !e.comparator(o, t)) {
      e.value = t;
      e.observers &&
        e.observers.length &&
        Mt(() => {
          for (let r = 0; r < e.observers.length; r += 1) {
            let s = e.observers[r],
              i = J && J.running;
            (i && J.disposed.has(s)) ||
              ((i ? !s.tState : !s.state) &&
                (s.pure ? at.push(s) : Ct.push(s), s.observers && kc(s)),
              i ? (s.tState = $t) : (s.state = $t));
          }
          if (at.length > 1e6) throw ((at = []), new Error());
        }, false);
    }
    return t;
  }
  function Ho(e) {
    if (!e.fn) return;
    $n(e);
    let t = Ni;
    xc(e, e.value, t);
  }
  function xc(e, t, n) {
    let o,
      r = Fe,
      s = Xe;
    Xe = Fe = e;
    try {
      o = e.fn(t);
    } catch (i) {
      return (
        e.pure &&
          ((e.state = $t), e.owned && e.owned.forEach($n), (e.owned = null)),
        (e.updatedAt = n + 1),
        Hi(i)
      );
    } finally {
      ((Xe = s), (Fe = r));
    }
    (!e.updatedAt || e.updatedAt <= n) &&
      (e.updatedAt != null && "observers" in e ? _c(e, o) : (e.value = o),
      (e.updatedAt = n));
  }
  function Fi(e, t, n, o = $t, r) {
    let s = {
      fn: e,
      state: o,
      updatedAt: null,
      owned: null,
      sources: null,
      sourceSlots: null,
      cleanups: null,
      value: t,
      owner: Fe,
      context: Fe ? Fe.context : null,
      pure: n,
    };
    if (
      (Fe === null ||
        (Fe !== Ec && (Fe.owned ? Fe.owned.push(s) : (Fe.owned = [s]))),
      Do)
    );
    return s;
  }
  function Ar(e) {
    let t = J;
    if (e.state === 0) return;
    if (e.state === Er) return Ii(e);
    if (e.suspense && Et(e.suspense.inFallback))
      return e.suspense.effects.push(e);
    let n = [e];
    for (; (e = e.owner) && (!e.updatedAt || e.updatedAt < Ni); ) {
      e.state && n.push(e);
    }
    for (let o = n.length - 1; o >= 0; o--) {
      if (((e = n[o]), t));
      if (e.state === $t) Ho(e);
      else if (e.state === Er) {
        let r = at;
        ((at = null), Mt(() => Ii(e, n[0]), false), (at = r));
      }
    }
  }
  function Mt(e, t) {
    if (at) return e();
    let n = false;
    (t || (at = []), Ct ? (n = true) : (Ct = []), Ni++);
    try {
      let o = e();
      return (Sp(n), o);
    } catch (o) {
      (n || (Ct = null), (at = null), Hi(o));
    }
  }
  function Sp(e) {
    if ((at && (Pc(at), (at = null)), e)) return;
    let n = Ct;
    ((Ct = null), n.length && Mt(() => Cc(n), false));
  }
  function Pc(e) {
    for (let t = 0; t < e.length; t++) Ar(e[t]);
  }
  function Tp(e) {
    let t,
      n = 0;
    for (t = 0; t < e.length; t++) {
      let o = e[t];
      o.user ? (e[n++] = o) : Ar(o);
    }
    for (t = 0; t < n; t++) Ar(e[t]);
  }
  function Ii(e, t) {
    e.state = 0;
    for (let o = 0; o < e.sources.length; o += 1) {
      let r = e.sources[o];
      if (r.sources) {
        let s = r.state;
        s === $t
          ? r !== t && (!r.updatedAt || r.updatedAt < Ni) && Ar(r)
          : s === Er && Ii(r, t);
      }
    }
  }
  function kc(e) {
    for (let n = 0; n < e.observers.length; n += 1) {
      let o = e.observers[n];
      !o.state &&
        ((o.state = Er),
        o.pure ? at.push(o) : Ct.push(o),
        o.observers && kc(o));
    }
  }
  function $n(e) {
    let t;
    if (e.sources)
      for (; e.sources.length; ) {
        let n = e.sources.pop(),
          o = e.sourceSlots.pop(),
          r = n.observers;
        if (r && r.length) {
          let s = r.pop(),
            i = n.observerSlots.pop();
          o < r.length &&
            ((s.sourceSlots[i] = o), (r[o] = s), (n.observerSlots[o] = i));
        }
      }
    if (e.tOwned) {
      for (t = e.tOwned.length - 1; t >= 0; t--) $n(e.tOwned[t]);
      delete e.tOwned;
    }
    if (e.owned) {
      for (t = e.owned.length - 1; t >= 0; t--) $n(e.owned[t]);
      e.owned = null;
    }
    if (e.cleanups) {
      for (t = e.cleanups.length - 1; t >= 0; t--) e.cleanups[t]();
      e.cleanups = null;
    }
    e.state = 0;
  }
  function Oi(e) {
    return e instanceof Error
      ? e
      : new Error(typeof e == "string" ? e : "Unknown error", { cause: e });
  }
  function Hi(e, t = Fe) {
    let o = Oi(e);
    throw o;
  }
  var ca = Symbol("fallback");
  function Ri(e) {
    for (let t = 0; t < e.length; t++) e[t]();
  }
  function _p(e, t, n = {}) {
    let o = [],
      r = [],
      s = [],
      i = 0,
      c = t.length > 1 ? [] : null;
    return (
      _e(() => Ri(s)),
      () => {
        let l = e() || [],
          u = l.length,
          f,
          m;
        return (
          l[Tr],
          Et(() => {
            let v, H, F, y, w, b, g, C, O;
            if (u === 0)
              (i !== 0 &&
                (Ri(s), (s = []), (o = []), (r = []), (i = 0), c && (c = [])),
                n.fallback &&
                  ((o = [ca]),
                  (r[0] = wn((V) => ((s[0] = V), n.fallback()))),
                  (i = 1)));
            else if (i === 0) {
              for (r = new Array(u), m = 0; m < u; m++)
                ((o[m] = l[m]), (r[m] = wn(h)));
              i = u;
            } else {
              for (
                F = new Array(u),
                  y = new Array(u),
                  c && (w = new Array(u)),
                  b = 0,
                  g = Math.min(i, u);
                b < g && o[b] === l[b];
                b++
              );
              for (
                g = i - 1, C = u - 1;
                g >= b && C >= b && o[g] === l[C];
                g--, C--
              )
                ((F[C] = r[g]), (y[C] = s[g]), c && (w[C] = c[g]));
              for (v = new Map(), H = new Array(C + 1), m = C; m >= b; m--)
                ((O = l[m]),
                  (f = v.get(O)),
                  (H[m] = f === void 0 ? -1 : f),
                  v.set(O, m));
              for (f = b; f <= g; f++)
                ((O = o[f]),
                  (m = v.get(O)),
                  m !== void 0 && m !== -1
                    ? ((F[m] = r[f]),
                      (y[m] = s[f]),
                      c && (w[m] = c[f]),
                      (m = H[m]),
                      v.set(O, m))
                    : s[f]());
              for (m = b; m < u; m++)
                m in F
                  ? ((r[m] = F[m]),
                    (s[m] = y[m]),
                    c && ((c[m] = w[m]), c[m](m)))
                  : (r[m] = wn(h));
              ((r = r.slice(0, (i = u))), (o = l.slice(0)));
            }
            return r;
          })
        );
        function h(v) {
          if (((s[m] = v), c)) {
            let [H, F] = $(m);
            return ((c[m] = F), t(l[m], H));
          }
          return t(l[m]);
        }
      }
    );
  }
  function Pp(e, t, n = {}) {
    let o = [],
      r = [],
      s = [],
      i = [],
      c = 0,
      l;
    return (
      _e(() => Ri(s)),
      () => {
        let u = e() || [],
          f = u.length;
        return (
          u[Tr],
          Et(() => {
            if (f === 0)
              return (
                c !== 0 &&
                  (Ri(s), (s = []), (o = []), (r = []), (c = 0), (i = [])),
                n.fallback &&
                  ((o = [ca]),
                  (r[0] = wn((h) => ((s[0] = h), n.fallback()))),
                  (c = 1)),
                r
              );
            for (
              o[0] === ca && (s[0](), (s = []), (o = []), (r = []), (c = 0)),
                l = 0;
              l < f;
              l++
            )
              l < o.length && o[l] !== u[l]
                ? i[l](() => u[l])
                : l >= o.length && (r[l] = wn(m));
            for (; l < o.length; l++) s[l]();
            return (
              (c = i.length = s.length = f),
              (o = u.slice(0)),
              (r = r.slice(0, c))
            );
          })
        );
        function m(h) {
          s[l] = h;
          let [v, H] = $(u[l]);
          return ((i[l] = H), t(v, l));
        }
      }
    );
  }
  function S(e, t) {
    return Et(() => e(t || {}));
  }
  function ki() {
    return true;
  }
  var Op = {
    get(e, t, n) {
      return t === Zt ? n : e.get(t);
    },
    has(e, t) {
      return t === Zt ? true : e.has(t);
    },
    set: ki,
    deleteProperty: ki,
    getOwnPropertyDescriptor(e, t) {
      return {
        configurable: true,
        enumerable: true,
        get() {
          return e.get(t);
        },
        set: ki,
        deleteProperty: ki,
      };
    },
    ownKeys(e) {
      return e.keys();
    },
  };
  function aa(e) {
    return (e = typeof e == "function" ? e() : e) ? e : {};
  }
  function Mp() {
    for (let e = 0, t = this.length; e < t; ++e) {
      let n = this[e]();
      if (n !== void 0) return n;
    }
  }
  function $o(...e) {
    let t = false;
    for (let i = 0; i < e.length; i++) {
      let c = e[i];
      ((t = t || (!!c && Zt in c)),
        (e[i] = typeof c == "function" ? ((t = true), ie(c)) : c));
    }
    if (vp && t)
      return new Proxy(
        {
          get(i) {
            for (let c = e.length - 1; c >= 0; c--) {
              let l = aa(e[c])[i];
              if (l !== void 0) return l;
            }
          },
          has(i) {
            for (let c = e.length - 1; c >= 0; c--)
              if (i in aa(e[c])) return true;
            return false;
          },
          keys() {
            let i = [];
            for (let c = 0; c < e.length; c++) i.push(...Object.keys(aa(e[c])));
            return [...new Set(i)];
          },
        },
        Op,
      );
    let n = {},
      o = Object.create(null);
    for (let i = e.length - 1; i >= 0; i--) {
      let c = e[i];
      if (!c) continue;
      let l = Object.getOwnPropertyNames(c);
      for (let u = l.length - 1; u >= 0; u--) {
        let f = l[u];
        if (f === "__proto__" || f === "constructor") continue;
        let m = Object.getOwnPropertyDescriptor(c, f);
        if (!o[f])
          o[f] = m.get
            ? {
                enumerable: true,
                configurable: true,
                get: Mp.bind((n[f] = [m.get.bind(c)])),
              }
            : m.value !== void 0
              ? m
              : void 0;
        else {
          let h = n[f];
          h &&
            (m.get
              ? h.push(m.get.bind(c))
              : m.value !== void 0 && h.push(() => m.value));
        }
      }
    }
    let r = {},
      s = Object.keys(o);
    for (let i = s.length - 1; i >= 0; i--) {
      let c = s[i],
        l = o[c];
      l && l.get
        ? Object.defineProperty(r, c, l)
        : (r[c] = l ? l.value : void 0);
    }
    return r;
  }
  var Ip = (e) => `Stale read from <${e}>.`;
  function Jt(e) {
    let t = "fallback" in e && { fallback: () => e.fallback };
    return ie(_p(() => e.each, e.children, t || void 0));
  }
  function $i(e) {
    let t = "fallback" in e && { fallback: () => e.fallback };
    return ie(Pp(() => e.each, e.children, t || void 0));
  }
  function ue(e) {
    let t = e.keyed,
      n = ie(() => e.when, void 0, void 0),
      o = t ? n : ie(n, void 0, { equals: (r, s) => !r == !s });
    return ie(
      () => {
        let r = o();
        if (r) {
          let s = e.children;
          return typeof s == "function" && s.length > 0
            ? Et(() =>
                s(
                  t
                    ? r
                    : () => {
                        if (!Et(o)) throw Ip("Show");
                        return n();
                      },
                ),
              )
            : s;
        }
        return e.fallback;
      },
      void 0,
      void 0,
    );
  }
  var Np = [
      "allowfullscreen",
      "async",
      "alpha",
      "autofocus",
      "autoplay",
      "checked",
      "controls",
      "default",
      "disabled",
      "formnovalidate",
      "hidden",
      "indeterminate",
      "inert",
      "ismap",
      "loop",
      "multiple",
      "muted",
      "nomodule",
      "novalidate",
      "open",
      "playsinline",
      "readonly",
      "required",
      "reversed",
      "seamless",
      "selected",
      "adauctionheaders",
      "browsingtopics",
      "credentialless",
      "defaultchecked",
      "defaultmuted",
      "defaultselected",
      "defer",
      "disablepictureinpicture",
      "disableremoteplayback",
      "preservespitch",
      "shadowrootclonable",
      "shadowrootcustomelementregistry",
      "shadowrootdelegatesfocus",
      "shadowrootserializable",
      "sharedstoragewritable",
    ],
    Lp = new Set([
      "className",
      "value",
      "readOnly",
      "noValidate",
      "formNoValidate",
      "isMap",
      "noModule",
      "playsInline",
      "adAuctionHeaders",
      "allowFullscreen",
      "browsingTopics",
      "defaultChecked",
      "defaultMuted",
      "defaultSelected",
      "disablePictureInPicture",
      "disableRemotePlayback",
      "preservesPitch",
      "shadowRootClonable",
      "shadowRootCustomElementRegistry",
      "shadowRootDelegatesFocus",
      "shadowRootSerializable",
      "sharedStorageWritable",
      ...Np,
    ]),
    Dp = new Set(["innerHTML", "textContent", "innerText", "children"]),
    Fp = Object.assign(Object.create(null), {
      className: "class",
      htmlFor: "for",
    }),
    Hp = Object.assign(Object.create(null), {
      class: "className",
      novalidate: { $: "noValidate", FORM: 1 },
      formnovalidate: { $: "formNoValidate", BUTTON: 1, INPUT: 1 },
      ismap: { $: "isMap", IMG: 1 },
      nomodule: { $: "noModule", SCRIPT: 1 },
      playsinline: { $: "playsInline", VIDEO: 1 },
      readonly: { $: "readOnly", INPUT: 1, TEXTAREA: 1 },
      adauctionheaders: { $: "adAuctionHeaders", IFRAME: 1 },
      allowfullscreen: { $: "allowFullscreen", IFRAME: 1 },
      browsingtopics: { $: "browsingTopics", IMG: 1 },
      defaultchecked: { $: "defaultChecked", INPUT: 1 },
      defaultmuted: { $: "defaultMuted", AUDIO: 1, VIDEO: 1 },
      defaultselected: { $: "defaultSelected", OPTION: 1 },
      disablepictureinpicture: { $: "disablePictureInPicture", VIDEO: 1 },
      disableremoteplayback: { $: "disableRemotePlayback", AUDIO: 1, VIDEO: 1 },
      preservespitch: { $: "preservesPitch", AUDIO: 1, VIDEO: 1 },
      shadowrootclonable: { $: "shadowRootClonable", TEMPLATE: 1 },
      shadowrootdelegatesfocus: { $: "shadowRootDelegatesFocus", TEMPLATE: 1 },
      shadowrootserializable: { $: "shadowRootSerializable", TEMPLATE: 1 },
      sharedstoragewritable: { $: "sharedStorageWritable", IFRAME: 1, IMG: 1 },
    });
  function $p(e, t) {
    let n = Hp[e];
    return typeof n == "object" ? (n[t] ? n.$ : void 0) : n;
  }
  var Bp = new Set([
    "beforeinput",
    "click",
    "dblclick",
    "contextmenu",
    "focusin",
    "focusout",
    "input",
    "keydown",
    "keyup",
    "mousedown",
    "mousemove",
    "mouseout",
    "mouseover",
    "mouseup",
    "pointerdown",
    "pointermove",
    "pointerout",
    "pointerover",
    "pointerup",
    "touchend",
    "touchmove",
    "touchstart",
  ]);
  var Be = (e) => ie(() => e());
  function Vp(e, t, n) {
    let o = n.length,
      r = t.length,
      s = o,
      i = 0,
      c = 0,
      l = t[r - 1].nextSibling,
      u = null;
    for (; i < r || c < s; ) {
      if (t[i] === n[c]) {
        (i++, c++);
        continue;
      }
      for (; t[r - 1] === n[s - 1]; ) (r--, s--);
      if (r === i) {
        let f = s < o ? (c ? n[c - 1].nextSibling : n[s - c]) : l;
        for (; c < s; ) e.insertBefore(n[c++], f);
      } else if (s === c)
        for (; i < r; ) ((!u || !u.has(t[i])) && t[i].remove(), i++);
      else if (t[i] === n[s - 1] && n[c] === t[r - 1]) {
        let f = t[--r].nextSibling;
        (e.insertBefore(n[c++], t[i++].nextSibling),
          e.insertBefore(n[--s], f),
          (t[r] = n[s]));
      } else {
        if (!u) {
          u = new Map();
          let m = c;
          for (; m < s; ) u.set(n[m], m++);
        }
        let f = u.get(t[i]);
        if (f != null)
          if (c < f && f < s) {
            let m = i,
              h = 1,
              v;
            for (
              ;
              ++m < r && m < s && !((v = u.get(t[m])) == null || v !== f + h);
            )
              h++;
            if (h > f - c) {
              let H = t[i];
              for (; c < f; ) e.insertBefore(n[c++], H);
            } else e.replaceChild(n[c++], t[i++]);
          } else i++;
        else t[i++].remove();
      }
    }
  }
  var Mc = "_$DX_DELEGATE";
  function Lc(e, t, n, o = {}) {
    let r;
    return (
      wn((s) => {
        ((r = s),
          t === document ? e() : M(t, e(), t.firstChild ? null : void 0, n));
      }, o.owner),
      () => {
        (r(), (t.textContent = ""));
      }
    );
  }
  function D(e, t, n, o) {
    let r,
      s = () => {
        let c = document.createElement("template");
        return ((c.innerHTML = e), c.content.firstChild);
      },
      i = () => (r || (r = s())).cloneNode(true);
    return ((i.cloneNode = i), i);
  }
  function Qe(e, t = window.document) {
    let n = t[Mc] || (t[Mc] = new Set());
    for (let o = 0, r = e.length; o < r; o++) {
      let s = e[o];
      n.has(s) || (n.add(s), t.addEventListener(s, Xp));
    }
  }
  function ne(e, t, n) {
    n == null ? e.removeAttribute(t) : e.setAttribute(t, n);
  }
  function Up(e, t, n) {
    n ? e.setAttribute(t, "") : e.removeAttribute(t);
  }
  function we(e, t) {
    t == null ? e.removeAttribute("class") : (e.className = t);
  }
  function Se(e, t, n, o) {
    if (o)
      Array.isArray(n)
        ? ((e[`$$${t}`] = n[0]), (e[`$$${t}Data`] = n[1]))
        : (e[`$$${t}`] = n);
    else if (Array.isArray(n)) {
      let r = n[0];
      e.addEventListener(t, (n[0] = (s) => r.call(e, n[1], s)));
    } else e.addEventListener(t, n, typeof n != "function" && n);
  }
  function mo(e, t, n = {}) {
    let o = Object.keys(t || {}),
      r = Object.keys(n),
      s,
      i;
    for (s = 0, i = r.length; s < i; s++) {
      let c = r[s];
      !c || c === "undefined" || t[c] || (Ic(e, c, false), delete n[c]);
    }
    for (s = 0, i = o.length; s < i; s++) {
      let c = o[s],
        l = !!t[c];
      !c ||
        c === "undefined" ||
        n[c] === l ||
        !l ||
        (Ic(e, c, true), (n[c] = l));
    }
    return n;
  }
  function jp(e, t, n) {
    if (!t) return n ? ne(e, "style") : t;
    let o = e.style;
    if (typeof t == "string") return (o.cssText = t);
    (typeof n == "string" && (o.cssText = n = void 0),
      n || (n = {}),
      t || (t = {}));
    let r, s;
    for (s in n) (t[s] == null && o.removeProperty(s), delete n[s]);
    for (s in t) ((r = t[s]), r !== n[s] && (o.setProperty(s, r), (n[s] = r)));
    return n;
  }
  function pe(e, t, n) {
    n != null ? e.style.setProperty(t, n) : e.style.removeProperty(t);
  }
  function _r(e, t = {}, n, o) {
    let r = {};
    return (
      Y(() => typeof t.ref == "function" && We(t.ref, e)),
      Y(() => Wp(e, t, n, true, r, true)),
      r
    );
  }
  function We(e, t, n) {
    return Et(() => e(t, n));
  }
  function M(e, t, n, o) {
    if ((n !== void 0 && !o && (o = []), typeof t != "function"))
      return zo(e, t, o, n);
    Y((r) => zo(e, t(), r, n), o);
  }
  function Wp(e, t, n, o, r = {}, s = false) {
    t || (t = {});
    for (let i in r)
      if (!(i in t)) {
        if (i === "children") continue;
        r[i] = Rc(e, i, null, r[i], n, s, t);
      }
    for (let i in t) {
      if (i === "children") {
        continue;
      }
      let c = t[i];
      r[i] = Rc(e, i, c, r[i], n, s, t);
    }
  }
  function Kp(e) {
    return e.toLowerCase().replace(/-([a-z])/g, (t, n) => n.toUpperCase());
  }
  function Ic(e, t, n) {
    let o = t.trim().split(/\s+/);
    for (let r = 0, s = o.length; r < s; r++) e.classList.toggle(o[r], n);
  }
  function Rc(e, t, n, o, r, s, i) {
    let c, l, u, f, m;
    if (t === "style") return jp(e, n, o);
    if (t === "classList") return mo(e, n, o);
    if (n === o) return o;
    if (t === "ref") s || n(e);
    else if (t.slice(0, 3) === "on:") {
      let h = t.slice(3);
      (o && e.removeEventListener(h, o, typeof o != "function" && o),
        n && e.addEventListener(h, n, typeof n != "function" && n));
    } else if (t.slice(0, 10) === "oncapture:") {
      let h = t.slice(10);
      (o && e.removeEventListener(h, o, true),
        n && e.addEventListener(h, n, true));
    } else if (t.slice(0, 2) === "on") {
      let h = t.slice(2).toLowerCase(),
        v = Bp.has(h);
      if (!v && o) {
        let H = Array.isArray(o) ? o[0] : o;
        e.removeEventListener(h, H);
      }
      (v || n) && (Se(e, h, n, v), v && Qe([h]));
    } else if (t.slice(0, 5) === "attr:") ne(e, t.slice(5), n);
    else if (t.slice(0, 5) === "bool:") Up(e, t.slice(5), n);
    else if (
      (m = t.slice(0, 5) === "prop:") ||
      (u = Dp.has(t)) ||
      (f = $p(t, e.tagName)) ||
      (l = Lp.has(t)) ||
      (c = e.nodeName.includes("-") || "is" in i)
    ) {
      if (m) ((t = t.slice(5)), (l = true));
      t === "class" || t === "className"
        ? we(e, n)
        : c && !l && !u
          ? (e[Kp(t)] = n)
          : (e[f || t] = n);
    } else {
      ne(e, Fp[t] || t, n);
    }
    return n;
  }
  function Xp(e) {
    let t = e.target,
      n = `$$${e.type}`,
      o = e.target,
      r = e.currentTarget,
      s = (l) =>
        Object.defineProperty(e, "target", { configurable: true, value: l }),
      i = () => {
        let l = t[n];
        if (l && !t.disabled) {
          let u = t[`${n}Data`];
          if ((u !== void 0 ? l.call(t, u, e) : l.call(t, e), e.cancelBubble))
            return;
        }
        return (
          t.host &&
            typeof t.host != "string" &&
            !t.host._$host &&
            t.contains(e.target) &&
            s(t.host),
          true
        );
      },
      c = () => {
        for (; i() && (t = t._$host || t.parentNode || t.host); );
      };
    if (
      (Object.defineProperty(e, "currentTarget", {
        configurable: true,
        get() {
          return t || document;
        },
      }),
      e.composedPath)
    ) {
      let l = e.composedPath();
      s(l[0]);
      for (let u = 0; u < l.length - 2 && ((t = l[u]), !!i()); u++) {
        if (t._$host) {
          ((t = t._$host), c());
          break;
        }
        if (t.parentNode === r) break;
      }
    } else c();
    s(o);
  }
  function zo(e, t, n, o, r) {
    for (; typeof n == "function"; ) n = n();
    if (t === n) return n;
    let i = typeof t,
      c = o !== void 0;
    if (
      ((e = (c && n[0] && n[0].parentNode) || e),
      i === "string" || i === "number")
    ) {
      if (i === "number" && ((t = t.toString()), t === n)) return n;
      if (c) {
        let l = n[0];
        (l && l.nodeType === 3
          ? l.data !== t && (l.data = t)
          : (l = document.createTextNode(t)),
          (n = Bo(e, n, o, l)));
      } else
        n !== "" && typeof n == "string"
          ? (n = e.firstChild.data = t)
          : (n = e.textContent = t);
    } else if (t == null || i === "boolean") {
      n = Bo(e, n, o);
    } else {
      if (i === "function")
        return (
          Y(() => {
            let l = t();
            for (; typeof l == "function"; ) l = l();
            n = zo(e, l, n, o);
          }),
          () => n
        );
      if (Array.isArray(t)) {
        let l = [],
          u = n && Array.isArray(n);
        if (da(l, t, n, r))
          return (Y(() => (n = zo(e, l, n, o, true))), () => n);
        if (l.length === 0) {
          if (((n = Bo(e, n, o)), c)) return n;
        } else
          u
            ? n.length === 0
              ? Nc(e, l, o)
              : Vp(e, n, l)
            : (n && Bo(e), Nc(e, l));
        n = l;
      } else if (t.nodeType) {
        if (Array.isArray(n)) {
          if (c) return (n = Bo(e, n, o, t));
          Bo(e, n, null, t);
        } else
          n == null || n === "" || !e.firstChild
            ? e.appendChild(t)
            : e.replaceChild(t, e.firstChild);
        n = t;
      }
    }
    return n;
  }
  function da(e, t, n, o) {
    let r = false;
    for (let s = 0, i = t.length; s < i; s++) {
      let c = t[s],
        l = n && n[e.length],
        u;
      if (!(c == null || c === true || c === false))
        if ((u = typeof c) == "object" && c.nodeType) e.push(c);
        else if (Array.isArray(c)) r = da(e, c, l) || r;
        else if (u === "function")
          if (o) {
            for (; typeof c == "function"; ) c = c();
            r =
              da(e, Array.isArray(c) ? c : [c], Array.isArray(l) ? l : [l]) ||
              r;
          } else (e.push(c), (r = true));
        else {
          let f = String(c);
          l && l.nodeType === 3 && l.data === f
            ? e.push(l)
            : e.push(document.createTextNode(f));
        }
    }
    return r;
  }
  function Nc(e, t, n = null) {
    for (let o = 0, r = t.length; o < r; o++) e.insertBefore(t[o], n);
  }
  function Bo(e, t, n, o) {
    if (n === void 0) return (e.textContent = "");
    let r = o || document.createTextNode("");
    if (t.length) {
      let s = false;
      for (let i = t.length - 1; i >= 0; i--) {
        let c = t[i];
        if (r !== c) {
          let l = c.parentNode === e;
          !s && !i
            ? l
              ? e.replaceChild(r, c)
              : e.insertBefore(r, n)
            : l && c.remove();
        } else s = true;
      }
    } else e.insertBefore(r, n);
    return [r];
  }
  var fa = `/*! tailwindcss v4.1.17 | MIT License | https://tailwindcss.com */
@layer properties{@supports (((-webkit-hyphens:none)) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){*,:before,:after,::backdrop{--tw-translate-x:0;--tw-translate-y:0;--tw-translate-z:0;--tw-scale-x:1;--tw-scale-y:1;--tw-scale-z:1;--tw-rotate-x:initial;--tw-rotate-y:initial;--tw-rotate-z:initial;--tw-skew-x:initial;--tw-skew-y:initial;--tw-border-style:solid;--tw-leading:initial;--tw-font-weight:initial;--tw-ordinal:initial;--tw-slashed-zero:initial;--tw-numeric-figure:initial;--tw-numeric-spacing:initial;--tw-numeric-fraction:initial;--tw-shadow:0 0 #0000;--tw-shadow-color:initial;--tw-shadow-alpha:100%;--tw-inset-shadow:0 0 #0000;--tw-inset-shadow-color:initial;--tw-inset-shadow-alpha:100%;--tw-ring-color:initial;--tw-ring-shadow:0 0 #0000;--tw-inset-ring-color:initial;--tw-inset-ring-shadow:0 0 #0000;--tw-ring-inset:initial;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-outline-style:solid;--tw-blur:initial;--tw-brightness:initial;--tw-contrast:initial;--tw-grayscale:initial;--tw-hue-rotate:initial;--tw-invert:initial;--tw-opacity:initial;--tw-saturate:initial;--tw-sepia:initial;--tw-drop-shadow:initial;--tw-drop-shadow-color:initial;--tw-drop-shadow-alpha:100%;--tw-drop-shadow-size:initial;--tw-backdrop-blur:initial;--tw-backdrop-brightness:initial;--tw-backdrop-contrast:initial;--tw-backdrop-grayscale:initial;--tw-backdrop-hue-rotate:initial;--tw-backdrop-invert:initial;--tw-backdrop-opacity:initial;--tw-backdrop-saturate:initial;--tw-backdrop-sepia:initial;--tw-duration:initial;--tw-ease:initial;--tw-contain-size:initial;--tw-contain-layout:initial;--tw-contain-paint:initial;--tw-contain-style:initial;--tw-content:""}}}@layer theme{:root,:host{--font-sans:"Geist",ui-sans-serif,system-ui,sans-serif;--font-mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;--color-yellow-500:oklch(79.5% .184 86.047);--color-black:#000;--color-white:#fff;--spacing:4px;--text-sm:14px;--text-sm--line-height:calc(1.25/.875);--font-weight-medium:500;--radius-sm:4px;--ease-out:cubic-bezier(0,0,.2,1);--animate-ping:ping 1s cubic-bezier(0,0,.2,1)infinite;--animate-pulse:pulse 2s cubic-bezier(.4,0,.6,1)infinite;--default-transition-duration:.15s;--default-transition-timing-function:cubic-bezier(.4,0,.2,1);--default-font-family:var(--font-sans);--default-mono-font-family:var(--font-mono);--transition-fast:.1s;--transition-normal:.15s;--transition-slow:.2s}}@layer base{*,:after,:before,::backdrop{box-sizing:border-box;border:0 solid;margin:0;padding:0}::file-selector-button{box-sizing:border-box;border:0 solid;margin:0;padding:0}html,:host{-webkit-text-size-adjust:100%;tab-size:4;line-height:1.5;font-family:var(--default-font-family,ui-sans-serif,system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji");font-feature-settings:var(--default-font-feature-settings,normal);font-variation-settings:var(--default-font-variation-settings,normal);-webkit-tap-highlight-color:transparent}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:var(--default-mono-font-family,ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace);font-feature-settings:var(--default-mono-font-feature-settings,normal);font-variation-settings:var(--default-mono-font-variation-settings,normal);font-size:1em}small{font-size:80%}sub,sup{vertical-align:baseline;font-size:75%;line-height:0;position:relative}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}:-moz-focusring{outline:auto}progress{vertical-align:baseline}summary{display:list-item}ol,ul,menu{list-style:none}img,svg,video,canvas,audio,iframe,embed,object{vertical-align:middle;display:block}img,video{max-width:100%;height:auto}button,input,select,optgroup,textarea{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}::file-selector-button{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}:where(select:is([multiple],[size])) optgroup{font-weight:bolder}:where(select:is([multiple],[size])) optgroup option{padding-inline-start:20px}::file-selector-button{margin-inline-end:4px}::placeholder{opacity:1}@supports (not ((-webkit-appearance:-apple-pay-button))) or (contain-intrinsic-size:1px){::placeholder{color:currentColor}@supports (color:color-mix(in lab, red, red)){::placeholder{color:color-mix(in oklab,currentcolor 50%,transparent)}}}textarea{resize:vertical}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-date-and-time-value{min-height:1lh;text-align:inherit}::-webkit-datetime-edit{display:inline-flex}::-webkit-datetime-edit-fields-wrapper{padding:0}::-webkit-datetime-edit{padding-block:0}::-webkit-datetime-edit-year-field{padding-block:0}::-webkit-datetime-edit-month-field{padding-block:0}::-webkit-datetime-edit-day-field{padding-block:0}::-webkit-datetime-edit-hour-field{padding-block:0}::-webkit-datetime-edit-minute-field{padding-block:0}::-webkit-datetime-edit-second-field{padding-block:0}::-webkit-datetime-edit-millisecond-field{padding-block:0}::-webkit-datetime-edit-meridiem-field{padding-block:0}::-webkit-calendar-picker-indicator{line-height:1}:-moz-ui-invalid{box-shadow:none}button,input:where([type=button],[type=reset],[type=submit]){appearance:button}::file-selector-button{appearance:button}::-webkit-inner-spin-button{height:auto}::-webkit-outer-spin-button{height:auto}[hidden]:where(:not([hidden=until-found])){display:none!important}}@layer components;@layer utilities{.pointer-events-auto{pointer-events:auto}.pointer-events-none{pointer-events:none}.collapse{visibility:collapse}.invisible{visibility:hidden}.visible{visibility:visible}.touch-hitbox{position:relative}.touch-hitbox:before{content:"";width:100%;min-width:44px;height:100%;min-height:44px;display:block;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}.absolute{position:absolute}.fixed{position:fixed}.relative{position:relative}.-top-0\\.5{top:calc(var(--spacing)*-.5)}.top-0{top:calc(var(--spacing)*0)}.top-0\\.5{top:calc(var(--spacing)*.5)}.top-1\\/2{top:50%}.top-full{top:100%}.-right-0\\.5{right:calc(var(--spacing)*-.5)}.right-full{right:100%}.bottom-full{bottom:100%}.left-0{left:calc(var(--spacing)*0)}.left-0\\.5{left:calc(var(--spacing)*.5)}.left-1\\.5{left:calc(var(--spacing)*1.5)}.left-1\\/2{left:50%}.left-2\\.5{left:calc(var(--spacing)*2.5)}.left-full{left:100%}.z-1{z-index:1}.z-10{z-index:10}.container{width:100%}@media (min-width:640px){.container{max-width:640px}}@media (min-width:768px){.container{max-width:768px}}@media (min-width:1024px){.container{max-width:1024px}}@media (min-width:1280px){.container{max-width:1280px}}@media (min-width:1536px){.container{max-width:1536px}}.m-0{margin:calc(var(--spacing)*0)}.-mx-2{margin-inline:calc(var(--spacing)*-2)}.mx-0\\.5{margin-inline:calc(var(--spacing)*.5)}.-my-1\\.5{margin-block:calc(var(--spacing)*-1.5)}.my-0\\.5{margin-block:calc(var(--spacing)*.5)}.mt-0\\.5{margin-top:calc(var(--spacing)*.5)}.mt-2\\.5{margin-top:calc(var(--spacing)*2.5)}.mr-0\\.5{margin-right:calc(var(--spacing)*.5)}.mr-1\\.5{margin-right:calc(var(--spacing)*1.5)}.mr-2\\.5{margin-right:calc(var(--spacing)*2.5)}.mb-0\\.5{margin-bottom:calc(var(--spacing)*.5)}.mb-1{margin-bottom:calc(var(--spacing)*1)}.mb-1\\.5{margin-bottom:calc(var(--spacing)*1.5)}.mb-2\\.5{margin-bottom:calc(var(--spacing)*2.5)}.-ml-\\[2px\\]{margin-left:-2px}.ml-0\\.5{margin-left:calc(var(--spacing)*.5)}.ml-1{margin-left:calc(var(--spacing)*1)}.ml-2\\.5{margin-left:calc(var(--spacing)*2.5)}.ml-4{margin-left:calc(var(--spacing)*4)}.ml-auto{margin-left:auto}.line-clamp-5{-webkit-line-clamp:5;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.block{display:block}.flex{display:flex}.grid{display:grid}.hidden{display:none}.inline-block{display:inline-block}.inline-flex{display:inline-flex}.size-1\\.5{width:calc(var(--spacing)*1.5);height:calc(var(--spacing)*1.5)}.size-4{width:calc(var(--spacing)*4);height:calc(var(--spacing)*4)}.size-\\[18px\\]{width:18px;height:18px}.h-0{height:calc(var(--spacing)*0)}.h-1\\.5{height:calc(var(--spacing)*1.5)}.h-2{height:calc(var(--spacing)*2)}.h-2\\.5{height:calc(var(--spacing)*2.5)}.h-3{height:calc(var(--spacing)*3)}.h-3\\.5{height:calc(var(--spacing)*3.5)}.h-4{height:calc(var(--spacing)*4)}.h-\\[17px\\]{height:17px}.h-fit{height:fit-content}.max-h-\\[240px\\]{max-height:240px}.min-h-0{min-height:calc(var(--spacing)*0)}.min-h-4{min-height:calc(var(--spacing)*4)}.w-0{width:calc(var(--spacing)*0)}.w-1\\.5{width:calc(var(--spacing)*1.5)}.w-2{width:calc(var(--spacing)*2)}.w-3\\.5{width:calc(var(--spacing)*3.5)}.w-4{width:calc(var(--spacing)*4)}.w-5{width:calc(var(--spacing)*5)}.w-\\[calc\\(100\\%\\+16px\\)\\]{width:calc(100% + 16px)}.w-auto{width:auto}.w-fit{width:fit-content}.w-full{width:100%}.max-w-\\[280px\\]{max-width:280px}.max-w-full{max-width:100%}.min-w-0{min-width:calc(var(--spacing)*0)}.min-w-\\[100px\\]{min-width:100px}.min-w-\\[150px\\]{min-width:150px}.flex-1{flex:1}.flex-shrink,.shrink{flex-shrink:1}.shrink-0{flex-shrink:0}.flex-grow,.grow{flex-grow:1}.-translate-x-1\\/2{--tw-translate-x:calc(calc(1/2*100%)*-1);translate:var(--tw-translate-x)var(--tw-translate-y)}.-translate-y-1\\/2{--tw-translate-y:calc(calc(1/2*100%)*-1);translate:var(--tw-translate-x)var(--tw-translate-y)}.scale-75{--tw-scale-x:75%;--tw-scale-y:75%;--tw-scale-z:75%;scale:var(--tw-scale-x)var(--tw-scale-y)}.scale-100{--tw-scale-x:100%;--tw-scale-y:100%;--tw-scale-z:100%;scale:var(--tw-scale-x)var(--tw-scale-y)}.-rotate-90{rotate:-90deg}.rotate-0{rotate:none}.rotate-90{rotate:90deg}.rotate-180{rotate:180deg}.interactive-scale{transition-property:transform;transition-duration:var(--transition-normal);transition-timing-function:cubic-bezier(.34,1.56,.64,1)}@media (hover:hover) and (pointer:fine){.interactive-scale:hover{transform:scale(1.05)}}.interactive-scale:active{transform:scale(.97)}.press-scale{transition-property:transform;transition-duration:var(--transition-fast);transition-timing-function:ease-out}.press-scale:active{transform:scale(.97)}.transform{transform:var(--tw-rotate-x,)var(--tw-rotate-y,)var(--tw-rotate-z,)var(--tw-skew-x,)var(--tw-skew-y,)}.animate-\\[hint-flip-in_var\\(--transition-normal\\)_ease-out\\]{animation:hint-flip-in var(--transition-normal)ease-out}.animate-ping{animation:var(--animate-ping)}.animate-pulse{animation:var(--animate-pulse)}.cursor-grab{cursor:grab}.cursor-grabbing{cursor:grabbing}.cursor-pointer{cursor:pointer}.resize{resize:both}.resize-none{resize:none}.grid-cols-\\[0fr\\]{grid-template-columns:0fr}.grid-cols-\\[1fr\\]{grid-template-columns:1fr}.grid-rows-\\[0fr\\]{grid-template-rows:0fr}.grid-rows-\\[1fr\\]{grid-template-rows:1fr}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}.items-center{align-items:center}.items-end{align-items:flex-end}.items-start{align-items:flex-start}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.justify-end{justify-content:flex-end}.gap-0\\.5{gap:calc(var(--spacing)*.5)}.gap-1{gap:calc(var(--spacing)*1)}.gap-1\\.5{gap:calc(var(--spacing)*1.5)}.gap-2{gap:calc(var(--spacing)*2)}.gap-\\[5px\\]{gap:5px}.self-stretch{align-self:stretch}.truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.overflow-hidden{overflow:hidden}.overflow-visible{overflow:visible}.overflow-y-auto{overflow-y:auto}.rounded-\\[1px\\]{border-radius:1px}.rounded-\\[10px\\]{border-radius:10px}.rounded-full{border-radius:3.40282e38px}.rounded-sm{border-radius:var(--radius-sm)}.rounded-t-\\[10px\\]{border-top-left-radius:10px;border-top-right-radius:10px}.rounded-t-none{border-top-left-radius:0;border-top-right-radius:0}.rounded-l-\\[10px\\]{border-top-left-radius:10px;border-bottom-left-radius:10px}.rounded-l-none{border-top-left-radius:0;border-bottom-left-radius:0}.rounded-r-\\[10px\\]{border-top-right-radius:10px;border-bottom-right-radius:10px}.rounded-r-none{border-top-right-radius:0;border-bottom-right-radius:0}.rounded-b-\\[6px\\]{border-bottom-right-radius:6px;border-bottom-left-radius:6px}.rounded-b-\\[10px\\]{border-bottom-right-radius:10px;border-bottom-left-radius:10px}.rounded-b-none{border-bottom-right-radius:0;border-bottom-left-radius:0}.border{border-style:var(--tw-border-style);border-width:1px}.\\[border-width\\:0\\.5px\\]{border-width:.5px}.\\[border-top-width\\:0\\.5px\\]{border-top-width:.5px}.border-none{--tw-border-style:none;border-style:none}.border-solid{--tw-border-style:solid;border-style:solid}.border-\\[\\#B3B3B3\\]{border-color:#b3b3b3}.border-t-\\[\\#D9D9D9\\]{border-top-color:#d9d9d9}.bg-\\[\\#404040\\]{background-color:#404040}.bg-\\[\\#FEF2F2\\]{background-color:#fef2f2}.bg-black{background-color:var(--color-black)}.bg-black\\/5{background-color:#0000000d}@supports (color:color-mix(in lab, red, red)){.bg-black\\/5{background-color:color-mix(in oklab,var(--color-black)5%,transparent)}}.bg-black\\/25{background-color:#00000040}@supports (color:color-mix(in lab, red, red)){.bg-black\\/25{background-color:color-mix(in oklab,var(--color-black)25%,transparent)}}.bg-transparent{background-color:#0000}.bg-white{background-color:var(--color-white)}.bg-yellow-500{background-color:var(--color-yellow-500)}.p-0{padding:calc(var(--spacing)*0)}.px-0\\.25{padding-inline:calc(var(--spacing)*.25)}.px-1\\.5{padding-inline:calc(var(--spacing)*1.5)}.px-2{padding-inline:calc(var(--spacing)*2)}.px-\\[3px\\]{padding-inline:3px}.py-0\\.5{padding-block:calc(var(--spacing)*.5)}.py-0\\.25{padding-block:calc(var(--spacing)*.25)}.py-1{padding-block:calc(var(--spacing)*1)}.py-1\\.5{padding-block:calc(var(--spacing)*1.5)}.py-2{padding-block:calc(var(--spacing)*2)}.py-px{padding-block:1px}.pt-1\\.5{padding-top:calc(var(--spacing)*1.5)}.pb-1{padding-bottom:calc(var(--spacing)*1)}.text-left{text-align:left}.font-sans{font-family:var(--font-sans)}.text-sm{font-size:var(--text-sm);line-height:var(--tw-leading,var(--text-sm--line-height))}.text-\\[10px\\]{font-size:10px}.text-\\[11px\\]{font-size:11px}.text-\\[12px\\]{font-size:12px}.text-\\[13px\\]{font-size:13px}.leading-3{--tw-leading:calc(var(--spacing)*3);line-height:calc(var(--spacing)*3)}.leading-3\\.5{--tw-leading:calc(var(--spacing)*3.5);line-height:calc(var(--spacing)*3.5)}.leading-4{--tw-leading:calc(var(--spacing)*4);line-height:calc(var(--spacing)*4)}.leading-none{--tw-leading:1;line-height:1}.font-medium{--tw-font-weight:var(--font-weight-medium);font-weight:var(--font-weight-medium)}.wrap-break-word{overflow-wrap:break-word}.text-ellipsis{text-overflow:ellipsis}.whitespace-nowrap{white-space:nowrap}.text-\\[\\#71717a\\]{color:#71717a}.text-\\[\\#B3B3B3\\]{color:#b3b3b3}.text-\\[\\#B91C1C\\]{color:#b91c1c}.text-\\[\\#B91C1C\\]\\/50{color:oklab(50.542% .168942 .0880134/.5)}.text-black{color:var(--color-black)}.text-black\\/25{color:#00000040}@supports (color:color-mix(in lab, red, red)){.text-black\\/25{color:color-mix(in oklab,var(--color-black)25%,transparent)}}.text-black\\/30{color:#0000004d}@supports (color:color-mix(in lab, red, red)){.text-black\\/30{color:color-mix(in oklab,var(--color-black)30%,transparent)}}.text-black\\/40{color:#0006}@supports (color:color-mix(in lab, red, red)){.text-black\\/40{color:color-mix(in oklab,var(--color-black)40%,transparent)}}.text-black\\/50{color:#00000080}@supports (color:color-mix(in lab, red, red)){.text-black\\/50{color:color-mix(in oklab,var(--color-black)50%,transparent)}}.text-black\\/60{color:#0009}@supports (color:color-mix(in lab, red, red)){.text-black\\/60{color:color-mix(in oklab,var(--color-black)60%,transparent)}}.text-black\\/70{color:#000000b3}@supports (color:color-mix(in lab, red, red)){.text-black\\/70{color:color-mix(in oklab,var(--color-black)70%,transparent)}}.text-black\\/80{color:#000c}@supports (color:color-mix(in lab, red, red)){.text-black\\/80{color:color-mix(in oklab,var(--color-black)80%,transparent)}}.text-black\\/85{color:#000000d9}@supports (color:color-mix(in lab, red, red)){.text-black\\/85{color:color-mix(in oklab,var(--color-black)85%,transparent)}}.text-white{color:var(--color-white)}.italic{font-style:italic}.tabular-nums{--tw-numeric-spacing:tabular-nums;font-variant-numeric:var(--tw-ordinal,)var(--tw-slashed-zero,)var(--tw-numeric-figure,)var(--tw-numeric-spacing,)var(--tw-numeric-fraction,)}.antialiased{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}.opacity-0{opacity:0}.opacity-35{opacity:.35}.opacity-40{opacity:.4}.opacity-50{opacity:.5}.opacity-100{opacity:1}.shadow{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,#0000001a),0 1px 2px -1px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.outline{outline-style:var(--tw-outline-style);outline-width:1px}.blur{--tw-blur:blur(8px);filter:var(--tw-blur,)var(--tw-brightness,)var(--tw-contrast,)var(--tw-grayscale,)var(--tw-hue-rotate,)var(--tw-invert,)var(--tw-saturate,)var(--tw-sepia,)var(--tw-drop-shadow,)}.filter{filter:var(--tw-blur,)var(--tw-brightness,)var(--tw-contrast,)var(--tw-grayscale,)var(--tw-hue-rotate,)var(--tw-invert,)var(--tw-saturate,)var(--tw-sepia,)var(--tw-drop-shadow,)}.filter-\\[drop-shadow\\(0px_1px_2px_\\#51515140\\)\\]{filter:drop-shadow(0 1px 2px #51515140)}.backdrop-filter{-webkit-backdrop-filter:var(--tw-backdrop-blur,)var(--tw-backdrop-brightness,)var(--tw-backdrop-contrast,)var(--tw-backdrop-grayscale,)var(--tw-backdrop-hue-rotate,)var(--tw-backdrop-invert,)var(--tw-backdrop-opacity,)var(--tw-backdrop-saturate,)var(--tw-backdrop-sepia,);backdrop-filter:var(--tw-backdrop-blur,)var(--tw-backdrop-brightness,)var(--tw-backdrop-contrast,)var(--tw-backdrop-grayscale,)var(--tw-backdrop-hue-rotate,)var(--tw-backdrop-invert,)var(--tw-backdrop-opacity,)var(--tw-backdrop-saturate,)var(--tw-backdrop-sepia,)}.transition{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to,opacity,box-shadow,transform,translate,scale,rotate,filter,-webkit-backdrop-filter,backdrop-filter,display,content-visibility,overlay,pointer-events;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-\\[grid-template-columns\\,opacity\\]{transition-property:grid-template-columns,opacity;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-\\[grid-template-rows\\,opacity\\]{transition-property:grid-template-rows,opacity;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-\\[opacity\\,transform\\]{transition-property:opacity,transform;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-\\[top\\,left\\,width\\,height\\,opacity\\]{transition-property:top,left,width,height,opacity;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-\\[transform\\,opacity\\]{transition-property:transform,opacity;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-all{transition-property:all;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-colors{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-opacity{transition-property:opacity;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-transform{transition-property:transform,translate,scale,rotate;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.duration-75{--tw-duration:75ms;transition-duration:75ms}.duration-100{--tw-duration:.1s;transition-duration:.1s}.duration-150{--tw-duration:.15s;transition-duration:.15s}.duration-300{--tw-duration:.3s;transition-duration:.3s}.ease-out{--tw-ease:var(--ease-out);transition-timing-function:var(--ease-out)}.will-change-\\[opacity\\,transform\\]{will-change:opacity,transform}.contain-layout{--tw-contain-layout:layout;contain:var(--tw-contain-size,)var(--tw-contain-layout,)var(--tw-contain-paint,)var(--tw-contain-style,)}.outline-none{--tw-outline-style:none;outline-style:none}.select-none{-webkit-user-select:none;user-select:none}.\\[animation-fill-mode\\:backwards\\]{animation-fill-mode:backwards}.\\[corner-shape\\:superellipse\\(1\\.25\\)\\]{corner-shape:superellipse(1.25)}.\\[font-synthesis\\:none\\]{font-synthesis:none}.\\[grid-area\\:1\\/1\\]{grid-area:1/1}.\\[scrollbar-color\\:transparent_transparent\\]{scrollbar-color:transparent transparent}.\\[scrollbar-width\\:thin\\]{scrollbar-width:thin}.group-focus-within\\:invisible:is(:where(.group):focus-within *){visibility:hidden}.group-focus-within\\:visible:is(:where(.group):focus-within *){visibility:visible}@media (hover:hover){.group-hover\\:invisible:is(:where(.group):hover *){visibility:hidden}.group-hover\\:visible:is(:where(.group):hover *){visibility:visible}}.before\\:\\!min-h-full:before{content:var(--tw-content);min-height:100%!important}.before\\:\\!min-w-full:before{content:var(--tw-content);min-width:100%!important}@media (hover:hover){.hover\\:bg-\\[\\#F5F5F5\\]:hover{background-color:#f5f5f5}.hover\\:bg-\\[\\#FEE2E2\\]:hover{background-color:#fee2e2}.hover\\:bg-black\\/10:hover{background-color:#0000001a}@supports (color:color-mix(in lab, red, red)){.hover\\:bg-black\\/10:hover{background-color:color-mix(in oklab,var(--color-black)10%,transparent)}}.hover\\:text-\\[\\#B91C1C\\]:hover{color:#b91c1c}.hover\\:text-black:hover{color:var(--color-black)}.hover\\:text-black\\/60:hover{color:#0009}@supports (color:color-mix(in lab, red, red)){.hover\\:text-black\\/60:hover{color:color-mix(in oklab,var(--color-black)60%,transparent)}}.hover\\:opacity-100:hover{opacity:1}.hover\\:\\[scrollbar-color\\:rgba\\(0\\,0\\,0\\,0\\.15\\)_transparent\\]:hover{scrollbar-color:#00000026 transparent}}.disabled\\:cursor-default:disabled{cursor:default}.disabled\\:opacity-40:disabled{opacity:.4}}:host{all:initial;direction:ltr}@keyframes shake{0%,to{transform:translate(0)}15%{transform:translate(-3px)}30%{transform:translate(3px)}45%{transform:translate(-3px)}60%{transform:translate(3px)}75%{transform:translate(-2px)}90%{transform:translate(2px)}}@keyframes pop-in{0%{opacity:0;transform:scale(.9)}70%{opacity:1;transform:scale(1.02)}to{opacity:1;transform:scale(1)}}@keyframes pop-out{0%{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.95)}}@keyframes slide-in-bottom{0%{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes slide-in-top{0%{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}@keyframes slide-in-left{0%{opacity:0;transform:translate(-8px)}to{opacity:1;transform:translate(0)}}@keyframes slide-in-right{0%{opacity:0;transform:translate(8px)}to{opacity:1;transform:translate(0)}}@keyframes success-pop{0%{opacity:0;transform:scale(.9)}60%{opacity:1;transform:scale(1.1)}80%{transform:scale(.95)}to{opacity:1;transform:scale(1)}}@keyframes hint-flip-in{0%{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes tooltip-fade-in{0%{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}@keyframes icon-loader-spin{0%{opacity:1}50%{opacity:.5}to{opacity:.2}}.icon-loader-bar{animation:.5s linear infinite icon-loader-spin}@keyframes shimmer{0%{background-position:200% 0}to{background-position:-200% 0}}.shimmer-text{color:#0000;background:linear-gradient(90deg,#71717a 0%,#a1a1aa 25%,#71717a 50%,#a1a1aa 75%,#71717a 100%) 0 0/200% 100%;-webkit-background-clip:text;background-clip:text;animation:2.5s linear infinite shimmer}@keyframes clock-flash{0%{transform:scale(1)}25%{transform:scale(1.2)}50%{transform:scale(.92)}75%{transform:scale(1.05)}to{transform:scale(1)}}.animate-clock-flash{will-change:transform;animation:.4s ease-out clock-flash}.animate-shake{will-change:transform;animation:.3s ease-out shake}.animate-pop-in{animation:pop-in var(--transition-normal)ease-out;will-change:transform,opacity}.animate-pop-out{animation:pop-out var(--transition-normal)ease-out forwards;will-change:transform,opacity}.animate-slide-in-bottom{animation:slide-in-bottom var(--transition-slow)ease-out;will-change:transform,opacity}.animate-slide-in-top{animation:slide-in-top var(--transition-slow)ease-out;will-change:transform,opacity}.animate-slide-in-left{animation:slide-in-left var(--transition-slow)ease-out;will-change:transform,opacity}.animate-slide-in-right{animation:slide-in-right var(--transition-slow)ease-out;will-change:transform,opacity}.animate-success-pop{will-change:transform,opacity;animation:.25s ease-out success-pop}.animate-tooltip-fade-in{animation:tooltip-fade-in var(--transition-fast)ease-out;will-change:transform,opacity}@property --tw-translate-x{syntax:"*";inherits:false;initial-value:0}@property --tw-translate-y{syntax:"*";inherits:false;initial-value:0}@property --tw-translate-z{syntax:"*";inherits:false;initial-value:0}@property --tw-scale-x{syntax:"*";inherits:false;initial-value:1}@property --tw-scale-y{syntax:"*";inherits:false;initial-value:1}@property --tw-scale-z{syntax:"*";inherits:false;initial-value:1}@property --tw-rotate-x{syntax:"*";inherits:false}@property --tw-rotate-y{syntax:"*";inherits:false}@property --tw-rotate-z{syntax:"*";inherits:false}@property --tw-skew-x{syntax:"*";inherits:false}@property --tw-skew-y{syntax:"*";inherits:false}@property --tw-border-style{syntax:"*";inherits:false;initial-value:solid}@property --tw-leading{syntax:"*";inherits:false}@property --tw-font-weight{syntax:"*";inherits:false}@property --tw-ordinal{syntax:"*";inherits:false}@property --tw-slashed-zero{syntax:"*";inherits:false}@property --tw-numeric-figure{syntax:"*";inherits:false}@property --tw-numeric-spacing{syntax:"*";inherits:false}@property --tw-numeric-fraction{syntax:"*";inherits:false}@property --tw-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-shadow-color{syntax:"*";inherits:false}@property --tw-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-inset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-shadow-color{syntax:"*";inherits:false}@property --tw-inset-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-ring-color{syntax:"*";inherits:false}@property --tw-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-ring-color{syntax:"*";inherits:false}@property --tw-inset-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-ring-inset{syntax:"*";inherits:false}@property --tw-ring-offset-width{syntax:"<length>";inherits:false;initial-value:0}@property --tw-ring-offset-color{syntax:"*";inherits:false;initial-value:#fff}@property --tw-ring-offset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-outline-style{syntax:"*";inherits:false;initial-value:solid}@property --tw-blur{syntax:"*";inherits:false}@property --tw-brightness{syntax:"*";inherits:false}@property --tw-contrast{syntax:"*";inherits:false}@property --tw-grayscale{syntax:"*";inherits:false}@property --tw-hue-rotate{syntax:"*";inherits:false}@property --tw-invert{syntax:"*";inherits:false}@property --tw-opacity{syntax:"*";inherits:false}@property --tw-saturate{syntax:"*";inherits:false}@property --tw-sepia{syntax:"*";inherits:false}@property --tw-drop-shadow{syntax:"*";inherits:false}@property --tw-drop-shadow-color{syntax:"*";inherits:false}@property --tw-drop-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-drop-shadow-size{syntax:"*";inherits:false}@property --tw-backdrop-blur{syntax:"*";inherits:false}@property --tw-backdrop-brightness{syntax:"*";inherits:false}@property --tw-backdrop-contrast{syntax:"*";inherits:false}@property --tw-backdrop-grayscale{syntax:"*";inherits:false}@property --tw-backdrop-hue-rotate{syntax:"*";inherits:false}@property --tw-backdrop-invert{syntax:"*";inherits:false}@property --tw-backdrop-opacity{syntax:"*";inherits:false}@property --tw-backdrop-saturate{syntax:"*";inherits:false}@property --tw-backdrop-sepia{syntax:"*";inherits:false}@property --tw-duration{syntax:"*";inherits:false}@property --tw-ease{syntax:"*";inherits:false}@property --tw-contain-size{syntax:"*";inherits:false}@property --tw-contain-layout{syntax:"*";inherits:false}@property --tw-contain-paint{syntax:"*";inherits:false}@property --tw-contain-style{syntax:"*";inherits:false}@property --tw-content{syntax:"*";inherits:false;initial-value:""}@keyframes ping{75%,to{opacity:0;transform:scale(2)}}@keyframes pulse{50%{opacity:.5}}`;
  var Bi = Symbol("store-raw"),
    Go = Symbol("store-node"),
    xn = Symbol("store-has"),
    Dc = Symbol("store-self");
  function Fc(e) {
    let t = e[Zt];
    if (
      !t &&
      (Object.defineProperty(e, Zt, { value: (t = new Proxy(e, Jp)) }),
      !Array.isArray(e))
    ) {
      let n = Object.keys(e),
        o = Object.getOwnPropertyDescriptors(e);
      for (let r = 0, s = n.length; r < s; r++) {
        let i = n[r];
        o[i].get &&
          Object.defineProperty(e, i, {
            enumerable: o[i].enumerable,
            get: o[i].get.bind(t),
          });
      }
    }
    return t;
  }
  function Uo(e) {
    let t;
    return (
      e != null &&
      typeof e == "object" &&
      (e[Zt] ||
        !(t = Object.getPrototypeOf(e)) ||
        t === Object.prototype ||
        Array.isArray(e))
    );
  }
  function jo(e, t = new Set()) {
    let n, o, r, s;
    if ((n = e != null && e[Bi])) return n;
    if (!Uo(e) || t.has(e)) return e;
    if (Array.isArray(e)) {
      Object.isFrozen(e) ? (e = e.slice(0)) : t.add(e);
      for (let i = 0, c = e.length; i < c; i++)
        ((r = e[i]), (o = jo(r, t)) !== r && (e[i] = o));
    } else {
      Object.isFrozen(e) ? (e = Object.assign({}, e)) : t.add(e);
      let i = Object.keys(e),
        c = Object.getOwnPropertyDescriptors(e);
      for (let l = 0, u = i.length; l < u; l++)
        ((s = i[l]),
          !c[s].get && ((r = e[s]), (o = jo(r, t)) !== r && (e[s] = o)));
    }
    return e;
  }
  function zi(e, t) {
    let n = e[t];
    return (
      n || Object.defineProperty(e, t, { value: (n = Object.create(null)) }), n
    );
  }
  function kr(e, t, n) {
    if (e[t]) return e[t];
    let [o, r] = $(n, { equals: false, internal: true });
    return ((o.$ = r), (e[t] = o));
  }
  function qp(e, t) {
    let n = Reflect.getOwnPropertyDescriptor(e, t);
    return (
      !n ||
        n.get ||
        !n.configurable ||
        t === Zt ||
        t === Go ||
        (delete n.value, delete n.writable, (n.get = () => e[Zt][t])),
      n
    );
  }
  function Hc(e) {
    Di() && kr(zi(e, Go), Dc)();
  }
  function Zp(e) {
    return (Hc(e), Reflect.ownKeys(e));
  }
  var Jp = {
    get(e, t, n) {
      if (t === Bi) return e;
      if (t === Zt) return n;
      if (t === Tr) return (Hc(e), n);
      let o = zi(e, Go),
        r = o[t],
        s = r ? r() : e[t];
      if (t === Go || t === xn || t === "__proto__") return s;
      if (!r) {
        let i = Object.getOwnPropertyDescriptor(e, t);
        Di() &&
          (typeof s != "function" || e.hasOwnProperty(t)) &&
          !(i && i.get) &&
          (s = kr(o, t, s)());
      }
      return Uo(s) ? Fc(s) : s;
    },
    has(e, t) {
      return t === Bi ||
        t === Zt ||
        t === Tr ||
        t === Go ||
        t === xn ||
        t === "__proto__"
        ? true
        : (Di() && kr(zi(e, xn), t)(), t in e);
    },
    set() {
      return true;
    },
    deleteProperty() {
      return true;
    },
    ownKeys: Zp,
    getOwnPropertyDescriptor: qp,
  };
  function Wo(e, t, n, o = false) {
    if (!o && e[t] === n) return;
    let r = e[t],
      s = e.length;
    n === void 0
      ? (delete e[t], e[xn] && e[xn][t] && r !== void 0 && e[xn][t].$())
      : ((e[t] = n), e[xn] && e[xn][t] && r === void 0 && e[xn][t].$());
    let i = zi(e, Go),
      c;
    if (
      ((c = kr(i, t, r)) && c.$(() => n), Array.isArray(e) && e.length !== s)
    ) {
      for (let l = e.length; l < s; l++) (c = i[l]) && c.$();
      (c = kr(i, "length", s)) && c.$(e.length);
    }
    (c = i[Dc]) && c.$();
  }
  function $c(e, t) {
    let n = Object.keys(t);
    for (let o = 0; o < n.length; o += 1) {
      let r = n[o];
      Wo(e, r, t[r]);
    }
  }
  function Qp(e, t) {
    if ((typeof t == "function" && (t = t(e)), (t = jo(t)), Array.isArray(t))) {
      if (e === t) return;
      let n = 0,
        o = t.length;
      for (; n < o; n++) {
        let r = t[n];
        e[n] !== r && Wo(e, n, r);
      }
      Wo(e, "length", o);
    } else $c(e, t);
  }
  function Pr(e, t, n = []) {
    let o,
      r = e;
    if (t.length > 1) {
      o = t.shift();
      let i = typeof o,
        c = Array.isArray(e);
      if (Array.isArray(o)) {
        for (let l = 0; l < o.length; l++) Pr(e, [o[l]].concat(t), n);
        return;
      } else if (c && i === "function") {
        for (let l = 0; l < e.length; l++)
          o(e[l], l) && Pr(e, [l].concat(t), n);
        return;
      } else if (c && i === "object") {
        let { from: l = 0, to: u = e.length - 1, by: f = 1 } = o;
        for (let m = l; m <= u; m += f) Pr(e, [m].concat(t), n);
        return;
      } else if (t.length > 1) {
        Pr(e[o], t, [o].concat(n));
        return;
      }
      ((r = e[o]), (n = [o].concat(n)));
    }
    let s = t[0];
    (typeof s == "function" && ((s = s(r, n)), s === r)) ||
      (o === void 0 && s == null) ||
      ((s = jo(s)),
      o === void 0 || (Uo(r) && Uo(s) && !Array.isArray(s))
        ? $c(r, s)
        : Wo(e, o, s));
  }
  function Gi(...[e, t]) {
    let n = jo(e || {}),
      o = Array.isArray(n),
      r = Fc(n);
    function s(...i) {
      Li(() => {
        o && i.length === 1 ? Qp(n, i[0]) : Pr(n, i);
      });
    }
    return [r, s];
  }
  var Vi = new WeakMap(),
    Bc = {
      get(e, t) {
        if (t === Bi) return e;
        let n = e[t],
          o;
        return Uo(n) ? Vi.get(n) || (Vi.set(n, (o = new Proxy(n, Bc))), o) : n;
      },
      set(e, t, n) {
        return (Wo(e, t, jo(n)), true);
      },
      deleteProperty(e, t) {
        return (Wo(e, t, void 0, true), true);
      },
    };
  function jt(e) {
    return (t) => {
      if (Uo(t)) {
        let n;
        ((n = Vi.get(t)) || Vi.set(t, (n = new Proxy(t, Bc))), e(n));
      }
      return t;
    };
  }
  var zc = "0.1.26";
  var Ko = "210, 57, 192",
    Vc = `rgba(${Ko}, 1)`,
    Gc = `rgba(${Ko}, 0.4)`,
    Uc = `rgba(${Ko}, 0.05)`,
    Ui = `rgba(${Ko}, 0.5)`,
    ji = `rgba(${Ko}, 0.08)`,
    jc = `rgba(${Ko}, 0.15)`,
    Wc = 50,
    Bn = 8,
    Kc = 4,
    Xc = 0.2,
    ma = 50,
    pa = 16,
    Qt = 4,
    Or = 100,
    Yc = 15,
    qc = 3,
    ga = ["id", "class", "aria-label", "data-testid", "role", "name", "title"],
    Zc = 5e3,
    Jc = ["Meta", "Control", "Shift", "Alt"],
    ha = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]),
    Mr = "data-react-grab-frozen",
    ba = "data-react-grab-ignore",
    Ir = 0.9,
    Qc = 1e3,
    eu = 2147483600,
    tu = 400,
    nu = 100,
    Te = 16,
    ya = 500,
    ou = 300,
    ru = 5,
    wa = 150,
    po = 14,
    xa = 28,
    vn = 150,
    iu = 50,
    su = 78,
    au = 28,
    en = 0.5,
    lu = 1500,
    cu = 3e3,
    uu = 3,
    Wi = "animate-[hint-flip-in_var(--transition-normal)_ease-out]",
    du = 0.75,
    va = 32,
    Rr = 3,
    Nr = 20,
    Ca = 100,
    Bt = 1,
    Ea = 50,
    fu = 50,
    mu = 6,
    pu = 3,
    Sa = 2,
    gu = 16,
    hu = 100,
    bu = 50,
    Aa = 0.01,
    yu = 1e3,
    wu = 20,
    xu = 2 * 1024 * 1024,
    Xo = 100,
    Lr = 200,
    zn = 8,
    Yo = 8,
    an = 8,
    go = 11,
    vu = 180,
    Cu = 280,
    Eu = 100,
    ft = "bg-white",
    Wt = { left: -9999, top: -9999 },
    qo = {
      left: "left center",
      right: "right center",
      top: "center top",
      bottom: "center bottom",
    },
    Su =
      '<svg width="294" height="294" viewBox="0 0 294 294" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_0_3)"><mask id="mask0_0_3" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="294" height="294"><path d="M294 0H0V294H294V0Z" fill="white"/></mask><g mask="url(#mask0_0_3)"><path d="M144.599 47.4924C169.712 27.3959 194.548 20.0265 212.132 30.1797C227.847 39.2555 234.881 60.3243 231.926 89.516C231.677 92.0069 231.328 94.5423 230.94 97.1058L228.526 110.14C228.517 110.136 228.505 110.132 228.495 110.127C228.486 110.165 228.479 110.203 228.468 110.24L216.255 105.741C216.256 105.736 216.248 105.728 216.248 105.723C207.915 103.125 199.421 101.075 190.82 99.5888L190.696 99.5588L173.526 97.2648L173.511 97.2631C173.492 97.236 173.467 97.2176 173.447 97.1905C163.862 96.2064 154.233 95.7166 144.599 95.7223C134.943 95.7162 125.295 96.219 115.693 97.2286C110.075 105.033 104.859 113.118 100.063 121.453C95.2426 129.798 90.8624 138.391 86.939 147.193C90.8624 155.996 95.2426 164.588 100.063 172.933C104.866 181.302 110.099 189.417 115.741 197.245C115.749 197.245 115.758 197.246 115.766 197.247L115.752 197.27L115.745 197.283L115.754 197.296L126.501 211.013L126.574 211.089C132.136 217.767 138.126 224.075 144.507 229.974L144.609 230.082L154.572 238.287C154.539 238.319 154.506 238.35 154.472 238.38C154.485 238.392 154.499 238.402 154.513 238.412L143.846 247.482L143.827 247.497C126.56 261.128 109.472 268.745 94.8019 268.745C88.5916 268.837 82.4687 267.272 77.0657 264.208C61.3496 255.132 54.3164 234.062 57.2707 204.871C57.528 202.307 57.8806 199.694 58.2904 197.054C28.3363 185.327 9.52301 167.51 9.52301 147.193C9.52301 129.042 24.2476 112.396 50.9901 100.375C53.3443 99.3163 55.7938 98.3058 58.2904 97.3526C57.8806 94.7023 57.528 92.0803 57.2707 89.516C54.3164 60.3243 61.3496 39.2555 77.0657 30.1797C94.6494 20.0265 119.486 27.3959 144.599 47.4924ZM70.6423 201.315C70.423 202.955 70.2229 204.566 70.0704 206.168C67.6686 229.567 72.5478 246.628 83.3615 252.988L83.5176 253.062C95.0399 259.717 114.015 254.426 134.782 238.38C125.298 229.45 116.594 219.725 108.764 209.314C95.8516 207.742 83.0977 205.066 70.6423 201.315ZM80.3534 163.438C77.34 171.677 74.8666 180.104 72.9484 188.664C81.1787 191.224 89.5657 193.247 98.0572 194.724L98.4618 194.813C95.2115 189.865 92.0191 184.66 88.9311 179.378C85.8433 174.097 83.003 168.768 80.3534 163.438ZM60.759 110.203C59.234 110.839 57.7378 111.475 56.27 112.11C34.7788 121.806 22.3891 134.591 22.3891 147.193C22.3891 160.493 36.4657 174.297 60.7494 184.26C63.7439 171.581 67.8124 159.182 72.9104 147.193C67.822 135.23 63.7566 122.855 60.759 110.203ZM98.4137 99.6404C89.8078 101.145 81.3075 103.206 72.9676 105.809C74.854 114.203 77.2741 122.468 80.2132 130.554L80.3059 130.939C82.9938 125.6 85.8049 120.338 88.8834 115.008C91.9618 109.679 95.1544 104.569 98.4137 99.6404ZM94.9258 38.5215C90.9331 38.4284 86.9866 39.3955 83.4891 41.3243C72.6291 47.6015 67.6975 64.5954 70.0424 87.9446L70.0416 88.2194C70.194 89.8208 70.3941 91.4325 70.6134 93.0624C83.0737 89.3364 95.8263 86.6703 108.736 85.0924C116.57 74.6779 125.28 64.9532 134.773 56.0249C119.877 44.5087 105.895 38.5215 94.9258 38.5215ZM205.737 41.3148C202.268 39.398 198.355 38.4308 194.394 38.5099L194.29 38.512C183.321 38.512 169.34 44.4991 154.444 56.0153C163.93 64.9374 172.634 74.6557 180.462 85.064C193.375 86.6345 206.128 89.3102 218.584 93.0624C218.812 91.4325 219.003 89.8118 219.165 88.2098C221.548 64.7099 216.65 47.6164 205.737 41.3148ZM144.552 64.3097C138.104 70.2614 132.054 76.6306 126.443 83.3765C132.39 82.995 138.426 82.8046 144.552 82.8046C150.727 82.8046 156.778 83.0143 162.707 83.3765C157.08 76.6293 151.015 70.2596 144.552 64.3097Z" fill="white"/><path d="M144.598 47.4924C169.712 27.3959 194.547 20.0265 212.131 30.1797C227.847 39.2555 234.88 60.3243 231.926 89.516C231.677 92.0069 231.327 94.5423 230.941 97.1058L228.526 110.14L228.496 110.127C228.487 110.165 228.478 110.203 228.469 110.24L216.255 105.741L216.249 105.723C207.916 103.125 199.42 101.075 190.82 99.5888L190.696 99.5588L173.525 97.2648L173.511 97.263C173.492 97.236 173.468 97.2176 173.447 97.1905C163.863 96.2064 154.234 95.7166 144.598 95.7223C134.943 95.7162 125.295 96.219 115.693 97.2286C110.075 105.033 104.859 113.118 100.063 121.453C95.2426 129.798 90.8622 138.391 86.939 147.193C90.8622 155.996 95.2426 164.588 100.063 172.933C104.866 181.302 110.099 189.417 115.741 197.245L115.766 197.247L115.752 197.27L115.745 197.283L115.754 197.296L126.501 211.013L126.574 211.089C132.136 217.767 138.126 224.075 144.506 229.974L144.61 230.082L154.572 238.287C154.539 238.319 154.506 238.35 154.473 238.38L154.512 238.412L143.847 247.482L143.827 247.497C126.56 261.13 109.472 268.745 94.8018 268.745C88.5915 268.837 82.4687 267.272 77.0657 264.208C61.3496 255.132 54.3162 234.062 57.2707 204.871C57.528 202.307 57.8806 199.694 58.2904 197.054C28.3362 185.327 9.52298 167.51 9.52298 147.193C9.52298 129.042 24.2476 112.396 50.9901 100.375C53.3443 99.3163 55.7938 98.3058 58.2904 97.3526C57.8806 94.7023 57.528 92.0803 57.2707 89.516C54.3162 60.3243 61.3496 39.2555 77.0657 30.1797C94.6493 20.0265 119.486 27.3959 144.598 47.4924ZM70.6422 201.315C70.423 202.955 70.2229 204.566 70.0704 206.168C67.6686 229.567 72.5478 246.628 83.3615 252.988L83.5175 253.062C95.0399 259.717 114.015 254.426 134.782 238.38C125.298 229.45 116.594 219.725 108.764 209.314C95.8515 207.742 83.0977 205.066 70.6422 201.315ZM80.3534 163.438C77.34 171.677 74.8666 180.104 72.9484 188.664C81.1786 191.224 89.5657 193.247 98.0572 194.724L98.4618 194.813C95.2115 189.865 92.0191 184.66 88.931 179.378C85.8433 174.097 83.003 168.768 80.3534 163.438ZM60.7589 110.203C59.234 110.839 57.7378 111.475 56.2699 112.11C34.7788 121.806 22.3891 134.591 22.3891 147.193C22.3891 160.493 36.4657 174.297 60.7494 184.26C63.7439 171.581 67.8124 159.182 72.9103 147.193C67.822 135.23 63.7566 122.855 60.7589 110.203ZM98.4137 99.6404C89.8078 101.145 81.3075 103.206 72.9676 105.809C74.8539 114.203 77.2741 122.468 80.2132 130.554L80.3059 130.939C82.9938 125.6 85.8049 120.338 88.8834 115.008C91.9618 109.679 95.1544 104.569 98.4137 99.6404ZM94.9258 38.5215C90.9331 38.4284 86.9866 39.3955 83.4891 41.3243C72.629 47.6015 67.6975 64.5954 70.0424 87.9446L70.0415 88.2194C70.194 89.8208 70.3941 91.4325 70.6134 93.0624C83.0737 89.3364 95.8262 86.6703 108.736 85.0924C116.57 74.6779 125.28 64.9532 134.772 56.0249C119.877 44.5087 105.895 38.5215 94.9258 38.5215ZM205.737 41.3148C202.268 39.398 198.355 38.4308 194.394 38.5099L194.291 38.512C183.321 38.512 169.34 44.4991 154.443 56.0153C163.929 64.9374 172.634 74.6557 180.462 85.064C193.374 86.6345 206.129 89.3102 218.584 93.0624C218.813 91.4325 219.003 89.8118 219.166 88.2098C221.548 64.7099 216.65 47.6164 205.737 41.3148ZM144.551 64.3097C138.103 70.2614 132.055 76.6306 126.443 83.3765C132.389 82.995 138.427 82.8046 144.551 82.8046C150.727 82.8046 156.779 83.0143 162.707 83.3765C157.079 76.6293 151.015 70.2596 144.551 64.3097Z" fill="#FF40E0"/></g><mask id="mask1_0_3" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="102" y="84" width="161" height="162"><path d="M235.282 84.827L102.261 112.259L129.693 245.28L262.714 217.848L235.282 84.827Z" fill="white"/></mask><g mask="url(#mask1_0_3)"><path d="M136.863 129.916L213.258 141.224C220.669 142.322 222.495 152.179 215.967 155.856L187.592 171.843L184.135 204.227C183.339 211.678 173.564 213.901 169.624 207.526L129.021 141.831C125.503 136.14 130.245 128.936 136.863 129.916Z" fill="#FF40E0" stroke="#FF40E0" stroke-width="0.817337" stroke-linecap="round" stroke-linejoin="round"/></g></g><defs><clipPath id="clip0_0_3"><rect width="294" height="294" fill="white"/></clipPath></defs></svg>',
    Au = 1e3,
    Vn = 95,
    Tu = 229,
    Ta = -9999,
    _a = new Set([
      "display",
      "position",
      "top",
      "right",
      "bottom",
      "left",
      "z-index",
      "overflow",
      "overflow-x",
      "overflow-y",
      "width",
      "height",
      "min-width",
      "min-height",
      "max-width",
      "max-height",
      "margin-top",
      "margin-right",
      "margin-bottom",
      "margin-left",
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left",
      "flex-direction",
      "flex-wrap",
      "justify-content",
      "align-items",
      "align-self",
      "align-content",
      "flex-grow",
      "flex-shrink",
      "flex-basis",
      "order",
      "gap",
      "row-gap",
      "column-gap",
      "grid-template-columns",
      "grid-template-rows",
      "grid-template-areas",
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "line-height",
      "letter-spacing",
      "text-align",
      "text-decoration-line",
      "text-decoration-style",
      "text-transform",
      "text-overflow",
      "text-shadow",
      "white-space",
      "word-break",
      "overflow-wrap",
      "vertical-align",
      "color",
      "background-color",
      "background-image",
      "background-position",
      "background-size",
      "background-repeat",
      "border-top-width",
      "border-right-width",
      "border-bottom-width",
      "border-left-width",
      "border-top-style",
      "border-right-style",
      "border-bottom-style",
      "border-left-style",
      "border-top-color",
      "border-right-color",
      "border-bottom-color",
      "border-left-color",
      "border-top-left-radius",
      "border-top-right-radius",
      "border-bottom-left-radius",
      "border-bottom-right-radius",
      "box-shadow",
      "opacity",
      "transform",
      "filter",
      "backdrop-filter",
      "object-fit",
      "object-position",
    ]);
  var eg = (e) =>
      typeof e == "number" && !Number.isNaN(e) && Number.isFinite(e),
    tg = (e) => {
      let t = e.trim();
      if (!t) return null;
      let n = parseFloat(t);
      return eg(n) ? n : null;
    },
    _u = (e, t) => {
      let n = e.split(",");
      if (n.length !== t) return null;
      let o = [];
      for (let r of n) {
        let s = tg(r);
        if (s === null) return null;
        o.push(s);
      }
      return o;
    },
    Pu = (e, t, n, o) => e === 1 && t === 0 && n === 0 && o === 1,
    ng = (e) =>
      e[0] === 1 &&
      e[1] === 0 &&
      e[2] === 0 &&
      e[3] === 0 &&
      e[4] === 0 &&
      e[5] === 1 &&
      e[6] === 0 &&
      e[7] === 0 &&
      e[8] === 0 &&
      e[9] === 0 &&
      e[10] === 1 &&
      e[11] === 0 &&
      e[15] === 1,
    ku = (e) => {
      if (!e || e === "none") return "none";
      if (e.charCodeAt(0) === 109)
        if (e.charCodeAt(6) === 51) {
          let n = e.length - 1,
            o = _u(e.slice(9, n), 16);
          if (o)
            return (
              (o[12] = 0),
              (o[13] = 0),
              (o[14] = 0),
              ng(o)
                ? "none"
                : `matrix3d(${o[0]}, ${o[1]}, ${o[2]}, ${o[3]}, ${o[4]}, ${o[5]}, ${o[6]}, ${o[7]}, ${o[8]}, ${o[9]}, ${o[10]}, ${o[11]}, 0, 0, 0, ${o[15]})`
            );
        } else {
          let n = e.length - 1,
            o = _u(e.slice(7, n), 6);
          if (o) {
            let r = o[0],
              s = o[1],
              i = o[2],
              c = o[3];
            return Pu(r, s, i, c)
              ? "none"
              : `matrix(${r}, ${s}, ${i}, ${c}, 0, 0)`;
          }
        }
      return "none";
    },
    Ou = (e) =>
      e.isIdentity
        ? "none"
        : e.is2D
          ? Pu(e.a, e.b, e.c, e.d)
            ? "none"
            : `matrix(${e.a}, ${e.b}, ${e.c}, ${e.d}, 0, 0)`
          : e.m11 === 1 &&
              e.m12 === 0 &&
              e.m13 === 0 &&
              e.m14 === 0 &&
              e.m21 === 0 &&
              e.m22 === 1 &&
              e.m23 === 0 &&
              e.m24 === 0 &&
              e.m31 === 0 &&
              e.m32 === 0 &&
              e.m33 === 1 &&
              e.m34 === 0 &&
              e.m44 === 1
            ? "none"
            : `matrix3d(${e.m11}, ${e.m12}, ${e.m13}, ${e.m14}, ${e.m21}, ${e.m22}, ${e.m23}, ${e.m24}, ${e.m31}, ${e.m32}, ${e.m33}, ${e.m34}, 0, 0, 0, ${e.m44})`;
  var Pa = new WeakMap(),
    Mu = () => {
      Pa = new WeakMap();
    },
    rg = (e, t) => {
      let n = t && t !== "none",
        o = null,
        r = e.parentElement,
        s = 0;
      for (; r && r !== document.documentElement && s < mu; ) {
        let i = window.getComputedStyle(r).transform;
        if (i && i !== "none")
          o = o ? new DOMMatrix(i).multiply(o) : new DOMMatrix(i);
        else if (!n && !o && s >= pu) return "none";
        ((r = r.parentElement), s++);
      }
      return o
        ? (n && (o = o.multiply(new DOMMatrix(t))), Ou(o))
        : n
          ? ku(t)
          : "none";
    },
    ze = (e) => {
      let t = performance.now(),
        n = Pa.get(e);
      if (n && t - n.timestamp < 16) return n.bounds;
      let o = e.getBoundingClientRect(),
        r = window.getComputedStyle(e),
        s = rg(e, r.transform),
        i;
      if (s !== "none" && e instanceof HTMLElement) {
        let c = e.offsetWidth,
          l = e.offsetHeight;
        if (c > 0 && l > 0) {
          let u = o.left + o.width * 0.5,
            f = o.top + o.height * 0.5;
          i = {
            borderRadius: r.borderRadius || "0px",
            height: l,
            transform: s,
            width: c,
            x: u - c * 0.5,
            y: f - l * 0.5,
          };
        } else
          i = {
            borderRadius: r.borderRadius || "0px",
            height: o.height,
            transform: s,
            width: o.width,
            x: o.left,
            y: o.top,
          };
      } else
        i = {
          borderRadius: r.borderRadius || "0px",
          height: o.height,
          transform: s,
          width: o.width,
          x: o.left,
          y: o.top,
        };
      return (Pa.set(e, { bounds: i, timestamp: t }), i);
    };
  var qe = (e) => !!(e?.isConnected ?? e?.ownerDocument?.contains(e));
  var Cn = (e) => ({ x: e.x + e.width / 2, y: e.y + e.height / 2 });
  var Ki = ({ currentPosition: e, previousBounds: t, nextBounds: n }) => {
    if (!t || !n) return e;
    let o = Cn(t),
      r = Cn(n),
      s = t.width / 2,
      i = e.x - o.x,
      c = s > 0 ? i / s : 0,
      l = n.width / 2;
    return { ...e, x: r.x + c * l };
  };
  var ig = (e) => ({
      current: { state: "idle" },
      wasActivatedByToggle: false,
      pendingCommentMode: false,
      hasAgentProvider: e.hasAgentProvider,
      keyHoldDuration: e.keyHoldDuration,
      pointer: { x: -1e3, y: -1e3 },
      dragStart: { x: -1e3, y: -1e3 },
      copyStart: { x: -1e3, y: -1e3 },
      copyOffsetFromCenterX: 0,
      detectedElement: null,
      frozenElement: null,
      frozenElements: [],
      frozenDragRect: null,
      lastGrabbedElement: null,
      lastCopiedElement: null,
      selectionFilePath: null,
      selectionLineNumber: null,
      inputText: "",
      pendingClickData: null,
      replySessionId: null,
      viewportVersion: 0,
      grabbedBoxes: [],
      labelInstances: [],
      agentSessions: new Map(),
      sessionElements: new Map(),
      isTouchMode: false,
      theme: e.theme,
      activationTimestamp: null,
      previouslyFocusedElement: null,
      isAgentConnected: false,
      supportsUndo: false,
      supportsFollowUp: false,
      dismissButtonText: void 0,
      pendingAbortSessionId: null,
      contextMenuPosition: null,
      contextMenuElement: null,
      contextMenuClickOffset: null,
      selectedAgent: null,
    }),
    Iu = (e) => {
      let [t, n] = Gi(ig(e)),
        o = () => t.current.state === "active",
        r = () => t.current.state === "holding",
        s = {
          startHold: (i) => {
            (i !== void 0 && n("keyHoldDuration", i),
              n("current", { state: "holding", startedAt: Date.now() }));
          },
          release: () => {
            t.current.state === "holding" && n("current", { state: "idle" });
          },
          activate: () => {
            (n("current", {
              state: "active",
              phase: "hovering",
              isPromptMode: false,
              isPendingDismiss: false,
            }),
              n("activationTimestamp", Date.now()),
              n("previouslyFocusedElement", document.activeElement));
          },
          deactivate: () => {
            n(
              jt((i) => {
                ((i.current = { state: "idle" }),
                  (i.wasActivatedByToggle = false),
                  (i.pendingCommentMode = false),
                  (i.inputText = ""),
                  (i.frozenElement = null),
                  (i.frozenElements = []),
                  (i.frozenDragRect = null),
                  (i.pendingClickData = null),
                  (i.replySessionId = null),
                  (i.pendingAbortSessionId = null),
                  (i.activationTimestamp = null),
                  (i.previouslyFocusedElement = null),
                  (i.contextMenuPosition = null),
                  (i.contextMenuElement = null),
                  (i.contextMenuClickOffset = null),
                  (i.selectedAgent = null),
                  (i.lastCopiedElement = null));
              }),
            );
          },
          toggle: () => {
            t.activationTimestamp !== null
              ? s.deactivate()
              : (n("wasActivatedByToggle", true), s.activate());
          },
          freeze: () => {
            if (t.current.state === "active") {
              let i = t.frozenElement ?? t.detectedElement;
              (i && n("frozenElement", i),
                n(
                  "current",
                  jt((c) => {
                    c.state === "active" && (c.phase = "frozen");
                  }),
                ));
            }
          },
          unfreeze: () => {
            t.current.state === "active" &&
              (n("frozenElement", null),
              n("frozenElements", []),
              n("frozenDragRect", null),
              n(
                "current",
                jt((i) => {
                  i.state === "active" && (i.phase = "hovering");
                }),
              ));
          },
          startDrag: (i) => {
            t.current.state === "active" &&
              (s.clearFrozenElement(),
              n("dragStart", {
                x: i.x + window.scrollX,
                y: i.y + window.scrollY,
              }),
              n(
                "current",
                jt((c) => {
                  c.state === "active" && (c.phase = "dragging");
                }),
              ));
          },
          endDrag: () => {
            t.current.state === "active" &&
              t.current.phase === "dragging" &&
              (n("dragStart", { x: -1e3, y: -1e3 }),
              n(
                "current",
                jt((i) => {
                  i.state === "active" && (i.phase = "justDragged");
                }),
              ));
          },
          cancelDrag: () => {
            t.current.state === "active" &&
              t.current.phase === "dragging" &&
              (n("dragStart", { x: -1e3, y: -1e3 }),
              n(
                "current",
                jt((i) => {
                  i.state === "active" && (i.phase = "hovering");
                }),
              ));
          },
          finishJustDragged: () => {
            t.current.state === "active" &&
              t.current.phase === "justDragged" &&
              n(
                "current",
                jt((i) => {
                  i.state === "active" && (i.phase = "hovering");
                }),
              );
          },
          startCopy: () => {
            let i = t.current.state === "active";
            n("current", {
              state: "copying",
              startedAt: Date.now(),
              wasActive: i,
            });
          },
          completeCopy: (i) => {
            (n("pendingClickData", null), i && n("lastCopiedElement", i));
            let c = t.current.state === "copying" ? t.current.wasActive : false;
            n("current", {
              state: "justCopied",
              copiedAt: Date.now(),
              wasActive: c,
            });
          },
          finishJustCopied: () => {
            t.current.state === "justCopied" &&
              (t.current.wasActive && !t.wasActivatedByToggle
                ? (s.clearFrozenElement(),
                  n("current", {
                    state: "active",
                    phase: "hovering",
                    isPromptMode: false,
                    isPendingDismiss: false,
                  }))
                : s.deactivate());
          },
          enterPromptMode: (i, c) => {
            let l = ze(c),
              u = l.x + l.width / 2;
            (n("copyStart", i),
              n("copyOffsetFromCenterX", i.x - u),
              n("pointer", i),
              n("frozenElement", c),
              n("wasActivatedByToggle", true),
              t.current.state !== "active"
                ? (n("current", {
                    state: "active",
                    phase: "frozen",
                    isPromptMode: true,
                    isPendingDismiss: false,
                  }),
                  n("activationTimestamp", Date.now()),
                  n("previouslyFocusedElement", document.activeElement))
                : n(
                    "current",
                    jt((f) => {
                      f.state === "active" &&
                        ((f.isPromptMode = true), (f.phase = "frozen"));
                    }),
                  ));
          },
          exitPromptMode: () => {
            t.current.state === "active" &&
              n(
                "current",
                jt((i) => {
                  i.state === "active" &&
                    ((i.isPromptMode = false), (i.isPendingDismiss = false));
                }),
              );
          },
          setInputText: (i) => {
            n("inputText", i);
          },
          clearInputText: () => {
            n("inputText", "");
          },
          setPendingDismiss: (i) => {
            t.current.state === "active" &&
              n(
                "current",
                jt((c) => {
                  c.state === "active" && (c.isPendingDismiss = i);
                }),
              );
          },
          setPointer: (i) => {
            n("pointer", i);
          },
          setDetectedElement: (i) => {
            n("detectedElement", i);
          },
          setFrozenElement: (i) => {
            (n("frozenElement", i),
              n("frozenElements", [i]),
              n("frozenDragRect", null));
          },
          setFrozenElements: (i) => {
            (n("frozenElements", i),
              n("frozenElement", i.length > 0 ? i[0] : null),
              n("frozenDragRect", null));
          },
          setFrozenDragRect: (i) => {
            n("frozenDragRect", i);
          },
          clearFrozenElement: () => {
            (n("frozenElement", null),
              n("frozenElements", []),
              n("frozenDragRect", null));
          },
          setCopyStart: (i, c) => {
            let l = ze(c),
              u = l.x + l.width / 2;
            (n("copyStart", i), n("copyOffsetFromCenterX", i.x - u));
          },
          setLastGrabbed: (i) => {
            n("lastGrabbedElement", i);
          },
          clearLastCopied: () => {
            n("lastCopiedElement", null);
          },
          setWasActivatedByToggle: (i) => {
            n("wasActivatedByToggle", i);
          },
          setPendingCommentMode: (i) => {
            n("pendingCommentMode", i);
          },
          setTouchMode: (i) => {
            n("isTouchMode", i);
          },
          setSelectionSource: (i, c) => {
            (n("selectionFilePath", i), n("selectionLineNumber", c));
          },
          setPendingClickData: (i) => {
            n("pendingClickData", i);
          },
          clearReplySessionId: () => {
            n("replySessionId", null);
          },
          incrementViewportVersion: () => {
            n("viewportVersion", (i) => i + 1);
          },
          addGrabbedBox: (i) => {
            n("grabbedBoxes", (c) => [...c, i]);
          },
          removeGrabbedBox: (i) => {
            n("grabbedBoxes", (c) => c.filter((l) => l.id !== i));
          },
          clearGrabbedBoxes: () => {
            n("grabbedBoxes", []);
          },
          addLabelInstance: (i) => {
            n("labelInstances", (c) => [...c, i]);
          },
          updateLabelInstance: (i, c, l) => {
            let u = t.labelInstances.findIndex((f) => f.id === i);
            u !== -1 &&
              n(
                "labelInstances",
                u,
                jt((f) => {
                  ((f.status = c), l !== void 0 && (f.errorMessage = l));
                }),
              );
          },
          removeLabelInstance: (i) => {
            n("labelInstances", (c) => c.filter((l) => l.id !== i));
          },
          clearLabelInstances: () => {
            n("labelInstances", []);
          },
          setHasAgentProvider: (i) => {
            n("hasAgentProvider", i);
          },
          setAgentCapabilities: (i) => {
            (n("supportsUndo", i.supportsUndo),
              n("supportsFollowUp", i.supportsFollowUp),
              n("dismissButtonText", i.dismissButtonText),
              n("isAgentConnected", i.isAgentConnected));
          },
          setPendingAbortSessionId: (i) => {
            n("pendingAbortSessionId", i);
          },
          updateSessionBounds: () => {
            let i = t.agentSessions;
            if (i.size === 0) return;
            let c = new Map(i),
              l = false;
            for (let [u, f] of i) {
              let m = t.sessionElements.get(u) ?? null;
              if (qe(m)) {
                let h = ze(m),
                  v = f.selectionBounds[0],
                  H = Ki({
                    currentPosition: f.position,
                    previousBounds: v,
                    nextBounds: h,
                  });
                (c.set(u, { ...f, selectionBounds: [h], position: H }),
                  (l = true));
              }
            }
            l && n("agentSessions", c);
          },
          addAgentSession: (i, c, l) => {
            let u = new Map(t.agentSessions);
            (u.set(i, c), n("agentSessions", u));
            let f = new Map(t.sessionElements);
            (f.set(i, l), n("sessionElements", f));
          },
          updateAgentSessionStatus: (i, c) => {
            let l = t.agentSessions.get(i);
            if (!l) return;
            let u = new Map(t.agentSessions);
            (u.set(i, { ...l, lastStatus: c }), n("agentSessions", u));
          },
          completeAgentSession: (i, c) => {
            let l = t.agentSessions.get(i);
            if (!l) return;
            let u = new Map(t.agentSessions);
            (u.set(i, {
              ...l,
              isStreaming: false,
              lastStatus: c ?? l.lastStatus,
            }),
              n("agentSessions", u));
          },
          setAgentSessionError: (i, c) => {
            let l = t.agentSessions.get(i);
            if (!l) return;
            let u = new Map(t.agentSessions);
            (u.set(i, { ...l, isStreaming: false, error: c }),
              n("agentSessions", u));
          },
          removeAgentSession: (i) => {
            let c = new Map(t.agentSessions);
            (c.delete(i), n("agentSessions", c));
            let l = new Map(t.sessionElements);
            (l.delete(i), n("sessionElements", l));
          },
          showContextMenu: (i, c) => {
            let l = ze(c),
              u = l.x + l.width / 2,
              f = l.y + l.height / 2;
            (n("contextMenuPosition", i),
              n("contextMenuElement", c),
              n("contextMenuClickOffset", { x: i.x - u, y: i.y - f }));
          },
          hideContextMenu: () => {
            (n("contextMenuPosition", null),
              n("contextMenuElement", null),
              n("contextMenuClickOffset", null));
          },
          updateContextMenuPosition: () => {
            let i = t.contextMenuElement,
              c = t.contextMenuClickOffset;
            if (!i || !c || !qe(i)) return;
            let l = ze(i),
              u = l.x + l.width / 2,
              f = l.y + l.height / 2;
            n("contextMenuPosition", { x: u + c.x, y: f + c.y });
          },
          setSelectedAgent: (i) => {
            n("selectedAgent", i);
          },
        };
      return { store: t, setStore: n, actions: s, isActive: o, isHolding: r };
    };
  var ct = (e) => (e.tagName || "").toLowerCase();
  var sg = [
      "input",
      "textarea",
      "select",
      "searchbox",
      "slider",
      "spinbutton",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "option",
      "radio",
      "textbox",
      "combobox",
    ],
    ag = (e) => {
      if (e.composed) {
        let t = e.composedPath()[0];
        if (t instanceof HTMLElement) return t;
      } else if (e.target instanceof HTMLElement) return e.target;
    },
    St = (e) => {
      if (document.designMode === "on") return true;
      let t = ag(e);
      if (!t) return false;
      if (t.isContentEditable) return true;
      let n = ct(t);
      return sg.some((o) => o === n || o === t.role);
    },
    Ru = (e) => {
      let t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
        let n = t.selectionStart ?? 0;
        return (t.selectionEnd ?? 0) - n > 0;
      }
      return false;
    },
    Nu = () => {
      let e = window.getSelection();
      return e ? e.toString().length > 0 : false;
    };
  var Xi = "data-react-grab",
    Lu = "react-grab-fonts",
    cg = "https://fonts.googleapis.com/css2?family=Geist:wght@500&display=swap",
    ug = () => {
      if (document.getElementById(Lu) || !document.head) return;
      let e = document.createElement("link");
      ((e.id = Lu),
        (e.rel = "stylesheet"),
        (e.href = cg),
        document.head.appendChild(e));
    },
    Du = (e) => {
      ug();
      let t = document.querySelector(`[${Xi}]`);
      if (t) {
        let i = t.shadowRoot?.querySelector(`[${Xi}]`);
        if (i instanceof HTMLDivElement && t.shadowRoot) return i;
      }
      let n = document.createElement("div");
      (n.setAttribute(Xi, "true"),
        (n.style.zIndex = String(2147483647)),
        (n.style.position = "fixed"),
        (n.style.inset = "0"),
        (n.style.pointerEvents = "none"));
      let o = n.attachShadow({ mode: "open" });
      {
        let i = document.createElement("style");
        ((i.textContent = e), o.appendChild(i));
      }
      let r = document.createElement("div");
      (r.setAttribute(Xi, "true"), o.appendChild(r));
      let s = document.body ?? document.documentElement;
      return (
        s.appendChild(n),
        setTimeout(() => {
          s.appendChild(n);
        }, yu),
        r
      );
    };
  var ka = typeof window < "u",
    dg = (e) => 0,
    fg = (e) => {},
    Ve = ka
      ? (
          Object.getOwnPropertyDescriptor(
            Window.prototype,
            "requestAnimationFrame",
          )?.value ?? window.requestAnimationFrame
        ).bind(window)
      : dg,
    Ge = ka
      ? (
          Object.getOwnPropertyDescriptor(
            Window.prototype,
            "cancelAnimationFrame",
          )?.value ?? window.cancelAnimationFrame
        ).bind(window)
      : fg,
    Fu = () => (ka ? new Promise((e) => Ve(() => e())) : Promise.resolve());
  var Oa = "0.5.32",
    qi = `bippy-${Oa}`,
    Hu = Object.defineProperty,
    mg = Object.prototype.hasOwnProperty,
    Dr = () => {},
    Bu = (e) => {
      try {
        Function.prototype.toString.call(e).indexOf("^_^") > -1 &&
          setTimeout(() => {
            throw Error(
              "React is running in production mode, but dead code elimination has not been applied. Read how to correctly configure React for production: https://reactjs.org/link/perf-use-production-build",
            );
          });
      } catch {}
    },
    Zi = (e = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__) =>
      !!(e && "getFiberRoots" in e),
    zu = false,
    $u,
    Fr = (e = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__) =>
      zu
        ? true
        : (e && typeof e.inject == "function" && ($u = e.inject.toString()),
          !!$u?.includes("(injected)")),
    Yi = new Set(),
    Gn = new Set(),
    Ma = (e) => {
      let t = new Map(),
        n = 0,
        o = {
          _instrumentationIsActive: false,
          _instrumentationSource: qi,
          checkDCE: Bu,
          hasUnsupportedRendererAttached: false,
          inject(r) {
            let s = ++n;
            return (
              t.set(s, r),
              Gn.add(r),
              o._instrumentationIsActive ||
                ((o._instrumentationIsActive = true), Yi.forEach((i) => i())),
              s
            );
          },
          on: Dr,
          onCommitFiberRoot: Dr,
          onCommitFiberUnmount: Dr,
          onPostCommitFiberRoot: Dr,
          renderers: t,
          supportsFiber: true,
          supportsFlight: true,
        };
      try {
        Hu(globalThis, "__REACT_DEVTOOLS_GLOBAL_HOOK__", {
          configurable: !0,
          enumerable: !0,
          get() {
            return o;
          },
          set(i) {
            if (i && typeof i == "object") {
              let c = o.renderers;
              ((o = i),
                c.size > 0 &&
                  (c.forEach((l, u) => {
                    (Gn.add(l), i.renderers.set(u, l));
                  }),
                  Hr(e)));
            }
          },
        });
        let r = window.hasOwnProperty,
          s = !1;
        Hu(window, "hasOwnProperty", {
          configurable: !0,
          value: function (...i) {
            try {
              if (!s && i[0] === "__REACT_DEVTOOLS_GLOBAL_HOOK__")
                return (
                  (globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = void 0),
                  (s = !0),
                  -0
                );
            } catch {}
            return r.apply(this, i);
          },
          writable: !0,
        });
      } catch {
        Hr(e);
      }
      return o;
    },
    Hr = (e) => {
      try {
        let t = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (!t) return;
        if (!t._instrumentationSource) {
          ((t.checkDCE = Bu),
            (t.supportsFiber = !0),
            (t.supportsFlight = !0),
            (t.hasUnsupportedRendererAttached = !1),
            (t._instrumentationSource = qi),
            (t._instrumentationIsActive = !1));
          let n = Zi(t);
          if ((n || (t.on = Dr), t.renderers.size)) {
            ((t._instrumentationIsActive = !0), Yi.forEach((s) => s()));
            return;
          }
          let o = t.inject,
            r = Fr(t);
          (r &&
            !n &&
            ((zu = !0),
            t.inject({ scheduleRefresh() {} }) &&
              (t._instrumentationIsActive = !0)),
            (t.inject = (s) => {
              let i = o(s);
              return (
                Gn.add(s),
                r && t.renderers.set(i, s),
                (t._instrumentationIsActive = !0),
                Yi.forEach((c) => c()),
                i
              );
            }));
        }
        (t.renderers.size || t._instrumentationIsActive || Fr()) && e?.();
      } catch {}
    },
    Ia = () => mg.call(globalThis, "__REACT_DEVTOOLS_GLOBAL_HOOK__"),
    Un = (e) =>
      Ia() ? (Hr(e), globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__) : Ma(e),
    Ra = () =>
      !!(
        typeof window < "u" &&
        (window.document?.createElement ||
          window.navigator?.product === "ReactNative")
      ),
    Ji = () => {
      try {
        Ra() && Un();
      } catch {}
    };
  var Na = 0,
    La = 1;
  var Da = 5;
  var Fa = 11,
    Ha = 13;
  var $a = 15,
    Ba = 16;
  var za = 19;
  var Va = 26,
    Ga = 27,
    Ua = 28,
    ja = 30;
  var Zo = (e) => {
    switch (e.tag) {
      case 1:
      case 11:
      case 0:
      case 14:
      case 15:
        return true;
      default:
        return false;
    }
  };
  function Jo(e, t, n = false) {
    if (!e) return null;
    let o = t(e);
    if (o instanceof Promise)
      return (async () => {
        if ((await o) === true) return e;
        let s = n ? e.return : e.child;
        for (; s; ) {
          let i = await Ka(s, t, n);
          if (i) return i;
          s = n ? null : s.sibling;
        }
        return null;
      })();
    if (o === true) return e;
    let r = n ? e.return : e.child;
    for (; r; ) {
      let s = Wa(r, t, n);
      if (s) return s;
      r = n ? null : r.sibling;
    }
    return null;
  }
  var Wa = (e, t, n = false) => {
      if (!e) return null;
      if (t(e) === true) return e;
      let o = n ? e.return : e.child;
      for (; o; ) {
        let r = Wa(o, t, n);
        if (r) return r;
        o = n ? null : o.sibling;
      }
      return null;
    },
    Ka = async (e, t, n = false) => {
      if (!e) return null;
      if ((await t(e)) === true) return e;
      let o = n ? e.return : e.child;
      for (; o; ) {
        let r = await Ka(o, t, n);
        if (r) return r;
        o = n ? null : o.sibling;
      }
      return null;
    };
  var Xa = (e) => {
      let t = e;
      return typeof t == "function"
        ? t
        : typeof t == "object" && t
          ? Xa(t.type || t.render)
          : null;
    },
    jn = (e) => {
      let t = e;
      if (typeof t == "string") return t;
      if (typeof t != "function" && !(typeof t == "object" && t)) return null;
      let n = t.displayName || t.name || null;
      if (n) return n;
      let o = Xa(t);
      return (o && (o.displayName || o.name)) || null;
    };
  var En = () => {
    let e = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    return !!e?._instrumentationIsActive || Zi(e) || Fr(e);
  };
  var Wn = (e) => {
      let t = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (t?.renderers)
        for (let n of t.renderers.values())
          try {
            let o = n.findFiberByHostInstance?.(e);
            if (o) return o;
          } catch {}
      if (typeof e == "object" && e) {
        if ("_reactRootContainer" in e)
          return e._reactRootContainer?._internalRoot?.current?.child;
        for (let n in e)
          if (
            n.startsWith("__reactContainer$") ||
            n.startsWith("__reactInternalInstance$") ||
            n.startsWith("__reactFiber")
          )
            return e[n] || null;
      }
      return null;
    },
    Ya = new Set();
  var Vu = /^[a-zA-Z][a-zA-Z\d+\-.]*:/,
    gg = [
      "rsc://",
      "file:///",
      "webpack://",
      "webpack-internal://",
      "node:",
      "turbopack://",
      "metro://",
      "/app-pages-browser/",
      "/(app-pages-browser)/",
    ],
    hg = ["<anonymous>", "eval", ""],
    Zu = /\.(jsx|tsx|ts|js)$/,
    bg =
      /(\.min|bundle|chunk|vendor|vendors|runtime|polyfill|polyfills)\.(js|mjs|cjs)$|(chunk|bundle|vendor|vendors|runtime|polyfill|polyfills|framework|app|main|index)[-_.][A-Za-z0-9_-]{4,}\.(js|mjs|cjs)$|[\da-f]{8,}\.(js|mjs|cjs)$|[-_.][\da-f]{20,}\.(js|mjs|cjs)$|\/dist\/|\/build\/|\/.next\/|\/out\/|\/node_modules\/|\.webpack\.|\.vite\.|\.turbopack\./i,
    yg = /^\?[\w~.-]+(?:=[^&#]*)?(?:&[\w~.-]+(?:=[^&#]*)?)*$/,
    Ju = "(at Server)",
    wg = /(^|@)\S+:\d+/,
    Qu = /^\s*at .*(\S+:\d+|\(native\))/m,
    xg = /^(eval@)?(\[native code\])?$/;
  var es = (e, t) => {
      {
        let n = e.split(`
`),
          o = [];
        for (let r of n)
          if (/^\s*at\s+/.test(r)) {
            let s = Gu(r, void 0)[0];
            s && o.push(s);
          } else if (/^\s*in\s+/.test(r)) {
            let s = r.replace(/^\s*in\s+/, "").replace(/\s*\(at .*\)$/, "");
            o.push({ functionName: s, source: r });
          } else if (r.match(wg)) {
            let s = Uu(r, void 0)[0];
            s && o.push(s);
          }
        return Ja(o, t);
      }
    },
    ed = (e) => {
      if (!e.includes(":")) return [e, void 0, void 0];
      let t = e.startsWith("(") && /:\d+\)$/.test(e) ? e.slice(1, -1) : e,
        n = /(.+?)(?::(\d+))?(?::(\d+))?$/.exec(t);
      return n ? [n[1], n[2] || void 0, n[3] || void 0] : [t, void 0, void 0];
    },
    Ja = (e, t) =>
      t && t.slice != null
        ? Array.isArray(t.slice)
          ? e.slice(t.slice[0], t.slice[1])
          : e.slice(0, t.slice)
        : e;
  var Gu = (e, t) =>
    Ja(
      e
        .split(`
`)
        .filter((n) => !!n.match(Qu)),
      t,
    ).map((n) => {
      let o = n;
      o.includes("(eval ") &&
        (o = o
          .replace(/eval code/g, "eval")
          .replace(/(\(eval at [^()]*)|(,.*$)/g, ""));
      let r = o
          .replace(/^\s+/, "")
          .replace(/\(eval code/g, "(")
          .replace(/^.*?\s+/, ""),
        s = r.match(/ (\(.+\)$)/);
      r = s ? r.replace(s[0], "") : r;
      let i = ed(s ? s[1] : r);
      return {
        functionName: (s && r) || void 0,
        fileName: ["eval", "<anonymous>"].includes(i[0]) ? void 0 : i[0],
        lineNumber: i[1] ? +i[1] : void 0,
        columnNumber: i[2] ? +i[2] : void 0,
        source: o,
      };
    });
  var Uu = (e, t) =>
    Ja(
      e
        .split(`
`)
        .filter((n) => !n.match(xg)),
      t,
    ).map((n) => {
      let o = n;
      if (
        (o.includes(" > eval") &&
          (o = o.replace(
            / line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g,
            ":$1",
          )),
        !o.includes("@") && !o.includes(":"))
      )
        return { functionName: o };
      {
        let r =
            /(([^\n\r"\u2028\u2029]*".[^\n\r"\u2028\u2029]*"[^\n\r@\u2028\u2029]*(?:@[^\n\r"\u2028\u2029]*"[^\n\r@\u2028\u2029]*)*(?:[\n\r\u2028\u2029][^@]*)?)?[^@]*)@/,
          s = o.match(r),
          i = s && s[1] ? s[1] : void 0,
          c = ed(o.replace(r, ""));
        return {
          functionName: i,
          fileName: c[0],
          lineNumber: c[1] ? +c[1] : void 0,
          columnNumber: c[2] ? +c[2] : void 0,
          source: o,
        };
      }
    });
  var vg = 44,
    ju = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
    Cg = new Uint8Array(64),
    td = new Uint8Array(128);
  for (let e = 0; e < ju.length; e++) {
    let t = ju.charCodeAt(e);
    ((Cg[e] = t), (td[t] = e));
  }
  function $r(e, t) {
    let n = 0,
      o = 0,
      r = 0;
    do ((r = td[e.next()]), (n |= (r & 31) << o), (o += 5));
    while (r & 32);
    let s = n & 1;
    return ((n >>>= 1), s && (n = -2147483648 | -n), t + n);
  }
  function Wu(e, t) {
    return e.pos >= t ? false : e.peek() !== vg;
  }
  var Eg = class {
    constructor(e) {
      ((this.pos = 0), (this.buffer = e));
    }
    next() {
      return this.buffer.charCodeAt(this.pos++);
    }
    peek() {
      return this.buffer.charCodeAt(this.pos);
    }
    indexOf(e) {
      let { buffer: t, pos: n } = this,
        o = t.indexOf(e, n);
      return o === -1 ? t.length : o;
    }
  };
  function nd(e) {
    let { length: t } = e,
      n = new Eg(e),
      o = [],
      r = 0,
      s = 0,
      i = 0,
      c = 0,
      l = 0;
    do {
      let u = n.indexOf(";"),
        f = [],
        m = true,
        h = 0;
      for (r = 0; n.pos < u; ) {
        let v;
        ((r = $r(n, r)),
          r < h && (m = false),
          (h = r),
          Wu(n, u)
            ? ((s = $r(n, s)),
              (i = $r(n, i)),
              (c = $r(n, c)),
              Wu(n, u)
                ? ((l = $r(n, l)), (v = [r, s, i, c, l]))
                : (v = [r, s, i, c]))
            : (v = [r]),
          f.push(v),
          n.pos++);
      }
      (m || Sg(f), o.push(f), (n.pos = u + 1));
    } while (n.pos <= t);
    return o;
  }
  function Sg(e) {
    e.sort(Ag);
  }
  function Ag(e, t) {
    return e[0] - t[0];
  }
  var od = /^[a-zA-Z][a-zA-Z\d+\-.]*:/,
    Tg = /^data:application\/json[^,]+base64,/,
    _g =
      /(?:\/\/[@#][ \t]+sourceMappingURL=([^\s'"]+?)[ \t]*$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^*]+?)[ \t]*(?:\*\/)[ \t]*$)/,
    rd = typeof WeakRef < "u",
    Br = new Map(),
    Qi = new Map(),
    Pg = (e) => rd && e instanceof WeakRef,
    Ku = (e, t, n, o) => {
      if (n < 0 || n >= e.length) return null;
      let r = e[n];
      if (!r || r.length === 0) return null;
      let s = null;
      for (let f of r)
        if (f[0] <= o) s = f;
        else break;
      if (!s || s.length < 4) return null;
      let [, i, c, l] = s;
      if (i === void 0 || c === void 0 || l === void 0) return null;
      let u = t[i];
      return u ? { columnNumber: l, fileName: u, lineNumber: c + 1 } : null;
    },
    kg = (e, t, n) => {
      if (e.sections) {
        let o = null;
        for (let i of e.sections)
          if (
            t > i.offset.line ||
            (t === i.offset.line && n >= i.offset.column)
          )
            o = i;
          else break;
        if (!o) return null;
        let r = t - o.offset.line,
          s = t === o.offset.line ? n - o.offset.column : n;
        return Ku(o.map.mappings, o.map.sources, r, s);
      }
      return Ku(e.mappings, e.sources, t - 1, n);
    },
    Og = (e, t) => {
      let n = t.split(`
`),
        o;
      for (let s = n.length - 1; s >= 0 && !o; s--) {
        let i = n[s].match(_g);
        i && (o = i[1] || i[2]);
      }
      if (!o) return null;
      let r = od.test(o);
      if (!(Tg.test(o) || r || o.startsWith("/"))) {
        let s = e.split("/");
        ((s[s.length - 1] = o), (o = s.join("/")));
      }
      return o;
    },
    Mg = (e) => ({
      file: e.file,
      mappings: nd(e.mappings),
      names: e.names,
      sourceRoot: e.sourceRoot,
      sources: e.sources,
      sourcesContent: e.sourcesContent,
      version: 3,
    }),
    Ig = (e) => {
      let t = e.sections.map(({ map: o, offset: r }) => ({
          map: { ...o, mappings: nd(o.mappings) },
          offset: r,
        })),
        n = new Set();
      for (let o of t) for (let r of o.map.sources) n.add(r);
      return {
        file: e.file,
        mappings: [],
        names: [],
        sections: t,
        sourceRoot: void 0,
        sources: Array.from(n),
        sourcesContent: void 0,
        version: 3,
      };
    },
    Xu = (e) => {
      if (!e) return false;
      let t = e.trim();
      if (!t) return false;
      let n = t.match(od);
      if (!n) return true;
      let o = n[0].toLowerCase();
      return o === "http:" || o === "https:";
    },
    Rg = async (e, t = fetch) => {
      if (!Xu(e)) return null;
      let n;
      try {
        let r = await t(e);
        if (!r.ok) return null;
        n = await r.text();
      } catch {
        return null;
      }
      if (!n) return null;
      let o = Og(e, n);
      if (!o || !Xu(o)) return null;
      try {
        let r = await t(o);
        if (!r.ok) return null;
        let s = await r.json();
        return "sections" in s ? Ig(s) : Mg(s);
      } catch {
        return null;
      }
    },
    Ng = async (e, t = true, n) => {
      if (t && Br.has(e)) {
        let s = Br.get(e);
        if (s == null) return null;
        if (Pg(s)) {
          let i = s.deref();
          if (i) return i;
          Br.delete(e);
        } else return s;
      }
      if (t && Qi.has(e)) return Qi.get(e);
      let o = Rg(e, n);
      t && Qi.set(e, o);
      let r = await o;
      return (
        t && Qi.delete(e),
        t &&
          (r === null ? Br.set(e, null) : Br.set(e, rd ? new WeakRef(r) : r)),
        r
      );
    },
    Lg = async (e, t = true, n) =>
      await Promise.all(
        e.map(async (o) => {
          if (!o.fileName) return o;
          let r = await Ng(o.fileName, t, n);
          if (
            !r ||
            typeof o.lineNumber != "number" ||
            typeof o.columnNumber != "number"
          )
            return o;
          let s = kg(r, o.lineNumber, o.columnNumber);
          return s
            ? {
                ...o,
                source:
                  s.fileName && o.source
                    ? o.source.replace(o.fileName, s.fileName)
                    : o.source,
                fileName: s.fileName,
                lineNumber: s.lineNumber,
                columnNumber: s.columnNumber,
                isSymbolicated: true,
              }
            : o;
        }),
      ),
    Qa = (e) =>
      e._debugStack instanceof Error && typeof e._debugStack?.stack == "string",
    Dg = () => {
      let e = Un();
      for (let t of [...Array.from(Gn), ...Array.from(e.renderers.values())]) {
        let n = t.currentDispatcherRef;
        if (n && typeof n == "object") return "H" in n ? n.H : n.current;
      }
      return null;
    },
    Yu = (e) => {
      for (let t of Gn) {
        let n = t.currentDispatcherRef;
        n && typeof n == "object" && ("H" in n ? (n.H = e) : (n.current = e));
      }
    },
    Sn = (e) => `
    in ${e}`,
    Fg = (e, t) => {
      let n = Sn(e);
      return (t && (n += ` (at ${t})`), n);
    },
    qa = false,
    Za = (e, t) => {
      if (!e || qa) return "";
      let n = Error.prepareStackTrace;
      ((Error.prepareStackTrace = void 0), (qa = true));
      let o = Dg();
      Yu(null);
      let r = console.error,
        s = console.warn;
      ((console.error = () => {}), (console.warn = () => {}));
      try {
        let c = {
          DetermineComponentFrameRoot() {
            let f;
            try {
              if (t) {
                let m = function () {
                  throw Error();
                };
                if (
                  (Object.defineProperty(m.prototype, "props", {
                    set: function () {
                      throw Error();
                    },
                  }),
                  typeof Reflect == "object" && Reflect.construct)
                ) {
                  try {
                    Reflect.construct(m, []);
                  } catch (h) {
                    f = h;
                  }
                  Reflect.construct(e, [], m);
                } else {
                  try {
                    m.call();
                  } catch (h) {
                    f = h;
                  }
                  e.call(m.prototype);
                }
              } else {
                try {
                  throw Error();
                } catch (h) {
                  f = h;
                }
                let m = e();
                m && typeof m.catch == "function" && m.catch(() => {});
              }
            } catch (m) {
              if (
                m instanceof Error &&
                f instanceof Error &&
                typeof m.stack == "string"
              )
                return [m.stack, f.stack];
            }
            return [null, null];
          },
        };
        ((c.DetermineComponentFrameRoot.displayName =
          "DetermineComponentFrameRoot"),
          Object.getOwnPropertyDescriptor(c.DetermineComponentFrameRoot, "name")
            ?.configurable &&
            Object.defineProperty(c.DetermineComponentFrameRoot, "name", {
              value: "DetermineComponentFrameRoot",
            }));
        let [l, u] = c.DetermineComponentFrameRoot();
        if (l && u) {
          let f = l.split(`
`),
            m = u.split(`
`),
            h = 0,
            v = 0;
          for (
            ;
            h < f.length && !f[h].includes("DetermineComponentFrameRoot");
          )
            h++;
          for (
            ;
            v < m.length && !m[v].includes("DetermineComponentFrameRoot");
          )
            v++;
          if (h === f.length || v === m.length)
            for (
              h = f.length - 1, v = m.length - 1;
              h >= 1 && v >= 0 && f[h] !== m[v];
            )
              v--;
          for (; h >= 1 && v >= 0; h--, v--)
            if (f[h] !== m[v]) {
              if (h !== 1 || v !== 1)
                do
                  if ((h--, v--, v < 0 || f[h] !== m[v])) {
                    let H = `
${f[h].replace(" at new ", " at ")}`,
                      F = jn(e);
                    return (
                      F &&
                        H.includes("<anonymous>") &&
                        (H = H.replace("<anonymous>", F)),
                      H
                    );
                  }
                while (h >= 1 && v >= 0);
              break;
            }
        }
      } finally {
        ((qa = false),
          (Error.prepareStackTrace = n),
          Yu(o),
          (console.error = r),
          (console.warn = s));
      }
      let i = e ? jn(e) : "";
      return i ? Sn(i) : "";
    },
    Hg = (e, t) => {
      let n = e.tag,
        o = "";
      switch (n) {
        case Ua:
          o = Sn("Activity");
          break;
        case La:
          o = Za(e.type, true);
          break;
        case Fa:
          o = Za(e.type.render, false);
          break;
        case Na:
        case $a:
          o = Za(e.type, false);
          break;
        case Da:
        case Va:
        case Ga:
          o = Sn(e.type);
          break;
        case Ba:
          o = Sn("Lazy");
          break;
        case Ha:
          o =
            e.child !== t && t !== null
              ? Sn("Suspense Fallback")
              : Sn("Suspense");
          break;
        case za:
          o = Sn("SuspenseList");
          break;
        case ja:
          o = Sn("ViewTransition");
          break;
        default:
          return "";
      }
      return o;
    },
    $g = (e) => {
      try {
        let t = "",
          n = e,
          o = null;
        do {
          t += Hg(n, o);
          let r = n._debugInfo;
          if (r && Array.isArray(r))
            for (let s = r.length - 1; s >= 0; s--) {
              let i = r[s];
              typeof i.name == "string" && (t += Fg(i.name, i.env));
            }
          ((o = n), (n = n.return));
        } while (n);
        return t;
      } catch (t) {
        return t instanceof Error
          ? `
Error generating stack: ${t.message}
${t.stack}`
          : "";
      }
    },
    el = (e) => {
      let t = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      let n = e;
      if (!n) return "";
      ((Error.prepareStackTrace = t),
        n.startsWith(`Error: react-stack-top-frame
`) && (n = n.slice(29)));
      let o = n.indexOf(`
`);
      if (
        (o !== -1 && (n = n.slice(o + 1)),
        (o = Math.max(
          n.indexOf("react_stack_bottom_frame"),
          n.indexOf("react-stack-bottom-frame"),
        )),
        o !== -1 &&
          (o = n.lastIndexOf(
            `
`,
            o,
          )),
        o !== -1)
      )
        n = n.slice(0, o);
      else return "";
      return n;
    },
    Bg = (e) => !!(e.fileName?.startsWith("rsc://") && e.functionName),
    zg = (e, t) =>
      e.fileName === t.fileName &&
      e.lineNumber === t.lineNumber &&
      e.columnNumber === t.columnNumber,
    Vg = (e) => {
      let t = new Map();
      for (let n of e)
        for (let o of n.stackFrames) {
          if (!Bg(o)) continue;
          let r = o.functionName,
            s = t.get(r) ?? [];
          s.some((i) => zg(i, o)) || (s.push(o), t.set(r, s));
        }
      return t;
    },
    Gg = (e, t, n) => {
      if (!e.functionName) return { ...e, isServer: true };
      let o = t.get(e.functionName);
      if (!o || o.length === 0) return { ...e, isServer: true };
      let r = n.get(e.functionName) ?? 0,
        s = o[r % o.length];
      return (
        n.set(e.functionName, r + 1),
        {
          ...e,
          isServer: true,
          fileName: s.fileName,
          lineNumber: s.lineNumber,
          columnNumber: s.columnNumber,
          source: e.source?.replace(
            Ju,
            `(${s.fileName}:${s.lineNumber}:${s.columnNumber})`,
          ),
        }
      );
    },
    Ug = (e) => {
      let t = [];
      return (
        Jo(
          e,
          (n) => {
            if (!Qa(n)) return;
            let o =
              typeof n.type == "string" ? n.type : jn(n.type) || "<anonymous>";
            t.push({
              componentName: o,
              stackFrames: es(el(n._debugStack?.stack)),
            });
          },
          true,
        ),
        t
      );
    },
    id = async (e, t = true, n) => {
      let o = Ug(e),
        r = es($g(e)),
        s = Vg(o),
        i = new Map();
      return Lg(
        r
          .map((c) => ((c.source?.includes(Ju) ?? false) ? Gg(c, s, i) : c))
          .filter((c, l, u) => {
            if (l === 0) return true;
            let f = u[l - 1];
            return c.functionName !== f.functionName;
          }),
        t,
        n,
      );
    };
  var qu = (e) => e.split("/").filter(Boolean).length,
    jg = (e) => e.split("/").filter(Boolean)[0] ?? null,
    Wg = (e) => {
      let t = e.indexOf("/", 1);
      if (t === -1 || qu(e.slice(0, t)) !== 1) return e;
      let n = e.slice(t);
      if (!Zu.test(n) || qu(n) < 2) return e;
      let o = jg(n);
      return !o || o.startsWith("@") || o.length > 4 ? e : n;
    },
    An = (e) => {
      if (!e || hg.some((s) => s === e)) return "";
      let t = e,
        n = t.startsWith("http://") || t.startsWith("https://");
      if (n)
        try {
          t = new URL(t).pathname;
        } catch {}
      if ((n && (t = Wg(t)), t.startsWith("about://React/"))) {
        let s = t.slice(14),
          i = s.indexOf("/"),
          c = s.indexOf(":");
        t = i !== -1 && (c === -1 || i < c) ? s.slice(i + 1) : s;
      }
      let o = true;
      for (; o; ) {
        o = false;
        for (let s of gg)
          if (t.startsWith(s)) {
            ((t = t.slice(s.length)),
              s === "file:///" && (t = `/${t.replace(/^\/+/, "")}`),
              (o = true));
            break;
          }
      }
      if (Vu.test(t)) {
        let s = t.match(Vu);
        s && (t = t.slice(s[0].length));
      }
      if (t.startsWith("//")) {
        let s = t.indexOf("/", 2);
        t = s === -1 ? "" : t.slice(s);
      }
      let r = t.indexOf("?");
      if (r !== -1) {
        let s = t.slice(r);
        yg.test(s) && (t = t.slice(0, r));
      }
      return t;
    },
    ho = (e) => {
      let t = An(e);
      return !(!t || !Zu.test(t) || bg.test(t));
    };
  var sd = (e) => e.length > 0 && /^[A-Z]/.test(e);
  Ji();
  var ts = (e, t) => (e.length > t ? `${e.slice(0, t)}...` : e);
  var Kg = new Set([
      "_",
      "$",
      "motion.",
      "styled.",
      "chakra.",
      "ark.",
      "Primitive.",
      "Slot.",
    ]),
    Xg = new Set([
      "InnerLayoutRouter",
      "RedirectErrorBoundary",
      "RedirectBoundary",
      "HTTPAccessFallbackErrorBoundary",
      "HTTPAccessFallbackBoundary",
      "LoadingBoundary",
      "ErrorBoundary",
      "InnerScrollAndFocusHandler",
      "ScrollAndFocusHandler",
      "RenderFromTemplateContext",
      "OuterLayoutRouter",
      "body",
      "html",
      "DevRootHTTPAccessFallbackBoundary",
      "AppDevOverlayErrorBoundary",
      "AppDevOverlay",
      "HotReload",
      "Router",
      "ErrorBoundaryHandler",
      "AppRouter",
      "ServerRoot",
      "SegmentStateProvider",
      "RootErrorBoundary",
      "LoadableComponent",
      "MotionDOMComponent",
    ]),
    Yg = new Set([
      "Suspense",
      "Fragment",
      "StrictMode",
      "Profiler",
      "SuspenseList",
    ]),
    tl,
    er = (e) => (
      e && (tl = void 0),
      (tl ??=
        typeof document < "u" &&
        !!(
          document.getElementById("__NEXT_DATA__") ||
          document.querySelector("nextjs-portal")
        )),
      tl
    ),
    ld = (e) => {
      if (Xg.has(e) || Yg.has(e)) return true;
      for (let t of Kg) if (e.startsWith(t)) return true;
      return false;
    },
    bo = (e) =>
      !(
        e.length <= 1 ||
        ld(e) ||
        !sd(e) ||
        e.startsWith("Primitive.") ||
        e.endsWith("Provider") ||
        e.endsWith("Context")
      ),
    cd = ["about://React/", "rsc://React/"],
    qg = (e) => cd.some((t) => e.startsWith(t)),
    Zg = (e) => {
      for (let t of cd) {
        if (!e.startsWith(t)) continue;
        let n = e.indexOf("/", t.length),
          o = e.lastIndexOf("?");
        if (n > -1 && o > -1) return decodeURI(e.slice(n + 1, o));
      }
      return e;
    },
    Jg = async (e) => {
      let t = [],
        n = [];
      for (let s = 0; s < e.length; s++) {
        let i = e[s];
        !i.isServer ||
          !i.fileName ||
          (t.push(s),
          n.push({
            file: Zg(i.fileName),
            methodName: i.functionName ?? "<unknown>",
            line1: i.lineNumber ?? null,
            column1: i.columnNumber ?? null,
            arguments: [],
          }));
      }
      if (n.length === 0) return e;
      let o = new AbortController(),
        r = setTimeout(() => o.abort(), Zc);
      try {
        let s = await fetch("/__nextjs_original-stack-frames", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frames: n,
            isServer: !0,
            isEdgeServer: !1,
            isAppDirectory: !0,
          }),
          signal: o.signal,
        });
        if (!s.ok) return e;
        let i = await s.json(),
          c = [...e];
        for (let l = 0; l < t.length; l++) {
          let u = i[l];
          if (u?.status !== "fulfilled") continue;
          let f = u.value?.originalStackFrame;
          if (!f?.file || f.ignored) continue;
          let m = t[l];
          c[m] = {
            ...e[m],
            fileName: f.file,
            lineNumber: f.line1 ?? void 0,
            columnNumber: f.column1 ?? void 0,
            isSymbolicated: !0,
          };
        }
        return c;
      } catch {
        return e;
      } finally {
        clearTimeout(r);
      }
    },
    Qg = (e) => {
      let t = new Map();
      return (
        Jo(
          e,
          (n) => {
            if (!Qa(n)) return false;
            let o = el(n._debugStack.stack);
            if (!o) return false;
            for (let r of es(o))
              !r.functionName ||
                !r.fileName ||
                (qg(r.fileName) &&
                  (t.has(r.functionName) ||
                    t.set(r.functionName, { ...r, isServer: true })));
            return false;
          },
          true,
        ),
        t
      );
    },
    eh = (e, t) => {
      if (!t.some((r) => r.isServer && !r.fileName && r.functionName)) return t;
      let o = Qg(e);
      return o.size === 0
        ? t
        : t.map((r) => {
            if (!r.isServer || r.fileName || !r.functionName) return r;
            let s = o.get(r.functionName);
            return s
              ? {
                  ...r,
                  fileName: s.fileName,
                  lineNumber: s.lineNumber,
                  columnNumber: s.columnNumber,
                }
              : r;
          });
    },
    nl = (e) => {
      if (!En()) return e;
      let t = e;
      for (; t; ) {
        if (Wn(t)) return t;
        t = t.parentElement;
      }
      return e;
    },
    ad = new WeakMap(),
    th = async (e) => {
      try {
        let t = Wn(e);
        if (!t) return null;
        let n = await id(t);
        if (er()) {
          let o = eh(t, n);
          return await Jg(o);
        }
        return n;
      } catch {
        return null;
      }
    },
    Tn = (e) => {
      if (!En()) return Promise.resolve([]);
      let t = nl(e),
        n = ad.get(t);
      if (n) return n;
      let o = th(t);
      return (ad.set(t, o), o);
    },
    tr = async (e) => {
      if (!En()) return null;
      let t = await Tn(e);
      if (!t) return null;
      for (let n of t)
        if (n.functionName && bo(n.functionName)) return n.functionName;
      return null;
    },
    ol = (e) => {
      if (!e || e.length === 0) return null;
      let t = e.filter((r) => r.fileName && ho(r.fileName)),
        o = t.find((r) => r.functionName && bo(r.functionName)) ?? t[0];
      return o?.fileName
        ? {
            filePath: An(o.fileName),
            lineNumber: o.lineNumber,
            componentName:
              o.functionName && bo(o.functionName) ? o.functionName : null,
          }
        : null;
    },
    ud = (e) =>
      !(
        !e ||
        ld(e) ||
        e.startsWith("Primitive.") ||
        e === "SlotClone" ||
        e === "Slot"
      ),
    zr = (e) => {
      if (!En()) return null;
      let t = nl(e),
        n = Wn(t);
      if (!n) return null;
      let o = n.return;
      for (; o; ) {
        if (Zo(o)) {
          let r = jn(o.type);
          if (r && ud(r)) return r;
        }
        o = o.return;
      }
      return null;
    },
    nh = (e) =>
      e ? e.some((t) => t.isServer || (t.fileName && ho(t.fileName))) : false,
    oh = (e, t) => {
      if (!En()) return [];
      let n = Wn(e);
      if (!n) return [];
      let o = [];
      return (
        Jo(
          n,
          (r) => {
            if (o.length >= t) return true;
            if (Zo(r)) {
              let s = jn(r.type);
              s && ud(s) && o.push(s);
            }
            return false;
          },
          true,
        ),
        o
      );
    },
    rh = (e, t = {}) => {
      let { maxLines: n = 5 } = t,
        o = er(),
        r = [];
      for (let s of e) {
        if (r.length >= n) break;
        let i = s.fileName && ho(s.fileName);
        if (s.isServer && !i && (!s.functionName || bo(s.functionName))) {
          r.push(`
  in ${s.functionName || "<anonymous>"} (at Server)`);
          continue;
        }
        if (i) {
          let c = `
  in `,
            l = s.functionName && bo(s.functionName);
          (l && (c += `${s.functionName} (at `),
            (c += An(s.fileName)),
            o &&
              s.lineNumber &&
              s.columnNumber &&
              (c += `:${s.lineNumber}:${s.columnNumber}`),
            l && (c += ")"),
            r.push(c));
        }
      }
      return r.join("");
    },
    rl = async (e, t = {}) => {
      let n = t.maxLines ?? 5,
        o = await Tn(e);
      if (o && nh(o)) return rh(o, t);
      let r = oh(e, n);
      return r.length > 0
        ? r
            .map(
              (s) => `
  in ${s}`,
            )
            .join("")
        : "";
    },
    ns = async (e, t = {}) => {
      let n = nl(e),
        o = sh(n),
        r = await rl(n, t);
      return r ? `${o}${r}` : ih(n);
    },
    ih = (e) => {
      let t = ct(e);
      if (!(e instanceof HTMLElement)) {
        let s = fd(e, { truncate: false, maxAttrs: ga.length });
        return `<${t}${s} />`;
      }
      let n = e.innerText?.trim() ?? e.textContent?.trim() ?? "",
        o = "";
      for (let { name: s, value: i } of e.attributes) o += ` ${s}="${i}"`;
      let r = ts(n, Or);
      return r.length > 0
        ? `<${t}${o}>
  ${r}
</${t}>`
        : `<${t}${o} />`;
    },
    dd = (e) => ts(e, Yc),
    fd = (e, t = {}) => {
      let { truncate: n = true, maxAttrs: o = qc } = t,
        r = [];
      for (let s of ga) {
        if (r.length >= o) break;
        let i = e.getAttribute(s);
        if (i) {
          let c = n ? dd(i) : i;
          r.push(`${s}="${c}"`);
        }
      }
      return r.length > 0 ? ` ${r.join(" ")}` : "";
    },
    sh = (e) => {
      let t = ct(e);
      if (!(e instanceof HTMLElement)) {
        let h = fd(e);
        return `<${t}${h} />`;
      }
      let n = e.innerText?.trim() ?? e.textContent?.trim() ?? "",
        o = "";
      for (let { name: h, value: v } of e.attributes) o += ` ${h}="${dd(v)}"`;
      let r = [],
        s = [],
        i = false,
        c = Array.from(e.childNodes);
      for (let h of c)
        h.nodeType !== Node.COMMENT_NODE &&
          (h.nodeType === Node.TEXT_NODE
            ? h.textContent && h.textContent.trim().length > 0 && (i = true)
            : h instanceof Element && (i ? s.push(h) : r.push(h)));
      let l = (h) =>
          h.length === 0
            ? ""
            : h.length <= 2
              ? h.map((v) => `<${ct(v)} ...>`).join(`
  `)
              : `(${h.length} elements)`,
        u = "",
        f = l(r);
      (f &&
        (u += `
  ${f}`),
        n.length > 0 &&
          (u += `
  ${ts(n, Or)}`));
      let m = l(s);
      return (
        m &&
          (u += `
  ${m}`),
        u.length > 0
          ? `<${t}${o}>${u}
</${t}>`
          : `<${t}${o} />`
      );
    };
  var ah = "https://react-grab.com",
    md = (e, t) => {
      let n = t ? `&line=${t}` : "";
      return `${ah}/open-file?url=${encodeURIComponent(e)}${n}`;
    };
  var lh = async (e, t) => {
      let n = er(),
        o = new URLSearchParams({ file: e }),
        r = n ? "line1" : "line",
        s = n ? "column1" : "column";
      return (
        t && o.set(r, String(t)),
        o.set(s, "1"),
        (
          await fetch(
            `${n ? "/__nextjs_launch-editor" : "/__open-in-editor"}?${o}`,
          )
        ).ok
      );
    },
    nr = async (e, t, n) => {
      if (((e = An(e)), await lh(e, t).catch(() => false))) return;
      let r = md(e, t),
        s = n ? n(r, e, t) : r;
      window.open(s, "_blank", "noopener,noreferrer");
    };
  var or = (e, t, n) => e + (t - e) * n;
  var uh = D(
      "<canvas data-react-grab-overlay-canvas style=position:fixed;top:0;left:0;pointer-events:none>",
    ),
    Kn = {
      drag: { borderColor: Gc, fillColor: Uc, lerpFactor: 0.7 },
      selection: { borderColor: Ui, fillColor: ji, lerpFactor: 0.95 },
      grabbed: { borderColor: Ui, fillColor: ji, lerpFactor: 0.95 },
      processing: { borderColor: Ui, fillColor: ji, lerpFactor: 0.95 },
    },
    hd = (e) => {
      let t,
        n = null,
        o = 0,
        r = 0,
        s = 1,
        i = null,
        c = {
          crosshair: { canvas: null, context: null },
          drag: { canvas: null, context: null },
          selection: { canvas: null, context: null },
          grabbed: { canvas: null, context: null },
          processing: { canvas: null, context: null },
        },
        l = { x: 0, y: 0 },
        u = [],
        f = null,
        m = [],
        h = [],
        v = (A, I, U) => {
          let q = new OffscreenCanvas(A * U, I * U),
            x = q.getContext("2d");
          return (x && x.scale(U, U), { canvas: q, context: x });
        },
        H = () => {
          if (t) {
            ((s = Math.max(window.devicePixelRatio || 1, 2)),
              (o = window.innerWidth),
              (r = window.innerHeight),
              (t.width = o * s),
              (t.height = r * s),
              (t.style.width = `${o}px`),
              (t.style.height = `${r}px`),
              (n = t.getContext("2d")),
              n && n.scale(s, s));
            for (let A of Object.keys(c)) c[A] = v(o, r, s);
          }
        },
        F = (A) => {
          if (!A) return 0;
          let I = A.match(/^(\d+(?:\.\d+)?)/);
          return I ? parseFloat(I[1]) : 0;
        },
        y = (A, I, U) => ({
          id: A,
          current: { x: I.x, y: I.y, width: I.width, height: I.height },
          target: { x: I.x, y: I.y, width: I.width, height: I.height },
          borderRadius: F(I.borderRadius),
          opacity: U?.opacity ?? 1,
          targetOpacity: U?.targetOpacity ?? U?.opacity ?? 1,
          createdAt: U?.createdAt,
          isInitialized: true,
        }),
        w = (A, I, U) => {
          ((A.target = { x: I.x, y: I.y, width: I.width, height: I.height }),
            (A.borderRadius = F(I.borderRadius)),
            U !== void 0 && (A.targetOpacity = U));
        },
        b = (A) => A.boundsMultiple ?? [A.bounds],
        g = (A, I, U, q, x, T, K, z, te = 1) => {
          if (q <= 0 || x <= 0) return;
          let j = Math.min(q / 2, x / 2),
            Ee = Math.min(T, j);
          ((A.globalAlpha = te),
            A.beginPath(),
            Ee > 0 ? A.roundRect(I, U, q, x, Ee) : A.rect(I, U, q, x),
            (A.fillStyle = K),
            A.fill(),
            (A.strokeStyle = z),
            (A.lineWidth = 1),
            A.stroke(),
            (A.globalAlpha = 1));
        },
        C = () => {
          let A = c.crosshair;
          if (!A.context) return;
          let I = A.context;
          (I.clearRect(0, 0, o, r),
            e.crosshairVisible &&
              ((I.strokeStyle = Vc),
              (I.lineWidth = 1),
              I.beginPath(),
              I.moveTo(l.x, 0),
              I.lineTo(l.x, r),
              I.moveTo(0, l.y),
              I.lineTo(o, l.y),
              I.stroke()));
        },
        O = () => {
          let A = c.drag;
          if (!A.context) return;
          let I = A.context;
          if ((I.clearRect(0, 0, o, r), !e.dragVisible || !f)) return;
          let U = Kn.drag;
          g(
            I,
            f.current.x,
            f.current.y,
            f.current.width,
            f.current.height,
            f.borderRadius,
            U.fillColor,
            U.borderColor,
          );
        },
        V = () => {
          let A = c.selection;
          if (!A.context) return;
          let I = A.context;
          if ((I.clearRect(0, 0, o, r), !e.selectionVisible)) return;
          let U = Kn.selection;
          for (let q of u) {
            let x = e.selectionIsFading ? 0 : q.opacity;
            g(
              I,
              q.current.x,
              q.current.y,
              q.current.width,
              q.current.height,
              q.borderRadius,
              U.fillColor,
              U.borderColor,
              x,
            );
          }
        },
        Q = () => {
          let A = c.grabbed;
          if (!A.context) return;
          let I = A.context;
          I.clearRect(0, 0, o, r);
          let U = Kn.grabbed;
          for (let q of m)
            g(
              I,
              q.current.x,
              q.current.y,
              q.current.width,
              q.current.height,
              q.borderRadius,
              U.fillColor,
              U.borderColor,
              q.opacity,
            );
        },
        X = () => {
          let A = c.processing;
          if (!A.context) return;
          let I = A.context;
          I.clearRect(0, 0, o, r);
          let U = Kn.processing;
          for (let q of h)
            g(
              I,
              q.current.x,
              q.current.y,
              q.current.width,
              q.current.height,
              q.borderRadius,
              U.fillColor,
              U.borderColor,
              q.opacity,
            );
        },
        ee = () => {
          if (!n || !t) return;
          (n.setTransform(1, 0, 0, 1, 0, 0),
            n.clearRect(0, 0, t.width, t.height),
            n.setTransform(s, 0, 0, s, 0, 0),
            C(),
            O(),
            V(),
            Q(),
            X());
          let A = ["crosshair", "drag", "selection", "grabbed", "processing"];
          for (let I of A) {
            let U = c[I];
            U.canvas && n.drawImage(U.canvas, 0, 0, o, r);
          }
        },
        ye = (A, I, U) => {
          let q = or(A.current.x, A.target.x, I),
            x = or(A.current.y, A.target.y, I),
            T = or(A.current.width, A.target.width, I),
            K = or(A.current.height, A.target.height, I),
            z =
              Math.abs(q - A.target.x) < 0.5 &&
              Math.abs(x - A.target.y) < 0.5 &&
              Math.abs(T - A.target.width) < 0.5 &&
              Math.abs(K - A.target.height) < 0.5;
          ((A.current.x = z ? A.target.x : q),
            (A.current.y = z ? A.target.y : x),
            (A.current.width = z ? A.target.width : T),
            (A.current.height = z ? A.target.height : K));
          let te = true;
          if (U?.interpolateOpacity) {
            let j = or(A.opacity, A.targetOpacity, I);
            ((te = Math.abs(j - A.targetOpacity) < 0.01),
              (A.opacity = te ? A.targetOpacity : j));
          }
          return !z || !te;
        },
        ce = () => {
          let A = false;
          f?.isInitialized && ye(f, Kn.drag.lerpFactor) && (A = true);
          for (let U of u)
            U.isInitialized && ye(U, Kn.selection.lerpFactor) && (A = true);
          let I = Date.now();
          m = m.filter((U) => {
            let q = U.id.startsWith("label-");
            if (
              (U.isInitialized &&
                ye(U, Kn.grabbed.lerpFactor, { interpolateOpacity: q }) &&
                (A = true),
              U.createdAt)
            ) {
              let x = I - U.createdAt,
                T = 1600;
              if (x >= T) return false;
              if (x > 1500) {
                let K = (x - 1500) / 100;
                ((U.opacity = 1 - K), (A = true));
              }
              return true;
            }
            return q
              ? !(
                  Math.abs(U.opacity - U.targetOpacity) < 0.01 &&
                  U.targetOpacity === 0
                )
              : U.opacity > 0;
          });
          for (let U of h)
            U.isInitialized && ye(U, Kn.processing.lerpFactor) && (A = true);
          (ee(), A ? (i = Ve(ce)) : (i = null));
        },
        W = () => {
          i === null && (i = Ve(ce));
        },
        G = () => {
          (H(), W());
        };
      return (
        ge(
          He(
            () => e.crosshairVisible,
            () => {
              W();
            },
          ),
        ),
        ge(
          He(
            () => [
              e.selectionVisible,
              e.selectionBounds,
              e.selectionBoundsMultiple,
              e.selectionIsFading,
              e.selectionShouldSnap,
            ],
            ([A, I, U, , q]) => {
              if (!A || (!I && (!U || U.length === 0))) {
                ((u = []), W());
                return;
              }
              ((u = (U && U.length > 0 ? U : I ? [I] : []).map((T, K) => {
                let z = `selection-${K}`,
                  te = u.find((j) => j.id === z);
                return te
                  ? (w(te, T), q && (te.current = { ...te.target }), te)
                  : y(z, T);
              })),
                W());
            },
          ),
        ),
        ge(
          He(
            () => [e.dragVisible, e.dragBounds],
            ([A, I]) => {
              if (!A || !I) {
                ((f = null), W());
                return;
              }
              (f ? w(f, I) : (f = y("drag", I)), W());
            },
          ),
        ),
        ge(
          He(
            () => e.grabbedBoxes,
            (A) => {
              let I = A ?? [],
                U = new Set(I.map((x) => x.id)),
                q = new Set(m.map((x) => x.id));
              for (let x of I)
                q.has(x.id) ||
                  m.push(y(x.id, x.bounds, { createdAt: x.createdAt }));
              for (let x of m) {
                let T = I.find((K) => K.id === x.id);
                T && w(x, T.bounds);
              }
              ((m = m.filter((x) =>
                x.id.startsWith("label-") ? true : U.has(x.id),
              )),
                W());
            },
          ),
        ),
        ge(
          He(
            () => e.agentSessions,
            (A) => {
              if (!A || A.size === 0) {
                ((h = []), W());
                return;
              }
              let I = [];
              for (let [U, q] of A)
                for (let x = 0; x < q.selectionBounds.length; x++) {
                  let T = q.selectionBounds[x],
                    K = `processing-${U}-${x}`,
                    z = h.find((te) => te.id === K);
                  z ? (w(z, T), I.push(z)) : I.push(y(K, T));
                }
              ((h = I), W());
            },
          ),
        ),
        ge(
          He(
            () => e.labelInstances,
            (A) => {
              let I = A ?? [];
              for (let q of I) {
                let x = b(q),
                  T = q.status === "fading" ? 0 : 1;
                for (let K = 0; K < x.length; K++) {
                  let z = x[K],
                    te = `label-${q.id}-${K}`,
                    j = m.find((Ee) => Ee.id === te);
                  j
                    ? w(j, z, T)
                    : m.push(y(te, z, { opacity: 1, targetOpacity: T }));
                }
              }
              let U = new Set();
              for (let q of I) {
                let x = b(q);
                for (let T = 0; T < x.length; T++) U.add(`label-${q.id}-${T}`);
              }
              ((m = m.filter((q) =>
                q.id.startsWith("label-") ? U.has(q.id) : true,
              )),
                W());
            },
          ),
        ),
        lt(() => {
          (H(), W());
          let A = (x) => {
            x.isPrimary && ((l.x = x.clientX), (l.y = x.clientY), W());
          };
          (window.addEventListener("pointermove", A, { passive: true }),
            window.addEventListener("resize", G));
          let I = null,
            U = () => {
              Math.max(window.devicePixelRatio || 1, 2) !== s && (G(), q());
            },
            q = () => {
              (I && I.removeEventListener("change", U),
                (I = window.matchMedia(
                  `(resolution: ${window.devicePixelRatio}dppx)`,
                )),
                I.addEventListener("change", U));
            };
          (q(),
            _e(() => {
              (window.removeEventListener("pointermove", A),
                window.removeEventListener("resize", G),
                I && I.removeEventListener("change", U),
                i !== null && Ge(i));
            }));
        }),
        (() => {
          var A = uh(),
            I = t;
          return (
            typeof I == "function" ? We(I, A) : (t = A),
            Y((U) => pe(A, "z-index", String(2147483645))),
            A
          );
        })()
      );
    };
  var Vr = (e, t) => {
    ((e.style.height = "auto"),
      (e.style.height = `${Math.min(e.scrollHeight, t)}px`));
  };
  var rs = (e) => {
    if (e <= 0) return Bn;
    let t = e * Xc;
    return Math.max(Kc, Math.min(Bn, t));
  };
  function bd(e) {
    var t,
      n,
      o = "";
    if (typeof e == "string" || typeof e == "number") o += e;
    else if (typeof e == "object")
      if (Array.isArray(e)) {
        var r = e.length;
        for (t = 0; t < r; t++)
          e[t] && (n = bd(e[t])) && (o && (o += " "), (o += n));
      } else for (n in e) e[n] && (o && (o += " "), (o += n));
    return o;
  }
  function yd() {
    for (var e, t, n = 0, o = "", r = arguments.length; n < r; n++)
      (e = arguments[n]) && (t = bd(e)) && (o && (o += " "), (o += t));
    return o;
  }
  var cl = "-",
    dh = (e) => {
      let t = mh(e),
        { conflictingClassGroups: n, conflictingClassGroupModifiers: o } = e;
      return {
        getClassGroupId: (i) => {
          let c = i.split(cl);
          return (
            c[0] === "" && c.length !== 1 && c.shift(), vd(c, t) || fh(i)
          );
        },
        getConflictingClassGroupIds: (i, c) => {
          let l = n[i] || [];
          return c && o[i] ? [...l, ...o[i]] : l;
        },
      };
    },
    vd = (e, t) => {
      if (e.length === 0) return t.classGroupId;
      let n = e[0],
        o = t.nextPart.get(n),
        r = o ? vd(e.slice(1), o) : void 0;
      if (r) return r;
      if (t.validators.length === 0) return;
      let s = e.join(cl);
      return t.validators.find(({ validator: i }) => i(s))?.classGroupId;
    },
    wd = /^\[(.+)\]$/,
    fh = (e) => {
      if (wd.test(e)) {
        let t = wd.exec(e)[1],
          n = t?.substring(0, t.indexOf(":"));
        if (n) return "arbitrary.." + n;
      }
    },
    mh = (e) => {
      let { theme: t, prefix: n } = e,
        o = { nextPart: new Map(), validators: [] };
      return (
        gh(Object.entries(e.classGroups), n).forEach(([s, i]) => {
          ll(i, o, s, t);
        }),
        o
      );
    },
    ll = (e, t, n, o) => {
      e.forEach((r) => {
        if (typeof r == "string") {
          let s = r === "" ? t : xd(t, r);
          s.classGroupId = n;
          return;
        }
        if (typeof r == "function") {
          if (ph(r)) {
            ll(r(o), t, n, o);
            return;
          }
          t.validators.push({ validator: r, classGroupId: n });
          return;
        }
        Object.entries(r).forEach(([s, i]) => {
          ll(i, xd(t, s), n, o);
        });
      });
    },
    xd = (e, t) => {
      let n = e;
      return (
        t.split(cl).forEach((o) => {
          (n.nextPart.has(o) ||
            n.nextPart.set(o, { nextPart: new Map(), validators: [] }),
            (n = n.nextPart.get(o)));
        }),
        n
      );
    },
    ph = (e) => e.isThemeGetter,
    gh = (e, t) =>
      t
        ? e.map(([n, o]) => {
            let r = o.map((s) =>
              typeof s == "string"
                ? t + s
                : typeof s == "object"
                  ? Object.fromEntries(
                      Object.entries(s).map(([i, c]) => [t + i, c]),
                    )
                  : s,
            );
            return [n, r];
          })
        : e,
    hh = (e) => {
      if (e < 1) return { get: () => {}, set: () => {} };
      let t = 0,
        n = new Map(),
        o = new Map(),
        r = (s, i) => {
          (n.set(s, i), t++, t > e && ((t = 0), (o = n), (n = new Map())));
        };
      return {
        get(s) {
          let i = n.get(s);
          if (i !== void 0) return i;
          if ((i = o.get(s)) !== void 0) return (r(s, i), i);
        },
        set(s, i) {
          n.has(s) ? n.set(s, i) : r(s, i);
        },
      };
    },
    Cd = "!",
    bh = (e) => {
      let { separator: t, experimentalParseClassName: n } = e,
        o = t.length === 1,
        r = t[0],
        s = t.length,
        i = (c) => {
          let l = [],
            u = 0,
            f = 0,
            m;
          for (let y = 0; y < c.length; y++) {
            let w = c[y];
            if (u === 0) {
              if (w === r && (o || c.slice(y, y + s) === t)) {
                (l.push(c.slice(f, y)), (f = y + s));
                continue;
              }
              if (w === "/") {
                m = y;
                continue;
              }
            }
            w === "[" ? u++ : w === "]" && u--;
          }
          let h = l.length === 0 ? c : c.substring(f),
            v = h.startsWith(Cd),
            H = v ? h.substring(1) : h,
            F = m && m > f ? m - f : void 0;
          return {
            modifiers: l,
            hasImportantModifier: v,
            baseClassName: H,
            maybePostfixModifierPosition: F,
          };
        };
      return n ? (c) => n({ className: c, parseClassName: i }) : i;
    },
    yh = (e) => {
      if (e.length <= 1) return e;
      let t = [],
        n = [];
      return (
        e.forEach((o) => {
          o[0] === "[" ? (t.push(...n.sort(), o), (n = [])) : n.push(o);
        }),
        t.push(...n.sort()),
        t
      );
    },
    wh = (e) => ({ cache: hh(e.cacheSize), parseClassName: bh(e), ...dh(e) }),
    xh = /\s+/,
    vh = (e, t) => {
      let {
          parseClassName: n,
          getClassGroupId: o,
          getConflictingClassGroupIds: r,
        } = t,
        s = [],
        i = e.trim().split(xh),
        c = "";
      for (let l = i.length - 1; l >= 0; l -= 1) {
        let u = i[l],
          {
            modifiers: f,
            hasImportantModifier: m,
            baseClassName: h,
            maybePostfixModifierPosition: v,
          } = n(u),
          H = !!v,
          F = o(H ? h.substring(0, v) : h);
        if (!F) {
          if (!H) {
            c = u + (c.length > 0 ? " " + c : c);
            continue;
          }
          if (((F = o(h)), !F)) {
            c = u + (c.length > 0 ? " " + c : c);
            continue;
          }
          H = false;
        }
        let y = yh(f).join(":"),
          w = m ? y + Cd : y,
          b = w + F;
        if (s.includes(b)) continue;
        s.push(b);
        let g = r(F, H);
        for (let C = 0; C < g.length; ++C) {
          let O = g[C];
          s.push(w + O);
        }
        c = u + (c.length > 0 ? " " + c : c);
      }
      return c;
    };
  function Ch() {
    let e = 0,
      t,
      n,
      o = "";
    for (; e < arguments.length; )
      (t = arguments[e++]) && (n = Ed(t)) && (o && (o += " "), (o += n));
    return o;
  }
  var Ed = (e) => {
    if (typeof e == "string") return e;
    let t,
      n = "";
    for (let o = 0; o < e.length; o++)
      e[o] && (t = Ed(e[o])) && (n && (n += " "), (n += t));
    return n;
  };
  function Eh(e, ...t) {
    let n,
      o,
      r,
      s = i;
    function i(l) {
      let u = t.reduce((f, m) => m(f), e());
      return ((n = wh(u)), (o = n.cache.get), (r = n.cache.set), (s = c), c(l));
    }
    function c(l) {
      let u = o(l);
      if (u) return u;
      let f = vh(l, n);
      return (r(l, f), f);
    }
    return function () {
      return s(Ch.apply(null, arguments));
    };
  }
  var et = (e) => {
      let t = (n) => n[e] || [];
      return ((t.isThemeGetter = true), t);
    },
    Sd = /^\[(?:([a-z-]+):)?(.+)\]$/i,
    Sh = /^\d+\/\d+$/,
    Ah = new Set(["px", "full", "screen"]),
    Th = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,
    _h =
      /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,
    Ph = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/,
    kh = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,
    Oh =
      /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,
    _n = (e) => rr(e) || Ah.has(e) || Sh.test(e),
    Xn = (e) => ir(e, "length", Hh),
    rr = (e) => !!e && !Number.isNaN(Number(e)),
    al = (e) => ir(e, "number", rr),
    Gr = (e) => !!e && Number.isInteger(Number(e)),
    Mh = (e) => e.endsWith("%") && rr(e.slice(0, -1)),
    Oe = (e) => Sd.test(e),
    Yn = (e) => Th.test(e),
    Ih = new Set(["length", "size", "percentage"]),
    Rh = (e) => ir(e, Ih, Ad),
    Nh = (e) => ir(e, "position", Ad),
    Lh = new Set(["image", "url"]),
    Dh = (e) => ir(e, Lh, Bh),
    Fh = (e) => ir(e, "", $h),
    Ur = () => true,
    ir = (e, t, n) => {
      let o = Sd.exec(e);
      return o
        ? o[1]
          ? typeof t == "string"
            ? o[1] === t
            : t.has(o[1])
          : n(o[2])
        : false;
    },
    Hh = (e) => _h.test(e) && !Ph.test(e),
    Ad = () => false,
    $h = (e) => kh.test(e),
    Bh = (e) => Oh.test(e);
  var zh = () => {
    let e = et("colors"),
      t = et("spacing"),
      n = et("blur"),
      o = et("brightness"),
      r = et("borderColor"),
      s = et("borderRadius"),
      i = et("borderSpacing"),
      c = et("borderWidth"),
      l = et("contrast"),
      u = et("grayscale"),
      f = et("hueRotate"),
      m = et("invert"),
      h = et("gap"),
      v = et("gradientColorStops"),
      H = et("gradientColorStopPositions"),
      F = et("inset"),
      y = et("margin"),
      w = et("opacity"),
      b = et("padding"),
      g = et("saturate"),
      C = et("scale"),
      O = et("sepia"),
      V = et("skew"),
      Q = et("space"),
      X = et("translate"),
      ee = () => ["auto", "contain", "none"],
      ye = () => ["auto", "hidden", "clip", "visible", "scroll"],
      ce = () => ["auto", Oe, t],
      W = () => [Oe, t],
      G = () => ["", _n, Xn],
      A = () => ["auto", rr, Oe],
      I = () => [
        "bottom",
        "center",
        "left",
        "left-bottom",
        "left-top",
        "right",
        "right-bottom",
        "right-top",
        "top",
      ],
      U = () => ["solid", "dashed", "dotted", "double", "none"],
      q = () => [
        "normal",
        "multiply",
        "screen",
        "overlay",
        "darken",
        "lighten",
        "color-dodge",
        "color-burn",
        "hard-light",
        "soft-light",
        "difference",
        "exclusion",
        "hue",
        "saturation",
        "color",
        "luminosity",
      ],
      x = () => [
        "start",
        "end",
        "center",
        "between",
        "around",
        "evenly",
        "stretch",
      ],
      T = () => ["", "0", Oe],
      K = () => [
        "auto",
        "avoid",
        "all",
        "avoid-page",
        "page",
        "left",
        "right",
        "column",
      ],
      z = () => [rr, Oe];
    return {
      cacheSize: 500,
      separator: ":",
      theme: {
        colors: [Ur],
        spacing: [_n, Xn],
        blur: ["none", "", Yn, Oe],
        brightness: z(),
        borderColor: [e],
        borderRadius: ["none", "", "full", Yn, Oe],
        borderSpacing: W(),
        borderWidth: G(),
        contrast: z(),
        grayscale: T(),
        hueRotate: z(),
        invert: T(),
        gap: W(),
        gradientColorStops: [e],
        gradientColorStopPositions: [Mh, Xn],
        inset: ce(),
        margin: ce(),
        opacity: z(),
        padding: W(),
        saturate: z(),
        scale: z(),
        sepia: T(),
        skew: z(),
        space: W(),
        translate: W(),
      },
      classGroups: {
        aspect: [{ aspect: ["auto", "square", "video", Oe] }],
        container: ["container"],
        columns: [{ columns: [Yn] }],
        "break-after": [{ "break-after": K() }],
        "break-before": [{ "break-before": K() }],
        "break-inside": [
          { "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"] },
        ],
        "box-decoration": [{ "box-decoration": ["slice", "clone"] }],
        box: [{ box: ["border", "content"] }],
        display: [
          "block",
          "inline-block",
          "inline",
          "flex",
          "inline-flex",
          "table",
          "inline-table",
          "table-caption",
          "table-cell",
          "table-column",
          "table-column-group",
          "table-footer-group",
          "table-header-group",
          "table-row-group",
          "table-row",
          "flow-root",
          "grid",
          "inline-grid",
          "contents",
          "list-item",
          "hidden",
        ],
        float: [{ float: ["right", "left", "none", "start", "end"] }],
        clear: [{ clear: ["left", "right", "both", "none", "start", "end"] }],
        isolation: ["isolate", "isolation-auto"],
        "object-fit": [
          { object: ["contain", "cover", "fill", "none", "scale-down"] },
        ],
        "object-position": [{ object: [...I(), Oe] }],
        overflow: [{ overflow: ye() }],
        "overflow-x": [{ "overflow-x": ye() }],
        "overflow-y": [{ "overflow-y": ye() }],
        overscroll: [{ overscroll: ee() }],
        "overscroll-x": [{ "overscroll-x": ee() }],
        "overscroll-y": [{ "overscroll-y": ee() }],
        position: ["static", "fixed", "absolute", "relative", "sticky"],
        inset: [{ inset: [F] }],
        "inset-x": [{ "inset-x": [F] }],
        "inset-y": [{ "inset-y": [F] }],
        start: [{ start: [F] }],
        end: [{ end: [F] }],
        top: [{ top: [F] }],
        right: [{ right: [F] }],
        bottom: [{ bottom: [F] }],
        left: [{ left: [F] }],
        visibility: ["visible", "invisible", "collapse"],
        z: [{ z: ["auto", Gr, Oe] }],
        basis: [{ basis: ce() }],
        "flex-direction": [
          { flex: ["row", "row-reverse", "col", "col-reverse"] },
        ],
        "flex-wrap": [{ flex: ["wrap", "wrap-reverse", "nowrap"] }],
        flex: [{ flex: ["1", "auto", "initial", "none", Oe] }],
        grow: [{ grow: T() }],
        shrink: [{ shrink: T() }],
        order: [{ order: ["first", "last", "none", Gr, Oe] }],
        "grid-cols": [{ "grid-cols": [Ur] }],
        "col-start-end": [{ col: ["auto", { span: ["full", Gr, Oe] }, Oe] }],
        "col-start": [{ "col-start": A() }],
        "col-end": [{ "col-end": A() }],
        "grid-rows": [{ "grid-rows": [Ur] }],
        "row-start-end": [{ row: ["auto", { span: [Gr, Oe] }, Oe] }],
        "row-start": [{ "row-start": A() }],
        "row-end": [{ "row-end": A() }],
        "grid-flow": [
          { "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"] },
        ],
        "auto-cols": [{ "auto-cols": ["auto", "min", "max", "fr", Oe] }],
        "auto-rows": [{ "auto-rows": ["auto", "min", "max", "fr", Oe] }],
        gap: [{ gap: [h] }],
        "gap-x": [{ "gap-x": [h] }],
        "gap-y": [{ "gap-y": [h] }],
        "justify-content": [{ justify: ["normal", ...x()] }],
        "justify-items": [
          { "justify-items": ["start", "end", "center", "stretch"] },
        ],
        "justify-self": [
          { "justify-self": ["auto", "start", "end", "center", "stretch"] },
        ],
        "align-content": [{ content: ["normal", ...x(), "baseline"] }],
        "align-items": [
          { items: ["start", "end", "center", "baseline", "stretch"] },
        ],
        "align-self": [
          { self: ["auto", "start", "end", "center", "stretch", "baseline"] },
        ],
        "place-content": [{ "place-content": [...x(), "baseline"] }],
        "place-items": [
          { "place-items": ["start", "end", "center", "baseline", "stretch"] },
        ],
        "place-self": [
          { "place-self": ["auto", "start", "end", "center", "stretch"] },
        ],
        p: [{ p: [b] }],
        px: [{ px: [b] }],
        py: [{ py: [b] }],
        ps: [{ ps: [b] }],
        pe: [{ pe: [b] }],
        pt: [{ pt: [b] }],
        pr: [{ pr: [b] }],
        pb: [{ pb: [b] }],
        pl: [{ pl: [b] }],
        m: [{ m: [y] }],
        mx: [{ mx: [y] }],
        my: [{ my: [y] }],
        ms: [{ ms: [y] }],
        me: [{ me: [y] }],
        mt: [{ mt: [y] }],
        mr: [{ mr: [y] }],
        mb: [{ mb: [y] }],
        ml: [{ ml: [y] }],
        "space-x": [{ "space-x": [Q] }],
        "space-x-reverse": ["space-x-reverse"],
        "space-y": [{ "space-y": [Q] }],
        "space-y-reverse": ["space-y-reverse"],
        w: [{ w: ["auto", "min", "max", "fit", "svw", "lvw", "dvw", Oe, t] }],
        "min-w": [{ "min-w": [Oe, t, "min", "max", "fit"] }],
        "max-w": [
          {
            "max-w": [
              Oe,
              t,
              "none",
              "full",
              "min",
              "max",
              "fit",
              "prose",
              { screen: [Yn] },
              Yn,
            ],
          },
        ],
        h: [{ h: [Oe, t, "auto", "min", "max", "fit", "svh", "lvh", "dvh"] }],
        "min-h": [
          { "min-h": [Oe, t, "min", "max", "fit", "svh", "lvh", "dvh"] },
        ],
        "max-h": [
          { "max-h": [Oe, t, "min", "max", "fit", "svh", "lvh", "dvh"] },
        ],
        size: [{ size: [Oe, t, "auto", "min", "max", "fit"] }],
        "font-size": [{ text: ["base", Yn, Xn] }],
        "font-smoothing": ["antialiased", "subpixel-antialiased"],
        "font-style": ["italic", "not-italic"],
        "font-weight": [
          {
            font: [
              "thin",
              "extralight",
              "light",
              "normal",
              "medium",
              "semibold",
              "bold",
              "extrabold",
              "black",
              al,
            ],
          },
        ],
        "font-family": [{ font: [Ur] }],
        "fvn-normal": ["normal-nums"],
        "fvn-ordinal": ["ordinal"],
        "fvn-slashed-zero": ["slashed-zero"],
        "fvn-figure": ["lining-nums", "oldstyle-nums"],
        "fvn-spacing": ["proportional-nums", "tabular-nums"],
        "fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
        tracking: [
          {
            tracking: [
              "tighter",
              "tight",
              "normal",
              "wide",
              "wider",
              "widest",
              Oe,
            ],
          },
        ],
        "line-clamp": [{ "line-clamp": ["none", rr, al] }],
        leading: [
          {
            leading: [
              "none",
              "tight",
              "snug",
              "normal",
              "relaxed",
              "loose",
              _n,
              Oe,
            ],
          },
        ],
        "list-image": [{ "list-image": ["none", Oe] }],
        "list-style-type": [{ list: ["none", "disc", "decimal", Oe] }],
        "list-style-position": [{ list: ["inside", "outside"] }],
        "placeholder-color": [{ placeholder: [e] }],
        "placeholder-opacity": [{ "placeholder-opacity": [w] }],
        "text-alignment": [
          { text: ["left", "center", "right", "justify", "start", "end"] },
        ],
        "text-color": [{ text: [e] }],
        "text-opacity": [{ "text-opacity": [w] }],
        "text-decoration": [
          "underline",
          "overline",
          "line-through",
          "no-underline",
        ],
        "text-decoration-style": [{ decoration: [...U(), "wavy"] }],
        "text-decoration-thickness": [
          { decoration: ["auto", "from-font", _n, Xn] },
        ],
        "underline-offset": [{ "underline-offset": ["auto", _n, Oe] }],
        "text-decoration-color": [{ decoration: [e] }],
        "text-transform": [
          "uppercase",
          "lowercase",
          "capitalize",
          "normal-case",
        ],
        "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
        "text-wrap": [{ text: ["wrap", "nowrap", "balance", "pretty"] }],
        indent: [{ indent: W() }],
        "vertical-align": [
          {
            align: [
              "baseline",
              "top",
              "middle",
              "bottom",
              "text-top",
              "text-bottom",
              "sub",
              "super",
              Oe,
            ],
          },
        ],
        whitespace: [
          {
            whitespace: [
              "normal",
              "nowrap",
              "pre",
              "pre-line",
              "pre-wrap",
              "break-spaces",
            ],
          },
        ],
        break: [{ break: ["normal", "words", "all", "keep"] }],
        hyphens: [{ hyphens: ["none", "manual", "auto"] }],
        content: [{ content: ["none", Oe] }],
        "bg-attachment": [{ bg: ["fixed", "local", "scroll"] }],
        "bg-clip": [{ "bg-clip": ["border", "padding", "content", "text"] }],
        "bg-opacity": [{ "bg-opacity": [w] }],
        "bg-origin": [{ "bg-origin": ["border", "padding", "content"] }],
        "bg-position": [{ bg: [...I(), Nh] }],
        "bg-repeat": [
          { bg: ["no-repeat", { repeat: ["", "x", "y", "round", "space"] }] },
        ],
        "bg-size": [{ bg: ["auto", "cover", "contain", Rh] }],
        "bg-image": [
          {
            bg: [
              "none",
              { "gradient-to": ["t", "tr", "r", "br", "b", "bl", "l", "tl"] },
              Dh,
            ],
          },
        ],
        "bg-color": [{ bg: [e] }],
        "gradient-from-pos": [{ from: [H] }],
        "gradient-via-pos": [{ via: [H] }],
        "gradient-to-pos": [{ to: [H] }],
        "gradient-from": [{ from: [v] }],
        "gradient-via": [{ via: [v] }],
        "gradient-to": [{ to: [v] }],
        rounded: [{ rounded: [s] }],
        "rounded-s": [{ "rounded-s": [s] }],
        "rounded-e": [{ "rounded-e": [s] }],
        "rounded-t": [{ "rounded-t": [s] }],
        "rounded-r": [{ "rounded-r": [s] }],
        "rounded-b": [{ "rounded-b": [s] }],
        "rounded-l": [{ "rounded-l": [s] }],
        "rounded-ss": [{ "rounded-ss": [s] }],
        "rounded-se": [{ "rounded-se": [s] }],
        "rounded-ee": [{ "rounded-ee": [s] }],
        "rounded-es": [{ "rounded-es": [s] }],
        "rounded-tl": [{ "rounded-tl": [s] }],
        "rounded-tr": [{ "rounded-tr": [s] }],
        "rounded-br": [{ "rounded-br": [s] }],
        "rounded-bl": [{ "rounded-bl": [s] }],
        "border-w": [{ border: [c] }],
        "border-w-x": [{ "border-x": [c] }],
        "border-w-y": [{ "border-y": [c] }],
        "border-w-s": [{ "border-s": [c] }],
        "border-w-e": [{ "border-e": [c] }],
        "border-w-t": [{ "border-t": [c] }],
        "border-w-r": [{ "border-r": [c] }],
        "border-w-b": [{ "border-b": [c] }],
        "border-w-l": [{ "border-l": [c] }],
        "border-opacity": [{ "border-opacity": [w] }],
        "border-style": [{ border: [...U(), "hidden"] }],
        "divide-x": [{ "divide-x": [c] }],
        "divide-x-reverse": ["divide-x-reverse"],
        "divide-y": [{ "divide-y": [c] }],
        "divide-y-reverse": ["divide-y-reverse"],
        "divide-opacity": [{ "divide-opacity": [w] }],
        "divide-style": [{ divide: U() }],
        "border-color": [{ border: [r] }],
        "border-color-x": [{ "border-x": [r] }],
        "border-color-y": [{ "border-y": [r] }],
        "border-color-s": [{ "border-s": [r] }],
        "border-color-e": [{ "border-e": [r] }],
        "border-color-t": [{ "border-t": [r] }],
        "border-color-r": [{ "border-r": [r] }],
        "border-color-b": [{ "border-b": [r] }],
        "border-color-l": [{ "border-l": [r] }],
        "divide-color": [{ divide: [r] }],
        "outline-style": [{ outline: ["", ...U()] }],
        "outline-offset": [{ "outline-offset": [_n, Oe] }],
        "outline-w": [{ outline: [_n, Xn] }],
        "outline-color": [{ outline: [e] }],
        "ring-w": [{ ring: G() }],
        "ring-w-inset": ["ring-inset"],
        "ring-color": [{ ring: [e] }],
        "ring-opacity": [{ "ring-opacity": [w] }],
        "ring-offset-w": [{ "ring-offset": [_n, Xn] }],
        "ring-offset-color": [{ "ring-offset": [e] }],
        shadow: [{ shadow: ["", "inner", "none", Yn, Fh] }],
        "shadow-color": [{ shadow: [Ur] }],
        opacity: [{ opacity: [w] }],
        "mix-blend": [{ "mix-blend": [...q(), "plus-lighter", "plus-darker"] }],
        "bg-blend": [{ "bg-blend": q() }],
        filter: [{ filter: ["", "none"] }],
        blur: [{ blur: [n] }],
        brightness: [{ brightness: [o] }],
        contrast: [{ contrast: [l] }],
        "drop-shadow": [{ "drop-shadow": ["", "none", Yn, Oe] }],
        grayscale: [{ grayscale: [u] }],
        "hue-rotate": [{ "hue-rotate": [f] }],
        invert: [{ invert: [m] }],
        saturate: [{ saturate: [g] }],
        sepia: [{ sepia: [O] }],
        "backdrop-filter": [{ "backdrop-filter": ["", "none"] }],
        "backdrop-blur": [{ "backdrop-blur": [n] }],
        "backdrop-brightness": [{ "backdrop-brightness": [o] }],
        "backdrop-contrast": [{ "backdrop-contrast": [l] }],
        "backdrop-grayscale": [{ "backdrop-grayscale": [u] }],
        "backdrop-hue-rotate": [{ "backdrop-hue-rotate": [f] }],
        "backdrop-invert": [{ "backdrop-invert": [m] }],
        "backdrop-opacity": [{ "backdrop-opacity": [w] }],
        "backdrop-saturate": [{ "backdrop-saturate": [g] }],
        "backdrop-sepia": [{ "backdrop-sepia": [O] }],
        "border-collapse": [{ border: ["collapse", "separate"] }],
        "border-spacing": [{ "border-spacing": [i] }],
        "border-spacing-x": [{ "border-spacing-x": [i] }],
        "border-spacing-y": [{ "border-spacing-y": [i] }],
        "table-layout": [{ table: ["auto", "fixed"] }],
        caption: [{ caption: ["top", "bottom"] }],
        transition: [
          {
            transition: [
              "none",
              "all",
              "",
              "colors",
              "opacity",
              "shadow",
              "transform",
              Oe,
            ],
          },
        ],
        duration: [{ duration: z() }],
        ease: [{ ease: ["linear", "in", "out", "in-out", Oe] }],
        delay: [{ delay: z() }],
        animate: [{ animate: ["none", "spin", "ping", "pulse", "bounce", Oe] }],
        transform: [{ transform: ["", "gpu", "none"] }],
        scale: [{ scale: [C] }],
        "scale-x": [{ "scale-x": [C] }],
        "scale-y": [{ "scale-y": [C] }],
        rotate: [{ rotate: [Gr, Oe] }],
        "translate-x": [{ "translate-x": [X] }],
        "translate-y": [{ "translate-y": [X] }],
        "skew-x": [{ "skew-x": [V] }],
        "skew-y": [{ "skew-y": [V] }],
        "transform-origin": [
          {
            origin: [
              "center",
              "top",
              "top-right",
              "right",
              "bottom-right",
              "bottom",
              "bottom-left",
              "left",
              "top-left",
              Oe,
            ],
          },
        ],
        accent: [{ accent: ["auto", e] }],
        appearance: [{ appearance: ["none", "auto"] }],
        cursor: [
          {
            cursor: [
              "auto",
              "default",
              "pointer",
              "wait",
              "text",
              "move",
              "help",
              "not-allowed",
              "none",
              "context-menu",
              "progress",
              "cell",
              "crosshair",
              "vertical-text",
              "alias",
              "copy",
              "no-drop",
              "grab",
              "grabbing",
              "all-scroll",
              "col-resize",
              "row-resize",
              "n-resize",
              "e-resize",
              "s-resize",
              "w-resize",
              "ne-resize",
              "nw-resize",
              "se-resize",
              "sw-resize",
              "ew-resize",
              "ns-resize",
              "nesw-resize",
              "nwse-resize",
              "zoom-in",
              "zoom-out",
              Oe,
            ],
          },
        ],
        "caret-color": [{ caret: [e] }],
        "pointer-events": [{ "pointer-events": ["none", "auto"] }],
        resize: [{ resize: ["none", "y", "x", ""] }],
        "scroll-behavior": [{ scroll: ["auto", "smooth"] }],
        "scroll-m": [{ "scroll-m": W() }],
        "scroll-mx": [{ "scroll-mx": W() }],
        "scroll-my": [{ "scroll-my": W() }],
        "scroll-ms": [{ "scroll-ms": W() }],
        "scroll-me": [{ "scroll-me": W() }],
        "scroll-mt": [{ "scroll-mt": W() }],
        "scroll-mr": [{ "scroll-mr": W() }],
        "scroll-mb": [{ "scroll-mb": W() }],
        "scroll-ml": [{ "scroll-ml": W() }],
        "scroll-p": [{ "scroll-p": W() }],
        "scroll-px": [{ "scroll-px": W() }],
        "scroll-py": [{ "scroll-py": W() }],
        "scroll-ps": [{ "scroll-ps": W() }],
        "scroll-pe": [{ "scroll-pe": W() }],
        "scroll-pt": [{ "scroll-pt": W() }],
        "scroll-pr": [{ "scroll-pr": W() }],
        "scroll-pb": [{ "scroll-pb": W() }],
        "scroll-pl": [{ "scroll-pl": W() }],
        "snap-align": [{ snap: ["start", "end", "center", "align-none"] }],
        "snap-stop": [{ snap: ["normal", "always"] }],
        "snap-type": [{ snap: ["none", "x", "y", "both"] }],
        "snap-strictness": [{ snap: ["mandatory", "proximity"] }],
        touch: [{ touch: ["auto", "none", "manipulation"] }],
        "touch-x": [{ "touch-pan": ["x", "left", "right"] }],
        "touch-y": [{ "touch-pan": ["y", "up", "down"] }],
        "touch-pz": ["touch-pinch-zoom"],
        select: [{ select: ["none", "text", "all", "auto"] }],
        "will-change": [
          { "will-change": ["auto", "scroll", "contents", "transform", Oe] },
        ],
        fill: [{ fill: [e, "none"] }],
        "stroke-w": [{ stroke: [_n, Xn, al] }],
        stroke: [{ stroke: [e, "none"] }],
        sr: ["sr-only", "not-sr-only"],
        "forced-color-adjust": [{ "forced-color-adjust": ["auto", "none"] }],
      },
      conflictingClassGroups: {
        overflow: ["overflow-x", "overflow-y"],
        overscroll: ["overscroll-x", "overscroll-y"],
        inset: [
          "inset-x",
          "inset-y",
          "start",
          "end",
          "top",
          "right",
          "bottom",
          "left",
        ],
        "inset-x": ["right", "left"],
        "inset-y": ["top", "bottom"],
        flex: ["basis", "grow", "shrink"],
        gap: ["gap-x", "gap-y"],
        p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"],
        px: ["pr", "pl"],
        py: ["pt", "pb"],
        m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"],
        mx: ["mr", "ml"],
        my: ["mt", "mb"],
        size: ["w", "h"],
        "font-size": ["leading"],
        "fvn-normal": [
          "fvn-ordinal",
          "fvn-slashed-zero",
          "fvn-figure",
          "fvn-spacing",
          "fvn-fraction",
        ],
        "fvn-ordinal": ["fvn-normal"],
        "fvn-slashed-zero": ["fvn-normal"],
        "fvn-figure": ["fvn-normal"],
        "fvn-spacing": ["fvn-normal"],
        "fvn-fraction": ["fvn-normal"],
        "line-clamp": ["display", "overflow"],
        rounded: [
          "rounded-s",
          "rounded-e",
          "rounded-t",
          "rounded-r",
          "rounded-b",
          "rounded-l",
          "rounded-ss",
          "rounded-se",
          "rounded-ee",
          "rounded-es",
          "rounded-tl",
          "rounded-tr",
          "rounded-br",
          "rounded-bl",
        ],
        "rounded-s": ["rounded-ss", "rounded-es"],
        "rounded-e": ["rounded-se", "rounded-ee"],
        "rounded-t": ["rounded-tl", "rounded-tr"],
        "rounded-r": ["rounded-tr", "rounded-br"],
        "rounded-b": ["rounded-br", "rounded-bl"],
        "rounded-l": ["rounded-tl", "rounded-bl"],
        "border-spacing": ["border-spacing-x", "border-spacing-y"],
        "border-w": [
          "border-w-s",
          "border-w-e",
          "border-w-t",
          "border-w-r",
          "border-w-b",
          "border-w-l",
        ],
        "border-w-x": ["border-w-r", "border-w-l"],
        "border-w-y": ["border-w-t", "border-w-b"],
        "border-color": [
          "border-color-s",
          "border-color-e",
          "border-color-t",
          "border-color-r",
          "border-color-b",
          "border-color-l",
        ],
        "border-color-x": ["border-color-r", "border-color-l"],
        "border-color-y": ["border-color-t", "border-color-b"],
        "scroll-m": [
          "scroll-mx",
          "scroll-my",
          "scroll-ms",
          "scroll-me",
          "scroll-mt",
          "scroll-mr",
          "scroll-mb",
          "scroll-ml",
        ],
        "scroll-mx": ["scroll-mr", "scroll-ml"],
        "scroll-my": ["scroll-mt", "scroll-mb"],
        "scroll-p": [
          "scroll-px",
          "scroll-py",
          "scroll-ps",
          "scroll-pe",
          "scroll-pt",
          "scroll-pr",
          "scroll-pb",
          "scroll-pl",
        ],
        "scroll-px": ["scroll-pr", "scroll-pl"],
        "scroll-py": ["scroll-pt", "scroll-pb"],
        touch: ["touch-x", "touch-y", "touch-pz"],
        "touch-x": ["touch"],
        "touch-y": ["touch"],
        "touch-pz": ["touch"],
      },
      conflictingClassGroupModifiers: { "font-size": ["leading"] },
    };
  };
  var Td = Eh(zh);
  var de = (...e) => Td(yd(e));
  var is = (e) =>
    e.elementsCount && e.elementsCount > 1
      ? { tagName: `${e.elementsCount} elements`, componentName: void 0 }
      : {
          tagName: e.tagName || e.componentName || "element",
          componentName: e.tagName ? e.componentName : void 0,
        };
  var jr = null,
    Vh = () => {
      if (typeof navigator > "u" || !("userAgentData" in navigator))
        return null;
      let e = navigator.userAgentData;
      if (typeof e != "object" || e === null || !("platform" in e)) return null;
      let t = e.platform;
      return typeof t != "string" ? null : t;
    },
    Pn = () => {
      if (jr === null) {
        if (typeof navigator > "u") return ((jr = false), jr);
        let e = Vh() ?? navigator.platform ?? navigator.userAgent;
        jr = /Mac|iPhone|iPad|iPod/i.test(e);
      }
      return jr;
    };
  var qn = (e) =>
    e === "Enter"
      ? "\u21B5"
      : Pn()
        ? `\u2318${e}`
        : `Ctrl+${e.replace("\u21E7", "Shift+")}`;
  var Gh = D(
      '<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 12 12"fill=none style=transform:rotate(180deg)><path d="M5 3V1L1 4.5L5 8V6C8 6 10 7 11 10C11 7 9 4 5 3Z"fill=currentColor>',
    ),
    ss = (e) => {
      let t = () => e.size ?? 12;
      return (() => {
        var n = Gh();
        return (
          Y(
            (o) => {
              var r = t(),
                s = t(),
                i = e.class;
              return (
                r !== o.e && ne(n, "width", (o.e = r)),
                s !== o.t && ne(n, "height", (o.t = s)),
                i !== o.a && ne(n, "class", (o.a = i)),
                o
              );
            },
            { e: void 0, t: void 0, a: void 0 },
          ),
          n
        );
      })();
    };
  var Uh = D(
      '<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 12 12"fill=none><path d="M6 1L6 11M6 1L2 5M6 1L10 5"stroke=currentColor stroke-width=1.5 stroke-linecap=round stroke-linejoin=round>',
    ),
    as = (e) => {
      let t = () => e.size ?? 12;
      return (() => {
        var n = Uh();
        return (
          Y(
            (o) => {
              var r = t(),
                s = t(),
                i = e.class;
              return (
                r !== o.e && ne(n, "width", (o.e = r)),
                s !== o.t && ne(n, "height", (o.t = s)),
                i !== o.a && ne(n, "class", (o.a = i)),
                o
              );
            },
            { e: void 0, t: void 0, a: void 0 },
          ),
          n
        );
      })();
    };
  var jh = D(
      '<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><path class=icon-loader-bar d="M12 2v4"style=animation-delay:0ms></path><path class=icon-loader-bar d="M15 6.8l2-3.5"style=animation-delay:-42ms></path><path class=icon-loader-bar d="M17.2 9l3.5-2"style=animation-delay:-83ms></path><path class=icon-loader-bar d="M18 12h4"style=animation-delay:-125ms></path><path class=icon-loader-bar d="M17.2 15l3.5 2"style=animation-delay:-167ms></path><path class=icon-loader-bar d="M15 17.2l2 3.5"style=animation-delay:-208ms></path><path class=icon-loader-bar d="M12 18v4"style=animation-delay:-250ms></path><path class=icon-loader-bar d="M9 17.2l-2 3.5"style=animation-delay:-292ms></path><path class=icon-loader-bar d="M6.8 15l-3.5 2"style=animation-delay:-333ms></path><path class=icon-loader-bar d="M2 12h4"style=animation-delay:-375ms></path><path class=icon-loader-bar d="M6.8 9l-3.5-2"style=animation-delay:-417ms></path><path class=icon-loader-bar d="M9 6.8l-2-3.5"style=animation-delay:-458ms>',
    ),
    _d = (e) => {
      let t = () => e.size ?? 16;
      return (() => {
        var n = jh(),
          o = n.firstChild,
          r = o.nextSibling,
          s = r.nextSibling,
          i = s.nextSibling,
          c = i.nextSibling,
          l = c.nextSibling,
          u = l.nextSibling,
          f = u.nextSibling,
          m = f.nextSibling,
          h = m.nextSibling,
          v = h.nextSibling;
        v.nextSibling;
        return (
          Y(
            (F) => {
              var y = t(),
                w = t(),
                b = e.class;
              return (
                y !== F.e && ne(n, "width", (F.e = y)),
                w !== F.t && ne(n, "height", (F.t = w)),
                b !== F.a && ne(n, "class", (F.a = b)),
                F
              );
            },
            { e: void 0, t: void 0, a: void 0 },
          ),
          n
        );
      })();
    };
  var Wh = D('<div data-react-grab-arrow class="absolute w-0 h-0 z-10">'),
    ls = (e) => {
      let t = () => e.color ?? "white",
        n = () => e.position === "bottom",
        o = () => rs(e.labelWidth ?? 0);
      return (() => {
        var r = Wh();
        return (
          Y(
            (s) => {
              var i = `calc(${e.leftPercent}% + ${e.leftOffsetPx}px)`,
                c = n() ? "0" : void 0,
                l = n() ? void 0 : "0",
                u = n()
                  ? "translateX(-50%) translateY(-100%)"
                  : "translateX(-50%) translateY(100%)",
                f = `${o()}px solid transparent`,
                m = `${o()}px solid transparent`,
                h = n() ? `${o()}px solid ${t()}` : void 0,
                v = n() ? void 0 : `${o()}px solid ${t()}`;
              return (
                i !== s.e && pe(r, "left", (s.e = i)),
                c !== s.t && pe(r, "top", (s.t = c)),
                l !== s.a && pe(r, "bottom", (s.a = l)),
                u !== s.o && pe(r, "transform", (s.o = u)),
                f !== s.i && pe(r, "border-left", (s.i = f)),
                m !== s.n && pe(r, "border-right", (s.n = m)),
                h !== s.s && pe(r, "border-bottom", (s.s = h)),
                v !== s.h && pe(r, "border-top", (s.h = v)),
                s
              );
            },
            {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0,
              i: void 0,
              n: void 0,
              s: void 0,
              h: void 0,
            },
          ),
          r
        );
      })();
    };
  var Kh = D(
      '<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=none stroke=currentColor stroke-linecap=round stroke-linejoin=round stroke-width=2><path d="M12 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"></path><path d="M11 13l9-9"></path><path d="M15 4h5v5">',
    ),
    Pd = (e) => {
      let t = () => e.size ?? 12;
      return (() => {
        var n = Kh();
        return (
          Y(
            (o) => {
              var r = t(),
                s = t(),
                i = e.class;
              return (
                r !== o.e && ne(n, "width", (o.e = r)),
                s !== o.t && ne(n, "height", (o.t = s)),
                i !== o.a && ne(n, "class", (o.a = i)),
                o
              );
            },
            { e: void 0, t: void 0, a: void 0 },
          ),
          n
        );
      })();
    };
  var kd = D("<span class=text-black>"),
    Xh = D("<span class=text-black/50>."),
    Yh = D(
      '<div><span class="text-[13px] leading-4 h-fit font-medium overflow-hidden text-ellipsis whitespace-nowrap min-w-0">',
    ),
    Wr = (e) => {
      let [t, n] = $(false),
        o = () => {
          (n(true), e.onHoverChange?.(true));
        },
        r = () => {
          (n(false), e.onHoverChange?.(false));
        };
      return (() => {
        var s = Yh(),
          i = s.firstChild;
        return (
          Se(s, "click", e.onClick, true),
          s.addEventListener("mouseleave", r),
          s.addEventListener("mouseenter", o),
          M(
            i,
            S(ue, {
              get when() {
                return e.componentName;
              },
              get children() {
                return [
                  (() => {
                    var c = kd();
                    return (M(c, () => e.componentName), c);
                  })(),
                  (() => {
                    var c = Xh();
                    c.firstChild;
                    return (M(c, () => e.tagName, null), c);
                  })(),
                ];
              },
            }),
            null,
          ),
          M(
            i,
            S(ue, {
              get when() {
                return !e.componentName;
              },
              get children() {
                var c = kd();
                return (M(c, () => e.tagName), c);
              },
            }),
            null,
          ),
          M(
            s,
            S(ue, {
              get when() {
                return e.isClickable || e.forceShowIcon;
              },
              get children() {
                return S(Pd, {
                  size: 10,
                  get class() {
                    return de(
                      "text-black transition-all duration-100 shrink-0",
                      t() || e.forceShowIcon
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-75 -ml-[2px] w-0",
                    );
                  },
                });
              },
            }),
            null,
          ),
          Y(() =>
            we(
              s,
              de(
                "contain-layout flex items-center gap-1 max-w-[280px] overflow-hidden",
                e.shrink && "shrink-0",
                e.isClickable && "cursor-pointer",
              ),
            ),
          ),
          s
        );
      })();
    };
  Qe(["click"]);
  var qh = D(
      '<div class="[font-synthesis:none] contain-layout shrink-0 flex flex-col items-start px-2 py-1.5 w-auto h-fit self-stretch [border-top-width:0.5px] border-t-solid border-t-[#D9D9D9] antialiased rounded-t-none rounded-b-[6px]">',
    ),
    It = (e) =>
      (() => {
        var t = qh();
        return (M(t, () => e.children), t);
      })();
  var cs = null,
    Pt = {
      claim: (e) => {
        cs = e;
      },
      release: (e) => {
        cs === e && (cs = null);
      },
      isActive: (e) => cs === e,
    };
  var Zh = D(
      '<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 22 19"fill=none><path d="M6.76263 18.6626C7.48251 18.6626 7.95474 18.1682 7.95474 17.4895C7.95474 17.1207 7.80474 16.8576 7.58683 16.6361L5.3018 14.4137L2.84621 12.3589L2.44374 13.0037L5.92137 13.1622H17.9232C20.4842 13.1622 21.593 12.021 21.593 9.47237V3.66983C21.593 1.10875 20.4842 0 17.9232 0H12.5414C11.8179 0 11.3018 0.545895 11.3018 1.21695C11.3018 1.888 11.8179 2.43389 12.5414 2.43389H17.8424C18.7937 2.43389 19.1897 2.83653 19.1897 3.78784V9.35747C19.1897 10.3257 18.7937 10.7314 17.8424 10.7314H5.92137L2.44374 10.8832L2.84621 11.5281L5.3018 9.47993L7.58683 7.2606C7.80474 7.03914 7.95474 6.7693 7.95474 6.40049C7.95474 5.72854 7.48251 5.22747 6.76263 5.22747C6.46129 5.22747 6.12975 5.36905 5.89231 5.6096L0.376815 11.0425C0.134921 11.2777 0 11.6141 0 11.9452C0 12.2728 0.134921 12.6158 0.376815 12.848L5.89231 18.2871C6.12975 18.5276 6.46129 18.6626 6.76263 18.6626Z"fill=currentColor>',
    ),
    us = (e) => {
      let t = () => e.size ?? 12;
      return (() => {
        var n = Zh();
        return (
          Y(
            (o) => {
              var r = t(),
                s = (t() * 19) / 22,
                i = e.class;
              return (
                r !== o.e && ne(n, "width", (o.e = r)),
                s !== o.t && ne(n, "height", (o.t = s)),
                i !== o.a && ne(n, "class", (o.a = i)),
                o
              );
            },
            { e: void 0, t: void 0, a: void 0 },
          ),
          n
        );
      })();
    };
  var Jh = D(
      '<div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit"><button data-react-grab-discard-no class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px]"><span class="text-black text-[13px] leading-3.5 font-sans font-medium">No</span></button><button data-react-grab-discard-yes class="contain-layout shrink-0 flex items-center justify-center gap-0.5 px-[3px] py-px rounded-sm bg-[#FEF2F2] cursor-pointer transition-all hover:bg-[#FEE2E2] press-scale h-[17px]"><span class="text-[#B91C1C] text-[13px] leading-3.5 font-sans font-medium">Yes',
    ),
    Qh = D(
      '<div data-react-grab-discard-prompt class="contain-layout shrink-0 flex flex-col justify-center items-end w-fit h-fit"><div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 px-2 w-full h-fit"><span class="text-black text-[13px] leading-4 shrink-0 font-sans font-medium w-fit h-fit">',
    ),
    Kr = (e) => {
      let t = Symbol(),
        n = (r) => {
          if (!Pt.isActive(t) || St(r)) return;
          let s = r.code === "Enter",
            i = r.code === "Escape";
          (s || i) &&
            (r.preventDefault(),
            r.stopPropagation(),
            i && e.cancelOnEscape ? e.onCancel?.() : e.onConfirm?.());
        },
        o = () => {
          Pt.claim(t);
        };
      return (
        lt(() => {
          (Pt.claim(t),
            window.addEventListener("keydown", n, { capture: true }));
        }),
        _e(() => {
          (Pt.release(t),
            window.removeEventListener("keydown", n, { capture: true }));
        }),
        (() => {
          var r = Qh(),
            s = r.firstChild,
            i = s.firstChild;
          return (
            (r.$$click = o),
            (r.$$pointerdown = o),
            M(i, () => e.label ?? "Discard?"),
            M(
              r,
              S(It, {
                get children() {
                  var c = Jh(),
                    l = c.firstChild,
                    u = l.nextSibling;
                  u.firstChild;
                  return (
                    Se(l, "click", e.onCancel, true),
                    Se(u, "click", e.onConfirm, true),
                    M(u, S(us, { size: 10, class: "text-[#B91C1C]/50" }), null),
                    c
                  );
                },
              }),
              null,
            ),
            r
          );
        })()
      );
    };
  Qe(["pointerdown", "click"]);
  var eb = D(
      '<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=none><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z"fill=currentColor>',
    ),
    Od = (e) => {
      let t = () => e.size ?? 12;
      return (() => {
        var n = eb();
        return (
          Y(
            (o) => {
              var r = t(),
                s = t(),
                i = e.class;
              return (
                r !== o.e && ne(n, "width", (o.e = r)),
                s !== o.t && ne(n, "height", (o.t = s)),
                i !== o.a && ne(n, "class", (o.a = i)),
                o
              );
            },
            { e: void 0, t: void 0, a: void 0 },
          ),
          n
        );
      })();
    };
  var tb = D(
      '<div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit"><button data-react-grab-retry class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px]"><span class="text-black text-[13px] leading-3.5 font-sans font-medium">Retry</span></button><button data-react-grab-error-ok class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px]"><span class="text-black text-[13px] leading-3.5 font-sans font-medium">Ok',
    ),
    nb = D(
      '<div data-react-grab-error class="contain-layout shrink-0 flex flex-col justify-center items-end w-fit h-fit max-w-[280px]"><div class="contain-layout shrink-0 flex items-start gap-1 px-2 w-full h-fit"><span class="text-[#B91C1C] text-[13px] leading-4 font-sans font-medium overflow-hidden line-clamp-5">',
    ),
    Md = (e) => {
      let t = Symbol(),
        n = (s) => {
          if (!Pt.isActive(t) || St(s)) return;
          let i = s.code === "Enter",
            c = s.code === "Escape";
          i
            ? (s.preventDefault(), s.stopPropagation(), e.onRetry?.())
            : c &&
              (s.preventDefault(), s.stopPropagation(), e.onAcknowledge?.());
        },
        o = () => {
          Pt.claim(t);
        };
      (lt(() => {
        (Pt.claim(t), window.addEventListener("keydown", n, { capture: true }));
      }),
        _e(() => {
          (Pt.release(t),
            window.removeEventListener("keydown", n, { capture: true }));
        }));
      let r = () => !!(e.onRetry || e.onAcknowledge);
      return (() => {
        var s = nb(),
          i = s.firstChild,
          c = i.firstChild;
        return (
          (s.$$click = o),
          (s.$$pointerdown = o),
          M(c, () => e.error),
          M(
            s,
            S(ue, {
              get when() {
                return r();
              },
              get children() {
                return S(It, {
                  get children() {
                    var l = tb(),
                      u = l.firstChild;
                    u.firstChild;
                    var m = u.nextSibling;
                    return (
                      Se(u, "click", e.onRetry, true),
                      M(u, S(Od, { size: 10, class: "text-black/50" }), null),
                      Se(m, "click", e.onAcknowledge, true),
                      l
                    );
                  },
                });
              },
            }),
            null,
          ),
          Y(
            (l) => {
              var u = { "pt-1.5 pb-1": r(), "py-1.5": !r() },
                f = e.error;
              return (
                (l.e = mo(i, u, l.e)), f !== l.t && ne(c, "title", (l.t = f)), l
              );
            },
            { e: void 0, t: void 0 },
          ),
          s
        );
      })();
    };
  Qe(["pointerdown", "click"]);
  var ob = D(
      '<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=currentColor><circle cx=5 cy=12 r=2></circle><circle cx=12 cy=12 r=2></circle><circle cx=19 cy=12 r=2>',
    ),
    sr = (e) => {
      let t = () => e.size ?? 12;
      return (() => {
        var n = ob();
        return (
          Y(
            (o) => {
              var r = t(),
                s = t(),
                i = e.class;
              return (
                r !== o.e && ne(n, "width", (o.e = r)),
                s !== o.t && ne(n, "height", (o.t = s)),
                i !== o.a && ne(n, "class", (o.a = i)),
                o
              );
            },
            { e: void 0, t: void 0, a: void 0 },
          ),
          n
        );
      })();
    };
  var rb = D(
      '<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 21 21"fill=none><g clip-path=url(#clip0_icon_check)><path d="M20.1767 10.0875C20.1767 15.6478 15.6576 20.175 10.0875 20.175C4.52715 20.175 0 15.6478 0 10.0875C0 4.51914 4.52715 0 10.0875 0C15.6576 0 20.1767 4.51914 20.1767 10.0875ZM13.0051 6.23867L8.96699 12.7041L7.08476 10.3143C6.83358 9.99199 6.59941 9.88828 6.28984 9.88828C5.79414 9.88828 5.39961 10.2918 5.39961 10.7893C5.39961 11.0367 5.48925 11.2621 5.66386 11.4855L8.05703 14.3967C8.33027 14.7508 8.63183 14.9103 8.99902 14.9103C9.36445 14.9103 9.68105 14.7312 9.90546 14.3896L14.4742 7.27206C14.6107 7.04765 14.7289 6.80898 14.7289 6.58359C14.7289 6.07187 14.281 5.72968 13.7934 5.72968C13.4937 5.72968 13.217 5.90527 13.0051 6.23867Z"fill=currentColor></path></g><defs><clipPath id=clip0_icon_check><rect width=20.5381 height=20.1848 fill=white>',
    ),
    Xr = (e) => {
      let t = () => e.size ?? 21;
      return (() => {
        var n = rb();
        return (
          Y(
            (o) => {
              var r = t(),
                s = (t() * 20.1848) / 20.5381,
                i = e.class;
              return (
                r !== o.e && ne(n, "width", (o.e = r)),
                s !== o.t && ne(n, "height", (o.t = s)),
                i !== o.a && ne(n, "class", (o.a = i)),
                o
              );
            },
            { e: void 0, t: void 0, a: void 0 },
          ),
          n
        );
      })();
    };
  var ib = D(
      '<button data-react-grab-ignore-events data-react-grab-more-options class="flex items-center justify-center size-[18px] rounded-sm cursor-pointer bg-transparent hover:bg-black/10 text-black/30 hover:text-black border-none outline-none p-0 shrink-0 press-scale">',
    ),
    sb = D(
      '<button data-react-grab-undo class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-[#FEF2F2] cursor-pointer transition-all hover:bg-[#FEE2E2] press-scale h-[17px]"><span class="text-[#B91C1C] text-[13px] leading-3.5 font-sans font-medium">Undo',
    ),
    ab = D(
      '<button data-react-grab-dismiss class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px]"><span class="text-black text-[13px] leading-3.5 font-sans font-medium">',
    ),
    lb = D(
      '<div class="contain-layout shrink-0 flex items-center justify-between gap-2 pt-1.5 pb-1 px-2 w-full h-fit"><span class="text-black text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap min-w-0"></span><div class="contain-layout shrink-0 flex items-center gap-2 h-fit">',
    ),
    cb = D(
      '<div class="contain-layout shrink-0 flex items-center gap-0.5 py-1.5 px-2 w-full h-fit"><span class="text-black text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap min-w-0">',
    ),
    ub = D(
      '<div class="flex items-center gap-1 w-full mb-1 overflow-hidden"><span class="text-black/40 text-[11px] leading-3 font-medium truncate italic">',
    ),
    db = D(
      '<div class="shrink-0 flex justify-between items-end w-full min-h-4"><textarea data-react-grab-ignore-events data-react-grab-followup-input class="text-black text-[13px] leading-4 font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 wrap-break-word overflow-y-auto"placeholder=follow-up rows=1 style=field-sizing:content;min-height:16px;scrollbar-width:none></textarea><button data-react-grab-followup-submit>',
    ),
    fb = D("<div data-react-grab-completion>"),
    Id = (e) =>
      (() => {
        var t = ib();
        return (
          Se(t, "click", (n) => {
            (n.stopImmediatePropagation(), e.onClick());
          }),
          Se(t, "pointerdown", (n) => {
            n.stopImmediatePropagation();
          }),
          M(t, S(sr, { size: 14 })),
          t
        );
      })(),
    Rd = (e) => {
      let t = Symbol(),
        n,
        o,
        r,
        [s, i] = $(false),
        [c, l] = $(false),
        [u, f] = $(e.statusText),
        [m, h] = $(""),
        v = () => {
          (o !== void 0 && window.clearTimeout(o),
            r !== void 0 && window.clearTimeout(r),
            l(true),
            e.onFadingChange?.(true),
            e.onShowContextMenu?.());
        },
        H = () => {
          s() ||
            (i(true),
            f("Copied"),
            e.onCopyStateChange?.(),
            (o = window.setTimeout(() => {
              (l(true),
                e.onFadingChange?.(true),
                (r = window.setTimeout(() => {
                  e.onDismiss?.();
                }, 100)));
            }, 1400)));
        },
        F = () => {
          let g = m().trim();
          g && e.onFollowUpSubmit && e.onFollowUpSubmit(g);
        },
        y = (g) => {
          if (g.isComposing || g.keyCode === 229) return;
          let C = g.code === "KeyZ" && (g.metaKey || g.ctrlKey),
            O = g.code === "Enter" && !g.shiftKey,
            V = g.code === "Escape";
          (C || g.stopImmediatePropagation(),
            O
              ? (g.preventDefault(), m().trim() ? F() : H())
              : V && (g.preventDefault(), e.onDismiss?.()));
        },
        w = (g) => {
          if (!Pt.isActive(t)) return;
          let C = g.code === "KeyZ" && (g.metaKey || g.ctrlKey) && !g.shiftKey,
            O = g.code === "Enter",
            V = g.code === "Escape";
          if (C && e.supportsUndo && e.onUndo) {
            (g.preventDefault(), g.stopPropagation(), e.onUndo());
            return;
          }
          St(g) ||
            (O
              ? (g.preventDefault(), g.stopPropagation(), H())
              : V &&
                (g.preventDefault(), g.stopPropagation(), e.onDismiss?.()));
        },
        b = () => {
          Pt.claim(t);
        };
      return (
        ge(() => {
          s() || f(e.statusText);
        }),
        lt(() => {
          (Pt.claim(t),
            window.addEventListener("keydown", w, { capture: true }),
            e.supportsFollowUp && e.onFollowUpSubmit && n && n.focus());
        }),
        _e(() => {
          (Pt.release(t),
            window.removeEventListener("keydown", w, { capture: true }),
            o !== void 0 && window.clearTimeout(o),
            r !== void 0 && window.clearTimeout(r));
        }),
        (() => {
          var g = fb();
          return (
            (g.$$click = b),
            (g.$$pointerdown = b),
            M(
              g,
              S(ue, {
                get when() {
                  return Be(() => !s())() && (e.onDismiss || e.onUndo);
                },
                get children() {
                  var C = lb(),
                    O = C.firstChild,
                    V = O.nextSibling;
                  return (
                    M(O, u),
                    M(
                      V,
                      S(ue, {
                        get when() {
                          return (
                            Be(() => !!e.onShowContextMenu)() &&
                            !e.supportsFollowUp
                          );
                        },
                        get children() {
                          return S(Id, { onClick: v });
                        },
                      }),
                      null,
                    ),
                    M(
                      V,
                      S(ue, {
                        get when() {
                          return Be(() => !!e.supportsUndo)() && e.onUndo;
                        },
                        get children() {
                          var Q = sb();
                          return ((Q.$$click = () => e.onUndo?.()), Q);
                        },
                      }),
                      null,
                    ),
                    M(
                      V,
                      S(ue, {
                        get when() {
                          return e.onDismiss;
                        },
                        get children() {
                          var Q = ab(),
                            X = Q.firstChild;
                          return (
                            (Q.$$click = H),
                            M(X, () => e.dismissButtonText ?? "Keep"),
                            M(
                              Q,
                              S(ue, {
                                get when() {
                                  return !s();
                                },
                                get children() {
                                  return S(us, {
                                    size: 10,
                                    class: "text-black/50",
                                  });
                                },
                              }),
                              null,
                            ),
                            Y(() => (Q.disabled = s())),
                            Q
                          );
                        },
                      }),
                      null,
                    ),
                    C
                  );
                },
              }),
              null,
            ),
            M(
              g,
              S(ue, {
                get when() {
                  return s() || (!e.onDismiss && !e.onUndo);
                },
                get children() {
                  var C = cb(),
                    O = C.firstChild;
                  return (
                    M(
                      C,
                      S(Xr, {
                        size: 14,
                        class: "text-black/85 shrink-0 animate-success-pop",
                      }),
                      O,
                    ),
                    M(O, u),
                    M(
                      C,
                      S(ue, {
                        get when() {
                          return (
                            Be(() => !!e.onShowContextMenu)() &&
                            !e.supportsFollowUp
                          );
                        },
                        get children() {
                          return S(Id, { onClick: v });
                        },
                      }),
                      null,
                    ),
                    C
                  );
                },
              }),
              null,
            ),
            M(
              g,
              S(ue, {
                get when() {
                  return (
                    Be(() => !!(!s() && e.supportsFollowUp))() &&
                    e.onFollowUpSubmit
                  );
                },
                get children() {
                  return S(It, {
                    get children() {
                      return [
                        S(ue, {
                          get when() {
                            return e.previousPrompt;
                          },
                          get children() {
                            var C = ub(),
                              O = C.firstChild;
                            return (
                              M(
                                C,
                                S(ss, {
                                  size: 10,
                                  class: "text-black/30 shrink-0",
                                }),
                                O,
                              ),
                              M(O, () => e.previousPrompt),
                              C
                            );
                          },
                        }),
                        (() => {
                          var C = db(),
                            O = C.firstChild,
                            V = O.nextSibling;
                          ((O.$$keydown = y),
                            (O.$$input = (X) => {
                              (Vr(X.target, Vn), h(X.target.value));
                            }));
                          var Q = n;
                          return (
                            typeof Q == "function" ? We(Q, O) : (n = O),
                            pe(O, "max-height", `${Vn}px`),
                            (V.$$click = F),
                            M(V, S(as, { size: 10, class: "text-white" })),
                            Y(
                              (X) => {
                                var ee = e.previousPrompt ? "14px" : "0",
                                  ye = de(
                                    "contain-layout shrink-0 flex items-center justify-center size-4 rounded-full bg-black cursor-pointer ml-1 interactive-scale",
                                    !m().trim() && "opacity-35",
                                  );
                                return (
                                  ee !== X.e &&
                                    pe(C, "padding-left", (X.e = ee)),
                                  ye !== X.t && we(V, (X.t = ye)),
                                  X
                                );
                              },
                              { e: void 0, t: void 0 },
                            ),
                            Y(() => (O.value = m())),
                            C
                          );
                        })(),
                      ];
                    },
                  });
                },
              }),
              null,
            ),
            Y(
              (C) => {
                var O = de(
                    "contain-layout shrink-0 flex flex-col justify-center items-end rounded-[10px] antialiased w-fit h-fit max-w-[280px] transition-opacity duration-100 ease-out [font-synthesis:none] [corner-shape:superellipse(1.25)]",
                    ft,
                  ),
                  V = c() ? 0 : 1;
                return (
                  O !== C.e && we(g, (C.e = O)),
                  V !== C.t && pe(g, "opacity", (C.t = V)),
                  C
                );
              },
              { e: void 0, t: void 0 },
            ),
            g
          );
        })()
      );
    };
  Qe(["pointerdown", "click", "input", "keydown"]);
  var mb = "0",
    pb = "1",
    gb = ({ hiddenOpacity: e = mb, visibleOpacity: t = pb } = {}) => {
      let n,
        o,
        r = () => {
          o && (o.style.opacity = e);
        };
      return {
        containerRef: (l) => {
          n = l;
        },
        followerRef: (l) => {
          o = l;
        },
        followElement: (l) => {
          if (!o || !n) return;
          if (!l) {
            r();
            return;
          }
          let u = n.getBoundingClientRect(),
            f = l.getBoundingClientRect(),
            m = f.top - u.top + n.scrollTop,
            h = f.left - u.left + n.scrollLeft;
          ((o.style.opacity = t),
            (o.style.top = `${m}px`),
            (o.style.left = `${h}px`),
            (o.style.width = `${f.width}px`),
            (o.style.height = `${f.height}px`));
        },
        hideFollower: r,
      };
    },
    Zn = () => {
      let {
        containerRef: e,
        followerRef: t,
        followElement: n,
        hideFollower: o,
      } = gb();
      return {
        containerRef: e,
        highlightRef: t,
        updateHighlight: n,
        clearHighlight: o,
      };
    };
  var hb = D(
      '<div class="relative flex flex-col w-[calc(100%+16px)] -mx-2 -my-1.5"><div class="pointer-events-none absolute bg-black/5 opacity-0 transition-[top,left,width,height,opacity] duration-75 ease-out">',
    ),
    bb = D("<span class=text-black/40>."),
    yb = D(
      '<button data-react-grab-ignore-events class="relative z-1 contain-layout flex items-center w-full px-2 py-1 cursor-pointer text-left border-none bg-transparent"><span class="text-[13px] leading-4 h-fit font-medium overflow-hidden text-ellipsis whitespace-nowrap min-w-0 transition-colors">',
    ),
    Nd = (e) => {
      let {
          containerRef: t,
          highlightRef: n,
          updateHighlight: o,
          clearHighlight: r,
        } = Zn(),
        s,
        i = false,
        c = (l) =>
          s
            ? (s.querySelector(`[data-react-grab-arrow-nav-index="${l}"]`) ??
              void 0)
            : void 0;
      return (
        ge(() => {
          (e.items, (i = false));
        }),
        ge(() => {
          let l = c(e.activeIndex);
          l && o(l);
        }),
        S(It, {
          get children() {
            var l = hb(),
              u = l.firstChild;
            return (
              (l.$$pointermove = () => {
                i = true;
              }),
              We((f) => {
                ((s = f), t(f));
              }, l),
              We(n, u),
              M(
                l,
                S(Jt, {
                  get each() {
                    return e.items;
                  },
                  children: (f, m) =>
                    (() => {
                      var h = yb(),
                        v = h.firstChild;
                      return (
                        (h.$$click = (H) => {
                          (H.stopPropagation(), e.onSelect(m()));
                        }),
                        h.addEventListener("pointerleave", () => {
                          let H = c(e.activeIndex);
                          H ? o(H) : r();
                        }),
                        h.addEventListener("pointerenter", (H) => {
                          (o(H.currentTarget), i && e.onSelect(m()));
                        }),
                        (h.$$pointerdown = (H) => H.stopPropagation()),
                        M(
                          v,
                          S(ue, {
                            get when() {
                              return f.componentName;
                            },
                            get children() {
                              return [Be(() => f.componentName), bb()];
                            },
                          }),
                          null,
                        ),
                        M(v, () => f.tagName, null),
                        Y(
                          (H) => {
                            var F = f.tagName,
                              y = m(),
                              w = m() === e.activeIndex,
                              b = m() !== e.activeIndex;
                            return (
                              F !== H.e &&
                                ne(
                                  h,
                                  "data-react-grab-arrow-nav-item",
                                  (H.e = F),
                                ),
                              y !== H.t &&
                                ne(
                                  h,
                                  "data-react-grab-arrow-nav-index",
                                  (H.t = y),
                                ),
                              w !== H.a &&
                                v.classList.toggle("text-black", (H.a = w)),
                              b !== H.o &&
                                v.classList.toggle("text-black/30", (H.o = b)),
                              H
                            );
                          },
                          { e: void 0, t: void 0, a: void 0, o: void 0 },
                        ),
                        h
                      );
                    })(),
                }),
                null,
              ),
              l
            );
          },
        })
      );
    };
  Qe(["pointermove", "pointerdown", "click"]);
  var wb = D(
      '<button data-react-grab-ignore-events data-react-grab-abort class="contain-layout shrink-0 flex items-center justify-center size-4 rounded-full bg-black cursor-pointer ml-1 interactive-scale"><div class="size-1.5 bg-white rounded-[1px]">',
    ),
    xb = D(
      '<div class="shrink-0 flex justify-between items-end w-full min-h-4"><textarea data-react-grab-ignore-events class="text-black text-[13px] leading-4 font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 opacity-50 wrap-break-word overflow-y-auto"placeholder="Add context"rows=1 disabled style=field-sizing:content;min-height:16px;scrollbar-width:none>',
    ),
    vb = D(
      '<div class="contain-layout shrink-0 flex flex-col justify-center items-start w-fit h-fit max-w-[280px]"><div class="contain-layout shrink-0 flex items-center gap-1 py-1.5 px-2 w-full h-fit"><span class="shimmer-text text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap">',
    ),
    Cb = D('<div class="flex flex-col w-[calc(100%+16px)] -mx-2 -my-1.5">'),
    Eb = D(
      '<div class="contain-layout shrink-0 flex flex-col items-start w-fit h-fit"><div class="contain-layout shrink-0 flex items-center gap-1 w-fit h-fit px-2">',
    ),
    Sb = D(
      '<div class="flex items-center gap-1 w-full mb-1 overflow-hidden"><span class="text-black/40 text-[11px] leading-3 font-medium truncate italic">',
    ),
    Ab = D(
      '<button data-react-grab-submit class="contain-layout shrink-0 flex items-center justify-center size-4 rounded-full bg-black cursor-pointer ml-1 interactive-scale">',
    ),
    Tb = D(
      '<div class="shrink-0 flex justify-between items-end w-full min-h-4"><textarea data-react-grab-ignore-events data-react-grab-input class="text-black text-[13px] leading-4 font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 wrap-break-word overflow-y-auto"placeholder="Add context"rows=1 style=field-sizing:content;min-height:16px;scrollbar-width:none>',
    ),
    _b = D(
      '<div class="contain-layout shrink-0 flex flex-col justify-center items-start w-fit h-fit min-w-[150px] max-w-[280px]"><div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 w-fit h-fit px-2 max-w-full">',
    ),
    Pb = D(
      "<div data-react-grab-ignore-events data-react-grab-selection-label style=z-index:2147483647><div>",
    ),
    kb = D('<span class="text-[11px] font-sans text-black/50 ml-4">'),
    Ob = D(
      '<div class="contain-layout flex items-center justify-between w-full px-2 py-1 transition-colors"><span class="text-[13px] leading-4 font-sans font-medium text-black">',
    ),
    Ld = {
      left: Ta,
      top: Ta,
      arrowLeftPercent: ma,
      arrowLeftOffset: 0,
      edgeOffsetX: 0,
    },
    fs = (e) => {
      let t,
        n,
        o,
        r = false,
        s = null,
        i = null,
        [c, l] = $(0),
        [u, f] = $(0),
        [m, h] = $(0),
        [v, H] = $("bottom"),
        [F, y] = $(0),
        [w, b] = $(false),
        [g, C] = $(false),
        O = () =>
          e.status !== "copying" &&
          e.status !== "copied" &&
          e.status !== "fading" &&
          e.status !== "error",
        V = () => e.status === "copied" || e.status === "fading",
        Q = () =>
          !!(
            e.isPromptMode ||
            (V() && (e.onDismiss || e.onShowContextMenu)) ||
            (e.status === "copying" && e.onAbort) ||
            (e.status === "error" && (e.onAcknowledgeError || e.onRetry)) ||
            e.arrowNavigationState?.isVisible
          ),
        X,
        ee = (N) => {
          r = N;
        },
        ye = () => {
          y((N) => N + 1);
        },
        ce = (N) => {
          if (St(N)) return;
          let B = N.code === "Enter" && !e.isPromptMode && O(),
            oe =
              N.code === "KeyC" &&
              N.ctrlKey &&
              e.status === "copying" &&
              e.onAbort;
          B
            ? (N.preventDefault(),
              N.stopImmediatePropagation(),
              e.onToggleExpand?.())
            : oe &&
              (N.preventDefault(), N.stopImmediatePropagation(), e.onAbort?.());
        };
      (lt(() => {
        if (
          ((X = new ResizeObserver((N) => {
            for (let B of N) {
              let oe = B.target.getBoundingClientRect();
              B.target === t && !r
                ? (l(oe.width), f(oe.height))
                : B.target === n && h(oe.width);
            }
          })),
          t)
        ) {
          let N = t.getBoundingClientRect();
          (l(N.width), f(N.height), X.observe(t));
        }
        (n && (h(n.getBoundingClientRect().width), X.observe(n)),
          window.addEventListener("scroll", ye, true),
          window.addEventListener("resize", ye),
          window.addEventListener("keydown", ce, { capture: true }));
      }),
        _e(() => {
          (X?.disconnect(),
            window.removeEventListener("scroll", ye, true),
            window.removeEventListener("resize", ye),
            window.removeEventListener("keydown", ce, { capture: true }));
        }),
        ge(() => {
          let N = `${e.tagName ?? ""}:${e.componentName ?? ""}`;
          N !== i && ((i = N), (s = null));
        }),
        ge(() => {
          if (e.isPromptMode && o && e.onSubmit) {
            let N = setTimeout(() => {
              o && (o.focus(), Vr(o, Vn));
            }, 0);
            _e(() => {
              clearTimeout(N);
            });
          }
        }));
      let W = ie(() => {
        F();
        let N = e.selectionBounds,
          B = c(),
          oe = u(),
          ke = B > 0 && oe > 0,
          he = N && N.width > 0 && N.height > 0;
        if (!ke || !he)
          return { position: s ?? Ld, computedArrowPosition: null };
        let Pe = window.visualViewport?.width ?? window.innerWidth,
          fe = window.visualViewport?.height ?? window.innerHeight;
        if (!(N.x + N.width > 0 && N.x < Pe && N.y + N.height > 0 && N.y < fe))
          return { position: Ld, computedArrowPosition: null };
        let $e = N.x + N.width / 2,
          Ie = e.mouseX ?? $e,
          be = N.y + N.height,
          Ae = N.y,
          tt = e.hideArrow ? 0 : rs(m()),
          ot = Ie,
          mt = 0,
          Rt = be + tt + Qt;
        if (B > 0) {
          let ht = ot - B / 2,
            zt = ot + B / 2;
          (zt > Pe - 8 && (mt = Pe - 8 - zt), ht + mt < 8 && (mt = 8 - ht));
        }
        let _o = oe + tt + Qt,
          ro = Rt + oe <= fe - 8;
        (ro || (Rt = Ae - _o), Rt < 8 && (Rt = 8));
        let Mn = ma,
          xt = B / 2,
          tn = xt - mt,
          gt = Math.min(pa, xt),
          nn = Math.max(B - pa, xt),
          fn = Math.max(gt, Math.min(nn, tn)) - xt;
        return {
          position: {
            left: ot,
            top: Rt,
            arrowLeftPercent: Mn,
            arrowLeftOffset: fn,
            edgeOffsetX: mt,
          },
          computedArrowPosition: ro ? "bottom" : "top",
        };
      });
      ge(() => {
        let N = W();
        N.computedArrowPosition !== null &&
          ((s = N.position), b(true), H(N.computedArrowPosition));
      });
      let G = (N) => {
          if (N.isComposing || N.keyCode === Tu) return;
          N.stopImmediatePropagation();
          let B = N.code === "Enter" && !N.shiftKey,
            oe = N.code === "Escape";
          B
            ? (N.preventDefault(), e.onSubmit?.())
            : oe && (N.preventDefault(), e.onConfirmDismiss?.());
        },
        A = (N) => {
          let B = N.target;
          B instanceof HTMLTextAreaElement &&
            (Vr(B, Vn), e.onInputChange?.(B.value));
        },
        I = () =>
          is({
            tagName: e.tagName,
            componentName: e.componentName,
            elementsCount: e.elementsCount,
          }),
        U = () => I().tagName,
        q = () => I().componentName,
        x = () => e.actionCycleState?.items ?? [],
        T = () => e.actionCycleState?.activeIndex ?? 0,
        K = () => !!e.actionCycleState?.isVisible,
        z = () => !!e.arrowNavigationState?.isVisible,
        te = (N) => {
          (N.stopImmediatePropagation(), e.filePath && e.onOpen && e.onOpen());
        },
        j = () => !!(e.filePath && e.onOpen),
        Ee = (N) => {
          (N.stopImmediatePropagation(),
            O() &&
              e.isPromptMode &&
              !e.isPendingDismiss &&
              e.onSubmit &&
              o &&
              o.focus());
        },
        ve = () => w() && (V() || e.status === "error");
      return S(ue, {
        get when() {
          return Be(() => e.visible !== false)() && (e.selectionBounds || ve());
        },
        get children() {
          var N = Pb(),
            B = N.firstChild;
          (N.addEventListener("mouseleave", () => e.onHoverChange?.(false)),
            N.addEventListener("mouseenter", () => e.onHoverChange?.(true)),
            (N.$$click = (he) => {
              he.stopImmediatePropagation();
            }),
            (N.$$pointerdown = Ee));
          var oe = t;
          (typeof oe == "function" ? We(oe, N) : (t = N),
            M(
              N,
              S(ue, {
                get when() {
                  return !e.hideArrow;
                },
                get children() {
                  return S(ls, {
                    get position() {
                      return v();
                    },
                    get leftPercent() {
                      return W().position.arrowLeftPercent;
                    },
                    get leftOffsetPx() {
                      return W().position.arrowLeftOffset;
                    },
                    get labelWidth() {
                      return m();
                    },
                  });
                },
              }),
              B,
            ),
            M(
              N,
              S(ue, {
                get when() {
                  return Be(() => !!V())() && !e.error;
                },
                get children() {
                  return S(Rd, {
                    get statusText() {
                      return Be(() => !!e.hasAgent)()
                        ? (e.statusText ?? "Completed")
                        : "Copied";
                    },
                    get supportsUndo() {
                      return e.supportsUndo;
                    },
                    get supportsFollowUp() {
                      return e.supportsFollowUp;
                    },
                    get dismissButtonText() {
                      return e.dismissButtonText;
                    },
                    get previousPrompt() {
                      return e.previousPrompt;
                    },
                    get onDismiss() {
                      return e.onDismiss;
                    },
                    get onUndo() {
                      return e.onUndo;
                    },
                    get onFollowUpSubmit() {
                      return e.onFollowUpSubmit;
                    },
                    onFadingChange: C,
                    get onShowContextMenu() {
                      return e.onShowContextMenu;
                    },
                  });
                },
              }),
              B,
            ));
          var ke = n;
          return (
            typeof ke == "function" ? We(ke, B) : (n = B),
            M(
              B,
              S(ue, {
                get when() {
                  return (
                    Be(() => e.status === "copying")() && !e.isPendingAbort
                  );
                },
                get children() {
                  var he = vb(),
                    Pe = he.firstChild,
                    fe = Pe.firstChild;
                  return (
                    M(
                      Pe,
                      S(_d, { size: 13, class: "text-[#71717a] shrink-0" }),
                      fe,
                    ),
                    M(fe, () => e.statusText ?? "Grabbing\u2026"),
                    M(
                      he,
                      S(ue, {
                        get when() {
                          return Be(() => !!e.hasAgent)() && e.inputValue;
                        },
                        get children() {
                          return S(It, {
                            get children() {
                              var Ce = xb(),
                                $e = Ce.firstChild,
                                Ie = o;
                              return (
                                typeof Ie == "function" ? We(Ie, $e) : (o = $e),
                                pe($e, "max-height", `${Vn}px`),
                                M(
                                  Ce,
                                  S(ue, {
                                    get when() {
                                      return e.onAbort;
                                    },
                                    get children() {
                                      var be = wb();
                                      return (
                                        (be.$$click = (Ae) => {
                                          (Ae.stopPropagation(), e.onAbort?.());
                                        }),
                                        (be.$$pointerdown = (Ae) =>
                                          Ae.stopPropagation()),
                                        be
                                      );
                                    },
                                  }),
                                  null,
                                ),
                                Y(() => ($e.value = e.inputValue ?? "")),
                                Ce
                              );
                            },
                          });
                        },
                      }),
                      null,
                    ),
                    Y(() =>
                      he.classList.toggle(
                        "min-w-[150px]",
                        !!(e.hasAgent && e.inputValue),
                      ),
                    ),
                    he
                  );
                },
              }),
              null,
            ),
            M(
              B,
              S(ue, {
                get when() {
                  return Be(() => e.status === "copying")() && e.isPendingAbort;
                },
                get children() {
                  return S(Kr, {
                    get onConfirm() {
                      return e.onConfirmAbort;
                    },
                    get onCancel() {
                      return e.onCancelAbort;
                    },
                  });
                },
              }),
              null,
            ),
            M(
              B,
              S(ue, {
                get when() {
                  return Be(() => !!O())() && !e.isPromptMode;
                },
                get children() {
                  var he = Eb(),
                    Pe = he.firstChild;
                  return (
                    M(
                      Pe,
                      S(Wr, {
                        get tagName() {
                          return U();
                        },
                        get componentName() {
                          return q();
                        },
                        get isClickable() {
                          return j();
                        },
                        onClick: te,
                        onHoverChange: ee,
                        shrink: true,
                        get forceShowIcon() {
                          return Be(() => !!z())()
                            ? j()
                            : !!e.isContextMenuOpen;
                        },
                      }),
                    ),
                    M(
                      he,
                      S(ue, {
                        get when() {
                          return e.arrowNavigationState?.isVisible;
                        },
                        get children() {
                          return S(Nd, {
                            get items() {
                              return e.arrowNavigationState.items;
                            },
                            get activeIndex() {
                              return e.arrowNavigationState.activeIndex;
                            },
                            onSelect: (fe) => e.onArrowNavigationSelect?.(fe),
                          });
                        },
                      }),
                      null,
                    ),
                    M(
                      he,
                      S(ue, {
                        get when() {
                          return Be(() => !z())() && K();
                        },
                        get children() {
                          return S(It, {
                            get children() {
                              var fe = Cb();
                              return (
                                M(
                                  fe,
                                  S(Jt, {
                                    get each() {
                                      return x();
                                    },
                                    children: (Ce, $e) =>
                                      (() => {
                                        var Ie = Ob(),
                                          be = Ie.firstChild;
                                        return (
                                          M(be, () => Ce.label),
                                          M(
                                            Ie,
                                            S(ue, {
                                              get when() {
                                                return Ce.shortcut;
                                              },
                                              get children() {
                                                var Ae = kb();
                                                return (
                                                  M(Ae, () => qn(Ce.shortcut)),
                                                  Ae
                                                );
                                              },
                                            }),
                                            null,
                                          ),
                                          Y(
                                            (Ae) => {
                                              var tt = Ce.label.toLowerCase(),
                                                ot = $e() === T(),
                                                mt = $e() === x().length - 1;
                                              return (
                                                tt !== Ae.e &&
                                                  ne(
                                                    Ie,
                                                    "data-react-grab-action-cycle-item",
                                                    (Ae.e = tt),
                                                  ),
                                                ot !== Ae.t &&
                                                  Ie.classList.toggle(
                                                    "bg-black/5",
                                                    (Ae.t = ot),
                                                  ),
                                                mt !== Ae.a &&
                                                  Ie.classList.toggle(
                                                    "rounded-b-[6px]",
                                                    (Ae.a = mt),
                                                  ),
                                                Ae
                                              );
                                            },
                                            { e: void 0, t: void 0, a: void 0 },
                                          ),
                                          Ie
                                        );
                                      })(),
                                  }),
                                ),
                                fe
                              );
                            },
                          });
                        },
                      }),
                      null,
                    ),
                    Y(
                      (fe) => {
                        var Ce = !!z(),
                          $e = { "py-1.5": !z(), "pt-1.5 pb-1": z() };
                        return (
                          Ce !== fe.e &&
                            he.classList.toggle("min-w-[100px]", (fe.e = Ce)),
                          (fe.t = mo(Pe, $e, fe.t)),
                          fe
                        );
                      },
                      { e: void 0, t: void 0 },
                    ),
                    he
                  );
                },
              }),
              null,
            ),
            M(
              B,
              S(ue, {
                get when() {
                  return (
                    Be(() => !!(O() && e.isPromptMode))() && !e.isPendingDismiss
                  );
                },
                get children() {
                  var he = _b(),
                    Pe = he.firstChild;
                  return (
                    M(
                      Pe,
                      S(Wr, {
                        get tagName() {
                          return U();
                        },
                        get componentName() {
                          return q();
                        },
                        get isClickable() {
                          return j();
                        },
                        onClick: te,
                        onHoverChange: ee,
                        forceShowIcon: true,
                      }),
                    ),
                    M(
                      he,
                      S(It, {
                        get children() {
                          return [
                            S(ue, {
                              get when() {
                                return e.replyToPrompt;
                              },
                              get children() {
                                var fe = Sb(),
                                  Ce = fe.firstChild;
                                return (
                                  M(
                                    fe,
                                    S(ss, {
                                      size: 10,
                                      class: "text-black/30 shrink-0",
                                    }),
                                    Ce,
                                  ),
                                  M(Ce, () => e.replyToPrompt),
                                  fe
                                );
                              },
                            }),
                            (() => {
                              var fe = Tb(),
                                Ce = fe.firstChild;
                              ((Ce.$$keydown = G), (Ce.$$input = A));
                              var $e = o;
                              return (
                                typeof $e == "function" ? We($e, Ce) : (o = Ce),
                                pe(Ce, "max-height", `${Vn}px`),
                                M(
                                  fe,
                                  S(ue, {
                                    get when() {
                                      return e.onSubmit;
                                    },
                                    get children() {
                                      var Ie = Ab();
                                      return (
                                        (Ie.$$click = () => e.onSubmit?.()),
                                        M(
                                          Ie,
                                          S(as, {
                                            size: 10,
                                            class: "text-white",
                                          }),
                                        ),
                                        Ie
                                      );
                                    },
                                  }),
                                  null,
                                ),
                                Y(
                                  (Ie) => {
                                    var be = e.replyToPrompt ? "14px" : "0",
                                      Ae = !e.onSubmit;
                                    return (
                                      be !== Ie.e &&
                                        pe(fe, "padding-left", (Ie.e = be)),
                                      Ae !== Ie.t && (Ce.readOnly = Ie.t = Ae),
                                      Ie
                                    );
                                  },
                                  { e: void 0, t: void 0 },
                                ),
                                Y(() => (Ce.value = e.inputValue ?? "")),
                                fe
                              );
                            })(),
                          ];
                        },
                      }),
                      null,
                    ),
                    he
                  );
                },
              }),
              null,
            ),
            M(
              B,
              S(ue, {
                get when() {
                  return e.isPendingDismiss;
                },
                get children() {
                  return S(Kr, {
                    get onConfirm() {
                      return e.onConfirmDismiss;
                    },
                    get onCancel() {
                      return e.onCancelDismiss;
                    },
                  });
                },
              }),
              null,
            ),
            M(
              B,
              S(ue, {
                get when() {
                  return e.error;
                },
                get children() {
                  return S(Md, {
                    get error() {
                      return e.error;
                    },
                    get onAcknowledge() {
                      return e.onAcknowledgeError;
                    },
                    get onRetry() {
                      return e.onRetry;
                    },
                  });
                },
              }),
              null,
            ),
            Y(
              (he) => {
                var Pe = de(
                    "fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none transition-opacity duration-100 ease-out",
                  ),
                  fe = `${W().position.top}px`,
                  Ce = `${W().position.left}px`,
                  $e = `translateX(calc(-50% + ${W().position.edgeOffsetX}px))`,
                  Ie = Q() ? "auto" : "none",
                  be = e.status === "fading" || g() ? 0 : 1,
                  Ae = de(
                    "contain-layout flex items-center gap-[5px] rounded-[10px] antialiased w-fit h-fit p-0 [font-synthesis:none] [corner-shape:superellipse(1.25)]",
                    ft,
                  ),
                  tt = V() && !e.error ? "none" : void 0;
                return (
                  Pe !== he.e && we(N, (he.e = Pe)),
                  fe !== he.t && pe(N, "top", (he.t = fe)),
                  Ce !== he.a && pe(N, "left", (he.a = Ce)),
                  $e !== he.o && pe(N, "transform", (he.o = $e)),
                  Ie !== he.i && pe(N, "pointer-events", (he.i = Ie)),
                  be !== he.n && pe(N, "opacity", (he.n = be)),
                  Ae !== he.s && we(B, (he.s = Ae)),
                  tt !== he.h && pe(B, "display", (he.h = tt)),
                  he
                );
              },
              {
                e: void 0,
                t: void 0,
                a: void 0,
                o: void 0,
                i: void 0,
                n: void 0,
                s: void 0,
                h: void 0,
              },
            ),
            N
          );
        },
      });
    };
  Qe(["pointerdown", "click", "input", "keydown"]);
  var Dd = "react-grab-toolbar-state",
    wo = () => {
      try {
        let e = localStorage.getItem(Dd);
        if (!e) return null;
        let t = JSON.parse(e);
        if (typeof t != "object" || t === null) return null;
        let n = t;
        return {
          edge:
            n.edge === "top" ||
            n.edge === "bottom" ||
            n.edge === "left" ||
            n.edge === "right"
              ? n.edge
              : "bottom",
          ratio: typeof n.ratio == "number" ? n.ratio : en,
          collapsed: typeof n.collapsed == "boolean" ? n.collapsed : !1,
          enabled: typeof n.enabled == "boolean" ? n.enabled : !0,
        };
      } catch (e) {
        console.warn(
          "[react-grab] Failed to load toolbar state from localStorage:",
          e,
        );
      }
      return null;
    },
    Yr = (e) => {
      try {
        localStorage.setItem(Dd, JSON.stringify(e));
      } catch (t) {
        console.warn(
          "[react-grab] Failed to save toolbar state to localStorage:",
          t,
        );
      }
    };
  var Mb = D(
      '<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 18 18"fill=currentColor><path opacity=0.4 d="M7.65631 10.9565C7.31061 10.0014 7.54012 8.96635 8.25592 8.25195C8.74522 7.76615 9.38771 7.49951 10.0694 7.49951C10.3682 7.49951 10.6641 7.55171 10.9483 7.65381L16.0001 9.49902V4.75C16.0001 3.2334 14.7667 2 13.2501 2H4.75012C3.23352 2 2.00012 3.2334 2.00012 4.75V13.25C2.00012 14.7666 3.23352 16 4.75012 16H9.49962L7.65631 10.9565Z"></path><path d="M17.296 11.5694L10.4415 9.06545C10.0431 8.92235 9.61441 9.01658 9.31551 9.31338C9.01671 9.61168 8.92101 10.0429 9.06551 10.4413L11.5704 17.2948C11.7247 17.7191 12.128 18.0004 12.5772 18.0004C12.585 18.0004 12.5918 17.9999 12.5987 17.9999C13.0577 17.9906 13.4591 17.6913 13.5987 17.2543L14.4854 14.4857L17.2559 13.5985C17.6914 13.4589 17.9903 13.057 18 12.599C18.0097 12.141 17.7267 11.7276 17.296 11.5694Z">',
    ),
    ms = (e) => {
      let t = () => e.size ?? 14;
      return (() => {
        var n = Mb();
        return (
          Y(
            (o) => {
              var r = t(),
                s = t(),
                i = e.class;
              return (
                r !== o.e && ne(n, "width", (o.e = r)),
                s !== o.t && ne(n, "height", (o.t = s)),
                i !== o.a && ne(n, "class", (o.a = i)),
                o
              );
            },
            { e: void 0, t: void 0, a: void 0 },
          ),
          n
        );
      })();
    };
  var Ib = D(
      '<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=currentColor><path fill-rule=evenodd clip-rule=evenodd d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM13 8C13 7.44772 12.5523 7 12 7C11.4477 7 11 7.44772 11 8V12C11 12.2652 11.1054 12.5196 11.2929 12.7071L13.2929 14.7071C13.6834 15.0976 14.3166 15.0976 14.7071 14.7071C15.0976 14.3166 15.0976 13.6834 14.7071 13.2929L13 11.5858V8Z">',
    ),
    ps = (e) => {
      let t = () => e.size ?? 14;
      return (() => {
        var n = Ib();
        return (
          Y(
            (o) => {
              var r = t(),
                s = t(),
                i = e.class;
              return (
                r !== o.e && ne(n, "width", (o.e = r)),
                s !== o.t && ne(n, "height", (o.t = s)),
                i !== o.a && ne(n, "class", (o.a = i)),
                o
              );
            },
            { e: void 0, t: void 0, a: void 0 },
          ),
          n
        );
      })();
    };
  var Rb = D(
      '<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=currentColor><path d="M16.0549 8.25C17.4225 8.24998 18.5248 8.24996 19.3918 8.36652C20.2919 8.48754 21.0497 8.74643 21.6517 9.34835C22.2536 9.95027 22.5125 10.7081 22.6335 11.6083C22.75 12.4752 22.75 13.5775 22.75 14.9451V14.9451V16.0549V16.0549C22.75 17.4225 22.75 18.5248 22.6335 19.3918C22.5125 20.2919 22.2536 21.0497 21.6517 21.6517C21.0497 22.2536 20.2919 22.5125 19.3918 22.6335C18.5248 22.75 17.4225 22.75 16.0549 22.75H16.0549H14.9451H14.9451C13.5775 22.75 12.4752 22.75 11.6082 22.6335C10.7081 22.5125 9.95027 22.2536 9.34835 21.6516C8.74643 21.0497 8.48754 20.2919 8.36652 19.3918C8.24996 18.5248 8.24998 17.4225 8.25 16.0549V16.0549V14.9451V14.9451C8.24998 13.5775 8.24996 12.4752 8.36652 11.6082C8.48754 10.7081 8.74643 9.95027 9.34835 9.34835C9.95027 8.74643 10.7081 8.48754 11.6083 8.36652C12.4752 8.24996 13.5775 8.24998 14.9451 8.25H14.9451H16.0549H16.0549Z"></path><path d="M6.75 14.8569C6.74991 13.5627 6.74983 12.3758 6.8799 11.4084C7.0232 10.3425 7.36034 9.21504 8.28769 8.28769C9.21504 7.36034 10.3425 7.0232 11.4084 6.8799C12.3758 6.74983 13.5627 6.74991 14.8569 6.75L17.0931 6.75C17.3891 6.75 17.5371 6.75 17.6261 6.65419C17.7151 6.55838 17.7045 6.4142 17.6833 6.12584C17.6648 5.87546 17.6412 5.63892 17.6111 5.41544C17.4818 4.45589 17.2232 3.6585 16.6718 2.98663C16.4744 2.74612 16.2539 2.52558 16.0134 2.3282C15.3044 1.74638 14.4557 1.49055 13.4248 1.36868C12.4205 1.24998 11.1512 1.24999 9.54893 1.25H9.45109C7.84883 1.24999 6.57947 1.24998 5.57525 1.36868C4.54428 1.49054 3.69558 1.74638 2.98663 2.3282C2.74612 2.52558 2.52558 2.74612 2.3282 2.98663C1.74638 3.69558 1.49055 4.54428 1.36868 5.57525C1.24998 6.57947 1.24999 7.84882 1.25 9.45108V9.54891C1.24999 11.1512 1.24998 12.4205 1.36868 13.4247C1.49054 14.4557 1.74638 15.3044 2.3282 16.0134C2.52558 16.2539 2.74612 16.4744 2.98663 16.6718C3.6585 17.2232 4.45589 17.4818 5.41544 17.6111C5.63892 17.6412 5.87546 17.6648 6.12584 17.6833C6.4142 17.7045 6.55838 17.7151 6.65419 17.6261C6.75 17.5371 6.75 17.3891 6.75 17.0931V14.8569Z">',
    ),
    xo = (e) => {
      let t = () => e.size ?? 14;
      return (() => {
        var n = Rb();
        return (
          Y(
            (o) => {
              var r = t(),
                s = t(),
                i = e.class;
              return (
                r !== o.e && ne(n, "width", (o.e = r)),
                s !== o.t && ne(n, "height", (o.t = s)),
                i !== o.a && ne(n, "class", (o.a = i)),
                o
              );
            },
            { e: void 0, t: void 0, a: void 0 },
          ),
          n
        );
      })();
    };
  var ul = (e, t, n) => (e.x - n.x) * (t.y - n.y) - (t.x - n.x) * (e.y - n.y),
    Nb = (e, t, n, o) => {
      let r = ul(e, t, n),
        s = ul(e, n, o),
        i = ul(e, o, t),
        c = r < 0 || s < 0 || i < 0,
        l = r > 0 || s > 0 || i > 0;
      return !c || !l;
    },
    dl = (e, t) =>
      e.x >= t.x && e.x <= t.x + t.width && e.y >= t.y && e.y <= t.y + t.height,
    Lb = (e, t) => {
      let n = t.y + t.height,
        o = t.x + t.width;
      return e.y <= t.y
        ? [
            { x: t.x, y: n },
            { x: o, y: n },
          ]
        : e.y >= n
          ? [
              { x: t.x, y: t.y },
              { x: o, y: t.y },
            ]
          : e.x <= t.x
            ? [
                { x: o, y: t.y },
                { x: o, y: n },
              ]
            : [
                { x: t.x, y: t.y },
                { x: t.x, y: n },
              ];
    },
    gs = () => {
      let e = null,
        t = () => {
          (e?.(), (e = null));
        };
      return {
        start: (o, r, s) => {
          t();
          let i = r[0];
          if (!i || dl(o, i)) return;
          let [c, l] = Lb(o, i),
            u = (m) => r.some((h) => dl(m, h)),
            f = (m) => {
              let h = { x: m.clientX, y: m.clientY };
              if (u(h)) {
                dl(h, i) && t();
                return;
              }
              Nb(h, o, c, l) || (t(), s());
            };
          (window.addEventListener("mousemove", f),
            (e = () => {
              window.removeEventListener("mousemove", f);
            }));
        },
        stop: t,
      };
    };
  var wt = false,
    fl = (e, t, n) => {
      let o = e.get(t);
      if (o) return o;
      let r = n();
      return (e.set(t, r), r);
    },
    Fd = new WeakMap(),
    Hd = new WeakMap(),
    Db = new WeakMap(),
    pl = new Set(),
    gl = [],
    qr = [],
    hs = new WeakMap(),
    bs = new WeakMap(),
    $d = new WeakSet(),
    Bd = Ya,
    Fb = (e) => {
      let t = e;
      for (; t.return; ) t = t.return;
      return t.stateNode ?? null;
    },
    zd = () => {
      if (Bd.size > 0) return Bd;
      let e = new Set(),
        t = (n) => {
          let o = Wn(n);
          if (o) {
            let r = Fb(o);
            r && e.add(r);
            return;
          }
          for (let r of Array.from(n.children)) if ((t(r), e.size > 0)) return;
        };
      return (t(document.body), e);
    },
    Hb = (e, t) => {
      if (!e) return t;
      if (!t) return e;
      if (!e.next || !t.next) return t;
      let n = e.next,
        o = t.next,
        r = e === n,
        s = t === o;
      return (
        r && s
          ? ((e.next = t), (t.next = e))
          : r
            ? ((e.next = o), (t.next = e))
            : s
              ? ((t.next = n), (e.next = t))
              : ((e.next = o), (t.next = n)),
        t
      );
    },
    $b = (e) => {
      if (!e || hs.has(e)) return;
      let t = {
        originalPendingDescriptor: Object.getOwnPropertyDescriptor(
          e,
          "pending",
        ),
        pendingValueAtPause: e.pending,
        bufferedPending: null,
      };
      typeof e.getSnapshot == "function" &&
        ((t.originalGetSnapshot = e.getSnapshot),
        (t.snapshotValueAtPause = e.getSnapshot()),
        (e.getSnapshot = () =>
          wt ? t.snapshotValueAtPause : t.originalGetSnapshot()));
      let n = t.pendingValueAtPause;
      (Object.defineProperty(e, "pending", {
        configurable: true,
        enumerable: true,
        get: () => (wt ? null : n),
        set: (o) => {
          if (wt) {
            o !== null &&
              (t.bufferedPending = Hb(t.bufferedPending ?? null, o));
            return;
          }
          n = o;
        },
      }),
        hs.set(e, t));
    },
    Vd = (e) => {
      if (!e) return [];
      let t = [],
        n = e.next;
      if (!n) return [];
      let o = n;
      do o && (t.push(o.action), (o = o.next));
      while (o && o !== n);
      return t;
    },
    Bb = (e) => {
      let t = hs.get(e);
      if (!t) return;
      (t.originalGetSnapshot && (e.getSnapshot = t.originalGetSnapshot),
        t.originalPendingDescriptor
          ? Object.defineProperty(e, "pending", t.originalPendingDescriptor)
          : delete e.pending,
        (e.pending = null));
      let n = e.dispatch;
      if (typeof n == "function") {
        let o = Vd(t.pendingValueAtPause ?? null),
          r = Vd(t.bufferedPending ?? null);
        for (let s of [...o, ...r]) qr.push(() => n(s));
      }
      hs.delete(e);
    },
    zb = (e) => {
      if (bs.has(e)) return;
      let t = {
        originalDescriptor: Object.getOwnPropertyDescriptor(e, "memoizedValue"),
        frozenValue: e.memoizedValue,
      };
      (Object.defineProperty(e, "memoizedValue", {
        configurable: true,
        enumerable: true,
        get() {
          return wt
            ? t.frozenValue
            : t.originalDescriptor?.get
              ? t.originalDescriptor.get.call(this)
              : this._memoizedValue;
        },
        set(n) {
          if (wt) {
            ((t.pendingValue = n), (t.didReceivePendingValue = true));
            return;
          }
          t.originalDescriptor?.set
            ? t.originalDescriptor.set.call(this, n)
            : (this._memoizedValue = n);
        },
      }),
        t.originalDescriptor?.get || (e._memoizedValue = t.frozenValue),
        bs.set(e, t));
    },
    Vb = (e) => {
      let t = bs.get(e);
      t &&
        (t.originalDescriptor
          ? Object.defineProperty(e, "memoizedValue", t.originalDescriptor)
          : delete e.memoizedValue,
        t.didReceivePendingValue && (e.memoizedValue = t.pendingValue),
        bs.delete(e));
    },
    Gd = (e, t) => {
      let n = e.memoizedState;
      for (; n; )
        (n.queue && typeof n.queue == "object" && t(n.queue), (n = n.next));
    },
    Ud = (e, t) => {
      let n = e.dependencies?.firstContext;
      for (; n && typeof n == "object" && "memoizedValue" in n; )
        (t(n), (n = n.next));
    },
    ys = (e, t) => {
      e && (Zo(e) && t(e), ys(e.child, t), ys(e.sibling, t));
    },
    Gb = (e) => {
      (Gd(e, $b), Ud(e, zb));
    },
    Ub = (e) => {
      (Gd(e, Bb), Ud(e, Vb));
    },
    jb = (e) => {
      if (Fd.has(e)) return;
      let t = e,
        n = {
          useState: t.useState,
          useReducer: t.useReducer,
          useTransition: t.useTransition,
          useSyncExternalStore: t.useSyncExternalStore,
        };
      (Fd.set(e, n),
        (t.useState = (...o) => {
          let r = n.useState.apply(e, o);
          if (!wt || !Array.isArray(r) || typeof r[1] != "function") return r;
          let [s, i] = r,
            c = fl(Hd, i, () => (...l) => {
              wt ? qr.push(() => i(...l)) : i(...l);
            });
          return [s, c];
        }),
        (t.useReducer = (...o) => {
          let r = n.useReducer.apply(e, o);
          if (!wt || !Array.isArray(r) || typeof r[1] != "function") return r;
          let [s, i] = r,
            c = fl(Hd, i, () => (...l) => {
              wt ? qr.push(() => i(...l)) : i(...l);
            });
          return [s, c];
        }),
        (t.useTransition = (...o) => {
          let r = n.useTransition.apply(e, o);
          if (!wt || !Array.isArray(r) || typeof r[1] != "function") return r;
          let [s, i] = r,
            c = fl(Db, i, () => (l) => {
              wt ? gl.push(() => i(l)) : i(l);
            });
          return [s, c];
        }),
        (t.useSyncExternalStore = (o, r, s) => {
          if (!wt) return n.useSyncExternalStore(o, r, s);
          let i = (c) =>
            o(() => {
              wt ? pl.add(c) : c();
            });
          return n.useSyncExternalStore(i, r, s);
        }));
    },
    Wb = (e) => {
      let t = e.currentDispatcherRef;
      if (!t || typeof t != "object") return;
      let n = "H" in t ? "H" : "current",
        o = t[n];
      Object.defineProperty(t, n, {
        configurable: true,
        enumerable: true,
        get: () => (o && typeof o == "object" && jb(o), o),
        set: (r) => {
          o = r;
        },
      });
    },
    Kb = (e) => {
      queueMicrotask(() => {
        try {
          for (let t of Un().renderers.values())
            if (typeof t.scheduleUpdate == "function") {
              for (let n of e)
                if (n.current)
                  try {
                    t.scheduleUpdate(n.current);
                  } catch {}
            }
        } catch {}
      });
    },
    ml = (e) => {
      for (let t of e)
        try {
          t();
        } catch {}
    },
    Xb = () => {
      for (let e of Un().renderers.values()) $d.has(e) || (Wb(e), $d.add(e));
    },
    ws = () => {
      if (wt) return () => {};
      (Xb(), (wt = true));
      let e = zd();
      for (let t of e) ys(t.current, Gb);
      return () => {
        if (wt)
          try {
            let t = zd();
            for (let s of t) ys(s.current, Ub);
            let n = Array.from(pl),
              o = gl.slice(),
              r = qr.slice();
            ((wt = !1), ml(n), ml(o), ml(r), Kb(t));
          } finally {
            (pl.clear(), (gl.length = 0), (qr.length = 0));
          }
      };
    };
  var Zr = (e, t) => {
    let n = document.createElement("style");
    return (
      n.setAttribute(e, ""),
      (n.textContent = t),
      document.head.appendChild(n),
      n
    );
  };
  var vo = false,
    kn = new Map(),
    jd = -1,
    Wd = new WeakSet(),
    Jr = new Map(),
    lr = new Map(),
    Yb = (e) =>
      Wd.has(e)
        ? true
        : !vo ||
            !("gsapVersions" in window) ||
            !(new Error().stack ?? "").includes("_tick")
          ? false
          : (Wd.add(e), true);
  typeof window < "u" &&
    ((window.requestAnimationFrame = (e) => {
      if (!Yb(e)) return Ve(e);
      if (vo) {
        let n = jd--;
        return (kn.set(n, e), n);
      }
      let t = Ve((n) => {
        if (vo) {
          let o = jd--;
          (kn.set(o, e), Jr.set(t, o));
          return;
        }
        e(n);
      });
      return t;
    }),
    (window.cancelAnimationFrame = (e) => {
      if (kn.has(e)) {
        kn.delete(e);
        return;
      }
      let t = lr.get(e);
      if (t !== void 0) {
        (Ge(t.nativeId), lr.delete(e));
        return;
      }
      let n = Jr.get(e);
      if (n !== void 0) {
        (kn.delete(n), Jr.delete(e));
        return;
      }
      Ge(e);
    }));
  var Kd = () => {
      if (!vo) {
        ((vo = true), kn.clear(), Jr.clear());
        for (let [e, { nativeId: t, callback: n }] of lr) (Ge(t), kn.set(e, n));
        lr.clear();
      }
    },
    Xd = () => {
      if (vo) {
        vo = false;
        for (let [e, t] of kn.entries()) {
          let n = Ve((o) => {
            (lr.delete(e), t(o));
          });
          lr.set(e, { nativeId: n, callback: t });
        }
        (kn.clear(), Jr.clear());
      }
    };
  var qb = `
[${Mr}],
[${Mr}] * {
  animation-play-state: paused !important;
  transition: none !important;
}
`,
    Zb = `
*, *::before, *::after {
  animation-play-state: paused !important;
  transition: none !important;
}
`,
    qd = "svg",
    Yd = null,
    Co = [],
    Qr = [],
    hl = [],
    cr = null,
    xs = [],
    ei = new Map(),
    ti = [],
    Jb = () => {
      Yd || (Yd = Zr("data-react-grab-frozen-styles", qb));
    },
    Qb = (e, t) => e.length === t.length && e.every((n, o) => n === t[o]),
    Zd = (e) => {
      let t = new Set();
      for (let n of e) {
        n instanceof SVGSVGElement
          ? t.add(n)
          : n instanceof SVGElement &&
            n.ownerSVGElement &&
            t.add(n.ownerSVGElement);
        for (let o of n.querySelectorAll(qd))
          o instanceof SVGSVGElement && t.add(o);
      }
      return [...t];
    },
    Jd = (e, t) => {
      let n = Reflect.get(e, t);
      typeof n == "function" && n.call(e);
    },
    Qd = (e) => {
      for (let t of e) {
        let n = ei.get(t) ?? 0;
        (n === 0 && Jd(t, "pauseAnimations"), ei.set(t, n + 1));
      }
    },
    ef = (e) => {
      for (let t of e) {
        let n = ei.get(t);
        if (n) {
          if (n === 1) {
            (ei.delete(t), Jd(t, "unpauseAnimations"));
            continue;
          }
          ei.set(t, n - 1);
        }
      }
    },
    ey = (e) => {
      let t = [];
      for (let n of e)
        for (let o of n.getAnimations({ subtree: true }))
          o.playState === "running" && t.push(o);
      return t;
    },
    tf = (e) => {
      for (let t of e)
        try {
          t.finish();
        } catch {}
    },
    ur = (e) => {
      if (e.length !== 0 && !Qb(e, hl)) {
        (bl(), (hl = [...e]), Jb(), (Co = e), (Qr = Zd(Co)), Qd(Qr));
        for (let t of Co) t.setAttribute(Mr, "");
        ti = ey(Co);
        for (let t of ti) t.pause();
      }
    },
    bl = () => {
      if (!(Co.length === 0 && Qr.length === 0 && ti.length === 0)) {
        for (let e of Co) e.removeAttribute(Mr);
        (ef(Qr), tf(ti), (Co = []), (Qr = []), (ti = []), (hl = []));
      }
    },
    nf = (e) => (e.length === 0 ? (bl(), () => {}) : (ur(e), bl)),
    vs = () => {
      cr ||
        ((cr = Zr("data-react-grab-global-freeze", Zb)),
        (xs = Zd(Array.from(document.querySelectorAll(qd)))),
        Qd(xs),
        Kd());
    },
    ni = () => {
      if (!cr) return;
      cr.textContent = `
*, *::before, *::after {
  transition: none !important;
}
`;
      let e = [];
      for (let t of document.getAnimations()) {
        if (t.effect instanceof KeyframeEffect) {
          let n = t.effect.target;
          if (n instanceof Element && n.getRootNode() instanceof ShadowRoot)
            continue;
        }
        e.push(t);
      }
      (tf(e), cr.remove(), (cr = null), ef(xs), (xs = []), Xd());
    };
  var of = (e, t = window.getComputedStyle(e)) =>
    t.display !== "none" && t.visibility !== "hidden" && t.opacity !== "0";
  var Eo = (e) => {
    let t = ct(e);
    return t === "html" || t === "body";
  };
  var ty = (e) => {
      if (e.hasAttribute("data-react-grab")) return true;
      let t = e.getRootNode();
      return t instanceof ShadowRoot && t.host.hasAttribute("data-react-grab");
    },
    ny = (e) => e.hasAttribute(ba) || e.closest(`[${ba}]`) !== null,
    oy = (e) => {
      let t = parseInt(e.zIndex, 10);
      return (
        e.pointerEvents === "none" &&
        e.position === "fixed" &&
        !isNaN(t) &&
        t >= eu
      );
    },
    ry = (e, t) => {
      let n = t.position;
      if (n !== "fixed" && n !== "absolute") return false;
      let o = e.getBoundingClientRect();
      if (
        !(
          o.width / window.innerWidth >= Ir &&
          o.height / window.innerHeight >= Ir
        )
      )
        return false;
      let s = t.backgroundColor;
      if (
        s === "transparent" ||
        s === "rgba(0, 0, 0, 0)" ||
        parseFloat(t.opacity) < 0.1
      )
        return true;
      let c = parseInt(t.zIndex, 10);
      return !isNaN(c) && c > Qc;
    },
    Cs = new WeakMap(),
    rf = () => {
      Cs = new WeakMap();
    },
    cn = (e) => {
      if (Eo(e) || ty(e) || ny(e)) return false;
      let t = performance.now(),
        n = Cs.get(e);
      if (n && t - n.timestamp < bu) return n.isVisible;
      let o = window.getComputedStyle(e);
      return of(e, o)
        ? e.clientWidth / window.innerWidth >= Ir &&
          e.clientHeight / window.innerHeight >= Ir &&
          (oy(o) || ry(e, o))
          ? false
          : (Cs.set(e, { isVisible: true, timestamp: t }), true)
        : (Cs.set(e, { isVisible: false, timestamp: t }), false);
    };
  var So = null,
    Ao = null,
    sf = () => {
      (Ao !== null && clearTimeout(Ao),
        (Ao = setTimeout(() => {
          ((Ao = null), ri());
        }, hu)));
    },
    yl = () => {
      Ao !== null && (clearTimeout(Ao), (Ao = null));
    },
    iy = (e, t, n, o) => {
      let r = Math.abs(e - n),
        s = Math.abs(t - o);
      return r <= Sa && s <= Sa;
    },
    Es = (e, t) => {
      (yl(), oi());
      let n = document.elementsFromPoint(e, t);
      return (sf(), n);
    },
    dr = (e, t) => {
      let n = performance.now();
      if (So) {
        let s = iy(e, t, So.clientX, So.clientY),
          i = n - So.timestamp < gu;
        if (s || i) return So.element;
      }
      (yl(), oi());
      let o = null,
        r = document.elementFromPoint(e, t);
      if (r && cn(r)) o = r;
      else {
        let s = document.elementsFromPoint(e, t);
        for (let i of s)
          if (i !== r && cn(i)) {
            o = i;
            break;
          }
      }
      return (
        sf(), (So = { clientX: e, clientY: t, element: o, timestamp: n }), o
      );
    },
    Ss = () => {
      (yl(), ri(), (So = null));
    };
  var sy = "html { pointer-events: none !important; }",
    uf = [
      "mouseenter",
      "mouseleave",
      "mouseover",
      "mouseout",
      "pointerenter",
      "pointerleave",
      "pointerover",
      "pointerout",
    ],
    df = ["focus", "blur", "focusin", "focusout"],
    ff = [
      "background-color",
      "color",
      "border-color",
      "box-shadow",
      "transform",
      "opacity",
      "outline",
      "filter",
      "scale",
      "visibility",
    ],
    mf = [
      "background-color",
      "color",
      "border-color",
      "box-shadow",
      "outline",
      "outline-offset",
      "outline-width",
      "outline-color",
      "outline-style",
      "filter",
      "opacity",
      "ring-color",
      "ring-width",
    ],
    pf = new Map(),
    wl = new Map(),
    Jn = null,
    gf = (e) => {
      e.stopImmediatePropagation();
    },
    hf = (e) => {
      (e.preventDefault(), e.stopImmediatePropagation());
    },
    ay = (e, t) => {
      let n = new Map();
      for (let o of t) {
        let r = e.style.getPropertyValue(o);
        r && n.set(o, r);
      }
      return n;
    },
    af = (e, t, n) => {
      let o = [];
      for (let r of document.querySelectorAll(e)) {
        if (!(r instanceof HTMLElement) || n?.has(r)) continue;
        let s = getComputedStyle(r),
          i = r.style.cssText,
          c = ay(r, t);
        for (let l of t) {
          let u = s.getPropertyValue(l);
          u && (i += `${l}: ${u} !important; `);
        }
        o.push({ element: r, frozenStyles: i, originalPropertyValues: c });
      }
      return o;
    },
    lf = (e, t) => {
      for (let { element: n, frozenStyles: o, originalPropertyValues: r } of e)
        (t.set(n, r), (n.style.cssText = o));
    },
    cf = (e, t) => {
      for (let [n, o] of e)
        for (let r of t) {
          let s = o.get(r);
          s ? n.style.setProperty(r, s) : n.style.removeProperty(r);
        }
      e.clear();
    },
    oi = () => {
      Jn && (Jn.disabled = true);
    },
    ri = () => {
      Jn && (Jn.disabled = false);
    },
    As = () => {
      if (Jn) return;
      for (let n of uf) document.addEventListener(n, gf, true);
      for (let n of df) document.addEventListener(n, hf, true);
      let e = af(":hover", ff),
        t = af(":focus, :focus-visible", mf, wl);
      (lf(e, pf), lf(t, wl), (Jn = Zr("data-react-grab-frozen-pseudo", sy)));
    },
    ii = () => {
      Ss();
      for (let e of uf) document.removeEventListener(e, gf, true);
      for (let e of df) document.removeEventListener(e, hf, true);
      (cf(pf, ff), cf(wl, mf), Jn?.remove(), (Jn = null));
    };
  var ly = D("<div style=z-index:2147483647>"),
    xl = 0,
    cy = () => Date.now() - xl < nu,
    On = (e) => {
      let [t, n] = $(false),
        [o, r] = $(true),
        s;
      return (
        ge(
          He(
            () => e.visible,
            (i) => {
              (s !== void 0 && (clearTimeout(s), (s = void 0)),
                i
                  ? cy()
                    ? (r(false), n(true))
                    : (r(true),
                      (s = setTimeout(() => {
                        n(true);
                      }, tu)))
                  : (t() && (xl = Date.now()), n(false)));
            },
          ),
        ),
        _e(() => {
          (s !== void 0 && clearTimeout(s), t() && (xl = Date.now()));
        }),
        S(ue, {
          get when() {
            return t();
          },
          get children() {
            var i = ly();
            return (
              M(i, () => e.children),
              Y(() =>
                we(
                  i,
                  de(
                    "absolute whitespace-nowrap px-1.5 py-0.5 rounded-[10px] text-[10px] text-black/60 pointer-events-none [corner-shape:superellipse(1.25)]",
                    ft,
                    e.position === "left" || e.position === "right"
                      ? "top-1/2 -translate-y-1/2"
                      : "left-1/2 -translate-x-1/2",
                    e.position === "top" && "bottom-full mb-2.5",
                    e.position === "bottom" && "top-full mt-2.5",
                    e.position === "left" && "right-full mr-2.5",
                    e.position === "right" && "left-full ml-2.5",
                    o() && "animate-tooltip-fade-in",
                  ),
                ),
              ),
              i
            );
          },
        })
      );
    };
  var uy = D(
      '<kbd class="inline-flex items-center justify-center px-[3px] h-3.5 rounded-sm [border-width:0.5px] border-solid border-[#B3B3B3] text-black/70 text-[10px] font-medium leading-none">',
    ),
    fr = (e) =>
      (() => {
        var t = uy();
        return (M(t, () => e.children), t);
      })();
  var bf = (e, t, n) => {
      if (t)
        return e
          ? "grid-rows-[1fr] opacity-100"
          : "grid-cols-[1fr] opacity-100";
      let o = e ? "grid-rows-[0fr] opacity-0" : "grid-cols-[0fr] opacity-0";
      return n ? `${o} ${n}` : o;
    },
    Ts = (e) => (e ? "mb-1.5" : "mr-1.5"),
    yf = (e) => (e ? "min-h-0" : "min-w-0"),
    _s = (e) => (e ? "before:!min-h-full" : "before:!min-w-full");
  var dy = D(
      '<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2.5 stroke-linecap=round stroke-linejoin=round><path d="m18 15-6-6-6 6">',
    ),
    wf = (e) => {
      let t = () => e.size ?? 12;
      return (() => {
        var n = dy();
        return (
          Y(
            (o) => {
              var r = t(),
                s = t(),
                i = e.class;
              return (
                r !== o.e && ne(n, "width", (o.e = r)),
                s !== o.t && ne(n, "height", (o.t = s)),
                i !== o.a && ne(n, "class", (o.a = i)),
                o
              );
            },
            { e: void 0, t: void 0, a: void 0 },
          ),
          n
        );
      })();
    };
  var fy = D(
      "<button data-react-grab-ignore-events data-react-grab-toolbar-toggle>",
    ),
    my = D(
      '<button data-react-grab-ignore-events data-react-grab-toolbar-history aria-label="Open history">',
    ),
    py = D(
      '<button data-react-grab-ignore-events data-react-grab-toolbar-copy-all aria-label="Copy all history items">',
    ),
    gy = D(
      "<button data-react-grab-ignore-events data-react-grab-toolbar-menu>",
    ),
    hy = D(
      "<button data-react-grab-ignore-events data-react-grab-toolbar-enabled><div><div>",
    ),
    by = D(
      '<button data-react-grab-ignore-events data-react-grab-toolbar-collapse class="contain-layout shrink-0 flex items-center justify-center cursor-pointer interactive-scale">',
    ),
    yy = D(
      '<div><div><div><div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div></div><div class="relative shrink-0 overflow-visible">',
    ),
    xf = (e) => {
      let t = () => e.snapEdge ?? "bottom",
        n = () => t() === "left" || t() === "right",
        o = (y, w) => bf(n(), y, w),
        r = () =>
          e.disableGridTransitions
            ? ""
            : n()
              ? "transition-[grid-template-rows,opacity] duration-150 ease-out"
              : "transition-[grid-template-columns,opacity] duration-150 ease-out",
        s = () => Ts(n()),
        i = () => yf(n()),
        c = () => _s(n()),
        l = () => {
          if (!e.isCollapsed) return "";
          let y = {
              top: "rounded-t-none rounded-b-[10px]",
              bottom: "rounded-b-none rounded-t-[10px]",
              left: "rounded-l-none rounded-r-[10px]",
              right: "rounded-r-none rounded-l-[10px]",
            }[t()],
            w = n() ? "px-0.25 py-2" : "px-2 py-0.25";
          return `${y} ${w}`;
        },
        u = () => {
          let y = e.isCollapsed;
          switch (t()) {
            case "top":
              return y ? "rotate-180" : "rotate-0";
            case "bottom":
              return y ? "rotate-0" : "rotate-180";
            case "left":
              return y ? "rotate-90" : "-rotate-90";
            case "right":
              return y ? "-rotate-90" : "rotate-90";
            default:
              return "rotate-0";
          }
        },
        f = () =>
          (() => {
            var y = fy();
            return (
              M(
                y,
                S(ms, {
                  size: 14,
                  get class() {
                    return de(
                      "transition-colors",
                      e.isActive ? "text-black" : "text-black/70",
                    );
                  },
                }),
              ),
              Y(
                (w) => {
                  var b = e.isActive
                      ? "Stop selecting element"
                      : "Select element",
                    g = !!e.isActive,
                    C = de(
                      "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                      s(),
                      c(),
                    );
                  return (
                    b !== w.e && ne(y, "aria-label", (w.e = b)),
                    g !== w.t && ne(y, "aria-pressed", (w.t = g)),
                    C !== w.a && we(y, (w.a = C)),
                    w
                  );
                },
                { e: void 0, t: void 0, a: void 0 },
              ),
              y
            );
          })(),
        m = () =>
          (() => {
            var y = my();
            return (
              M(
                y,
                S(ps, {
                  size: 14,
                  get class() {
                    return de(
                      "transition-colors",
                      e.isHistoryPinned ? "text-black/80" : "text-[#B3B3B3]",
                    );
                  },
                }),
              ),
              Y(() =>
                we(
                  y,
                  de(
                    "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                    s(),
                    c(),
                  ),
                ),
              ),
              y
            );
          })(),
        h = () =>
          (() => {
            var y = py();
            return (
              M(
                y,
                S(xo, { size: 14, class: "text-[#B3B3B3] transition-colors" }),
              ),
              Y(() =>
                we(
                  y,
                  de(
                    "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                    s(),
                    c(),
                  ),
                ),
              ),
              y
            );
          })(),
        v = () =>
          (() => {
            var y = gy();
            return (
              M(
                y,
                S(sr, {
                  size: 14,
                  get class() {
                    return de(
                      "transition-colors",
                      e.isMenuOpen ? "text-black/80" : "text-[#B3B3B3]",
                    );
                  },
                }),
              ),
              Y(
                (w) => {
                  var b = e.isMenuOpen
                      ? "Close more actions menu"
                      : "Open more actions menu",
                    g = de(
                      "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                      s(),
                      c(),
                    );
                  return (
                    b !== w.e && ne(y, "aria-label", (w.e = b)),
                    g !== w.t && we(y, (w.t = g)),
                    w
                  );
                },
                { e: void 0, t: void 0 },
              ),
              y
            );
          })(),
        H = () =>
          (() => {
            var y = hy(),
              w = y.firstChild,
              b = w.firstChild;
            return (
              Y(
                (g) => {
                  var C = e.enabled
                      ? "Disable React Grab"
                      : "Enable React Grab",
                    O = !!e.enabled,
                    V = de(
                      "contain-layout flex items-center justify-center cursor-pointer interactive-scale outline-none",
                      n() ? "my-0.5" : "mx-0.5",
                    ),
                    Q = de(
                      "relative rounded-full transition-colors",
                      n() ? "w-3.5 h-2.5" : "w-5 h-3",
                      e.enabled ? "bg-black" : "bg-black/25",
                    ),
                    X = de(
                      "absolute top-0.5 rounded-full bg-white transition-transform",
                      n() ? "w-1.5 h-1.5" : "w-2 h-2",
                      !e.enabled && "left-0.5",
                      e.enabled && (n() ? "left-1.5" : "left-2.5"),
                    );
                  return (
                    C !== g.e && ne(y, "aria-label", (g.e = C)),
                    O !== g.t && ne(y, "aria-pressed", (g.t = O)),
                    V !== g.a && we(y, (g.a = V)),
                    Q !== g.o && we(w, (g.o = Q)),
                    X !== g.i && we(b, (g.i = X)),
                    g
                  );
                },
                { e: void 0, t: void 0, a: void 0, o: void 0, i: void 0 },
              ),
              y
            );
          })(),
        F = () =>
          (() => {
            var y = by();
            return (
              Se(y, "click", e.onCollapseClick, true),
              M(
                y,
                S(wf, {
                  size: 14,
                  get class() {
                    return de(
                      "text-[#B3B3B3] transition-transform duration-150",
                      u(),
                    );
                  },
                }),
              ),
              Y(() =>
                ne(
                  y,
                  "aria-label",
                  e.isCollapsed ? "Expand toolbar" : "Collapse toolbar",
                ),
              ),
              y
            );
          })();
      return (() => {
        var y = yy(),
          w = y.firstChild,
          b = w.firstChild,
          g = b.firstChild,
          C = g.firstChild,
          O = C.firstChild,
          V = C.nextSibling,
          Q = V.firstChild,
          X = V.nextSibling,
          ee = X.firstChild,
          ye = X.nextSibling,
          ce = ye.firstChild,
          W = g.nextSibling;
        return (
          Se(y, "click", e.onPanelClick, true),
          Se(y, "animationend", e.onAnimationEnd),
          We((G) => e.onExpandableButtonsRef?.(G), g),
          M(O, () => e.selectButton ?? f()),
          M(Q, () => e.historyButton ?? m()),
          M(ee, () => e.copyAllButton ?? h()),
          M(ce, () => e.menuButton ?? v()),
          M(W, () => e.toggleButton ?? H()),
          M(y, () => e.collapseButton ?? F(), null),
          M(y, () => e.shakeTooltip, null),
          Y(
            (G) => {
              var A = de(
                  "flex items-center justify-center rounded-[10px] antialiased relative overflow-visible [font-synthesis:none] filter-[drop-shadow(0px_1px_2px_#51515140)] [corner-shape:superellipse(1.25)]",
                  n() && "flex-col",
                  ft,
                  !e.isCollapsed &&
                    (n() ? "px-1.5 gap-1.5 py-2" : "py-1.5 gap-1.5 px-2"),
                  l(),
                  e.isShaking && "animate-shake",
                ),
                I = e.transformOrigin,
                U = de("grid", r(), o(!e.isCollapsed, "pointer-events-none")),
                q = de(
                  "flex",
                  n()
                    ? "flex-col items-center min-h-0"
                    : "items-center min-w-0",
                ),
                x = de("flex items-center", n() && "flex-col"),
                T = de("grid", r(), o(!!e.enabled)),
                K = de("relative overflow-visible", i()),
                z = de(
                  "grid",
                  r(),
                  o(
                    !!e.enabled && !!e.isHistoryExpanded,
                    "pointer-events-none",
                  ),
                ),
                te = de("relative overflow-visible", i()),
                j = de(
                  "grid",
                  r(),
                  o(!!e.isCopyAllExpanded, "pointer-events-none"),
                ),
                Ee = de("relative overflow-visible", i()),
                ve = de(
                  "grid",
                  r(),
                  o(!!e.enabled && !!e.isMenuExpanded, "pointer-events-none"),
                ),
                N = de("relative overflow-visible", i());
              return (
                A !== G.e && we(y, (G.e = A)),
                I !== G.t && pe(y, "transform-origin", (G.t = I)),
                U !== G.a && we(w, (G.a = U)),
                q !== G.o && we(b, (G.o = q)),
                x !== G.i && we(g, (G.i = x)),
                T !== G.n && we(C, (G.n = T)),
                K !== G.s && we(O, (G.s = K)),
                z !== G.h && we(V, (G.h = z)),
                te !== G.r && we(Q, (G.r = te)),
                j !== G.d && we(X, (G.d = j)),
                Ee !== G.l && we(ee, (G.l = Ee)),
                ve !== G.u && we(ye, (G.u = ve)),
                N !== G.c && we(ce, (G.c = N)),
                G
              );
            },
            {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0,
              i: void 0,
              n: void 0,
              s: void 0,
              h: void 0,
              r: void 0,
              d: void 0,
              l: void 0,
              u: void 0,
              c: void 0,
            },
          ),
          y
        );
      })();
    };
  Qe(["click"]);
  var wy = D(
      "<div data-react-grab-ignore-events data-react-grab-toolbar style=z-index:2147483647>",
    ),
    xy = D(
      "<button data-react-grab-ignore-events data-react-grab-toolbar-toggle>",
    ),
    vy = D(
      '<span data-react-grab-unread-indicator class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#404040]">',
    ),
    Cy = D(
      '<button data-react-grab-ignore-events data-react-grab-toolbar-history aria-haspopup=menu><span class="inline-flex relative">',
    ),
    Ey = D(
      '<button data-react-grab-ignore-events data-react-grab-toolbar-copy-all aria-label="Copy all history items">',
    ),
    Sy = D(
      "<button data-react-grab-ignore-events data-react-grab-toolbar-menu aria-haspopup=menu>",
    ),
    Ay = D(
      "<button data-react-grab-ignore-events data-react-grab-toolbar-enabled><div><div>",
    ),
    Ty = D("<span>Click or<!>to capture"),
    _y = D("<span>to fine-tune target"),
    Py = D("<span>to cancel"),
    ky = D("<div style=z-index:2147483647>"),
    Oy = D("<div style=z-index:2147483647>Enable to continue"),
    vf = (e) => {
      let t,
        n,
        o = null,
        r = 0,
        s = 0,
        i = gs(),
        c = (k) => {
          if (!t) return null;
          let P = t.getRootNode().querySelector(k);
          if (!P) return null;
          let R = P.getBoundingClientRect();
          return {
            x: R.x - an,
            y: R.y - an,
            width: R.width + an * 2,
            height: R.height + an * 2,
          };
        },
        l = (...k) => {
          let Z = [];
          for (let P of k) {
            let R = c(P);
            R && Z.push(R);
          }
          return Z.length > 0 ? Z : null;
        },
        u = wo(),
        [f, m] = $(false),
        [h, v] = $(false),
        [H, F] = $(false),
        [y, w] = $(false),
        [b, g] = $(false),
        [C, O] = $(u?.edge ?? "bottom"),
        [V, Q] = $(u?.ratio ?? en),
        [X, ee] = $({ x: 0, y: 0 }),
        [ye, ce] = $({ x: 0, y: 0 }),
        [W, G] = $({ x: 0, y: 0 }),
        [A, I] = $(false),
        [U, q] = $(false),
        [x, T] = $(false),
        [K, z] = $(false),
        [te, j] = $(false),
        [Ee, ve] = $(false),
        [N, B] = $(false),
        [oe, ke] = $(false),
        [he, Pe] = $(false),
        [fe, Ce] = $(false),
        [$e, Ie] = $(false),
        be,
        [Ae, tt] = $(0),
        [ot, mt] = $(false),
        Rt = () => (e.clockFlashTrigger ?? 0) > 0;
      ge(
        He(
          () => [e.isActive, Rt()],
          ([k, Z]) => {
            if ((tt(0), mt(false), !k || Z)) return;
            let P = setInterval(() => {
              (ot() || mt(true), tt((R) => (R + 1) % uu));
            }, cu);
            _e(() => clearInterval(P));
          },
          { defer: true },
        ),
      );
      let _o = () => (e.toolbarActions ?? []).length > 0,
        ro = () => {
          let k = e.historyItemCount ?? 0;
          return k > 0 ? `History (${k})` : "History";
        },
        Mn = () =>
          de(
            "transition-colors",
            e.isHistoryPinned ? "text-black/80" : "text-[#B3B3B3]",
          ),
        xt = () => C() === "left" || C() === "right",
        tn = () => {
          if (!n) return;
          let k = n.getBoundingClientRect();
          xt() ? (s = k.height) : (r = k.width);
        },
        gt = () =>
          !h() &&
          !e.isHistoryDropdownOpen &&
          !e.isMenuOpen &&
          !e.isClearPromptOpen,
        nn = () => {
          switch (C()) {
            case "top":
              return "bottom";
            case "bottom":
              return "top";
            case "left":
              return "right";
            case "right":
              return "left";
          }
        },
        dn = () => Ts(xt()),
        fn = () => _s(xt()),
        st = () => {
          let k = nn();
          return xt()
            ? `top-1/2 -translate-y-1/2 ${k === "left" ? "right-full mr-0.5" : "left-full ml-0.5"}`
            : `left-1/2 -translate-x-1/2 ${k === "top" ? "bottom-full mb-0.5" : "top-full mt-0.5"}`;
        },
        ht = (k) => {
          k.stopImmediatePropagation();
        },
        zt = (k, Z) => ({
          onMouseEnter: () => {
            H() ||
              (i.stop(),
              k(true),
              Z?.shouldFreezeInteractions !== false &&
                !o &&
                ((o = ws()), vs(), As()),
              Z?.onHoverChange?.(true));
          },
          onMouseLeave: (P) => {
            (k(false),
              Z?.shouldFreezeInteractions !== false &&
                !e.isActive &&
                !e.isContextMenuOpen &&
                (o?.(), (o = null), ni(), ii()));
            let R = Z?.safePolygonTargets?.();
            if (R) {
              i.start({ x: P.clientX, y: P.clientY }, R, () =>
                Z?.onHoverChange?.(false),
              );
              return;
            }
            Z?.onHoverChange?.(false);
          },
        }),
        mn,
        on = () => {
          mn !== void 0 && (clearTimeout(mn), (mn = void 0));
        };
      (ge(
        He(
          () => e.shakeCount,
          (k) => {
            k &&
              !e.enabled &&
              (q(true),
              ve(true),
              on(),
              (mn = setTimeout(() => {
                ve(false);
              }, lu)),
              _e(() => {
                on();
              }));
          },
        ),
      ),
        ge(
          He(
            () => e.enabled,
            (k) => {
              k && Ee() && (ve(false), on());
            },
          ),
        ),
        ge(
          He(
            () => [e.isActive, e.isContextMenuOpen],
            ([k, Z]) => {
              !k && !Z && o && (o(), (o = null));
            },
          ),
        ));
      let mi = () => {
        if (!t) return;
        let k = t.getBoundingClientRect();
        Re = { width: k.width, height: k.height };
        let Z = X(),
          P = At(),
          R = C(),
          re = Z.x,
          se = Z.y;
        if (R === "top" || R === "bottom") {
          let Ne = P.offsetLeft + Te,
            Ue = Math.max(Ne, P.offsetLeft + P.width - k.width - Te);
          ((re = bt(Z.x, Ne, Ue)),
            (se =
              R === "top"
                ? P.offsetTop + Te
                : P.offsetTop + P.height - k.height - Te));
        } else {
          let Ne = P.offsetTop + Te,
            Ue = Math.max(Ne, P.offsetTop + P.height - k.height - Te);
          ((se = bt(Z.y, Ne, Ue)),
            (re =
              R === "left"
                ? P.offsetLeft + Te
                : P.offsetLeft + P.width - k.width - Te));
        }
        let me = In(R, re, se, k.width, k.height);
        (Q(me),
          (re !== Z.x || se !== Z.y) &&
            (T(true),
            Ve(() => {
              Ve(() => {
                (ee({ x: re, y: se }),
                  vt && clearTimeout(vt),
                  (vt = setTimeout(() => {
                    T(false);
                  }, vn)));
              });
            })));
      };
      (ge(
        He(
          () => e.clockFlashTrigger ?? 0,
          () => {
            if (e.isHistoryDropdownOpen) return;
            (be &&
              (be.classList.remove("animate-clock-flash"),
              be.offsetHeight,
              be.classList.add("animate-clock-flash")),
              Pe(true));
            let k = setTimeout(() => {
              (be?.classList.remove("animate-clock-flash"), Pe(false));
            }, 1500);
            _e(() => {
              (clearTimeout(k), Pe(false));
            });
          },
          { defer: true },
        ),
      ),
        ge(
          He(
            () => e.historyItemCount ?? 0,
            () => {
              h() ||
                (Gt && clearTimeout(Gt),
                (Gt = setTimeout(() => {
                  (tn(), mi());
                }, vn)),
                _e(() => {
                  Gt && clearTimeout(Gt);
                }));
            },
            { defer: true },
          ),
        ));
      let Nt = { x: 0, y: 0, time: 0 },
        Lt = { x: 0, y: 0 },
        Re = { width: su, height: au },
        [Po, ko] = $({ width: po, height: po }),
        bt = (k, Z, P) => Math.max(Z, Math.min(k, P)),
        At = () => {
          let k = window.visualViewport;
          return k
            ? {
                width: k.width,
                height: k.height,
                offsetLeft: k.offsetLeft,
                offsetTop: k.offsetTop,
              }
            : {
                width: window.innerWidth,
                height: window.innerHeight,
                offsetLeft: 0,
                offsetTop: 0,
              };
        },
        rn = (k, Z) => {
          let P = At(),
            R = P.width,
            re = P.height,
            { width: se, height: me } = Re,
            De = t?.getBoundingClientRect(),
            Ne = De?.width ?? po,
            Ue = De?.height ?? po,
            Ye;
          if (Z === "top" || Z === "bottom") {
            let Le = (se - Ne) / 2,
              Tt = k.x - Le,
              Ot = bt(Tt, P.offsetLeft + Te, P.offsetLeft + R - se - Te),
              Ft = Z === "top" ? P.offsetTop + Te : P.offsetTop + re - me - Te;
            Ye = { x: Ot, y: Ft };
          } else {
            let Le = (me - Ue) / 2,
              Tt = k.y - Le,
              Ot = bt(Tt, P.offsetTop + Te, P.offsetTop + re - me - Te);
            Ye = {
              x: Z === "left" ? P.offsetLeft + Te : P.offsetLeft + R - se - Te,
              y: Ot,
            };
          }
          let dt = In(Z, Ye.x, Ye.y, se, me);
          return { position: Ye, ratio: dt };
        },
        io = (k, Z, P, R) => {
          let re = At(),
            se = re.width,
            me = re.height,
            De = re.offsetLeft + Te,
            Ne = Math.max(De, re.offsetLeft + se - P - Te),
            Ue = re.offsetTop + Te,
            Ye = Math.max(Ue, re.offsetTop + me - R - Te);
          if (k === "top" || k === "bottom") {
            let Ot = Math.max(0, se - P - Te * 2);
            return {
              x: Math.min(Ne, Math.max(De, re.offsetLeft + Te + Ot * Z)),
              y: k === "top" ? Ue : Ye,
            };
          }
          let dt = Math.max(0, me - R - Te * 2),
            Le = Math.min(Ye, Math.max(Ue, re.offsetTop + Te + dt * Z));
          return { x: k === "left" ? De : Ne, y: Le };
        },
        In = (k, Z, P, R, re) => {
          let se = At(),
            me = se.width,
            De = se.height;
          if (k === "top" || k === "bottom") {
            let Ue = me - R - Te * 2;
            return Ue <= 0
              ? en
              : Math.max(0, Math.min(1, (Z - se.offsetLeft - Te) / Ue));
          }
          let Ne = De - re - Te * 2;
          return Ne <= 0
            ? en
            : Math.max(0, Math.min(1, (P - se.offsetTop - Te) / Ne));
        },
        pi = () => {
          let k = io(C(), V(), Re.width, Re.height);
          ee(k);
        },
        so = false,
        sn = (k) => (Z) => {
          if ((Z.stopImmediatePropagation(), so)) {
            so = false;
            return;
          }
          k();
        },
        gi = sn(() => e.onToggle?.()),
        Oo = sn(() => e.onToggleHistory?.()),
        hi = sn(() => e.onCopyAll?.()),
        Rn = sn(() => e.onToggleMenu?.()),
        bi = sn(() => {
          let k = t?.getBoundingClientRect(),
            Z = h(),
            P = V();
          if (Z) {
            let { position: R, ratio: re } = rn(ao(), C());
            ((P = re), ee(R), Q(P));
          } else k && (Re = { width: k.width, height: k.height });
          (T(true),
            v((R) => !R),
            Ut({
              edge: C(),
              ratio: P,
              collapsed: !Z,
              enabled: e.enabled ?? true,
            }),
            vt && clearTimeout(vt),
            (vt = setTimeout(() => {
              if ((T(false), h())) {
                let R = t?.getBoundingClientRect();
                R && ko({ width: R.width, height: R.height });
              }
            }, vn)));
        }),
        Gs = sn(() => {
          let k = !!e.enabled,
            Z = C(),
            P = X(),
            R = Z === "left" || Z === "right",
            re = () => (R ? s : r);
          k && n && !N() && tn();
          let se = re(),
            me = se > 0,
            De = 0;
          if (n) {
            let Ne = n.getBoundingClientRect();
            De = R ? Ne.height : Ne.width;
          }
          if (!k && se === 0 && n) {
            let Ne = (e.historyItemCount ?? 0) > 0,
              Ue = _o(),
              Ye = Array.from(n.children).filter((Le) =>
                Le instanceof HTMLElement
                  ? Le.querySelector("[data-react-grab-toolbar-history]")
                    ? Ne
                    : Le.querySelector("[data-react-grab-toolbar-copy-all]")
                      ? !!e.isHistoryDropdownOpen
                      : Le.querySelector("[data-react-grab-toolbar-menu]")
                        ? Ue
                        : true
                  : false,
              ),
              dt = R ? "gridTemplateRows" : "gridTemplateColumns";
            for (let Le of Ye)
              ((Le.style.transition = "none"), (Le.style[dt] = "1fr"));
            (n.offsetWidth, tn(), (se = re()));
            for (let Le of Ye) Le.style[dt] = "";
            n.offsetWidth;
            for (let Le of Ye) Le.style.transition = "";
            me = se > 0;
          }
          if ((me && (ke(N()), B(true)), e.onToggleEnabled?.(), me)) {
            let Ne = k ? -se : se;
            R
              ? (Re = { width: Re.width, height: Re.height + Ne })
              : (Re = { width: Re.width + Ne, height: Re.height });
            let Ue = R ? P.y + De : P.x + De,
              Ye = (dt) => {
                let Le = At(),
                  Tt = Ue - dt;
                if (R) {
                  let vi = Le.offsetTop + Te,
                    js = Le.offsetTop + Le.height - Re.height - Te;
                  return { x: P.x, y: bt(Tt, vi, js) };
                }
                let Ot = Le.offsetLeft + Te,
                  Ft = Le.offsetLeft + Le.width - Re.width - Te;
                return { x: bt(Tt, Ot, Ft), y: P.y };
              };
            if ((Dt !== void 0 && Ge(Dt), oe()))
              (ee(Ye(k ? 0 : se)), (Dt = void 0));
            else {
              let dt = performance.now(),
                Le = () => {
                  if (performance.now() - dt > vn + iu) {
                    Dt = void 0;
                    return;
                  }
                  if (n) {
                    let Ot = R
                      ? n.getBoundingClientRect().height
                      : n.getBoundingClientRect().width;
                    ee(Ye(Ot));
                  }
                  Dt = Ve(Le);
                };
              Dt = Ve(Le);
            }
            (clearTimeout(Ln),
              (Ln = setTimeout(() => {
                (Dt !== void 0 && (Ge(Dt), (Dt = void 0)),
                  ee(Ye(k ? 0 : se)),
                  B(false),
                  ke(false));
                let Le = In(Z, X().x, X().y, Re.width, Re.height);
                (Q(Le),
                  Ut({ edge: Z, ratio: Le, collapsed: h(), enabled: !k }));
              }, vn)));
          } else Ut({ edge: Z, ratio: V(), collapsed: h(), enabled: !k });
        }),
        Mo = (k, Z, P, R, re, se) => {
          let me = At(),
            De = me.width,
            Ne = me.height,
            Ue = k + re * wa,
            Ye = Z + se * wa,
            dt = Ye - me.offsetTop + R / 2,
            Le = me.offsetTop + Ne - Ye - R / 2,
            Tt = Ue - me.offsetLeft + P / 2,
            Ot = me.offsetLeft + De - Ue - P / 2,
            Ft = Math.min(dt, Le, Tt, Ot);
          return Ft === dt
            ? {
                edge: "top",
                x: Math.max(
                  me.offsetLeft + Te,
                  Math.min(Ue, me.offsetLeft + De - P - Te),
                ),
                y: me.offsetTop + Te,
              }
            : Ft === Tt
              ? {
                  edge: "left",
                  x: me.offsetLeft + Te,
                  y: Math.max(
                    me.offsetTop + Te,
                    Math.min(Ye, me.offsetTop + Ne - R - Te),
                  ),
                }
              : Ft === Ot
                ? {
                    edge: "right",
                    x: me.offsetLeft + De - P - Te,
                    y: Math.max(
                      me.offsetTop + Te,
                      Math.min(Ye, me.offsetTop + Ne - R - Te),
                    ),
                  }
                : {
                    edge: "bottom",
                    x: Math.max(
                      me.offsetLeft + Te,
                      Math.min(Ue, me.offsetLeft + De - P - Te),
                    ),
                    y: me.offsetTop + Ne - R - Te,
                  };
        },
        Nn = (k) => {
          if (
            !H() ||
            (Math.sqrt(
              Math.pow(k.clientX - Lt.x, 2) + Math.pow(k.clientY - Lt.y, 2),
            ) > ru && (I(true), o && (o(), (o = null), ni(), ii())),
            !A())
          )
            return;
          let P = performance.now(),
            R = P - Nt.time;
          if (R > 0) {
            let me = (k.clientX - Nt.x) / R,
              De = (k.clientY - Nt.y) / R;
            G({ x: me, y: De });
          }
          Nt = { x: k.clientX, y: k.clientY, time: P };
          let re = k.clientX - ye().x,
            se = k.clientY - ye().y;
          ee({ x: re, y: se });
        },
        Vt = () => {
          if (!H()) return;
          (window.removeEventListener("pointermove", Nn),
            window.removeEventListener("pointerup", Vt));
          let k = A();
          if ((F(false), !k)) return;
          so = true;
          let Z = t?.getBoundingClientRect();
          if (!Z) return;
          let P = W(),
            R = Mo(X().x, X().y, Z.width, Z.height, P.x, P.y),
            re = In(R.edge, R.x, R.y, Z.width, Z.height);
          (O(R.edge),
            Q(re),
            w(true),
            Ve(() => {
              let se = t?.getBoundingClientRect();
              (se && (Re = { width: se.width, height: se.height }),
                Ve(() => {
                  let me = io(R.edge, re, Re.width, Re.height);
                  (ee(me),
                    Ut({
                      edge: R.edge,
                      ratio: re,
                      collapsed: h(),
                      enabled: e.enabled ?? true,
                    }),
                    (yi = setTimeout(() => {
                      (w(false), e.enabled && tn());
                    }, ou)));
                }));
            }));
        },
        pt = (k) => {
          if (h()) return;
          let Z = t?.getBoundingClientRect();
          Z &&
            ((Lt = { x: k.clientX, y: k.clientY }),
            ce({ x: k.clientX - Z.left, y: k.clientY - Z.top }),
            F(true),
            I(false),
            G({ x: 0, y: 0 }),
            (Nt = { x: k.clientX, y: k.clientY, time: performance.now() }),
            window.addEventListener("pointermove", Nn),
            window.addEventListener("pointerup", Vt));
        },
        Io = () => {
          let k = C(),
            Z = X(),
            { width: P, height: R } = Re,
            { width: re, height: se } = Po(),
            me = At();
          switch (k) {
            case "top":
            case "bottom": {
              let De = (P - re) / 2,
                Ne = Z.x + De;
              return {
                x: bt(Ne, me.offsetLeft, me.offsetLeft + me.width - re),
                y: k === "top" ? me.offsetTop : me.offsetTop + me.height - se,
              };
            }
            case "left":
            case "right": {
              let De = (R - se) / 2,
                Ne = Z.y + De,
                Ue = bt(Ne, me.offsetTop, me.offsetTop + me.height - se);
              return {
                x: k === "left" ? me.offsetLeft : me.offsetLeft + me.width - re,
                y: Ue,
              };
            }
            default:
              return Z;
          }
        },
        pn,
        vt,
        yi,
        Ln,
        Dt,
        Gt,
        gn = () => {
          H() ||
            (g(true),
            pi(),
            pn && clearTimeout(pn),
            (pn = setTimeout(() => {
              g(false);
              let k = In(C(), X().x, X().y, Re.width, Re.height);
              (Q(k),
                Ut({
                  edge: C(),
                  ratio: k,
                  collapsed: h(),
                  enabled: e.enabled ?? true,
                }));
            }, ya)));
        },
        Ut = (k) => {
          (Yr(k), e.onStateChange?.(k));
        };
      (lt(() => {
        t && e.onContainerRef?.(t);
        let k = t?.getBoundingClientRect(),
          Z = At();
        if (u) {
          if ((k && (Re = { width: k.width, height: k.height }), u.collapsed)) {
            let re = u.edge === "top" || u.edge === "bottom";
            ko({ width: re ? xa : po, height: re ? po : xa });
          }
          v(u.collapsed);
          let R = io(u.edge, u.ratio, Re.width, Re.height);
          ee(R);
        } else if (k)
          ((Re = { width: k.width, height: k.height }),
            ee({
              x: Z.offsetLeft + (Z.width - k.width) / 2,
              y: Z.offsetTop + Z.height - k.height - Te,
            }),
            Q(en));
        else {
          let R = io("bottom", en, Re.width, Re.height);
          ee(R);
        }
        if ((e.enabled && tn(), e.onSubscribeToStateChanges)) {
          let R = e.onSubscribeToStateChanges((re) => {
            if (x() || N() || !t?.getBoundingClientRect()) return;
            let me = h() !== re.collapsed;
            if ((O(re.edge), me && !re.collapsed)) {
              let De = ao();
              (T(true), v(re.collapsed));
              let { position: Ne, ratio: Ue } = rn(De, re.edge);
              (ee(Ne),
                Q(Ue),
                clearTimeout(vt),
                (vt = setTimeout(() => {
                  T(false);
                }, vn)));
            } else {
              (me &&
                (T(true),
                clearTimeout(vt),
                (vt = setTimeout(() => {
                  T(false);
                }, vn))),
                v(re.collapsed));
              let De = io(re.edge, re.ratio, Re.width, Re.height);
              (ee(De), Q(re.ratio));
            }
          });
          _e(R);
        }
        (window.addEventListener("resize", gn),
          window.visualViewport?.addEventListener("resize", gn),
          window.visualViewport?.addEventListener("scroll", gn));
        let P = setTimeout(() => {
          m(true);
        }, ya);
        _e(() => {
          clearTimeout(P);
        });
      }),
        _e(() => {
          (window.removeEventListener("resize", gn),
            window.visualViewport?.removeEventListener("resize", gn),
            window.visualViewport?.removeEventListener("scroll", gn),
            window.removeEventListener("pointermove", Nn),
            window.removeEventListener("pointerup", Vt),
            clearTimeout(pn),
            clearTimeout(vt),
            on(),
            clearTimeout(yi),
            clearTimeout(Ln),
            clearTimeout(Gt),
            Dt !== void 0 && Ge(Dt),
            o?.(),
            i.stop());
        }));
      let ao = () => (h() ? Io() : X()),
        Us = () =>
          h() ? "cursor-pointer" : H() ? "cursor-grabbing" : "cursor-grab",
        wi = () =>
          b()
            ? ""
            : y()
              ? "transition-[transform,opacity] duration-300 ease-out"
              : x()
                ? "transition-[transform,opacity] duration-150 ease-out"
                : N()
                  ? "transition-opacity duration-150 ease-out"
                  : "transition-opacity duration-300 ease-out",
        xi = () => {
          switch (C()) {
            case "top":
              return "center top";
            case "bottom":
              return "center bottom";
            case "left":
              return "left center";
            case "right":
              return "right center";
            default:
              return "center center";
          }
        };
      return (() => {
        var k = wy();
        (k.addEventListener("mouseleave", () => e.onSelectHoverChange?.(false)),
          k.addEventListener(
            "mouseenter",
            () => !h() && e.onSelectHoverChange?.(true),
          ),
          (k.$$pointerdown = pt));
        var Z = t;
        return (
          typeof Z == "function" ? We(Z, k) : (t = k),
          M(
            k,
            S(xf, {
              get isActive() {
                return e.isActive;
              },
              get enabled() {
                return e.enabled;
              },
              get isCollapsed() {
                return h();
              },
              get snapEdge() {
                return C();
              },
              get isShaking() {
                return U();
              },
              get isHistoryExpanded() {
                return (e.historyItemCount ?? 0) > 0;
              },
              get isCopyAllExpanded() {
                return !!e.isHistoryDropdownOpen;
              },
              get isMenuExpanded() {
                return _o();
              },
              get isMenuOpen() {
                return e.isMenuOpen;
              },
              get isHistoryPinned() {
                return e.isHistoryPinned;
              },
              get disableGridTransitions() {
                return oe();
              },
              get transformOrigin() {
                return xi();
              },
              onAnimationEnd: () => q(false),
              onCollapseClick: bi,
              onExpandableButtonsRef: (P) => {
                n = P;
              },
              onPanelClick: (P) => {
                if (h()) {
                  P.stopPropagation();
                  let { position: R, ratio: re } = rn(ao(), C());
                  (ee(R),
                    Q(re),
                    T(true),
                    v(false),
                    Ut({
                      edge: C(),
                      ratio: re,
                      collapsed: false,
                      enabled: e.enabled ?? true,
                    }),
                    vt && clearTimeout(vt),
                    (vt = setTimeout(() => {
                      T(false);
                    }, vn)));
                }
              },
              get selectButton() {
                return [
                  (() => {
                    var P = xy();
                    return (
                      (P.$$click = (R) => {
                        (z(false), gi(R));
                      }),
                      Se(P, "mousedown", ht),
                      Se(P, "pointerdown", (R) => {
                        (ht(R), pt(R));
                      }),
                      _r(
                        P,
                        $o(
                          {
                            get "aria-label"() {
                              return e.isActive
                                ? "Stop selecting element"
                                : "Select element";
                            },
                            get "aria-pressed"() {
                              return !!e.isActive;
                            },
                            get class() {
                              return de(
                                "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                                dn(),
                                fn(),
                              );
                            },
                          },
                          () => zt(z),
                        ),
                        false,
                      ),
                      M(
                        P,
                        S(ms, {
                          size: 14,
                          get class() {
                            return de(
                              "transition-colors",
                              e.isActive ? "text-black" : "text-black/70",
                            );
                          },
                        }),
                      ),
                      P
                    );
                  })(),
                  S(On, {
                    get visible() {
                      return Be(() => !!K())() && gt();
                    },
                    get position() {
                      return nn();
                    },
                    get children() {
                      return [
                        "Select element ",
                        S(fr, {
                          get children() {
                            return qn("C");
                          },
                        }),
                      ];
                    },
                  }),
                ];
              },
              get historyButton() {
                return [
                  (() => {
                    var P = Cy(),
                      R = P.firstChild;
                    ((P.$$click = (se) => {
                      (Pe(false), Oo(se));
                    }),
                      Se(P, "mousedown", ht),
                      Se(P, "pointerdown", (se) => {
                        (ht(se), pt(se));
                      }),
                      _r(
                        P,
                        $o(
                          {
                            get "aria-label"() {
                              return `Open history${(e.historyItemCount ?? 0) > 0 ? ` (${e.historyItemCount ?? 0} items)` : ""}`;
                            },
                            get "aria-expanded"() {
                              return !!e.isHistoryDropdownOpen;
                            },
                            get class() {
                              return de(
                                "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                                dn(),
                                fn(),
                              );
                            },
                          },
                          () =>
                            zt(
                              (se) => {
                                (se && e.isHistoryDropdownOpen) || Pe(se);
                              },
                              {
                                onHoverChange: (se) =>
                                  e.onHistoryButtonHover?.(se),
                                shouldFreezeInteractions: false,
                                safePolygonTargets: () =>
                                  e.isHistoryDropdownOpen
                                    ? l(
                                        "[data-react-grab-history-dropdown]",
                                        "[data-react-grab-toolbar-copy-all]",
                                      )
                                    : null,
                              },
                            ),
                        ),
                        false,
                      ));
                    var re = be;
                    return (
                      typeof re == "function" ? We(re, R) : (be = R),
                      M(
                        R,
                        S(ps, {
                          size: 14,
                          get class() {
                            return Mn();
                          },
                        }),
                        null,
                      ),
                      M(
                        R,
                        S(ue, {
                          get when() {
                            return e.hasUnreadHistoryItems;
                          },
                          get children() {
                            return vy();
                          },
                        }),
                        null,
                      ),
                      P
                    );
                  })(),
                  S(On, {
                    get visible() {
                      return Be(() => !!he())() && gt();
                    },
                    get position() {
                      return nn();
                    },
                    get children() {
                      return ro();
                    },
                  }),
                ];
              },
              get copyAllButton() {
                return [
                  (() => {
                    var P = Ey();
                    return (
                      (P.$$click = (R) => {
                        (Ie(false), hi(R));
                      }),
                      Se(P, "mousedown", ht),
                      Se(P, "pointerdown", (R) => {
                        (ht(R), pt(R));
                      }),
                      _r(
                        P,
                        $o(
                          {
                            get class() {
                              return de(
                                "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                                dn(),
                                fn(),
                              );
                            },
                          },
                          () =>
                            zt(Ie, {
                              onHoverChange: (R) => e.onCopyAllHover?.(R),
                              shouldFreezeInteractions: false,
                              safePolygonTargets: () =>
                                e.isHistoryDropdownOpen
                                  ? l(
                                      "[data-react-grab-history-dropdown]",
                                      "[data-react-grab-toolbar-history]",
                                    )
                                  : null,
                            }),
                        ),
                        false,
                      ),
                      M(
                        P,
                        S(xo, {
                          size: 14,
                          class: "text-[#B3B3B3] transition-colors",
                        }),
                      ),
                      P
                    );
                  })(),
                  S(On, {
                    get visible() {
                      return Be(() => !!$e())() && gt();
                    },
                    get position() {
                      return nn();
                    },
                    children: "Copy all",
                  }),
                ];
              },
              get menuButton() {
                return [
                  (() => {
                    var P = Sy();
                    return (
                      (P.$$click = (R) => {
                        (Ce(false), Rn(R));
                      }),
                      Se(P, "mousedown", ht),
                      Se(P, "pointerdown", (R) => {
                        (ht(R), pt(R));
                      }),
                      _r(
                        P,
                        $o(
                          {
                            get "aria-label"() {
                              return e.isMenuOpen
                                ? "Close more actions menu"
                                : "Open more actions menu";
                            },
                            get "aria-expanded"() {
                              return !!e.isMenuOpen;
                            },
                            get class() {
                              return de(
                                "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                                dn(),
                                fn(),
                              );
                            },
                          },
                          () =>
                            zt(
                              (R) => {
                                (R && e.isMenuOpen) || Ce(R);
                              },
                              { shouldFreezeInteractions: false },
                            ),
                        ),
                        false,
                      ),
                      M(
                        P,
                        S(sr, {
                          size: 14,
                          get class() {
                            return de(
                              "transition-colors",
                              e.isMenuOpen ? "text-black/80" : "text-[#B3B3B3]",
                            );
                          },
                        }),
                      ),
                      P
                    );
                  })(),
                  S(On, {
                    get visible() {
                      return Be(() => !!fe())() && gt();
                    },
                    get position() {
                      return nn();
                    },
                    children: "More actions",
                  }),
                ];
              },
              get toggleButton() {
                return [
                  (() => {
                    var P = Ay(),
                      R = P.firstChild,
                      re = R.firstChild;
                    return (
                      P.addEventListener("mouseleave", () => j(false)),
                      P.addEventListener("mouseenter", () => j(true)),
                      (P.$$click = (se) => {
                        (j(false), Gs(se));
                      }),
                      Y(
                        (se) => {
                          var me = e.enabled
                              ? "Disable React Grab"
                              : "Enable React Grab",
                            De = !!e.enabled,
                            Ne = de(
                              "contain-layout flex items-center justify-center cursor-pointer interactive-scale outline-none",
                              xt() ? "my-0.5" : "mx-0.5",
                            ),
                            Ue = de(
                              "relative rounded-full transition-colors",
                              xt() ? "w-3.5 h-2.5" : "w-5 h-3",
                              e.enabled ? "bg-black" : "bg-black/25",
                            ),
                            Ye = de(
                              "absolute top-0.5 rounded-full bg-white transition-transform",
                              xt() ? "w-1.5 h-1.5" : "w-2 h-2",
                              !e.enabled && "left-0.5",
                              e.enabled && (xt() ? "left-1.5" : "left-2.5"),
                            );
                          return (
                            me !== se.e && ne(P, "aria-label", (se.e = me)),
                            De !== se.t && ne(P, "aria-pressed", (se.t = De)),
                            Ne !== se.a && we(P, (se.a = Ne)),
                            Ue !== se.o && we(R, (se.o = Ue)),
                            Ye !== se.i && we(re, (se.i = Ye)),
                            se
                          );
                        },
                        {
                          e: void 0,
                          t: void 0,
                          a: void 0,
                          o: void 0,
                          i: void 0,
                        },
                      ),
                      P
                    );
                  })(),
                  S(On, {
                    get visible() {
                      return Be(() => !!te())() && gt();
                    },
                    get position() {
                      return nn();
                    },
                    get children() {
                      return e.enabled ? "Disable" : "Enable";
                    },
                  }),
                ];
              },
              get shakeTooltip() {
                return [
                  S(ue, {
                    get when() {
                      return Be(() => !!e.isActive)() && !Rt();
                    },
                    get children() {
                      var P = ky();
                      return (
                        M(
                          P,
                          S(ue, {
                            get when() {
                              return Ae() === 0;
                            },
                            get children() {
                              var R = Ty(),
                                re = R.firstChild,
                                se = re.nextSibling;
                              se.nextSibling;
                              return (
                                M(R, S(fr, { children: "\u21B5" }), se),
                                Y(() =>
                                  we(
                                    R,
                                    de("flex items-center gap-1", ot() && Wi),
                                  ),
                                ),
                                R
                              );
                            },
                          }),
                          null,
                        ),
                        M(
                          P,
                          S(ue, {
                            get when() {
                              return Ae() === 1;
                            },
                            get children() {
                              var R = _y(),
                                re = R.firstChild;
                              return (
                                M(R, S(fr, { children: "\u2191" }), re),
                                M(R, S(fr, { children: "\u2193" }), re),
                                Y(() =>
                                  we(R, de("flex items-center gap-1", Wi)),
                                ),
                                R
                              );
                            },
                          }),
                          null,
                        ),
                        M(
                          P,
                          S(ue, {
                            get when() {
                              return Ae() === 2;
                            },
                            get children() {
                              var R = Py(),
                                re = R.firstChild;
                              return (
                                M(R, S(fr, { children: "esc" }), re),
                                Y(() =>
                                  we(R, de("flex items-center gap-1", Wi)),
                                ),
                                R
                              );
                            },
                          }),
                          null,
                        ),
                        Y(() =>
                          we(
                            P,
                            de(
                              "absolute whitespace-nowrap flex items-center gap-1 px-1.5 py-0.5 rounded-[10px] text-[10px] text-black/60 pointer-events-none animate-tooltip-fade-in [animation-fill-mode:backwards] overflow-hidden [corner-shape:superellipse(1.25)]",
                              ft,
                              st(),
                            ),
                          ),
                        ),
                        P
                      );
                    },
                  }),
                  S(ue, {
                    get when() {
                      return Ee();
                    },
                    get children() {
                      var P = Oy();
                      return (
                        Y(() =>
                          we(
                            P,
                            de(
                              "absolute whitespace-nowrap px-1.5 py-0.5 rounded-[10px] text-[10px] text-black/60 pointer-events-none animate-tooltip-fade-in [corner-shape:superellipse(1.25)]",
                              ft,
                              st(),
                            ),
                          ),
                        ),
                        P
                      );
                    },
                  }),
                ];
              },
            }),
          ),
          Y(
            (P) => {
              var R = de(
                  "fixed left-0 top-0 font-sans text-[13px] antialiased select-none",
                  Us(),
                  wi(),
                  f()
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-0 pointer-events-none",
                ),
                re = `translate(${ao().x}px, ${ao().y}px)`,
                se = xi();
              return (
                R !== P.e && we(k, (P.e = R)),
                re !== P.t && pe(k, "transform", (P.t = re)),
                se !== P.a && pe(k, "transform-origin", (P.a = se)),
                P
              );
            },
            { e: void 0, t: void 0, a: void 0 },
          ),
          k
        );
      })();
    };
  Qe(["pointerdown", "click"]);
  var vl = (e, t, n, o) => Math.max(o, Math.min(e, n - t - o));
  var mr = ({
    anchor: e,
    measuredWidth: t,
    measuredHeight: n,
    viewportWidth: o,
    viewportHeight: r,
    anchorGapPx: s,
    viewportPaddingPx: i,
    offscreenPosition: c,
  }) => {
    if (!e || t === 0 || n === 0) return c;
    let l, u;
    return (
      e.edge === "left" || e.edge === "right"
        ? ((l = e.edge === "left" ? e.x + s : e.x - t - s), (u = e.y - n / 2))
        : ((l = e.x - t / 2), (u = e.edge === "top" ? e.y + s : e.y - n - s)),
      { left: vl(l, t, o, i), top: vl(u, n, r, i) }
    );
  };
  var kt = (e, t) => {
    try {
      return e
        .composedPath()
        .some((n) => n instanceof HTMLElement && n.hasAttribute(t));
    } catch {
      return false;
    }
  };
  var si = (e, t) =>
      typeof e.enabled == "function"
        ? t
          ? e.enabled(t)
          : false
        : (e.enabled ?? true),
    ai = (e) =>
      typeof e.enabled == "function" ? e.enabled() : (e.enabled ?? true);
  var ut = (e) => {
    (e.type === "contextmenu" && e.preventDefault(),
      e.stopImmediatePropagation());
  };
  var My = D(
      '<div data-react-grab-ignore-events data-react-grab-toolbar-menu class="fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none transition-[opacity,transform] duration-100 ease-out will-change-[opacity,transform]"style=z-index:2147483647><div><div class="relative flex flex-col py-1"><div class="pointer-events-none absolute bg-black/5 opacity-0 transition-[top,left,width,height,opacity] duration-75 ease-out">',
    ),
    Iy = D("<div><div>"),
    Ry = D(
      '<button data-react-grab-ignore-events class="relative z-1 contain-layout flex items-center justify-between w-full px-2 py-1 cursor-pointer text-left border-none bg-transparent disabled:opacity-40 disabled:cursor-default"><span class="text-[13px] leading-4 font-sans font-medium text-black">',
    ),
    Ny = D('<span class="text-[11px] font-sans text-black/50 ml-4">'),
    Cf = (e) => {
      let t,
        {
          containerRef: n,
          highlightRef: o,
          updateHighlight: r,
          clearHighlight: s,
        } = Zn(),
        [i, c] = $(0),
        [l, u] = $(0),
        [f, m] = $(false),
        [h, v] = $(false),
        [H, F] = $("bottom"),
        [y, w] = $(0),
        b,
        g,
        C = () => {
          (clearTimeout(b), g !== void 0 && (Ge(g), (g = void 0)));
        },
        O = () => {
          t && (c(t.offsetWidth), u(t.offsetHeight));
        };
      ge(() => {
        let X = e.position;
        (X
          ? (F(X.edge),
            clearTimeout(b),
            m(true),
            g !== void 0 && Ge(g),
            (g = Ve(() => {
              (O(), t?.offsetHeight, v(true));
            })))
          : (g !== void 0 && Ge(g),
            v(false),
            (b = setTimeout(() => {
              m(false);
            }, Xo))),
          _e(() => {
            C();
          }));
      });
      let V = ie((X) => {
          let ee = mr({
            anchor: e.position,
            measuredWidth: i(),
            measuredHeight: l(),
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            anchorGapPx: Yo,
            viewportPaddingPx: zn,
            offscreenPosition: Wt,
          });
          return ee.left !== Wt.left ? ee : X;
        }, Wt),
        Q = (X, ee) => {
          (ee.stopPropagation(),
            ai(X) &&
              (X.onAction(),
              X.isActive !== void 0 ? w((ye) => ye + 1) : e.onDismiss()));
        };
      return (
        lt(() => {
          O();
          let X = (ce) => {
              !e.position ||
                kt(ce, "data-react-grab-ignore-events") ||
                e.onDismiss();
            },
            ee = (ce) => {
              e.position &&
                ce.code === "Escape" &&
                (ce.preventDefault(), ce.stopPropagation(), e.onDismiss());
            },
            ye = Ve(() => {
              (window.addEventListener("mousedown", X, { capture: true }),
                window.addEventListener("touchstart", X, { capture: true }));
            });
          (window.addEventListener("keydown", ee, { capture: true }),
            _e(() => {
              (Ge(ye),
                C(),
                window.removeEventListener("mousedown", X, { capture: true }),
                window.removeEventListener("touchstart", X, { capture: true }),
                window.removeEventListener("keydown", ee, { capture: true }));
            }));
        }),
        S(ue, {
          get when() {
            return f();
          },
          get children() {
            var X = My(),
              ee = X.firstChild,
              ye = ee.firstChild,
              ce = ye.firstChild;
            (Se(X, "contextmenu", ut, true),
              Se(X, "click", ut, true),
              Se(X, "mousedown", ut, true),
              Se(X, "pointerdown", ut, true));
            var W = t;
            return (
              typeof W == "function" ? We(W, X) : (t = X),
              pe(ee, "min-width", `${Eu}px`),
              We(n, ye),
              We(o, ce),
              M(
                ye,
                S(Jt, {
                  get each() {
                    return e.actions;
                  },
                  children: (G) => {
                    let A = () => ai(G),
                      I = () => G.isActive !== void 0,
                      U = () => (y(), !!G.isActive?.());
                    return (() => {
                      var q = Ry(),
                        x = q.firstChild;
                      return (
                        (q.$$click = (T) => Q(G, T)),
                        Se(q, "pointerleave", s),
                        q.addEventListener("pointerenter", (T) => {
                          A() && r(T.currentTarget);
                        }),
                        (q.$$pointerdown = (T) => T.stopPropagation()),
                        M(x, () => G.label),
                        M(
                          q,
                          S(ue, {
                            get when() {
                              return Be(() => !I())() && G.shortcut;
                            },
                            children: (T) =>
                              (() => {
                                var K = Ny();
                                return (M(K, () => qn(T())), K);
                              })(),
                          }),
                          null,
                        ),
                        M(
                          q,
                          S(ue, {
                            get when() {
                              return I();
                            },
                            get children() {
                              var T = Iy(),
                                K = T.firstChild;
                              return (
                                Y(
                                  (z) => {
                                    var te = de(
                                        "relative rounded-full transition-colors ml-4 shrink-0 w-5 h-3",
                                        U() ? "bg-black" : "bg-black/25",
                                      ),
                                      j = de(
                                        "absolute top-0.5 rounded-full bg-white transition-transform w-2 h-2",
                                        U() ? "left-2.5" : "left-0.5",
                                      );
                                    return (
                                      te !== z.e && we(T, (z.e = te)),
                                      j !== z.t && we(K, (z.t = j)),
                                      z
                                    );
                                  },
                                  { e: void 0, t: void 0 },
                                ),
                                T
                              );
                            },
                          }),
                          null,
                        ),
                        Y(
                          (T) => {
                            var K = G.id,
                              z = !A();
                            return (
                              K !== T.e &&
                                ne(q, "data-react-grab-menu-item", (T.e = K)),
                              z !== T.t && (q.disabled = T.t = z),
                              T
                            );
                          },
                          { e: void 0, t: void 0 },
                        ),
                        q
                      );
                    })();
                  },
                }),
                null,
              ),
              Y(
                (G) => {
                  var A = `${V().top}px`,
                    I = `${V().left}px`,
                    U = h() ? "auto" : "none",
                    q = qo[H()],
                    x = h() ? "1" : "0",
                    T = h() ? "scale(1)" : "scale(0.95)",
                    K = de(
                      "contain-layout flex flex-col rounded-[10px] antialiased w-fit h-fit overflow-hidden [font-synthesis:none] [corner-shape:superellipse(1.25)]",
                      ft,
                    );
                  return (
                    A !== G.e && pe(X, "top", (G.e = A)),
                    I !== G.t && pe(X, "left", (G.t = I)),
                    U !== G.a && pe(X, "pointer-events", (G.a = U)),
                    q !== G.o && pe(X, "transform-origin", (G.o = q)),
                    x !== G.i && pe(X, "opacity", (G.i = x)),
                    T !== G.n && pe(X, "transform", (G.n = T)),
                    K !== G.s && we(ee, (G.s = K)),
                    G
                  );
                },
                {
                  e: void 0,
                  t: void 0,
                  a: void 0,
                  o: void 0,
                  i: void 0,
                  n: void 0,
                  s: void 0,
                },
              ),
              X
            );
          },
        })
      );
    };
  Qe(["pointerdown", "mousedown", "click", "contextmenu"]);
  var Ly = D(
      '<div class="relative flex flex-col w-[calc(100%+16px)] -mx-2 -my-1.5"><div class="pointer-events-none absolute bg-black/5 opacity-0 transition-[top,left,width,height,opacity] duration-75 ease-out">',
    ),
    Dy = D(
      '<div data-react-grab-ignore-events data-react-grab-context-menu class="fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none"style=z-index:2147483647;pointer-events:auto><div><div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 w-fit h-fit px-2">',
    ),
    Fy = D(
      '<button data-react-grab-ignore-events class="relative z-1 contain-layout flex items-center justify-between w-full px-2 py-1 cursor-pointer text-left border-none bg-transparent disabled:opacity-40 disabled:cursor-default"><span class="text-[13px] leading-4 font-sans font-medium text-black">',
    ),
    Hy = D('<span class="text-[11px] font-sans text-black/50 ml-4">'),
    Ef = (e) => {
      let t,
        {
          containerRef: n,
          highlightRef: o,
          updateHighlight: r,
          clearHighlight: s,
        } = Zn(),
        [i, c] = $(0),
        [l, u] = $(0),
        f = () => e.position !== null,
        m = ie(() =>
          is({ tagName: e.tagName, componentName: e.componentName }),
        ),
        h = () => {
          if (t) {
            let y = t.getBoundingClientRect();
            (c(y.width), u(y.height));
          }
        };
      ge(() => {
        f() && Ve(h);
      });
      let v = ie(() => {
          let y = e.selectionBounds,
            w = e.position,
            b = i(),
            g = l();
          if (b === 0 || g === 0 || !y || !w)
            return {
              left: -9999,
              top: -9999,
              arrowLeft: 0,
              arrowPosition: "bottom",
            };
          let C = w.x ?? y.x + y.width / 2,
            O = Math.max(Qt, Math.min(C - b / 2, window.innerWidth - b - Qt)),
            V = Math.max(Bn, Math.min(C - O, b - Bn)),
            Q = y.y + y.height + Bn + Qt,
            X = y.y - g - Bn - Qt,
            ee = Q + g > window.innerHeight,
            ye = X >= 0,
            ce = ee && ye,
            W = ce ? X : Q,
            G = ce ? "top" : "bottom";
          if (ee && !ye) {
            let A = w.y ?? y.y + y.height / 2;
            ((W = Math.max(Qt, Math.min(A + Qt, window.innerHeight - g - Qt))),
              (G = "top"));
          }
          return { left: O, top: W, arrowLeft: V, arrowPosition: G };
        }),
        H = ie(() => {
          let y = e.actions ?? [],
            w = e.actionContext;
          return y.map((b) => ({
            label: b.label,
            action: () => {
              w && b.onAction(w);
            },
            enabled: si(b, w),
            shortcut: b.shortcut,
          }));
        }),
        F = (y, w) => {
          (w.stopPropagation(), y.enabled && (y.action(), e.onHide()));
        };
      return (
        lt(() => {
          h();
          let y = (g) => {
              !f() ||
                kt(g, "data-react-grab-ignore-events") ||
                (g instanceof MouseEvent && g.button === 2) ||
                e.onDismiss();
            },
            w = (g) => {
              if (!f()) return;
              let C = g.code === "Escape",
                O = g.key === "Enter",
                V = g.metaKey || g.ctrlKey,
                Q = g.key.toLowerCase(),
                X = e.actions ?? [],
                ee = e.actionContext,
                ye = (W) =>
                  !ee || !si(W, ee)
                    ? false
                    : (g.preventDefault(),
                      g.stopPropagation(),
                      W.onAction(ee),
                      e.onHide(),
                      true);
              if (C) {
                (g.preventDefault(), g.stopPropagation(), e.onDismiss());
                return;
              }
              if (O) {
                let W = X.find((G) => G.shortcut === "Enter");
                W && ye(W);
                return;
              }
              if (!V || g.repeat) return;
              let ce = X.find(
                (W) =>
                  W.shortcut &&
                  W.shortcut !== "Enter" &&
                  Q === W.shortcut.toLowerCase(),
              );
              ce && ye(ce);
            },
            b = Ve(() => {
              (window.addEventListener("mousedown", y, { capture: true }),
                window.addEventListener("touchstart", y, { capture: true }));
            });
          (window.addEventListener("keydown", w, { capture: true }),
            _e(() => {
              (Ge(b),
                window.removeEventListener("mousedown", y, { capture: true }),
                window.removeEventListener("touchstart", y, { capture: true }),
                window.removeEventListener("keydown", w, { capture: true }));
            }));
        }),
        S(ue, {
          get when() {
            return f();
          },
          get children() {
            var y = Dy(),
              w = y.firstChild,
              b = w.firstChild;
            (Se(y, "contextmenu", ut, true),
              Se(y, "click", ut, true),
              Se(y, "mousedown", ut, true),
              Se(y, "pointerdown", ut, true));
            var g = t;
            return (
              typeof g == "function" ? We(g, y) : (t = y),
              M(
                y,
                S(ls, {
                  get position() {
                    return v().arrowPosition;
                  },
                  leftPercent: 0,
                  get leftOffsetPx() {
                    return v().arrowLeft;
                  },
                }),
                w,
              ),
              M(
                b,
                S(Wr, {
                  get tagName() {
                    return m().tagName;
                  },
                  get componentName() {
                    return m().componentName;
                  },
                  get isClickable() {
                    return e.hasFilePath;
                  },
                  onClick: (C) => {
                    (C.stopPropagation(),
                      e.hasFilePath &&
                        e.actionContext &&
                        e.actions
                          ?.find((V) => V.id === "open")
                          ?.onAction(e.actionContext));
                  },
                  shrink: true,
                  get forceShowIcon() {
                    return e.hasFilePath;
                  },
                }),
              ),
              M(
                w,
                S(It, {
                  get children() {
                    var C = Ly(),
                      O = C.firstChild;
                    return (
                      We(n, C),
                      We(o, O),
                      M(
                        C,
                        S(Jt, {
                          get each() {
                            return H();
                          },
                          children: (V) =>
                            (() => {
                              var Q = Fy(),
                                X = Q.firstChild;
                              return (
                                (Q.$$click = (ee) => F(V, ee)),
                                Se(Q, "pointerleave", s),
                                Q.addEventListener("pointerenter", (ee) => {
                                  V.enabled && r(ee.currentTarget);
                                }),
                                (Q.$$pointerdown = (ee) =>
                                  ee.stopPropagation()),
                                M(X, () => V.label),
                                M(
                                  Q,
                                  S(ue, {
                                    get when() {
                                      return V.shortcut;
                                    },
                                    children: (ee) =>
                                      (() => {
                                        var ye = Hy();
                                        return (M(ye, () => qn(ee())), ye);
                                      })(),
                                  }),
                                  null,
                                ),
                                Y(
                                  (ee) => {
                                    var ye = V.label.toLowerCase(),
                                      ce = !V.enabled;
                                    return (
                                      ye !== ee.e &&
                                        ne(
                                          Q,
                                          "data-react-grab-menu-item",
                                          (ee.e = ye),
                                        ),
                                      ce !== ee.t && (Q.disabled = ee.t = ce),
                                      ee
                                    );
                                  },
                                  { e: void 0, t: void 0 },
                                ),
                                Q
                              );
                            })(),
                        }),
                        null,
                      ),
                      C
                    );
                  },
                }),
                null,
              ),
              Y(
                (C) => {
                  var O = `${v().top}px`,
                    V = `${v().left}px`,
                    Q = de(
                      "contain-layout flex flex-col justify-center items-start rounded-[10px] antialiased w-fit h-fit min-w-[100px] [font-synthesis:none] [corner-shape:superellipse(1.25)]",
                      ft,
                    );
                  return (
                    O !== C.e && pe(y, "top", (C.e = O)),
                    V !== C.t && pe(y, "left", (C.t = V)),
                    Q !== C.a && we(w, (C.a = Q)),
                    C
                  );
                },
                { e: void 0, t: void 0, a: void 0 },
              ),
              y
            );
          },
        })
      );
    };
  Qe(["pointerdown", "mousedown", "click", "contextmenu"]);
  var $y = D(
      '<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=currentColor><path fill-rule=evenodd clip-rule=evenodd d="M4.63751 20.1665L3.82444 6.75092L3.73431 5.06621C3.72513 4.89447 3.8619 4.75018 4.03388 4.75018H19.9945C20.1685 4.75018 20.306 4.89769 20.2938 5.07124L20.1756 6.75092L19.3625 20.1665C19.2745 21.618 18.0717 22.7502 16.6176 22.7502H7.38247C5.9283 22.7502 4.72548 21.618 4.63751 20.1665ZM8.74963 16.5002C8.74963 16.9144 9.08542 17.2502 9.49963 17.2502C9.91385 17.2502 10.2496 16.9144 10.2496 16.5002V10.5002C10.2496 10.086 9.91385 9.75018 9.49963 9.75018C9.08542 9.75018 8.74963 10.086 8.74963 10.5002V16.5002ZM14.4996 9.75018C14.9138 9.75018 15.2496 10.086 15.2496 10.5002V16.5002C15.2496 16.9144 14.9138 17.2502 14.4996 17.2502C14.0854 17.2502 13.7496 16.9144 13.7496 16.5002V10.5002C13.7496 10.086 14.0854 9.75018 14.4996 9.75018Z"></path><path fill-rule=evenodd clip-rule=evenodd d="M8.31879 2.46286C8.63394 1.7275 9.35702 1.2507 10.1571 1.2507H13.8383C14.6383 1.2507 15.3614 1.7275 15.6766 2.46286L16.6569 4.75034H19.2239C19.2903 4.75034 19.3523 4.75034 19.4102 4.7507H19.4637C19.4857 4.74973 19.5079 4.74972 19.5303 4.7507H20.9977C21.55 4.7507 21.9977 5.19842 21.9977 5.7507C21.9977 6.30299 21.55 6.7507 20.9977 6.7507H2.99768C2.4454 6.7507 1.99768 6.30299 1.99768 5.7507C1.99768 5.19842 2.4454 4.7507 2.99768 4.7507H4.46507C4.48746 4.74972 4.50968 4.74973 4.53167 4.7507H4.58469C4.6426 4.75034 4.70457 4.75034 4.77093 4.75034H7.33844L8.31879 2.46286ZM13.8903 3.37192L14.481 4.75034H9.5144L10.1052 3.37192C10.1367 3.29838 10.209 3.2507 10.289 3.2507L13.7064 3.2507C13.7864 3.2507 13.8587 3.29838 13.8903 3.37192Z">',
    ),
    Cl = (e) => {
      let t = () => e.size ?? 14;
      return (() => {
        var n = $y();
        return (
          Y(
            (o) => {
              var r = t(),
                s = t(),
                i = e.class;
              return (
                r !== o.e && ne(n, "width", (o.e = r)),
                s !== o.t && ne(n, "height", (o.t = s)),
                i !== o.a && ne(n, "class", (o.a = i)),
                o
              );
            },
            { e: void 0, t: void 0, a: void 0 },
          ),
          n
        );
      })();
    };
  var By = D(
      '<div class="flex items-center gap-[5px]"><div class=relative><button data-react-grab-ignore-events data-react-grab-history-clear class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-[#FEF2F2] cursor-pointer transition-all hover:bg-[#FEE2E2] press-scale h-[17px] text-[#B91C1C]"></button></div><div class=relative><button data-react-grab-ignore-events data-react-grab-history-copy-all class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px] text-black/60">',
    ),
    zy = D(
      '<div data-react-grab-ignore-events data-react-grab-history-dropdown class="fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none transition-[opacity,transform] duration-100 ease-out will-change-[opacity,transform]"style=z-index:2147483647><div><div class="contain-layout shrink-0 flex items-center justify-between px-2 pt-1.5 pb-1"><span class="text-[11px] font-medium text-black/40">History</span></div><div class="min-h-0 [border-top-width:0.5px] border-t-solid border-t-[#D9D9D9] px-2 py-1.5"><div class="relative flex flex-col max-h-[240px] overflow-y-auto -mx-2 -my-1.5 [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:rgba(0,0,0,0.15)_transparent]"><div class="pointer-events-none absolute bg-black/5 opacity-0 transition-[top,left,width,height,opacity] duration-75 ease-out">',
    ),
    Vy = D(
      '<span class="text-[11px] leading-3 font-sans text-black/40 truncate mt-0.5">',
    ),
    Gy = D(
      '<div data-react-grab-ignore-events data-react-grab-history-item class="group relative z-1 contain-layout flex items-start justify-between w-full px-2 py-1 cursor-pointer text-left gap-2"tabindex=0><span class="flex flex-col min-w-0 flex-1"><span class="text-[12px] leading-4 font-sans font-medium text-black truncate"></span></span><span class="shrink-0 grid"><span class="text-[10px] font-sans text-black/25 group-hover:invisible group-focus-within:invisible [grid-area:1/1] flex items-center justify-end"></span><span class="invisible group-hover:visible group-focus-within:visible [grid-area:1/1] flex items-center justify-end gap-1.5"><button data-react-grab-ignore-events data-react-grab-history-item-remove></button><button data-react-grab-ignore-events data-react-grab-history-item-copy>',
    ),
    Sf =
      "flex items-center justify-center cursor-pointer text-black/25 transition-colors press-scale",
    Uy = (e) => {
      let t = Math.floor((Date.now() - e) / 1e3);
      if (t < 60) return "now";
      let n = Math.floor(t / 60);
      if (n < 60) return `${n}m`;
      let o = Math.floor(n / 60);
      return o < 24 ? `${o}h` : `${Math.floor(o / 24)}d`;
    },
    jy = (e) =>
      e.elementsCount && e.elementsCount > 1
        ? `${e.elementsCount} elements`
        : (e.componentName ?? e.tagName),
    Af = (e) => {
      let t,
        {
          containerRef: n,
          highlightRef: o,
          updateHighlight: r,
          clearHighlight: s,
        } = Zn(),
        i = gs(),
        c = () => {
          if (!t) return null;
          let K = t.getRootNode().querySelector("[data-react-grab-toolbar]");
          if (!K) return null;
          let z = K.getBoundingClientRect();
          return [
            {
              x: z.x - an,
              y: z.y - an,
              width: z.width + an * 2,
              height: z.height + an * 2,
            },
          ];
        },
        [l, u] = $(0),
        [f, m] = $(0),
        [h, v] = $(null),
        [H, F] = $(false),
        [y, w] = $(null),
        b,
        g,
        C,
        O,
        V = () => {
          (clearTimeout(C), O !== void 0 && (Ge(O), (O = void 0)));
        },
        Q = () => e.position !== null,
        [X, ee] = $(false),
        [ye, ce] = $(false),
        [W, G] = $("bottom"),
        A = () => {
          t && (u(t.offsetWidth), m(t.offsetHeight));
        };
      (ge(() => {
        (Q()
          ? (e.position && G(e.position.edge),
            clearTimeout(C),
            ee(true),
            O !== void 0 && Ge(O),
            (O = Ve(() => {
              (A(), t?.offsetHeight, ce(true));
            })))
          : (O !== void 0 && Ge(O),
            ce(false),
            (C = setTimeout(() => {
              ee(false);
            }, Xo))),
          _e(() => {
            V();
          }));
      }),
        ge(
          He(
            () => ye(),
            (T) => {
              T && t?.matches(":hover") && e.onDropdownHover?.(true);
            },
            { defer: true },
          ),
        ));
      let I = ie((T) => {
          let K = mr({
            anchor: e.position,
            measuredWidth: l(),
            measuredHeight: f(),
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            anchorGapPx: Yo,
            viewportPaddingPx: zn,
            offscreenPosition: Wt,
          });
          return K.left !== Wt.left ? K : T;
        }, Wt),
        U = () => Math.min(Cu, window.innerWidth - I().left - zn),
        q = () => window.innerHeight - I().top - zn,
        x = () => Math.max(vu, e.position?.toolbarWidth ?? 0);
      return (
        lt(() => {
          A();
          let T = (K) => {
            Q() &&
              K.code === "Escape" &&
              (K.preventDefault(), K.stopPropagation(), e.onDismiss?.());
          };
          (window.addEventListener("keydown", T, { capture: true }),
            _e(() => {
              (clearTimeout(b),
                clearTimeout(g),
                V(),
                window.removeEventListener("keydown", T, { capture: true }),
                i.stop());
            }));
        }),
        S(ue, {
          get when() {
            return X();
          },
          get children() {
            var T = zy(),
              K = T.firstChild,
              z = K.firstChild;
            z.firstChild;
            var j = z.nextSibling,
              Ee = j.firstChild,
              ve = Ee.firstChild;
            (T.addEventListener("mouseleave", (B) => {
              let oe = c();
              if (oe) {
                i.start({ x: B.clientX, y: B.clientY }, oe, () =>
                  e.onDropdownHover?.(false),
                );
                return;
              }
              e.onDropdownHover?.(false);
            }),
              T.addEventListener("mouseenter", () => {
                (i.stop(), e.onDropdownHover?.(true));
              }),
              Se(T, "contextmenu", ut, true),
              Se(T, "click", ut, true),
              Se(T, "mousedown", ut, true),
              Se(T, "pointerdown", ut, true));
            var N = t;
            return (
              typeof N == "function" ? We(N, T) : (t = T),
              M(
                z,
                S(ue, {
                  get when() {
                    return e.items.length > 0;
                  },
                  get children() {
                    var B = By(),
                      oe = B.firstChild,
                      ke = oe.firstChild,
                      he = oe.nextSibling,
                      Pe = he.firstChild;
                    return (
                      ke.addEventListener("mouseleave", () => v(null)),
                      ke.addEventListener("mouseenter", () => v("clear")),
                      (ke.$$click = (fe) => {
                        (fe.stopPropagation(), v(null), e.onClearAll?.());
                      }),
                      M(ke, S(Cl, { size: go })),
                      M(
                        oe,
                        S(On, {
                          get visible() {
                            return h() === "clear";
                          },
                          position: "top",
                          children: "Clear all",
                        }),
                        null,
                      ),
                      Pe.addEventListener("mouseleave", () => {
                        (v(null), e.onCopyAllHover?.(false));
                      }),
                      Pe.addEventListener("mouseenter", () => {
                        (v("copy"), H() || e.onCopyAllHover?.(true));
                      }),
                      (Pe.$$click = (fe) => {
                        (fe.stopPropagation(),
                          v(null),
                          e.onCopyAll?.(),
                          F(true),
                          clearTimeout(b),
                          (b = setTimeout(() => {
                            F(false);
                          }, 1500)));
                      }),
                      M(
                        Pe,
                        S(ue, {
                          get when() {
                            return H();
                          },
                          get fallback() {
                            return S(xo, { size: go });
                          },
                          get children() {
                            return S(Xr, { size: go, class: "text-black" });
                          },
                        }),
                      ),
                      M(
                        he,
                        S(On, {
                          get visible() {
                            return h() === "copy";
                          },
                          position: "top",
                          children: "Copy all",
                        }),
                        null,
                      ),
                      B
                    );
                  },
                }),
                null,
              ),
              We(n, Ee),
              We(o, ve),
              M(
                Ee,
                S(Jt, {
                  get each() {
                    return e.items;
                  },
                  children: (B) =>
                    (() => {
                      var oe = Gy(),
                        ke = oe.firstChild,
                        he = ke.firstChild,
                        Pe = ke.nextSibling,
                        fe = Pe.firstChild,
                        Ce = fe.nextSibling,
                        $e = Ce.firstChild,
                        Ie = $e.nextSibling;
                      return (
                        Se(oe, "blur", s),
                        oe.addEventListener("focus", (be) =>
                          r(be.currentTarget),
                        ),
                        oe.addEventListener("mouseleave", () => {
                          (e.onItemHover?.(null), s());
                        }),
                        oe.addEventListener("mouseenter", (be) => {
                          (e.disconnectedItemIds?.has(B.id) ||
                            e.onItemHover?.(B.id),
                            r(be.currentTarget));
                        }),
                        (oe.$$keydown = (be) => {
                          be.code === "Space" &&
                            be.currentTarget === be.target &&
                            (be.preventDefault(),
                            be.stopPropagation(),
                            e.onSelectItem?.(B));
                        }),
                        (oe.$$click = (be) => {
                          (be.stopPropagation(),
                            e.onSelectItem?.(B),
                            w(B.id),
                            clearTimeout(g),
                            (g = setTimeout(() => {
                              w(null);
                            }, 1500)));
                        }),
                        (oe.$$pointerdown = (be) => be.stopPropagation()),
                        M(he, () => jy(B)),
                        M(
                          ke,
                          S(ue, {
                            get when() {
                              return B.commentText;
                            },
                            get children() {
                              var be = Vy();
                              return (M(be, () => B.commentText), be);
                            },
                          }),
                          null,
                        ),
                        M(fe, () => Uy(B.timestamp)),
                        ($e.$$click = (be) => {
                          (be.stopPropagation(), e.onRemoveItem?.(B));
                        }),
                        M($e, S(Cl, { size: go })),
                        (Ie.$$click = (be) => {
                          (be.stopPropagation(),
                            e.onCopyItem?.(B),
                            w(B.id),
                            clearTimeout(g),
                            (g = setTimeout(() => {
                              w(null);
                            }, 1500)));
                        }),
                        M(
                          Ie,
                          S(ue, {
                            get when() {
                              return y() === B.id;
                            },
                            get fallback() {
                              return S(xo, { size: go });
                            },
                            get children() {
                              return S(Xr, { size: go, class: "text-black" });
                            },
                          }),
                        ),
                        Y(
                          (be) => {
                            var Ae = {
                                "opacity-40 hover:opacity-100":
                                  !!e.disconnectedItemIds?.has(B.id),
                              },
                              tt = de(Sf, "hover:text-[#B91C1C]"),
                              ot = de(Sf, "hover:text-black/60");
                            return (
                              (be.e = mo(oe, Ae, be.e)),
                              tt !== be.t && we($e, (be.t = tt)),
                              ot !== be.a && we(Ie, (be.a = ot)),
                              be
                            );
                          },
                          { e: void 0, t: void 0, a: void 0 },
                        ),
                        oe
                      );
                    })(),
                }),
                null,
              ),
              Y(
                (B) => {
                  var oe = `${I().top}px`,
                    ke = `${I().left}px`,
                    he = ye() ? "auto" : "none",
                    Pe = qo[W()],
                    fe = ye() ? "1" : "0",
                    Ce = ye() ? "scale(1)" : "scale(0.95)",
                    $e = de(
                      "contain-layout flex flex-col rounded-[10px] antialiased w-fit h-fit overflow-hidden [font-synthesis:none] [corner-shape:superellipse(1.25)]",
                      ft,
                    ),
                    Ie = `${x()}px`,
                    be = `${U()}px`,
                    Ae = `${q()}px`;
                  return (
                    oe !== B.e && pe(T, "top", (B.e = oe)),
                    ke !== B.t && pe(T, "left", (B.t = ke)),
                    he !== B.a && pe(T, "pointer-events", (B.a = he)),
                    Pe !== B.o && pe(T, "transform-origin", (B.o = Pe)),
                    fe !== B.i && pe(T, "opacity", (B.i = fe)),
                    Ce !== B.n && pe(T, "transform", (B.n = Ce)),
                    $e !== B.s && we(K, (B.s = $e)),
                    Ie !== B.h && pe(K, "min-width", (B.h = Ie)),
                    be !== B.r && pe(K, "max-width", (B.r = be)),
                    Ae !== B.d && pe(K, "max-height", (B.d = Ae)),
                    B
                  );
                },
                {
                  e: void 0,
                  t: void 0,
                  a: void 0,
                  o: void 0,
                  i: void 0,
                  n: void 0,
                  s: void 0,
                  h: void 0,
                  r: void 0,
                  d: void 0,
                },
              ),
              T
            );
          },
        })
      );
    };
  Qe(["pointerdown", "mousedown", "click", "contextmenu", "keydown"]);
  var Wy = D(
      '<div data-react-grab-ignore-events data-react-grab-clear-history-prompt class="fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none transition-[opacity,transform] duration-100 ease-out will-change-[opacity,transform]"style=z-index:2147483647><div>',
    ),
    Tf = (e) => {
      let t,
        [n, o] = $(0),
        [r, s] = $(0),
        [i, c] = $(false),
        [l, u] = $(false),
        [f, m] = $("bottom"),
        h,
        v,
        H = () => {
          t && (o(t.offsetWidth), s(t.offsetHeight));
        };
      ge(() => {
        let y = e.position;
        y
          ? (m(y.edge),
            clearTimeout(h),
            c(true),
            v !== void 0 && Ge(v),
            (v = Ve(() => {
              (H(), t?.offsetHeight, u(true));
            })))
          : (v !== void 0 && Ge(v),
            u(false),
            (h = setTimeout(() => {
              c(false);
            }, Xo)));
      });
      let F = ie((y) => {
        let w = mr({
          anchor: e.position,
          measuredWidth: n(),
          measuredHeight: r(),
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          anchorGapPx: Yo,
          viewportPaddingPx: zn,
          offscreenPosition: Wt,
        });
        return w.left !== Wt.left ? w : y;
      }, Wt);
      return (
        lt(() => {
          H();
          let y = (g) => {
            if (!e.position || St(g)) return;
            let C = g.code === "Enter",
              O = g.code === "Escape";
            (C || O) &&
              (g.preventDefault(),
              g.stopImmediatePropagation(),
              O ? e.onCancel() : e.onConfirm());
          };
          window.addEventListener("keydown", y, { capture: true });
          let w = (g) => {
              !e.position ||
                kt(g, "data-react-grab-ignore-events") ||
                e.onCancel();
            },
            b = Ve(() => {
              (window.addEventListener("mousedown", w, { capture: true }),
                window.addEventListener("touchstart", w, { capture: true }));
            });
          _e(() => {
            (Ge(b),
              clearTimeout(h),
              v !== void 0 && Ge(v),
              window.removeEventListener("keydown", y, { capture: true }),
              window.removeEventListener("mousedown", w, { capture: true }),
              window.removeEventListener("touchstart", w, { capture: true }));
          });
        }),
        S(ue, {
          get when() {
            return i();
          },
          get children() {
            var y = Wy(),
              w = y.firstChild;
            (Se(y, "contextmenu", ut, true),
              Se(y, "click", ut, true),
              Se(y, "mousedown", ut, true),
              Se(y, "pointerdown", ut, true));
            var b = t;
            return (
              typeof b == "function" ? We(b, y) : (t = y),
              M(
                w,
                S(Kr, {
                  label: "Clear history?",
                  cancelOnEscape: true,
                  get onConfirm() {
                    return e.onConfirm;
                  },
                  get onCancel() {
                    return e.onCancel;
                  },
                }),
              ),
              Y(
                (g) => {
                  var C = `${F().top}px`,
                    O = `${F().left}px`,
                    V = l() ? "auto" : "none",
                    Q = qo[f()],
                    X = l() ? "1" : "0",
                    ee = l() ? "scale(1)" : "scale(0.95)",
                    ye = de(
                      "contain-layout flex flex-col rounded-[10px] antialiased w-fit h-fit [font-synthesis:none] [corner-shape:superellipse(1.25)]",
                      ft,
                    );
                  return (
                    C !== g.e && pe(y, "top", (g.e = C)),
                    O !== g.t && pe(y, "left", (g.t = O)),
                    V !== g.a && pe(y, "pointer-events", (g.a = V)),
                    Q !== g.o && pe(y, "transform-origin", (g.o = Q)),
                    X !== g.i && pe(y, "opacity", (g.i = X)),
                    ee !== g.n && pe(y, "transform", (g.n = ee)),
                    ye !== g.s && we(w, (g.s = ye)),
                    g
                  );
                },
                {
                  e: void 0,
                  t: void 0,
                  a: void 0,
                  o: void 0,
                  i: void 0,
                  n: void 0,
                  s: void 0,
                },
              ),
              y
            );
          },
        })
      );
    };
  Qe(["pointerdown", "mousedown", "click", "contextmenu"]);
  var Ky = D(
      '<div style="position:fixed;top:0;right:0;bottom:0;left:0;pointer-events:none;transition:opacity 100ms ease-out;will-change:opacity;contain:strict;transform:translateZ(0)">',
    ),
    _f = (e) => [
      S(hd, {
        get crosshairVisible() {
          return e.crosshairVisible;
        },
        get selectionVisible() {
          return e.selectionVisible;
        },
        get selectionBounds() {
          return e.selectionBounds;
        },
        get selectionBoundsMultiple() {
          return e.selectionBoundsMultiple;
        },
        get selectionShouldSnap() {
          return e.selectionShouldSnap;
        },
        get selectionIsFading() {
          return e.selectionLabelStatus === "fading";
        },
        get dragVisible() {
          return e.dragVisible;
        },
        get dragBounds() {
          return e.dragBounds;
        },
        get grabbedBoxes() {
          return e.grabbedBoxes;
        },
        get agentSessions() {
          return e.agentSessions;
        },
        get labelInstances() {
          return e.labelInstances;
        },
      }),
      (() => {
        var t = Ky();
        return (
          pe(t, "z-index", 2147483645),
          pe(t, "box-shadow", `inset 0 0 ${Wc}px ${jc}`),
          Y((n) => pe(t, "opacity", e.isFrozen ? 1 : 0)),
          t
        );
      })(),
      S($i, {
        get each() {
          return Be(() => !!e.agentSessions)()
            ? Array.from(e.agentSessions.values())
            : [];
        },
        children: (t) =>
          S(ue, {
            get when() {
              return t().selectionBounds.length > 0;
            },
            get children() {
              return S(fs, {
                get tagName() {
                  return t().tagName;
                },
                get componentName() {
                  return t().componentName;
                },
                get selectionBounds() {
                  return t().selectionBounds[0];
                },
                get mouseX() {
                  return t().position.x;
                },
                visible: true,
                hasAgent: true,
                isAgentConnected: true,
                get status() {
                  return t().isFading
                    ? "fading"
                    : t().isStreaming
                      ? "copying"
                      : "copied";
                },
                get statusText() {
                  return t().lastStatus || "Thinking\u2026";
                },
                get inputValue() {
                  return t().context.prompt;
                },
                get previousPrompt() {
                  return t().context.prompt;
                },
                get supportsUndo() {
                  return e.supportsUndo;
                },
                get supportsFollowUp() {
                  return e.supportsFollowUp;
                },
                get dismissButtonText() {
                  return e.dismissButtonText;
                },
                onAbort: () => e.onRequestAbortSession?.(t().id),
                get onDismiss() {
                  return t().isStreaming
                    ? void 0
                    : () => e.onDismissSession?.(t().id);
                },
                get onUndo() {
                  return t().isStreaming
                    ? void 0
                    : () => e.onUndoSession?.(t().id);
                },
                get onFollowUpSubmit() {
                  return t().isStreaming
                    ? void 0
                    : (n) => e.onFollowUpSubmitSession?.(t().id, n);
                },
                get error() {
                  return t().error;
                },
                onAcknowledgeError: () => e.onAcknowledgeSessionError?.(t().id),
                onRetry: () => e.onRetrySession?.(t().id),
                get isPendingAbort() {
                  return (
                    Be(() => !!t().isStreaming)() &&
                    e.pendingAbortSessionId === t().id
                  );
                },
                onConfirmAbort: () => e.onAbortSession?.(t().id, true),
                onCancelAbort: () => e.onAbortSession?.(t().id, false),
                onShowContextMenu: void 0,
              });
            },
          }),
      }),
      S(ue, {
        get when() {
          return Be(() => !!e.selectionLabelVisible)() && e.selectionBounds;
        },
        get children() {
          return S(fs, {
            get tagName() {
              return e.selectionTagName;
            },
            get componentName() {
              return e.selectionComponentName;
            },
            get elementsCount() {
              return e.selectionElementsCount;
            },
            get selectionBounds() {
              return e.selectionBounds;
            },
            get mouseX() {
              return e.mouseX;
            },
            get visible() {
              return e.selectionLabelVisible;
            },
            get isPromptMode() {
              return e.isPromptMode;
            },
            get inputValue() {
              return e.inputValue;
            },
            get replyToPrompt() {
              return e.replyToPrompt;
            },
            get hasAgent() {
              return e.hasAgent;
            },
            get isAgentConnected() {
              return e.isAgentConnected;
            },
            get status() {
              return e.selectionLabelStatus;
            },
            get actionCycleState() {
              return e.selectionActionCycleState;
            },
            get arrowNavigationState() {
              return e.selectionArrowNavigationState;
            },
            get onArrowNavigationSelect() {
              return e.onArrowNavigationSelect;
            },
            get filePath() {
              return e.selectionFilePath;
            },
            get lineNumber() {
              return e.selectionLineNumber;
            },
            get onInputChange() {
              return e.onInputChange;
            },
            get onSubmit() {
              return e.onInputSubmit;
            },
            get onCancel() {
              return e.onInputCancel;
            },
            get onToggleExpand() {
              return e.onToggleExpand;
            },
            get isPendingDismiss() {
              return e.isPendingDismiss;
            },
            get onConfirmDismiss() {
              return e.onConfirmDismiss;
            },
            get onCancelDismiss() {
              return e.onCancelDismiss;
            },
            onOpen: () => {
              e.selectionFilePath &&
                nr(e.selectionFilePath, e.selectionLineNumber);
            },
            get isContextMenuOpen() {
              return e.contextMenuPosition !== null;
            },
          });
        },
      }),
      S($i, {
        get each() {
          return e.labelInstances ?? [];
        },
        children: (t) =>
          S(fs, {
            get tagName() {
              return t().tagName;
            },
            get componentName() {
              return t().componentName;
            },
            get elementsCount() {
              return t().elementsCount;
            },
            get selectionBounds() {
              return t().bounds;
            },
            get mouseX() {
              return t().mouseX;
            },
            visible: true,
            get status() {
              return t().status;
            },
            get statusText() {
              return t().statusText;
            },
            get hasAgent() {
              return !!t().statusText;
            },
            get isPromptMode() {
              return t().isPromptMode;
            },
            get inputValue() {
              return t().inputValue;
            },
            get error() {
              return t().errorMessage;
            },
            get hideArrow() {
              return t().hideArrow;
            },
            get onShowContextMenu() {
              let n = t();
              if (
                !(
                  !(n.status === "copied" || n.status === "fading") ||
                  !qe(n.element)
                )
              )
                return () => e.onShowContextMenuInstance?.(n.id);
            },
            onHoverChange: (n) => e.onLabelInstanceHoverChange?.(t().id, n),
          }),
      }),
      S(ue, {
        get when() {
          return e.toolbarVisible !== false;
        },
        get children() {
          return S(vf, {
            get isActive() {
              return e.isActive;
            },
            get isContextMenuOpen() {
              return e.contextMenuPosition !== null;
            },
            get onToggle() {
              return e.onToggleActive;
            },
            get enabled() {
              return e.enabled;
            },
            get onToggleEnabled() {
              return e.onToggleEnabled;
            },
            get shakeCount() {
              return e.shakeCount;
            },
            get onStateChange() {
              return e.onToolbarStateChange;
            },
            get onSubscribeToStateChanges() {
              return e.onSubscribeToToolbarStateChanges;
            },
            get onSelectHoverChange() {
              return e.onToolbarSelectHoverChange;
            },
            get onContainerRef() {
              return e.onToolbarRef;
            },
            get historyItemCount() {
              return e.historyItemCount;
            },
            get clockFlashTrigger() {
              return e.clockFlashTrigger;
            },
            get hasUnreadHistoryItems() {
              return e.hasUnreadHistoryItems;
            },
            get onToggleHistory() {
              return e.onToggleHistory;
            },
            get onCopyAll() {
              return e.onCopyAll;
            },
            get onCopyAllHover() {
              return e.onCopyAllHover;
            },
            get onHistoryButtonHover() {
              return e.onHistoryButtonHover;
            },
            get isHistoryDropdownOpen() {
              return !!e.historyDropdownPosition;
            },
            get isHistoryPinned() {
              return e.isHistoryPinned;
            },
            get toolbarActions() {
              return e.toolbarActions;
            },
            get onToggleMenu() {
              return e.onToggleMenu;
            },
            get isMenuOpen() {
              return !!e.toolbarMenuPosition;
            },
            get isClearPromptOpen() {
              return !!e.clearPromptPosition;
            },
          });
        },
      }),
      S(Ef, {
        get position() {
          return e.contextMenuPosition ?? null;
        },
        get selectionBounds() {
          return e.contextMenuBounds ?? null;
        },
        get tagName() {
          return e.contextMenuTagName;
        },
        get componentName() {
          return e.contextMenuComponentName;
        },
        get hasFilePath() {
          return e.contextMenuHasFilePath ?? false;
        },
        get actions() {
          return e.actions;
        },
        get actionContext() {
          return e.actionContext;
        },
        get onDismiss() {
          return e.onContextMenuDismiss ?? (() => {});
        },
        get onHide() {
          return e.onContextMenuHide ?? (() => {});
        },
      }),
      S(Cf, {
        get position() {
          return e.toolbarMenuPosition ?? null;
        },
        get actions() {
          return e.toolbarActions ?? [];
        },
        get onDismiss() {
          return e.onToolbarMenuDismiss ?? (() => {});
        },
      }),
      S(Tf, {
        get position() {
          return e.clearPromptPosition ?? null;
        },
        get onConfirm() {
          return e.onClearHistoryConfirm ?? (() => {});
        },
        get onCancel() {
          return e.onClearHistoryCancel ?? (() => {});
        },
      }),
      S(Af, {
        get position() {
          return e.historyDropdownPosition ?? null;
        },
        get items() {
          return e.historyItems ?? [];
        },
        get disconnectedItemIds() {
          return e.historyDisconnectedItemIds;
        },
        get onSelectItem() {
          return e.onHistoryItemSelect;
        },
        get onRemoveItem() {
          return e.onHistoryItemRemove;
        },
        get onCopyItem() {
          return e.onHistoryItemCopy;
        },
        get onItemHover() {
          return e.onHistoryItemHover;
        },
        get onCopyAll() {
          return e.onHistoryCopyAll;
        },
        get onCopyAllHover() {
          return e.onHistoryCopyAllHover;
        },
        get onClearAll() {
          return e.onHistoryClear;
        },
        get onDismiss() {
          return e.onHistoryDismiss;
        },
        get onDropdownHover() {
          return e.onHistoryDropdownHover;
        },
      }),
    ];
  var El = () => ({
    activate: () => {},
    deactivate: () => {},
    toggle: () => {},
    comment: () => {},
    isActive: () => false,
    isEnabled: () => false,
    setEnabled: () => {},
    getToolbarState: () => null,
    setToolbarState: () => {},
    onToolbarStateChange: () => () => {},
    dispose: () => {},
    copyElement: () => Promise.resolve(false),
    getSource: () => Promise.resolve(null),
    getStackContext: () => Promise.resolve(""),
    getState: () => ({
      isActive: false,
      isDragging: false,
      isCopying: false,
      isPromptMode: false,
      isCrosshairVisible: false,
      isSelectionBoxVisible: false,
      isDragBoxVisible: false,
      targetElement: null,
      dragBounds: null,
      grabbedBoxes: [],
      labelInstances: [],
      selectionFilePath: null,
      toolbarState: null,
    }),
    setOptions: () => {},
    registerPlugin: () => {},
    unregisterPlugin: () => {},
    getPlugins: () => [],
    getDisplayName: () => null,
  });
  var Pf = () => {
    let e = new AbortController(),
      t = (o, r, s = {}) => {
        window.addEventListener(o, r, { ...s, signal: e.signal });
      },
      n = (o, r, s = {}) => {
        document.addEventListener(o, r, { ...s, signal: e.signal });
      };
    return {
      signal: e.signal,
      abort: () => e.abort(),
      addWindowListener: t,
      addDocumentListener: n,
    };
  };
  var Xy = "application/x-lexical-editor",
    Yy = "application/x-react-grab",
    kf = () =>
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (e) => {
        let t = (Math.random() * 16) | 0;
        return (e === "x" ? t : (t & 3) | 8).toString(16);
      }),
    qy = (e, t, n, o) => ({
      detail: 1,
      format: 0,
      mode: "segmented",
      style: "",
      text: `@${e}`,
      type: "mention",
      version: 1,
      mentionName: e,
      typeaheadType: n,
      storedKey: t,
      metadata: o,
      source: "chat",
    }),
    Zy = (e) => ({
      detail: 0,
      format: 0,
      mode: "normal",
      style: "",
      text: e,
      type: "text",
      version: 1,
    }),
    Jy = (e) =>
      e
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;"),
    Qy = (e, t) => {
      let n = String(Math.floor(Math.random() * 1e4)),
        o = kf(),
        r = `<${t}>`,
        s = { case: "file", path: `${r}.tsx`, content: e },
        i = {
          key: r,
          type: s,
          payload: { file: { path: `${r}.tsx`, content: e } },
          id: kf(),
          name: r,
          _score: 20,
          isSlash: false,
          labelMatch: [{ start: 0, end: 2 }],
        },
        c = { selection: { type: 0 }, selectedOption: i };
      return {
        plainText: `@${r}

${e}
`,
        htmlContent: `<meta charset='utf-8'><pre><code>${Jy(e)}</code></pre>`,
        lexicalData: JSON.stringify({
          namespace: `chat-input${o}-pane`,
          nodes: [
            qy(r, n, s, c),
            Zy(`

${e}`),
          ],
        }),
      };
    },
    Kt = (e, t) => {
      let n = t?.componentName ?? "div",
        { plainText: o, htmlContent: r, lexicalData: s } = Qy(e, n),
        i = t?.entries ?? [
          {
            tagName: t?.tagName,
            componentName: n,
            content: e,
            commentText: t?.commentText,
          },
        ],
        c = { version: zc, content: e, entries: i, timestamp: Date.now() },
        l = (f) => {
          (f.preventDefault(),
            f.clipboardData?.setData("text/plain", o),
            f.clipboardData?.setData("text/html", r),
            f.clipboardData?.setData(Xy, s),
            f.clipboardData?.setData(Yy, JSON.stringify(c)));
        };
      document.addEventListener("copy", l);
      let u = document.createElement("textarea");
      ((u.value = e),
        (u.style.position = "fixed"),
        (u.style.left = "-9999px"),
        (u.ariaHidden = "true"),
        document.body.appendChild(u),
        u.select());
      try {
        if (typeof document.execCommand != "function") return !1;
        let f = document.execCommand("copy");
        return (f && t?.onSuccess?.(), f);
      } finally {
        (document.removeEventListener("copy", l), u.remove());
      }
    };
  var pr = async (e, t = {}) =>
    (await Promise.allSettled(e.map((r) => ns(r, t)))).map((r) =>
      r.status === "fulfilled" ? r.value : "",
    );
  var Ps = (e) =>
    e.length <= 1
      ? (e[0] ?? "")
      : e.map(
          (t, n) => `[${n + 1}]
${t}`,
        ).join(`

`);
  var Of = async (e, t, n, o) => {
    let r = false,
      s = "";
    await t.onBeforeCopy(n);
    try {
      let i, c;
      if (e.getContent) i = await e.getContent(n);
      else {
        let l = await pr(n, { maxLines: e.maxContextLines }),
          f = (
            await Promise.all(
              l.map((m, h) =>
                m.trim() ? t.transformSnippet(m, n[h]) : Promise.resolve(""),
              ),
            )
          )
            .map((m, h) => ({ snippet: m, element: n[h] }))
            .filter(({ snippet: m }) => m.trim());
        ((i = Ps(f.map(({ snippet: m }) => m))),
          (c = f.map(({ snippet: m, element: h }) => ({
            tagName: h.localName,
            content: m,
            commentText: o,
          }))));
      }
      if (i.trim()) {
        let l = await t.transformCopyContent(i, n);
        ((s = o
          ? `${o}

${l}`
          : l),
          (r = Kt(s, { componentName: e.componentName, entries: c })));
      }
    } catch (i) {
      let c = i instanceof Error ? i : new Error(String(i));
      t.onCopyError(c);
    }
    return (r && t.onCopySuccess(n, s), t.onAfterCopy(n, r), r);
  };
  var ew = (e, t) => {
      let n = Math.max(e.left, t.left),
        o = Math.max(e.top, t.top),
        r = Math.min(e.right, t.right),
        s = Math.min(e.bottom, t.bottom),
        i = Math.max(0, r - n),
        c = Math.max(0, s - o);
      return i * c;
    },
    tw = (e, t) =>
      e.left < t.right &&
      e.right > t.left &&
      e.top < t.bottom &&
      e.bottom > t.top,
    gr = (e, t, n) => Math.min(n, Math.max(t, e)),
    nw = (e) =>
      e.sort((t, n) => {
        if (t === n) return 0;
        let o = t.compareDocumentPosition(n);
        return o & Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : o & Node.DOCUMENT_POSITION_PRECEDING
            ? 1
            : 0;
      }),
    ow = (e) => {
      if (e.width <= 0 || e.height <= 0) return [];
      let t = window.innerWidth,
        n = window.innerHeight,
        o = e.x,
        r = e.y,
        s = e.x + e.width,
        i = e.y + e.height,
        c = o + e.width / 2,
        l = r + e.height / 2,
        u = gr(Math.ceil(e.width / va), Rr, Nr),
        f = gr(Math.ceil(e.height / va), Rr, Nr),
        m = u * f,
        h = m > Ca ? Math.sqrt(Ca / m) : 1,
        v = gr(Math.floor(u * h), Rr, Nr),
        H = gr(Math.floor(f * h), Rr, Nr),
        F = new Set(),
        y = [],
        w = (b, g) => {
          let C = gr(Math.round(b), 0, t - 1),
            O = gr(Math.round(g), 0, n - 1),
            V = `${C}:${O}`;
          F.has(V) || (F.add(V), y.push({ x: C, y: O }));
        };
      (w(o + Bt, r + Bt),
        w(s - Bt, r + Bt),
        w(o + Bt, i - Bt),
        w(s - Bt, i - Bt),
        w(c, r + Bt),
        w(c, i - Bt),
        w(o + Bt, l),
        w(s - Bt, l),
        w(c, l));
      for (let b = 0; b < v; b += 1) {
        let g = o + ((b + 0.5) / v) * e.width;
        for (let C = 0; C < H; C += 1) {
          let O = r + ((C + 0.5) / H) * e.height;
          w(g, O);
        }
      }
      return y;
    },
    rw = (e, t, n) => {
      let o = {
          left: e.x,
          top: e.y,
          right: e.x + e.width,
          bottom: e.y + e.height,
        },
        r = new Set(),
        s = ow(e);
      oi();
      try {
        for (let c of s) {
          let l = document.elementsFromPoint(c.x, c.y);
          for (let u of l) r.add(u);
        }
      } finally {
        ri();
      }
      let i = [];
      for (let c of r) {
        if ((!n && Eo(c)) || !t(c)) continue;
        let l = c.getBoundingClientRect();
        if (l.width <= 0 || l.height <= 0) continue;
        let u = {
          left: l.left,
          top: l.top,
          right: l.left + l.width,
          bottom: l.top + l.height,
        };
        if (n) {
          let f = ew(o, u),
            m = l.width * l.height;
          m > 0 && f / m >= du && i.push(c);
        } else tw(u, o) && i.push(c);
      }
      return nw(i);
    },
    iw = (e) => e.filter((t) => !e.some((n) => n !== t && n.contains(t))),
    li = (e, t, n = true) => {
      let o = rw(e, t, n);
      return iw(o);
    };
  var sw = new Set(["role", "name", "aria-label", "rel", "href"]);
  function Tl(e, t) {
    let n = sw.has(e);
    n ||= e.startsWith("data-") && ci(e);
    let o = ci(t) && t.length < 100;
    return ((o ||= t.startsWith("#") && ci(t.slice(1))), n && o);
  }
  function aw(e) {
    return ci(e);
  }
  function lw(e) {
    return ci(e);
  }
  function cw(e) {
    return true;
  }
  function If(e, t) {
    if (e.nodeType !== Node.ELEMENT_NODE)
      throw new Error("Can't generate CSS selector for non-element node type.");
    if (e.tagName.toLowerCase() === "html") return "html";
    let n = {
        root: document.body,
        idName: aw,
        className: lw,
        tagName: cw,
        attr: Tl,
        timeoutMs: 1e3,
        seedMinLength: 3,
        optimizedMinLength: 2,
        maxNumberOfPathChecks: 1 / 0,
      },
      o = new Date(),
      r = { ...n, ...t },
      s = pw(r.root, n),
      i,
      c = 0;
    for (let u of uw(e, r, s)) {
      if (
        new Date().getTime() - o.getTime() > r.timeoutMs ||
        c >= r.maxNumberOfPathChecks
      ) {
        let m = fw(e, s);
        if (!m)
          throw new Error(
            `Timeout: Can't find a unique selector after ${r.timeoutMs}ms`,
          );
        return ui(m);
      }
      if ((c++, _l(u, s))) {
        i = u;
        break;
      }
    }
    if (!i) throw new Error("Selector was not found.");
    let l = [...Lf(i, e, r, s, o)];
    return (l.sort(Sl), l.length > 0 ? ui(l[0]) : ui(i));
  }
  function* uw(e, t, n) {
    let o = [],
      r = [],
      s = e,
      i = 0;
    for (; s && s !== n; ) {
      let c = dw(s, t);
      for (let l of c) l.level = i;
      if (
        (o.push(c),
        (s = s.parentElement),
        i++,
        r.push(...Nf(o)),
        i >= t.seedMinLength)
      ) {
        r.sort(Sl);
        for (let l of r) yield l;
        r = [];
      }
    }
    r.sort(Sl);
    for (let c of r) yield c;
  }
  function ci(e) {
    if (/^[a-z\-]{3,}$/i.test(e)) {
      let t = e.split(/-|[A-Z]/);
      for (let n of t)
        if (n.length <= 2 || /[^aeiou]{4,}/i.test(n)) return false;
      return true;
    }
    return false;
  }
  function dw(e, t) {
    let n = [],
      o = e.getAttribute("id");
    o && t.idName(o) && n.push({ name: "#" + CSS.escape(o), penalty: 0 });
    for (let i = 0; i < e.classList.length; i++) {
      let c = e.classList[i];
      t.className(c) && n.push({ name: "." + CSS.escape(c), penalty: 1 });
    }
    for (let i = 0; i < e.attributes.length; i++) {
      let c = e.attributes[i];
      t.attr(c.name, c.value) &&
        n.push({
          name: `[${CSS.escape(c.name)}="${CSS.escape(c.value)}"]`,
          penalty: 2,
        });
    }
    let r = e.tagName.toLowerCase();
    if (t.tagName(r)) {
      n.push({ name: r, penalty: 5 });
      let i = Al(e, r);
      i !== void 0 && n.push({ name: Rf(r, i), penalty: 10 });
    }
    let s = Al(e);
    return (s !== void 0 && n.push({ name: mw(r, s), penalty: 50 }), n);
  }
  function ui(e) {
    let t = e[0],
      n = t.name;
    for (let o = 1; o < e.length; o++) {
      let r = e[o].level || 0;
      (t.level === r - 1
        ? (n = `${e[o].name} > ${n}`)
        : (n = `${e[o].name} ${n}`),
        (t = e[o]));
    }
    return n;
  }
  function Mf(e) {
    return e.map((t) => t.penalty).reduce((t, n) => t + n, 0);
  }
  function Sl(e, t) {
    return Mf(e) - Mf(t);
  }
  function Al(e, t) {
    let n = e.parentNode;
    if (!n) return;
    let o = n.firstChild;
    if (!o) return;
    let r = 0;
    for (
      ;
      o &&
      (o.nodeType === Node.ELEMENT_NODE &&
        (t === void 0 || o.tagName.toLowerCase() === t) &&
        r++,
      o !== e);
    )
      o = o.nextSibling;
    return r;
  }
  function fw(e, t) {
    let n = 0,
      o = e,
      r = [];
    for (; o && o !== t; ) {
      let s = o.tagName.toLowerCase(),
        i = Al(o, s);
      if (i === void 0) return;
      (r.push({ name: Rf(s, i), penalty: NaN, level: n }),
        (o = o.parentElement),
        n++);
    }
    if (_l(r, t)) return r;
  }
  function mw(e, t) {
    return e === "html" ? "html" : `${e}:nth-child(${t})`;
  }
  function Rf(e, t) {
    return e === "html" ? "html" : `${e}:nth-of-type(${t})`;
  }
  function* Nf(e, t = []) {
    if (e.length > 0)
      for (let n of e[0]) yield* Nf(e.slice(1, e.length), t.concat(n));
    else yield t;
  }
  function pw(e, t) {
    return e.nodeType === Node.DOCUMENT_NODE
      ? e
      : e === t.root
        ? e.ownerDocument
        : e;
  }
  function _l(e, t) {
    let n = ui(e);
    switch (t.querySelectorAll(n).length) {
      case 0:
        throw new Error(`Can't select any node with this selector: ${n}`);
      case 1:
        return true;
      default:
        return false;
    }
  }
  function* Lf(e, t, n, o, r) {
    if (e.length > 2 && e.length > n.optimizedMinLength)
      for (let s = 1; s < e.length - 1; s++) {
        if (new Date().getTime() - r.getTime() > n.timeoutMs) return;
        let c = [...e];
        (c.splice(s, 1),
          _l(c, o) &&
            o.querySelector(ui(c)) === t &&
            (yield c, yield* Lf(c, t, n, o, r)));
      }
  }
  var Df = (e) =>
      typeof CSS < "u" && typeof CSS.escape == "function"
        ? CSS.escape(e)
        : e.replace(/[^a-zA-Z0-9_-]/g, (t) => `\\${t}`),
    Ff = (e) => e.ownerDocument.body ?? e.ownerDocument.documentElement,
    Hf = new Set([
      "data-testid",
      "data-test-id",
      "data-test",
      "data-cy",
      "data-qa",
      "aria-label",
      "role",
      "name",
      "title",
      "alt",
    ]),
    $f = (e) => e.length > 0 && e.length <= 120,
    Pl = (e, t) => {
      try {
        let n = e.ownerDocument.querySelectorAll(t);
        return n.length === 1 && n[0] === e;
      } catch {
        return false;
      }
    },
    bw = (e) => {
      if (e instanceof HTMLElement && e.id) {
        let t = `#${Df(e.id)}`;
        if (Pl(e, t)) return t;
      }
      for (let t of Hf) {
        let n = e.getAttribute(t);
        if (!n || !$f(n)) continue;
        let o = JSON.stringify(n),
          r = `[${t}=${o}]`;
        if (Pl(e, r)) return r;
        let s = `${e.tagName.toLowerCase()}${r}`;
        if (Pl(e, s)) return s;
      }
      return null;
    },
    yw = (e) => {
      let t = [],
        n = Ff(e),
        o = e;
      for (; o; ) {
        if (o instanceof HTMLElement && o.id) {
          t.unshift(`#${Df(o.id)}`);
          break;
        }
        let r = o.parentElement;
        if (!r) {
          t.unshift(o.tagName.toLowerCase());
          break;
        }
        let i = Array.from(r.children).indexOf(o),
          c = i >= 0 ? i + 1 : 1;
        if (
          (t.unshift(`${o.tagName.toLowerCase()}:nth-child(${c})`), r === n)
        ) {
          t.unshift(n.tagName.toLowerCase());
          break;
        }
        o = r;
      }
      return t.join(" > ");
    },
    Bf = (e, t = true) => {
      let n = bw(e);
      if (n) return n;
      if (t)
        try {
          let o = If(e, {
            root: Ff(e),
            timeoutMs: 200,
            attr: (r, s) => Tl(r, s) || (Hf.has(r) && $f(s)),
          });
          if (o) return o;
        } catch {}
      return yw(e);
    };
  var ks = (e) => {
    let t = window.innerWidth,
      n = window.innerHeight,
      o = Math.max(0, e.x),
      r = Math.min(t, e.x + e.width),
      s = Math.max(0, e.y),
      i = Math.min(n, e.y + e.height);
    return { x: (o + r) / 2, y: (s + i) / 2 };
  };
  var zf = () => {
    (Mu(), Ss(), rf());
  };
  var Os = (e) => ({
      x: e.pageX - window.scrollX,
      y: e.pageY - window.scrollY,
      width: e.width,
      height: e.height,
      borderRadius: "0px",
      transform: "none",
    }),
    kl = (e) => ({
      pageX: e.x + window.scrollX,
      pageY: e.y + window.scrollY,
      width: e.width,
      height: e.height,
    }),
    Ms = (e) => ({ ...e, borderRadius: "0px", transform: "none" });
  var ww = new Set([
      "c",
      "C",
      "\u0441",
      "\u0421",
      "\u023C",
      "\u023B",
      "\u2184",
      "\u2183",
      "\u1D04",
      "\u1D9C",
      "\u2C7C",
      "\u217D",
      "\u216D",
      "\xE7",
      "\xC7",
      "\u0107",
      "\u0106",
      "\u010D",
      "\u010C",
      "\u0109",
      "\u0108",
      "\u010B",
      "\u010A",
    ]),
    Is = (e, t) =>
      t === "KeyC" ? true : !e || e.length !== 1 ? false : ww.has(e);
  var Vf = (e, t) => {
    let n = e.toLowerCase();
    return t === "Space"
      ? n === "space" || n === " "
      : t.startsWith("Key")
        ? t.slice(3).toLowerCase() === n
        : t.startsWith("Digit")
          ? t.slice(5) === n
          : false;
  };
  var xw = {
      meta: "metaKey",
      cmd: "metaKey",
      command: "metaKey",
      win: "metaKey",
      windows: "metaKey",
      ctrl: "ctrlKey",
      control: "ctrlKey",
      shift: "shiftKey",
      alt: "altKey",
      option: "altKey",
      opt: "altKey",
    },
    Gf = (e) => {
      let t = e.split("+").map((o) => o.trim().toLowerCase()),
        n = {
          metaKey: false,
          ctrlKey: false,
          shiftKey: false,
          altKey: false,
          key: null,
        };
      for (let o of t) {
        let r = xw[o];
        r ? (n[r] = true) : (n.key = o);
      }
      return n;
    },
    Rs = (e) => {
      if (typeof e == "function") return e;
      let t = Gf(e),
        n = t.key;
      return (o) => {
        if (n === null) {
          let c = t.metaKey ? o.metaKey || o.key === "Meta" : true,
            l = t.ctrlKey ? o.ctrlKey || o.key === "Control" : true,
            u = t.shiftKey ? o.shiftKey || o.key === "Shift" : true,
            f = t.altKey ? o.altKey || o.key === "Alt" : true,
            m = c && l && u && f,
            h = [t.metaKey, t.ctrlKey, t.shiftKey, t.altKey].filter(
              Boolean,
            ).length,
            v = [
              o.metaKey || o.key === "Meta",
              o.ctrlKey || o.key === "Control",
              o.shiftKey || o.key === "Shift",
              o.altKey || o.key === "Alt",
            ].filter(Boolean).length;
          return m && v >= h;
        }
        let r = o.key?.toLowerCase() === n || Vf(n, o.code),
          i =
            t.metaKey || t.ctrlKey || t.shiftKey || t.altKey
              ? (t.metaKey ? o.metaKey : true) &&
                (t.ctrlKey ? o.ctrlKey : true) &&
                (t.shiftKey ? o.shiftKey : true) &&
                (t.altKey ? o.altKey : true)
              : !o.metaKey && !o.ctrlKey && !o.shiftKey && !o.altKey;
        return r && i;
      };
    },
    Uf = (e) =>
      !e || typeof e == "function"
        ? {
            metaKey: Pn(),
            ctrlKey: !Pn(),
            shiftKey: false,
            altKey: false,
            key: null,
          }
        : Gf(e);
  var Ns = (e, t) => {
    if (t.activationKey) return Rs(t.activationKey)(e);
    let o = (Pn() ? e.metaKey : e.ctrlKey) && !e.shiftKey && !e.altKey;
    return !!(e.key && o && Is(e.key, e.code));
  };
  var Ol = (e) => {
    if (e.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    if (e.length === 1) return e[0];
    let t = 1 / 0,
      n = 1 / 0,
      o = -1 / 0,
      r = -1 / 0;
    for (let s of e)
      ((t = Math.min(t, s.x)),
        (n = Math.min(n, s.y)),
        (o = Math.max(o, s.x + s.width)),
        (r = Math.max(r, s.y + s.height)));
    return { x: t, y: n, width: o - t, height: r - n };
  };
  var Qn = {
      enabled: true,
      hue: 0,
      selectionBox: { enabled: true },
      dragBox: { enabled: true },
      grabbedBoxes: { enabled: true },
      elementLabel: { enabled: true },
      crosshair: { enabled: true },
      toolbar: { enabled: true },
    },
    Ls = (e, t) => ({
      enabled: t.enabled ?? e.enabled,
      hue: t.hue ?? e.hue,
      selectionBox: {
        enabled: t.selectionBox?.enabled ?? e.selectionBox.enabled,
      },
      dragBox: { enabled: t.dragBox?.enabled ?? e.dragBox.enabled },
      grabbedBoxes: {
        enabled: t.grabbedBoxes?.enabled ?? e.grabbedBoxes.enabled,
      },
      elementLabel: {
        enabled: t.elementLabel?.enabled ?? e.elementLabel.enabled,
      },
      crosshair: { enabled: t.crosshair?.enabled ?? e.crosshair.enabled },
      toolbar: { enabled: t.toolbar?.enabled ?? e.toolbar.enabled },
    });
  var jf = {
      activationMode: "toggle",
      keyHoldDuration: 100,
      allowActivationInsideInput: true,
      maxContextLines: 5,
      activationKey: void 0,
      getContent: void 0,
      freezeReactUpdates: true,
    },
    Wf = (e = {}) => {
      let t = new Map(),
        n = {},
        [o, r] = Gi({
          theme: Qn,
          options: { ...jf, ...e },
          actions: [],
          toolbarActions: [],
        }),
        s = (b) => b.target === "toolbar",
        i = () => {
          let b = Qn,
            g = { ...jf, ...e },
            C = [],
            O = [];
          for (let { config: V } of t.values())
            if (
              (V.theme && (b = Ls(b, V.theme)),
              V.options && (g = { ...g, ...V.options }),
              V.actions)
            )
              for (let Q of V.actions)
                if (s(Q)) {
                  let X = Q.onAction;
                  O.push({
                    ...Q,
                    onAction: () => {
                      (h("cancelPendingToolbarActions"), X());
                    },
                  });
                } else C.push(Q);
          ((g = { ...g, ...n }),
            r("theme", b),
            r("options", g),
            r("actions", C),
            r("toolbarActions", O));
        },
        c = (b, g) => {
          ((n[b] = g), r("options", b, g));
        },
        l = (b) => {
          (b.activationMode !== void 0 && c("activationMode", b.activationMode),
            b.keyHoldDuration !== void 0 &&
              c("keyHoldDuration", b.keyHoldDuration),
            b.allowActivationInsideInput !== void 0 &&
              c("allowActivationInsideInput", b.allowActivationInsideInput),
            b.maxContextLines !== void 0 &&
              c("maxContextLines", b.maxContextLines),
            b.activationKey !== void 0 && c("activationKey", b.activationKey),
            b.getContent !== void 0 && c("getContent", b.getContent),
            b.freezeReactUpdates !== void 0 &&
              c("freezeReactUpdates", b.freezeReactUpdates));
        },
        u = (b, g) => {
          t.has(b.name) && f(b.name);
          let C = b.setup?.(g, w) ?? {};
          return (
            b.theme &&
              (C.theme = C.theme ? Ls(Ls(Qn, b.theme), C.theme) : b.theme),
            b.actions && (C.actions = [...b.actions, ...(C.actions ?? [])]),
            b.hooks &&
              (C.hooks = C.hooks ? { ...b.hooks, ...C.hooks } : b.hooks),
            b.options &&
              (C.options = C.options
                ? { ...b.options, ...C.options }
                : b.options),
            t.set(b.name, { plugin: b, config: C }),
            i(),
            C
          );
        },
        f = (b) => {
          let g = t.get(b);
          g && (g.config.cleanup && g.config.cleanup(), t.delete(b), i());
        },
        m = () => Array.from(t.keys()),
        h = (b, ...g) => {
          for (let { config: C } of t.values()) {
            let O = C.hooks?.[b];
            O && O(...g);
          }
        },
        v = (b, ...g) => {
          let C = false;
          for (let { config: O } of t.values()) {
            let V = O.hooks?.[b];
            V && V(...g) === true && (C = true);
          }
          return C;
        },
        H = async (b, ...g) => {
          for (let { config: C } of t.values()) {
            let O = C.hooks?.[b];
            O && (await O(...g));
          }
        },
        F = async (b, g, ...C) => {
          let O = g;
          for (let { config: V } of t.values()) {
            let Q = V.hooks?.[b];
            Q && (O = await Q(O, ...C));
          }
          return O;
        },
        y = (b, g, ...C) => {
          let O = g;
          for (let { config: V } of t.values()) {
            let Q = V.hooks?.[b];
            Q && (O = Q(O, ...C));
          }
          return O;
        },
        w = {
          onActivate: () => h("onActivate"),
          onDeactivate: () => h("onDeactivate"),
          onElementHover: (b) => h("onElementHover", b),
          onElementSelect: (b) => {
            let g = false,
              C;
            for (let { config: O } of t.values()) {
              let V = O.hooks?.onElementSelect;
              if (V) {
                let Q = V(b);
                Q === true
                  ? (g = true)
                  : Q instanceof Promise && ((g = true), (C = Q));
              }
            }
            return { wasIntercepted: g, pendingResult: C };
          },
          onDragStart: (b, g) => h("onDragStart", b, g),
          onDragEnd: (b, g) => h("onDragEnd", b, g),
          onBeforeCopy: async (b) => H("onBeforeCopy", b),
          transformCopyContent: async (b, g) => F("transformCopyContent", b, g),
          onAfterCopy: (b, g) => h("onAfterCopy", b, g),
          onCopySuccess: (b, g) => h("onCopySuccess", b, g),
          onCopyError: (b) => h("onCopyError", b),
          onStateChange: (b) => h("onStateChange", b),
          onPromptModeChange: (b, g) => h("onPromptModeChange", b, g),
          onSelectionBox: (b, g, C) => h("onSelectionBox", b, g, C),
          onDragBox: (b, g) => h("onDragBox", b, g),
          onGrabbedBox: (b, g) => h("onGrabbedBox", b, g),
          onElementLabel: (b, g, C) => h("onElementLabel", b, g, C),
          onCrosshair: (b, g) => h("onCrosshair", b, g),
          onContextMenu: (b, g) => h("onContextMenu", b, g),
          cancelPendingToolbarActions: () => h("cancelPendingToolbarActions"),
          onOpenFile: (b, g) => v("onOpenFile", b, g),
          transformHtmlContent: async (b, g) => F("transformHtmlContent", b, g),
          transformAgentContext: async (b, g) =>
            F("transformAgentContext", b, g),
          transformActionContext: (b) => y("transformActionContext", b),
          transformOpenFileUrl: (b, g, C) => y("transformOpenFileUrl", b, g, C),
          transformSnippet: async (b, g) => F("transformSnippet", b, g),
        };
      return {
        register: u,
        unregister: f,
        getPluginNames: m,
        setOptions: l,
        store: o,
        hooks: w,
      };
    };
  var Ml = "react-grab:agent-sessions",
    vw = () =>
      `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    Xf = (e, t, n, o, r) => {
      let s = Date.now();
      return {
        id: vw(),
        context: e,
        lastStatus: "",
        isStreaming: true,
        createdAt: s,
        lastUpdatedAt: s,
        position: t,
        selectionBounds: n,
        tagName: o,
        componentName: r,
      };
    },
    un = new Map(),
    Kf = () => {
      for (; un.size > fu; ) {
        let e = un.keys().next().value;
        e !== void 0 && un.delete(e);
      }
    },
    Ds = (e, t) => {
      if (!t) {
        (un.clear(), e.forEach((n, o) => un.set(o, n)), Kf());
        return;
      }
      try {
        let n = Object.fromEntries(e);
        t.setItem(Ml, JSON.stringify(n));
      } catch {
        (un.clear(), e.forEach((n, o) => un.set(o, n)), Kf());
      }
    },
    Fs = (e, t) => {
      let n = Hs(t);
      (n.set(e.id, e), Ds(n, t));
    },
    Hs = (e) => {
      if (!e) return new Map(un);
      try {
        let t = e.getItem(Ml);
        if (!t) return new Map();
        let n = JSON.parse(t);
        return new Map(Object.entries(n));
      } catch {
        return new Map();
      }
    },
    $s = (e) => {
      if (!e) {
        un.clear();
        return;
      }
      try {
        e.removeItem(Ml);
      } catch {
        un.clear();
      }
    },
    Il = (e, t) => {
      let n = Hs(t);
      (n.delete(e), Ds(n, t));
    },
    eo = (e, t, n) => {
      let o = { ...e, ...t, lastUpdatedAt: Date.now() };
      return (Fs(o, n), o);
    };
  var Rl = (e, t) => {
    let [n, o] = $(new Map()),
      [r, s] = $(false),
      [i, c] = $(false),
      l = new Map(),
      u = new Map(),
      f = new Map(),
      m = [],
      h = [],
      v = e,
      H = (x) => f.get(x)?.agent ?? v,
      F = (x) => f.get(x)?.elements ?? [],
      y = (x) => {
        let T = x ?? v,
          K = T?.provider?.canUndo?.() ?? false,
          z = T?.provider?.canRedo?.() ?? false;
        (s(K), c(z));
      },
      w = (x) => {
        ((v = x), y());
      },
      b = () => v,
      g = () => Array.from(n().values()).some((x) => x.isStreaming),
      C = async (x, T, K, z) => {
        let te = z ?? v,
          j = te?.storage,
          Ee = false,
          ve = () => l.get(x.id) === K;
        try {
          for await (let oe of T) {
            if (!ve()) break;
            let he = n().get(x.id);
            if (!he) break;
            let Pe = eo(he, { lastStatus: oe }, j);
            (o((fe) => new Map(fe).set(x.id, Pe)), te?.onStatus?.(oe, Pe));
          }
          if (!ve()) return;
          let B = n().get(x.id);
          if (B) {
            let oe = te?.provider?.getCompletionMessage?.(),
              ke = eo(
                B,
                { isStreaming: !1, ...(oe ? { lastStatus: oe } : {}) },
                j,
              );
            o((Ce) => new Map(Ce).set(x.id, ke));
            let he = F(x.id),
              Pe = await te?.onComplete?.(ke, he),
              fe = h.findIndex((Ce) => Ce.session.id === x.id);
            if (
              (fe !== -1 && h.splice(fe, 1),
              h.push({ session: ke, elements: he, agent: te }),
              y(te),
              (m.length = 0),
              Pe?.error)
            ) {
              let Ce = eo(ke, { error: Pe.error }, j);
              o(($e) => new Map($e).set(x.id, Ce));
            }
          }
        } catch (N) {
          if (!ve()) return;
          let oe = n().get(x.id);
          if (N instanceof Error && N.name === "AbortError") {
            if (((Ee = true), oe)) {
              let ke = F(x.id);
              te?.onAbort?.(oe, ke);
            }
          } else {
            let ke = N instanceof Error ? N.message : "Unknown error";
            if (oe) {
              let he = eo(oe, { error: ke, isStreaming: false }, j);
              (o((Pe) => new Map(Pe).set(x.id, he)),
                N instanceof Error && te?.onError?.(N, he));
            }
          }
        } finally {
          if (!ve()) return;
          if ((l.delete(x.id), Ee)) {
            let N = u.get(x.id);
            (N && (clearTimeout(N), u.delete(x.id)),
              f.delete(x.id),
              Il(x.id, j),
              o((B) => {
                let oe = new Map(B);
                return (oe.delete(x.id), oe);
              }));
          }
        }
      },
      O = (x) => {
        let { selectionBounds: T, tagName: K } = x,
          z = T[0];
        if (!z) return;
        let te = z.x + z.width / 2,
          j = z.y + z.height / 2,
          Ee = document.elementFromPoint(te, j);
        if (!(!Ee || (K && !K.includes(" ") && ct(Ee) !== K))) return Ee;
      },
      V = () => {
        let x = v?.storage;
        if (!x) return;
        let T = Hs(x);
        if (T.size === 0) return;
        let K = Date.now(),
          z = Array.from(T.values()).filter((j) => {
            if (j.isStreaming) return true;
            let Ee = j.lastUpdatedAt ?? j.createdAt;
            return K - Ee < 1e4 && !!j.error;
          });
        if (z.length === 0) {
          $s(x);
          return;
        }
        if (!v?.provider?.supportsResume || !v.provider.resume) {
          $s(x);
          return;
        }
        (u.forEach((j) => clearTimeout(j)),
          u.clear(),
          l.forEach((j) => j.abort()),
          l.clear(),
          f.clear());
        let te = new Map(z.map((j) => [j.id, j]));
        (o(te), Ds(te, x));
        for (let j of z) {
          let Ee = O(j);
          Ee && v && f.set(j.id, { elements: [Ee], agent: v });
          let ve = {
            ...j,
            isStreaming: true,
            error: void 0,
            lastStatus: j.lastStatus || "Resuming...",
            position: j.position ?? {
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
            },
          };
          (o((oe) => new Map(oe).set(j.id, ve)), v?.onResume?.(ve));
          let N = new AbortController();
          l.set(j.id, N);
          let B = v.provider.resume(j.id, N.signal, x);
          C(j, B, N);
        }
      },
      Q = async (x) => {
        let {
            elements: T,
            prompt: K,
            position: z,
            selectionBounds: te,
            sessionId: j,
            agent: Ee,
          } = x,
          ve = Ee ?? (j ? H(j) : v),
          N = ve?.storage;
        if (!ve?.provider || T.length === 0) return;
        let B = T[0],
          oe = j ? n().get(j) : void 0,
          ke = !!j,
          Pe = {
            content: oe
              ? oe.context.content
              : (await pr(T, { maxLines: 1 / 0 })).filter((Ae) => Ae.trim()),
            prompt: K,
            options: ve?.getOptions?.(),
            sessionId: ke ? j : void 0,
          },
          fe;
        if (oe)
          fe = eo(
            oe,
            { context: Pe, isStreaming: true, lastStatus: "Thinking\u2026" },
            N,
          );
        else {
          let Ae = T.length > 1 ? `${T.length} elements` : ct(B) || void 0,
            tt = T.length > 1 ? void 0 : (await tr(B)) || void 0;
          ((fe = Xf(Pe, z, te, Ae, tt)), (fe.lastStatus = "Thinking\u2026"));
        }
        (f.set(fe.id, { elements: T, agent: ve }),
          o((Ae) => new Map(Ae).set(fe.id, fe)),
          Fs(fe, N),
          ve.onStart?.(fe, T));
        let Ce = new AbortController();
        l.set(fe.id, Ce);
        let $e = { ...Pe, sessionId: j ?? fe.id },
          Ie;
        try {
          Ie = t?.transformAgentContext
            ? await t.transformAgentContext($e, T)
            : $e;
        } catch (Ae) {
          let tt =
              Ae instanceof Error
                ? Ae.message
                : "Context transformation failed",
            ot = eo(fe, { error: tt, isStreaming: false }, N);
          (o((mt) => new Map(mt).set(fe.id, ot)),
            l.delete(fe.id),
            Ae instanceof Error && ve.onError?.(Ae, ot));
          return;
        }
        let be = ve.provider.send(Ie, Ce.signal);
        C(fe, be, Ce, ve);
      },
      X = (x) => {
        if (x) {
          let T = l.get(x);
          T && T.abort();
        } else
          (l.forEach((T) => T.abort()),
            l.clear(),
            u.forEach((T) => clearTimeout(T)),
            u.clear(),
            f.clear(),
            (h.length = 0),
            (m.length = 0),
            o(new Map()),
            $s(v?.storage),
            y());
      },
      ee = (x, T, K) => {
        let te = n().get(x),
          j = T ?? H(x),
          Ee = K ?? F(x);
        if (te?.isFading) return;
        (te && Ee.length > 0 && j?.onDismiss?.(te, Ee),
          o((B) => {
            let oe = new Map(B),
              ke = oe.get(x);
            return (ke && oe.set(x, { ...ke, isFading: true }), oe);
          }));
        let ve = u.get(x);
        ve && clearTimeout(ve);
        let N = setTimeout(() => {
          u.delete(x);
          let B = l.get(x);
          (B && (B.abort(), l.delete(x)),
            f.delete(x),
            Il(x, j?.storage),
            o((oe) => {
              let ke = new Map(oe);
              return (ke.delete(x), ke);
            }));
        }, 150);
        u.set(x, N);
      };
    return {
      sessions: n,
      isProcessing: g,
      canUndo: r,
      canRedo: i,
      session: {
        start: Q,
        abort: X,
        dismiss: ee,
        retry: (x) => {
          let K = n().get(x),
            z = H(x);
          if (!K || !z?.provider) return;
          let te = z.storage,
            j = F(x),
            Ee = eo(
              K,
              {
                error: void 0,
                isStreaming: true,
                lastStatus: "Retrying\u2026",
              },
              te,
            );
          (o((oe) => new Map(oe).set(x, Ee)),
            Fs(Ee, te),
            j.length > 0 && z.onStart?.(Ee, j));
          let ve = new AbortController();
          l.set(x, ve);
          let N = { ...Ee.context, sessionId: x },
            B = z.provider.send(N, ve.signal);
          C(Ee, B, ve, z);
        },
        undo: (x) => {
          let K = n().get(x),
            z = H(x),
            te = F(x);
          if (K) {
            m.push({ session: K, elements: te, agent: z });
            let j = h.findIndex((Ee) => Ee.session.id === x);
            (j !== -1 && h.splice(j, 1),
              z?.onUndo?.(K, te),
              z?.provider?.undo?.());
          }
          (ee(x, z, te), y(z));
        },
        getElement: (x) => F(x)[0],
        getElements: (x) => F(x),
        tryResume: V,
        acknowledgeError: (x) => {
          let z = n().get(x)?.context.prompt;
          return (ee(x), z);
        },
      },
      history: {
        undo: () => {
          let x = h.pop();
          if (!x) return;
          let { session: T, elements: K, agent: z } = x,
            te = z ?? v;
          (m.push(x),
            te?.onUndo?.(T, K),
            te?.provider?.undo?.(),
            ee(T.id, te, K),
            y(te));
        },
        redo: () => {
          let x = m.pop();
          if (!x) return;
          let T = x.agent ?? v,
            { session: K, elements: z } = x;
          T?.provider?.redo?.();
          let te = z.filter((j) => qe(j));
          if (te.length === 0) {
            let j = O(K);
            j && (te = [j]);
          }
          if (te.length > 0 && T) {
            h.push(x);
            let j = te.map((ve) => ze(ve)),
              Ee = { ...K, selectionBounds: j };
            (f.set(K.id, { elements: te, agent: T }),
              o((ve) => new Map(ve).set(K.id, Ee)));
          }
          y(T);
        },
      },
      _internal: {
        updateBoundsOnViewportChange: () => {
          let x = n();
          if (x.size === 0) return;
          let T = new Map(x),
            K = false;
          for (let [z, te] of x) {
            let j = F(z),
              Ee = j[0];
            if (qe(Ee)) {
              let ve = j.filter((N) => qe(N)).map((N) => ze(N));
              if (ve.length > 0) {
                let N = te.selectionBounds[0],
                  B = ve[0],
                  oe = Ki({
                    currentPosition: te.position,
                    previousBounds: N,
                    nextBounds: B,
                  });
                (T.set(z, { ...te, selectionBounds: ve, position: oe }),
                  (K = true));
              }
            }
          }
          K && o(T);
        },
        setOptions: w,
        getOptions: b,
      },
    };
  };
  var Yf = (e, t) => {
    let n = [],
      o = (u, f) => {
        let m = t(u),
          h = ks(m),
          v = Es(h.x, h.y).filter(e),
          H = v.indexOf(u);
        return H === -1 ? null : (v[H + f] ?? null);
      },
      r = (u) => {
        let f = o(u, 1);
        return (f && (n.push(u), n.length > Ea && (n = n.slice(-Ea))), f);
      },
      s = (u) => {
        if (n.length > 0) {
          let f = n.pop();
          if (qe(f)) return f;
        }
        return o(u, -1);
      },
      i = (u, f) => {
        let m = (H) => {
            let F = Array.from(H.children),
              y = f ? F : F.reverse();
            for (let w of y)
              if (f) {
                if (e(w)) return w;
                let b = m(w);
                if (b) return b;
              } else {
                let b = m(w);
                if (b) return b;
                if (e(w)) return w;
              }
            return null;
          },
          h = (H) => (f ? H.nextElementSibling : H.previousElementSibling),
          v = null;
        if ((f && (v = m(u)), !v)) {
          let H = u;
          for (; H; ) {
            let F = h(H);
            for (; F; ) {
              let w = m(F);
              if (w) {
                v = w;
                break;
              }
              if (e(F)) {
                v = F;
                break;
              }
              F = h(F);
            }
            if (v) break;
            let y = H.parentElement;
            if (!f && y && e(y)) {
              v = y;
              break;
            }
            H = y;
          }
        }
        return v;
      };
    return {
      findNext: (u, f) => {
        switch (u) {
          case "ArrowUp":
            return r(f);
          case "ArrowDown":
            return s(f);
          case "ArrowRight":
            return i(f, true);
          case "ArrowLeft":
            return i(f, false);
          default:
            return null;
        }
      },
      clearHistory: () => {
        n = [];
      },
    };
  };
  var qf = (e) => {
      let {
        metaKey: t,
        ctrlKey: n,
        shiftKey: o,
        altKey: r,
      } = Uf(e.activationKey);
      return { metaKey: t, ctrlKey: n, shiftKey: o, altKey: r };
    },
    Zf = () => {
      let e = new WeakSet(),
        t = Object.getOwnPropertyDescriptor(KeyboardEvent.prototype, "key"),
        n = false;
      if (t?.get && !t.get.__reactGrabPatched) {
        n = true;
        let r = t.get,
          s = function () {
            return e.has(this) ? "" : r.call(this);
          };
        ((s.__reactGrabPatched = true),
          Object.defineProperty(KeyboardEvent.prototype, "key", {
            get: s,
            configurable: true,
          }));
      }
      return {
        claimedEvents: e,
        originalKeyDescriptor: t,
        didPatch: n,
        restore: () => {
          n && t && Object.defineProperty(KeyboardEvent.prototype, "key", t);
        },
      };
    };
  var Nl = (e, t) => ({
      top: t < 25,
      bottom: t > window.innerHeight - 25,
      left: e < 25,
      right: e > window.innerWidth - 25,
    }),
    Jf = (e, t) => {
      let n = null,
        o = () => {
          if (!t()) {
            s();
            return;
          }
          let c = e(),
            l = Nl(c.x, c.y);
          (l.top && window.scrollBy(0, -10),
            l.bottom && window.scrollBy(0, 10),
            l.left && window.scrollBy(-10, 0),
            l.right && window.scrollBy(10, 0),
            l.top || l.bottom || l.left || l.right ? (n = Ve(o)) : (n = null));
        },
        r = () => {
          o();
        },
        s = () => {
          n !== null && (Ge(n), (n = null));
        };
      return { start: r, stop: s, isActive: () => n !== null };
    };
  var Qf = () => {
    let e = globalThis;
    return !!(e.chrome?.runtime?.id || e.browser?.runtime?.id);
  };
  var em = () => {
    try {
      let e = "0.1.26",
        t = `data:image/svg+xml;base64,${btoa(Su)}`;
      (console.log(
        `%cReact Grab${e ? ` v${e}` : ""}%c
https://react-grab.com`,
        `background: #330039; color: #ffffff; border: 1px solid #d75fcb; padding: 4px 4px 4px 24px; border-radius: 4px; background-image: url("${t}"); background-size: 16px 16px; background-repeat: no-repeat; background-position: 4px center; display: inline-block; margin-bottom: 4px;`,
        "",
      ),
        navigator.onLine &&
          e &&
          !Qf() &&
          fetch(
            `https://www.react-grab.com/api/version?source=browser&t=${Date.now()}`,
            {
              referrerPolicy: "origin",
              keepalive: !0,
              priority: "low",
              cache: "no-store",
            },
          )
            .then((n) => n.text())
            .then((n) => {
              n &&
                n !== e &&
                console.warn(`[React Grab] v${e} is outdated (latest: v${n})`);
            })
            .catch(() => null));
    } catch {}
  };
  var Sw = (e) =>
      typeof e != "object" || e === null || !("postTask" in e)
        ? false
        : typeof e.postTask == "function",
    tm = (e) => {
      if (typeof window < "u") {
        let t = window.scheduler;
        if (Sw(t)) {
          t.postTask(e, { priority: "background" });
          return;
        }
        if ("requestIdleCallback" in window) {
          requestIdleCallback(e);
          return;
        }
      }
      setTimeout(e, 0);
    };
  var Aw = (e) => typeof e == "object" && e !== null,
    Tw = (e) => {
      if (!Aw(e)) return null;
      let t = {};
      return (
        typeof e.enabled == "boolean" && (t.enabled = e.enabled),
        (e.activationMode === "toggle" || e.activationMode === "hold") &&
          (t.activationMode = e.activationMode),
        typeof e.keyHoldDuration == "number" &&
          Number.isFinite(e.keyHoldDuration) &&
          (t.keyHoldDuration = e.keyHoldDuration),
        typeof e.allowActivationInsideInput == "boolean" &&
          (t.allowActivationInsideInput = e.allowActivationInsideInput),
        typeof e.maxContextLines == "number" &&
          Number.isFinite(e.maxContextLines) &&
          (t.maxContextLines = e.maxContextLines),
        typeof e.activationKey == "string" &&
          (t.activationKey = e.activationKey),
        typeof e.freezeReactUpdates == "boolean" &&
          (t.freezeReactUpdates = e.freezeReactUpdates),
        Object.keys(t).length === 0 ? null : t
      );
    },
    nm = () => {
      if (typeof window > "u") return null;
      try {
        let t = (
          document.currentScript instanceof HTMLScriptElement
            ? document.currentScript
            : null
        )?.getAttribute("data-options");
        return t ? Tw(JSON.parse(t)) : null;
      } catch {
        return null;
      }
    };
  var To = (e) => e === "Enter" || e === "NumpadEnter";
  var om = {
    name: "copy",
    setup: (e) => {
      let t = false;
      return {
        hooks: {
          onElementSelect: (n) => {
            if (t) return ((t = false), e.copyElement(n), true);
          },
          onDeactivate: () => {
            t = false;
          },
          cancelPendingToolbarActions: () => {
            t = false;
          },
        },
        actions: [
          {
            id: "copy",
            label: "Copy",
            shortcut: "C",
            onAction: (n) => {
              n.copy?.();
            },
          },
          {
            id: "copy-toolbar",
            label: "Copy element",
            shortcut: "C",
            target: "toolbar",
            onAction: () => {
              ((t = true), e.activate());
            },
          },
        ],
      };
    },
  };
  var Ll = {
    name: "comment",
    setup: (e) => ({
      actions: [
        {
          id: "comment",
          label: "Comment",
          shortcut: "Enter",
          onAction: (t) => {
            t.enterPromptMode?.();
          },
        },
        {
          id: "comment-toolbar",
          label: "Comment",
          shortcut: "Enter",
          target: "toolbar",
          onAction: () => {
            e.comment();
          },
        },
      ],
    }),
  };
  var Dl = {
    name: "open",
    actions: [
      {
        id: "open",
        label: "Open",
        shortcut: "O",
        enabled: (e) => !!e.filePath,
        onAction: (e) => {
          if (!e.filePath) return;
          (e.hooks.onOpenFile(e.filePath, e.lineNumber) ||
            nr(e.filePath, e.lineNumber, e.hooks.transformOpenFileUrl),
            e.hideContextMenu(),
            e.cleanup());
        },
      },
    ],
  };
  var hr = (e, t) =>
    t
      ? `${e}
${t}`
      : e;
  var rm = {
    name: "copy-html",
    setup: (e, t) => {
      let n = false;
      return {
        hooks: {
          onElementSelect: (o) => {
            if (n)
              return (
                (n = false),
                Promise.all([
                  t.transformHtmlContent(o.outerHTML, [o]),
                  e.getStackContext(o),
                ])
                  .then(([r, s]) => {
                    r && Kt(hr(r, s));
                  })
                  .catch(() => {}),
                true
              );
          },
          onDeactivate: () => {
            n = false;
          },
          cancelPendingToolbarActions: () => {
            n = false;
          },
        },
        actions: [
          {
            id: "copy-html",
            label: "Copy HTML",
            onAction: async (o) => {
              await o.performWithFeedback(async () => {
                let r = o.elements.map((c) => c.outerHTML).join(`

`),
                  s = await o.hooks.transformHtmlContent(r, o.elements);
                if (!s) return false;
                let i = await e.getStackContext(o.element);
                return Kt(hr(s, i), {
                  componentName: o.componentName,
                  tagName: o.tagName,
                });
              });
            },
          },
          {
            id: "copy-html-toolbar",
            label: "Copy HTML",
            target: "toolbar",
            onAction: () => {
              ((n = true), e.activate());
            },
          },
        ],
      };
    },
  };
  var _w = new Map(
      ["top", "right", "bottom", "left"].flatMap((e) => [
        [`border-${e}-style`, e],
        [`border-${e}-color`, e],
      ]),
    ),
    to = null,
    Fl = new Map(),
    Pw = () =>
      to ||
      ((to = document.createElement("iframe")),
      (to.style.cssText =
        "position:fixed;left:-9999px;width:0;height:0;border:none;visibility:hidden;"),
      document.body.appendChild(to),
      to),
    kw = (e) => {
      let t = Fl.get(e);
      if (t) return t;
      let n = Pw(),
        o = n.contentDocument,
        r = o.createElement(e);
      o.body.appendChild(r);
      let s = n.contentWindow.getComputedStyle(r),
        i = new Map();
      for (let c of _a) {
        let l = s.getPropertyValue(c);
        l && i.set(c, l);
      }
      return (r.remove(), Fl.set(e, i), i);
    },
    Ow = (e, t) => {
      let n = _w.get(e);
      if (!n) return false;
      let o = t.getPropertyValue(`border-${n}-width`);
      return o === "0px" || o === "0";
    },
    Hl = (e) => {
      let t = e.tagName.toLowerCase(),
        n = kw(t),
        o = getComputedStyle(e),
        r = [];
      for (let c of _a) {
        let l = o.getPropertyValue(c);
        l && l !== n.get(c) && (Ow(c, o) || r.push(`${c}: ${l};`));
      }
      let s = e.getAttribute("class")?.trim(),
        i = r.join(`
`);
      return s
        ? i
          ? `className: ${s}

${i}`
          : `className: ${s}`
        : i;
    },
    im = () => {
      (to?.remove(), (to = null), Fl.clear());
    };
  var sm = {
    name: "copy-styles",
    setup: (e) => {
      let t = false;
      return {
        hooks: {
          onElementSelect: (n) => {
            if (!t) return;
            t = false;
            let o = Hl(n);
            return (
              e
                .getStackContext(n)
                .then((r) => {
                  Kt(hr(o, r));
                })
                .catch(() => {}),
              true
            );
          },
          onDeactivate: () => {
            t = false;
          },
          cancelPendingToolbarActions: () => {
            t = false;
          },
        },
        actions: [
          {
            id: "copy-styles",
            label: "Copy styles",
            onAction: async (n) => {
              await n.performWithFeedback(async () => {
                let o = n.elements.map(Hl).join(`

`),
                  r = await e.getStackContext(n.element);
                return Kt(hr(o, r), {
                  componentName: n.componentName,
                  tagName: n.tagName,
                });
              });
            },
          },
          {
            id: "copy-styles-toolbar",
            label: "Copy styles",
            target: "toolbar",
            onAction: () => {
              ((t = true), e.activate());
            },
          },
        ],
        cleanup: im,
      };
    },
  };
  var am = "react-grab-history-items",
    Mw = () => {
      try {
        let e = sessionStorage.getItem(am);
        return e
          ? JSON.parse(e).map((n) => ({
              ...n,
              elementsCount: Math.max(1, n.elementsCount ?? 1),
              previewBounds: n.previewBounds ?? [],
              elementSelectors: n.elementSelectors ?? [],
            }))
          : [];
      } catch {
        return [];
      }
    },
    Iw = (e) => {
      let t = e;
      for (; t.length > 0; ) {
        let n = JSON.stringify(t);
        if (new Blob([n]).size <= xu) return t;
        t = t.slice(0, -1);
      }
      return t;
    },
    $l = (e) => {
      try {
        let t = Iw(e);
        sessionStorage.setItem(am, JSON.stringify(t));
      } catch {}
    },
    Xt = Mw(),
    Rw = () =>
      `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    Bl = () => Xt,
    lm = (e) => ((Xt = [{ ...e, id: Rw() }, ...Xt].slice(0, wu)), $l(Xt), Xt),
    zl = (e) => ((Xt = Xt.filter((t) => t.id !== e)), $l(Xt), Xt),
    cm = () => ((Xt = []), $l(Xt), Xt);
  var Ww = [om, Ll, rm, sm, Dl],
    Vl = false,
    no = new Set(),
    Gl = (e) => {
      if (typeof window > "u") return El();
      let t = nm(),
        n = {
          enabled: true,
          activationMode: "toggle",
          keyHoldDuration: 100,
          allowActivationInsideInput: true,
          maxContextLines: 5,
          ...t,
          ...e,
        };
      if (n.enabled === false || Vl) return El();
      ((Vl = true), em());
      let { enabled: o, ...r } = n;
      return wn((s) => {
        let i = Wf(r),
          c = () => {
            for (let a of i.store.actions)
              if (a.agent?.provider) return a.agent;
          },
          { store: l, actions: u } = Iu({
            theme: Qn,
            hasAgentProvider: !!c()?.provider,
            keyHoldDuration: i.store.options.keyHoldDuration ?? 100,
          }),
          f = ie(() => l.current.state === "holding"),
          m = ie(() => l.current.state === "active");
        ge(
          He(m, (a, d) => {
            a && !d
              ? (As(), vs(), (document.body.style.touchAction = "none"))
              : !a && d && (ii(), ni(), (document.body.style.touchAction = ""));
          }),
        );
        let h = ie(
            () => l.current.state === "active" && l.current.phase === "frozen",
          ),
          v = ie(
            () =>
              l.current.state === "active" && l.current.phase === "dragging",
          ),
          H = ie(
            () =>
              l.current.state === "active" && l.current.phase === "justDragged",
          ),
          F = ie(() => l.current.state === "copying"),
          y = ie(() => l.current.state === "justCopied"),
          w = ie(() => l.current.state === "active" && l.current.isPromptMode),
          b = ie(() => l.pendingCommentMode || w()),
          g = ie(
            () =>
              l.current.state === "active" &&
              l.current.isPromptMode &&
              l.current.isPendingDismiss,
          ),
          C = wo(),
          [O, V] = $(C?.enabled ?? true),
          [Q, X] = $(0),
          [ee, ye] = $(C),
          [ce, W] = $(false),
          [G, A] = $(Bl()),
          [I, U] = $(null),
          [q, x] = $(null),
          [T, K] = $(null),
          z,
          te = null,
          j = new Map(),
          [Ee, ve] = $(false),
          [N, B] = $(0),
          [oe, ke] = $(false),
          he = [],
          Pe = (a) => j.get(a) ?? [],
          fe = (a) => {
            let d = a.elementSelectors ?? [];
            if (d.length === 0) return [];
            let p = [];
            for (let E of d)
              if (E)
                try {
                  let _ = document.querySelector(E);
                  qe(_) && p.push(_);
                } catch {}
            return p;
          },
          Ce = (a) => {
            let d = Pe(a.id),
              p = d.filter((L) => qe(L));
            if (d.length > 0 && p.length === d.length) return p;
            let _ = fe(a);
            return _.length > 0 ? (j.set(a.id, _), _) : p;
          },
          $e = (a) => Ce(a)[0],
          Ie = ie(
            () => {
              I();
              let a = new Set();
              for (let d of G()) Ce(d).length === 0 && a.add(d.id);
              return a;
            },
            void 0,
            {
              equals: (a, d) => {
                if (a.size !== d.size) return false;
                for (let p of d) if (!a.has(p)) return false;
                return true;
              },
            },
          ),
          be = ie(() => l.pendingAbortSessionId),
          Ae = ie(() => l.hasAgentProvider),
          tt = () => {
            ht !== null && (clearTimeout(ht), (ht = null));
          },
          ot = () => {
            ((mn = false), (on = false), (zt = null));
          };
        (ge(() => {
          if (l.current.state !== "holding") {
            tt();
            return;
          }
          ((zt = Date.now()),
            (ht = window.setTimeout(() => {
              if (((ht = null), mn)) {
                on = true;
                return;
              }
              u.activate();
            }, l.keyHoldDuration)),
            _e(tt));
        }),
          ge(() => {
            if (
              l.current.state !== "active" ||
              l.current.phase !== "justDragged"
            )
              return;
            let a = setTimeout(() => {
              u.finishJustDragged();
            }, 1500);
            _e(() => clearTimeout(a));
          }),
          ge(() => {
            if (l.current.state !== "justCopied") return;
            let a = setTimeout(() => {
              u.finishJustCopied();
            }, 1500);
            _e(() => clearTimeout(a));
          }),
          ge(
            He(f, (a, d = false) => {
              !d ||
                a ||
                !m() ||
                (i.store.options.activationMode !== "hold" &&
                  u.setWasActivatedByToggle(true),
                i.hooks.onActivate());
            }),
          ));
        let mt = (a, d, p) => {
            (_o(a, d, p), u.clearInputText());
          },
          Rt = () => {
            let a = l.frozenElement || Z();
            a && u.enterPromptMode({ x: l.pointer.x, y: l.pointer.y }, a);
          },
          _o = (a, d, p) => (u.setCopyStart({ x: d, y: p }, a), ze(a)),
          ro = 0,
          Mn = 0,
          xt = 0,
          tn = 0,
          gt = null,
          [nn, dn] = $(null),
          fn = (a, d) => {
            (gt !== null && clearTimeout(gt),
              dn(null),
              (gt = window.setTimeout(() => {
                (dn({ x: a, y: d }), (gt = null));
              }, 32)));
          },
          st = null,
          ht = null,
          zt = null,
          mn = false,
          on = false,
          mi = 0,
          Nt = false,
          Lt = null,
          Re = null,
          Po = 0,
          ko = 0,
          bt = null,
          At = null,
          rn = false,
          [io, In] = $(null),
          [pi, so] = $(void 0),
          [sn, gi] = $([]),
          [Oo, hi] = $(null),
          [Rn, bi] = $([]),
          [Gs, Mo] = $(0),
          Nn = Yf(cn, ze),
          Vt = Jf(
            () => l.pointer,
            () => v(),
          ),
          pt = ie(() => m() && !F()),
          Io = ie(
            () =>
              i.store.theme.enabled &&
              i.store.theme.crosshair.enabled &&
              pt() &&
              !v() &&
              !l.isTouchMode &&
              !h() &&
              !w() &&
              !ce() &&
              l.contextMenuPosition === null,
          ),
          pn = new Map(),
          vt = (a, d) => {
            let p = `grabbed-${Date.now()}-${Math.random()}`,
              E = Date.now(),
              _ = { id: p, bounds: a, createdAt: E, element: d };
            (u.addGrabbedBox(_), i.hooks.onGrabbedBox(a, d));
            let L = window.setTimeout(() => {
              (pn.delete(p), u.removeGrabbedBox(p));
            }, 1500);
            pn.set(p, L);
          },
          yi = async (a) => {
            let d = await Promise.all(
              a.map(async (p) => {
                let E = await Tn(p),
                  _ = null,
                  L,
                  ae,
                  le;
                if (E && E.length > 0)
                  for (let xe of E) {
                    let je = xe.functionName && bo(xe.functionName),
                      Je = xe.fileName && ho(xe.fileName);
                    if (
                      (je && !_ && (_ = xe.functionName),
                      Je &&
                        !L &&
                        ((L = An(xe.fileName)),
                        (ae = xe.lineNumber || void 0),
                        (le = xe.columnNumber || void 0)),
                      _ && L)
                    )
                      break;
                  }
                _ || (_ = zr(p));
                let Me =
                  p instanceof HTMLElement ? p.innerText?.slice(0, Or) : void 0;
                return {
                  tagName: ct(p),
                  id: p.id || void 0,
                  className: p.getAttribute("class") || void 0,
                  textContent: Me,
                  componentName: _ ?? void 0,
                  filePath: L,
                  lineNumber: ae,
                  columnNumber: le,
                };
              }),
            );
            window.dispatchEvent(
              new CustomEvent("react-grab:element-selected", {
                detail: { elements: d },
              }),
            );
          },
          Ln = (a, d, p, E, _) => {
            u.clearLabelInstances();
            let L = `label-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              ae = a.x + a.width / 2,
              le = a.width / 2,
              Me = _?.mouseX,
              xe = Me !== void 0 ? Me - ae : void 0,
              je = {
                id: L,
                bounds: a,
                boundsMultiple: _?.boundsMultiple,
                tagName: d,
                componentName: p,
                status: E,
                createdAt: Date.now(),
                element: _?.element,
                elements: _?.elements,
                mouseX: Me,
                mouseXOffsetFromCenter: xe,
                mouseXOffsetRatio: xe !== void 0 && le > 0 ? xe / le : void 0,
                hideArrow: _?.hideArrow,
              };
            return (u.addLabelInstance(je), L);
          },
          Dt = (a) => {
            (Gt.delete(a), u.removeLabelInstance(a));
          },
          Gt = new Map(),
          gn = (a) => {
            let d = Gt.get(a);
            d !== void 0 && (window.clearTimeout(d), Gt.delete(a));
          },
          Ut = (a) => {
            gn(a);
            let d = window.setTimeout(() => {
              (Gt.delete(a),
                u.updateLabelInstance(a, "fading"),
                setTimeout(() => {
                  Dt(a);
                }, 150));
            }, 1500);
            Gt.set(a, d);
          },
          ao = (a, d) => {
            if (d) gn(a);
            else {
              let p = l.labelInstances.find((E) => E.id === a);
              p && p.status === "copied" && Ut(a);
            }
          },
          Us = async ({
            positionX: a,
            operation: d,
            bounds: p,
            tagName: E,
            componentName: _,
            element: L,
            shouldDeactivateAfter: ae,
            elements: le,
            existingInstanceId: Me,
          }) => {
            ((Nt = false), l.current.state !== "copying" && u.startCopy());
            let xe = Me ?? null;
            !xe &&
              p &&
              E &&
              (xe = Ln(p, E, _, "copying", {
                element: L,
                mouseX: a,
                elements: le,
              }));
            let je = false,
              Je;
            try {
              (await d(), (je = !0));
            } catch (it) {
              Je =
                it instanceof Error && it.message
                  ? it.message
                  : "Action failed";
            }
            (xe &&
              (je
                ? u.updateLabelInstance(xe, "copied")
                : u.updateLabelInstance(xe, "error", Je || "Unknown error"),
              Ut(xe)),
              l.current.state === "copying" &&
                (je && u.completeCopy(L),
                ae
                  ? nt()
                  : je
                    ? (u.activate(),
                      (Nt = true),
                      Lt !== null && window.clearTimeout(Lt),
                      (Lt = window.setTimeout(() => {
                        ((Nt = false), (Lt = null));
                      }, 1500)))
                    : u.unfreeze()));
          },
          wi = (a, d, p) => {
            let E = a[0],
              _ = p ?? (E ? zr(E) : null),
              L = E ? ct(E) : null,
              ae = _ ?? L ?? void 0;
            return Of(
              {
                maxContextLines: i.store.options.maxContextLines,
                getContent: i.store.options.getContent,
                componentName: ae,
              },
              {
                onBeforeCopy: i.hooks.onBeforeCopy,
                transformSnippet: i.hooks.transformSnippet,
                transformCopyContent: i.hooks.transformCopyContent,
                onAfterCopy: i.hooks.onAfterCopy,
                onCopySuccess: (le, Me) => {
                  i.hooks.onCopySuccess(le, Me);
                  let xe = le.length > 0,
                    je = !!d;
                  if (xe) {
                    let _t = G();
                    for (let [qt, yn] of j.entries()) {
                      if (
                        !(
                          yn.length === le.length &&
                          yn.every((ia, bp) => ia === le[bp])
                        )
                      )
                        continue;
                      let Hn = _t.find((ia) => ia.id === qt);
                      if (!Hn) continue;
                      if (
                        je
                          ? Hn.isComment && Hn.commentText === d
                          : !Hn.isComment
                      ) {
                        (zl(qt), j.delete(qt));
                        break;
                      }
                    }
                  }
                  let Je = le.map((_t, qt) => Bf(_t, qt === 0)),
                    it = lm({
                      content: Me,
                      elementName: ae ?? "element",
                      tagName: L ?? "div",
                      componentName: _ ?? void 0,
                      elementsCount: le.length,
                      previewBounds: le.map((_t) => ze(_t)),
                      elementSelectors: Je,
                      isComment: je,
                      commentText: d ?? void 0,
                      timestamp: Date.now(),
                    });
                  (A(it), ve(true), B((_t) => _t + 1));
                  let Ht = it[0];
                  Ht && xe && j.set(Ht.id, [...le]);
                  let Cr = new Set(it.map((_t) => _t.id));
                  for (let _t of j.keys()) Cr.has(_t) || j.delete(_t);
                },
                onCopyError: i.hooks.onCopyError,
              },
              a,
              d,
            );
          },
          xi = async (a, d, p) => {
            if (a.length === 0) return;
            let E = [],
              _ = [];
            for (let L of a) {
              let { wasIntercepted: ae, pendingResult: le } =
                i.hooks.onElementSelect(L);
              (ae || E.push(L),
                le && _.push(le),
                i.store.theme.grabbedBoxes.enabled && vt(ze(L), L));
            }
            if ((await Fu(), E.length > 0)) await wi(E, d, p);
            else if (_.length > 0 && !(await Promise.all(_)).every(Boolean))
              throw new Error("Failed to copy");
            yi(a);
          },
          k = ({
            element: a,
            positionX: d,
            elements: p,
            extraPrompt: E,
            shouldDeactivateAfter: _,
            onComplete: L,
            dragRect: ae,
          }) => {
            let le = p ?? [a],
              Me = ae ?? l.frozenDragRect,
              xe;
            Me && le.length > 1 ? (xe = Os(Me)) : (xe = Ms(ze(a)));
            let je = le.length > 1 ? xe.x + xe.width / 2 : d,
              Je = ct(a);
            ((Nt = false), u.startCopy());
            let it = Je
              ? Ln(xe, Je, void 0, "copying", {
                  element: a,
                  mouseX: je,
                  elements: p,
                })
              : null;
            tr(a).then((Ht) => {
              Us({
                positionX: je,
                operation: () => xi(le, E, Ht ?? void 0),
                bounds: xe,
                tagName: Je,
                componentName: Ht ?? void 0,
                element: a,
                shouldDeactivateAfter: _,
                elements: p,
                existingInstanceId: it,
              }).then(() => {
                L?.();
              });
            });
          },
          Z = ie(() => {
            if ((l.viewportVersion, !pt() || v())) return null;
            let a = l.detectedElement;
            return qe(a) ? a : null;
          }),
          P = ie(() => l.frozenElement || (h() ? null : Z()));
        (ge(() => {
          let a = l.detectedElement;
          if (!a) return;
          let d = setInterval(() => {
            qe(a) || u.setDetectedElement(null);
          }, 100);
          _e(() => clearInterval(d));
        }),
          ge(
            He(P, (a) => {
              if ((bt !== null && (clearTimeout(bt), (bt = null)), !a)) {
                In(null);
                return;
              }
              bt = window.setTimeout(() => {
                ((bt = null), In(a));
              }, 100);
            }),
          ),
          _e(() => {
            bt !== null && (clearTimeout(bt), (bt = null));
          }),
          ge(() => {
            let a = l.frozenElements,
              d = nf(a);
            _e(d);
          }),
          ge(
            He(m, (a) => {
              if (!a || !i.store.options.freezeReactUpdates) return;
              let d = ws();
              _e(d);
            }),
          ));
        let R = () => {
            if (l.isTouchMode && v()) {
              let d = l.detectedElement;
              return !d || Eo(d) ? void 0 : d;
            }
            let a = P();
            if (!(!a || Eo(a))) return a;
          },
          re = ie(() => R()),
          se = () =>
            re() ? (l.isTouchMode && v() ? pt() : pt() && !v()) : false,
          me = ie(() => {
            l.viewportVersion;
            let a = l.frozenElements;
            if (a.length === 0) return [];
            let d = l.frozenDragRect;
            return d && a.length > 1
              ? [Os(d)]
              : a.filter((p) => p !== null).map((p) => ze(p));
          }),
          De = ie(() => {
            l.viewportVersion;
            let a = l.frozenElements;
            if (a.length > 0) {
              let p = me();
              if (a.length === 1) {
                let _ = p[0];
                if (_) return _;
              }
              let E = l.frozenDragRect;
              return E ? (p[0] ?? Os(E)) : Ms(Ol(p));
            }
            let d = re();
            if (d) return ze(d);
          }),
          Ne = ie(() => l.frozenElements.length),
          Ue = (a, d) => {
            let p = a + window.scrollX,
              E = d + window.scrollY;
            return {
              x: Math.abs(p - l.dragStart.x),
              y: Math.abs(E - l.dragStart.y),
            };
          },
          Ye = ie(() => {
            if (!v()) return false;
            let a = Ue(l.pointer.x, l.pointer.y);
            return a.x > 2 || a.y > 2;
          }),
          dt = (a, d) => {
            let p = a + window.scrollX,
              E = d + window.scrollY,
              _ = Math.min(l.dragStart.x, p),
              L = Math.min(l.dragStart.y, E),
              ae = Math.abs(p - l.dragStart.x),
              le = Math.abs(E - l.dragStart.y);
            return {
              x: _ - window.scrollX,
              y: L - window.scrollY,
              width: ae,
              height: le,
            };
          },
          Le = ie(() => {
            if ((l.viewportVersion, !Ye())) return;
            let a = dt(l.pointer.x, l.pointer.y);
            return {
              borderRadius: "0px",
              height: a.height,
              transform: "none",
              width: a.width,
              x: a.x,
              y: a.y,
            };
          }),
          Tt = ie(() => {
            if ((l.viewportVersion, !Ye())) return [];
            let a = nn();
            if (!a) return [];
            let d = dt(a.x, a.y),
              p = li(d, cn);
            return (p.length > 0 ? p : li(d, cn, false)).map((_) => ze(_));
          }),
          Ot = ie(() => {
            let a = Tt();
            return a.length > 0 ? a : me();
          }),
          Ft = ie(() => {
            if (F() || w()) {
              l.viewportVersion;
              let a = l.frozenElement || Z();
              if (a) {
                let d = ze(a);
                return {
                  x: Cn(d).x + l.copyOffsetFromCenterX,
                  y: l.copyStart.y,
                };
              }
              return { x: l.copyStart.x, y: l.copyStart.y };
            }
            return { x: l.pointer.x, y: l.pointer.y };
          });
        (ge(
          He(
            () => [Z(), l.lastGrabbedElement],
            ([a, d]) => {
              (d && a && d !== a && u.setLastGrabbed(null),
                a && i.hooks.onElementHover(a));
            },
          ),
        ),
          ge(
            He(
              () => Z(),
              (a) => {
                let d = ++Po,
                  p = () => {
                    Po === d && u.setSelectionSource(null, null);
                  };
                if (!a) {
                  p();
                  return;
                }
                Tn(a)
                  .then((E) => {
                    if (Po === d && E) {
                      for (let _ of E)
                        if (_.fileName && ho(_.fileName)) {
                          u.setSelectionSource(
                            An(_.fileName),
                            _.lineNumber ?? null,
                          );
                          return;
                        }
                      p();
                    }
                  })
                  .catch(() => {
                    Po === d && u.setSelectionSource(null, null);
                  });
              },
            ),
          ),
          ge(
            He(
              () => l.viewportVersion,
              () => Ze._internal.updateBoundsOnViewportChange(),
            ),
          ));
        let vi = ie(() =>
            l.grabbedBoxes.map((a) => ({
              id: a.id,
              bounds: a.bounds,
              createdAt: a.createdAt,
            })),
          ),
          js = ie(() =>
            l.labelInstances.map((a) => ({
              id: a.id,
              status: a.status,
              tagName: a.tagName,
              componentName: a.componentName,
              createdAt: a.createdAt,
            })),
          ),
          mm = ie(() => {
            let a = m(),
              d = v(),
              p = F(),
              E = w(),
              _ = Io(),
              L = Z(),
              ae = Le(),
              le = i.store.theme.enabled,
              Me = i.store.theme.selectionBox.enabled,
              xe = i.store.theme.dragBox.enabled,
              je = Ye(),
              Je = P(),
              it = y(),
              Ht = !!(le && Me && a && !p && !it && !d && Je != null);
            return {
              isActive: a,
              isDragging: d,
              isCopying: p,
              isPromptMode: E,
              isCrosshairVisible: _ ?? false,
              isSelectionBoxVisible: Ht,
              isDragBoxVisible: !!(le && xe && a && !p && je),
              targetElement: L,
              dragBounds: ae
                ? { x: ae.x, y: ae.y, width: ae.width, height: ae.height }
                : null,
              grabbedBoxes: vi(),
              labelInstances: js(),
              selectionFilePath: l.selectionFilePath,
              toolbarState: ee(),
            };
          });
        (ge(
          He(mm, (a) => {
            i.hooks.onStateChange(a);
          }),
        ),
          ge(
            He(
              () => [w(), l.pointer.x, l.pointer.y, Z()],
              ([a, d, p, E]) => {
                i.hooks.onPromptModeChange(a, { x: d, y: p, targetElement: E });
              },
            ),
          ),
          ge(
            He(
              () => [Qs(), De(), Z()],
              ([a, d, p]) => {
                i.hooks.onSelectionBox(!!a, d ?? null, p);
              },
            ),
          ),
          ge(
            He(
              () => [ea(), Le()],
              ([a, d]) => {
                i.hooks.onDragBox(!!a, d ?? null);
              },
            ),
          ),
          ge(
            He(
              () => [Io(), l.pointer.x, l.pointer.y],
              ([a, d, p]) => {
                i.hooks.onCrosshair(!!a, { x: d, y: p });
              },
            ),
          ),
          ge(
            He(
              () => [
                Qm(),
                Jm(),
                Ft(),
                Z(),
                l.selectionFilePath,
                l.selectionLineNumber,
              ],
              ([a, d, p, E, _, L]) => {
                i.hooks.onElementLabel(!!a, d, {
                  x: p.x,
                  y: p.y,
                  content: "",
                  element: E ?? void 0,
                  tagName: (E && ct(E)) || void 0,
                  filePath: _ ?? void 0,
                  lineNumber: L ?? void 0,
                });
              },
            ),
          ));
        let Dn = null,
          Ci = (a) => {
            a
              ? (Dn ||
                  ((Dn = document.createElement("style")),
                  Dn.setAttribute("data-react-grab-cursor", ""),
                  document.head.appendChild(Dn)),
                (Dn.textContent = `* { cursor: ${a} !important; }`))
              : Dn && (Dn.remove(), (Dn = null));
          };
        ge(
          He(
            () => [m(), F(), w()],
            ([a, d, p]) => {
              Ci(d ? "progress" : a && !p ? "crosshair" : null);
            },
          ),
        );
        let lo = () => {
            let a = f();
            (u.activate(), a || i.hooks.onActivate());
          },
          pm = () => {
            (Lt !== null && (window.clearTimeout(Lt), (Lt = null)),
              (Nt = false));
          },
          nt = () => {
            let a = v(),
              d = l.previouslyFocusedElement;
            (u.deactivate(),
              br(),
              (At = null),
              (rn = false),
              a && (document.body.style.userSelect = ""),
              st && window.clearTimeout(st),
              Vt.stop(),
              d instanceof HTMLElement && qe(d) && d.focus(),
              i.hooks.onDeactivate());
          },
          Ul = () => {
            (f() && u.release(), m() && nt(), pm());
          },
          Ei = () => {
            (u.setWasActivatedByToggle(true), lo());
          },
          jl = (a, d, p) => {
            let E = d[0];
            if (qe(E)) {
              let _ = E.getBoundingClientRect(),
                L = _.top + _.height / 2;
              (u.setPointer({ x: a.position.x, y: L }),
                u.setFrozenElements(d),
                u.setInputText(a.context.prompt),
                u.setWasActivatedByToggle(true),
                p && u.setSelectedAgent(p),
                m() || lo());
            }
          },
          Wl = (a) => ({
            ...a,
            onAbort: (d, p) => {
              (a.onAbort?.(d, p), jl(d, p, a));
            },
            onUndo: (d, p) => {
              (a.onUndo?.(d, p), jl(d, p, a));
            },
          }),
          Ws = () => {
            let a = c();
            if (a) return Wl(a);
          },
          Ze = Rl(Ws(), {
            transformAgentContext: i.hooks.transformAgentContext,
          }),
          Kl = () => {
            u.clearLastCopied();
            let a = [...l.frozenElements],
              d = l.frozenElement || Z(),
              p = w() ? l.inputText.trim() : "";
            if (!d) {
              nt();
              return;
            }
            let E = a.length > 0 ? a : d ? [d] : [],
              _ = E.map((xe) => ze(xe)),
              L = _[0],
              ae = L.x + L.width / 2,
              le = L.y + L.height / 2,
              Me = ae + l.copyOffsetFromCenterX;
            if ((l.selectedAgent || Ae()) && p) {
              let xe = l.replySessionId,
                je = l.selectedAgent;
              (nt(),
                u.clearReplySessionId(),
                u.setSelectedAgent(null),
                Ze.session.start({
                  elements: E,
                  prompt: p,
                  position: { x: Me, y: le },
                  selectionBounds: _,
                  sessionId: xe ?? void 0,
                  agent: je ? Wl(je) : void 0,
                }));
              return;
            }
            (u.setPointer({ x: ae, y: le }),
              u.exitPromptMode(),
              u.clearInputText(),
              u.clearReplySessionId(),
              k({
                element: d,
                positionX: Me,
                elements: E,
                extraPrompt: p || void 0,
                onComplete: nt,
              }));
          },
          Si = () => {
            if ((u.clearLastCopied(), !w())) return;
            if (l.inputText.trim() && !g()) {
              u.setPendingDismiss(true);
              return;
            }
            (u.clearInputText(), u.clearReplySessionId(), nt());
          },
          gm = () => {
            (u.clearInputText(), u.clearReplySessionId(), nt());
          },
          hm = () => {
            u.setPendingDismiss(false);
          },
          bm = (a, d) => {
            (u.setPendingAbortSessionId(null), d && Ze.session.abort(a));
          },
          ym = () => {
            let a = l.frozenElement || Z();
            (a && mt(a, l.pointer.x, l.pointer.y), Rt());
          },
          wm = (a, d) => {
            let p = Ze.sessions().get(a),
              E = Ze.session.getElements(a),
              _ = p?.selectionBounds ?? [],
              L = _[0];
            if (p && E.length > 0 && L) {
              let ae = p.position.x,
                le = p.context.sessionId ?? a;
              (Ze.session.dismiss(a),
                Ze.session.start({
                  elements: E,
                  prompt: d,
                  position: { x: ae, y: L.y + L.height / 2 },
                  selectionBounds: _,
                  sessionId: le,
                }));
            }
          },
          xm = (a) => {
            let d = Ze.session.acknowledgeError(a);
            d && u.setInputText(d);
          },
          vm = () => {
            m() ? nt() : O() && ((rn = true), Ei());
          },
          Xl = (a, d, p) => {
            (u.setPendingCommentMode(false),
              u.clearInputText(),
              u.enterPromptMode({ x: d, y: p }, a));
          },
          Ks = (a, d) => {
            (u.showContextMenu(d, a), br(), cc(), i.hooks.onContextMenu(a, d));
          },
          Cm = () => {
            if (!O()) return;
            if (m() && b()) {
              nt();
              return;
            }
            (u.setPendingCommentMode(true), m() || Ei());
          },
          Em = () => {
            let a = !O();
            V(a);
            let d = wo(),
              p = {
                edge: d?.edge ?? "bottom",
                ratio: d?.ratio ?? en,
                collapsed: d?.collapsed ?? false,
                enabled: a,
              };
            (Yr(p), ye(p), no.forEach((E) => E(p)), a || (Ul(), cc()));
          },
          Sm = (a, d) => {
            if (!O() || w() || h() || l.contextMenuPosition !== null) return;
            (u.setPointer({ x: a, y: d }), (xt = a), (tn = d));
            let p = performance.now(),
              E = Mn > 0 && p - Mn < 200;
            if (
              (p - ro >= 32 &&
                !E &&
                ((ro = p),
                (Mn = p),
                tm(() => {
                  let _ = dr(xt, tn);
                  (_ !== l.detectedElement && u.setDetectedElement(_),
                    (Mn = 0));
                })),
              v())
            ) {
              fn(a, d);
              let _ = Nl(a, d),
                L = _.top || _.bottom || _.left || _.right;
              L && !Vt.isActive()
                ? Vt.start()
                : !L && Vt.isActive() && Vt.stop();
            }
          },
          Am = (a, d) =>
            !pt() || F()
              ? false
              : (u.startDrag({ x: a, y: d }),
                u.setPointer({ x: a, y: d }),
                (document.body.style.userSelect = "none"),
                fn(a, d),
                i.hooks.onDragStart(a + window.scrollX, d + window.scrollY),
                true),
          Tm = (a, d) => {
            let p = li(a, cn),
              E = p.length > 0 ? p : li(a, cn, false);
            if (E.length === 0) return;
            (ur(E), i.hooks.onDragEnd(E, a));
            let _ = E[0],
              L = Cn(ze(_));
            (u.setPointer(L), u.setFrozenElements(E));
            let ae = kl(a);
            if (
              (u.setFrozenDragRect(ae),
              u.freeze(),
              u.setLastGrabbed(_),
              l.pendingCommentMode)
            ) {
              Xl(_, L.x, L.y);
              return;
            }
            if (rn) {
              ((rn = false), Ks(_, L));
              return;
            }
            let le = l.wasActivatedByToggle && !d;
            k({
              element: _,
              positionX: L.x,
              elements: E,
              shouldDeactivateAfter: le,
              dragRect: ae,
            });
          },
          _m = (a, d, p) => {
            let E = qe(l.frozenElement) ? l.frozenElement : null,
              _ = qe(At) ? At : null,
              L =
                E ??
                _ ??
                dr(a, d) ??
                (qe(l.detectedElement) ? l.detectedElement : null);
            if (!L) return;
            let ae = !E && _ === L,
              le,
              Me;
            if (E) ((le = l.pointer.x), (Me = l.pointer.y));
            else if (ae) {
              let je = Cn(ze(L));
              ((le = je.x), (Me = je.y));
            } else ((le = a), (Me = d));
            if (((At = null), l.pendingCommentMode)) {
              Xl(L, le, Me);
              return;
            }
            if (rn) {
              rn = false;
              let { wasIntercepted: je } = i.hooks.onElementSelect(L);
              if (je) return;
              (ur([L]), u.setFrozenElement(L));
              let Je = { x: le, y: Me };
              (u.setPointer(Je), u.freeze(), Ks(L, Je));
              return;
            }
            let xe = l.wasActivatedByToggle && !p;
            (u.setLastGrabbed(L),
              k({ element: L, positionX: le, shouldDeactivateAfter: xe }));
          },
          Yl = () => {
            v() &&
              (u.cancelDrag(),
              Vt.stop(),
              (document.body.style.userSelect = ""));
          },
          Pm = (a, d, p) => {
            if (!v()) return;
            (gt !== null && (clearTimeout(gt), (gt = null)), dn(null));
            let E = Ue(a, d),
              _ = E.x > 2 || E.y > 2,
              L = _ ? dt(a, d) : null;
            (_ ? u.endDrag() : u.cancelDrag(),
              Vt.stop(),
              (document.body.style.userSelect = ""),
              L ? Tm(L, p) : _m(a, d, p));
          },
          rt = Pf(),
          Ai = Zf(),
          Ro = (a) => {
            let d;
            try {
              d = Ai.originalKeyDescriptor?.get
                ? Ai.originalKeyDescriptor.get.call(a)
                : a.key;
            } catch {
              return false;
            }
            let p = d === "Enter" || To(a.code),
              E = m() || f();
            return p && E && !w() && !l.wasActivatedByToggle && T() === null
              ? (Ai.claimedEvents.add(a),
                a.preventDefault(),
                a.stopImmediatePropagation(),
                true)
              : false;
          };
        (rt.addDocumentListener("keydown", Ro, { capture: true }),
          rt.addDocumentListener("keyup", Ro, { capture: true }),
          rt.addDocumentListener("keypress", Ro, { capture: true }));
        let km = (a) => {
            if (
              !(a.code === "KeyZ" && (a.metaKey || a.ctrlKey)) ||
              Array.from(Ze.sessions().values()).some(
                (_) => !_.isStreaming && !_.error,
              )
            )
              return false;
            let E = a.shiftKey;
            return E && Ze.canRedo()
              ? (a.preventDefault(),
                a.stopPropagation(),
                Ze.history.redo(),
                true)
              : !E && Ze.canUndo()
                ? (a.preventDefault(),
                  a.stopPropagation(),
                  Ze.history.undo(),
                  true)
                : false;
          },
          br = () => {
            (bi([]), Mo(0), Nn.clearHistory());
          },
          Xs = (a) => {
            (u.setFrozenElement(a), u.freeze(), (At = a));
            let d = ze(a),
              p = Cn(d);
            (u.setPointer(p),
              l.contextMenuPosition !== null && u.showContextMenu(p, a));
          },
          ql = (a) => {
            let d = ze(a),
              p = ks(d),
              E = Es(p.x, p.y).filter(cn).reverse();
            (bi(E), Mo(Math.max(0, E.indexOf(a))));
          },
          Om = (a) => {
            let d = Rn()[a];
            d && (Mo(a), Nn.clearHistory(), Xs(d));
          },
          Zl = (a) => {
            if (!m() || w() || !ha.has(a.key)) return false;
            let d = P(),
              p = !d;
            if (
              (d || (d = dr(window.innerWidth / 2, window.innerHeight / 2)), !d)
            )
              return false;
            if (!(a.key === "ArrowUp" || a.key === "ArrowDown")) {
              br();
              let le = Nn.findNext(a.key, d);
              return !le && !p
                ? false
                : (a.preventDefault(), a.stopPropagation(), Xs(le ?? d), true);
            }
            Rn().length === 0 && ql(d);
            let L = Nn.findNext(a.key, d) ?? d;
            (a.preventDefault(), a.stopPropagation(), Xs(L));
            let ae = Rn().indexOf(L);
            return (ae !== -1 ? Mo(ae) : ql(L), true);
          },
          Mm = (a) => {
            if (!To(a.code) || St(a)) return false;
            let d = l.lastCopiedElement;
            if (
              !f() &&
              !w() &&
              !m() &&
              d &&
              qe(d) &&
              !l.labelInstances.some(
                (_) => _.status === "copied" || _.status === "fading",
              )
            ) {
              (a.preventDefault(), a.stopImmediatePropagation());
              let _ = Cn(ze(d));
              return (
                u.setPointer(_),
                mt(d, _.x, _.y),
                u.setFrozenElement(d),
                u.clearLastCopied(),
                Rt(),
                m() || lo(),
                true
              );
            }
            if (f() && !w()) {
              (a.preventDefault(), a.stopImmediatePropagation());
              let _ = l.frozenElement || Z();
              return (
                _ && mt(_, l.pointer.x, l.pointer.y),
                u.setPointer({ x: l.pointer.x, y: l.pointer.y }),
                _ && u.setFrozenElement(_),
                Rt(),
                st !== null && (window.clearTimeout(st), (st = null)),
                m() || lo(),
                true
              );
            }
            return false;
          },
          Im = (a) => {
            if (
              a.key?.toLowerCase() !== "o" ||
              w() ||
              !m() ||
              !(a.metaKey || a.ctrlKey)
            )
              return false;
            let d = l.selectionFilePath,
              p = l.selectionLineNumber;
            return d
              ? (a.preventDefault(),
                a.stopPropagation(),
                i.hooks.onOpenFile(d, p ?? void 0) ||
                  nr(d, p ?? void 0, i.hooks.transformOpenFileUrl),
                true)
              : false;
          },
          Jl = () => {
            Re !== null && (window.clearTimeout(Re), (Re = null));
          },
          No = () => {
            (Jl(), gi([]), hi(null));
          },
          Ql = ie(
            () =>
              !!re() && pt() && !w() && !v() && l.contextMenuPosition === null,
          ),
          Rm = ie(() => ({
            items: sn(),
            activeIndex: Oo(),
            isVisible: Oo() !== null && sn().length > 0,
          })),
          Nm = ie(() =>
            Rn().map((a) => ({
              tagName: ct(a) || "element",
              componentName: zr(a) ?? void 0,
            })),
          ),
          Lm = ie(() => ({
            items: Nm(),
            activeIndex: Gs(),
            isVisible: Rn().length > 0,
          }));
        (ge(
          He(re, () => {
            No();
          }),
        ),
          ge(
            He(Ql, (a) => {
              a || No();
            }),
          ));
        let Dm = (a) => i.store.actions.find((d) => d.id === a),
          Fm = () => {
            let a = re();
            if (!a) return;
            let d = De();
            return sc({
              element: a,
              filePath: l.selectionFilePath ?? void 0,
              lineNumber: l.selectionLineNumber ?? void 0,
              tagName: ct(a) || void 0,
              componentName: pi(),
              position: l.pointer,
              performWithFeedbackOptions: {
                fallbackBounds: d,
                fallbackSelectionBounds: d ? [d] : [],
              },
              shouldDeferHideContextMenu: false,
              onBeforePrompt: No,
            });
          },
          Hm = ie(() => {
            if (!re()) return [];
            let a = [];
            for (let d of i.store.actions)
              (typeof d.enabled == "boolean" && !d.enabled) ||
                a.push({ id: d.id, label: d.label, shortcut: d.shortcut });
            return a;
          }),
          $m = () => {
            (Jl(),
              (Re = window.setTimeout(() => {
                Re = null;
                let a = Oo(),
                  d = sn();
                if (a === null || d.length === 0) return;
                let p = d[a];
                if (!p) return;
                let E = Dm(p.id);
                if (!E) {
                  No();
                  return;
                }
                let _ = Fm();
                if (!_ || !si(E, _)) {
                  No();
                  return;
                }
                No();
                E.onAction(_);
              }, 600)));
          },
          Bm = () => {
            if (!Ql()) return false;
            let a = Hm();
            if (a.length === 0) return false;
            gi(a);
            let d = Oo(),
              E = d !== null && d < a.length ? (d + 1) % a.length : 0;
            return (hi(E), $m(), true);
          },
          zm = (a) =>
            a.code !== "KeyC" || a.altKey || a.repeat || St(a) || !Bm()
              ? false
              : (a.preventDefault(),
                a.stopPropagation(),
                (a.metaKey || a.ctrlKey) && a.stopImmediatePropagation(),
                true),
          Vm = (a) => {
            if (
              !(!i.store.options.allowActivationInsideInput && St(a)) &&
              !(
                !Ns(a, i.store.options) &&
                ((a.metaKey || a.ctrlKey) &&
                  !Jc.includes(a.key) &&
                  !To(a.code) &&
                  (m() && !l.wasActivatedByToggle
                    ? nt()
                    : f() && (tt(), ot(), u.release())),
                !To(a.code) || !f())
              )
            ) {
              if (
                ((m() || f()) &&
                  !w() &&
                  (a.preventDefault(),
                  To(a.code) && a.stopImmediatePropagation()),
                m())
              ) {
                if (
                  (l.wasActivatedByToggle &&
                    i.store.options.activationMode !== "hold") ||
                  a.repeat
                )
                  return;
                (st !== null && window.clearTimeout(st),
                  (st = window.setTimeout(() => {
                    nt();
                  }, 200)));
                return;
              }
              if (f() && a.repeat) {
                if (mn) {
                  let d = on;
                  (ot(), d && u.activate());
                }
                return;
              }
              if (!(F() || y()) && !f()) {
                let p = i.store.options.keyHoldDuration ?? 100;
                (St(a) ? (Ru(a) ? (p += 600) : (p += 400)) : Nu() && (p += 600),
                  ot(),
                  u.startHold(p));
              }
            }
          };
        (rt.addWindowListener(
          "keydown",
          (a) => {
            if ((Ro(a), !O())) {
              Ns(a, i.store.options) && !a.repeat && X((L) => L + 1);
              return;
            }
            if (km(a)) return;
            let d = To(a.code) && f() && !w(),
              p = kt(a, "data-react-grab-input");
            if (w() && Ns(a, i.store.options) && !a.repeat && !p) {
              (a.preventDefault(), a.stopPropagation(), Si());
              return;
            }
            if (a.key === "Escape" && T() !== null) return;
            if (a.key === "Escape" && I() !== null) {
              Yt();
              return;
            }
            if (q() !== null) {
              if (a.key === "Escape") {
                uo();
                return;
              }
              let L = i.store.toolbarActions,
                ae = (a.metaKey || a.ctrlKey) && !a.repeat,
                le = L.find((Me) =>
                  Me.shortcut
                    ? a.key === "Enter"
                      ? Me.shortcut === "Enter"
                      : ae && a.key.toLowerCase() === Me.shortcut.toLowerCase()
                    : false,
                );
              le &&
                ai(le) &&
                (a.preventDefault(), a.stopPropagation(), le.onAction(), uo());
              return;
            }
            let E = kt(a, "data-react-grab-ignore-events") && !d;
            if (w() || E)
              return (
                a.key === "Escape" &&
                  (be()
                    ? (a.preventDefault(),
                      a.stopPropagation(),
                      u.setPendingAbortSessionId(null))
                    : w()
                      ? Si()
                      : l.wasActivatedByToggle && nt()),
                E && ha.has(a.key) && Zl(a),
                void 0
              );
            if (a.key === "Escape") {
              if (be()) {
                (a.preventDefault(),
                  a.stopPropagation(),
                  u.setPendingAbortSessionId(null));
                return;
              }
              if (Ze.isProcessing()) return;
              if (f() || l.wasActivatedByToggle) {
                nt();
                return;
              }
            }
            let _ = Date.now() - mi < 200;
            (!_ && zm(a)) || Zl(a) || Mm(a) || Im(a) || _ || Vm(a);
          },
          { capture: true },
        ),
          rt.addWindowListener(
            "keyup",
            (a) => {
              if (Ro(a)) return;
              let d = qf(i.store.options),
                p =
                  d.metaKey || d.ctrlKey
                    ? Pn()
                      ? !a.metaKey
                      : !a.ctrlKey
                    : (d.shiftKey && !a.shiftKey) || (d.altKey && !a.altKey),
                E = i.store.options.activationKey
                  ? typeof i.store.options.activationKey == "function"
                    ? i.store.options.activationKey(a)
                    : Rs(i.store.options.activationKey)(a)
                  : Is(a.key, a.code);
              if (y() || Nt) {
                (E || p) && ((Nt = false), nt());
                return;
              }
              if ((!f() && !m()) || w()) return;
              let _ = !!i.store.options.activationKey,
                L = i.store.options.activationMode === "hold";
              if (m()) {
                let ae = l.contextMenuPosition !== null;
                if (p) {
                  if (
                    (l.wasActivatedByToggle &&
                      i.store.options.activationMode !== "hold") ||
                    ae
                  )
                    return;
                  nt();
                } else if (L && E) {
                  if (
                    (st !== null && (window.clearTimeout(st), (st = null)), ae)
                  )
                    return;
                  nt();
                } else
                  !_ &&
                    E &&
                    st !== null &&
                    (window.clearTimeout(st), (st = null));
                return;
              }
              if (E || p) {
                if (
                  l.wasActivatedByToggle &&
                  i.store.options.activationMode !== "hold"
                )
                  return;
                if (f() || (on && p)) {
                  tt();
                  let Me = (zt ? Date.now() - zt : 0) >= 200,
                    xe =
                      on &&
                      Me &&
                      (i.store.options.allowActivationInsideInput || !St(a));
                  (ot(), xe ? u.activate() : u.release());
                } else nt();
              }
            },
            { capture: true },
          ),
          rt.addDocumentListener("copy", () => {
            f() && (mn = true);
          }),
          rt.addWindowListener("keypress", Ro, { capture: true }),
          rt.addWindowListener(
            "pointermove",
            (a) => {
              if (!a.isPrimary) return;
              let d = a.pointerType === "touch";
              if (
                (u.setTouchMode(d),
                kt(a, "data-react-grab-ignore-events") ||
                  l.contextMenuPosition !== null ||
                  (d && !f() && !m()))
              )
                return;
              ((d ? f() : m()) && !w() && h() && (u.unfreeze(), br()),
                Sm(a.clientX, a.clientY));
            },
            { passive: true },
          ),
          rt.addWindowListener(
            "pointerdown",
            (a) => {
              if (
                a.button !== 0 ||
                !a.isPrimary ||
                (u.setTouchMode(a.pointerType === "touch"),
                kt(a, "data-react-grab-ignore-events")) ||
                l.contextMenuPosition !== null ||
                q() !== null
              )
                return;
              if (w()) {
                let p = De();
                p &&
                a.clientX >= p.x &&
                a.clientX <= p.x + p.width &&
                a.clientY >= p.y &&
                a.clientY <= p.y + p.height
                  ? Kl()
                  : Si();
                return;
              }
              Am(a.clientX, a.clientY) &&
                (document.documentElement.setPointerCapture(a.pointerId),
                a.preventDefault(),
                a.stopImmediatePropagation());
            },
            { capture: true },
          ),
          rt.addWindowListener(
            "pointerup",
            (a) => {
              if (
                a.button !== 0 ||
                !a.isPrimary ||
                kt(a, "data-react-grab-ignore-events") ||
                l.contextMenuPosition !== null
              )
                return;
              let d = pt() || F() || v(),
                p = a.metaKey || a.ctrlKey;
              (Pm(a.clientX, a.clientY, p),
                d && (a.preventDefault(), a.stopImmediatePropagation()));
            },
            { capture: true },
          ),
          rt.addWindowListener(
            "contextmenu",
            (a) => {
              if (!pt() || F() || w()) return;
              let d = kt(a, "data-react-grab-ignore-events");
              if (d && Rn().length > 0) br();
              else if (d) return;
              if (l.contextMenuPosition !== null) {
                a.preventDefault();
                return;
              }
              (a.preventDefault(), a.stopPropagation());
              let p = dr(a.clientX, a.clientY);
              if (!p) return;
              let E = l.frozenElements;
              E.length > 1 && E.includes(p)
                ? ur(E)
                : (ur([p]), u.setFrozenElement(p));
              let L = { x: a.clientX, y: a.clientY };
              (u.setPointer(L), u.freeze(), Ks(p, L));
            },
            { capture: true },
          ),
          rt.addWindowListener("pointercancel", (a) => {
            a.isPrimary && Yl();
          }),
          rt.addWindowListener(
            "click",
            (a) => {
              kt(a, "data-react-grab-ignore-events") ||
                (l.contextMenuPosition === null &&
                  (pt() || F() || H()) &&
                  (a.preventDefault(),
                  a.stopImmediatePropagation(),
                  l.wasActivatedByToggle &&
                    !F() &&
                    !w() &&
                    (f() ? u.setWasActivatedByToggle(false) : nt())));
            },
            { capture: true },
          ),
          rt.addDocumentListener("visibilitychange", () => {
            if (document.hidden) {
              u.clearGrabbedBoxes();
              let a = l.activationTimestamp;
              m() && !w() && a !== null && Date.now() - a > 500 && nt();
            }
          }),
          rt.addWindowListener("blur", () => {
            (Yl(), f() && (tt(), u.release(), ot()));
          }),
          rt.addWindowListener("focus", () => {
            mi = Date.now();
          }));
        let Gm = () => {
            if (
              !(l.isTouchMode && !f() && !m()) &&
              O() &&
              !w() &&
              !h() &&
              !v() &&
              l.contextMenuPosition === null &&
              l.frozenElements.length === 0
            ) {
              let a = dr(l.pointer.x, l.pointer.y);
              u.setDetectedElement(a);
            }
          },
          Ti = () => {
            (zf(),
              Gm(),
              u.incrementViewportVersion(),
              u.updateSessionBounds(),
              u.updateContextMenuPosition());
          };
        rt.addWindowListener("scroll", Ti, { capture: true });
        let Ys = window.innerWidth,
          qs = window.innerHeight;
        rt.addWindowListener("resize", () => {
          let a = window.innerWidth,
            d = window.innerHeight;
          if (Ys > 0 && qs > 0) {
            let p = a / Ys,
              E = d / qs,
              _ = Math.abs(p - E) < Aa,
              L = Math.abs(p - 1) > Aa;
            _ && L && u.setPointer({ x: l.pointer.x * p, y: l.pointer.y * E });
          }
          ((Ys = a), (qs = d), Ti());
        });
        let Zs = window.visualViewport;
        if (Zs) {
          let { signal: a } = rt;
          (Zs.addEventListener("resize", Ti, { signal: a }),
            Zs.addEventListener("scroll", Ti, { signal: a }));
        }
        let co = null,
          Fn = null,
          Um = () => {
            let a =
              i.store.theme.enabled &&
              (m() ||
                F() ||
                l.labelInstances.length > 0 ||
                l.grabbedBoxes.length > 0 ||
                Ze.sessions().size > 0);
            a && co === null
              ? (co = window.setInterval(() => {
                  Fn === null &&
                    (Fn = Ve(() => {
                      ((Fn = null),
                        u.incrementViewportVersion(),
                        u.updateSessionBounds());
                    }));
                }, 100))
              : !a &&
                co !== null &&
                (window.clearInterval(co),
                (co = null),
                Fn !== null && (Ge(Fn), (Fn = null)));
          };
        (ge(() => {
          (i.store.theme.enabled,
            m(),
            F(),
            l.labelInstances.length,
            l.grabbedBoxes.length,
            Ze.sessions().size,
            Um());
        }),
          _e(() => {
            (co !== null && window.clearInterval(co), Fn !== null && Ge(Fn));
          }),
          rt.addDocumentListener(
            "copy",
            (a) => {
              w() ||
                kt(a, "data-react-grab-ignore-events") ||
                ((pt() || F()) && a.preventDefault());
            },
            { capture: true },
          ),
          _e(() => {
            (rt.abort(),
              gt !== null && window.clearTimeout(gt),
              st && window.clearTimeout(st),
              Lt && window.clearTimeout(Lt),
              Re && window.clearTimeout(Re),
              te !== null && Ge(te),
              pn.forEach((a) => window.clearTimeout(a)),
              pn.clear(),
              Vt.stop(),
              (document.body.style.userSelect = ""),
              (document.body.style.touchAction = ""),
              Ci(null),
              Ai.restore());
          }));
        let Js = Du(fa),
          yr = ie(() => i.store.theme.enabled),
          jm = ie(() => i.store.theme.selectionBox.enabled),
          ec = ie(() => i.store.theme.elementLabel.enabled),
          Wm = ie(() => i.store.theme.dragBox.enabled),
          tc = ie(() => y() || (ce() && !h())),
          Km = ie(() => Tt().length > 0),
          Qs = ie(() => (!yr() || !jm() || tc() ? false : Km() ? true : se())),
          Xm = ie(() => {
            let a = re();
            if (a) return ct(a) || void 0;
          });
        ge(
          He(
            () => io(),
            (a) => {
              let d = ++ko;
              if (!a) {
                so(void 0);
                return;
              }
              tr(a)
                .then((p) => {
                  ko === d && so(p ?? void 0);
                })
                .catch(() => {
                  ko === d && so(void 0);
                });
            },
          ),
        );
        let Ym = ie(() =>
            l.contextMenuPosition !== null || !ec() || tc() ? false : se(),
          ),
          _i = new Map(),
          qm = ie(() => {
            if (!yr()) return [];
            if (!i.store.theme.grabbedBoxes.enabled) return [];
            l.viewportVersion;
            let a = new Set(l.labelInstances.map((d) => d.id));
            for (let d of _i.keys()) a.has(d) || _i.delete(d);
            return l.labelInstances.map((d) => {
              let p = d.elements && d.elements.length > 1,
                E = d.element,
                L = !p && E && document.body.contains(E) ? ze(E) : d.bounds,
                ae = _i.get(d.id),
                le =
                  ae &&
                  ae.bounds.x === L.x &&
                  ae.bounds.y === L.y &&
                  ae.bounds.width === L.width &&
                  ae.bounds.height === L.height;
              if (
                ae &&
                ae.status === d.status &&
                ae.errorMessage === d.errorMessage &&
                le
              )
                return ae;
              let Me = L.x + L.width / 2,
                xe = L.width / 2,
                je =
                  d.mouseXOffsetRatio !== void 0 && xe > 0
                    ? Me + d.mouseXOffsetRatio * xe
                    : d.mouseXOffsetFromCenter !== void 0
                      ? Me + d.mouseXOffsetFromCenter
                      : d.mouseX,
                Je = { ...d, bounds: L, mouseX: je };
              return (_i.set(d.id, Je), Je);
            });
          }),
          Zm = ie(() =>
            yr()
              ? i.store.theme.grabbedBoxes.enabled
                ? (l.viewportVersion,
                  l.grabbedBoxes.map((a) =>
                    !a.element || !document.body.contains(a.element)
                      ? a
                      : { ...a, bounds: ze(a.element) },
                  ))
                : []
              : [],
          ),
          ea = ie(() => yr() && Wm() && pt() && Ye()),
          Jm = ie(() => (F() ? "processing" : "hover")),
          Qm = ie(() => {
            if (!yr()) return false;
            let a = ec(),
              d = w(),
              p = F(),
              E = pt(),
              _ = v(),
              L = !!P(),
              ae = ce(),
              le = h();
            return !a || d || (ae && !le) ? false : p ? true : E && !_ && L;
          }),
          nc = ie(() => {
            l.viewportVersion;
            let a = l.contextMenuElement;
            return a ? ze(a) : null;
          }),
          ep = ie(() => (l.viewportVersion, l.contextMenuPosition)),
          oc = ie(() => {
            let a = l.contextMenuElement;
            if (!a) return;
            let d = l.frozenElements.length;
            return d > 1 ? `${d} elements` : ct(a) || void 0;
          }),
          [rc] = ua(
            () => ({
              element: l.contextMenuElement,
              frozenCount: l.frozenElements.length,
            }),
            async ({ element: a, frozenCount: d }) =>
              !a || d > 1 ? void 0 : ((await tr(a)) ?? void 0),
          ),
          [ic] = ua(
            () => l.contextMenuElement,
            async (a) => {
              if (!a) return null;
              let d = await Tn(a);
              return ol(d);
            },
          ),
          tp = (a, d, p, E, _) => async (L) => {
            let ae = _?.fallbackBounds ?? null,
              le = _?.fallbackSelectionBounds ?? [],
              Me = _?.position ?? l.contextMenuPosition ?? l.pointer,
              xe = me(),
              je = nc() ?? ae,
              Je = d.length > 1,
              it = Je ? Ms(Ol(xe)) : je,
              Ht = l.wasActivatedByToggle,
              Cr = Je ? xe : je ? [je] : le;
            if ((u.hideContextMenu(), it)) {
              let _t = Je ? it.x + it.width / 2 : Me.x,
                qt = Ln(it, p || "element", E, "copying", {
                  element: a,
                  mouseX: _t,
                  elements: Je ? d : void 0,
                  boundsMultiple: Cr,
                }),
                yn = false,
                fo;
              try {
                ((yn = await L()), yn || (fo = "Failed to copy"));
              } catch (Hn) {
                fo =
                  Hn instanceof Error && Hn.message
                    ? Hn.message
                    : "Action failed";
              }
              (u.updateLabelInstance(
                qt,
                yn ? "copied" : "error",
                yn ? void 0 : fo || "Unknown error",
              ),
                Ut(qt));
            } else
              try {
                await L();
              } catch {}
            Ht ? nt() : u.unfreeze();
          },
          ta = () => {
            setTimeout(() => {
              u.hideContextMenu();
            }, 0);
          },
          sc = (a) => {
            let {
                element: d,
                filePath: p,
                lineNumber: E,
                tagName: _,
                componentName: L,
                position: ae,
                performWithFeedbackOptions: le,
                shouldDeferHideContextMenu: Me,
                onBeforeCopy: xe,
                onBeforePrompt: je,
                customEnterPromptMode: Je,
              } = a,
              it = l.frozenElements.length > 0 ? l.frozenElements : [d],
              Ht = Me ? ta : u.hideContextMenu,
              qt = {
                element: d,
                elements: it,
                filePath: p,
                lineNumber: E,
                componentName: L,
                tagName: _,
                enterPromptMode:
                  Je ??
                  ((fo) => {
                    (fo && u.setSelectedAgent(fo),
                      u.clearLabelInstances(),
                      je?.(),
                      mt(d, ae.x, ae.y),
                      u.setPointer({ x: ae.x, y: ae.y }),
                      u.setFrozenElement(d),
                      Rt(),
                      m() || lo(),
                      Ht());
                  }),
                copy: () => {
                  (xe?.(),
                    k({
                      element: d,
                      positionX: ae.x,
                      elements: it.length > 1 ? it : void 0,
                      shouldDeactivateAfter: l.wasActivatedByToggle,
                    }),
                    Ht());
                },
                hooks: {
                  transformHtmlContent: i.hooks.transformHtmlContent,
                  onOpenFile: i.hooks.onOpenFile,
                  transformOpenFileUrl: i.hooks.transformOpenFileUrl,
                },
                performWithFeedback: tp(d, it, _, L, le),
                hideContextMenu: Ht,
                cleanup: () => {
                  l.wasActivatedByToggle ? nt() : u.unfreeze();
                },
              },
              yn = i.hooks.transformActionContext(qt);
            return { ...qt, ...yn };
          },
          np = ie(() => {
            let a = l.contextMenuElement;
            if (!a) return;
            let d = ic(),
              p = l.contextMenuPosition ?? l.pointer;
            return sc({
              element: a,
              filePath: d?.filePath,
              lineNumber: d?.lineNumber,
              tagName: oc(),
              componentName: rc(),
              position: p,
              shouldDeferHideContextMenu: true,
              onBeforeCopy: () => {
                At = null;
              },
              customEnterPromptMode: (E) => {
                (E && u.setSelectedAgent(E),
                  u.clearLabelInstances(),
                  u.clearInputText(),
                  u.enterPromptMode(p, a),
                  ta());
              },
            });
          }),
          op = () => {
            setTimeout(() => {
              (u.hideContextMenu(), nt());
            }, 0);
          },
          hn = () => {
            for (let { boxId: a, labelId: d } of he)
              (u.removeGrabbedBox(a), d && u.removeLabelInstance(d));
            he = [];
          },
          rp = (a, d, p, E) => {
            if (d.length === 0) return;
            let _ = a.isComment && a.commentText;
            for (let [L, ae] of d.entries()) {
              let le = p[L],
                Me = `${E}-${a.id}-${L}`;
              u.addGrabbedBox({
                id: Me,
                bounds: ae,
                createdAt: 0,
                element: le,
              });
              let xe = null;
              (L === 0 &&
                ((xe = `${E}-label-${a.id}`),
                u.addLabelInstance({
                  id: xe,
                  bounds: ae,
                  tagName: a.tagName,
                  componentName: a.componentName,
                  elementsCount: a.elementsCount,
                  status: "idle",
                  isPromptMode: !!_,
                  inputValue: _ ? a.commentText : void 0,
                  createdAt: 0,
                  element: le,
                  mouseX: ae.x + ae.width / 2,
                })),
                he.push({ boxId: Me, labelId: xe }));
            }
          },
          ac = (a, d) => {
            let p = Ce(a),
              E = p.map((_) => ze(_));
            rp(a, E, p, d);
          },
          wr = () => {
            te !== null && (Ge(te), (te = null));
          },
          na = (a) => {
            wr();
            let d = () => {
              (a(), (te = Ve(d)));
            };
            d();
          },
          ip = (a) => {
            let d = a.left + a.width / 2,
              p = a.top + a.height / 2,
              E = p,
              _ = window.innerHeight - p,
              L = d,
              ae = window.innerWidth - d,
              le = Math.min(E, _, L, ae);
            return le === E
              ? "top"
              : le === L
                ? "left"
                : le === ae
                  ? "right"
                  : "bottom";
          },
          oa = () => {
            if (!z) return null;
            let a = z.getBoundingClientRect(),
              d = ip(a);
            return d === "left" || d === "right"
              ? {
                  x: d === "left" ? a.right : a.left,
                  y: a.top + a.height / 2,
                  edge: d,
                  toolbarWidth: a.width,
                }
              : {
                  x: a.left + a.width / 2,
                  y: d === "top" ? a.bottom : a.top,
                  edge: d,
                  toolbarWidth: a.width,
                };
          },
          Yt = () => {
            (Pi(), Lo(), wr(), hn(), U(null), ke(false));
          },
          lc = () => {
            (u.hideContextMenu(),
              uo(),
              vr(),
              A(Bl()),
              ve(false),
              na(() => {
                let a = oa();
                a && U(a);
              }));
          },
          xr = null,
          bn = null,
          Pi = () => {
            xr !== null && (clearTimeout(xr), (xr = null));
          },
          Lo = () => {
            bn !== null && (clearTimeout(bn), (bn = null));
          },
          uo = () => {
            (wr(), x(null));
          },
          sp = () => {
            (Yt(),
              uo(),
              na(() => {
                let a = oa();
                a && K(a);
              }));
          },
          vr = () => {
            (wr(), K(null));
          },
          cc = () => {
            (Yt(), uo(), vr());
          },
          ap = () => {
            q() !== null
              ? uo()
              : (u.hideContextMenu(),
                Yt(),
                vr(),
                na(() => {
                  let a = oa();
                  a && x(a);
                }));
          },
          lp = () => {
            (Pi(),
              Lo(),
              I() !== null ? (oe() ? (hn(), ke(false)) : Yt()) : (hn(), lc()));
          },
          uc = (a) => {
            Kt(a.content, {
              tagName: a.tagName,
              componentName: a.componentName ?? a.elementName,
              commentText: a.commentText,
            });
            let d = $e(a);
            d &&
              (u.clearLabelInstances(),
              Ve(() => {
                if (!qe(d)) return;
                let p = ze(d),
                  E = Ln(p, a.tagName, a.componentName, "copied", {
                    element: d,
                    mouseX: p.x + p.width / 2,
                  });
                Ut(E);
              }));
          },
          cp = (a) => {
            (hn(), w() && (u.exitPromptMode(), u.clearInputText()));
            let d = $e(a);
            if (a.isComment && a.commentText && d) {
              let p = ze(d),
                E = p.x + p.width / 2,
                _ = p.y + p.height / 2;
              (u.enterPromptMode({ x: E, y: _ }, d),
                u.setInputText(a.commentText));
            } else uc(a);
          },
          up = (a) => {
            (hn(), j.delete(a.id));
            let d = zl(a.id);
            (A(d), d.length === 0 && (ve(false), Yt()));
          },
          dc = () => {
            hn();
            let a = G();
            if (a.length === 0) return;
            let d = Ps(a.map((E) => E.content)),
              p = a[0];
            (Kt(d, {
              componentName: p.componentName ?? p.tagName,
              entries: a.map((E) => ({
                tagName: E.tagName,
                componentName: E.componentName ?? E.elementName,
                content: E.content,
                commentText: E.commentText,
              })),
            }),
              sp(),
              u.clearLabelInstances(),
              Ve(() => {
                Li(() => {
                  for (let E of a) {
                    let _ = Ce(E);
                    for (let L of _) {
                      let ae = ze(L),
                        le = `label-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                      (u.addLabelInstance({
                        id: le,
                        bounds: ae,
                        tagName: E.tagName,
                        componentName: E.componentName,
                        status: "copied",
                        createdAt: Date.now(),
                        element: L,
                        mouseX: ae.x + ae.width / 2,
                      }),
                        Ut(le));
                    }
                  }
                });
              }));
          },
          dp = (a) => {
            if ((hn(), !a)) return;
            let d = G().find((p) => p.id === a);
            d && ac(d, "history-hover");
          },
          fp = (a) => {
            (Pi(),
              hn(),
              a
                ? (Lo(),
                  I() === null &&
                    T() === null &&
                    (mc(),
                    (xr = setTimeout(() => {
                      ((xr = null), ke(true), lc());
                    }, Lr))))
                : oe() &&
                  (bn = setTimeout(() => {
                    ((bn = null), Yt());
                  }, Lr)));
          },
          mp = (a) => {
            a
              ? Lo()
              : oe() &&
                (bn = setTimeout(() => {
                  ((bn = null), Yt());
                }, Lr));
          },
          fc = (a) => {
            (hn(),
              a
                ? (Lo(), mc())
                : oe() &&
                  (bn = setTimeout(() => {
                    ((bn = null), Yt());
                  }, Lr)));
          },
          mc = () => {
            for (let a of G()) ac(a, "history-all-hover");
          },
          pc = () => {
            j.clear();
            let a = cm();
            (A(a), ve(false), Yt());
          },
          pp = (a) => {
            let d = Ze.sessions().get(a);
            if (!d) return;
            let p = Ze.session.getElement(a);
            p &&
              qe(p) &&
              setTimeout(() => {
                (m() || (u.setWasActivatedByToggle(true), lo()),
                  u.setPointer(d.position),
                  u.setFrozenElement(p),
                  u.freeze(),
                  u.showContextMenu(d.position, p));
              }, 0);
          },
          gp = (a) => {
            let d = l.labelInstances.find((L) => L.id === a);
            if (!d?.element || !qe(d.element)) return;
            let p = ze(d.element),
              E = { x: d.mouseX ?? p.x + p.width / 2, y: p.y + p.height / 2 },
              _ =
                d.elements && d.elements.length > 0
                  ? d.elements.filter((L) => qe(L))
                  : [d.element];
            setTimeout(() => {
              (m() || (u.setWasActivatedByToggle(true), lo()),
                u.setPointer(E),
                u.setFrozenElements(_),
                _.length > 1 && d.bounds && u.setFrozenDragRect(kl(d.bounds)),
                u.freeze(),
                u.showContextMenu(E, d.element));
            }, 0);
          };
        (ge(() => {
          let a = i.store.theme.hue;
          a !== 0
            ? (Js.style.filter = `hue-rotate(${a}deg)`)
            : (Js.style.filter = "");
        }),
          i.store.theme.enabled &&
            Lc(
              () =>
                S(_f, {
                  get selectionVisible() {
                    return Qs();
                  },
                  get selectionBounds() {
                    return De();
                  },
                  get selectionBoundsMultiple() {
                    return Ot();
                  },
                  get selectionShouldSnap() {
                    return l.frozenElements.length > 0 || Tt().length > 0;
                  },
                  get selectionElementsCount() {
                    return Ne();
                  },
                  get selectionFilePath() {
                    return l.selectionFilePath ?? void 0;
                  },
                  get selectionLineNumber() {
                    return l.selectionLineNumber ?? void 0;
                  },
                  get selectionTagName() {
                    return Xm();
                  },
                  get selectionComponentName() {
                    return pi();
                  },
                  get selectionLabelVisible() {
                    return Ym();
                  },
                  selectionLabelStatus: "idle",
                  get selectionActionCycleState() {
                    return Rm();
                  },
                  get selectionArrowNavigationState() {
                    return Lm();
                  },
                  onArrowNavigationSelect: Om,
                  get labelInstances() {
                    return qm();
                  },
                  get dragVisible() {
                    return ea();
                  },
                  get dragBounds() {
                    return Le();
                  },
                  get grabbedBoxes() {
                    return Zm();
                  },
                  labelZIndex: 2147483647,
                  get mouseX() {
                    return Be(() => l.frozenElements.length > 1)()
                      ? void 0
                      : Ft().x;
                  },
                  get mouseY() {
                    return Ft().y;
                  },
                  get crosshairVisible() {
                    return Io();
                  },
                  get isFrozen() {
                    return h() || m() || ce();
                  },
                  get inputValue() {
                    return l.inputText;
                  },
                  get isPromptMode() {
                    return w();
                  },
                  get hasAgent() {
                    return Ae();
                  },
                  get isAgentConnected() {
                    return l.isAgentConnected;
                  },
                  get agentSessions() {
                    return Ze.sessions();
                  },
                  get supportsUndo() {
                    return l.supportsUndo;
                  },
                  get supportsFollowUp() {
                    return l.supportsFollowUp;
                  },
                  get dismissButtonText() {
                    return l.dismissButtonText;
                  },
                  get onDismissSession() {
                    return Ze.session.dismiss;
                  },
                  get onUndoSession() {
                    return Ze.session.undo;
                  },
                  onFollowUpSubmitSession: wm,
                  onAcknowledgeSessionError: xm,
                  get onRetrySession() {
                    return Ze.session.retry;
                  },
                  onShowContextMenuSession: pp,
                  onShowContextMenuInstance: gp,
                  onLabelInstanceHoverChange: ao,
                  get onInputChange() {
                    return u.setInputText;
                  },
                  onInputSubmit: () => void Kl(),
                  onInputCancel: Si,
                  onToggleExpand: ym,
                  get isPendingDismiss() {
                    return g();
                  },
                  onConfirmDismiss: gm,
                  onCancelDismiss: hm,
                  get pendingAbortSessionId() {
                    return be();
                  },
                  onRequestAbortSession: (a) => u.setPendingAbortSessionId(a),
                  onAbortSession: bm,
                  get theme() {
                    return i.store.theme;
                  },
                  get toolbarVisible() {
                    return i.store.theme.toolbar.enabled;
                  },
                  get isActive() {
                    return m();
                  },
                  onToggleActive: vm,
                  get enabled() {
                    return O();
                  },
                  onToggleEnabled: Em,
                  get shakeCount() {
                    return Q();
                  },
                  onToolbarStateChange: (a) => {
                    (ye(a), no.forEach((d) => d(a)));
                  },
                  onSubscribeToToolbarStateChanges: (a) => (
                    no.add(a),
                    () => {
                      no.delete(a);
                    }
                  ),
                  onToolbarSelectHoverChange: W,
                  onToolbarRef: (a) => {
                    z = a;
                  },
                  get contextMenuPosition() {
                    return ep();
                  },
                  get contextMenuBounds() {
                    return nc();
                  },
                  get contextMenuTagName() {
                    return oc();
                  },
                  get contextMenuComponentName() {
                    return rc();
                  },
                  get contextMenuHasFilePath() {
                    return !!ic()?.filePath;
                  },
                  get actions() {
                    return i.store.actions;
                  },
                  get toolbarActions() {
                    return i.store.toolbarActions;
                  },
                  get actionContext() {
                    return np();
                  },
                  onContextMenuDismiss: op,
                  onContextMenuHide: ta,
                  get historyItems() {
                    return G();
                  },
                  get historyDisconnectedItemIds() {
                    return Ie();
                  },
                  get historyItemCount() {
                    return G().length;
                  },
                  get clockFlashTrigger() {
                    return N();
                  },
                  get hasUnreadHistoryItems() {
                    return Ee();
                  },
                  get historyDropdownPosition() {
                    return I();
                  },
                  get isHistoryPinned() {
                    return Be(() => I() !== null)() && !oe();
                  },
                  onToggleHistory: lp,
                  onCopyAll: dc,
                  onCopyAllHover: fc,
                  onHistoryButtonHover: fp,
                  onHistoryItemSelect: cp,
                  onHistoryItemRemove: up,
                  onHistoryItemCopy: uc,
                  onHistoryItemHover: dp,
                  onHistoryCopyAll: dc,
                  onHistoryCopyAllHover: fc,
                  onHistoryClear: pc,
                  onHistoryDismiss: Yt,
                  onHistoryDropdownHover: mp,
                  get toolbarMenuPosition() {
                    return q();
                  },
                  onToggleMenu: ap,
                  onToolbarMenuDismiss: uo,
                  get clearPromptPosition() {
                    return T();
                  },
                  onClearHistoryConfirm: () => {
                    (vr(), pc());
                  },
                  onClearHistoryCancel: vr,
                }),
              Js,
            ),
          Ae() && Ze.session.tryResume());
        let hp = async (a) => {
            let d = Array.isArray(a) ? a : [a];
            return d.length === 0 ? false : await wi(d);
          },
          gc = () => {
            let a = Ws();
            a && Ze._internal.setOptions(a);
            let d = !!a?.provider;
            if ((u.setHasAgentProvider(d), d && a?.provider)) {
              let p = a.provider;
              (u.setAgentCapabilities({
                supportsUndo: !!p.undo,
                supportsFollowUp: !!p.supportsFollowUp,
                dismissButtonText: p.dismissButtonText,
                isAgentConnected: false,
              }),
                p.checkConnection &&
                  p
                    .checkConnection()
                    .then((E) => {
                      Ws()?.provider === p &&
                        u.setAgentCapabilities({
                          supportsUndo: !!p.undo,
                          supportsFollowUp: !!p.supportsFollowUp,
                          dismissButtonText: p.dismissButtonText,
                          isAgentConnected: E,
                        });
                    })
                    .catch(() => {}),
                Ze.session.tryResume());
            } else
              u.setAgentCapabilities({
                supportsUndo: false,
                supportsFollowUp: false,
                dismissButtonText: void 0,
                isAgentConnected: false,
              });
          },
          ra = {
            activate: () => {
              (u.setPendingCommentMode(false), !m() && O() && Ei());
            },
            deactivate: () => {
              (m() || F()) && nt();
            },
            toggle: () => {
              m() ? nt() : O() && Ei();
            },
            comment: Cm,
            isActive: () => m(),
            isEnabled: () => O(),
            setEnabled: (a) => {
              a !== O() && (V(a), a || Ul());
            },
            getToolbarState: () => wo(),
            setToolbarState: (a) => {
              let d = wo(),
                p = {
                  edge: a.edge ?? d?.edge ?? "bottom",
                  ratio: a.ratio ?? d?.ratio ?? en,
                  collapsed: a.collapsed ?? d?.collapsed ?? false,
                  enabled: a.enabled ?? d?.enabled ?? true,
                };
              (Yr(p),
                ye(p),
                a.enabled !== void 0 && a.enabled !== O() && V(a.enabled),
                no.forEach((E) => E(p)));
            },
            onToolbarStateChange: (a) => (
              no.add(a),
              () => {
                no.delete(a);
              }
            ),
            dispose: () => {
              ((Vl = false), Pi(), Lo(), wr(), no.clear(), s());
            },
            copyElement: hp,
            getSource: async (a) => {
              let d = await Tn(a),
                p = ol(d);
              return p
                ? {
                    filePath: p.filePath,
                    lineNumber: p.lineNumber ?? null,
                    componentName: p.componentName,
                  }
                : null;
            },
            getStackContext: rl,
            getState: () => ({
              isActive: m(),
              isDragging: v(),
              isCopying: F(),
              isPromptMode: w(),
              isCrosshairVisible: Io() ?? false,
              isSelectionBoxVisible: Qs() ?? false,
              isDragBoxVisible: ea() ?? false,
              targetElement: Z(),
              dragBounds: Le() ?? null,
              grabbedBoxes: l.grabbedBoxes.map((a) => ({
                id: a.id,
                bounds: a.bounds,
                createdAt: a.createdAt,
              })),
              labelInstances: l.labelInstances.map((a) => ({
                id: a.id,
                status: a.status,
                tagName: a.tagName,
                componentName: a.componentName,
                createdAt: a.createdAt,
              })),
              selectionFilePath: l.selectionFilePath,
              toolbarState: ee(),
            }),
            setOptions: (a) => {
              i.setOptions(a);
            },
            registerPlugin: (a) => {
              (i.register(a, ra), gc());
            },
            unregisterPlugin: (a) => {
              (i.unregister(a), gc());
            },
            getPlugins: () => i.getPluginNames(),
            getDisplayName: zr,
          };
        for (let a of Ww) i.register(a, ra);
        return (
          setTimeout(() => {
            er(true);
          }, Au),
          ra
        );
      });
    };
  var oo = null,
    fm = () =>
      typeof window > "u" ? oo : (window.__REACT_GRAB__ ?? oo ?? null),
    J5 = (e) => {
      ((oo = e),
        typeof window < "u" &&
          (e ? (window.__REACT_GRAB__ = e) : delete window.__REACT_GRAB__));
    },
    fi = [],
    Kw = (e) => {
      for (; fi.length > 0; ) {
        let t = fi.shift();
        t && e.registerPlugin(t);
      }
    },
    Q5 = (e) => {
      let t = fm();
      if (t) {
        t.registerPlugin(e);
        return;
      }
      fi.push(e);
    },
    eP = (e) => {
      let t = fm();
      if (t) {
        t.unregisterPlugin(e);
        return;
      }
      let n = fi.findIndex((o) => o.name === e);
      n !== -1 && fi.splice(n, 1);
    };
  typeof window < "u" &&
    !window.__REACT_GRAB_DISABLED__ &&
    (window.__REACT_GRAB__
      ? (oo = window.__REACT_GRAB__)
      : ((oo = Gl()), (window.__REACT_GRAB__ = oo)),
    Kw(oo),
    window.dispatchEvent(new CustomEvent("react-grab:init", { detail: oo })));
  /*! Bundled license information:

bippy/dist/rdt-hook.js:
  (**
   * @license bippy
   *
   * Copyright (c) Aiden Bai
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

bippy/dist/core.js:
  (**
   * @license bippy
   *
   * Copyright (c) Aiden Bai
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

bippy/dist/source.js:
  (**
   * @license bippy
   *
   * Copyright (c) Aiden Bai
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

bippy/dist/install-hook-only.js:
  (**
   * @license bippy
   *
   * Copyright (c) Aiden Bai
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

bippy/dist/index.js:
  (**
   * @license bippy
   *
   * Copyright (c) Aiden Bai
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/ exports.DEFAULT_THEME = Qn;
  exports.commentPlugin = Ll;
  exports.formatElementInfo = ns;
  exports.generateSnippet = pr;
  exports.getGlobalApi = fm;
  exports.getStack = Tn;
  exports.init = Gl;
  exports.isInstrumentationActive = En;
  exports.openPlugin = Dl;
  exports.registerPlugin = Q5;
  exports.setGlobalApi = J5;
  exports.unregisterPlugin = eP;
  return exports;
})({});

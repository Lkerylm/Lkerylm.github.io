/**
 * Firefly 前端 API 桥
 * ------------------------------------------------------------------
 * 作用：让所有页面里原本的 fetch('/api/xxx/') 自动
 *   1) 拼上后端地址（默认同源；静态托管时可手动指向自己的服务器）
 *   2) 带上 Authorization: Bearer <token>
 *   3) 登录 / 注册成功后自动保存 token，退出时自动清除
 * 无需改动任何业务页面代码。
 *
 * 配置：localStorage.firefly_api_base = 'http://192.168.1.10:8787'
 */
(function () {
  "use strict";
  if (window.__fireflyApiInstalled) return;
  window.__fireflyApiInstalled = true;

  var LS_BASE = "firefly_api_base";
  var LS_TOKEN = "firefly_token";
  var origFetch = window.fetch ? window.fetch.bind(window) : null;

  function readLS(k) {
    try {
      return localStorage.getItem(k) || "";
    } catch (e) {
      return "";
    }
  }
  function writeLS(k, v) {
    try {
      if (v) localStorage.setItem(k, v);
      else localStorage.removeItem(k);
    } catch (e) {}
  }

  function getBase() {
    return readLS(LS_BASE).replace(/\/+$/, "");
  }
  function setBase(v) {
    v = String(v || "").trim().replace(/\/+$/, "");
    writeLS(LS_BASE, v);
    return v;
  }
  function getToken() {
    return readLS(LS_TOKEN);
  }
  function setToken(t) {
    writeLS(LS_TOKEN, t || "");
  }
  function clearToken() {
    writeLS(LS_TOKEN, "");
  }

  function apiUrl(u) {
    var base = getBase();
    if (!base) return u;
    if (/^https?:\/\//i.test(u)) return u;
    return base + (u.charAt(0) === "/" ? u : "/" + u);
  }

  if (origFetch) {
    window.fetch = function (input, init) {
      init = init || {};
      var url = typeof input === "string" ? input : (input && input.url) || String(input);
      var isApi = /^\/?api\//.test(url);

      if (isApi) {
        var full = apiUrl(url.charAt(0) === "/" ? url : "/" + url);
        if (full !== url) input = full;

        init.headers = new Headers(init.headers || {});
        var t = getToken();
        if (t && !init.headers.has("Authorization")) init.headers.set("Authorization", "Bearer " + t);
        if (getBase()) init.credentials = "omit";
      }

      var p = origFetch(input, init);

      if (/\/api\/auth\/(login|register)\/?([?#]|$)/.test(url)) {
        return p.then(function (res) {
          try {
            res
              .clone()
              .json()
              .then(function (d) {
                if (d && d.token) {
                  setToken(d.token);
                  window.dispatchEvent(new CustomEvent("firefly:auth", { detail: { user: d.user || null } }));
                }
              })
              .catch(function () {});
          } catch (e) {}
          return res;
        });
      }

      if (/\/api\/auth\/logout/.test(url)) {
        return p.then(function (res) {
          clearToken();
          window.dispatchEvent(new CustomEvent("firefly:auth", { detail: { user: null } }));
          return res;
        });
      }

      if (isApi) {
        return p.then(function (res) {
          if (res.status === 401) {
            window.dispatchEvent(new CustomEvent("firefly:unauthorized"));
          }
          return res;
        });
      }

      return p;
    };
  }

  var status = { ok: null, base: "", checkedAt: 0, error: "" };

  function check(timeoutMs) {
    timeoutMs = timeoutMs || 4000;
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, timeoutMs);
    var started = Date.now();
    return fetch(apiUrl("/api/health"), ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) {
        return r.json().then(function (d) {
          status = { ok: !!(r.ok && d && d.ok), base: getBase(), checkedAt: Date.now(), latency: Date.now() - started, error: "" };
          return status;
        });
      })
      .catch(function (e) {
        status = { ok: false, base: getBase(), checkedAt: Date.now(), error: String((e && e.message) || e) };
        return status;
      })
      .then(function (s) {
        clearTimeout(timer);
        document.documentElement.setAttribute("data-backend", s.ok ? "online" : "offline");
        window.dispatchEvent(new CustomEvent("firefly:backend", { detail: s }));
        return s;
      });
  }

  function api(path, opts) {
    opts = opts || {};
    if (opts.body && typeof opts.body !== "string") {
      opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
      opts.body = JSON.stringify(opts.body);
    }
    return fetch(apiUrl(path), opts).then(function (r) {
      return r.json().catch(function () {
        return { ok: false, error: "服务端返回了非 JSON 内容（HTTP " + r.status + "）" };
      });
    });
  }

  function me() {
    return api("/api/auth/me/", { headers: getToken() ? { Authorization: "Bearer " + getToken() } : {} });
  }

  window.FireflyAPI = {
    get base() {
      return getBase();
    },
    setBase: setBase,
    get token() {
      return getToken();
    },
    setToken: setToken,
    clearToken: clearToken,
    apiUrl: apiUrl,
    api: api,
    me: me,
    check: check,
    get status() {
      return status;
    },
  };

  // 启动后自动检测一次，之后每 30 秒一次（页面隐藏时跳过）
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      check();
    });
  } else {
    check();
  }
  setInterval(function () {
    if (!document.hidden) check();
  }, 30000);
})();

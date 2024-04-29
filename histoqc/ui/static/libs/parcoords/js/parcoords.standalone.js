(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.ParCoords = factory());
}(this, (function () { 'use strict';

    /**
     * requestAnimationFrame version: "0.0.23" Copyright (c) 2011-2012, Cyril Agosta ( cyril.agosta.dev@gmail.com) All Rights Reserved.
     * Available via the MIT license.
     * see: http://github.com/cagosta/requestAnimationFrame for details
     *
     * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
     * http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
     * requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
     * MIT license
     *
     */

    (function (global) {

        (function () {

            if (global.requestAnimationFrame) {

                return;
            }

            if (global.webkitRequestAnimationFrame) {
                // Chrome <= 23, Safari <= 6.1, Blackberry 10

                global.requestAnimationFrame = global['webkitRequestAnimationFrame'];
                global.cancelAnimationFrame = global['webkitCancelAnimationFrame'] || global['webkitCancelRequestAnimationFrame'];
                return;
            }

            // IE <= 9, Android <= 4.3, very old/rare browsers

            var lastTime = 0;

            global.requestAnimationFrame = function (callback) {

                var currTime = new Date().getTime();

                var timeToCall = Math.max(0, 16 - (currTime - lastTime));

                var id = global.setTimeout(function () {

                    callback(currTime + timeToCall);
                }, timeToCall);

                lastTime = currTime + timeToCall;

                return id; // return the id for cancellation capabilities
            };

            global.cancelAnimationFrame = function (id) {

                clearTimeout(id);
            };
        })();

        if (typeof define === 'function') {

            define(function () {

                return global.requestAnimationFrame;
            });
        }
    })(window);

    var renderQueue = function renderQueue(func) {
      var _queue = [],
          // data to be rendered
      _rate = 1000,
          // number of calls per frame
      _invalidate = function _invalidate() {},
          // invalidate last render queue
      _clear = function _clear() {}; // clearing function

      var rq = function rq(data) {
        if (data) rq.data(data);
        _invalidate();
        _clear();
        rq.render();
      };

      rq.render = function () {
        var valid = true;
        _invalidate = rq.invalidate = function () {
          valid = false;
        };

        function doFrame() {
          if (!valid) return true;
          var chunk = _queue.splice(0, _rate);
          chunk.map(func);
          requestAnimationFrame(doFrame);
        }

        doFrame();
      };

      rq.data = function (data) {
        _invalidate();
        _queue = data.slice(0); // creates a copy of the data
        return rq;
      };

      rq.add = function (data) {
        _queue = _queue.concat(data);
      };

      rq.rate = function (value) {
        if (!arguments.length) return _rate;
        _rate = value;
        return rq;
      };

      rq.remaining = function () {
        return _queue.length;
      };

      // clear the canvas
      rq.clear = function (func) {
        if (!arguments.length) {
          _clear();
          return rq;
        }
        _clear = func;
        return rq;
      };

      rq.invalidate = _invalidate;

      return rq;
    };

    var w = function w(config) {
      return config.width - config.margin.right - config.margin.left;
    };

    var xhtml = "http://www.w3.org/1999/xhtml";

    var namespaces = {
      svg: "http://www.w3.org/2000/svg",
      xhtml: xhtml,
      xlink: "http://www.w3.org/1999/xlink",
      xml: "http://www.w3.org/XML/1998/namespace",
      xmlns: "http://www.w3.org/2000/xmlns/"
    };

    function namespace (name) {
      var prefix = name += "",
          i = prefix.indexOf(":");
      if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
      return namespaces.hasOwnProperty(prefix) ? { space: namespaces[prefix], local: name } : name;
    }

    function creatorInherit(name) {
      return function () {
        var document = this.ownerDocument,
            uri = this.namespaceURI;
        return uri === xhtml && document.documentElement.namespaceURI === xhtml ? document.createElement(name) : document.createElementNS(uri, name);
      };
    }

    function creatorFixed(fullname) {
      return function () {
        return this.ownerDocument.createElementNS(fullname.space, fullname.local);
      };
    }

    function creator (name) {
      var fullname = namespace(name);
      return (fullname.local ? creatorFixed : creatorInherit)(fullname);
    }

    function none() {}

    function selector (selector) {
      return selector == null ? none : function () {
        return this.querySelector(selector);
      };
    }

    function selection_select (select) {
      if (typeof select !== "function") select = selector(select);

      for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
          if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
            if ("__data__" in node) subnode.__data__ = node.__data__;
            subgroup[i] = subnode;
          }
        }
      }

      return new Selection(subgroups, this._parents);
    }

    function empty() {
      return [];
    }

    function selectorAll (selector) {
      return selector == null ? empty : function () {
        return this.querySelectorAll(selector);
      };
    }

    function selection_selectAll (select) {
      if (typeof select !== "function") select = selectorAll(select);

      for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            subgroups.push(select.call(node, node.__data__, i, group));
            parents.push(node);
          }
        }
      }

      return new Selection(subgroups, parents);
    }

    var matcher = function matcher(selector) {
      return function () {
        return this.matches(selector);
      };
    };

    if (typeof document !== "undefined") {
      var element = document.documentElement;
      if (!element.matches) {
        var vendorMatches = element.webkitMatchesSelector || element.msMatchesSelector || element.mozMatchesSelector || element.oMatchesSelector;
        matcher = function matcher(selector) {
          return function () {
            return vendorMatches.call(this, selector);
          };
        };
      }
    }

    var matcher$1 = matcher;

    function selection_filter (match) {
      if (typeof match !== "function") match = matcher$1(match);

      for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
          if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
            subgroup.push(node);
          }
        }
      }

      return new Selection(subgroups, this._parents);
    }

    function sparse (update) {
      return new Array(update.length);
    }

    function selection_enter () {
      return new Selection(this._enter || this._groups.map(sparse), this._parents);
    }

    function EnterNode(parent, datum) {
      this.ownerDocument = parent.ownerDocument;
      this.namespaceURI = parent.namespaceURI;
      this._next = null;
      this._parent = parent;
      this.__data__ = datum;
    }

    EnterNode.prototype = {
      constructor: EnterNode,
      appendChild: function appendChild(child) {
        return this._parent.insertBefore(child, this._next);
      },
      insertBefore: function insertBefore(child, next) {
        return this._parent.insertBefore(child, next);
      },
      querySelector: function querySelector(selector) {
        return this._parent.querySelector(selector);
      },
      querySelectorAll: function querySelectorAll(selector) {
        return this._parent.querySelectorAll(selector);
      }
    };

    function constant (x) {
      return function () {
        return x;
      };
    }

    var keyPrefix = "$"; // Protect against keys like “__proto__”.

    function bindIndex(parent, group, enter, update, exit, data) {
      var i = 0,
          node,
          groupLength = group.length,
          dataLength = data.length;

      // Put any non-null nodes that fit into update.
      // Put any null nodes into enter.
      // Put any remaining data into enter.
      for (; i < dataLength; ++i) {
        if (node = group[i]) {
          node.__data__ = data[i];
          update[i] = node;
        } else {
          enter[i] = new EnterNode(parent, data[i]);
        }
      }

      // Put any non-null nodes that don’t fit into exit.
      for (; i < groupLength; ++i) {
        if (node = group[i]) {
          exit[i] = node;
        }
      }
    }

    function bindKey(parent, group, enter, update, exit, data, key) {
      var i,
          node,
          nodeByKeyValue = {},
          groupLength = group.length,
          dataLength = data.length,
          keyValues = new Array(groupLength),
          keyValue;

      // Compute the key for each node.
      // If multiple nodes have the same key, the duplicates are added to exit.
      for (i = 0; i < groupLength; ++i) {
        if (node = group[i]) {
          keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);
          if (keyValue in nodeByKeyValue) {
            exit[i] = node;
          } else {
            nodeByKeyValue[keyValue] = node;
          }
        }
      }

      // Compute the key for each datum.
      // If there a node associated with this key, join and add it to update.
      // If there is not (or the key is a duplicate), add it to enter.
      for (i = 0; i < dataLength; ++i) {
        keyValue = keyPrefix + key.call(parent, data[i], i, data);
        if (node = nodeByKeyValue[keyValue]) {
          update[i] = node;
          node.__data__ = data[i];
          nodeByKeyValue[keyValue] = null;
        } else {
          enter[i] = new EnterNode(parent, data[i]);
        }
      }

      // Add any remaining nodes that were not bound to data to exit.
      for (i = 0; i < groupLength; ++i) {
        if ((node = group[i]) && nodeByKeyValue[keyValues[i]] === node) {
          exit[i] = node;
        }
      }
    }

    function selection_data (value, key) {
      if (!value) {
        data = new Array(this.size()), j = -1;
        this.each(function (d) {
          data[++j] = d;
        });
        return data;
      }

      var bind = key ? bindKey : bindIndex,
          parents = this._parents,
          groups = this._groups;

      if (typeof value !== "function") value = constant(value);

      for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
        var parent = parents[j],
            group = groups[j],
            groupLength = group.length,
            data = value.call(parent, parent && parent.__data__, j, parents),
            dataLength = data.length,
            enterGroup = enter[j] = new Array(dataLength),
            updateGroup = update[j] = new Array(dataLength),
            exitGroup = exit[j] = new Array(groupLength);

        bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

        // Now connect the enter nodes to their following update node, such that
        // appendChild can insert the materialized enter node before this node,
        // rather than at the end of the parent node.
        for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
          if (previous = enterGroup[i0]) {
            if (i0 >= i1) i1 = i0 + 1;
            while (!(next = updateGroup[i1]) && ++i1 < dataLength) {}
            previous._next = next || null;
          }
        }
      }

      update = new Selection(update, parents);
      update._enter = enter;
      update._exit = exit;
      return update;
    }

    function selection_exit () {
      return new Selection(this._exit || this._groups.map(sparse), this._parents);
    }

    function selection_merge (selection$$1) {

      for (var groups0 = this._groups, groups1 = selection$$1._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
        for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
          if (node = group0[i] || group1[i]) {
            merge[i] = node;
          }
        }
      }

      for (; j < m0; ++j) {
        merges[j] = groups0[j];
      }

      return new Selection(merges, this._parents);
    }

    function selection_order () {

      for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
        for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
          if (node = group[i]) {
            if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
            next = node;
          }
        }
      }

      return this;
    }

    function selection_sort (compare) {
      if (!compare) compare = ascending;

      function compareNode(a, b) {
        return a && b ? compare(a.__data__, b.__data__) : !a - !b;
      }

      for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            sortgroup[i] = node;
          }
        }
        sortgroup.sort(compareNode);
      }

      return new Selection(sortgroups, this._parents).order();
    }

    function ascending(a, b) {
      return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    }

    function selection_call () {
      var callback = arguments[0];
      arguments[0] = this;
      callback.apply(null, arguments);
      return this;
    }

    function selection_nodes () {
      var nodes = new Array(this.size()),
          i = -1;
      this.each(function () {
        nodes[++i] = this;
      });
      return nodes;
    }

    function selection_node () {

      for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
        for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
          var node = group[i];
          if (node) return node;
        }
      }

      return null;
    }

    function selection_size () {
      var size = 0;
      this.each(function () {
        ++size;
      });
      return size;
    }

    function selection_empty () {
      return !this.node();
    }

    function selection_each (callback) {

      for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
        for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
          if (node = group[i]) callback.call(node, node.__data__, i, group);
        }
      }

      return this;
    }

    function attrRemove(name) {
      return function () {
        this.removeAttribute(name);
      };
    }

    function attrRemoveNS(fullname) {
      return function () {
        this.removeAttributeNS(fullname.space, fullname.local);
      };
    }

    function attrConstant(name, value) {
      return function () {
        this.setAttribute(name, value);
      };
    }

    function attrConstantNS(fullname, value) {
      return function () {
        this.setAttributeNS(fullname.space, fullname.local, value);
      };
    }

    function attrFunction(name, value) {
      return function () {
        var v = value.apply(this, arguments);
        if (v == null) this.removeAttribute(name);else this.setAttribute(name, v);
      };
    }

    function attrFunctionNS(fullname, value) {
      return function () {
        var v = value.apply(this, arguments);
        if (v == null) this.removeAttributeNS(fullname.space, fullname.local);else this.setAttributeNS(fullname.space, fullname.local, v);
      };
    }

    function selection_attr (name, value) {
      var fullname = namespace(name);

      if (arguments.length < 2) {
        var node = this.node();
        return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
      }

      return this.each((value == null ? fullname.local ? attrRemoveNS : attrRemove : typeof value === "function" ? fullname.local ? attrFunctionNS : attrFunction : fullname.local ? attrConstantNS : attrConstant)(fullname, value));
    }

    function defaultView (node) {
        return node.ownerDocument && node.ownerDocument.defaultView || // node is a Node
        node.document && node // node is a Window
        || node.defaultView; // node is a Document
    }

    function styleRemove(name) {
      return function () {
        this.style.removeProperty(name);
      };
    }

    function styleConstant(name, value, priority) {
      return function () {
        this.style.setProperty(name, value, priority);
      };
    }

    function styleFunction(name, value, priority) {
      return function () {
        var v = value.apply(this, arguments);
        if (v == null) this.style.removeProperty(name);else this.style.setProperty(name, v, priority);
      };
    }

    function selection_style (name, value, priority) {
      return arguments.length > 1 ? this.each((value == null ? styleRemove : typeof value === "function" ? styleFunction : styleConstant)(name, value, priority == null ? "" : priority)) : styleValue(this.node(), name);
    }

    function styleValue(node, name) {
      return node.style.getPropertyValue(name) || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
    }

    function propertyRemove(name) {
      return function () {
        delete this[name];
      };
    }

    function propertyConstant(name, value) {
      return function () {
        this[name] = value;
      };
    }

    function propertyFunction(name, value) {
      return function () {
        var v = value.apply(this, arguments);
        if (v == null) delete this[name];else this[name] = v;
      };
    }

    function selection_property (name, value) {
      return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
    }

    function classArray(string) {
      return string.trim().split(/^|\s+/);
    }

    function classList(node) {
      return node.classList || new ClassList(node);
    }

    function ClassList(node) {
      this._node = node;
      this._names = classArray(node.getAttribute("class") || "");
    }

    ClassList.prototype = {
      add: function add(name) {
        var i = this._names.indexOf(name);
        if (i < 0) {
          this._names.push(name);
          this._node.setAttribute("class", this._names.join(" "));
        }
      },
      remove: function remove(name) {
        var i = this._names.indexOf(name);
        if (i >= 0) {
          this._names.splice(i, 1);
          this._node.setAttribute("class", this._names.join(" "));
        }
      },
      contains: function contains(name) {
        return this._names.indexOf(name) >= 0;
      }
    };

    function classedAdd(node, names) {
      var list = classList(node),
          i = -1,
          n = names.length;
      while (++i < n) {
        list.add(names[i]);
      }
    }

    function classedRemove(node, names) {
      var list = classList(node),
          i = -1,
          n = names.length;
      while (++i < n) {
        list.remove(names[i]);
      }
    }

    function classedTrue(names) {
      return function () {
        classedAdd(this, names);
      };
    }

    function classedFalse(names) {
      return function () {
        classedRemove(this, names);
      };
    }

    function classedFunction(names, value) {
      return function () {
        (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
      };
    }

    function selection_classed (name, value) {
      var names = classArray(name + "");

      if (arguments.length < 2) {
        var list = classList(this.node()),
            i = -1,
            n = names.length;
        while (++i < n) {
          if (!list.contains(names[i])) return false;
        }return true;
      }

      return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
    }

    function textRemove() {
      this.textContent = "";
    }

    function textConstant(value) {
      return function () {
        this.textContent = value;
      };
    }

    function textFunction(value) {
      return function () {
        var v = value.apply(this, arguments);
        this.textContent = v == null ? "" : v;
      };
    }

    function selection_text (value) {
      return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction : textConstant)(value)) : this.node().textContent;
    }

    function htmlRemove() {
      this.innerHTML = "";
    }

    function htmlConstant(value) {
      return function () {
        this.innerHTML = value;
      };
    }

    function htmlFunction(value) {
      return function () {
        var v = value.apply(this, arguments);
        this.innerHTML = v == null ? "" : v;
      };
    }

    function selection_html (value) {
      return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
    }

    function raise() {
      if (this.nextSibling) this.parentNode.appendChild(this);
    }

    function selection_raise () {
      return this.each(raise);
    }

    function lower() {
      if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
    }

    function selection_lower () {
      return this.each(lower);
    }

    function selection_append (name) {
      var create = typeof name === "function" ? name : creator(name);
      return this.select(function () {
        return this.appendChild(create.apply(this, arguments));
      });
    }

    function constantNull() {
      return null;
    }

    function selection_insert (name, before) {
      var create = typeof name === "function" ? name : creator(name),
          select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
      return this.select(function () {
        return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
      });
    }

    function remove() {
      var parent = this.parentNode;
      if (parent) parent.removeChild(this);
    }

    function selection_remove () {
      return this.each(remove);
    }

    function selection_cloneShallow() {
      return this.parentNode.insertBefore(this.cloneNode(false), this.nextSibling);
    }

    function selection_cloneDeep() {
      return this.parentNode.insertBefore(this.cloneNode(true), this.nextSibling);
    }

    function selection_clone (deep) {
      return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
    }

    function selection_datum (value) {
        return arguments.length ? this.property("__data__", value) : this.node().__data__;
    }

    var filterEvents = {};

    var event = null;

    if (typeof document !== "undefined") {
      var element$1 = document.documentElement;
      if (!("onmouseenter" in element$1)) {
        filterEvents = { mouseenter: "mouseover", mouseleave: "mouseout" };
      }
    }

    function filterContextListener(listener, index, group) {
      listener = contextListener(listener, index, group);
      return function (event) {
        var related = event.relatedTarget;
        if (!related || related !== this && !(related.compareDocumentPosition(this) & 8)) {
          listener.call(this, event);
        }
      };
    }

    function contextListener(listener, index, group) {
      return function (event1) {
        var event0 = event; // Events can be reentrant (e.g., focus).
        event = event1;
        try {
          listener.call(this, this.__data__, index, group);
        } finally {
          event = event0;
        }
      };
    }

    function parseTypenames(typenames) {
      return typenames.trim().split(/^|\s+/).map(function (t) {
        var name = "",
            i = t.indexOf(".");
        if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
        return { type: t, name: name };
      });
    }

    function onRemove(typename) {
      return function () {
        var on = this.__on;
        if (!on) return;
        for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
          if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
            this.removeEventListener(o.type, o.listener, o.capture);
          } else {
            on[++i] = o;
          }
        }
        if (++i) on.length = i;else delete this.__on;
      };
    }

    function onAdd(typename, value, capture) {
      var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener;
      return function (d, i, group) {
        var on = this.__on,
            o,
            listener = wrap(value, i, group);
        if (on) for (var j = 0, m = on.length; j < m; ++j) {
          if ((o = on[j]).type === typename.type && o.name === typename.name) {
            this.removeEventListener(o.type, o.listener, o.capture);
            this.addEventListener(o.type, o.listener = listener, o.capture = capture);
            o.value = value;
            return;
          }
        }
        this.addEventListener(typename.type, listener, capture);
        o = { type: typename.type, name: typename.name, value: value, listener: listener, capture: capture };
        if (!on) this.__on = [o];else on.push(o);
      };
    }

    function selection_on (typename, value, capture) {
      var typenames = parseTypenames(typename + ""),
          i,
          n = typenames.length,
          t;

      if (arguments.length < 2) {
        var on = this.node().__on;
        if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
          for (i = 0, o = on[j]; i < n; ++i) {
            if ((t = typenames[i]).type === o.type && t.name === o.name) {
              return o.value;
            }
          }
        }
        return;
      }

      on = value ? onAdd : onRemove;
      if (capture == null) capture = false;
      for (i = 0; i < n; ++i) {
        this.each(on(typenames[i], value, capture));
      }return this;
    }

    function customEvent(event1, listener, that, args) {
      var event0 = event;
      event1.sourceEvent = event;
      event = event1;
      try {
        return listener.apply(that, args);
      } finally {
        event = event0;
      }
    }

    function dispatchEvent(node, type, params) {
      var window = defaultView(node),
          event = window.CustomEvent;

      if (typeof event === "function") {
        event = new event(type, params);
      } else {
        event = window.document.createEvent("Event");
        if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;else event.initEvent(type, false, false);
      }

      node.dispatchEvent(event);
    }

    function dispatchConstant(type, params) {
      return function () {
        return dispatchEvent(this, type, params);
      };
    }

    function dispatchFunction(type, params) {
      return function () {
        return dispatchEvent(this, type, params.apply(this, arguments));
      };
    }

    function selection_dispatch (type, params) {
      return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type, params));
    }

    var root = [null];

    function Selection(groups, parents) {
      this._groups = groups;
      this._parents = parents;
    }

    function selection() {
      return new Selection([[document.documentElement]], root);
    }

    Selection.prototype = selection.prototype = {
      constructor: Selection,
      select: selection_select,
      selectAll: selection_selectAll,
      filter: selection_filter,
      data: selection_data,
      enter: selection_enter,
      exit: selection_exit,
      merge: selection_merge,
      order: selection_order,
      sort: selection_sort,
      call: selection_call,
      nodes: selection_nodes,
      node: selection_node,
      size: selection_size,
      empty: selection_empty,
      each: selection_each,
      attr: selection_attr,
      style: selection_style,
      property: selection_property,
      classed: selection_classed,
      text: selection_text,
      html: selection_html,
      raise: selection_raise,
      lower: selection_lower,
      append: selection_append,
      insert: selection_insert,
      remove: selection_remove,
      clone: selection_clone,
      datum: selection_datum,
      on: selection_on,
      dispatch: selection_dispatch
    };

    function select (selector) {
        return typeof selector === "string" ? new Selection([[document.querySelector(selector)]], [document.documentElement]) : new Selection([[selector]], root);
    }

    function sourceEvent () {
      var current = event,
          source;
      while (source = current.sourceEvent) {
        current = source;
      }return current;
    }

    function point (node, event) {
      var svg = node.ownerSVGElement || node;

      if (svg.createSVGPoint) {
        var point = svg.createSVGPoint();
        point.x = event.clientX, point.y = event.clientY;
        point = point.matrixTransform(node.getScreenCTM().inverse());
        return [point.x, point.y];
      }

      var rect = node.getBoundingClientRect();
      return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
    }

    function mouse (node) {
      var event = sourceEvent();
      if (event.changedTouches) event = event.changedTouches[0];
      return point(node, event);
    }

    function selectAll (selector) {
        return typeof selector === "string" ? new Selection([document.querySelectorAll(selector)], [document.documentElement]) : new Selection([selector == null ? [] : selector], root);
    }

    function touch (node, touches, identifier) {
      if (arguments.length < 3) identifier = touches, touches = sourceEvent().changedTouches;

      for (var i = 0, n = touches ? touches.length : 0, touch; i < n; ++i) {
        if ((touch = touches[i]).identifier === identifier) {
          return point(node, touch);
        }
      }

      return null;
    }

    var noop = { value: function value() {} };

    function dispatch() {
      for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
        if (!(t = arguments[i] + "") || t in _) throw new Error("illegal type: " + t);
        _[t] = [];
      }
      return new Dispatch(_);
    }

    function Dispatch(_) {
      this._ = _;
    }

    function parseTypenames$1(typenames, types) {
      return typenames.trim().split(/^|\s+/).map(function (t) {
        var name = "",
            i = t.indexOf(".");
        if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
        if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
        return { type: t, name: name };
      });
    }

    Dispatch.prototype = dispatch.prototype = {
      constructor: Dispatch,
      on: function on(typename, callback) {
        var _ = this._,
            T = parseTypenames$1(typename + "", _),
            t,
            i = -1,
            n = T.length;

        // If no callback was specified, return the callback of the given type and name.
        if (arguments.length < 2) {
          while (++i < n) {
            if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
          }return;
        }

        // If a type was specified, set the callback for the given type and name.
        // Otherwise, if a null callback was specified, remove callbacks of the given name.
        if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
        while (++i < n) {
          if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);else if (callback == null) for (t in _) {
            _[t] = set(_[t], typename.name, null);
          }
        }

        return this;
      },
      copy: function copy() {
        var copy = {},
            _ = this._;
        for (var t in _) {
          copy[t] = _[t].slice();
        }return new Dispatch(copy);
      },
      call: function call(type, that) {
        if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) {
          args[i] = arguments[i + 2];
        }if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
        for (t = this._[type], i = 0, n = t.length; i < n; ++i) {
          t[i].value.apply(that, args);
        }
      },
      apply: function apply(type, that, args) {
        if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
        for (var t = this._[type], i = 0, n = t.length; i < n; ++i) {
          t[i].value.apply(that, args);
        }
      }
    };

    function get(type, name) {
      for (var i = 0, n = type.length, c; i < n; ++i) {
        if ((c = type[i]).name === name) {
          return c.value;
        }
      }
    }

    function set(type, name, callback) {
      for (var i = 0, n = type.length; i < n; ++i) {
        if (type[i].name === name) {
          type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
          break;
        }
      }
      if (callback != null) type.push({ name: name, value: callback });
      return type;
    }

    function nopropagation() {
      event.stopImmediatePropagation();
    }

    function noevent () {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    function nodrag (view) {
      var root = view.document.documentElement,
          selection$$1 = select(view).on("dragstart.drag", noevent, true);
      if ("onselectstart" in root) {
        selection$$1.on("selectstart.drag", noevent, true);
      } else {
        root.__noselect = root.style.MozUserSelect;
        root.style.MozUserSelect = "none";
      }
    }

    function yesdrag(view, noclick) {
      var root = view.document.documentElement,
          selection$$1 = select(view).on("dragstart.drag", null);
      if (noclick) {
        selection$$1.on("click.drag", noevent, true);
        setTimeout(function () {
          selection$$1.on("click.drag", null);
        }, 0);
      }
      if ("onselectstart" in root) {
        selection$$1.on("selectstart.drag", null);
      } else {
        root.style.MozUserSelect = root.__noselect;
        delete root.__noselect;
      }
    }

    function constant$1 (x) {
      return function () {
        return x;
      };
    }

    function DragEvent(target, type, subject, id, active, x, y, dx, dy, dispatch) {
      this.target = target;
      this.type = type;
      this.subject = subject;
      this.identifier = id;
      this.active = active;
      this.x = x;
      this.y = y;
      this.dx = dx;
      this.dy = dy;
      this._ = dispatch;
    }

    DragEvent.prototype.on = function () {
      var value = this._.on.apply(this._, arguments);
      return value === this._ ? this : value;
    };

    // Ignore right-click, since that should open the context menu.
    function defaultFilter() {
      return !event.button;
    }

    function defaultContainer() {
      return this.parentNode;
    }

    function defaultSubject(d) {
      return d == null ? { x: event.x, y: event.y } : d;
    }

    function defaultTouchable() {
      return "ontouchstart" in this;
    }

    function drag () {
      var filter = defaultFilter,
          container = defaultContainer,
          subject = defaultSubject,
          touchable = defaultTouchable,
          gestures = {},
          listeners = dispatch("start", "drag", "end"),
          active = 0,
          mousedownx,
          mousedowny,
          mousemoving,
          touchending,
          clickDistance2 = 0;

      function drag(selection$$1) {
        selection$$1.on("mousedown.drag", mousedowned).filter(touchable).on("touchstart.drag", touchstarted).on("touchmove.drag", touchmoved).on("touchend.drag touchcancel.drag", touchended).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
      }

      function mousedowned() {
        if (touchending || !filter.apply(this, arguments)) return;
        var gesture = beforestart("mouse", container.apply(this, arguments), mouse, this, arguments);
        if (!gesture) return;
        select(event.view).on("mousemove.drag", mousemoved, true).on("mouseup.drag", mouseupped, true);
        nodrag(event.view);
        nopropagation();
        mousemoving = false;
        mousedownx = event.clientX;
        mousedowny = event.clientY;
        gesture("start");
      }

      function mousemoved() {
        noevent();
        if (!mousemoving) {
          var dx = event.clientX - mousedownx,
              dy = event.clientY - mousedowny;
          mousemoving = dx * dx + dy * dy > clickDistance2;
        }
        gestures.mouse("drag");
      }

      function mouseupped() {
        select(event.view).on("mousemove.drag mouseup.drag", null);
        yesdrag(event.view, mousemoving);
        noevent();
        gestures.mouse("end");
      }

      function touchstarted() {
        if (!filter.apply(this, arguments)) return;
        var touches$$1 = event.changedTouches,
            c = container.apply(this, arguments),
            n = touches$$1.length,
            i,
            gesture;

        for (i = 0; i < n; ++i) {
          if (gesture = beforestart(touches$$1[i].identifier, c, touch, this, arguments)) {
            nopropagation();
            gesture("start");
          }
        }
      }

      function touchmoved() {
        var touches$$1 = event.changedTouches,
            n = touches$$1.length,
            i,
            gesture;

        for (i = 0; i < n; ++i) {
          if (gesture = gestures[touches$$1[i].identifier]) {
            noevent();
            gesture("drag");
          }
        }
      }

      function touchended() {
        var touches$$1 = event.changedTouches,
            n = touches$$1.length,
            i,
            gesture;

        if (touchending) clearTimeout(touchending);
        touchending = setTimeout(function () {
          touchending = null;
        }, 500); // Ghost clicks are delayed!
        for (i = 0; i < n; ++i) {
          if (gesture = gestures[touches$$1[i].identifier]) {
            nopropagation();
            gesture("end");
          }
        }
      }

      function beforestart(id, container, point$$1, that, args) {
        var p = point$$1(container, id),
            s,
            dx,
            dy,
            sublisteners = listeners.copy();

        if (!customEvent(new DragEvent(drag, "beforestart", s, id, active, p[0], p[1], 0, 0, sublisteners), function () {
          if ((event.subject = s = subject.apply(that, args)) == null) return false;
          dx = s.x - p[0] || 0;
          dy = s.y - p[1] || 0;
          return true;
        })) return;

        return function gesture(type) {
          var p0 = p,
              n;
          switch (type) {
            case "start":
              gestures[id] = gesture, n = active++;break;
            case "end":
              delete gestures[id], --active; // nobreak
            case "drag":
              p = point$$1(container, id), n = active;break;
          }
          customEvent(new DragEvent(drag, type, s, id, n, p[0] + dx, p[1] + dy, p[0] - p0[0], p[1] - p0[1], sublisteners), sublisteners.apply, sublisteners, [type, that, args]);
        };
      }

      drag.filter = function (_) {
        return arguments.length ? (filter = typeof _ === "function" ? _ : constant$1(!!_), drag) : filter;
      };

      drag.container = function (_) {
        return arguments.length ? (container = typeof _ === "function" ? _ : constant$1(_), drag) : container;
      };

      drag.subject = function (_) {
        return arguments.length ? (subject = typeof _ === "function" ? _ : constant$1(_), drag) : subject;
      };

      drag.touchable = function (_) {
        return arguments.length ? (touchable = typeof _ === "function" ? _ : constant$1(!!_), drag) : touchable;
      };

      drag.on = function () {
        var value = listeners.on.apply(listeners, arguments);
        return value === listeners ? drag : value;
      };

      drag.clickDistance = function (_) {
        return arguments.length ? (clickDistance2 = (_ = +_) * _, drag) : Math.sqrt(clickDistance2);
      };

      return drag;
    }

    function define$1 (constructor, factory, prototype) {
      constructor.prototype = factory.prototype = prototype;
      prototype.constructor = constructor;
    }

    function extend(parent, definition) {
      var prototype = Object.create(parent.prototype);
      for (var key in definition) {
        prototype[key] = definition[key];
      }return prototype;
    }

    function Color() {}

    var _darker = 0.7;
    var _brighter = 1 / _darker;
    var reI = "\\s*([+-]?\\d+)\\s*",
        reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
        reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
        reHex3 = /^#([0-9a-f]{3})$/,
        reHex6 = /^#([0-9a-f]{6})$/,
        reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
        reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
        reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
        reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
        reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
        reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

    var named = {
      aliceblue: 0xf0f8ff,
      antiquewhite: 0xfaebd7,
      aqua: 0x00ffff,
      aquamarine: 0x7fffd4,
      azure: 0xf0ffff,
      beige: 0xf5f5dc,
      bisque: 0xffe4c4,
      black: 0x000000,
      blanchedalmond: 0xffebcd,
      blue: 0x0000ff,
      blueviolet: 0x8a2be2,
      brown: 0xa52a2a,
      burlywood: 0xdeb887,
      cadetblue: 0x5f9ea0,
      chartreuse: 0x7fff00,
      chocolate: 0xd2691e,
      coral: 0xff7f50,
      cornflowerblue: 0x6495ed,
      cornsilk: 0xfff8dc,
      crimson: 0xdc143c,
      cyan: 0x00ffff,
      darkblue: 0x00008b,
      darkcyan: 0x008b8b,
      darkgoldenrod: 0xb8860b,
      darkgray: 0xa9a9a9,
      darkgreen: 0x006400,
      darkgrey: 0xa9a9a9,
      darkkhaki: 0xbdb76b,
      darkmagenta: 0x8b008b,
      darkolivegreen: 0x556b2f,
      darkorange: 0xff8c00,
      darkorchid: 0x9932cc,
      darkred: 0x8b0000,
      darksalmon: 0xe9967a,
      darkseagreen: 0x8fbc8f,
      darkslateblue: 0x483d8b,
      darkslategray: 0x2f4f4f,
      darkslategrey: 0x2f4f4f,
      darkturquoise: 0x00ced1,
      darkviolet: 0x9400d3,
      deeppink: 0xff1493,
      deepskyblue: 0x00bfff,
      dimgray: 0x696969,
      dimgrey: 0x696969,
      dodgerblue: 0x1e90ff,
      firebrick: 0xb22222,
      floralwhite: 0xfffaf0,
      forestgreen: 0x228b22,
      fuchsia: 0xff00ff,
      gainsboro: 0xdcdcdc,
      ghostwhite: 0xf8f8ff,
      gold: 0xffd700,
      goldenrod: 0xdaa520,
      gray: 0x808080,
      green: 0x008000,
      greenyellow: 0xadff2f,
      grey: 0x808080,
      honeydew: 0xf0fff0,
      hotpink: 0xff69b4,
      indianred: 0xcd5c5c,
      indigo: 0x4b0082,
      ivory: 0xfffff0,
      khaki: 0xf0e68c,
      lavender: 0xe6e6fa,
      lavenderblush: 0xfff0f5,
      lawngreen: 0x7cfc00,
      lemonchiffon: 0xfffacd,
      lightblue: 0xadd8e6,
      lightcoral: 0xf08080,
      lightcyan: 0xe0ffff,
      lightgoldenrodyellow: 0xfafad2,
      lightgray: 0xd3d3d3,
      lightgreen: 0x90ee90,
      lightgrey: 0xd3d3d3,
      lightpink: 0xffb6c1,
      lightsalmon: 0xffa07a,
      lightseagreen: 0x20b2aa,
      lightskyblue: 0x87cefa,
      lightslategray: 0x778899,
      lightslategrey: 0x778899,
      lightsteelblue: 0xb0c4de,
      lightyellow: 0xffffe0,
      lime: 0x00ff00,
      limegreen: 0x32cd32,
      linen: 0xfaf0e6,
      magenta: 0xff00ff,
      maroon: 0x800000,
      mediumaquamarine: 0x66cdaa,
      mediumblue: 0x0000cd,
      mediumorchid: 0xba55d3,
      mediumpurple: 0x9370db,
      mediumseagreen: 0x3cb371,
      mediumslateblue: 0x7b68ee,
      mediumspringgreen: 0x00fa9a,
      mediumturquoise: 0x48d1cc,
      mediumvioletred: 0xc71585,
      midnightblue: 0x191970,
      mintcream: 0xf5fffa,
      mistyrose: 0xffe4e1,
      moccasin: 0xffe4b5,
      navajowhite: 0xffdead,
      navy: 0x000080,
      oldlace: 0xfdf5e6,
      olive: 0x808000,
      olivedrab: 0x6b8e23,
      orange: 0xffa500,
      orangered: 0xff4500,
      orchid: 0xda70d6,
      palegoldenrod: 0xeee8aa,
      palegreen: 0x98fb98,
      paleturquoise: 0xafeeee,
      palevioletred: 0xdb7093,
      papayawhip: 0xffefd5,
      peachpuff: 0xffdab9,
      peru: 0xcd853f,
      pink: 0xffc0cb,
      plum: 0xdda0dd,
      powderblue: 0xb0e0e6,
      purple: 0x800080,
      rebeccapurple: 0x663399,
      red: 0xff0000,
      rosybrown: 0xbc8f8f,
      royalblue: 0x4169e1,
      saddlebrown: 0x8b4513,
      salmon: 0xfa8072,
      sandybrown: 0xf4a460,
      seagreen: 0x2e8b57,
      seashell: 0xfff5ee,
      sienna: 0xa0522d,
      silver: 0xc0c0c0,
      skyblue: 0x87ceeb,
      slateblue: 0x6a5acd,
      slategray: 0x708090,
      slategrey: 0x708090,
      snow: 0xfffafa,
      springgreen: 0x00ff7f,
      steelblue: 0x4682b4,
      tan: 0xd2b48c,
      teal: 0x008080,
      thistle: 0xd8bfd8,
      tomato: 0xff6347,
      turquoise: 0x40e0d0,
      violet: 0xee82ee,
      wheat: 0xf5deb3,
      white: 0xffffff,
      whitesmoke: 0xf5f5f5,
      yellow: 0xffff00,
      yellowgreen: 0x9acd32
    };

    define$1(Color, color, {
      displayable: function displayable() {
        return this.rgb().displayable();
      },
      hex: function hex() {
        return this.rgb().hex();
      },
      toString: function toString() {
        return this.rgb() + "";
      }
    });

    function color(format) {
      var m;
      format = (format + "").trim().toLowerCase();
      return (m = reHex3.exec(format)) ? (m = parseInt(m[1], 16), new Rgb(m >> 8 & 0xf | m >> 4 & 0x0f0, m >> 4 & 0xf | m & 0xf0, (m & 0xf) << 4 | m & 0xf, 1) // #f00
      ) : (m = reHex6.exec(format)) ? rgbn(parseInt(m[1], 16)) // #ff0000
      : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
      : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
      : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
      : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
      : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
      : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
      : named.hasOwnProperty(format) ? rgbn(named[format]) : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
    }

    function rgbn(n) {
      return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
    }

    function rgba(r, g, b, a) {
      if (a <= 0) r = g = b = NaN;
      return new Rgb(r, g, b, a);
    }

    function rgbConvert(o) {
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Rgb();
      o = o.rgb();
      return new Rgb(o.r, o.g, o.b, o.opacity);
    }

    function rgb(r, g, b, opacity) {
      return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
    }

    function Rgb(r, g, b, opacity) {
      this.r = +r;
      this.g = +g;
      this.b = +b;
      this.opacity = +opacity;
    }

    define$1(Rgb, rgb, extend(Color, {
      brighter: function brighter(k) {
        k = k == null ? _brighter : Math.pow(_brighter, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      darker: function darker(k) {
        k = k == null ? _darker : Math.pow(_darker, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      rgb: function rgb() {
        return this;
      },
      displayable: function displayable() {
        return 0 <= this.r && this.r <= 255 && 0 <= this.g && this.g <= 255 && 0 <= this.b && this.b <= 255 && 0 <= this.opacity && this.opacity <= 1;
      },
      hex: function hex() {
        return "#" + _hex(this.r) + _hex(this.g) + _hex(this.b);
      },
      toString: function toString() {
        var a = this.opacity;a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
        return (a === 1 ? "rgb(" : "rgba(") + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", " + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", " + Math.max(0, Math.min(255, Math.round(this.b) || 0)) + (a === 1 ? ")" : ", " + a + ")");
      }
    }));

    function _hex(value) {
      value = Math.max(0, Math.min(255, Math.round(value) || 0));
      return (value < 16 ? "0" : "") + value.toString(16);
    }

    function hsla(h, s, l, a) {
      if (a <= 0) h = s = l = NaN;else if (l <= 0 || l >= 1) h = s = NaN;else if (s <= 0) h = NaN;
      return new Hsl(h, s, l, a);
    }

    function hslConvert(o) {
      if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Hsl();
      if (o instanceof Hsl) return o;
      o = o.rgb();
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          h = NaN,
          s = max - min,
          l = (max + min) / 2;
      if (s) {
        if (r === max) h = (g - b) / s + (g < b) * 6;else if (g === max) h = (b - r) / s + 2;else h = (r - g) / s + 4;
        s /= l < 0.5 ? max + min : 2 - max - min;
        h *= 60;
      } else {
        s = l > 0 && l < 1 ? 0 : h;
      }
      return new Hsl(h, s, l, o.opacity);
    }

    function hsl(h, s, l, opacity) {
      return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
    }

    function Hsl(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define$1(Hsl, hsl, extend(Color, {
      brighter: function brighter(k) {
        k = k == null ? _brighter : Math.pow(_brighter, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      darker: function darker(k) {
        k = k == null ? _darker : Math.pow(_darker, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      rgb: function rgb() {
        var h = this.h % 360 + (this.h < 0) * 360,
            s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
            l = this.l,
            m2 = l + (l < 0.5 ? l : 1 - l) * s,
            m1 = 2 * l - m2;
        return new Rgb(hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2), hsl2rgb(h, m1, m2), hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2), this.opacity);
      },
      displayable: function displayable() {
        return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
      }
    }));

    /* From FvD 13.37, CSS Color Module Level 3 */
    function hsl2rgb(h, m1, m2) {
      return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
    }

    var deg2rad = Math.PI / 180;
    var rad2deg = 180 / Math.PI;

    // https://beta.observablehq.com/@mbostock/lab-and-rgb
    var K = 18,
        Xn = 0.96422,
        Yn = 1,
        Zn = 0.82521,
        t0 = 4 / 29,
        t1 = 6 / 29,
        t2 = 3 * t1 * t1,
        t3 = t1 * t1 * t1;

    function labConvert(o) {
      if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
      if (o instanceof Hcl) {
        if (isNaN(o.h)) return new Lab(o.l, 0, 0, o.opacity);
        var h = o.h * deg2rad;
        return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
      }
      if (!(o instanceof Rgb)) o = rgbConvert(o);
      var r = rgb2lrgb(o.r),
          g = rgb2lrgb(o.g),
          b = rgb2lrgb(o.b),
          y = xyz2lab((0.2225045 * r + 0.7168786 * g + 0.0606169 * b) / Yn),
          x,
          z;
      if (r === g && g === b) x = z = y;else {
        x = xyz2lab((0.4360747 * r + 0.3850649 * g + 0.1430804 * b) / Xn);
        z = xyz2lab((0.0139322 * r + 0.0971045 * g + 0.7141733 * b) / Zn);
      }
      return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
    }

    function lab(l, a, b, opacity) {
      return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity == null ? 1 : opacity);
    }

    function Lab(l, a, b, opacity) {
      this.l = +l;
      this.a = +a;
      this.b = +b;
      this.opacity = +opacity;
    }

    define$1(Lab, lab, extend(Color, {
      brighter: function brighter(k) {
        return new Lab(this.l + K * (k == null ? 1 : k), this.a, this.b, this.opacity);
      },
      darker: function darker(k) {
        return new Lab(this.l - K * (k == null ? 1 : k), this.a, this.b, this.opacity);
      },
      rgb: function rgb$$1() {
        var y = (this.l + 16) / 116,
            x = isNaN(this.a) ? y : y + this.a / 500,
            z = isNaN(this.b) ? y : y - this.b / 200;
        x = Xn * lab2xyz(x);
        y = Yn * lab2xyz(y);
        z = Zn * lab2xyz(z);
        return new Rgb(lrgb2rgb(3.1338561 * x - 1.6168667 * y - 0.4906146 * z), lrgb2rgb(-0.9787684 * x + 1.9161415 * y + 0.0334540 * z), lrgb2rgb(0.0719453 * x - 0.2289914 * y + 1.4052427 * z), this.opacity);
      }
    }));

    function xyz2lab(t) {
      return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
    }

    function lab2xyz(t) {
      return t > t1 ? t * t * t : t2 * (t - t0);
    }

    function lrgb2rgb(x) {
      return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
    }

    function rgb2lrgb(x) {
      return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    }

    function hclConvert(o) {
      if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
      if (!(o instanceof Lab)) o = labConvert(o);
      if (o.a === 0 && o.b === 0) return new Hcl(NaN, 0, o.l, o.opacity);
      var h = Math.atan2(o.b, o.a) * rad2deg;
      return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
    }

    function hcl(h, c, l, opacity) {
      return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
    }

    function Hcl(h, c, l, opacity) {
      this.h = +h;
      this.c = +c;
      this.l = +l;
      this.opacity = +opacity;
    }

    define$1(Hcl, hcl, extend(Color, {
      brighter: function brighter(k) {
        return new Hcl(this.h, this.c, this.l + K * (k == null ? 1 : k), this.opacity);
      },
      darker: function darker(k) {
        return new Hcl(this.h, this.c, this.l - K * (k == null ? 1 : k), this.opacity);
      },
      rgb: function rgb$$1() {
        return labConvert(this).rgb();
      }
    }));

    var A = -0.14861,
        B = +1.78277,
        C = -0.29227,
        D = -0.90649,
        E = +1.97294,
        ED = E * D,
        EB = E * B,
        BC_DA = B * C - D * A;

    function cubehelixConvert(o) {
      if (o instanceof Cubehelix) return new Cubehelix(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Rgb)) o = rgbConvert(o);
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB),
          bl = b - l,
          k = (E * (g - l) - C * bl) / D,
          s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)),
          // NaN if l=0 or l=1
      h = s ? Math.atan2(k, bl) * rad2deg - 120 : NaN;
      return new Cubehelix(h < 0 ? h + 360 : h, s, l, o.opacity);
    }

    function cubehelix(h, s, l, opacity) {
      return arguments.length === 1 ? cubehelixConvert(h) : new Cubehelix(h, s, l, opacity == null ? 1 : opacity);
    }

    function Cubehelix(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define$1(Cubehelix, cubehelix, extend(Color, {
      brighter: function brighter$$1(k) {
        k = k == null ? _brighter : Math.pow(_brighter, k);
        return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
      },
      darker: function darker$$1(k) {
        k = k == null ? _darker : Math.pow(_darker, k);
        return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
      },
      rgb: function rgb$$1() {
        var h = isNaN(this.h) ? 0 : (this.h + 120) * deg2rad,
            l = +this.l,
            a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
            cosh = Math.cos(h),
            sinh = Math.sin(h);
        return new Rgb(255 * (l + a * (A * cosh + B * sinh)), 255 * (l + a * (C * cosh + D * sinh)), 255 * (l + a * (E * cosh)), this.opacity);
      }
    }));

    function constant$2 (x) {
      return function () {
        return x;
      };
    }

    function linear(a, d) {
      return function (t) {
        return a + t * d;
      };
    }

    function exponential(a, b, y) {
      return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function (t) {
        return Math.pow(a + t * b, y);
      };
    }

    function gamma(y) {
      return (y = +y) === 1 ? nogamma : function (a, b) {
        return b - a ? exponential(a, b, y) : constant$2(isNaN(a) ? b : a);
      };
    }

    function nogamma(a, b) {
      var d = b - a;
      return d ? linear(a, d) : constant$2(isNaN(a) ? b : a);
    }

    var interpolateRgb = (function rgbGamma(y) {
      var color$$1 = gamma(y);

      function rgb$$1(start, end) {
        var r = color$$1((start = rgb(start)).r, (end = rgb(end)).r),
            g = color$$1(start.g, end.g),
            b = color$$1(start.b, end.b),
            opacity = nogamma(start.opacity, end.opacity);
        return function (t) {
          start.r = r(t);
          start.g = g(t);
          start.b = b(t);
          start.opacity = opacity(t);
          return start + "";
        };
      }

      rgb$$1.gamma = rgbGamma;

      return rgb$$1;
    })(1);

    function array (a, b) {
      var nb = b ? b.length : 0,
          na = a ? Math.min(nb, a.length) : 0,
          x = new Array(na),
          c = new Array(nb),
          i;

      for (i = 0; i < na; ++i) {
        x[i] = value(a[i], b[i]);
      }for (; i < nb; ++i) {
        c[i] = b[i];
      }return function (t) {
        for (i = 0; i < na; ++i) {
          c[i] = x[i](t);
        }return c;
      };
    }

    function date (a, b) {
      var d = new Date();
      return a = +a, b -= a, function (t) {
        return d.setTime(a + b * t), d;
      };
    }

    function interpolateNumber (a, b) {
      return a = +a, b -= a, function (t) {
        return a + b * t;
      };
    }

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
      return typeof obj;
    } : function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };

    var classCallCheck = function (instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    };

    var createClass = function () {
      function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
          var descriptor = props[i];
          descriptor.enumerable = descriptor.enumerable || false;
          descriptor.configurable = true;
          if ("value" in descriptor) descriptor.writable = true;
          Object.defineProperty(target, descriptor.key, descriptor);
        }
      }

      return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);
        if (staticProps) defineProperties(Constructor, staticProps);
        return Constructor;
      };
    }();

    var _extends = Object.assign || function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

    function object (a, b) {
      var i = {},
          c = {},
          k;

      if (a === null || (typeof a === "undefined" ? "undefined" : _typeof(a)) !== "object") a = {};
      if (b === null || (typeof b === "undefined" ? "undefined" : _typeof(b)) !== "object") b = {};

      for (k in b) {
        if (k in a) {
          i[k] = value(a[k], b[k]);
        } else {
          c[k] = b[k];
        }
      }

      return function (t) {
        for (k in i) {
          c[k] = i[k](t);
        }return c;
      };
    }

    var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
        reB = new RegExp(reA.source, "g");

    function zero(b) {
      return function () {
        return b;
      };
    }

    function one(b) {
      return function (t) {
        return b(t) + "";
      };
    }

    function interpolateString (a, b) {
      var bi = reA.lastIndex = reB.lastIndex = 0,
          // scan index for next number in b
      am,
          // current match in a
      bm,
          // current match in b
      bs,
          // string preceding current number in b, if any
      i = -1,
          // index in s
      s = [],
          // string constants and placeholders
      q = []; // number interpolators

      // Coerce inputs to strings.
      a = a + "", b = b + "";

      // Interpolate pairs of numbers in a & b.
      while ((am = reA.exec(a)) && (bm = reB.exec(b))) {
        if ((bs = bm.index) > bi) {
          // a string precedes the next number in b
          bs = b.slice(bi, bs);
          if (s[i]) s[i] += bs; // coalesce with previous string
          else s[++i] = bs;
        }
        if ((am = am[0]) === (bm = bm[0])) {
          // numbers in a & b match
          if (s[i]) s[i] += bm; // coalesce with previous string
          else s[++i] = bm;
        } else {
          // interpolate non-matching numbers
          s[++i] = null;
          q.push({ i: i, x: interpolateNumber(am, bm) });
        }
        bi = reB.lastIndex;
      }

      // Add remains of b.
      if (bi < b.length) {
        bs = b.slice(bi);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }

      // Special optimization for only a single match.
      // Otherwise, interpolate each of the numbers and rejoin the string.
      return s.length < 2 ? q[0] ? one(q[0].x) : zero(b) : (b = q.length, function (t) {
        for (var i = 0, o; i < b; ++i) {
          s[(o = q[i]).i] = o.x(t);
        }return s.join("");
      });
    }

    function value (a, b) {
        var t = typeof b === "undefined" ? "undefined" : _typeof(b),
            c;
        return b == null || t === "boolean" ? constant$2(b) : (t === "number" ? interpolateNumber : t === "string" ? (c = color(b)) ? (b = c, interpolateRgb) : interpolateString : b instanceof color ? interpolateRgb : b instanceof Date ? date : Array.isArray(b) ? array : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object : interpolateNumber)(a, b);
    }

    function interpolateRound (a, b) {
      return a = +a, b -= a, function (t) {
        return Math.round(a + b * t);
      };
    }

    var degrees = 180 / Math.PI;

    var identity = {
      translateX: 0,
      translateY: 0,
      rotate: 0,
      skewX: 0,
      scaleX: 1,
      scaleY: 1
    };

    function decompose (a, b, c, d, e, f) {
      var scaleX, scaleY, skewX;
      if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
      if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
      if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
      if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
      return {
        translateX: e,
        translateY: f,
        rotate: Math.atan2(b, a) * degrees,
        skewX: Math.atan(skewX) * degrees,
        scaleX: scaleX,
        scaleY: scaleY
      };
    }

    var cssNode, cssRoot, cssView, svgNode;

    function parseCss(value) {
      if (value === "none") return identity;
      if (!cssNode) cssNode = document.createElement("DIV"), cssRoot = document.documentElement, cssView = document.defaultView;
      cssNode.style.transform = value;
      value = cssView.getComputedStyle(cssRoot.appendChild(cssNode), null).getPropertyValue("transform");
      cssRoot.removeChild(cssNode);
      value = value.slice(7, -1).split(",");
      return decompose(+value[0], +value[1], +value[2], +value[3], +value[4], +value[5]);
    }

    function parseSvg(value) {
      if (value == null) return identity;
      if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
      svgNode.setAttribute("transform", value);
      if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
      value = value.matrix;
      return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
    }

    function interpolateTransform(parse, pxComma, pxParen, degParen) {

      function pop(s) {
        return s.length ? s.pop() + " " : "";
      }

      function translate(xa, ya, xb, yb, s, q) {
        if (xa !== xb || ya !== yb) {
          var i = s.push("translate(", null, pxComma, null, pxParen);
          q.push({ i: i - 4, x: interpolateNumber(xa, xb) }, { i: i - 2, x: interpolateNumber(ya, yb) });
        } else if (xb || yb) {
          s.push("translate(" + xb + pxComma + yb + pxParen);
        }
      }

      function rotate(a, b, s, q) {
        if (a !== b) {
          if (a - b > 180) b += 360;else if (b - a > 180) a += 360; // shortest path
          q.push({ i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: interpolateNumber(a, b) });
        } else if (b) {
          s.push(pop(s) + "rotate(" + b + degParen);
        }
      }

      function skewX(a, b, s, q) {
        if (a !== b) {
          q.push({ i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: interpolateNumber(a, b) });
        } else if (b) {
          s.push(pop(s) + "skewX(" + b + degParen);
        }
      }

      function scale(xa, ya, xb, yb, s, q) {
        if (xa !== xb || ya !== yb) {
          var i = s.push(pop(s) + "scale(", null, ",", null, ")");
          q.push({ i: i - 4, x: interpolateNumber(xa, xb) }, { i: i - 2, x: interpolateNumber(ya, yb) });
        } else if (xb !== 1 || yb !== 1) {
          s.push(pop(s) + "scale(" + xb + "," + yb + ")");
        }
      }

      return function (a, b) {
        var s = [],
            // string constants and placeholders
        q = []; // number interpolators
        a = parse(a), b = parse(b);
        translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
        rotate(a.rotate, b.rotate, s, q);
        skewX(a.skewX, b.skewX, s, q);
        scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
        a = b = null; // gc
        return function (t) {
          var i = -1,
              n = q.length,
              o;
          while (++i < n) {
            s[(o = q[i]).i] = o.x(t);
          }return s.join("");
        };
      };
    }

    var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
    var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

    var rho = Math.SQRT2;

    var frame = 0,
        // is an animation frame pending?
    timeout = 0,
        // is a timeout pending?
    interval = 0,
        // are any timers active?
    pokeDelay = 1000,
        // how frequently we check for clock skew
    taskHead,
        taskTail,
        clockLast = 0,
        clockNow = 0,
        clockSkew = 0,
        clock = (typeof performance === "undefined" ? "undefined" : _typeof(performance)) === "object" && performance.now ? performance : Date,
        setFrame = (typeof window === "undefined" ? "undefined" : _typeof(window)) === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (f) {
      setTimeout(f, 17);
    };

    function now() {
      return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
    }

    function clearNow() {
      clockNow = 0;
    }

    function Timer() {
      this._call = this._time = this._next = null;
    }

    Timer.prototype = timer.prototype = {
      constructor: Timer,
      restart: function restart(callback, delay, time) {
        if (typeof callback !== "function") throw new TypeError("callback is not a function");
        time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
        if (!this._next && taskTail !== this) {
          if (taskTail) taskTail._next = this;else taskHead = this;
          taskTail = this;
        }
        this._call = callback;
        this._time = time;
        sleep();
      },
      stop: function stop() {
        if (this._call) {
          this._call = null;
          this._time = Infinity;
          sleep();
        }
      }
    };

    function timer(callback, delay, time) {
      var t = new Timer();
      t.restart(callback, delay, time);
      return t;
    }

    function timerFlush() {
      now(); // Get the current time, if not already set.
      ++frame; // Pretend we’ve set an alarm, if we haven’t already.
      var t = taskHead,
          e;
      while (t) {
        if ((e = clockNow - t._time) >= 0) t._call.call(null, e);
        t = t._next;
      }
      --frame;
    }

    function wake() {
      clockNow = (clockLast = clock.now()) + clockSkew;
      frame = timeout = 0;
      try {
        timerFlush();
      } finally {
        frame = 0;
        nap();
        clockNow = 0;
      }
    }

    function poke() {
      var now = clock.now(),
          delay = now - clockLast;
      if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
    }

    function nap() {
      var t0,
          t1 = taskHead,
          t2,
          time = Infinity;
      while (t1) {
        if (t1._call) {
          if (time > t1._time) time = t1._time;
          t0 = t1, t1 = t1._next;
        } else {
          t2 = t1._next, t1._next = null;
          t1 = t0 ? t0._next = t2 : taskHead = t2;
        }
      }
      taskTail = t0;
      sleep(time);
    }

    function sleep(time) {
      if (frame) return; // Soonest alarm already set, or will be.
      if (timeout) timeout = clearTimeout(timeout);
      var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
      if (delay > 24) {
        if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
        if (interval) interval = clearInterval(interval);
      } else {
        if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
        frame = 1, setFrame(wake);
      }
    }

    function timeout$1 (callback, delay, time) {
      var t = new Timer();
      delay = delay == null ? 0 : +delay;
      t.restart(function (elapsed) {
        t.stop();
        callback(elapsed + delay);
      }, delay, time);
      return t;
    }

    var emptyOn = dispatch("start", "end", "interrupt");
    var emptyTween = [];

    var CREATED = 0;
    var SCHEDULED = 1;
    var STARTING = 2;
    var STARTED = 3;
    var RUNNING = 4;
    var ENDING = 5;
    var ENDED = 6;

    function schedule (node, name, id, index, group, timing) {
      var schedules = node.__transition;
      if (!schedules) node.__transition = {};else if (id in schedules) return;
      create$1(node, id, {
        name: name,
        index: index, // For context during callback.
        group: group, // For context during callback.
        on: emptyOn,
        tween: emptyTween,
        time: timing.time,
        delay: timing.delay,
        duration: timing.duration,
        ease: timing.ease,
        timer: null,
        state: CREATED
      });
    }

    function init(node, id) {
      var schedule = get$2(node, id);
      if (schedule.state > CREATED) throw new Error("too late; already scheduled");
      return schedule;
    }

    function set$2(node, id) {
      var schedule = get$2(node, id);
      if (schedule.state > STARTING) throw new Error("too late; already started");
      return schedule;
    }

    function get$2(node, id) {
      var schedule = node.__transition;
      if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
      return schedule;
    }

    function create$1(node, id, self) {
      var schedules = node.__transition,
          tween;

      // Initialize the self timer when the transition is created.
      // Note the actual delay is not known until the first callback!
      schedules[id] = self;
      self.timer = timer(schedule, 0, self.time);

      function schedule(elapsed) {
        self.state = SCHEDULED;
        self.timer.restart(start, self.delay, self.time);

        // If the elapsed delay is less than our first sleep, start immediately.
        if (self.delay <= elapsed) start(elapsed - self.delay);
      }

      function start(elapsed) {
        var i, j, n, o;

        // If the state is not SCHEDULED, then we previously errored on start.
        if (self.state !== SCHEDULED) return stop();

        for (i in schedules) {
          o = schedules[i];
          if (o.name !== self.name) continue;

          // While this element already has a starting transition during this frame,
          // defer starting an interrupting transition until that transition has a
          // chance to tick (and possibly end); see d3/d3-transition#54!
          if (o.state === STARTED) return timeout$1(start);

          // Interrupt the active transition, if any.
          // Dispatch the interrupt event.
          if (o.state === RUNNING) {
            o.state = ENDED;
            o.timer.stop();
            o.on.call("interrupt", node, node.__data__, o.index, o.group);
            delete schedules[i];
          }

          // Cancel any pre-empted transitions. No interrupt event is dispatched
          // because the cancelled transitions never started. Note that this also
          // removes this transition from the pending list!
          else if (+i < id) {
              o.state = ENDED;
              o.timer.stop();
              delete schedules[i];
            }
        }

        // Defer the first tick to end of the current frame; see d3/d3#1576.
        // Note the transition may be canceled after start and before the first tick!
        // Note this must be scheduled before the start event; see d3/d3-transition#16!
        // Assuming this is successful, subsequent callbacks go straight to tick.
        timeout$1(function () {
          if (self.state === STARTED) {
            self.state = RUNNING;
            self.timer.restart(tick, self.delay, self.time);
            tick(elapsed);
          }
        });

        // Dispatch the start event.
        // Note this must be done before the tween are initialized.
        self.state = STARTING;
        self.on.call("start", node, node.__data__, self.index, self.group);
        if (self.state !== STARTING) return; // interrupted
        self.state = STARTED;

        // Initialize the tween, deleting null tween.
        tween = new Array(n = self.tween.length);
        for (i = 0, j = -1; i < n; ++i) {
          if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
            tween[++j] = o;
          }
        }
        tween.length = j + 1;
      }

      function tick(elapsed) {
        var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
            i = -1,
            n = tween.length;

        while (++i < n) {
          tween[i].call(null, t);
        }

        // Dispatch the end event.
        if (self.state === ENDING) {
          self.on.call("end", node, node.__data__, self.index, self.group);
          stop();
        }
      }

      function stop() {
        self.state = ENDED;
        self.timer.stop();
        delete schedules[id];
        for (var i in schedules) {
          return;
        } // eslint-disable-line no-unused-vars
        delete node.__transition;
      }
    }

    function interrupt (node, name) {
      var schedules = node.__transition,
          schedule$$1,
          active,
          empty = true,
          i;

      if (!schedules) return;

      name = name == null ? null : name + "";

      for (i in schedules) {
        if ((schedule$$1 = schedules[i]).name !== name) {
          empty = false;continue;
        }
        active = schedule$$1.state > STARTING && schedule$$1.state < ENDING;
        schedule$$1.state = ENDED;
        schedule$$1.timer.stop();
        if (active) schedule$$1.on.call("interrupt", node, node.__data__, schedule$$1.index, schedule$$1.group);
        delete schedules[i];
      }

      if (empty) delete node.__transition;
    }

    function selection_interrupt (name) {
      return this.each(function () {
        interrupt(this, name);
      });
    }

    function tweenRemove(id, name) {
      var tween0, tween1;
      return function () {
        var schedule$$1 = set$2(this, id),
            tween = schedule$$1.tween;

        // If this node shared tween with the previous node,
        // just assign the updated shared tween and we’re done!
        // Otherwise, copy-on-write.
        if (tween !== tween0) {
          tween1 = tween0 = tween;
          for (var i = 0, n = tween1.length; i < n; ++i) {
            if (tween1[i].name === name) {
              tween1 = tween1.slice();
              tween1.splice(i, 1);
              break;
            }
          }
        }

        schedule$$1.tween = tween1;
      };
    }

    function tweenFunction(id, name, value) {
      var tween0, tween1;
      if (typeof value !== "function") throw new Error();
      return function () {
        var schedule$$1 = set$2(this, id),
            tween = schedule$$1.tween;

        // If this node shared tween with the previous node,
        // just assign the updated shared tween and we’re done!
        // Otherwise, copy-on-write.
        if (tween !== tween0) {
          tween1 = (tween0 = tween).slice();
          for (var t = { name: name, value: value }, i = 0, n = tween1.length; i < n; ++i) {
            if (tween1[i].name === name) {
              tween1[i] = t;
              break;
            }
          }
          if (i === n) tween1.push(t);
        }

        schedule$$1.tween = tween1;
      };
    }

    function transition_tween (name, value) {
      var id = this._id;

      name += "";

      if (arguments.length < 2) {
        var tween = get$2(this.node(), id).tween;
        for (var i = 0, n = tween.length, t; i < n; ++i) {
          if ((t = tween[i]).name === name) {
            return t.value;
          }
        }
        return null;
      }

      return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
    }

    function tweenValue(transition, name, value) {
      var id = transition._id;

      transition.each(function () {
        var schedule$$1 = set$2(this, id);
        (schedule$$1.value || (schedule$$1.value = {}))[name] = value.apply(this, arguments);
      });

      return function (node) {
        return get$2(node, id).value[name];
      };
    }

    function define$2 (constructor, factory, prototype) {
      constructor.prototype = factory.prototype = prototype;
      prototype.constructor = constructor;
    }

    function extend$1(parent, definition) {
      var prototype = Object.create(parent.prototype);
      for (var key in definition) {
        prototype[key] = definition[key];
      }return prototype;
    }

    function Color$1() {}

    var _darker$1 = 0.7;
    var _brighter$1 = 1 / _darker$1;
    var reI$1 = "\\s*([+-]?\\d+)\\s*",
        reN$1 = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
        reP$1 = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
        reHex3$1 = /^#([0-9a-f]{3})$/,
        reHex6$1 = /^#([0-9a-f]{6})$/,
        reRgbInteger$1 = new RegExp("^rgb\\(" + [reI$1, reI$1, reI$1] + "\\)$"),
        reRgbPercent$1 = new RegExp("^rgb\\(" + [reP$1, reP$1, reP$1] + "\\)$"),
        reRgbaInteger$1 = new RegExp("^rgba\\(" + [reI$1, reI$1, reI$1, reN$1] + "\\)$"),
        reRgbaPercent$1 = new RegExp("^rgba\\(" + [reP$1, reP$1, reP$1, reN$1] + "\\)$"),
        reHslPercent$1 = new RegExp("^hsl\\(" + [reN$1, reP$1, reP$1] + "\\)$"),
        reHslaPercent$1 = new RegExp("^hsla\\(" + [reN$1, reP$1, reP$1, reN$1] + "\\)$");

    var named$1 = {
      aliceblue: 0xf0f8ff,
      antiquewhite: 0xfaebd7,
      aqua: 0x00ffff,
      aquamarine: 0x7fffd4,
      azure: 0xf0ffff,
      beige: 0xf5f5dc,
      bisque: 0xffe4c4,
      black: 0x000000,
      blanchedalmond: 0xffebcd,
      blue: 0x0000ff,
      blueviolet: 0x8a2be2,
      brown: 0xa52a2a,
      burlywood: 0xdeb887,
      cadetblue: 0x5f9ea0,
      chartreuse: 0x7fff00,
      chocolate: 0xd2691e,
      coral: 0xff7f50,
      cornflowerblue: 0x6495ed,
      cornsilk: 0xfff8dc,
      crimson: 0xdc143c,
      cyan: 0x00ffff,
      darkblue: 0x00008b,
      darkcyan: 0x008b8b,
      darkgoldenrod: 0xb8860b,
      darkgray: 0xa9a9a9,
      darkgreen: 0x006400,
      darkgrey: 0xa9a9a9,
      darkkhaki: 0xbdb76b,
      darkmagenta: 0x8b008b,
      darkolivegreen: 0x556b2f,
      darkorange: 0xff8c00,
      darkorchid: 0x9932cc,
      darkred: 0x8b0000,
      darksalmon: 0xe9967a,
      darkseagreen: 0x8fbc8f,
      darkslateblue: 0x483d8b,
      darkslategray: 0x2f4f4f,
      darkslategrey: 0x2f4f4f,
      darkturquoise: 0x00ced1,
      darkviolet: 0x9400d3,
      deeppink: 0xff1493,
      deepskyblue: 0x00bfff,
      dimgray: 0x696969,
      dimgrey: 0x696969,
      dodgerblue: 0x1e90ff,
      firebrick: 0xb22222,
      floralwhite: 0xfffaf0,
      forestgreen: 0x228b22,
      fuchsia: 0xff00ff,
      gainsboro: 0xdcdcdc,
      ghostwhite: 0xf8f8ff,
      gold: 0xffd700,
      goldenrod: 0xdaa520,
      gray: 0x808080,
      green: 0x008000,
      greenyellow: 0xadff2f,
      grey: 0x808080,
      honeydew: 0xf0fff0,
      hotpink: 0xff69b4,
      indianred: 0xcd5c5c,
      indigo: 0x4b0082,
      ivory: 0xfffff0,
      khaki: 0xf0e68c,
      lavender: 0xe6e6fa,
      lavenderblush: 0xfff0f5,
      lawngreen: 0x7cfc00,
      lemonchiffon: 0xfffacd,
      lightblue: 0xadd8e6,
      lightcoral: 0xf08080,
      lightcyan: 0xe0ffff,
      lightgoldenrodyellow: 0xfafad2,
      lightgray: 0xd3d3d3,
      lightgreen: 0x90ee90,
      lightgrey: 0xd3d3d3,
      lightpink: 0xffb6c1,
      lightsalmon: 0xffa07a,
      lightseagreen: 0x20b2aa,
      lightskyblue: 0x87cefa,
      lightslategray: 0x778899,
      lightslategrey: 0x778899,
      lightsteelblue: 0xb0c4de,
      lightyellow: 0xffffe0,
      lime: 0x00ff00,
      limegreen: 0x32cd32,
      linen: 0xfaf0e6,
      magenta: 0xff00ff,
      maroon: 0x800000,
      mediumaquamarine: 0x66cdaa,
      mediumblue: 0x0000cd,
      mediumorchid: 0xba55d3,
      mediumpurple: 0x9370db,
      mediumseagreen: 0x3cb371,
      mediumslateblue: 0x7b68ee,
      mediumspringgreen: 0x00fa9a,
      mediumturquoise: 0x48d1cc,
      mediumvioletred: 0xc71585,
      midnightblue: 0x191970,
      mintcream: 0xf5fffa,
      mistyrose: 0xffe4e1,
      moccasin: 0xffe4b5,
      navajowhite: 0xffdead,
      navy: 0x000080,
      oldlace: 0xfdf5e6,
      olive: 0x808000,
      olivedrab: 0x6b8e23,
      orange: 0xffa500,
      orangered: 0xff4500,
      orchid: 0xda70d6,
      palegoldenrod: 0xeee8aa,
      palegreen: 0x98fb98,
      paleturquoise: 0xafeeee,
      palevioletred: 0xdb7093,
      papayawhip: 0xffefd5,
      peachpuff: 0xffdab9,
      peru: 0xcd853f,
      pink: 0xffc0cb,
      plum: 0xdda0dd,
      powderblue: 0xb0e0e6,
      purple: 0x800080,
      rebeccapurple: 0x663399,
      red: 0xff0000,
      rosybrown: 0xbc8f8f,
      royalblue: 0x4169e1,
      saddlebrown: 0x8b4513,
      salmon: 0xfa8072,
      sandybrown: 0xf4a460,
      seagreen: 0x2e8b57,
      seashell: 0xfff5ee,
      sienna: 0xa0522d,
      silver: 0xc0c0c0,
      skyblue: 0x87ceeb,
      slateblue: 0x6a5acd,
      slategray: 0x708090,
      slategrey: 0x708090,
      snow: 0xfffafa,
      springgreen: 0x00ff7f,
      steelblue: 0x4682b4,
      tan: 0xd2b48c,
      teal: 0x008080,
      thistle: 0xd8bfd8,
      tomato: 0xff6347,
      turquoise: 0x40e0d0,
      violet: 0xee82ee,
      wheat: 0xf5deb3,
      white: 0xffffff,
      whitesmoke: 0xf5f5f5,
      yellow: 0xffff00,
      yellowgreen: 0x9acd32
    };

    define$2(Color$1, color$1, {
      displayable: function displayable() {
        return this.rgb().displayable();
      },
      toString: function toString() {
        return this.rgb() + "";
      }
    });

    function color$1(format) {
      var m;
      format = (format + "").trim().toLowerCase();
      return (m = reHex3$1.exec(format)) ? (m = parseInt(m[1], 16), new Rgb$1(m >> 8 & 0xf | m >> 4 & 0x0f0, m >> 4 & 0xf | m & 0xf0, (m & 0xf) << 4 | m & 0xf, 1) // #f00
      ) : (m = reHex6$1.exec(format)) ? rgbn$1(parseInt(m[1], 16)) // #ff0000
      : (m = reRgbInteger$1.exec(format)) ? new Rgb$1(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
      : (m = reRgbPercent$1.exec(format)) ? new Rgb$1(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
      : (m = reRgbaInteger$1.exec(format)) ? rgba$1(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
      : (m = reRgbaPercent$1.exec(format)) ? rgba$1(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
      : (m = reHslPercent$1.exec(format)) ? hsla$1(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
      : (m = reHslaPercent$1.exec(format)) ? hsla$1(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
      : named$1.hasOwnProperty(format) ? rgbn$1(named$1[format]) : format === "transparent" ? new Rgb$1(NaN, NaN, NaN, 0) : null;
    }

    function rgbn$1(n) {
      return new Rgb$1(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
    }

    function rgba$1(r, g, b, a) {
      if (a <= 0) r = g = b = NaN;
      return new Rgb$1(r, g, b, a);
    }

    function rgbConvert$1(o) {
      if (!(o instanceof Color$1)) o = color$1(o);
      if (!o) return new Rgb$1();
      o = o.rgb();
      return new Rgb$1(o.r, o.g, o.b, o.opacity);
    }

    function rgb$1(r, g, b, opacity) {
      return arguments.length === 1 ? rgbConvert$1(r) : new Rgb$1(r, g, b, opacity == null ? 1 : opacity);
    }

    function Rgb$1(r, g, b, opacity) {
      this.r = +r;
      this.g = +g;
      this.b = +b;
      this.opacity = +opacity;
    }

    define$2(Rgb$1, rgb$1, extend$1(Color$1, {
      brighter: function brighter(k) {
        k = k == null ? _brighter$1 : Math.pow(_brighter$1, k);
        return new Rgb$1(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      darker: function darker(k) {
        k = k == null ? _darker$1 : Math.pow(_darker$1, k);
        return new Rgb$1(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      rgb: function rgb() {
        return this;
      },
      displayable: function displayable() {
        return 0 <= this.r && this.r <= 255 && 0 <= this.g && this.g <= 255 && 0 <= this.b && this.b <= 255 && 0 <= this.opacity && this.opacity <= 1;
      },
      toString: function toString() {
        var a = this.opacity;a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
        return (a === 1 ? "rgb(" : "rgba(") + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", " + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", " + Math.max(0, Math.min(255, Math.round(this.b) || 0)) + (a === 1 ? ")" : ", " + a + ")");
      }
    }));

    function hsla$1(h, s, l, a) {
      if (a <= 0) h = s = l = NaN;else if (l <= 0 || l >= 1) h = s = NaN;else if (s <= 0) h = NaN;
      return new Hsl$1(h, s, l, a);
    }

    function hslConvert$1(o) {
      if (o instanceof Hsl$1) return new Hsl$1(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Color$1)) o = color$1(o);
      if (!o) return new Hsl$1();
      if (o instanceof Hsl$1) return o;
      o = o.rgb();
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          h = NaN,
          s = max - min,
          l = (max + min) / 2;
      if (s) {
        if (r === max) h = (g - b) / s + (g < b) * 6;else if (g === max) h = (b - r) / s + 2;else h = (r - g) / s + 4;
        s /= l < 0.5 ? max + min : 2 - max - min;
        h *= 60;
      } else {
        s = l > 0 && l < 1 ? 0 : h;
      }
      return new Hsl$1(h, s, l, o.opacity);
    }

    function hsl$3(h, s, l, opacity) {
      return arguments.length === 1 ? hslConvert$1(h) : new Hsl$1(h, s, l, opacity == null ? 1 : opacity);
    }

    function Hsl$1(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define$2(Hsl$1, hsl$3, extend$1(Color$1, {
      brighter: function brighter(k) {
        k = k == null ? _brighter$1 : Math.pow(_brighter$1, k);
        return new Hsl$1(this.h, this.s, this.l * k, this.opacity);
      },
      darker: function darker(k) {
        k = k == null ? _darker$1 : Math.pow(_darker$1, k);
        return new Hsl$1(this.h, this.s, this.l * k, this.opacity);
      },
      rgb: function rgb() {
        var h = this.h % 360 + (this.h < 0) * 360,
            s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
            l = this.l,
            m2 = l + (l < 0.5 ? l : 1 - l) * s,
            m1 = 2 * l - m2;
        return new Rgb$1(hsl2rgb$1(h >= 240 ? h - 240 : h + 120, m1, m2), hsl2rgb$1(h, m1, m2), hsl2rgb$1(h < 120 ? h + 240 : h - 120, m1, m2), this.opacity);
      },
      displayable: function displayable() {
        return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
      }
    }));

    /* From FvD 13.37, CSS Color Module Level 3 */
    function hsl2rgb$1(h, m1, m2) {
      return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
    }

    var deg2rad$1 = Math.PI / 180;
    var rad2deg$1 = 180 / Math.PI;

    var Kn = 18,
        Xn$1 = 0.950470,
        // D65 standard referent
    Yn$1 = 1,
        Zn$1 = 1.088830,
        t0$1 = 4 / 29,
        t1$1 = 6 / 29,
        t2$1 = 3 * t1$1 * t1$1,
        t3$1 = t1$1 * t1$1 * t1$1;

    function labConvert$1(o) {
      if (o instanceof Lab$1) return new Lab$1(o.l, o.a, o.b, o.opacity);
      if (o instanceof Hcl$1) {
        var h = o.h * deg2rad$1;
        return new Lab$1(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
      }
      if (!(o instanceof Rgb$1)) o = rgbConvert$1(o);
      var b = rgb2xyz(o.r),
          a = rgb2xyz(o.g),
          l = rgb2xyz(o.b),
          x = xyz2lab$1((0.4124564 * b + 0.3575761 * a + 0.1804375 * l) / Xn$1),
          y = xyz2lab$1((0.2126729 * b + 0.7151522 * a + 0.0721750 * l) / Yn$1),
          z = xyz2lab$1((0.0193339 * b + 0.1191920 * a + 0.9503041 * l) / Zn$1);
      return new Lab$1(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
    }

    function lab$2(l, a, b, opacity) {
      return arguments.length === 1 ? labConvert$1(l) : new Lab$1(l, a, b, opacity == null ? 1 : opacity);
    }

    function Lab$1(l, a, b, opacity) {
      this.l = +l;
      this.a = +a;
      this.b = +b;
      this.opacity = +opacity;
    }

    define$2(Lab$1, lab$2, extend$1(Color$1, {
      brighter: function brighter(k) {
        return new Lab$1(this.l + Kn * (k == null ? 1 : k), this.a, this.b, this.opacity);
      },
      darker: function darker(k) {
        return new Lab$1(this.l - Kn * (k == null ? 1 : k), this.a, this.b, this.opacity);
      },
      rgb: function rgb() {
        var y = (this.l + 16) / 116,
            x = isNaN(this.a) ? y : y + this.a / 500,
            z = isNaN(this.b) ? y : y - this.b / 200;
        y = Yn$1 * lab2xyz$1(y);
        x = Xn$1 * lab2xyz$1(x);
        z = Zn$1 * lab2xyz$1(z);
        return new Rgb$1(xyz2rgb(3.2404542 * x - 1.5371385 * y - 0.4985314 * z), // D65 -> sRGB
        xyz2rgb(-0.9692660 * x + 1.8760108 * y + 0.0415560 * z), xyz2rgb(0.0556434 * x - 0.2040259 * y + 1.0572252 * z), this.opacity);
      }
    }));

    function xyz2lab$1(t) {
      return t > t3$1 ? Math.pow(t, 1 / 3) : t / t2$1 + t0$1;
    }

    function lab2xyz$1(t) {
      return t > t1$1 ? t * t * t : t2$1 * (t - t0$1);
    }

    function xyz2rgb(x) {
      return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
    }

    function rgb2xyz(x) {
      return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    }

    function hclConvert$1(o) {
      if (o instanceof Hcl$1) return new Hcl$1(o.h, o.c, o.l, o.opacity);
      if (!(o instanceof Lab$1)) o = labConvert$1(o);
      var h = Math.atan2(o.b, o.a) * rad2deg$1;
      return new Hcl$1(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
    }

    function hcl$3(h, c, l, opacity) {
      return arguments.length === 1 ? hclConvert$1(h) : new Hcl$1(h, c, l, opacity == null ? 1 : opacity);
    }

    function Hcl$1(h, c, l, opacity) {
      this.h = +h;
      this.c = +c;
      this.l = +l;
      this.opacity = +opacity;
    }

    define$2(Hcl$1, hcl$3, extend$1(Color$1, {
      brighter: function brighter(k) {
        return new Hcl$1(this.h, this.c, this.l + Kn * (k == null ? 1 : k), this.opacity);
      },
      darker: function darker(k) {
        return new Hcl$1(this.h, this.c, this.l - Kn * (k == null ? 1 : k), this.opacity);
      },
      rgb: function rgb() {
        return labConvert$1(this).rgb();
      }
    }));

    var A$1 = -0.14861,
        B$1 = +1.78277,
        C$1 = -0.29227,
        D$1 = -0.90649,
        E$1 = +1.97294,
        ED$1 = E$1 * D$1,
        EB$1 = E$1 * B$1,
        BC_DA$1 = B$1 * C$1 - D$1 * A$1;

    function cubehelixConvert$1(o) {
      if (o instanceof Cubehelix$1) return new Cubehelix$1(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Rgb$1)) o = rgbConvert$1(o);
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          l = (BC_DA$1 * b + ED$1 * r - EB$1 * g) / (BC_DA$1 + ED$1 - EB$1),
          bl = b - l,
          k = (E$1 * (g - l) - C$1 * bl) / D$1,
          s = Math.sqrt(k * k + bl * bl) / (E$1 * l * (1 - l)),
          // NaN if l=0 or l=1
      h = s ? Math.atan2(k, bl) * rad2deg$1 - 120 : NaN;
      return new Cubehelix$1(h < 0 ? h + 360 : h, s, l, o.opacity);
    }

    function cubehelix$3(h, s, l, opacity) {
      return arguments.length === 1 ? cubehelixConvert$1(h) : new Cubehelix$1(h, s, l, opacity == null ? 1 : opacity);
    }

    function Cubehelix$1(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define$2(Cubehelix$1, cubehelix$3, extend$1(Color$1, {
      brighter: function brighter$$1(k) {
        k = k == null ? _brighter$1 : Math.pow(_brighter$1, k);
        return new Cubehelix$1(this.h, this.s, this.l * k, this.opacity);
      },
      darker: function darker$$1(k) {
        k = k == null ? _darker$1 : Math.pow(_darker$1, k);
        return new Cubehelix$1(this.h, this.s, this.l * k, this.opacity);
      },
      rgb: function rgb() {
        var h = isNaN(this.h) ? 0 : (this.h + 120) * deg2rad$1,
            l = +this.l,
            a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
            cosh = Math.cos(h),
            sinh = Math.sin(h);
        return new Rgb$1(255 * (l + a * (A$1 * cosh + B$1 * sinh)), 255 * (l + a * (C$1 * cosh + D$1 * sinh)), 255 * (l + a * (E$1 * cosh)), this.opacity);
      }
    }));

    function interpolate (a, b) {
        var c;
        return (typeof b === "number" ? interpolateNumber : b instanceof color$1 ? interpolateRgb : (c = color$1(b)) ? (b = c, interpolateRgb) : interpolateString)(a, b);
    }

    function attrRemove$1(name) {
      return function () {
        this.removeAttribute(name);
      };
    }

    function attrRemoveNS$1(fullname) {
      return function () {
        this.removeAttributeNS(fullname.space, fullname.local);
      };
    }

    function attrConstant$1(name, interpolate$$1, value1) {
      var value00, interpolate0;
      return function () {
        var value0 = this.getAttribute(name);
        return value0 === value1 ? null : value0 === value00 ? interpolate0 : interpolate0 = interpolate$$1(value00 = value0, value1);
      };
    }

    function attrConstantNS$1(fullname, interpolate$$1, value1) {
      var value00, interpolate0;
      return function () {
        var value0 = this.getAttributeNS(fullname.space, fullname.local);
        return value0 === value1 ? null : value0 === value00 ? interpolate0 : interpolate0 = interpolate$$1(value00 = value0, value1);
      };
    }

    function attrFunction$1(name, interpolate$$1, value$$1) {
      var value00, value10, interpolate0;
      return function () {
        var value0,
            value1 = value$$1(this);
        if (value1 == null) return void this.removeAttribute(name);
        value0 = this.getAttribute(name);
        return value0 === value1 ? null : value0 === value00 && value1 === value10 ? interpolate0 : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
      };
    }

    function attrFunctionNS$1(fullname, interpolate$$1, value$$1) {
      var value00, value10, interpolate0;
      return function () {
        var value0,
            value1 = value$$1(this);
        if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
        value0 = this.getAttributeNS(fullname.space, fullname.local);
        return value0 === value1 ? null : value0 === value00 && value1 === value10 ? interpolate0 : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
      };
    }

    function transition_attr (name, value$$1) {
      var fullname = namespace(name),
          i = fullname === "transform" ? interpolateTransformSvg : interpolate;
      return this.attrTween(name, typeof value$$1 === "function" ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)(fullname, i, tweenValue(this, "attr." + name, value$$1)) : value$$1 == null ? (fullname.local ? attrRemoveNS$1 : attrRemove$1)(fullname) : (fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, i, value$$1 + ""));
    }

    function attrTweenNS(fullname, value) {
      function tween() {
        var node = this,
            i = value.apply(node, arguments);
        return i && function (t) {
          node.setAttributeNS(fullname.space, fullname.local, i(t));
        };
      }
      tween._value = value;
      return tween;
    }

    function attrTween(name, value) {
      function tween() {
        var node = this,
            i = value.apply(node, arguments);
        return i && function (t) {
          node.setAttribute(name, i(t));
        };
      }
      tween._value = value;
      return tween;
    }

    function transition_attrTween (name, value) {
      var key = "attr." + name;
      if (arguments.length < 2) return (key = this.tween(key)) && key._value;
      if (value == null) return this.tween(key, null);
      if (typeof value !== "function") throw new Error();
      var fullname = namespace(name);
      return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
    }

    function delayFunction(id, value) {
      return function () {
        init(this, id).delay = +value.apply(this, arguments);
      };
    }

    function delayConstant(id, value) {
      return value = +value, function () {
        init(this, id).delay = value;
      };
    }

    function transition_delay (value) {
      var id = this._id;

      return arguments.length ? this.each((typeof value === "function" ? delayFunction : delayConstant)(id, value)) : get$2(this.node(), id).delay;
    }

    function durationFunction(id, value) {
      return function () {
        set$2(this, id).duration = +value.apply(this, arguments);
      };
    }

    function durationConstant(id, value) {
      return value = +value, function () {
        set$2(this, id).duration = value;
      };
    }

    function transition_duration (value) {
      var id = this._id;

      return arguments.length ? this.each((typeof value === "function" ? durationFunction : durationConstant)(id, value)) : get$2(this.node(), id).duration;
    }

    function easeConstant(id, value) {
      if (typeof value !== "function") throw new Error();
      return function () {
        set$2(this, id).ease = value;
      };
    }

    function transition_ease (value) {
      var id = this._id;

      return arguments.length ? this.each(easeConstant(id, value)) : get$2(this.node(), id).ease;
    }

    function transition_filter (match) {
      if (typeof match !== "function") match = matcher$1(match);

      for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
          if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
            subgroup.push(node);
          }
        }
      }

      return new Transition(subgroups, this._parents, this._name, this._id);
    }

    function transition_merge (transition$$1) {
      if (transition$$1._id !== this._id) throw new Error();

      for (var groups0 = this._groups, groups1 = transition$$1._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
        for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
          if (node = group0[i] || group1[i]) {
            merge[i] = node;
          }
        }
      }

      for (; j < m0; ++j) {
        merges[j] = groups0[j];
      }

      return new Transition(merges, this._parents, this._name, this._id);
    }

    function start(name) {
      return (name + "").trim().split(/^|\s+/).every(function (t) {
        var i = t.indexOf(".");
        if (i >= 0) t = t.slice(0, i);
        return !t || t === "start";
      });
    }

    function onFunction(id, name, listener) {
      var on0,
          on1,
          sit = start(name) ? init : set$2;
      return function () {
        var schedule$$1 = sit(this, id),
            on = schedule$$1.on;

        // If this node shared a dispatch with the previous node,
        // just assign the updated shared dispatch and we’re done!
        // Otherwise, copy-on-write.
        if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

        schedule$$1.on = on1;
      };
    }

    function transition_on (name, listener) {
      var id = this._id;

      return arguments.length < 2 ? get$2(this.node(), id).on.on(name) : this.each(onFunction(id, name, listener));
    }

    function removeFunction(id) {
      return function () {
        var parent = this.parentNode;
        for (var i in this.__transition) {
          if (+i !== id) return;
        }if (parent) parent.removeChild(this);
      };
    }

    function transition_remove () {
      return this.on("end.remove", removeFunction(this._id));
    }

    function transition_select (select$$1) {
      var name = this._name,
          id = this._id;

      if (typeof select$$1 !== "function") select$$1 = selector(select$$1);

      for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
          if ((node = group[i]) && (subnode = select$$1.call(node, node.__data__, i, group))) {
            if ("__data__" in node) subnode.__data__ = node.__data__;
            subgroup[i] = subnode;
            schedule(subgroup[i], name, id, i, subgroup, get$2(node, id));
          }
        }
      }

      return new Transition(subgroups, this._parents, name, id);
    }

    function transition_selectAll (select$$1) {
      var name = this._name,
          id = this._id;

      if (typeof select$$1 !== "function") select$$1 = selectorAll(select$$1);

      for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            for (var children = select$$1.call(node, node.__data__, i, group), child, inherit = get$2(node, id), k = 0, l = children.length; k < l; ++k) {
              if (child = children[k]) {
                schedule(child, name, id, k, children, inherit);
              }
            }
            subgroups.push(children);
            parents.push(node);
          }
        }
      }

      return new Transition(subgroups, parents, name, id);
    }

    var Selection$1 = selection.prototype.constructor;

    function transition_selection () {
      return new Selection$1(this._groups, this._parents);
    }

    function styleRemove$1(name, interpolate$$1) {
        var value00, value10, interpolate0;
        return function () {
            var value0 = styleValue(this, name),
                value1 = (this.style.removeProperty(name), styleValue(this, name));
            return value0 === value1 ? null : value0 === value00 && value1 === value10 ? interpolate0 : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
        };
    }

    function styleRemoveEnd(name) {
        return function () {
            this.style.removeProperty(name);
        };
    }

    function styleConstant$1(name, interpolate$$1, value1) {
        var value00, interpolate0;
        return function () {
            var value0 = styleValue(this, name);
            return value0 === value1 ? null : value0 === value00 ? interpolate0 : interpolate0 = interpolate$$1(value00 = value0, value1);
        };
    }

    function styleFunction$1(name, interpolate$$1, value$$1) {
        var value00, value10, interpolate0;
        return function () {
            var value0 = styleValue(this, name),
                value1 = value$$1(this);
            if (value1 == null) value1 = (this.style.removeProperty(name), styleValue(this, name));
            return value0 === value1 ? null : value0 === value00 && value1 === value10 ? interpolate0 : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
        };
    }

    function transition_style (name, value$$1, priority) {
        var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
        return value$$1 == null ? this.styleTween(name, styleRemove$1(name, i)).on("end.style." + name, styleRemoveEnd(name)) : this.styleTween(name, typeof value$$1 === "function" ? styleFunction$1(name, i, tweenValue(this, "style." + name, value$$1)) : styleConstant$1(name, i, value$$1 + ""), priority);
    }

    function styleTween(name, value, priority) {
      function tween() {
        var node = this,
            i = value.apply(node, arguments);
        return i && function (t) {
          node.style.setProperty(name, i(t), priority);
        };
      }
      tween._value = value;
      return tween;
    }

    function transition_styleTween (name, value, priority) {
      var key = "style." + (name += "");
      if (arguments.length < 2) return (key = this.tween(key)) && key._value;
      if (value == null) return this.tween(key, null);
      if (typeof value !== "function") throw new Error();
      return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
    }

    function textConstant$1(value) {
      return function () {
        this.textContent = value;
      };
    }

    function textFunction$1(value) {
      return function () {
        var value1 = value(this);
        this.textContent = value1 == null ? "" : value1;
      };
    }

    function transition_text (value) {
      return this.tween("text", typeof value === "function" ? textFunction$1(tweenValue(this, "text", value)) : textConstant$1(value == null ? "" : value + ""));
    }

    function transition_transition () {
      var name = this._name,
          id0 = this._id,
          id1 = newId();

      for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            var inherit = get$2(node, id0);
            schedule(node, name, id1, i, group, {
              time: inherit.time + inherit.delay + inherit.duration,
              delay: 0,
              duration: inherit.duration,
              ease: inherit.ease
            });
          }
        }
      }

      return new Transition(groups, this._parents, name, id1);
    }

    var id = 0;

    function Transition(groups, parents, name, id) {
      this._groups = groups;
      this._parents = parents;
      this._name = name;
      this._id = id;
    }

    function transition(name) {
      return selection().transition(name);
    }

    function newId() {
      return ++id;
    }

    var selection_prototype = selection.prototype;

    Transition.prototype = transition.prototype = {
      constructor: Transition,
      select: transition_select,
      selectAll: transition_selectAll,
      filter: transition_filter,
      merge: transition_merge,
      selection: transition_selection,
      transition: transition_transition,
      call: selection_prototype.call,
      nodes: selection_prototype.nodes,
      node: selection_prototype.node,
      size: selection_prototype.size,
      empty: selection_prototype.empty,
      each: selection_prototype.each,
      on: transition_on,
      attr: transition_attr,
      attrTween: transition_attrTween,
      style: transition_style,
      styleTween: transition_styleTween,
      text: transition_text,
      remove: transition_remove,
      tween: transition_tween,
      delay: transition_delay,
      duration: transition_duration,
      ease: transition_ease
    };

    function cubicInOut(t) {
      return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
    }

    var pi = Math.PI;

    var tau = 2 * Math.PI;

    var defaultTiming = {
      time: null, // Set on use.
      delay: 0,
      duration: 250,
      ease: cubicInOut
    };

    function inherit(node, id) {
      var timing;
      while (!(timing = node.__transition) || !(timing = timing[id])) {
        if (!(node = node.parentNode)) {
          return defaultTiming.time = now(), defaultTiming;
        }
      }
      return timing;
    }

    function selection_transition (name) {
      var id, timing;

      if (name instanceof Transition) {
        id = name._id, name = name._name;
      } else {
        id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
      }

      for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            schedule(node, name, id, i, group, timing || inherit(node, id));
          }
        }
      }

      return new Transition(groups, this._parents, name, id);
    }

    selection.prototype.interrupt = selection_interrupt;
    selection.prototype.transition = selection_transition;

    function constant$3 (x) {
      return function () {
        return x;
      };
    }

    function BrushEvent (target, type, selection) {
      this.target = target;
      this.type = type;
      this.selection = selection;
    }

    function nopropagation$1() {
      event.stopImmediatePropagation();
    }

    function noevent$1 () {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    var MODE_DRAG = { name: "drag" },
        MODE_SPACE = { name: "space" },
        MODE_HANDLE = { name: "handle" },
        MODE_CENTER = { name: "center" };

    var X = {
      name: "x",
      handles: ["e", "w"].map(type),
      input: function input(x, e) {
        return x && [[x[0], e[0][1]], [x[1], e[1][1]]];
      },
      output: function output(xy) {
        return xy && [xy[0][0], xy[1][0]];
      }
    };

    var Y = {
      name: "y",
      handles: ["n", "s"].map(type),
      input: function input(y, e) {
        return y && [[e[0][0], y[0]], [e[1][0], y[1]]];
      },
      output: function output(xy) {
        return xy && [xy[0][1], xy[1][1]];
      }
    };

    var cursors = {
      overlay: "crosshair",
      selection: "move",
      n: "ns-resize",
      e: "ew-resize",
      s: "ns-resize",
      w: "ew-resize",
      nw: "nwse-resize",
      ne: "nesw-resize",
      se: "nwse-resize",
      sw: "nesw-resize"
    };

    var flipX = {
      e: "w",
      w: "e",
      nw: "ne",
      ne: "nw",
      se: "sw",
      sw: "se"
    };

    var flipY = {
      n: "s",
      s: "n",
      nw: "sw",
      ne: "se",
      se: "ne",
      sw: "nw"
    };

    var signsX = {
      overlay: +1,
      selection: +1,
      n: null,
      e: +1,
      s: null,
      w: -1,
      nw: -1,
      ne: +1,
      se: +1,
      sw: -1
    };

    var signsY = {
      overlay: +1,
      selection: +1,
      n: -1,
      e: null,
      s: +1,
      w: null,
      nw: -1,
      ne: -1,
      se: +1,
      sw: +1
    };

    function type(t) {
      return { type: t };
    }

    // Ignore right-click, since that should open the context menu.
    function defaultFilter$1() {
      return !event.button;
    }

    function defaultExtent() {
      var svg = this.ownerSVGElement || this;
      return [[0, 0], [svg.width.baseVal.value, svg.height.baseVal.value]];
    }

    // Like d3.local, but with the name “__brush” rather than auto-generated.
    function local$1(node) {
      while (!node.__brush) {
        if (!(node = node.parentNode)) return;
      }return node.__brush;
    }

    function empty$1(extent) {
      return extent[0][0] === extent[1][0] || extent[0][1] === extent[1][1];
    }

    function brushSelection(node) {
      var state = node.__brush;
      return state ? state.dim.output(state.selection) : null;
    }

    function brushY() {
      return brush$1(Y);
    }

    function brush$1(dim) {
      var extent = defaultExtent,
          filter = defaultFilter$1,
          listeners = dispatch(brush, "start", "brush", "end"),
          handleSize = 6,
          touchending;

      function brush(group) {
        var overlay = group.property("__brush", initialize).selectAll(".overlay").data([type("overlay")]);

        overlay.enter().append("rect").attr("class", "overlay").attr("pointer-events", "all").attr("cursor", cursors.overlay).merge(overlay).each(function () {
          var extent = local$1(this).extent;
          select(this).attr("x", extent[0][0]).attr("y", extent[0][1]).attr("width", extent[1][0] - extent[0][0]).attr("height", extent[1][1] - extent[0][1]);
        });

        group.selectAll(".selection").data([type("selection")]).enter().append("rect").attr("class", "selection").attr("cursor", cursors.selection).attr("fill", "#777").attr("fill-opacity", 0.3).attr("stroke", "#fff").attr("shape-rendering", "crispEdges");

        var handle = group.selectAll(".handle").data(dim.handles, function (d) {
          return d.type;
        });

        handle.exit().remove();

        handle.enter().append("rect").attr("class", function (d) {
          return "handle handle--" + d.type;
        }).attr("cursor", function (d) {
          return cursors[d.type];
        });

        group.each(redraw).attr("fill", "none").attr("pointer-events", "all").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)").on("mousedown.brush touchstart.brush", started);
      }

      brush.move = function (group, selection$$1) {
        if (group.selection) {
          group.on("start.brush", function () {
            emitter(this, arguments).beforestart().start();
          }).on("interrupt.brush end.brush", function () {
            emitter(this, arguments).end();
          }).tween("brush", function () {
            var that = this,
                state = that.__brush,
                emit = emitter(that, arguments),
                selection0 = state.selection,
                selection1 = dim.input(typeof selection$$1 === "function" ? selection$$1.apply(this, arguments) : selection$$1, state.extent),
                i = value(selection0, selection1);

            function tween(t) {
              state.selection = t === 1 && empty$1(selection1) ? null : i(t);
              redraw.call(that);
              emit.brush();
            }

            return selection0 && selection1 ? tween : tween(1);
          });
        } else {
          group.each(function () {
            var that = this,
                args = arguments,
                state = that.__brush,
                selection1 = dim.input(typeof selection$$1 === "function" ? selection$$1.apply(that, args) : selection$$1, state.extent),
                emit = emitter(that, args).beforestart();

            interrupt(that);
            state.selection = selection1 == null || empty$1(selection1) ? null : selection1;
            redraw.call(that);
            emit.start().brush().end();
          });
        }
      };

      function redraw() {
        var group = select(this),
            selection$$1 = local$1(this).selection;

        if (selection$$1) {
          group.selectAll(".selection").style("display", null).attr("x", selection$$1[0][0]).attr("y", selection$$1[0][1]).attr("width", selection$$1[1][0] - selection$$1[0][0]).attr("height", selection$$1[1][1] - selection$$1[0][1]);

          group.selectAll(".handle").style("display", null).attr("x", function (d) {
            return d.type[d.type.length - 1] === "e" ? selection$$1[1][0] - handleSize / 2 : selection$$1[0][0] - handleSize / 2;
          }).attr("y", function (d) {
            return d.type[0] === "s" ? selection$$1[1][1] - handleSize / 2 : selection$$1[0][1] - handleSize / 2;
          }).attr("width", function (d) {
            return d.type === "n" || d.type === "s" ? selection$$1[1][0] - selection$$1[0][0] + handleSize : handleSize;
          }).attr("height", function (d) {
            return d.type === "e" || d.type === "w" ? selection$$1[1][1] - selection$$1[0][1] + handleSize : handleSize;
          });
        } else {
          group.selectAll(".selection,.handle").style("display", "none").attr("x", null).attr("y", null).attr("width", null).attr("height", null);
        }
      }

      function emitter(that, args) {
        return that.__brush.emitter || new Emitter(that, args);
      }

      function Emitter(that, args) {
        this.that = that;
        this.args = args;
        this.state = that.__brush;
        this.active = 0;
      }

      Emitter.prototype = {
        beforestart: function beforestart() {
          if (++this.active === 1) this.state.emitter = this, this.starting = true;
          return this;
        },
        start: function start() {
          if (this.starting) this.starting = false, this.emit("start");
          return this;
        },
        brush: function brush() {
          this.emit("brush");
          return this;
        },
        end: function end() {
          if (--this.active === 0) delete this.state.emitter, this.emit("end");
          return this;
        },
        emit: function emit(type) {
          customEvent(new BrushEvent(brush, type, dim.output(this.state.selection)), listeners.apply, listeners, [type, this.that, this.args]);
        }
      };

      function started() {
        if (event.touches) {
          if (event.changedTouches.length < event.touches.length) return noevent$1();
        } else if (touchending) return;
        if (!filter.apply(this, arguments)) return;

        var that = this,
            type = event.target.__data__.type,
            mode = (event.metaKey ? type = "overlay" : type) === "selection" ? MODE_DRAG : event.altKey ? MODE_CENTER : MODE_HANDLE,
            signX = dim === Y ? null : signsX[type],
            signY = dim === X ? null : signsY[type],
            state = local$1(that),
            extent = state.extent,
            selection$$1 = state.selection,
            W = extent[0][0],
            w0,
            w1,
            N = extent[0][1],
            n0,
            n1,
            E = extent[1][0],
            e0,
            e1,
            S = extent[1][1],
            s0,
            s1,
            dx,
            dy,
            moving,
            shifting = signX && signY && event.shiftKey,
            lockX,
            lockY,
            point0 = mouse(that),
            point$$1 = point0,
            emit = emitter(that, arguments).beforestart();

        if (type === "overlay") {
          state.selection = selection$$1 = [[w0 = dim === Y ? W : point0[0], n0 = dim === X ? N : point0[1]], [e0 = dim === Y ? E : w0, s0 = dim === X ? S : n0]];
        } else {
          w0 = selection$$1[0][0];
          n0 = selection$$1[0][1];
          e0 = selection$$1[1][0];
          s0 = selection$$1[1][1];
        }

        w1 = w0;
        n1 = n0;
        e1 = e0;
        s1 = s0;

        var group = select(that).attr("pointer-events", "none");

        var overlay = group.selectAll(".overlay").attr("cursor", cursors[type]);

        if (event.touches) {
          group.on("touchmove.brush", moved, true).on("touchend.brush touchcancel.brush", ended, true);
        } else {
          var view = select(event.view).on("keydown.brush", keydowned, true).on("keyup.brush", keyupped, true).on("mousemove.brush", moved, true).on("mouseup.brush", ended, true);

          nodrag(event.view);
        }

        nopropagation$1();
        interrupt(that);
        redraw.call(that);
        emit.start();

        function moved() {
          var point1 = mouse(that);
          if (shifting && !lockX && !lockY) {
            if (Math.abs(point1[0] - point$$1[0]) > Math.abs(point1[1] - point$$1[1])) lockY = true;else lockX = true;
          }
          point$$1 = point1;
          moving = true;
          noevent$1();
          move();
        }

        function move() {
          var t;

          dx = point$$1[0] - point0[0];
          dy = point$$1[1] - point0[1];

          switch (mode) {
            case MODE_SPACE:
            case MODE_DRAG:
              {
                if (signX) dx = Math.max(W - w0, Math.min(E - e0, dx)), w1 = w0 + dx, e1 = e0 + dx;
                if (signY) dy = Math.max(N - n0, Math.min(S - s0, dy)), n1 = n0 + dy, s1 = s0 + dy;
                break;
              }
            case MODE_HANDLE:
              {
                if (signX < 0) dx = Math.max(W - w0, Math.min(E - w0, dx)), w1 = w0 + dx, e1 = e0;else if (signX > 0) dx = Math.max(W - e0, Math.min(E - e0, dx)), w1 = w0, e1 = e0 + dx;
                if (signY < 0) dy = Math.max(N - n0, Math.min(S - n0, dy)), n1 = n0 + dy, s1 = s0;else if (signY > 0) dy = Math.max(N - s0, Math.min(S - s0, dy)), n1 = n0, s1 = s0 + dy;
                break;
              }
            case MODE_CENTER:
              {
                if (signX) w1 = Math.max(W, Math.min(E, w0 - dx * signX)), e1 = Math.max(W, Math.min(E, e0 + dx * signX));
                if (signY) n1 = Math.max(N, Math.min(S, n0 - dy * signY)), s1 = Math.max(N, Math.min(S, s0 + dy * signY));
                break;
              }
          }

          if (e1 < w1) {
            signX *= -1;
            t = w0, w0 = e0, e0 = t;
            t = w1, w1 = e1, e1 = t;
            if (type in flipX) overlay.attr("cursor", cursors[type = flipX[type]]);
          }

          if (s1 < n1) {
            signY *= -1;
            t = n0, n0 = s0, s0 = t;
            t = n1, n1 = s1, s1 = t;
            if (type in flipY) overlay.attr("cursor", cursors[type = flipY[type]]);
          }

          if (state.selection) selection$$1 = state.selection; // May be set by brush.move!
          if (lockX) w1 = selection$$1[0][0], e1 = selection$$1[1][0];
          if (lockY) n1 = selection$$1[0][1], s1 = selection$$1[1][1];

          if (selection$$1[0][0] !== w1 || selection$$1[0][1] !== n1 || selection$$1[1][0] !== e1 || selection$$1[1][1] !== s1) {
            state.selection = [[w1, n1], [e1, s1]];
            redraw.call(that);
            emit.brush();
          }
        }

        function ended() {
          nopropagation$1();
          if (event.touches) {
            if (event.touches.length) return;
            if (touchending) clearTimeout(touchending);
            touchending = setTimeout(function () {
              touchending = null;
            }, 500); // Ghost clicks are delayed!
            group.on("touchmove.brush touchend.brush touchcancel.brush", null);
          } else {
            yesdrag(event.view, moving);
            view.on("keydown.brush keyup.brush mousemove.brush mouseup.brush", null);
          }
          group.attr("pointer-events", "all");
          overlay.attr("cursor", cursors.overlay);
          if (state.selection) selection$$1 = state.selection; // May be set by brush.move (on start)!
          if (empty$1(selection$$1)) state.selection = null, redraw.call(that);
          emit.end();
        }

        function keydowned() {
          switch (event.keyCode) {
            case 16:
              {
                // SHIFT
                shifting = signX && signY;
                break;
              }
            case 18:
              {
                // ALT
                if (mode === MODE_HANDLE) {
                  if (signX) e0 = e1 - dx * signX, w0 = w1 + dx * signX;
                  if (signY) s0 = s1 - dy * signY, n0 = n1 + dy * signY;
                  mode = MODE_CENTER;
                  move();
                }
                break;
              }
            case 32:
              {
                // SPACE; takes priority over ALT
                if (mode === MODE_HANDLE || mode === MODE_CENTER) {
                  if (signX < 0) e0 = e1 - dx;else if (signX > 0) w0 = w1 - dx;
                  if (signY < 0) s0 = s1 - dy;else if (signY > 0) n0 = n1 - dy;
                  mode = MODE_SPACE;
                  overlay.attr("cursor", cursors.selection);
                  move();
                }
                break;
              }
            default:
              return;
          }
          noevent$1();
        }

        function keyupped() {
          switch (event.keyCode) {
            case 16:
              {
                // SHIFT
                if (shifting) {
                  lockX = lockY = shifting = false;
                  move();
                }
                break;
              }
            case 18:
              {
                // ALT
                if (mode === MODE_CENTER) {
                  if (signX < 0) e0 = e1;else if (signX > 0) w0 = w1;
                  if (signY < 0) s0 = s1;else if (signY > 0) n0 = n1;
                  mode = MODE_HANDLE;
                  move();
                }
                break;
              }
            case 32:
              {
                // SPACE
                if (mode === MODE_SPACE) {
                  if (event.altKey) {
                    if (signX) e0 = e1 - dx * signX, w0 = w1 + dx * signX;
                    if (signY) s0 = s1 - dy * signY, n0 = n1 + dy * signY;
                    mode = MODE_CENTER;
                  } else {
                    if (signX < 0) e0 = e1;else if (signX > 0) w0 = w1;
                    if (signY < 0) s0 = s1;else if (signY > 0) n0 = n1;
                    mode = MODE_HANDLE;
                  }
                  overlay.attr("cursor", cursors[type]);
                  move();
                }
                break;
              }
            default:
              return;
          }
          noevent$1();
        }
      }

      function initialize() {
        var state = this.__brush || { selection: null };
        state.extent = extent.apply(this, arguments);
        state.dim = dim;
        return state;
      }

      brush.extent = function (_) {
        return arguments.length ? (extent = typeof _ === "function" ? _ : constant$3([[+_[0][0], +_[0][1]], [+_[1][0], +_[1][1]]]), brush) : extent;
      };

      brush.filter = function (_) {
        return arguments.length ? (filter = typeof _ === "function" ? _ : constant$3(!!_), brush) : filter;
      };

      brush.handleSize = function (_) {
        return arguments.length ? (handleSize = +_, brush) : handleSize;
      };

      brush.on = function () {
        var value$$1 = listeners.on.apply(listeners, arguments);
        return value$$1 === listeners ? brush : value$$1;
      };

      return brush;
    }

    var invertCategorical = function invertCategorical(selection, scale) {
      if (selection.length === 0) {
        return [];
      }
      var domain = scale.domain();
      var range = scale.range();
      var found = [];
      range.forEach(function (d, i) {
        if (d >= selection[0] && d <= selection[1]) {
          found.push(domain[i]);
        }
      });
      return found;
    };

    var invertByScale = function invertByScale(selection, scale) {
      if (scale === null) return [];
      return typeof scale.invert === 'undefined' ? invertCategorical(selection, scale) : selection.map(function (d) {
        return scale.invert(d);
      });
    };

    var brushExtents = function brushExtents(state, config, pc) {
      return function (extents) {
        var brushes = state.brushes,
            brushNodes = state.brushNodes;


        if (typeof extents === 'undefined') {
          return Object.keys(config.dimensions).reduce(function (acc, cur) {
            var brush$$1 = brushes[cur];
            //todo: brush check
            if (brush$$1 !== undefined && brushSelection(brushNodes[cur]) !== null) {
              var raw = brushSelection(brushNodes[cur]);
              var yScale = config.dimensions[cur].yscale;
              var scaled = invertByScale(raw, yScale);

              acc[cur] = {
                extent: brush$$1.extent(),
                selection: {
                  raw: raw,
                  scaled: scaled
                }
              };
            }

            return acc;
          }, {});
        } else {
          //first get all the brush selections
          var brushSelections = {};
          pc.g().selectAll('.brush').each(function (d) {
            brushSelections[d] = select(this);
          });

          // loop over each dimension and update appropriately (if it was passed in through extents)
          Object.keys(config.dimensions).forEach(function (d) {
            if (extents[d] === undefined) {
              return;
            }

            var brush$$1 = brushes[d];
            if (brush$$1 !== undefined) {
              var dim = config.dimensions[d];
              var yExtent = extents[d].map(dim.yscale);

              //update the extent
              //sets the brushable extent to the specified array of points [[x0, y0], [x1, y1]]
              //we actually don't need this since we are using brush.move below
              //extents set the limits of the brush which means a user will not be able
              //to move or drag the brush beyond the limits set by brush.extent
              //brush.extent([[-15, yExtent[1]], [15, yExtent[0]]]);

              //redraw the brush
              //https://github.com/d3/d3-brush#brush_move
              // For an x-brush, it must be defined as [x0, x1]; for a y-brush, it must be defined as [y0, y1].
              brushSelections[d].call(brush$$1).call(brush$$1.move, yExtent.reverse());

              //fire some events
              // brush.event(brushSelections[d]);
            }
          });

          //redraw the chart
          pc.renderBrushed();

          return pc;
        }
      };
    };

    var _this = undefined;

    var brushReset = function brushReset(state, config, pc) {
      return function (dimension) {
        var brushes = state.brushes;


        if (dimension === undefined) {
          config.brushed = false;
          if (pc.g() !== undefined && pc.g() !== null) {
            pc.g().selectAll('.brush').each(function (d) {
              if (brushes[d] !== undefined) {
                select(this).call(brushes[d].move, null);
              }
            });
            pc.renderBrushed();
          }
        } else {
          config.brushed = false;
          if (pc.g() !== undefined && pc.g() !== null) {
            pc.g().selectAll('.brush').each(function (d) {
              if (d !== dimension) return;
              select(this).call(brushes[d].move, null);
              if (typeof brushes[d].type === 'function') {
                brushes[d].event(select(this));
              }
            });
            pc.renderBrushed();
          }
        }
        return _this;
      };
    };

    //https://github.com/d3/d3-brush/issues/10

    // data within extents
    var selected = function selected(state, config, brushGroup) {
      return function () {
        var brushNodes = state.brushNodes;

        var is_brushed = function is_brushed(p) {
          return brushNodes[p] && brushSelection(brushNodes[p]) !== null;
        };

        var actives = Object.keys(config.dimensions).filter(is_brushed);
        var extents = actives.map(function (p) {
          var _brushRange = brushSelection(brushNodes[p]);

          if (typeof config.dimensions[p].yscale.invert === 'function') {
            return [config.dimensions[p].yscale.invert(_brushRange[1]), config.dimensions[p].yscale.invert(_brushRange[0])];
          } else {
            return _brushRange;
          }
        });
        // We don't want to return the full data set when there are no axes brushed.
        // Actually, when there are no axes brushed, by definition, no items are
        // selected. So, let's avoid the filtering and just return false.
        //if (actives.length === 0) return false;

        // Resolves broken examples for now. They expect to get the full dataset back from empty brushes
        if (actives.length === 0) return config.data;

        // test if within range
        var within = {
          date: function date(d, p, dimension) {
            if (typeof config.dimensions[p].yscale.bandwidth === 'function') {
              // if it is ordinal
              return extents[dimension][0] <= config.dimensions[p].yscale(d[p]) && config.dimensions[p].yscale(d[p]) <= extents[dimension][1];
            } else {
              return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
            }
          },
          number: function number(d, p, dimension) {
            if (typeof config.dimensions[p].yscale.bandwidth === 'function') {
              // if it is ordinal
              return extents[dimension][0] <= config.dimensions[p].yscale(d[p]) && config.dimensions[p].yscale(d[p]) <= extents[dimension][1];
            } else {
              return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
            }
          },
          string: function string(d, p, dimension) {
            return extents[dimension][0] <= config.dimensions[p].yscale(d[p]) && config.dimensions[p].yscale(d[p]) <= extents[dimension][1];
          }
        };

        return config.data.filter(function (d) {
          switch (brushGroup.predicate) {
            case 'AND':
              return actives.every(function (p, dimension) {
                return within[config.dimensions[p].type](d, p, dimension);
              });
            case 'OR':
              return actives.some(function (p, dimension) {
                return within[config.dimensions[p].type](d, p, dimension);
              });
            default:
              throw new Error('Unknown brush predicate ' + config.brushPredicate);
          }
        });
      };
    };

    var brushUpdated = function brushUpdated(config, pc, events, args) {
      return function (newSelection) {
        config.brushed = newSelection;
        events.call('brush', pc, config.brushed, args);
        pc.renderBrushed();
      };
    };

    var brushFor = function brushFor(state, config, pc, events, brushGroup) {
      return function (axis, _selector) {
        // handle hidden axes which will not be a property of dimensions
        if (!config.dimensions.hasOwnProperty(axis)) {
          return function () {};
        }

        var brushRangeMax = config.dimensions[axis].type === 'string' ? config.dimensions[axis].yscale.range()[config.dimensions[axis].yscale.range().length - 1] : config.dimensions[axis].yscale.range()[0];

        var _brush = brushY(_selector).extent([[-15, 0], [15, brushRangeMax]]);

        var convertBrushArguments = function convertBrushArguments(args) {
          var args_array = Array.prototype.slice.call(args);
          var axis = args_array[0];

          var raw = brushSelection(args_array[2][0]) || [];

          // handle hidden axes which will not have a yscale
          var yscale = null;
          if (config.dimensions.hasOwnProperty(axis)) {
            yscale = config.dimensions[axis].yscale;
          }

          // ordinal scales do not have invert
          var scaled = invertByScale(raw, yscale);

          return {
            axis: args_array[0],
            node: args_array[2][0],
            selection: {
              raw: raw,
              scaled: scaled
            }
          };
        };

        _brush.on('start', function () {
          if (event.sourceEvent !== null) {
            events.call('brushstart', pc, config.brushed, convertBrushArguments(arguments));
            if (typeof event.sourceEvent.stopPropagation === 'function') {
              event.sourceEvent.stopPropagation();
            }
          }
        }).on('brush', function () {
          brushUpdated(config, pc, events, convertBrushArguments(arguments))(selected(state, config, brushGroup)());
        }).on('end', function () {
          brushUpdated(config, pc, events)(selected(state, config, brushGroup)());
          events.call('brushend', pc, config.brushed, convertBrushArguments(arguments));
        });

        state.brushes[axis] = _brush;
        state.brushNodes[axis] = _selector.node();

        return _brush;
      };
    };

    var install = function install(state, config, pc, events, brushGroup) {
      return function () {
        if (!pc.g()) {
          pc.createAxes();
        }

        // Add and store a brush for each axis.
        var brush = pc.g().append('svg:g').attr('class', 'brush').each(function (d) {
          select(this).call(brushFor(state, config, pc, events, brushGroup)(d, select(this)));
        });
        brush.selectAll('rect').style('visibility', null).attr('x', -15).attr('width', 30);

        brush.selectAll('rect.background').style('fill', 'transparent');

        brush.selectAll('rect.extent').style('fill', 'rgba(255,255,255,0.25)').style('stroke', 'rgba(0,0,0,0.6)');

        brush.selectAll('.resize rect').style('fill', 'rgba(0,0,0,0.1)');

        pc.brushExtents = brushExtents(state, config, pc);
        pc.brushReset = brushReset(state, config, pc);
        return pc;
      };
    };

    var uninstall = function uninstall(state, pc) {
      return function () {
        if (pc.g() !== undefined && pc.g() !== null) pc.g().selectAll('.brush').remove();

        state.brushes = {};
        delete pc.brushExtents;
        delete pc.brushReset;
      };
    };

    var install1DAxes = function install1DAxes(brushGroup, config, pc, events) {
      var state = {
        brushes: {},
        brushNodes: {}
      };

      brushGroup.modes['1D-axes'] = {
        install: install(state, config, pc, events, brushGroup),
        uninstall: uninstall(state, pc),
        selected: selected(state, config, brushGroup),
        brushState: brushExtents(state, config, pc)
      };
    };

    var drawBrushes = function drawBrushes(brushes, config, pc, axis, selector$$1) {
      var brushSelection = selector$$1.selectAll('.brush').data(brushes, function (d) {
        return d.id;
      });

      brushSelection.enter().insert('g', '.brush').attr('class', 'brush').attr('dimension', axis).attr('id', function (b) {
        return 'brush-' + Object.keys(config.dimensions).indexOf(axis) + '-' + b.id;
      }).each(function (brushObject) {
        brushObject.brush(select(this));
      });

      brushSelection.each(function (brushObject) {
        select(this).attr('class', 'brush').selectAll('.overlay').style('pointer-events', function () {
          var brush = brushObject.brush;
          if (brushObject.id === brushes.length - 1 && brush !== undefined) {
            return 'all';
          } else {
            return 'none';
          }
        });
      });

      brushSelection.exit().remove();
    };

    // data within extents
    var selected$1 = function selected(state, config, pc, events, brushGroup) {
      var brushes = state.brushes;


      var is_brushed = function is_brushed(p, pos) {
        var axisBrushes = brushes[p];

        for (var i = 0; i < axisBrushes.length; i++) {
          var brush$$1 = document.getElementById('brush-' + pos + '-' + i);

          if (brush$$1 && brushSelection(brush$$1) !== null) {
            return true;
          }
        }

        return false;
      };

      var actives = Object.keys(config.dimensions).filter(is_brushed);
      var extents = actives.map(function (p) {
        var axisBrushes = brushes[p];

        return axisBrushes.filter(function (d) {
          return !pc.hideAxis().includes(d);
        }).map(function (d, i) {
          return brushSelection(document.getElementById('brush-' + Object.keys(config.dimensions).indexOf(p) + '-' + i));
        }).map(function (d, i) {
          if (d === null || d === undefined) {
            return null;
          } else if (typeof config.dimensions[p].yscale.invert === 'function') {
            return [config.dimensions[p].yscale.invert(d[1]), config.dimensions[p].yscale.invert(d[0])];
          } else {
            return d;
          }
        });
      });

      // We don't want to return the full data set when there are no axes brushed.
      // Actually, when there are no axes brushed, by definition, no items are
      // selected. So, let's avoid the filtering and just return false.
      //if (actives.length === 0) return false;

      // Resolves broken examples for now. They expect to get the full dataset back from empty brushes
      if (actives.length === 0) return config.data;

      // test if within range
      var within = {
        date: function date(d, p, i) {
          var dimExt = extents[i];

          if (typeof config.dimensions[p].yscale.bandwidth === 'function') {
            // if it is ordinal
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = dimExt[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var e = _step.value;

                if (e === null || e === undefined) {
                  continue;
                }

                if (e[0] <= config.dimensions[p].yscale(d[p]) && config.dimensions[p].yscale(d[p]) <= e[1]) {
                  return true;
                }
              }
            } catch (err) {
              _didIteratorError = true;
              _iteratorError = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }
              } finally {
                if (_didIteratorError) {
                  throw _iteratorError;
                }
              }
            }

            return false;
          } else {
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
              for (var _iterator2 = dimExt[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var _e = _step2.value;

                if (_e === null || _e === undefined) {
                  continue;
                }

                if (_e[0] <= d[p] && d[p] <= _e[1]) {
                  return true;
                }
              }
            } catch (err) {
              _didIteratorError2 = true;
              _iteratorError2 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                  _iterator2.return();
                }
              } finally {
                if (_didIteratorError2) {
                  throw _iteratorError2;
                }
              }
            }

            return false;
          }
        },
        number: function number(d, p, i) {
          var dimExt = extents[i];

          if (typeof config.dimensions[p].yscale.bandwidth === 'function') {
            // if it is ordinal
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
              for (var _iterator3 = dimExt[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                var e = _step3.value;

                if (e === null || e === undefined) {
                  continue;
                }

                if (e[0] <= config.dimensions[p].yscale(d[p]) && config.dimensions[p].yscale(d[p]) <= e[1]) {
                  return true;
                }
              }
            } catch (err) {
              _didIteratorError3 = true;
              _iteratorError3 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                  _iterator3.return();
                }
              } finally {
                if (_didIteratorError3) {
                  throw _iteratorError3;
                }
              }
            }

            return false;
          } else {
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
              for (var _iterator4 = dimExt[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                var _e2 = _step4.value;

                if (_e2 === null || _e2 === undefined) {
                  continue;
                }

                if (_e2[0] <= d[p] && d[p] <= _e2[1]) {
                  return true;
                }
              }
            } catch (err) {
              _didIteratorError4 = true;
              _iteratorError4 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion4 && _iterator4.return) {
                  _iterator4.return();
                }
              } finally {
                if (_didIteratorError4) {
                  throw _iteratorError4;
                }
              }
            }

            return false;
          }
        },
        string: function string(d, p, i) {
          var dimExt = extents[i];

          var _iteratorNormalCompletion5 = true;
          var _didIteratorError5 = false;
          var _iteratorError5 = undefined;

          try {
            for (var _iterator5 = dimExt[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
              var e = _step5.value;

              if (e === null || e === undefined) {
                continue;
              }

              if (e[0] <= config.dimensions[p].yscale(d[p]) && config.dimensions[p].yscale(d[p]) <= e[1]) {
                return true;
              }
            }
          } catch (err) {
            _didIteratorError5 = true;
            _iteratorError5 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion5 && _iterator5.return) {
                _iterator5.return();
              }
            } finally {
              if (_didIteratorError5) {
                throw _iteratorError5;
              }
            }
          }

          return false;
        }
      };

      return config.data.filter(function (d) {
        switch (brushGroup.predicate) {
          case 'AND':
            return actives.every(function (p, i) {
              return within[config.dimensions[p].type](d, p, i);
            });
          case 'OR':
            return actives.some(function (p, i) {
              return within[config.dimensions[p].type](d, p, i);
            });
          default:
            throw new Error('Unknown brush predicate ' + config.brushPredicate);
        }
      });
    };

    var brushUpdated$1 = function brushUpdated(config, pc, events) {
      return function (newSelection) {
        config.brushed = newSelection;
        events.call('brush', pc, config.brushed);
        pc.renderBrushed();
      };
    };

    var newBrush = function newBrush(state, config, pc, events, brushGroup) {
      return function (axis, _selector) {
        var brushes = state.brushes,
            brushNodes = state.brushNodes;


        var brushRangeMax = config.dimensions[axis].type === 'string' ? config.dimensions[axis].yscale.range()[config.dimensions[axis].yscale.range().length - 1] : config.dimensions[axis].yscale.range()[0];

        var brush$$1 = brushY().extent([[-15, 0], [15, brushRangeMax]]);
        var id = brushes[axis] ? brushes[axis].length : 0;
        var node = 'brush-' + Object.keys(config.dimensions).indexOf(axis) + '-' + id;

        if (brushes[axis]) {
          brushes[axis].push({
            id: id,
            brush: brush$$1,
            node: node
          });
        } else {
          brushes[axis] = [{ id: id, brush: brush$$1, node: node }];
        }

        if (brushNodes[axis]) {
          brushNodes[axis].push({ id: id, node: node });
        } else {
          brushNodes[axis] = [{ id: id, node: node }];
        }

        brush$$1.on('start', function () {
          if (event.sourceEvent !== null) {
            events.call('brushstart', pc, config.brushed);
            if (typeof event.sourceEvent.stopPropagation === 'function') {
              event.sourceEvent.stopPropagation();
            }
          }
        }).on('brush', function (e) {
          // record selections
          brushUpdated$1(config, pc, events)(selected$1(state, config, pc, events, brushGroup));
        }).on('end', function () {
          // Figure out if our latest brush has a selection
          var lastBrushID = brushes[axis][brushes[axis].length - 1].id;
          var lastBrush = document.getElementById('brush-' + Object.keys(config.dimensions).indexOf(axis) + '-' + lastBrushID);
          var selection$$1 = brushSelection(lastBrush);

          if (selection$$1 !== undefined && selection$$1 !== null && selection$$1[0] !== selection$$1[1]) {
            newBrush(state, config, pc, events, brushGroup)(axis, _selector);

            drawBrushes(brushes[axis], config, pc, axis, _selector);

            brushUpdated$1(config, pc, events)(selected$1(state, config, pc, events, brushGroup));
          } else {
            if (event.sourceEvent && event.sourceEvent.toString() === '[object MouseEvent]' && event.selection === null) {
              pc.brushReset(axis);
            }
          }

          events.call('brushend', pc, config.brushed);
        });

        return brush$$1;
      };
    };

    /**
     *
     * extents are in format of [[2,6], [3,5]]
     *
     * * @param state
     * @param config
     * @param pc
     * @returns {Function}
     */
    var brushExtents$1 = function brushExtents(state, config, pc, events, brushGroup) {
      return function (extents) {
        var brushes = state.brushes;

        var hiddenAxes = pc.hideAxis();

        if (typeof extents === 'undefined') {
          return Object.keys(config.dimensions).filter(function (d) {
            return !hiddenAxes.includes(d);
          }).reduce(function (acc, cur, pos) {
            var axisBrushes = brushes[cur];

            if (axisBrushes === undefined || axisBrushes === null) {
              acc[cur] = [];
            } else {
              acc[cur] = axisBrushes.reduce(function (d, p, i) {
                var raw = brushSelection(document.getElementById('brush-' + pos + '-' + i));

                if (raw) {
                  var yScale = config.dimensions[cur].yscale;
                  var scaled = invertByScale(raw, yScale);

                  d.push({
                    extent: p.brush.extent(),
                    selection: {
                      raw: raw,
                      scaled: scaled
                    }
                  });
                }
                return d;
              }, []);
            }

            return acc;
          }, {});
        } else {
          // //first get all the brush selections
          // loop over each dimension and update appropriately (if it was passed in through extents)
          Object.keys(config.dimensions).forEach(function (d, pos) {
            if (extents[d] === undefined || extents[d] === null) {
              return;
            }

            var dim = config.dimensions[d];

            var yExtents = extents[d].map(function (e) {
              return e.map(dim.yscale);
            });

            var _bs = yExtents.map(function (e, j) {
              var _brush = newBrush(state, config, pc, events, brushGroup)(d, select('#brush-group-' + pos));
              //update the extent
              //sets the brushable extent to the specified array of points [[x0, y0], [x1, y1]]
              _brush.extent([[-15, e[1]], [15, e[0]]]);

              return {
                id: j,
                brush: _brush,
                ext: e
              };
            });

            brushes[d] = _bs;

            drawBrushes(_bs, config, pc, d, select('#brush-group-' + pos));

            //redraw the brush
            //https://github.com/d3/d3-brush#brush_move
            // For an x-brush, it must be defined as [x0, x1]; for a y-brush, it must be defined as [y0, y1].
            _bs.forEach(function (f, k) {
              select('#brush-' + pos + '-' + k).call(f.brush).call(f.brush.move, f.ext.reverse());
            });
          });

          //redraw the chart
          pc.renderBrushed();

          return pc;
        }
      };
    };

    var _this$1 = undefined;

    var brushReset$1 = function brushReset(state, config, pc) {
      return function (dimension) {
        var brushes = state.brushes;


        if (dimension === undefined) {
          if (pc.g() !== undefined && pc.g() !== null) {
            Object.keys(config.dimensions).forEach(function (d, pos) {
              var axisBrush = brushes[d];

              // hidden axes will be undefined
              if (axisBrush) {
                axisBrush.forEach(function (e, i) {
                  var brush$$1 = document.getElementById('brush-' + pos + '-' + i);
                  if (brush$$1 && brushSelection(brush$$1) !== null) {
                    pc.g().select('#brush-' + pos + '-' + i).call(e.brush.move, null);
                  }
                });
              }
            });

            pc.renderBrushed();
          }
        } else {
          if (pc.g() !== undefined && pc.g() !== null) {
            var axisBrush = brushes[dimension];
            var pos = Object.keys(config.dimensions).indexOf(dimension);

            if (axisBrush) {
              axisBrush.forEach(function (e, i) {
                var brush$$1 = document.getElementById('brush-' + pos + '-' + i);
                if (brushSelection(brush$$1) !== null) {
                  pc.g().select('#brush-' + pos + '-' + i).call(e.brush.move, null);

                  if (typeof e.event === 'function') {
                    e.event(select('#brush-' + pos + '-' + i));
                  }
                }
              });
            }

            pc.renderBrushed();
          }
        }
        return _this$1;
      };
    };

    var brushFor$1 = function brushFor(state, config, pc, events, brushGroup) {
      return function (axis, _selector) {
        var brushes = state.brushes;

        newBrush(state, config, pc, events, brushGroup)(axis, _selector);
        drawBrushes(brushes[axis], config, pc, axis, _selector);
      };
    };

    var install$1 = function install(state, config, pc, events, brushGroup) {
      return function () {
        if (!pc.g()) {
          pc.createAxes();
        }

        var hiddenAxes = pc.hideAxis();

        pc.g().append('svg:g').attr('id', function (d, i) {
          return 'brush-group-' + i;
        }).attr('class', 'brush-group').attr('dimension', function (d) {
          return d;
        }).each(function (d) {
          if (!hiddenAxes.includes(d)) {
            brushFor$1(state, config, pc, events, brushGroup)(d, select(this));
          }
        });

        pc.brushExtents = brushExtents$1(state, config, pc, events, brushGroup);
        pc.brushReset = brushReset$1(state, config, pc);
        return pc;
      };
    };

    var uninstall$1 = function uninstall(state, pc) {
      return function () {
        if (pc.g() !== undefined && pc.g() !== null) pc.g().selectAll('.brush-group').remove();

        state.brushes = {};
        delete pc.brushExtents;
        delete pc.brushReset;
      };
    };

    var install1DMultiAxes = function install1DMultiAxes(brushGroup, config, pc, events) {
      var state = {
        brushes: {},
        brushNodes: {}
      };

      brushGroup.modes['1D-axes-multi'] = {
        install: install$1(state, config, pc, events, brushGroup),
        uninstall: uninstall$1(state, pc),
        selected: selected$1(state, config, brushGroup),
        brushState: brushExtents$1(state, config, pc)
      };
    };

    var uninstall$2 = function uninstall(state, pc) {
      return function () {
        pc.selection.select('svg').select('g#strums').remove();
        pc.selection.select('svg').select('rect#strum-events').remove();
        pc.on('axesreorder.strums', undefined);
        delete pc.brushReset;

        state.strumRect = undefined;
      };
    };

    // test if point falls between lines
    var containmentTest = function containmentTest(strum, width) {
      return function (p) {
        var p1 = [strum.p1[0] - strum.minX, strum.p1[1] - strum.minX],
            p2 = [strum.p2[0] - strum.minX, strum.p2[1] - strum.minX],
            m1 = 1 - width / p1[0],
            b1 = p1[1] * (1 - m1),
            m2 = 1 - width / p2[0],
            b2 = p2[1] * (1 - m2);

        var x = p[0],
            y = p[1],
            y1 = m1 * x + b1,
            y2 = m2 * x + b2;

        return y > Math.min(y1, y2) && y < Math.max(y1, y2);
      };
    };

    var crossesStrum = function crossesStrum(state, config) {
      return function (d, id) {
        var strum = state.strums[id],
            test = containmentTest(strum, state.strums.width(id)),
            d1 = strum.dims.left,
            d2 = strum.dims.right,
            y1 = config.dimensions[d1].yscale,
            y2 = config.dimensions[d2].yscale,
            point = [y1(d[d1]) - strum.minX, y2(d[d2]) - strum.minX];
        return test(point);
      };
    };

    var selected$2 = function selected(brushGroup, state, config) {
      // Get the ids of the currently active strums.
      var ids = Object.getOwnPropertyNames(state.strums).filter(function (d) {
        return !isNaN(d);
      }),
          brushed = config.data;

      if (ids.length === 0) {
        return brushed;
      }

      var crossTest = crossesStrum(state, config);

      return brushed.filter(function (d) {
        switch (brushGroup.predicate) {
          case 'AND':
            return ids.every(function (id) {
              return crossTest(d, id);
            });
          case 'OR':
            return ids.some(function (id) {
              return crossTest(d, id);
            });
          default:
            throw new Error('Unknown brush predicate ' + config.brushPredicate);
        }
      });
    };

    var removeStrum = function removeStrum(state, pc) {
      var strum = state.strums[state.strums.active],
          svg = pc.selection.select('svg').select('g#strums');

      delete state.strums[state.strums.active];
      svg.selectAll('line#strum-' + strum.dims.i).remove();
      svg.selectAll('circle#strum-' + strum.dims.i).remove();
    };

    var onDragEnd = function onDragEnd(brushGroup, state, config, pc, events) {
      return function () {
        var strum = state.strums[state.strums.active];

        // Okay, somewhat unexpected, but not totally unsurprising, a mousclick is
        // considered a drag without move. So we have to deal with that case
        if (strum && strum.p1[0] === strum.p2[0] && strum.p1[1] === strum.p2[1]) {
          removeStrum(state, pc);
        }

        var brushed = selected$2(brushGroup, state, config);
        state.strums.active = undefined;
        config.brushed = brushed;
        pc.renderBrushed();
        events.call('brushend', pc, config.brushed);
      };
    };

    var drawStrum = function drawStrum(brushGroup, state, config, pc, events, strum, activePoint) {
      var _svg = pc.selection.select('svg').select('g#strums'),
          id = strum.dims.i,
          points = [strum.p1, strum.p2],
          _line = _svg.selectAll('line#strum-' + id).data([strum]),
          circles = _svg.selectAll('circle#strum-' + id).data(points),
          _drag = drag();

      _line.enter().append('line').attr('id', 'strum-' + id).attr('class', 'strum');

      _line.attr('x1', function (d) {
        return d.p1[0];
      }).attr('y1', function (d) {
        return d.p1[1];
      }).attr('x2', function (d) {
        return d.p2[0];
      }).attr('y2', function (d) {
        return d.p2[1];
      }).attr('stroke', 'black').attr('stroke-width', 2);

      _drag.on('drag', function (d, i) {
        var ev = event;
        i = i + 1;
        strum['p' + i][0] = Math.min(Math.max(strum.minX + 1, ev.x), strum.maxX);
        strum['p' + i][1] = Math.min(Math.max(strum.minY, ev.y), strum.maxY);
        drawStrum(brushGroup, state, config, pc, events, strum, i - 1);
      }).on('end', onDragEnd(brushGroup, state, config, pc, events));

      circles.enter().append('circle').attr('id', 'strum-' + id).attr('class', 'strum');

      circles.attr('cx', function (d) {
        return d[0];
      }).attr('cy', function (d) {
        return d[1];
      }).attr('r', 5).style('opacity', function (d, i) {
        return activePoint !== undefined && i === activePoint ? 0.8 : 0;
      }).on('mouseover', function () {
        select(this).style('opacity', 0.8);
      }).on('mouseout', function () {
        select(this).style('opacity', 0);
      }).call(_drag);
    };

    var onDrag = function onDrag(brushGroup, state, config, pc, events) {
      return function () {
        var ev = event,
            strum = state.strums[state.strums.active];

        // Make sure that the point is within the bounds
        strum.p2[0] = Math.min(Math.max(strum.minX + 1, ev.x - config.margin.left), strum.maxX);
        strum.p2[1] = Math.min(Math.max(strum.minY, ev.y - config.margin.top), strum.maxY);

        drawStrum(brushGroup, state, config, pc, events, strum, 1);
      };
    };

    var h = function h(config) {
      return config.height - config.margin.top - config.margin.bottom;
    };

    var dimensionsForPoint = function dimensionsForPoint(config, pc, xscale, p) {
      var dims = { i: -1, left: undefined, right: undefined };
      Object.keys(config.dimensions).some(function (dim, i) {
        if (xscale(dim) < p[0]) {
          dims.i = i;
          dims.left = dim;
          dims.right = Object.keys(config.dimensions)[pc.getOrderedDimensionKeys().indexOf(dim) + 1];
          return false;
        }
        return true;
      });

      if (dims.left === undefined) {
        // Event on the left side of the first axis.
        dims.i = 0;
        dims.left = pc.getOrderedDimensionKeys()[0];
        dims.right = pc.getOrderedDimensionKeys()[1];
      } else if (dims.right === undefined) {
        // Event on the right side of the last axis
        dims.i = Object.keys(config.dimensions).length - 1;
        dims.right = dims.left;
        dims.left = pc.getOrderedDimensionKeys()[Object.keys(config.dimensions).length - 2];
      }

      return dims;
    };

    // First we need to determine between which two axes the sturm was started.
    // This will determine the freedom of movement, because a strum can
    // logically only happen between two axes, so no movement outside these axes
    // should be allowed.
    var onDragStart = function onDragStart(state, config, pc, xscale) {
      return function () {
        var p = mouse(state.strumRect.node());

        p[0] = p[0] - config.margin.left;
        p[1] = p[1] - config.margin.top;

        var dims = dimensionsForPoint(config, pc, xscale, p);
        var strum = {
          p1: p,
          dims: dims,
          minX: xscale(dims.left),
          maxX: xscale(dims.right),
          minY: 0,
          maxY: h(config)
        };

        // Make sure that the point is within the bounds
        strum.p1[0] = Math.min(Math.max(strum.minX, p[0]), strum.maxX);
        strum.p2 = strum.p1.slice();

        state.strums[dims.i] = strum;
        state.strums.active = dims.i;
      };
    };

    var brushReset$2 = function brushReset(brushGroup, state, config, pc, events) {
      return function () {
        var ids = Object.getOwnPropertyNames(state.strums).filter(function (d) {
          return !isNaN(d);
        });

        ids.forEach(function (d) {
          state.strums.active = d;
          removeStrum(state, pc);
        });
        onDragEnd(brushGroup, state, config, pc, events)();
      };
    };

    // Checks if the first dimension is directly left of the second dimension.
    var consecutive = function consecutive(dimensions) {
      return function (first, second) {
        var keys = Object.keys(dimensions);

        return keys.some(function (d, i) {
          return d === first ? i + i < keys.length && dimensions[i + 1] === second : false;
        });
      };
    };

    var install$2 = function install(brushGroup, state, config, pc, events, xscale) {
      return function () {
        if (pc.g() === undefined || pc.g() === null) {
          pc.createAxes();
        }

        var _drag = drag();

        // Map of current strums. Strums are stored per segment of the PC. A segment,
        // being the area between two axes. The left most area is indexed at 0.
        state.strums.active = undefined;
        // Returns the width of the PC segment where currently a strum is being
        // placed. NOTE: even though they are evenly spaced in our current
        // implementation, we keep for when non-even spaced segments are supported as
        // well.
        state.strums.width = function (id) {
          return state.strums[id] === undefined ? undefined : state.strums[id].maxX - state.strums[id].minX;
        };

        pc.on('axesreorder.strums', function () {
          var ids = Object.getOwnPropertyNames(state.strums).filter(function (d) {
            return !isNaN(d);
          });

          if (ids.length > 0) {
            // We have some strums, which might need to be removed.
            ids.forEach(function (d) {
              var dims = state.strums[d].dims;
              state.strums.active = d;
              // If the two dimensions of the current strum are not next to each other
              // any more, than we'll need to remove the strum. Otherwise we keep it.
              if (!consecutive(config.dimensions)(dims.left, dims.right)) {
                removeStrum(state, pc);
              }
            });
            onDragEnd(brushGroup, state, config, pc, events)();
          }
        });

        // Add a new svg group in which we draw the strums.
        pc.selection.select('svg').append('g').attr('id', 'strums').attr('transform', 'translate(' + config.margin.left + ',' + config.margin.top + ')');

        // Install the required brushReset function
        pc.brushReset = brushReset$2(brushGroup, state, config, pc, events);

        _drag.on('start', onDragStart(state, config, pc, xscale)).on('drag', onDrag(brushGroup, state, config, pc, events)).on('end', onDragEnd(brushGroup, state, config, pc, events));

        // NOTE: The styling needs to be done here and not in the css. This is because
        //       for 1D brushing, the canvas layers should not listen to
        //       pointer-events._.
        state.strumRect = pc.selection.select('svg').insert('rect', 'g#strums').attr('id', 'strum-events').attr('x', config.margin.left).attr('y', config.margin.top).attr('width', w(config)).attr('height', h(config) + 2).style('opacity', 0).call(_drag);
      };
    };

    var install2DStrums = function install2DStrums(brushGroup, config, pc, events, xscale) {
      var state = {
        strums: {},
        strumRect: {}
      };

      brushGroup.modes['2D-strums'] = {
        install: install$2(brushGroup, state, config, pc, events, xscale),
        uninstall: uninstall$2(state, pc),
        selected: selected$2(brushGroup, state, config),
        brushState: function brushState() {
          return state.strums;
        }
      };
    };

    var uninstall$3 = function uninstall(state, pc) {
      return function () {
        pc.selection.select('svg').select('g#arcs').remove();
        pc.selection.select('svg').select('rect#arc-events').remove();
        pc.on('axesreorder.arcs', undefined);

        delete pc.brushReset;

        state.strumRect = undefined;
      };
    };

    var hypothenuse = function hypothenuse(a, b) {
      return Math.sqrt(a * a + b * b);
    };

    // [0, 2*PI] -> [-PI/2, PI/2]
    var signedAngle = function signedAngle(angle) {
      return angle > Math.PI ? 1.5 * Math.PI - angle : 0.5 * Math.PI - angle;
    };

    /**
     * angles are stored in radians from in [0, 2*PI], where 0 in 12 o'clock.
     * However, one can only select lines from 0 to PI, so we compute the
     * 'signed' angle, where 0 is the horizontal line (3 o'clock), and +/- PI/2
     * are 12 and 6 o'clock respectively.
     */
    var containmentTest$1 = function containmentTest(arc) {
      return function (a) {
        var startAngle = signedAngle(arc.startAngle);
        var endAngle = signedAngle(arc.endAngle);

        if (startAngle > endAngle) {
          var tmp = startAngle;
          startAngle = endAngle;
          endAngle = tmp;
        }

        // test if segment angle is contained in angle interval
        return a >= startAngle && a <= endAngle;
      };
    };

    var crossesStrum$1 = function crossesStrum(state, config) {
      return function (d, id) {
        var arc = state.arcs[id],
            test = containmentTest$1(arc),
            d1 = arc.dims.left,
            d2 = arc.dims.right,
            y1 = config.dimensions[d1].yscale,
            y2 = config.dimensions[d2].yscale,
            a = state.arcs.width(id),
            b = y1(d[d1]) - y2(d[d2]),
            c = hypothenuse(a, b),
            angle = Math.asin(b / c); // rad in [-PI/2, PI/2]
        return test(angle);
      };
    };

    var selected$3 = function selected(brushGroup, state, config) {
      var ids = Object.getOwnPropertyNames(state.arcs).filter(function (d) {
        return !isNaN(d);
      });
      var brushed = config.data;

      if (ids.length === 0) {
        return brushed;
      }

      var crossTest = crossesStrum$1(state, config);

      return brushed.filter(function (d) {
        switch (brushGroup.predicate) {
          case 'AND':
            return ids.every(function (id) {
              return crossTest(d, id);
            });
          case 'OR':
            return ids.some(function (id) {
              return crossTest(d, id);
            });
          default:
            throw new Error('Unknown brush predicate ' + config.brushPredicate);
        }
      });
    };

    var removeStrum$1 = function removeStrum(state, pc) {
      var arc = state.arcs[state.arcs.active],
          svg = pc.selection.select('svg').select('g#arcs');

      delete state.arcs[state.arcs.active];
      state.arcs.active = undefined;
      svg.selectAll('line#arc-' + arc.dims.i).remove();
      svg.selectAll('circle#arc-' + arc.dims.i).remove();
      svg.selectAll('path#arc-' + arc.dims.i).remove();
    };

    var onDragEnd$1 = function onDragEnd(brushGroup, state, config, pc, events) {
      return function () {
        var arc = state.arcs[state.arcs.active];

        // Okay, somewhat unexpected, but not totally unsurprising, a mousclick is
        // considered a drag without move. So we have to deal with that case
        if (arc && arc.p1[0] === arc.p2[0] && arc.p1[1] === arc.p2[1]) {
          removeStrum$1(state, pc);
        }

        if (arc) {
          var angle = state.arcs.startAngle(state.arcs.active);

          arc.startAngle = angle;
          arc.endAngle = angle;
          arc.arc.outerRadius(state.arcs.length(state.arcs.active)).startAngle(angle).endAngle(angle);
        }

        state.arcs.active = undefined;
        config.brushed = selected$3(brushGroup, state, config);
        pc.renderBrushed();
        events.call('brushend', pc, config.brushed);
      };
    };

    var drawStrum$1 = function drawStrum(brushGroup, state, config, pc, events, arc, activePoint) {
      var svg = pc.selection.select('svg').select('g#arcs'),
          id = arc.dims.i,
          points = [arc.p2, arc.p3],
          _line = svg.selectAll('line#arc-' + id).data([{ p1: arc.p1, p2: arc.p2 }, { p1: arc.p1, p2: arc.p3 }]),
          circles = svg.selectAll('circle#arc-' + id).data(points),
          _drag = drag(),
          _path = svg.selectAll('path#arc-' + id).data([arc]);

      _path.enter().append('path').attr('id', 'arc-' + id).attr('class', 'arc').style('fill', 'orange').style('opacity', 0.5);

      _path.attr('d', arc.arc).attr('transform', 'translate(' + arc.p1[0] + ',' + arc.p1[1] + ')');

      _line.enter().append('line').attr('id', 'arc-' + id).attr('class', 'arc');

      _line.attr('x1', function (d) {
        return d.p1[0];
      }).attr('y1', function (d) {
        return d.p1[1];
      }).attr('x2', function (d) {
        return d.p2[0];
      }).attr('y2', function (d) {
        return d.p2[1];
      }).attr('stroke', 'black').attr('stroke-width', 2);

      _drag.on('drag', function (d, i) {
        var ev = event;
        i = i + 2;

        arc['p' + i][0] = Math.min(Math.max(arc.minX + 1, ev.x), arc.maxX);
        arc['p' + i][1] = Math.min(Math.max(arc.minY, ev.y), arc.maxY);

        var angle = i === 3 ? state.arcs.startAngle(id) : state.arcs.endAngle(id);

        if (arc.startAngle < Math.PI && arc.endAngle < Math.PI && angle < Math.PI || arc.startAngle >= Math.PI && arc.endAngle >= Math.PI && angle >= Math.PI) {
          if (i === 2) {
            arc.endAngle = angle;
            arc.arc.endAngle(angle);
          } else if (i === 3) {
            arc.startAngle = angle;
            arc.arc.startAngle(angle);
          }
        }

        drawStrum(brushGroup, state, config, pc, events, arc, i - 2);
      }).on('end', onDragEnd$1(brushGroup, state, config, pc, events));

      circles.enter().append('circle').attr('id', 'arc-' + id).attr('class', 'arc');

      circles.attr('cx', function (d) {
        return d[0];
      }).attr('cy', function (d) {
        return d[1];
      }).attr('r', 5).style('opacity', function (d, i) {
        return activePoint !== undefined && i === activePoint ? 0.8 : 0;
      }).on('mouseover', function () {
        select(this).style('opacity', 0.8);
      }).on('mouseout', function () {
        select(this).style('opacity', 0);
      }).call(_drag);
    };

    var onDrag$1 = function onDrag(brushGroup, state, config, pc, events) {
      return function () {
        var ev = event,
            arc = state.arcs[state.arcs.active];

        // Make sure that the point is within the bounds
        arc.p2[0] = Math.min(Math.max(arc.minX + 1, ev.x - config.margin.left), arc.maxX);
        arc.p2[1] = Math.min(Math.max(arc.minY, ev.y - config.margin.top), arc.maxY);
        arc.p3 = arc.p2.slice();
        drawStrum$1(brushGroup, state, config, pc, events, arc, 1);
      };
    };

    var pi$1 = Math.PI,
        tau$1 = 2 * pi$1,
        epsilon = 1e-6,
        tauEpsilon = tau$1 - epsilon;

    function Path() {
      this._x0 = this._y0 = // start of current subpath
      this._x1 = this._y1 = null; // end of current subpath
      this._ = "";
    }

    function path() {
      return new Path();
    }

    Path.prototype = path.prototype = {
      constructor: Path,
      moveTo: function moveTo(x, y) {
        this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y);
      },
      closePath: function closePath() {
        if (this._x1 !== null) {
          this._x1 = this._x0, this._y1 = this._y0;
          this._ += "Z";
        }
      },
      lineTo: function lineTo(x, y) {
        this._ += "L" + (this._x1 = +x) + "," + (this._y1 = +y);
      },
      quadraticCurveTo: function quadraticCurveTo(x1, y1, x, y) {
        this._ += "Q" + +x1 + "," + +y1 + "," + (this._x1 = +x) + "," + (this._y1 = +y);
      },
      bezierCurveTo: function bezierCurveTo(x1, y1, x2, y2, x, y) {
        this._ += "C" + +x1 + "," + +y1 + "," + +x2 + "," + +y2 + "," + (this._x1 = +x) + "," + (this._y1 = +y);
      },
      arcTo: function arcTo(x1, y1, x2, y2, r) {
        x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
        var x0 = this._x1,
            y0 = this._y1,
            x21 = x2 - x1,
            y21 = y2 - y1,
            x01 = x0 - x1,
            y01 = y0 - y1,
            l01_2 = x01 * x01 + y01 * y01;

        // Is the radius negative? Error.
        if (r < 0) throw new Error("negative radius: " + r);

        // Is this path empty? Move to (x1,y1).
        if (this._x1 === null) {
          this._ += "M" + (this._x1 = x1) + "," + (this._y1 = y1);
        }

        // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
        else if (!(l01_2 > epsilon)) ;

          // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
          // Equivalently, is (x1,y1) coincident with (x2,y2)?
          // Or, is the radius zero? Line to (x1,y1).
          else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
              this._ += "L" + (this._x1 = x1) + "," + (this._y1 = y1);
            }

            // Otherwise, draw an arc!
            else {
                var x20 = x2 - x0,
                    y20 = y2 - y0,
                    l21_2 = x21 * x21 + y21 * y21,
                    l20_2 = x20 * x20 + y20 * y20,
                    l21 = Math.sqrt(l21_2),
                    l01 = Math.sqrt(l01_2),
                    l = r * Math.tan((pi$1 - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
                    t01 = l / l01,
                    t21 = l / l21;

                // If the start tangent is not coincident with (x0,y0), line to.
                if (Math.abs(t01 - 1) > epsilon) {
                  this._ += "L" + (x1 + t01 * x01) + "," + (y1 + t01 * y01);
                }

                this._ += "A" + r + "," + r + ",0,0," + +(y01 * x20 > x01 * y20) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
              }
      },
      arc: function arc(x, y, r, a0, a1, ccw) {
        x = +x, y = +y, r = +r;
        var dx = r * Math.cos(a0),
            dy = r * Math.sin(a0),
            x0 = x + dx,
            y0 = y + dy,
            cw = 1 ^ ccw,
            da = ccw ? a0 - a1 : a1 - a0;

        // Is the radius negative? Error.
        if (r < 0) throw new Error("negative radius: " + r);

        // Is this path empty? Move to (x0,y0).
        if (this._x1 === null) {
          this._ += "M" + x0 + "," + y0;
        }

        // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
        else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
            this._ += "L" + x0 + "," + y0;
          }

        // Is this arc empty? We’re done.
        if (!r) return;

        // Does the angle go the wrong way? Flip the direction.
        if (da < 0) da = da % tau$1 + tau$1;

        // Is this a complete circle? Draw two arcs to complete the circle.
        if (da > tauEpsilon) {
          this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x - dx) + "," + (y - dy) + "A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
        }

        // Is this arc non-empty? Draw an arc!
        else if (da > epsilon) {
            this._ += "A" + r + "," + r + ",0," + +(da >= pi$1) + "," + cw + "," + (this._x1 = x + r * Math.cos(a1)) + "," + (this._y1 = y + r * Math.sin(a1));
          }
      },
      rect: function rect(x, y, w, h) {
        this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y) + "h" + +w + "v" + +h + "h" + -w + "Z";
      },
      toString: function toString() {
        return this._;
      }
    };

    function constant$4 (x) {
      return function constant() {
        return x;
      };
    }

    var abs = Math.abs;
    var atan2 = Math.atan2;
    var cos = Math.cos;
    var max = Math.max;
    var min = Math.min;
    var sin = Math.sin;
    var sqrt = Math.sqrt;

    var epsilon$1 = 1e-12;
    var pi$2 = Math.PI;
    var halfPi$1 = pi$2 / 2;
    var tau$2 = 2 * pi$2;

    function acos(x) {
      return x > 1 ? 0 : x < -1 ? pi$2 : Math.acos(x);
    }

    function asin(x) {
      return x >= 1 ? halfPi$1 : x <= -1 ? -halfPi$1 : Math.asin(x);
    }

    function arcInnerRadius(d) {
      return d.innerRadius;
    }

    function arcOuterRadius(d) {
      return d.outerRadius;
    }

    function arcStartAngle(d) {
      return d.startAngle;
    }

    function arcEndAngle(d) {
      return d.endAngle;
    }

    function arcPadAngle(d) {
      return d && d.padAngle; // Note: optional!
    }

    function intersect(x0, y0, x1, y1, x2, y2, x3, y3) {
      var x10 = x1 - x0,
          y10 = y1 - y0,
          x32 = x3 - x2,
          y32 = y3 - y2,
          t = (x32 * (y0 - y2) - y32 * (x0 - x2)) / (y32 * x10 - x32 * y10);
      return [x0 + t * x10, y0 + t * y10];
    }

    // Compute perpendicular offset line of length rc.
    // http://mathworld.wolfram.com/Circle-LineIntersection.html
    function cornerTangents(x0, y0, x1, y1, r1, rc, cw) {
      var x01 = x0 - x1,
          y01 = y0 - y1,
          lo = (cw ? rc : -rc) / sqrt(x01 * x01 + y01 * y01),
          ox = lo * y01,
          oy = -lo * x01,
          x11 = x0 + ox,
          y11 = y0 + oy,
          x10 = x1 + ox,
          y10 = y1 + oy,
          x00 = (x11 + x10) / 2,
          y00 = (y11 + y10) / 2,
          dx = x10 - x11,
          dy = y10 - y11,
          d2 = dx * dx + dy * dy,
          r = r1 - rc,
          D = x11 * y10 - x10 * y11,
          d = (dy < 0 ? -1 : 1) * sqrt(max(0, r * r * d2 - D * D)),
          cx0 = (D * dy - dx * d) / d2,
          cy0 = (-D * dx - dy * d) / d2,
          cx1 = (D * dy + dx * d) / d2,
          cy1 = (-D * dx + dy * d) / d2,
          dx0 = cx0 - x00,
          dy0 = cy0 - y00,
          dx1 = cx1 - x00,
          dy1 = cy1 - y00;

      // Pick the closer of the two intersection points.
      // TODO Is there a faster way to determine which intersection to use?
      if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) cx0 = cx1, cy0 = cy1;

      return {
        cx: cx0,
        cy: cy0,
        x01: -ox,
        y01: -oy,
        x11: cx0 * (r1 / r - 1),
        y11: cy0 * (r1 / r - 1)
      };
    }

    function d3Arc () {
      var innerRadius = arcInnerRadius,
          outerRadius = arcOuterRadius,
          cornerRadius = constant$4(0),
          padRadius = null,
          startAngle = arcStartAngle,
          endAngle = arcEndAngle,
          padAngle = arcPadAngle,
          context = null;

      function arc() {
        var buffer,
            r,
            r0 = +innerRadius.apply(this, arguments),
            r1 = +outerRadius.apply(this, arguments),
            a0 = startAngle.apply(this, arguments) - halfPi$1,
            a1 = endAngle.apply(this, arguments) - halfPi$1,
            da = abs(a1 - a0),
            cw = a1 > a0;

        if (!context) context = buffer = path();

        // Ensure that the outer radius is always larger than the inner radius.
        if (r1 < r0) r = r1, r1 = r0, r0 = r;

        // Is it a point?
        if (!(r1 > epsilon$1)) context.moveTo(0, 0);

        // Or is it a circle or annulus?
        else if (da > tau$2 - epsilon$1) {
            context.moveTo(r1 * cos(a0), r1 * sin(a0));
            context.arc(0, 0, r1, a0, a1, !cw);
            if (r0 > epsilon$1) {
              context.moveTo(r0 * cos(a1), r0 * sin(a1));
              context.arc(0, 0, r0, a1, a0, cw);
            }
          }

          // Or is it a circular or annular sector?
          else {
              var a01 = a0,
                  a11 = a1,
                  a00 = a0,
                  a10 = a1,
                  da0 = da,
                  da1 = da,
                  ap = padAngle.apply(this, arguments) / 2,
                  rp = ap > epsilon$1 && (padRadius ? +padRadius.apply(this, arguments) : sqrt(r0 * r0 + r1 * r1)),
                  rc = min(abs(r1 - r0) / 2, +cornerRadius.apply(this, arguments)),
                  rc0 = rc,
                  rc1 = rc,
                  t0,
                  t1;

              // Apply padding? Note that since r1 ≥ r0, da1 ≥ da0.
              if (rp > epsilon$1) {
                var p0 = asin(rp / r0 * sin(ap)),
                    p1 = asin(rp / r1 * sin(ap));
                if ((da0 -= p0 * 2) > epsilon$1) p0 *= cw ? 1 : -1, a00 += p0, a10 -= p0;else da0 = 0, a00 = a10 = (a0 + a1) / 2;
                if ((da1 -= p1 * 2) > epsilon$1) p1 *= cw ? 1 : -1, a01 += p1, a11 -= p1;else da1 = 0, a01 = a11 = (a0 + a1) / 2;
              }

              var x01 = r1 * cos(a01),
                  y01 = r1 * sin(a01),
                  x10 = r0 * cos(a10),
                  y10 = r0 * sin(a10);

              // Apply rounded corners?
              if (rc > epsilon$1) {
                var x11 = r1 * cos(a11),
                    y11 = r1 * sin(a11),
                    x00 = r0 * cos(a00),
                    y00 = r0 * sin(a00);

                // Restrict the corner radius according to the sector angle.
                if (da < pi$2) {
                  var oc = da0 > epsilon$1 ? intersect(x01, y01, x00, y00, x11, y11, x10, y10) : [x10, y10],
                      ax = x01 - oc[0],
                      ay = y01 - oc[1],
                      bx = x11 - oc[0],
                      by = y11 - oc[1],
                      kc = 1 / sin(acos((ax * bx + ay * by) / (sqrt(ax * ax + ay * ay) * sqrt(bx * bx + by * by))) / 2),
                      lc = sqrt(oc[0] * oc[0] + oc[1] * oc[1]);
                  rc0 = min(rc, (r0 - lc) / (kc - 1));
                  rc1 = min(rc, (r1 - lc) / (kc + 1));
                }
              }

              // Is the sector collapsed to a line?
              if (!(da1 > epsilon$1)) context.moveTo(x01, y01);

              // Does the sector’s outer ring have rounded corners?
              else if (rc1 > epsilon$1) {
                  t0 = cornerTangents(x00, y00, x01, y01, r1, rc1, cw);
                  t1 = cornerTangents(x11, y11, x10, y10, r1, rc1, cw);

                  context.moveTo(t0.cx + t0.x01, t0.cy + t0.y01);

                  // Have the corners merged?
                  if (rc1 < rc) context.arc(t0.cx, t0.cy, rc1, atan2(t0.y01, t0.x01), atan2(t1.y01, t1.x01), !cw);

                  // Otherwise, draw the two corners and the ring.
                  else {
                      context.arc(t0.cx, t0.cy, rc1, atan2(t0.y01, t0.x01), atan2(t0.y11, t0.x11), !cw);
                      context.arc(0, 0, r1, atan2(t0.cy + t0.y11, t0.cx + t0.x11), atan2(t1.cy + t1.y11, t1.cx + t1.x11), !cw);
                      context.arc(t1.cx, t1.cy, rc1, atan2(t1.y11, t1.x11), atan2(t1.y01, t1.x01), !cw);
                    }
                }

                // Or is the outer ring just a circular arc?
                else context.moveTo(x01, y01), context.arc(0, 0, r1, a01, a11, !cw);

              // Is there no inner ring, and it’s a circular sector?
              // Or perhaps it’s an annular sector collapsed due to padding?
              if (!(r0 > epsilon$1) || !(da0 > epsilon$1)) context.lineTo(x10, y10);

              // Does the sector’s inner ring (or point) have rounded corners?
              else if (rc0 > epsilon$1) {
                  t0 = cornerTangents(x10, y10, x11, y11, r0, -rc0, cw);
                  t1 = cornerTangents(x01, y01, x00, y00, r0, -rc0, cw);

                  context.lineTo(t0.cx + t0.x01, t0.cy + t0.y01);

                  // Have the corners merged?
                  if (rc0 < rc) context.arc(t0.cx, t0.cy, rc0, atan2(t0.y01, t0.x01), atan2(t1.y01, t1.x01), !cw);

                  // Otherwise, draw the two corners and the ring.
                  else {
                      context.arc(t0.cx, t0.cy, rc0, atan2(t0.y01, t0.x01), atan2(t0.y11, t0.x11), !cw);
                      context.arc(0, 0, r0, atan2(t0.cy + t0.y11, t0.cx + t0.x11), atan2(t1.cy + t1.y11, t1.cx + t1.x11), cw);
                      context.arc(t1.cx, t1.cy, rc0, atan2(t1.y11, t1.x11), atan2(t1.y01, t1.x01), !cw);
                    }
                }

                // Or is the inner ring just a circular arc?
                else context.arc(0, 0, r0, a10, a00, cw);
            }

        context.closePath();

        if (buffer) return context = null, buffer + "" || null;
      }

      arc.centroid = function () {
        var r = (+innerRadius.apply(this, arguments) + +outerRadius.apply(this, arguments)) / 2,
            a = (+startAngle.apply(this, arguments) + +endAngle.apply(this, arguments)) / 2 - pi$2 / 2;
        return [cos(a) * r, sin(a) * r];
      };

      arc.innerRadius = function (_) {
        return arguments.length ? (innerRadius = typeof _ === "function" ? _ : constant$4(+_), arc) : innerRadius;
      };

      arc.outerRadius = function (_) {
        return arguments.length ? (outerRadius = typeof _ === "function" ? _ : constant$4(+_), arc) : outerRadius;
      };

      arc.cornerRadius = function (_) {
        return arguments.length ? (cornerRadius = typeof _ === "function" ? _ : constant$4(+_), arc) : cornerRadius;
      };

      arc.padRadius = function (_) {
        return arguments.length ? (padRadius = _ == null ? null : typeof _ === "function" ? _ : constant$4(+_), arc) : padRadius;
      };

      arc.startAngle = function (_) {
        return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant$4(+_), arc) : startAngle;
      };

      arc.endAngle = function (_) {
        return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant$4(+_), arc) : endAngle;
      };

      arc.padAngle = function (_) {
        return arguments.length ? (padAngle = typeof _ === "function" ? _ : constant$4(+_), arc) : padAngle;
      };

      arc.context = function (_) {
        return arguments.length ? (context = _ == null ? null : _, arc) : context;
      };

      return arc;
    }

    function sign(x) {
      return x < 0 ? -1 : 1;
    }

    // Calculate the slopes of the tangents (Hermite-type interpolation) based on
    // the following paper: Steffen, M. 1990. A Simple Method for Monotonic
    // Interpolation in One Dimension. Astronomy and Astrophysics, Vol. 239, NO.
    // NOV(II), P. 443, 1990.
    function slope3(that, x2, y2) {
      var h0 = that._x1 - that._x0,
          h1 = x2 - that._x1,
          s0 = (that._y1 - that._y0) / (h0 || h1 < 0 && -0),
          s1 = (y2 - that._y1) / (h1 || h0 < 0 && -0),
          p = (s0 * h1 + s1 * h0) / (h0 + h1);
      return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
    }

    // Calculate a one-sided slope.
    function slope2(that, t) {
      var h = that._x1 - that._x0;
      return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
    }

    // According to https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Representations
    // "you can express cubic Hermite interpolation in terms of cubic Bézier curves
    // with respect to the four values p0, p0 + m0 / 3, p1 - m1 / 3, p1".
    function _point$3(that, t0, t1) {
      var x0 = that._x0,
          y0 = that._y0,
          x1 = that._x1,
          y1 = that._y1,
          dx = (x1 - x0) / 3;
      that._context.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
    }

    function MonotoneX(context) {
      this._context = context;
    }

    MonotoneX.prototype = {
      areaStart: function areaStart() {
        this._line = 0;
      },
      areaEnd: function areaEnd() {
        this._line = NaN;
      },
      lineStart: function lineStart() {
        this._x0 = this._x1 = this._y0 = this._y1 = this._t0 = NaN;
        this._point = 0;
      },
      lineEnd: function lineEnd() {
        switch (this._point) {
          case 2:
            this._context.lineTo(this._x1, this._y1);break;
          case 3:
            _point$3(this, this._t0, slope2(this, this._t0));break;
        }
        if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
        this._line = 1 - this._line;
      },
      point: function point(x, y) {
        var t1 = NaN;

        x = +x, y = +y;
        if (x === this._x1 && y === this._y1) return; // Ignore coincident points.
        switch (this._point) {
          case 0:
            this._point = 1;this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y);break;
          case 1:
            this._point = 2;break;
          case 2:
            this._point = 3;_point$3(this, slope2(this, t1 = slope3(this, x, y)), t1);break;
          default:
            _point$3(this, this._t0, t1 = slope3(this, x, y));break;
        }

        this._x0 = this._x1, this._x1 = x;
        this._y0 = this._y1, this._y1 = y;
        this._t0 = t1;
      }
    };

    function MonotoneY(context) {
      this._context = new ReflectContext(context);
    }

    (MonotoneY.prototype = Object.create(MonotoneX.prototype)).point = function (x, y) {
      MonotoneX.prototype.point.call(this, y, x);
    };

    function ReflectContext(context) {
      this._context = context;
    }

    ReflectContext.prototype = {
      moveTo: function moveTo(x, y) {
        this._context.moveTo(y, x);
      },
      closePath: function closePath() {
        this._context.closePath();
      },
      lineTo: function lineTo(x, y) {
        this._context.lineTo(y, x);
      },
      bezierCurveTo: function bezierCurveTo(x1, y1, x2, y2, x, y) {
        this._context.bezierCurveTo(y1, x1, y2, x2, y, x);
      }
    };

    // First we need to determine between which two axes the arc was started.
    // This will determine the freedom of movement, because a arc can
    // logically only happen between two axes, so no movement outside these axes
    // should be allowed.
    var onDragStart$1 = function onDragStart(state, config, pc, xscale) {
      return function () {
        var p = mouse(state.strumRect.node());

        p[0] = p[0] - config.margin.left;
        p[1] = p[1] - config.margin.top;

        var dims = dimensionsForPoint(config, pc, xscale, p);
        var arc$$1 = {
          p1: p,
          dims: dims,
          minX: xscale(dims.left),
          maxX: xscale(dims.right),
          minY: 0,
          maxY: h(config),
          startAngle: undefined,
          endAngle: undefined,
          arc: d3Arc().innerRadius(0)
        };

        // Make sure that the point is within the bounds
        arc$$1.p1[0] = Math.min(Math.max(arc$$1.minX, p[0]), arc$$1.maxX);
        arc$$1.p2 = arc$$1.p1.slice();
        arc$$1.p3 = arc$$1.p1.slice();

        state.arcs[dims.i] = arc$$1;
        state.arcs.active = dims.i;
      };
    };

    var brushReset$3 = function brushReset(brushGroup, state, config, pc, events) {
      return function () {
        var ids = Object.getOwnPropertyNames(state.arcs).filter(function (d) {
          return !isNaN(d);
        });

        ids.forEach(function (d) {
          state.arcs.active = d;
          removeStrum$1(state, pc);
        });
        onDragEnd$1(brushGroup, state, config, pc, events)();
      };
    };

    // returns angles in [-PI/2, PI/2]
    var angle = function angle(p1, p2) {
      var a = p1[0] - p2[0],
          b = p1[1] - p2[1],
          c = hypothenuse(a, b);

      return Math.asin(b / c);
    };

    var endAngle = function endAngle(state) {
      return function (id) {
        var arc = state.arcs[id];
        if (arc === undefined) {
          return undefined;
        }
        var sAngle = angle(arc.p1, arc.p2),
            uAngle = -sAngle + Math.PI / 2;

        if (arc.p1[0] > arc.p2[0]) {
          uAngle = 2 * Math.PI - uAngle;
        }

        return uAngle;
      };
    };

    var startAngle = function startAngle(state) {
      return function (id) {
        var arc = state.arcs[id];
        if (arc === undefined) {
          return undefined;
        }

        var sAngle = angle(arc.p1, arc.p3),
            uAngle = -sAngle + Math.PI / 2;

        if (arc.p1[0] > arc.p3[0]) {
          uAngle = 2 * Math.PI - uAngle;
        }

        return uAngle;
      };
    };

    var length = function length(state) {
      return function (id) {
        var arc = state.arcs[id];

        if (arc === undefined) {
          return undefined;
        }

        var a = arc.p1[0] - arc.p2[0],
            b = arc.p1[1] - arc.p2[1];

        return hypothenuse(a, b);
      };
    };

    var install$3 = function install(brushGroup, state, config, pc, events, xscale) {
      return function () {
        if (!pc.g()) {
          pc.createAxes();
        }

        var _drag = drag();

        // Map of current arcs. arcs are stored per segment of the PC. A segment,
        // being the area between two axes. The left most area is indexed at 0.
        state.arcs.active = undefined;
        // Returns the width of the PC segment where currently a arc is being
        // placed. NOTE: even though they are evenly spaced in our current
        // implementation, we keep for when non-even spaced segments are supported as
        // well.
        state.arcs.width = function (id) {
          var arc = state.arcs[id];
          return arc === undefined ? undefined : arc.maxX - arc.minX;
        };

        // returns angles in [0, 2 * PI]
        state.arcs.endAngle = endAngle(state);
        state.arcs.startAngle = startAngle(state);
        state.arcs.length = length(state);

        pc.on('axesreorder.arcs', function () {
          var ids = Object.getOwnPropertyNames(arcs).filter(function (d) {
            return !isNaN(d);
          });

          if (ids.length > 0) {
            // We have some arcs, which might need to be removed.
            ids.forEach(function (d) {
              var dims = arcs[d].dims;
              state.arcs.active = d;
              // If the two dimensions of the current arc are not next to each other
              // any more, than we'll need to remove the arc. Otherwise we keep it.
              if (!consecutive(dims)(dims.left, dims.right)) {
                removeStrum$1(state, pc);
              }
            });
            onDragEnd$1(brushGroup, state, config, pc, events)();
          }
        });

        // Add a new svg group in which we draw the arcs.
        pc.selection.select('svg').append('g').attr('id', 'arcs').attr('transform', 'translate(' + config.margin.left + ',' + config.margin.top + ')');

        // Install the required brushReset function
        pc.brushReset = brushReset$3(brushGroup, state, config, pc, events);

        _drag.on('start', onDragStart$1(state, config, pc, xscale)).on('drag', onDrag$1(brushGroup, state, config, pc, events)).on('end', onDragEnd$1(brushGroup, state, config, pc, events));

        // NOTE: The styling needs to be done here and not in the css. This is because
        //       for 1D brushing, the canvas layers should not listen to
        //       pointer-events._.
        state.strumRect = pc.selection.select('svg').insert('rect', 'g#arcs').attr('id', 'arc-events').attr('x', config.margin.left).attr('y', config.margin.top).attr('width', w(config)).attr('height', h(config) + 2).style('opacity', 0).call(_drag);
      };
    };

    var installAngularBrush = function installAngularBrush(brushGroup, config, pc, events, xscale) {
      var state = {
        arcs: {},
        strumRect: {}
      };

      brushGroup.modes['angular'] = {
        install: install$3(brushGroup, state, config, pc, events, xscale),
        uninstall: uninstall$3(state, pc),
        selected: selected$3(brushGroup, state, config),
        brushState: function brushState() {
          return state.arcs;
        }
      };
    };

    // calculate 2d intersection of line a->b with line c->d
    // points are objects with x and y properties
    var intersection = function intersection(a, b, c, d) {
      return {
        x: ((a.x * b.y - a.y * b.x) * (c.x - d.x) - (a.x - b.x) * (c.x * d.y - c.y * d.x)) / ((a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x)),
        y: ((a.x * b.y - a.y * b.x) * (c.y - d.y) - (a.y - b.y) * (c.x * d.y - c.y * d.x)) / ((a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x))
      };
    };

    // Merges the canvases and SVG elements into one canvas element which is then passed into the callback
    // (so you can choose to save it to disk, etc.)
    var mergeParcoords = function mergeParcoords(pc) {
      return function (callback) {
        // Retina display, etc.
        var devicePixelRatio = window.devicePixelRatio || 1;

        // Create a canvas element to store the merged canvases
        var mergedCanvas = document.createElement('canvas');

        var foregroundCanvas = pc.canvas.foreground;
        // We will need to adjust for canvas margins to align the svg and canvas
        var canvasMarginLeft = Number(foregroundCanvas.style.marginLeft.replace('px', ''));

        var textTopAdjust = 15;
        var canvasMarginTop = Number(foregroundCanvas.style.marginTop.replace('px', '')) + textTopAdjust;
        var width = (foregroundCanvas.clientWidth + canvasMarginLeft) * devicePixelRatio;
        var height = (foregroundCanvas.clientHeight + canvasMarginTop) * devicePixelRatio;
        mergedCanvas.width = width + 50; // pad so that svg labels at right will not get cut off
        mergedCanvas.height = height + 30; // pad so that svg labels at bottom will not get cut off
        mergedCanvas.style.width = mergedCanvas.width / devicePixelRatio + 'px';
        mergedCanvas.style.height = mergedCanvas.height / devicePixelRatio + 'px';

        // Give the canvas a white background
        var context = mergedCanvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);

        // Merge all the canvases
        for (var key in pc.canvas) {
          context.drawImage(pc.canvas[key], canvasMarginLeft * devicePixelRatio, canvasMarginTop * devicePixelRatio, width - canvasMarginLeft * devicePixelRatio, height - canvasMarginTop * devicePixelRatio);
        }

        // Add SVG elements to canvas
        var DOMURL = window.URL || window.webkitURL || window;
        var serializer = new XMLSerializer();
        // axis labels are translated (0,-5) so we will clone the svg
        //   and translate down so the labels are drawn on the canvas
        var svgNodeCopy = pc.selection.select('svg').node().cloneNode(true);
        svgNodeCopy.setAttribute('transform', 'translate(0,' + textTopAdjust + ')');
        svgNodeCopy.setAttribute('height', svgNodeCopy.getAttribute('height') + textTopAdjust);
        // text will need fill attribute since css styles will not get picked up
        //   this is not sophisticated since it doesn't look up css styles
        //   if the user changes
        select(svgNodeCopy).selectAll('text').attr('fill', 'black');
        var svgStr = serializer.serializeToString(svgNodeCopy);

        // Create a Data URI.
        var src = 'data:image/svg+xml;base64,' + window.btoa(svgStr);
        var img = new Image();
        img.onload = function () {
          context.drawImage(img, 0, 0, img.width * devicePixelRatio, img.height * devicePixelRatio);
          if (typeof callback === 'function') {
            callback(mergedCanvas);
          }
        };
        img.src = src;
      };
    };

    var selected$4 = function selected(config, pc) {
      return function () {
        var actives = [];
        var extents = [];
        var ranges = {};
        //get brush selections from each node, convert to actual values
        //invert order of values in array to comply with the parcoords architecture
        if (config.brushes.length === 0) {
          var nodes = pc.g().selectAll('.brush').nodes();
          for (var k = 0; k < nodes.length; k++) {
            if (brushSelection(nodes[k]) !== null) {
              actives.push(nodes[k].__data__);
              var values = [];
              var ranger = brushSelection(nodes[k]);
              if (typeof config.dimensions[nodes[k].__data__].yscale.domain()[0] === 'number') {
                for (var i = 0; i < ranger.length; i++) {
                  if (actives.includes(nodes[k].__data__) && config.flipAxes.includes(nodes[k].__data__)) {
                    values.push(config.dimensions[nodes[k].__data__].yscale.invert(ranger[i]));
                  } else if (config.dimensions[nodes[k].__data__].yscale() !== 1) {
                    values.unshift(config.dimensions[nodes[k].__data__].yscale.invert(ranger[i]));
                  }
                }
                extents.push(values);
                for (var ii = 0; ii < extents.length; ii++) {
                  if (extents[ii].length === 0) {
                    extents[ii] = [1, 1];
                  }
                }
              } else {
                ranges[nodes[k].__data__] = brushSelection(nodes[k]);
                var dimRange = config.dimensions[nodes[k].__data__].yscale.range();
                var dimDomain = config.dimensions[nodes[k].__data__].yscale.domain();
                for (var j = 0; j < dimRange.length; j++) {
                  if (dimRange[j] >= ranger[0] && dimRange[j] <= ranger[1] && actives.includes(nodes[k].__data__) && config.flipAxes.includes(nodes[k].__data__)) {
                    values.push(dimRange[j]);
                  } else if (dimRange[j] >= ranger[0] && dimRange[j] <= ranger[1]) {
                    values.unshift(dimRange[j]);
                  }
                }
                extents.push(values);
                for (var _ii = 0; _ii < extents.length; _ii++) {
                  if (extents[_ii].length === 0) {
                    extents[_ii] = [1, 1];
                  }
                }
              }
            }
          }
          // test if within range
          var within = {
            date: function date(d, p, dimension) {
              var category = d[p];
              var categoryIndex = config.dimensions[p].yscale.domain().indexOf(category);
              var categoryRangeValue = config.dimensions[p].yscale.range()[categoryIndex];
              return categoryRangeValue >= ranges[p][0] && categoryRangeValue <= ranges[p][1];
            },
            number: function number(d, p, dimension) {
              return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
            },
            string: function string(d, p, dimension) {
              var category = d[p];
              var categoryIndex = config.dimensions[p].yscale.domain().indexOf(category);
              var categoryRangeValue = config.dimensions[p].yscale.range()[categoryIndex];
              return categoryRangeValue >= ranges[p][0] && categoryRangeValue <= ranges[p][1];
            }
          };
          return config.data.filter(function (d) {
            return actives.every(function (p, dimension) {
              return within[config.dimensions[p].type](d, p, dimension);
            });
          });
        } else {
          // need to get data from each brush instead of each axis
          // first must find active axes by iterating through all brushes
          // then go through similiar process as above.
          var multiBrushData = [];

          var _loop = function _loop(idx) {
            var brush$$1 = config.brushes[idx];
            var values = [];
            var ranger = brush$$1.extent;
            var actives = [brush$$1.data];
            if (typeof config.dimensions[brush$$1.data].yscale.domain()[0] === 'number') {
              for (var _i = 0; _i < ranger.length; _i++) {
                if (actives.includes(brush$$1.data) && config.flipAxes.includes(brush$$1.data)) {
                  values.push(config.dimensions[brush$$1.data].yscale.invert(ranger[_i]));
                } else if (config.dimensions[brush$$1.data].yscale() !== 1) {
                  values.unshift(config.dimensions[brush$$1.data].yscale.invert(ranger[_i]));
                }
              }
              extents.push(values);
              for (var _ii2 = 0; _ii2 < extents.length; _ii2++) {
                if (extents[_ii2].length === 0) {
                  extents[_ii2] = [1, 1];
                }
              }
            } else {
              ranges[brush$$1.data] = brush$$1.extent;
              var _dimRange = config.dimensions[brush$$1.data].yscale.range();
              var _dimDomain = config.dimensions[brush$$1.data].yscale.domain();
              for (var _j = 0; _j < _dimRange.length; _j++) {
                if (_dimRange[_j] >= ranger[0] && _dimRange[_j] <= ranger[1] && actives.includes(brush$$1.data) && config.flipAxes.includes(brush$$1.data)) {
                  values.push(_dimRange[_j]);
                } else if (_dimRange[_j] >= ranger[0] && _dimRange[_j] <= ranger[1]) {
                  values.unshift(_dimRange[_j]);
                }
              }
              extents.push(values);
              for (var _ii3 = 0; _ii3 < extents.length; _ii3++) {
                if (extents[_ii3].length === 0) {
                  extents[_ii3] = [1, 1];
                }
              }
            }
            var within = {
              date: function date(d, p, dimension) {
                var category = d[p];
                var categoryIndex = config.dimensions[p].yscale.domain().indexOf(category);
                var categoryRangeValue = config.dimensions[p].yscale.range()[categoryIndex];
                return categoryRangeValue >= ranges[p][0] && categoryRangeValue <= ranges[p][1];
              },
              number: function number(d, p, dimension) {
                return extents[idx][0] <= d[p] && d[p] <= extents[idx][1];
              },
              string: function string(d, p, dimension) {
                var category = d[p];
                var categoryIndex = config.dimensions[p].yscale.domain().indexOf(category);
                var categoryRangeValue = config.dimensions[p].yscale.range()[categoryIndex];
                return categoryRangeValue >= ranges[p][0] && categoryRangeValue <= ranges[p][1];
              }
            };

            // filter data, but instead of returning it now,
            // put it into multiBrush data which is returned after
            // all brushes are iterated through.
            var filtered = config.data.filter(function (d) {
              return actives.every(function (p, dimension) {
                return within[config.dimensions[p].type](d, p, dimension);
              });
            });
            for (var z = 0; z < filtered.length; z++) {
              multiBrushData.push(filtered[z]);
            }
            actives = [];
            ranges = {};
          };

          for (var idx = 0; idx < config.brushes.length; idx++) {
            _loop(idx);
          }
          return multiBrushData;
        }
      };
    };

    var brushPredicate = function brushPredicate(brushGroup, config, pc) {
      return function () {
        var predicate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

        if (predicate === null) {
          return brushGroup.predicate;
        }

        predicate = String(predicate).toUpperCase();
        if (predicate !== 'AND' && predicate !== 'OR') {
          throw new Error('Invalid predicate ' + predicate);
        }

        brushGroup.predicate = predicate;
        config.brushed = brushGroup.currentMode().selected();
        pc.renderBrushed();
        return pc;
      };
    };

    var brushMode = function brushMode(brushGroup, config, pc) {
      return function () {
        var mode = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

        if (mode === null) {
          return brushGroup.mode;
        }

        if (pc.brushModes().indexOf(mode) === -1) {
          throw new Error('pc.brushmode: Unsupported brush mode: ' + mode);
        }

        // Make sure that we don't trigger unnecessary events by checking if the mode
        // actually changes.
        if (mode !== brushGroup.mode) {
          // When changing brush modes, the first thing we need to do is clearing any
          // brushes from the current mode, if any.
          if (brushGroup.mode !== 'None') {
            pc.brushReset();
          }

          // Next, we need to 'uninstall' the current brushMode.
          brushGroup.modes[brushGroup.mode].uninstall(pc);
          // Finally, we can install the requested one.
          brushGroup.mode = mode;
          brushGroup.modes[brushGroup.mode].install();
          if (mode === 'None') {
            delete pc.brushPredicate;
          } else {
            pc.brushPredicate = brushPredicate(brushGroup, config, pc);
          }
        }

        return pc;
      };
    };

    /**
     * dimension display names
     *
     * @param config
     * @param d
     * @returns {*}
     */
    var dimensionLabels = function dimensionLabels(config) {
      return function (d) {
        return config.dimensions[d].title ? config.dimensions[d].title : d;
      };
    };

    var flipAxisAndUpdatePCP = function flipAxisAndUpdatePCP(config, pc, axis) {
      return function (dimension) {
        pc.flip(dimension);
        pc.brushReset(dimension);

        // select(this.parentElement)
        pc.selection.select('svg').selectAll('g.axis').filter(function (d) {
          return d === dimension;
        }).transition().duration(config.animationTime).call(axis.scale(config.dimensions[dimension].yscale));
        pc.render();
      };
    };

    var rotateLabels = function rotateLabels(config, pc) {
      if (!config.rotateLabels) return;

      var delta = event.deltaY;
      delta = delta < 0 ? -5 : delta;
      delta = delta > 0 ? 5 : delta;

      config.dimensionTitleRotation += delta;
      pc.svg.selectAll('text.label').attr('transform', 'translate(0,-5) rotate(' + config.dimensionTitleRotation + ')');
      event.preventDefault();
    };

    var _this$2 = undefined;

    var updateAxes = function updateAxes(config, pc, position, axis, flags) {
      return function () {
        var animationTime = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

        if (animationTime === null) {
          animationTime = config.animationTime;
        }

        var g_data = pc.svg.selectAll('.dimension').data(pc.getOrderedDimensionKeys());
        // Enter
        g_data.enter().append('svg:g').attr('class', 'dimension').attr('transform', function (p) {
          return 'translate(' + position(p) + ')';
        }).style('opacity', 0).append('svg:g').attr('class', 'axis').attr('transform', 'translate(0,0)').each(function (d) {
          var axisElement = select(this).call(pc.applyAxisConfig(axis, config.dimensions[d]));

          axisElement.selectAll('path').style('fill', 'none').style('stroke', '#222').style('shape-rendering', 'crispEdges');

          axisElement.selectAll('line').style('fill', 'none').style('stroke', '#222').style('shape-rendering', 'crispEdges');
        }).append('svg:text').attr('text-anchor', 'middle').attr('class', 'label').attr('x', 0).attr('y', 0).attr('transform', 'translate(0,-5) rotate(' + config.dimensionTitleRotation + ')').text(dimensionLabels(config)).on('dblclick', flipAxisAndUpdatePCP(config, pc, axis)).on('wheel', rotateLabels(config, pc));

        // Update
        g_data.attr('opacity', 0);
        g_data.select('.axis').transition().duration(animationTime).each(function (d) {
          select(this).call(pc.applyAxisConfig(axis, config.dimensions[d]));
        });
        g_data.select('.label').transition().duration(animationTime).text(dimensionLabels(config)).attr('transform', 'translate(0,-5) rotate(' + config.dimensionTitleRotation + ')');

        // Exit
        g_data.exit().remove();

        var g = pc.svg.selectAll('.dimension');
        g.transition().duration(animationTime).attr('transform', function (p) {
          return 'translate(' + position(p) + ')';
        }).style('opacity', 1);

        pc.svg.selectAll('.axis').transition().duration(animationTime).each(function (d) {
          select(this).call(pc.applyAxisConfig(axis, config.dimensions[d]));
        });

        if (flags.brushable) pc.brushable();
        if (flags.reorderable) pc.reorderable();
        if (pc.brushMode() !== 'None') {
          var mode = pc.brushMode();
          pc.brushMode('None');
          pc.brushMode(mode);
        }
        return _this$2;
      };
    };

    function ascending$2 (a, b) {
      return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    }

    function bisector (compare) {
      if (compare.length === 1) compare = ascendingComparator(compare);
      return {
        left: function left(a, x, lo, hi) {
          if (lo == null) lo = 0;
          if (hi == null) hi = a.length;
          while (lo < hi) {
            var mid = lo + hi >>> 1;
            if (compare(a[mid], x) < 0) lo = mid + 1;else hi = mid;
          }
          return lo;
        },
        right: function right(a, x, lo, hi) {
          if (lo == null) lo = 0;
          if (hi == null) hi = a.length;
          while (lo < hi) {
            var mid = lo + hi >>> 1;
            if (compare(a[mid], x) > 0) hi = mid;else lo = mid + 1;
          }
          return lo;
        }
      };
    }

    function ascendingComparator(f) {
      return function (d, x) {
        return ascending$2(f(d), x);
      };
    }

    var ascendingBisect = bisector(ascending$2);
    var bisectRight = ascendingBisect.right;

    function extent (values, valueof) {
      var n = values.length,
          i = -1,
          value,
          min,
          max;

      if (valueof == null) {
        while (++i < n) {
          // Find the first comparable value.
          if ((value = values[i]) != null && value >= value) {
            min = max = value;
            while (++i < n) {
              // Compare the remaining values.
              if ((value = values[i]) != null) {
                if (min > value) min = value;
                if (max < value) max = value;
              }
            }
          }
        }
      } else {
        while (++i < n) {
          // Find the first comparable value.
          if ((value = valueof(values[i], i, values)) != null && value >= value) {
            min = max = value;
            while (++i < n) {
              // Compare the remaining values.
              if ((value = valueof(values[i], i, values)) != null) {
                if (min > value) min = value;
                if (max < value) max = value;
              }
            }
          }
        }
      }

      return [min, max];
    }

    function range (start, stop, step) {
      start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

      var i = -1,
          n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
          range = new Array(n);

      while (++i < n) {
        range[i] = start + i * step;
      }

      return range;
    }

    var e10 = Math.sqrt(50),
        e5 = Math.sqrt(10),
        e2 = Math.sqrt(2);

    function ticks (start, stop, count) {
        var reverse,
            i = -1,
            n,
            ticks,
            step;

        stop = +stop, start = +start, count = +count;
        if (start === stop && count > 0) return [start];
        if (reverse = stop < start) n = start, start = stop, stop = n;
        if ((step = tickIncrement(start, stop, count)) === 0 || !isFinite(step)) return [];

        if (step > 0) {
            start = Math.ceil(start / step);
            stop = Math.floor(stop / step);
            ticks = new Array(n = Math.ceil(stop - start + 1));
            while (++i < n) {
                ticks[i] = (start + i) * step;
            }
        } else {
            start = Math.floor(start * step);
            stop = Math.ceil(stop * step);
            ticks = new Array(n = Math.ceil(start - stop + 1));
            while (++i < n) {
                ticks[i] = (start - i) / step;
            }
        }

        if (reverse) ticks.reverse();

        return ticks;
    }

    function tickIncrement(start, stop, count) {
        var step = (stop - start) / Math.max(0, count),
            power = Math.floor(Math.log(step) / Math.LN10),
            error = step / Math.pow(10, power);
        return power >= 0 ? (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1) * Math.pow(10, power) : -Math.pow(10, -power) / (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1);
    }

    function tickStep(start, stop, count) {
        var step0 = Math.abs(stop - start) / Math.max(0, count),
            step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
            error = step0 / step1;
        if (error >= e10) step1 *= 10;else if (error >= e5) step1 *= 5;else if (error >= e2) step1 *= 2;
        return stop < start ? -step1 : step1;
    }

    function min$1 (values, valueof) {
      var n = values.length,
          i = -1,
          value,
          min;

      if (valueof == null) {
        while (++i < n) {
          // Find the first comparable value.
          if ((value = values[i]) != null && value >= value) {
            min = value;
            while (++i < n) {
              // Compare the remaining values.
              if ((value = values[i]) != null && min > value) {
                min = value;
              }
            }
          }
        }
      } else {
        while (++i < n) {
          // Find the first comparable value.
          if ((value = valueof(values[i], i, values)) != null && value >= value) {
            min = value;
            while (++i < n) {
              // Compare the remaining values.
              if ((value = valueof(values[i], i, values)) != null && min > value) {
                min = value;
              }
            }
          }
        }
      }

      return min;
    }

    var prefix = "$";

    function Map$1() {}

    Map$1.prototype = map$1.prototype = {
      constructor: Map$1,
      has: function has(key) {
        return prefix + key in this;
      },
      get: function get(key) {
        return this[prefix + key];
      },
      set: function set(key, value) {
        this[prefix + key] = value;
        return this;
      },
      remove: function remove(key) {
        var property = prefix + key;
        return property in this && delete this[property];
      },
      clear: function clear() {
        for (var property in this) {
          if (property[0] === prefix) delete this[property];
        }
      },
      keys: function keys() {
        var keys = [];
        for (var property in this) {
          if (property[0] === prefix) keys.push(property.slice(1));
        }return keys;
      },
      values: function values() {
        var values = [];
        for (var property in this) {
          if (property[0] === prefix) values.push(this[property]);
        }return values;
      },
      entries: function entries() {
        var entries = [];
        for (var property in this) {
          if (property[0] === prefix) entries.push({ key: property.slice(1), value: this[property] });
        }return entries;
      },
      size: function size() {
        var size = 0;
        for (var property in this) {
          if (property[0] === prefix) ++size;
        }return size;
      },
      empty: function empty() {
        for (var property in this) {
          if (property[0] === prefix) return false;
        }return true;
      },
      each: function each(f) {
        for (var property in this) {
          if (property[0] === prefix) f(this[property], property.slice(1), this);
        }
      }
    };

    function map$1(object, f) {
      var map = new Map$1();

      // Copy constructor.
      if (object instanceof Map$1) object.each(function (value, key) {
        map.set(key, value);
      });

      // Index array by numeric index or specified key function.
      else if (Array.isArray(object)) {
          var i = -1,
              n = object.length,
              o;

          if (f == null) while (++i < n) {
            map.set(i, object[i]);
          } else while (++i < n) {
            map.set(f(o = object[i], i, object), o);
          }
        }

        // Convert object to map.
        else if (object) for (var key in object) {
            map.set(key, object[key]);
          }return map;
    }

    function Set() {}

    var proto = map$1.prototype;

    Set.prototype = set$3.prototype = {
      constructor: Set,
      has: proto.has,
      add: function add(value) {
        value += "";
        this[prefix + value] = value;
        return this;
      },
      remove: proto.remove,
      clear: proto.clear,
      values: proto.keys,
      size: proto.size,
      empty: proto.empty,
      each: proto.each
    };

    function set$3(object, f) {
      var set = new Set();

      // Copy constructor.
      if (object instanceof Set) object.each(function (value) {
        set.add(value);
      });

      // Otherwise, assume it’s an array.
      else if (object) {
          var i = -1,
              n = object.length;
          if (f == null) while (++i < n) {
            set.add(object[i]);
          } else while (++i < n) {
            set.add(f(object[i], i, object));
          }
        }

      return set;
    }

    function keys (map) {
      var keys = [];
      for (var key in map) {
        keys.push(key);
      }return keys;
    }

    function entries (map) {
      var entries = [];
      for (var key in map) {
        entries.push({ key: key, value: map[key] });
      }return entries;
    }

    var array$2 = Array.prototype;

    var map$2 = array$2.map;
    var slice$2 = array$2.slice;

    var implicit = { name: "implicit" };

    function ordinal(range) {
      var index = map$1(),
          domain = [],
          unknown = implicit;

      range = range == null ? [] : slice$2.call(range);

      function scale(d) {
        var key = d + "",
            i = index.get(key);
        if (!i) {
          if (unknown !== implicit) return unknown;
          index.set(key, i = domain.push(d));
        }
        return range[(i - 1) % range.length];
      }

      scale.domain = function (_) {
        if (!arguments.length) return domain.slice();
        domain = [], index = map$1();
        var i = -1,
            n = _.length,
            d,
            key;
        while (++i < n) {
          if (!index.has(key = (d = _[i]) + "")) index.set(key, domain.push(d));
        }return scale;
      };

      scale.range = function (_) {
        return arguments.length ? (range = slice$2.call(_), scale) : range.slice();
      };

      scale.unknown = function (_) {
        return arguments.length ? (unknown = _, scale) : unknown;
      };

      scale.copy = function () {
        return ordinal().domain(domain).range(range).unknown(unknown);
      };

      return scale;
    }

    function band() {
      var scale = ordinal().unknown(undefined),
          domain = scale.domain,
          ordinalRange = scale.range,
          range$$1 = [0, 1],
          step,
          bandwidth,
          round = false,
          paddingInner = 0,
          paddingOuter = 0,
          align = 0.5;

      delete scale.unknown;

      function rescale() {
        var n = domain().length,
            reverse = range$$1[1] < range$$1[0],
            start = range$$1[reverse - 0],
            stop = range$$1[1 - reverse];
        step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
        if (round) step = Math.floor(step);
        start += (stop - start - step * (n - paddingInner)) * align;
        bandwidth = step * (1 - paddingInner);
        if (round) start = Math.round(start), bandwidth = Math.round(bandwidth);
        var values = range(n).map(function (i) {
          return start + step * i;
        });
        return ordinalRange(reverse ? values.reverse() : values);
      }

      scale.domain = function (_) {
        return arguments.length ? (domain(_), rescale()) : domain();
      };

      scale.range = function (_) {
        return arguments.length ? (range$$1 = [+_[0], +_[1]], rescale()) : range$$1.slice();
      };

      scale.rangeRound = function (_) {
        return range$$1 = [+_[0], +_[1]], round = true, rescale();
      };

      scale.bandwidth = function () {
        return bandwidth;
      };

      scale.step = function () {
        return step;
      };

      scale.round = function (_) {
        return arguments.length ? (round = !!_, rescale()) : round;
      };

      scale.padding = function (_) {
        return arguments.length ? (paddingInner = paddingOuter = Math.max(0, Math.min(1, _)), rescale()) : paddingInner;
      };

      scale.paddingInner = function (_) {
        return arguments.length ? (paddingInner = Math.max(0, Math.min(1, _)), rescale()) : paddingInner;
      };

      scale.paddingOuter = function (_) {
        return arguments.length ? (paddingOuter = Math.max(0, Math.min(1, _)), rescale()) : paddingOuter;
      };

      scale.align = function (_) {
        return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
      };

      scale.copy = function () {
        return band().domain(domain()).range(range$$1).round(round).paddingInner(paddingInner).paddingOuter(paddingOuter).align(align);
      };

      return rescale();
    }

    function pointish(scale) {
      var copy = scale.copy;

      scale.padding = scale.paddingOuter;
      delete scale.paddingInner;
      delete scale.paddingOuter;

      scale.copy = function () {
        return pointish(copy());
      };

      return scale;
    }

    function point$1() {
      return pointish(band().paddingInner(1));
    }

    function constant$6 (x) {
      return function () {
        return x;
      };
    }

    function number$1 (x) {
      return +x;
    }

    var unit = [0, 1];

    function deinterpolateLinear(a, b) {
      return (b -= a = +a) ? function (x) {
        return (x - a) / b;
      } : constant$6(b);
    }

    function deinterpolateClamp(deinterpolate) {
      return function (a, b) {
        var d = deinterpolate(a = +a, b = +b);
        return function (x) {
          return x <= a ? 0 : x >= b ? 1 : d(x);
        };
      };
    }

    function reinterpolateClamp(reinterpolate) {
      return function (a, b) {
        var r = reinterpolate(a = +a, b = +b);
        return function (t) {
          return t <= 0 ? a : t >= 1 ? b : r(t);
        };
      };
    }

    function bimap(domain, range$$1, deinterpolate, reinterpolate) {
      var d0 = domain[0],
          d1 = domain[1],
          r0 = range$$1[0],
          r1 = range$$1[1];
      if (d1 < d0) d0 = deinterpolate(d1, d0), r0 = reinterpolate(r1, r0);else d0 = deinterpolate(d0, d1), r0 = reinterpolate(r0, r1);
      return function (x) {
        return r0(d0(x));
      };
    }

    function polymap(domain, range$$1, deinterpolate, reinterpolate) {
      var j = Math.min(domain.length, range$$1.length) - 1,
          d = new Array(j),
          r = new Array(j),
          i = -1;

      // Reverse descending domains.
      if (domain[j] < domain[0]) {
        domain = domain.slice().reverse();
        range$$1 = range$$1.slice().reverse();
      }

      while (++i < j) {
        d[i] = deinterpolate(domain[i], domain[i + 1]);
        r[i] = reinterpolate(range$$1[i], range$$1[i + 1]);
      }

      return function (x) {
        var i = bisectRight(domain, x, 1, j) - 1;
        return r[i](d[i](x));
      };
    }

    function copy(source, target) {
      return target.domain(source.domain()).range(source.range()).interpolate(source.interpolate()).clamp(source.clamp());
    }

    // deinterpolate(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
    // reinterpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding domain value x in [a,b].
    function continuous(deinterpolate, reinterpolate) {
      var domain = unit,
          range$$1 = unit,
          interpolate$$1 = value,
          clamp = false,
          piecewise$$1,
          output,
          input;

      function rescale() {
        piecewise$$1 = Math.min(domain.length, range$$1.length) > 2 ? polymap : bimap;
        output = input = null;
        return scale;
      }

      function scale(x) {
        return (output || (output = piecewise$$1(domain, range$$1, clamp ? deinterpolateClamp(deinterpolate) : deinterpolate, interpolate$$1)))(+x);
      }

      scale.invert = function (y) {
        return (input || (input = piecewise$$1(range$$1, domain, deinterpolateLinear, clamp ? reinterpolateClamp(reinterpolate) : reinterpolate)))(+y);
      };

      scale.domain = function (_) {
        return arguments.length ? (domain = map$2.call(_, number$1), rescale()) : domain.slice();
      };

      scale.range = function (_) {
        return arguments.length ? (range$$1 = slice$2.call(_), rescale()) : range$$1.slice();
      };

      scale.rangeRound = function (_) {
        return range$$1 = slice$2.call(_), interpolate$$1 = interpolateRound, rescale();
      };

      scale.clamp = function (_) {
        return arguments.length ? (clamp = !!_, rescale()) : clamp;
      };

      scale.interpolate = function (_) {
        return arguments.length ? (interpolate$$1 = _, rescale()) : interpolate$$1;
      };

      return rescale();
    }

    // Computes the decimal coefficient and exponent of the specified number x with
    // significant digits p, where x is positive and p is in [1, 21] or undefined.
    // For example, formatDecimal(1.23) returns ["123", 0].
    function formatDecimal (x, p) {
      if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
      var i,
          coefficient = x.slice(0, i);

      // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
      // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
      return [coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient, +x.slice(i + 1)];
    }

    function exponent$1 (x) {
      return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
    }

    function formatGroup (grouping, thousands) {
      return function (value, width) {
        var i = value.length,
            t = [],
            j = 0,
            g = grouping[0],
            length = 0;

        while (i > 0 && g > 0) {
          if (length + g + 1 > width) g = Math.max(1, width - length);
          t.push(value.substring(i -= g, i + g));
          if ((length += g + 1) > width) break;
          g = grouping[j = (j + 1) % grouping.length];
        }

        return t.reverse().join(thousands);
      };
    }

    function formatNumerals (numerals) {
      return function (value) {
        return value.replace(/[0-9]/g, function (i) {
          return numerals[+i];
        });
      };
    }

    // [[fill]align][sign][symbol][0][width][,][.precision][~][type]
    var re = /^(?:(.)?([<>=^]))?([+\-\( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

    function formatSpecifier(specifier) {
      return new FormatSpecifier(specifier);
    }

    formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

    function FormatSpecifier(specifier) {
      if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
      var match;
      this.fill = match[1] || " ";
      this.align = match[2] || ">";
      this.sign = match[3] || "-";
      this.symbol = match[4] || "";
      this.zero = !!match[5];
      this.width = match[6] && +match[6];
      this.comma = !!match[7];
      this.precision = match[8] && +match[8].slice(1);
      this.trim = !!match[9];
      this.type = match[10] || "";
    }

    FormatSpecifier.prototype.toString = function () {
      return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width == null ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision == null ? "" : "." + Math.max(0, this.precision | 0)) + (this.trim ? "~" : "") + this.type;
    };

    // Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
    function formatTrim (s) {
      out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
        switch (s[i]) {
          case ".":
            i0 = i1 = i;break;
          case "0":
            if (i0 === 0) i0 = i;i1 = i;break;
          default:
            if (i0 > 0) {
              if (!+s[i]) break out;i0 = 0;
            }break;
        }
      }
      return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
    }

    var prefixExponent;

    function formatPrefixAuto (x, p) {
        var d = formatDecimal(x, p);
        if (!d) return x + "";
        var coefficient = d[0],
            exponent = d[1],
            i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
            n = coefficient.length;
        return i === n ? coefficient : i > n ? coefficient + new Array(i - n + 1).join("0") : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i) : "0." + new Array(1 - i).join("0") + formatDecimal(x, Math.max(0, p + i - 1))[0]; // less than 1y!
    }

    function formatRounded (x, p) {
        var d = formatDecimal(x, p);
        if (!d) return x + "";
        var coefficient = d[0],
            exponent = d[1];
        return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1) : coefficient + new Array(exponent - coefficient.length + 2).join("0");
    }

    var formatTypes = {
      "%": function _(x, p) {
        return (x * 100).toFixed(p);
      },
      "b": function b(x) {
        return Math.round(x).toString(2);
      },
      "c": function c(x) {
        return x + "";
      },
      "d": function d(x) {
        return Math.round(x).toString(10);
      },
      "e": function e(x, p) {
        return x.toExponential(p);
      },
      "f": function f(x, p) {
        return x.toFixed(p);
      },
      "g": function g(x, p) {
        return x.toPrecision(p);
      },
      "o": function o(x) {
        return Math.round(x).toString(8);
      },
      "p": function p(x, _p) {
        return formatRounded(x * 100, _p);
      },
      "r": formatRounded,
      "s": formatPrefixAuto,
      "X": function X(x) {
        return Math.round(x).toString(16).toUpperCase();
      },
      "x": function x(_x) {
        return Math.round(_x).toString(16);
      }
    };

    function identity$3 (x) {
      return x;
    }

    var prefixes = ["y", "z", "a", "f", "p", "n", "µ", "m", "", "k", "M", "G", "T", "P", "E", "Z", "Y"];

    function formatLocale (locale) {
      var group = locale.grouping && locale.thousands ? formatGroup(locale.grouping, locale.thousands) : identity$3,
          currency = locale.currency,
          decimal = locale.decimal,
          numerals = locale.numerals ? formatNumerals(locale.numerals) : identity$3,
          percent = locale.percent || "%";

      function newFormat(specifier) {
        specifier = formatSpecifier(specifier);

        var fill = specifier.fill,
            align = specifier.align,
            sign = specifier.sign,
            symbol = specifier.symbol,
            zero = specifier.zero,
            width = specifier.width,
            comma = specifier.comma,
            precision = specifier.precision,
            trim = specifier.trim,
            type = specifier.type;

        // The "n" type is an alias for ",g".
        if (type === "n") comma = true, type = "g";

        // The "" type, and any invalid type, is an alias for ".12~g".
        else if (!formatTypes[type]) precision == null && (precision = 12), trim = true, type = "g";

        // If zero fill is specified, padding goes after sign and before digits.
        if (zero || fill === "0" && align === "=") zero = true, fill = "0", align = "=";

        // Compute the prefix and suffix.
        // For SI-prefix, the suffix is lazily computed.
        var prefix = symbol === "$" ? currency[0] : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
            suffix = symbol === "$" ? currency[1] : /[%p]/.test(type) ? percent : "";

        // What format function should we use?
        // Is this an integer type?
        // Can this type generate exponential notation?
        var formatType = formatTypes[type],
            maybeSuffix = /[defgprs%]/.test(type);

        // Set the default precision if not specified,
        // or clamp the specified precision to the supported range.
        // For significant precision, it must be in [1, 21].
        // For fixed precision, it must be in [0, 20].
        precision = precision == null ? 6 : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision)) : Math.max(0, Math.min(20, precision));

        function format(value) {
          var valuePrefix = prefix,
              valueSuffix = suffix,
              i,
              n,
              c;

          if (type === "c") {
            valueSuffix = formatType(value) + valueSuffix;
            value = "";
          } else {
            value = +value;

            // Perform the initial formatting.
            var valueNegative = value < 0;
            value = formatType(Math.abs(value), precision);

            // Trim insignificant zeros.
            if (trim) value = formatTrim(value);

            // If a negative value rounds to zero during formatting, treat as positive.
            if (valueNegative && +value === 0) valueNegative = false;

            // Compute the prefix and suffix.
            valuePrefix = (valueNegative ? sign === "(" ? sign : "-" : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
            valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

            // Break the formatted value into the integer “value” part that can be
            // grouped, and fractional or exponential “suffix” part that is not.
            if (maybeSuffix) {
              i = -1, n = value.length;
              while (++i < n) {
                if (c = value.charCodeAt(i), 48 > c || c > 57) {
                  valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                  value = value.slice(0, i);
                  break;
                }
              }
            }
          }

          // If the fill character is not "0", grouping is applied before padding.
          if (comma && !zero) value = group(value, Infinity);

          // Compute the padding.
          var length = valuePrefix.length + value.length + valueSuffix.length,
              padding = length < width ? new Array(width - length + 1).join(fill) : "";

          // If the fill character is "0", grouping is applied after padding.
          if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

          // Reconstruct the final output based on the desired alignment.
          switch (align) {
            case "<":
              value = valuePrefix + value + valueSuffix + padding;break;
            case "=":
              value = valuePrefix + padding + value + valueSuffix;break;
            case "^":
              value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length);break;
            default:
              value = padding + valuePrefix + value + valueSuffix;break;
          }

          return numerals(value);
        }

        format.toString = function () {
          return specifier + "";
        };

        return format;
      }

      function formatPrefix(specifier, value) {
        var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
            e = Math.max(-8, Math.min(8, Math.floor(exponent$1(value) / 3))) * 3,
            k = Math.pow(10, -e),
            prefix = prefixes[8 + e / 3];
        return function (value) {
          return f(k * value) + prefix;
        };
      }

      return {
        format: newFormat,
        formatPrefix: formatPrefix
      };
    }

    var locale;
    var format;
    var formatPrefix;

    defaultLocale({
      decimal: ".",
      thousands: ",",
      grouping: [3],
      currency: ["$", ""]
    });

    function defaultLocale(definition) {
      locale = formatLocale(definition);
      format = locale.format;
      formatPrefix = locale.formatPrefix;
      return locale;
    }

    function precisionFixed (step) {
      return Math.max(0, -exponent$1(Math.abs(step)));
    }

    function precisionPrefix (step, value) {
      return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent$1(value) / 3))) * 3 - exponent$1(Math.abs(step)));
    }

    function precisionRound (step, max) {
      step = Math.abs(step), max = Math.abs(max) - step;
      return Math.max(0, exponent$1(max) - exponent$1(step)) + 1;
    }

    function tickFormat (domain, count, specifier) {
      var start = domain[0],
          stop = domain[domain.length - 1],
          step = tickStep(start, stop, count == null ? 10 : count),
          precision;
      specifier = formatSpecifier(specifier == null ? ",f" : specifier);
      switch (specifier.type) {
        case "s":
          {
            var value = Math.max(Math.abs(start), Math.abs(stop));
            if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
            return formatPrefix(specifier, value);
          }
        case "":
        case "e":
        case "g":
        case "p":
        case "r":
          {
            if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
            break;
          }
        case "f":
        case "%":
          {
            if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
            break;
          }
      }
      return format(specifier);
    }

    function linearish(scale) {
      var domain = scale.domain;

      scale.ticks = function (count) {
        var d = domain();
        return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
      };

      scale.tickFormat = function (count, specifier) {
        return tickFormat(domain(), count, specifier);
      };

      scale.nice = function (count) {
        if (count == null) count = 10;

        var d = domain(),
            i0 = 0,
            i1 = d.length - 1,
            start = d[i0],
            stop = d[i1],
            step;

        if (stop < start) {
          step = start, start = stop, stop = step;
          step = i0, i0 = i1, i1 = step;
        }

        step = tickIncrement(start, stop, count);

        if (step > 0) {
          start = Math.floor(start / step) * step;
          stop = Math.ceil(stop / step) * step;
          step = tickIncrement(start, stop, count);
        } else if (step < 0) {
          start = Math.ceil(start * step) / step;
          stop = Math.floor(stop * step) / step;
          step = tickIncrement(start, stop, count);
        }

        if (step > 0) {
          d[i0] = Math.floor(start / step) * step;
          d[i1] = Math.ceil(stop / step) * step;
          domain(d);
        } else if (step < 0) {
          d[i0] = Math.ceil(start * step) / step;
          d[i1] = Math.floor(stop * step) / step;
          domain(d);
        }

        return scale;
      };

      return scale;
    }

    function linear$2() {
      var scale = continuous(deinterpolateLinear, interpolateNumber);

      scale.copy = function () {
        return copy(scale, linear$2());
      };

      return linearish(scale);
    }

    function nice (domain, interval) {
      domain = domain.slice();

      var i0 = 0,
          i1 = domain.length - 1,
          x0 = domain[i0],
          x1 = domain[i1],
          t;

      if (x1 < x0) {
        t = i0, i0 = i1, i1 = t;
        t = x0, x0 = x1, x1 = t;
      }

      domain[i0] = interval.floor(x0);
      domain[i1] = interval.ceil(x1);
      return domain;
    }

    var t0$2 = new Date(),
        t1$2 = new Date();

    function newInterval(floori, offseti, count, field) {

      function interval(date) {
        return floori(date = new Date(+date)), date;
      }

      interval.floor = interval;

      interval.ceil = function (date) {
        return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
      };

      interval.round = function (date) {
        var d0 = interval(date),
            d1 = interval.ceil(date);
        return date - d0 < d1 - date ? d0 : d1;
      };

      interval.offset = function (date, step) {
        return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
      };

      interval.range = function (start, stop, step) {
        var range = [],
            previous;
        start = interval.ceil(start);
        step = step == null ? 1 : Math.floor(step);
        if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
        do {
          range.push(previous = new Date(+start)), offseti(start, step), floori(start);
        } while (previous < start && start < stop);
        return range;
      };

      interval.filter = function (test) {
        return newInterval(function (date) {
          if (date >= date) while (floori(date), !test(date)) {
            date.setTime(date - 1);
          }
        }, function (date, step) {
          if (date >= date) {
            if (step < 0) while (++step <= 0) {
              while (offseti(date, -1), !test(date)) {} // eslint-disable-line no-empty
            } else while (--step >= 0) {
              while (offseti(date, +1), !test(date)) {} // eslint-disable-line no-empty
            }
          }
        });
      };

      if (count) {
        interval.count = function (start, end) {
          t0$2.setTime(+start), t1$2.setTime(+end);
          floori(t0$2), floori(t1$2);
          return Math.floor(count(t0$2, t1$2));
        };

        interval.every = function (step) {
          step = Math.floor(step);
          return !isFinite(step) || !(step > 0) ? null : !(step > 1) ? interval : interval.filter(field ? function (d) {
            return field(d) % step === 0;
          } : function (d) {
            return interval.count(0, d) % step === 0;
          });
        };
      }

      return interval;
    }

    var millisecond = newInterval(function () {
      // noop
    }, function (date, step) {
      date.setTime(+date + step);
    }, function (start, end) {
      return end - start;
    });

    // An optimized implementation for this simple case.
    millisecond.every = function (k) {
      k = Math.floor(k);
      if (!isFinite(k) || !(k > 0)) return null;
      if (!(k > 1)) return millisecond;
      return newInterval(function (date) {
        date.setTime(Math.floor(date / k) * k);
      }, function (date, step) {
        date.setTime(+date + step * k);
      }, function (start, end) {
        return (end - start) / k;
      });
    };
    var milliseconds = millisecond.range;

    var durationSecond = 1e3;
    var durationMinute = 6e4;
    var durationHour = 36e5;
    var durationDay = 864e5;
    var durationWeek = 6048e5;

    var second = newInterval(function (date) {
      date.setTime(Math.floor(date / durationSecond) * durationSecond);
    }, function (date, step) {
      date.setTime(+date + step * durationSecond);
    }, function (start, end) {
      return (end - start) / durationSecond;
    }, function (date) {
      return date.getUTCSeconds();
    });
    var seconds = second.range;

    var minute = newInterval(function (date) {
      date.setTime(Math.floor(date / durationMinute) * durationMinute);
    }, function (date, step) {
      date.setTime(+date + step * durationMinute);
    }, function (start, end) {
      return (end - start) / durationMinute;
    }, function (date) {
      return date.getMinutes();
    });
    var minutes = minute.range;

    var hour = newInterval(function (date) {
      var offset = date.getTimezoneOffset() * durationMinute % durationHour;
      if (offset < 0) offset += durationHour;
      date.setTime(Math.floor((+date - offset) / durationHour) * durationHour + offset);
    }, function (date, step) {
      date.setTime(+date + step * durationHour);
    }, function (start, end) {
      return (end - start) / durationHour;
    }, function (date) {
      return date.getHours();
    });
    var hours = hour.range;

    var day = newInterval(function (date) {
      date.setHours(0, 0, 0, 0);
    }, function (date, step) {
      date.setDate(date.getDate() + step);
    }, function (start, end) {
      return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay;
    }, function (date) {
      return date.getDate() - 1;
    });
    var days = day.range;

    function weekday(i) {
      return newInterval(function (date) {
        date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
        date.setHours(0, 0, 0, 0);
      }, function (date, step) {
        date.setDate(date.getDate() + step * 7);
      }, function (start, end) {
        return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
      });
    }

    var sunday = weekday(0);
    var monday = weekday(1);
    var tuesday = weekday(2);
    var wednesday = weekday(3);
    var thursday = weekday(4);
    var friday = weekday(5);
    var saturday = weekday(6);

    var sundays = sunday.range;
    var mondays = monday.range;
    var thursdays = thursday.range;

    var month = newInterval(function (date) {
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
    }, function (date, step) {
      date.setMonth(date.getMonth() + step);
    }, function (start, end) {
      return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
    }, function (date) {
      return date.getMonth();
    });
    var months = month.range;

    var year = newInterval(function (date) {
      date.setMonth(0, 1);
      date.setHours(0, 0, 0, 0);
    }, function (date, step) {
      date.setFullYear(date.getFullYear() + step);
    }, function (start, end) {
      return end.getFullYear() - start.getFullYear();
    }, function (date) {
      return date.getFullYear();
    });

    // An optimized implementation for this simple case.
    year.every = function (k) {
      return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function (date) {
        date.setFullYear(Math.floor(date.getFullYear() / k) * k);
        date.setMonth(0, 1);
        date.setHours(0, 0, 0, 0);
      }, function (date, step) {
        date.setFullYear(date.getFullYear() + step * k);
      });
    };
    var years = year.range;

    var utcMinute = newInterval(function (date) {
      date.setUTCSeconds(0, 0);
    }, function (date, step) {
      date.setTime(+date + step * durationMinute);
    }, function (start, end) {
      return (end - start) / durationMinute;
    }, function (date) {
      return date.getUTCMinutes();
    });
    var utcMinutes = utcMinute.range;

    var utcHour = newInterval(function (date) {
      date.setUTCMinutes(0, 0, 0);
    }, function (date, step) {
      date.setTime(+date + step * durationHour);
    }, function (start, end) {
      return (end - start) / durationHour;
    }, function (date) {
      return date.getUTCHours();
    });
    var utcHours = utcHour.range;

    var utcDay = newInterval(function (date) {
      date.setUTCHours(0, 0, 0, 0);
    }, function (date, step) {
      date.setUTCDate(date.getUTCDate() + step);
    }, function (start, end) {
      return (end - start) / durationDay;
    }, function (date) {
      return date.getUTCDate() - 1;
    });
    var utcDays = utcDay.range;

    function utcWeekday(i) {
      return newInterval(function (date) {
        date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
        date.setUTCHours(0, 0, 0, 0);
      }, function (date, step) {
        date.setUTCDate(date.getUTCDate() + step * 7);
      }, function (start, end) {
        return (end - start) / durationWeek;
      });
    }

    var utcSunday = utcWeekday(0);
    var utcMonday = utcWeekday(1);
    var utcTuesday = utcWeekday(2);
    var utcWednesday = utcWeekday(3);
    var utcThursday = utcWeekday(4);
    var utcFriday = utcWeekday(5);
    var utcSaturday = utcWeekday(6);

    var utcSundays = utcSunday.range;
    var utcMondays = utcMonday.range;
    var utcThursdays = utcThursday.range;

    var utcMonth = newInterval(function (date) {
      date.setUTCDate(1);
      date.setUTCHours(0, 0, 0, 0);
    }, function (date, step) {
      date.setUTCMonth(date.getUTCMonth() + step);
    }, function (start, end) {
      return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
    }, function (date) {
      return date.getUTCMonth();
    });
    var utcMonths = utcMonth.range;

    var utcYear = newInterval(function (date) {
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
    }, function (date, step) {
      date.setUTCFullYear(date.getUTCFullYear() + step);
    }, function (start, end) {
      return end.getUTCFullYear() - start.getUTCFullYear();
    }, function (date) {
      return date.getUTCFullYear();
    });

    // An optimized implementation for this simple case.
    utcYear.every = function (k) {
      return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function (date) {
        date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
        date.setUTCMonth(0, 1);
        date.setUTCHours(0, 0, 0, 0);
      }, function (date, step) {
        date.setUTCFullYear(date.getUTCFullYear() + step * k);
      });
    };
    var utcYears = utcYear.range;

    function localDate(d) {
      if (0 <= d.y && d.y < 100) {
        var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
        date.setFullYear(d.y);
        return date;
      }
      return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
    }

    function utcDate(d) {
      if (0 <= d.y && d.y < 100) {
        var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
        date.setUTCFullYear(d.y);
        return date;
      }
      return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
    }

    function newYear(y) {
      return { y: y, m: 0, d: 1, H: 0, M: 0, S: 0, L: 0 };
    }

    function formatLocale$1(locale) {
      var locale_dateTime = locale.dateTime,
          locale_date = locale.date,
          locale_time = locale.time,
          locale_periods = locale.periods,
          locale_weekdays = locale.days,
          locale_shortWeekdays = locale.shortDays,
          locale_months = locale.months,
          locale_shortMonths = locale.shortMonths;

      var periodRe = formatRe(locale_periods),
          periodLookup = formatLookup(locale_periods),
          weekdayRe = formatRe(locale_weekdays),
          weekdayLookup = formatLookup(locale_weekdays),
          shortWeekdayRe = formatRe(locale_shortWeekdays),
          shortWeekdayLookup = formatLookup(locale_shortWeekdays),
          monthRe = formatRe(locale_months),
          monthLookup = formatLookup(locale_months),
          shortMonthRe = formatRe(locale_shortMonths),
          shortMonthLookup = formatLookup(locale_shortMonths);

      var formats = {
        "a": formatShortWeekday,
        "A": formatWeekday,
        "b": formatShortMonth,
        "B": formatMonth,
        "c": null,
        "d": formatDayOfMonth,
        "e": formatDayOfMonth,
        "f": formatMicroseconds,
        "H": formatHour24,
        "I": formatHour12,
        "j": formatDayOfYear,
        "L": formatMilliseconds,
        "m": formatMonthNumber,
        "M": formatMinutes,
        "p": formatPeriod,
        "Q": formatUnixTimestamp,
        "s": formatUnixTimestampSeconds,
        "S": formatSeconds,
        "u": formatWeekdayNumberMonday,
        "U": formatWeekNumberSunday,
        "V": formatWeekNumberISO,
        "w": formatWeekdayNumberSunday,
        "W": formatWeekNumberMonday,
        "x": null,
        "X": null,
        "y": formatYear,
        "Y": formatFullYear,
        "Z": formatZone,
        "%": formatLiteralPercent
      };

      var utcFormats = {
        "a": formatUTCShortWeekday,
        "A": formatUTCWeekday,
        "b": formatUTCShortMonth,
        "B": formatUTCMonth,
        "c": null,
        "d": formatUTCDayOfMonth,
        "e": formatUTCDayOfMonth,
        "f": formatUTCMicroseconds,
        "H": formatUTCHour24,
        "I": formatUTCHour12,
        "j": formatUTCDayOfYear,
        "L": formatUTCMilliseconds,
        "m": formatUTCMonthNumber,
        "M": formatUTCMinutes,
        "p": formatUTCPeriod,
        "Q": formatUnixTimestamp,
        "s": formatUnixTimestampSeconds,
        "S": formatUTCSeconds,
        "u": formatUTCWeekdayNumberMonday,
        "U": formatUTCWeekNumberSunday,
        "V": formatUTCWeekNumberISO,
        "w": formatUTCWeekdayNumberSunday,
        "W": formatUTCWeekNumberMonday,
        "x": null,
        "X": null,
        "y": formatUTCYear,
        "Y": formatUTCFullYear,
        "Z": formatUTCZone,
        "%": formatLiteralPercent
      };

      var parses = {
        "a": parseShortWeekday,
        "A": parseWeekday,
        "b": parseShortMonth,
        "B": parseMonth,
        "c": parseLocaleDateTime,
        "d": parseDayOfMonth,
        "e": parseDayOfMonth,
        "f": parseMicroseconds,
        "H": parseHour24,
        "I": parseHour24,
        "j": parseDayOfYear,
        "L": parseMilliseconds,
        "m": parseMonthNumber,
        "M": parseMinutes,
        "p": parsePeriod,
        "Q": parseUnixTimestamp,
        "s": parseUnixTimestampSeconds,
        "S": parseSeconds,
        "u": parseWeekdayNumberMonday,
        "U": parseWeekNumberSunday,
        "V": parseWeekNumberISO,
        "w": parseWeekdayNumberSunday,
        "W": parseWeekNumberMonday,
        "x": parseLocaleDate,
        "X": parseLocaleTime,
        "y": parseYear,
        "Y": parseFullYear,
        "Z": parseZone,
        "%": parseLiteralPercent
      };

      // These recursive directive definitions must be deferred.
      formats.x = newFormat(locale_date, formats);
      formats.X = newFormat(locale_time, formats);
      formats.c = newFormat(locale_dateTime, formats);
      utcFormats.x = newFormat(locale_date, utcFormats);
      utcFormats.X = newFormat(locale_time, utcFormats);
      utcFormats.c = newFormat(locale_dateTime, utcFormats);

      function newFormat(specifier, formats) {
        return function (date) {
          var string = [],
              i = -1,
              j = 0,
              n = specifier.length,
              c,
              pad,
              format;

          if (!(date instanceof Date)) date = new Date(+date);

          while (++i < n) {
            if (specifier.charCodeAt(i) === 37) {
              string.push(specifier.slice(j, i));
              if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);else pad = c === "e" ? " " : "0";
              if (format = formats[c]) c = format(date, pad);
              string.push(c);
              j = i + 1;
            }
          }

          string.push(specifier.slice(j, i));
          return string.join("");
        };
      }

      function newParse(specifier, newDate) {
        return function (string) {
          var d = newYear(1900),
              i = parseSpecifier(d, specifier, string += "", 0),
              week,
              day$$1;
          if (i != string.length) return null;

          // If a UNIX timestamp is specified, return it.
          if ("Q" in d) return new Date(d.Q);

          // The am-pm flag is 0 for AM, and 1 for PM.
          if ("p" in d) d.H = d.H % 12 + d.p * 12;

          // Convert day-of-week and week-of-year to day-of-year.
          if ("V" in d) {
            if (d.V < 1 || d.V > 53) return null;
            if (!("w" in d)) d.w = 1;
            if ("Z" in d) {
              week = utcDate(newYear(d.y)), day$$1 = week.getUTCDay();
              week = day$$1 > 4 || day$$1 === 0 ? utcMonday.ceil(week) : utcMonday(week);
              week = utcDay.offset(week, (d.V - 1) * 7);
              d.y = week.getUTCFullYear();
              d.m = week.getUTCMonth();
              d.d = week.getUTCDate() + (d.w + 6) % 7;
            } else {
              week = newDate(newYear(d.y)), day$$1 = week.getDay();
              week = day$$1 > 4 || day$$1 === 0 ? monday.ceil(week) : monday(week);
              week = day.offset(week, (d.V - 1) * 7);
              d.y = week.getFullYear();
              d.m = week.getMonth();
              d.d = week.getDate() + (d.w + 6) % 7;
            }
          } else if ("W" in d || "U" in d) {
            if (!("w" in d)) d.w = "u" in d ? d.u % 7 : "W" in d ? 1 : 0;
            day$$1 = "Z" in d ? utcDate(newYear(d.y)).getUTCDay() : newDate(newYear(d.y)).getDay();
            d.m = 0;
            d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day$$1 + 5) % 7 : d.w + d.U * 7 - (day$$1 + 6) % 7;
          }

          // If a time zone is specified, all fields are interpreted as UTC and then
          // offset according to the specified time zone.
          if ("Z" in d) {
            d.H += d.Z / 100 | 0;
            d.M += d.Z % 100;
            return utcDate(d);
          }

          // Otherwise, all fields are in local time.
          return newDate(d);
        };
      }

      function parseSpecifier(d, specifier, string, j) {
        var i = 0,
            n = specifier.length,
            m = string.length,
            c,
            parse;

        while (i < n) {
          if (j >= m) return -1;
          c = specifier.charCodeAt(i++);
          if (c === 37) {
            c = specifier.charAt(i++);
            parse = parses[c in pads ? specifier.charAt(i++) : c];
            if (!parse || (j = parse(d, string, j)) < 0) return -1;
          } else if (c != string.charCodeAt(j++)) {
            return -1;
          }
        }

        return j;
      }

      function parsePeriod(d, string, i) {
        var n = periodRe.exec(string.slice(i));
        return n ? (d.p = periodLookup[n[0].toLowerCase()], i + n[0].length) : -1;
      }

      function parseShortWeekday(d, string, i) {
        var n = shortWeekdayRe.exec(string.slice(i));
        return n ? (d.w = shortWeekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
      }

      function parseWeekday(d, string, i) {
        var n = weekdayRe.exec(string.slice(i));
        return n ? (d.w = weekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
      }

      function parseShortMonth(d, string, i) {
        var n = shortMonthRe.exec(string.slice(i));
        return n ? (d.m = shortMonthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
      }

      function parseMonth(d, string, i) {
        var n = monthRe.exec(string.slice(i));
        return n ? (d.m = monthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
      }

      function parseLocaleDateTime(d, string, i) {
        return parseSpecifier(d, locale_dateTime, string, i);
      }

      function parseLocaleDate(d, string, i) {
        return parseSpecifier(d, locale_date, string, i);
      }

      function parseLocaleTime(d, string, i) {
        return parseSpecifier(d, locale_time, string, i);
      }

      function formatShortWeekday(d) {
        return locale_shortWeekdays[d.getDay()];
      }

      function formatWeekday(d) {
        return locale_weekdays[d.getDay()];
      }

      function formatShortMonth(d) {
        return locale_shortMonths[d.getMonth()];
      }

      function formatMonth(d) {
        return locale_months[d.getMonth()];
      }

      function formatPeriod(d) {
        return locale_periods[+(d.getHours() >= 12)];
      }

      function formatUTCShortWeekday(d) {
        return locale_shortWeekdays[d.getUTCDay()];
      }

      function formatUTCWeekday(d) {
        return locale_weekdays[d.getUTCDay()];
      }

      function formatUTCShortMonth(d) {
        return locale_shortMonths[d.getUTCMonth()];
      }

      function formatUTCMonth(d) {
        return locale_months[d.getUTCMonth()];
      }

      function formatUTCPeriod(d) {
        return locale_periods[+(d.getUTCHours() >= 12)];
      }

      return {
        format: function format(specifier) {
          var f = newFormat(specifier += "", formats);
          f.toString = function () {
            return specifier;
          };
          return f;
        },
        parse: function parse(specifier) {
          var p = newParse(specifier += "", localDate);
          p.toString = function () {
            return specifier;
          };
          return p;
        },
        utcFormat: function utcFormat(specifier) {
          var f = newFormat(specifier += "", utcFormats);
          f.toString = function () {
            return specifier;
          };
          return f;
        },
        utcParse: function utcParse(specifier) {
          var p = newParse(specifier, utcDate);
          p.toString = function () {
            return specifier;
          };
          return p;
        }
      };
    }

    var pads = { "-": "", "_": " ", "0": "0" },
        numberRe = /^\s*\d+/,
        // note: ignores next directive
    percentRe = /^%/,
        requoteRe = /[\\^$*+?|[\]().{}]/g;

    function pad(value, fill, width) {
      var sign = value < 0 ? "-" : "",
          string = (sign ? -value : value) + "",
          length = string.length;
      return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
    }

    function requote(s) {
      return s.replace(requoteRe, "\\$&");
    }

    function formatRe(names) {
      return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
    }

    function formatLookup(names) {
      var map = {},
          i = -1,
          n = names.length;
      while (++i < n) {
        map[names[i].toLowerCase()] = i;
      }return map;
    }

    function parseWeekdayNumberSunday(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 1));
      return n ? (d.w = +n[0], i + n[0].length) : -1;
    }

    function parseWeekdayNumberMonday(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 1));
      return n ? (d.u = +n[0], i + n[0].length) : -1;
    }

    function parseWeekNumberSunday(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.U = +n[0], i + n[0].length) : -1;
    }

    function parseWeekNumberISO(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.V = +n[0], i + n[0].length) : -1;
    }

    function parseWeekNumberMonday(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.W = +n[0], i + n[0].length) : -1;
    }

    function parseFullYear(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 4));
      return n ? (d.y = +n[0], i + n[0].length) : -1;
    }

    function parseYear(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
    }

    function parseZone(d, string, i) {
      var n = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(string.slice(i, i + 6));
      return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
    }

    function parseMonthNumber(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
    }

    function parseDayOfMonth(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.d = +n[0], i + n[0].length) : -1;
    }

    function parseDayOfYear(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 3));
      return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
    }

    function parseHour24(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.H = +n[0], i + n[0].length) : -1;
    }

    function parseMinutes(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.M = +n[0], i + n[0].length) : -1;
    }

    function parseSeconds(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.S = +n[0], i + n[0].length) : -1;
    }

    function parseMilliseconds(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 3));
      return n ? (d.L = +n[0], i + n[0].length) : -1;
    }

    function parseMicroseconds(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 6));
      return n ? (d.L = Math.floor(n[0] / 1000), i + n[0].length) : -1;
    }

    function parseLiteralPercent(d, string, i) {
      var n = percentRe.exec(string.slice(i, i + 1));
      return n ? i + n[0].length : -1;
    }

    function parseUnixTimestamp(d, string, i) {
      var n = numberRe.exec(string.slice(i));
      return n ? (d.Q = +n[0], i + n[0].length) : -1;
    }

    function parseUnixTimestampSeconds(d, string, i) {
      var n = numberRe.exec(string.slice(i));
      return n ? (d.Q = +n[0] * 1000, i + n[0].length) : -1;
    }

    function formatDayOfMonth(d, p) {
      return pad(d.getDate(), p, 2);
    }

    function formatHour24(d, p) {
      return pad(d.getHours(), p, 2);
    }

    function formatHour12(d, p) {
      return pad(d.getHours() % 12 || 12, p, 2);
    }

    function formatDayOfYear(d, p) {
      return pad(1 + day.count(year(d), d), p, 3);
    }

    function formatMilliseconds(d, p) {
      return pad(d.getMilliseconds(), p, 3);
    }

    function formatMicroseconds(d, p) {
      return formatMilliseconds(d, p) + "000";
    }

    function formatMonthNumber(d, p) {
      return pad(d.getMonth() + 1, p, 2);
    }

    function formatMinutes(d, p) {
      return pad(d.getMinutes(), p, 2);
    }

    function formatSeconds(d, p) {
      return pad(d.getSeconds(), p, 2);
    }

    function formatWeekdayNumberMonday(d) {
      var day$$1 = d.getDay();
      return day$$1 === 0 ? 7 : day$$1;
    }

    function formatWeekNumberSunday(d, p) {
      return pad(sunday.count(year(d), d), p, 2);
    }

    function formatWeekNumberISO(d, p) {
      var day$$1 = d.getDay();
      d = day$$1 >= 4 || day$$1 === 0 ? thursday(d) : thursday.ceil(d);
      return pad(thursday.count(year(d), d) + (year(d).getDay() === 4), p, 2);
    }

    function formatWeekdayNumberSunday(d) {
      return d.getDay();
    }

    function formatWeekNumberMonday(d, p) {
      return pad(monday.count(year(d), d), p, 2);
    }

    function formatYear(d, p) {
      return pad(d.getFullYear() % 100, p, 2);
    }

    function formatFullYear(d, p) {
      return pad(d.getFullYear() % 10000, p, 4);
    }

    function formatZone(d) {
      var z = d.getTimezoneOffset();
      return (z > 0 ? "-" : (z *= -1, "+")) + pad(z / 60 | 0, "0", 2) + pad(z % 60, "0", 2);
    }

    function formatUTCDayOfMonth(d, p) {
      return pad(d.getUTCDate(), p, 2);
    }

    function formatUTCHour24(d, p) {
      return pad(d.getUTCHours(), p, 2);
    }

    function formatUTCHour12(d, p) {
      return pad(d.getUTCHours() % 12 || 12, p, 2);
    }

    function formatUTCDayOfYear(d, p) {
      return pad(1 + utcDay.count(utcYear(d), d), p, 3);
    }

    function formatUTCMilliseconds(d, p) {
      return pad(d.getUTCMilliseconds(), p, 3);
    }

    function formatUTCMicroseconds(d, p) {
      return formatUTCMilliseconds(d, p) + "000";
    }

    function formatUTCMonthNumber(d, p) {
      return pad(d.getUTCMonth() + 1, p, 2);
    }

    function formatUTCMinutes(d, p) {
      return pad(d.getUTCMinutes(), p, 2);
    }

    function formatUTCSeconds(d, p) {
      return pad(d.getUTCSeconds(), p, 2);
    }

    function formatUTCWeekdayNumberMonday(d) {
      var dow = d.getUTCDay();
      return dow === 0 ? 7 : dow;
    }

    function formatUTCWeekNumberSunday(d, p) {
      return pad(utcSunday.count(utcYear(d), d), p, 2);
    }

    function formatUTCWeekNumberISO(d, p) {
      var day$$1 = d.getUTCDay();
      d = day$$1 >= 4 || day$$1 === 0 ? utcThursday(d) : utcThursday.ceil(d);
      return pad(utcThursday.count(utcYear(d), d) + (utcYear(d).getUTCDay() === 4), p, 2);
    }

    function formatUTCWeekdayNumberSunday(d) {
      return d.getUTCDay();
    }

    function formatUTCWeekNumberMonday(d, p) {
      return pad(utcMonday.count(utcYear(d), d), p, 2);
    }

    function formatUTCYear(d, p) {
      return pad(d.getUTCFullYear() % 100, p, 2);
    }

    function formatUTCFullYear(d, p) {
      return pad(d.getUTCFullYear() % 10000, p, 4);
    }

    function formatUTCZone() {
      return "+0000";
    }

    function formatLiteralPercent() {
      return "%";
    }

    function formatUnixTimestamp(d) {
      return +d;
    }

    function formatUnixTimestampSeconds(d) {
      return Math.floor(+d / 1000);
    }

    var locale$1;
    var timeFormat;
    var timeParse;
    var utcFormat;
    var utcParse;

    defaultLocale$1({
      dateTime: "%x, %X",
      date: "%-m/%-d/%Y",
      time: "%-I:%M:%S %p",
      periods: ["AM", "PM"],
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    });

    function defaultLocale$1(definition) {
      locale$1 = formatLocale$1(definition);
      timeFormat = locale$1.format;
      timeParse = locale$1.parse;
      utcFormat = locale$1.utcFormat;
      utcParse = locale$1.utcParse;
      return locale$1;
    }

    var isoSpecifier = "%Y-%m-%dT%H:%M:%S.%LZ";

    function formatIsoNative(date) {
        return date.toISOString();
    }

    var formatIso = Date.prototype.toISOString ? formatIsoNative : utcFormat(isoSpecifier);

    function parseIsoNative(string) {
      var date = new Date(string);
      return isNaN(date) ? null : date;
    }

    var parseIso = +new Date("2000-01-01T00:00:00.000Z") ? parseIsoNative : utcParse(isoSpecifier);

    var durationSecond$1 = 1000,
        durationMinute$1 = durationSecond$1 * 60,
        durationHour$1 = durationMinute$1 * 60,
        durationDay$1 = durationHour$1 * 24,
        durationWeek$1 = durationDay$1 * 7,
        durationMonth = durationDay$1 * 30,
        durationYear = durationDay$1 * 365;

    function date$1(t) {
      return new Date(t);
    }

    function number$2(t) {
      return t instanceof Date ? +t : +new Date(+t);
    }

    function calendar(year$$1, month$$1, week, day$$1, hour$$1, minute$$1, second$$1, millisecond$$1, format) {
      var scale = continuous(deinterpolateLinear, interpolateNumber),
          invert = scale.invert,
          domain = scale.domain;

      var formatMillisecond = format(".%L"),
          formatSecond = format(":%S"),
          formatMinute = format("%I:%M"),
          formatHour = format("%I %p"),
          formatDay = format("%a %d"),
          formatWeek = format("%b %d"),
          formatMonth = format("%B"),
          formatYear = format("%Y");

      var tickIntervals = [[second$$1, 1, durationSecond$1], [second$$1, 5, 5 * durationSecond$1], [second$$1, 15, 15 * durationSecond$1], [second$$1, 30, 30 * durationSecond$1], [minute$$1, 1, durationMinute$1], [minute$$1, 5, 5 * durationMinute$1], [minute$$1, 15, 15 * durationMinute$1], [minute$$1, 30, 30 * durationMinute$1], [hour$$1, 1, durationHour$1], [hour$$1, 3, 3 * durationHour$1], [hour$$1, 6, 6 * durationHour$1], [hour$$1, 12, 12 * durationHour$1], [day$$1, 1, durationDay$1], [day$$1, 2, 2 * durationDay$1], [week, 1, durationWeek$1], [month$$1, 1, durationMonth], [month$$1, 3, 3 * durationMonth], [year$$1, 1, durationYear]];

      function tickFormat(date$$1) {
        return (second$$1(date$$1) < date$$1 ? formatMillisecond : minute$$1(date$$1) < date$$1 ? formatSecond : hour$$1(date$$1) < date$$1 ? formatMinute : day$$1(date$$1) < date$$1 ? formatHour : month$$1(date$$1) < date$$1 ? week(date$$1) < date$$1 ? formatDay : formatWeek : year$$1(date$$1) < date$$1 ? formatMonth : formatYear)(date$$1);
      }

      function tickInterval(interval, start, stop, step) {
        if (interval == null) interval = 10;

        // If a desired tick count is specified, pick a reasonable tick interval
        // based on the extent of the domain and a rough estimate of tick size.
        // Otherwise, assume interval is already a time interval and use it.
        if (typeof interval === "number") {
          var target = Math.abs(stop - start) / interval,
              i = bisector(function (i) {
            return i[2];
          }).right(tickIntervals, target);
          if (i === tickIntervals.length) {
            step = tickStep(start / durationYear, stop / durationYear, interval);
            interval = year$$1;
          } else if (i) {
            i = tickIntervals[target / tickIntervals[i - 1][2] < tickIntervals[i][2] / target ? i - 1 : i];
            step = i[1];
            interval = i[0];
          } else {
            step = Math.max(tickStep(start, stop, interval), 1);
            interval = millisecond$$1;
          }
        }

        return step == null ? interval : interval.every(step);
      }

      scale.invert = function (y) {
        return new Date(invert(y));
      };

      scale.domain = function (_) {
        return arguments.length ? domain(map$2.call(_, number$2)) : domain().map(date$1);
      };

      scale.ticks = function (interval, step) {
        var d = domain(),
            t0 = d[0],
            t1 = d[d.length - 1],
            r = t1 < t0,
            t;
        if (r) t = t0, t0 = t1, t1 = t;
        t = tickInterval(interval, t0, t1, step);
        t = t ? t.range(t0, t1 + 1) : []; // inclusive stop
        return r ? t.reverse() : t;
      };

      scale.tickFormat = function (count, specifier) {
        return specifier == null ? tickFormat : format(specifier);
      };

      scale.nice = function (interval, step) {
        var d = domain();
        return (interval = tickInterval(interval, d[0], d[d.length - 1], step)) ? domain(nice(d, interval)) : scale;
      };

      scale.copy = function () {
        return copy(scale, calendar(year$$1, month$$1, week, day$$1, hour$$1, minute$$1, second$$1, millisecond$$1, format));
      };

      return scale;
    }

    function scaleTime () {
      return calendar(year, month, sunday, day, hour, minute, second, millisecond, timeFormat).domain([new Date(2000, 0, 1), new Date(2000, 0, 2)]);
    }

    /** adjusts an axis' default range [h()+1, 1] if a NullValueSeparator is set */
    var getRange = function getRange(config) {
      var h = config.height - config.margin.top - config.margin.bottom;

      if (config.nullValueSeparator == 'bottom') {
        return [h + 1 - config.nullValueSeparatorPadding.bottom - config.nullValueSeparatorPadding.top, 1];
      } else if (config.nullValueSeparator == 'top') {
        return [h + 1, 1 + config.nullValueSeparatorPadding.bottom + config.nullValueSeparatorPadding.top];
      }
      return [h + 1, 1];
    };

    var autoscale = function autoscale(config, pc, xscale, ctx) {
      return function () {
        // yscale
        var defaultScales = {
          date: function date(k) {
            var _extent = extent(config.data, function (d) {
              return d[k] ? d[k].getTime() : null;
            });
            // special case if single value
            if (_extent[0] === _extent[1]) {
              return point$1().domain(_extent).range(getRange(config));
            }
            if (config.flipAxes.includes(k)) {
              _extent = _extent.map(function (val) {
                return tempDate.unshift(val);
              });
            }
            return scaleTime().domain(_extent).range(getRange(config));
          },
          number: function number(k) {
            var _extent = extent(config.data, function (d) {
              return +d[k];
            });
            // special case if single value
            if (_extent[0] === _extent[1]) {
              return point$1().domain(_extent).range(getRange(config));
            }
            if (config.flipAxes.includes(k)) {
              _extent = _extent.map(function (val) {
                return tempDate.unshift(val);
              });
            }
            return linear$2().domain(_extent).range(getRange(config));
          },
          string: function string(k) {
            var counts = {},
                domain = [];
            // Let's get the count for each value so that we can sort the domain based
            // on the number of items for each value.
            config.data.map(function (p) {
              if (p[k] === undefined && config.nullValueSeparator !== 'undefined') {
                return null; // null values will be drawn beyond the horizontal null value separator!
              }
              if (counts[p[k]] === undefined) {
                counts[p[k]] = 1;
              } else {
                counts[p[k]] = counts[p[k]] + 1;
              }
            });
            if (config.flipAxes.includes(k)) {
              domain = Object.getOwnPropertyNames(counts).sort();
            } else {
              var tempArr = Object.getOwnPropertyNames(counts).sort();
              for (var i = 0; i < Object.getOwnPropertyNames(counts).length; i++) {
                domain.push(tempArr.pop());
              }
            }

            //need to create an ordinal scale for categorical data
            var categoricalRange = [];
            if (domain.length === 1) {
              //edge case
              domain = [' ', domain[0], ' '];
            }
            var addBy = getRange(config)[0] / (domain.length - 1);
            for (var j = 0; j < domain.length; j++) {
              if (categoricalRange.length === 0) {
                categoricalRange.push(0);
                continue;
              }
              categoricalRange.push(categoricalRange[j - 1] + addBy);
            }
            return ordinal().domain(domain).range(categoricalRange);
          }
        };
        Object.keys(config.dimensions).forEach(function (k) {
          if (config.dimensions[k].yscale === undefined || config.dimensions[k].yscale === null) {
            config.dimensions[k].yscale = defaultScales[config.dimensions[k].type](k);
          }
        });

        // xscale
        // add padding for d3 >= v4 default 0.2
        xscale.range([0, w(config)]).padding(0.2);

        // Retina display, etc.
        var devicePixelRatio = window.devicePixelRatio || 1;

        // canvas sizes
        pc.selection.selectAll('canvas').style('margin-top', config.margin.top + 'px').style('margin-left', config.margin.left + 'px').style('width', w(config) + 2 + 'px').style('height', h(config) + 2 + 'px').attr('width', (w(config) + 2) * devicePixelRatio).attr('height', (h(config) + 2) * devicePixelRatio);
        // default styles, needs to be set when canvas width changes
        ctx.foreground.strokeStyle = config.color;
        ctx.foreground.lineWidth = config.lineWidth;
        ctx.foreground.globalCompositeOperation = config.composite;
        ctx.foreground.globalAlpha = config.alpha;
        ctx.foreground.scale(devicePixelRatio, devicePixelRatio);
        ctx.brushed.strokeStyle = config.brushedColor;
        ctx.brushed.lineWidth = config.lineWidth;
        ctx.brushed.globalCompositeOperation = config.composite;
        ctx.brushed.globalAlpha = config.alpha;
        ctx.brushed.scale(devicePixelRatio, devicePixelRatio);
        ctx.highlight.lineWidth = config.highlightedLineWidth;
        ctx.highlight.scale(devicePixelRatio, devicePixelRatio);
        ctx.marked.lineWidth = config.markedLineWidth;
        ctx.marked.shadowColor = config.markedShadowColor;
        ctx.marked.shadowBlur = config.markedShadowBlur;
        ctx.marked.scale(devicePixelRatio, devicePixelRatio);

        return this;
      };
    };

    var brushable = function brushable(config, pc, flags) {
      return function () {
        if (!pc.g()) {
          pc.createAxes();
        }

        var g = pc.g();

        // Add and store a brush for each axis.
        g.append('svg:g').attr('class', 'brush').each(function (d) {
          if (config.dimensions[d] !== undefined) {
            config.dimensions[d]['brush'] = brushY(select(this)).extent([[-15, 0], [15, config.dimensions[d].yscale.range()[0]]]);
            select(this).call(config.dimensions[d]['brush'].on('start', function () {
              if (event.sourceEvent !== null && !event.sourceEvent.ctrlKey) {
                pc.brushReset();
              }
            }).on('brush', function () {
              if (!event.sourceEvent.ctrlKey) {
                pc.brush();
              }
            }).on('end', function () {
              // save brush selection is ctrl key is held
              // store important brush information and
              // the html element of the selection,
              // to make a dummy selection element
              if (event.sourceEvent.ctrlKey) {
                var html = select(this).select('.selection').nodes()[0].outerHTML;
                html = html.replace('class="selection"', 'class="selection dummy' + ' selection-' + config.brushes.length + '"');
                var dat = select(this).nodes()[0].__data__;
                var brush$$1 = {
                  id: config.brushes.length,
                  extent: brushSelection(this),
                  html: html,
                  data: dat
                };
                config.brushes.push(brush$$1);
                select(select(this).nodes()[0].parentNode).select('.axis').nodes()[0].outerHTML += html;
                pc.brush();
                config.dimensions[d].brush.move(select(this, null));
                select(this).select('.selection').attr('style', 'display:none');
                pc.brushable();
              } else {
                pc.brush();
              }
            }));
            select(this).on('dblclick', function () {
              pc.brushReset(d);
            });
          }
        });

        flags.brushable = true;
        return this;
      };
    };

    var commonScale = function commonScale(config, pc) {
      return function (global, type) {
        var t = type || 'number';
        if (typeof global === 'undefined') {
          global = true;
        }

        // try to autodetect dimensions and create scales
        if (!Object.keys(config.dimensions).length) {
          pc.detectDimensions();
        }
        pc.autoscale();

        // scales of the same type
        var scales = Object.keys(config.dimensions).filter(function (p) {
          return config.dimensions[p].type == t;
        });

        if (global) {
          var _extent = extent(scales.map(function (d) {
            return config.dimensions[d].yscale.domain();
          }).reduce(function (cur, acc) {
            return cur.concat(acc);
          }));

          scales.forEach(function (d) {
            config.dimensions[d].yscale.domain(_extent);
          });
        } else {
          scales.forEach(function (d) {
            config.dimensions[d].yscale.domain(extent(config.data, function (d) {
              return +d[k];
            }));
          });
        }

        // update centroids
        if (config.bundleDimension !== null) {
          pc.bundleDimension(config.bundleDimension);
        }

        return this;
      };
    };

    var computeRealCentroids = function computeRealCentroids(config, position) {
      return function (row) {
        return Object.keys(config.dimensions).map(function (d) {
          var x = position(d);
          var y = config.dimensions[d].yscale(row[d]);
          return [x, y];
        });
      };
    };

    var isValid = function isValid(d) {
      return d !== null && d !== undefined;
    };

    var applyDimensionDefaults = function applyDimensionDefaults(config, pc) {
      return function (dims) {
        var types = pc.detectDimensionTypes(config.data);
        dims = dims ? dims : Object.keys(types);

        return dims.reduce(function (acc, cur, i) {
          var k = config.dimensions[cur] ? config.dimensions[cur] : {};
          acc[cur] = _extends({}, k, {
            orient: isValid(k.orient) ? k.orient : 'left',
            ticks: isValid(k.ticks) ? k.ticks : 5,
            innerTickSize: isValid(k.innerTickSize) ? k.innerTickSize : 6,
            outerTickSize: isValid(k.outerTickSize) ? k.outerTickSize : 0,
            tickPadding: isValid(k.tickPadding) ? k.tickPadding : 3,
            type: isValid(k.type) ? k.type : types[cur],
            index: isValid(k.index) ? k.index : i
          });

          return acc;
        }, {});
      };
    };

    /**
     * Create static SVG axes with dimension names, ticks, and labels.
     *
     * @param config
     * @param pc
     * @param xscale
     * @param flags
     * @param axis
     * @returns {Function}
     */
    var createAxes = function createAxes(config, pc, xscale, flags, axis) {
      return function () {
        if (pc.g() !== undefined) {
          pc.removeAxes();
        }
        // Add a group element for each dimension.
        pc._g = pc.svg.selectAll('.dimension').data(pc.getOrderedDimensionKeys(), function (d) {
          return d;
        }).enter().append('svg:g').attr('class', 'dimension').attr('transform', function (d) {
          return 'translate(' + xscale(d) + ')';
        });
        // Add an axis and title.
        pc._g.append('svg:g').attr('class', 'axis').attr('transform', 'translate(0,0)').each(function (d) {
          var axisElement = select(this).call(pc.applyAxisConfig(axis, config.dimensions[d]));

          axisElement.selectAll('path').style('fill', 'none').style('stroke', '#222').style('shape-rendering', 'crispEdges');

          axisElement.selectAll('line').style('fill', 'none').style('stroke', '#222').style('shape-rendering', 'crispEdges');
        }).append('svg:text').attr('text-anchor', 'middle').attr('y', 0).attr('transform', 'translate(0,-5) rotate(' + config.dimensionTitleRotation + ')').attr('x', 0).attr('class', 'label').text(dimensionLabels(config)).on('dblclick', flipAxisAndUpdatePCP(config, pc, axis)).on('wheel', rotateLabels(config, pc));

        if (config.nullValueSeparator === 'top') {
          pc.svg.append('line').attr('x1', 0).attr('y1', 1 + config.nullValueSeparatorPadding.top).attr('x2', w(config)).attr('y2', 1 + config.nullValueSeparatorPadding.top).attr('stroke-width', 1).attr('stroke', '#777').attr('fill', 'none').attr('shape-rendering', 'crispEdges');
        } else if (config.nullValueSeparator === 'bottom') {
          pc.svg.append('line').attr('x1', 0).attr('y1', h(config) + 1 - config.nullValueSeparatorPadding.bottom).attr('x2', w(config)).attr('y2', h(config) + 1 - config.nullValueSeparatorPadding.bottom).attr('stroke-width', 1).attr('stroke', '#777').attr('fill', 'none').attr('shape-rendering', 'crispEdges');
        }

        flags.axes = true;
        return this;
      };
    };

    var _this$3 = undefined;

    //draw dots with radius r on the axis line where data intersects
    var axisDots = function axisDots(config, pc, position) {
      return function (_r) {
        var r = _r || 0.1;
        var ctx = pc.ctx.dots;
        var startAngle = 0;
        var endAngle = 2 * Math.PI;
        ctx.globalAlpha = min$1([1 / Math.pow(config.data.length, 1 / 2), 1]);
        config.data.forEach(function (d) {
          entries(config.dimensions).forEach(function (p, i) {
            ctx.beginPath();
            ctx.arc(position(p), config.dimensions[p.key].yscale(d[p]), r, startAngle, endAngle);
            ctx.stroke();
            ctx.fill();
          });
        });
        return _this$3;
      };
    };

    var slice$3 = Array.prototype.slice;

    function identity$5 (x) {
      return x;
    }

    var top = 1,
        right = 2,
        bottom = 3,
        left = 4,
        epsilon$2 = 1e-6;

    function translateX(x) {
      return "translate(" + (x + 0.5) + ",0)";
    }

    function translateY(y) {
      return "translate(0," + (y + 0.5) + ")";
    }

    function number$3(scale) {
      return function (d) {
        return +scale(d);
      };
    }

    function center(scale) {
      var offset = Math.max(0, scale.bandwidth() - 1) / 2; // Adjust for 0.5px offset.
      if (scale.round()) offset = Math.round(offset);
      return function (d) {
        return +scale(d) + offset;
      };
    }

    function entering() {
      return !this.__axis;
    }

    function axis(orient, scale) {
      var tickArguments = [],
          tickValues = null,
          tickFormat = null,
          tickSizeInner = 6,
          tickSizeOuter = 6,
          tickPadding = 3,
          k = orient === top || orient === left ? -1 : 1,
          x = orient === left || orient === right ? "x" : "y",
          transform = orient === top || orient === bottom ? translateX : translateY;

      function axis(context) {
        var values = tickValues == null ? scale.ticks ? scale.ticks.apply(scale, tickArguments) : scale.domain() : tickValues,
            format = tickFormat == null ? scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments) : identity$5 : tickFormat,
            spacing = Math.max(tickSizeInner, 0) + tickPadding,
            range = scale.range(),
            range0 = +range[0] + 0.5,
            range1 = +range[range.length - 1] + 0.5,
            position = (scale.bandwidth ? center : number$3)(scale.copy()),
            selection = context.selection ? context.selection() : context,
            path = selection.selectAll(".domain").data([null]),
            tick = selection.selectAll(".tick").data(values, scale).order(),
            tickExit = tick.exit(),
            tickEnter = tick.enter().append("g").attr("class", "tick"),
            line = tick.select("line"),
            text = tick.select("text");

        path = path.merge(path.enter().insert("path", ".tick").attr("class", "domain").attr("stroke", "#000"));

        tick = tick.merge(tickEnter);

        line = line.merge(tickEnter.append("line").attr("stroke", "#000").attr(x + "2", k * tickSizeInner));

        text = text.merge(tickEnter.append("text").attr("fill", "#000").attr(x, k * spacing).attr("dy", orient === top ? "0em" : orient === bottom ? "0.71em" : "0.32em"));

        if (context !== selection) {
          path = path.transition(context);
          tick = tick.transition(context);
          line = line.transition(context);
          text = text.transition(context);

          tickExit = tickExit.transition(context).attr("opacity", epsilon$2).attr("transform", function (d) {
            return isFinite(d = position(d)) ? transform(d) : this.getAttribute("transform");
          });

          tickEnter.attr("opacity", epsilon$2).attr("transform", function (d) {
            var p = this.parentNode.__axis;return transform(p && isFinite(p = p(d)) ? p : position(d));
          });
        }

        tickExit.remove();

        path.attr("d", orient === left || orient == right ? "M" + k * tickSizeOuter + "," + range0 + "H0.5V" + range1 + "H" + k * tickSizeOuter : "M" + range0 + "," + k * tickSizeOuter + "V0.5H" + range1 + "V" + k * tickSizeOuter);

        tick.attr("opacity", 1).attr("transform", function (d) {
          return transform(position(d));
        });

        line.attr(x + "2", k * tickSizeInner);

        text.attr(x, k * spacing).text(format);

        selection.filter(entering).attr("fill", "none").attr("font-size", 10).attr("font-family", "sans-serif").attr("text-anchor", orient === right ? "start" : orient === left ? "end" : "middle");

        selection.each(function () {
          this.__axis = position;
        });
      }

      axis.scale = function (_) {
        return arguments.length ? (scale = _, axis) : scale;
      };

      axis.ticks = function () {
        return tickArguments = slice$3.call(arguments), axis;
      };

      axis.tickArguments = function (_) {
        return arguments.length ? (tickArguments = _ == null ? [] : slice$3.call(_), axis) : tickArguments.slice();
      };

      axis.tickValues = function (_) {
        return arguments.length ? (tickValues = _ == null ? null : slice$3.call(_), axis) : tickValues && tickValues.slice();
      };

      axis.tickFormat = function (_) {
        return arguments.length ? (tickFormat = _, axis) : tickFormat;
      };

      axis.tickSize = function (_) {
        return arguments.length ? (tickSizeInner = tickSizeOuter = +_, axis) : tickSizeInner;
      };

      axis.tickSizeInner = function (_) {
        return arguments.length ? (tickSizeInner = +_, axis) : tickSizeInner;
      };

      axis.tickSizeOuter = function (_) {
        return arguments.length ? (tickSizeOuter = +_, axis) : tickSizeOuter;
      };

      axis.tickPadding = function (_) {
        return arguments.length ? (tickPadding = +_, axis) : tickPadding;
      };

      return axis;
    }

    function axisTop(scale) {
      return axis(top, scale);
    }

    function axisRight(scale) {
      return axis(right, scale);
    }

    function axisBottom(scale) {
      return axis(bottom, scale);
    }

    function axisLeft(scale) {
      return axis(left, scale);
    }

    var applyAxisConfig = function applyAxisConfig(axis, dimension) {
      var axisCfg = void 0;

      switch (dimension.orient) {
        case 'left':
          axisCfg = axisLeft(dimension.yscale);
          break;
        case 'right':
          axisCfg = axisRight(dimension.yscale);
          break;
        case 'top':
          axisCfg = axisTop(dimension.yscale);
          break;
        case 'bottom':
          axisCfg = axisBottom(dimension.yscale);
          break;
        default:
          axisCfg = axisLeft(dimension.yscale);
          break;
      }

      axisCfg.ticks(dimension.ticks).tickValues(dimension.tickValues).tickSizeInner(dimension.innerTickSize).tickSizeOuter(dimension.outerTickSize).tickPadding(dimension.tickPadding).tickFormat(dimension.tickFormat);

      return axisCfg;
    };

    // Jason Davies, http://bl.ocks.org/1341281
    var reorderable = function reorderable(config, pc, xscale, position, dragging, flags) {
      return function () {
        if (pc.g() === undefined) pc.createAxes();
        var g = pc.g();

        g.style('cursor', 'move').call(drag().on('start', function (d) {
          dragging[d] = this.__origin__ = xscale(d);
        }).on('drag', function (d) {
          dragging[d] = Math.min(w(config), Math.max(0, this.__origin__ += event.dx));
          pc.sortDimensions();
          xscale.domain(pc.getOrderedDimensionKeys());
          pc.render();
          g.attr('transform', function (d) {
            return 'translate(' + position(d) + ')';
          });
        }).on('end', function (d) {
          delete this.__origin__;
          delete dragging[d];
          select(this).transition().attr('transform', 'translate(' + xscale(d) + ')');
          pc.render();
          pc.renderMarked();
        }));
        flags.reorderable = true;
        return this;
      };
    };

    // rescale for height, width and margins
    // TODO currently assumes chart is brushable, and destroys old brushes
    var resize = function resize(config, pc, flags, events) {
      return function () {
        // selection size
        pc.selection.select('svg').attr('width', config.width).attr('height', config.height);
        pc.svg.attr('transform', 'translate(' + config.margin.left + ',' + config.margin.top + ')');

        // FIXME: the current brush state should pass through
        if (flags.brushable) pc.brushReset();

        // scales
        pc.autoscale();

        // axes, destroys old brushes.
        if (pc.g()) pc.createAxes();
        if (flags.brushable) pc.brushable();
        if (flags.reorderable) pc.reorderable();

        events.call('resize', this, {
          width: config.width,
          height: config.height,
          margin: config.margin
        });

        return this;
      };
    };

    // Reorder dimensions, such that the highest value (visually) is on the left and
    // the lowest on the right. Visual values are determined by the data values in
    // the given row.
    var reorder = function reorder(config, pc, xscale) {
      return function (rowdata) {
        var firstDim = pc.getOrderedDimensionKeys()[0];

        pc.sortDimensionsByRowData(rowdata);
        // NOTE: this is relatively cheap given that:
        // number of dimensions < number of data items
        // Thus we check equality of order to prevent rerendering when this is the case.
        var reordered = firstDim !== pc.getOrderedDimensionKeys()[0];

        if (reordered) {
          xscale.domain(pc.getOrderedDimensionKeys());
          var highlighted = config.highlighted.slice(0);
          pc.unhighlight();

          var marked = config.marked.slice(0);
          pc.unmark();

          var g = pc.g();
          g.transition().duration(1500).attr('transform', function (d) {
            return 'translate(' + xscale(d) + ')';
          });
          pc.render();

          // pc.highlight() does not check whether highlighted is length zero, so we do that here.
          if (highlighted.length !== 0) {
            pc.highlight(highlighted);
          }
          if (marked.length !== 0) {
            pc.mark(marked);
          }
        }
      };
    };

    var sortDimensions = function sortDimensions(config, position) {
      return function () {
        var copy = Object.assign({}, config.dimensions);
        var positionSortedKeys = Object.keys(config.dimensions).sort(function (a, b) {
          return position(a) - position(b) === 0 ? 1 : position(a) - position(b);
        });
        config.dimensions = {};
        positionSortedKeys.forEach(function (p, i) {
          config.dimensions[p] = copy[p];
          config.dimensions[p].index = i;
        });
      };
    };

    var sortDimensionsByRowData = function sortDimensionsByRowData(config) {
      return function (rowdata) {
        var copy = Object.assign({}, config.dimensions);
        var positionSortedKeys = Object.keys(config.dimensions).sort(function (a, b) {
          var pixelDifference = config.dimensions[a].yscale(rowdata[a]) - config.dimensions[b].yscale(rowdata[b]);

          // Array.sort is not necessarily stable, this means that if pixelDifference is zero
          // the ordering of dimensions might change unexpectedly. This is solved by sorting on
          // variable name in that case.
          return pixelDifference === 0 ? a.localeCompare(b) : pixelDifference;
        });
        config.dimensions = {};
        positionSortedKeys.forEach(function (p, i) {
          config.dimensions[p] = copy[p];
          config.dimensions[p].index = i;
        });
      };
    };

    var isBrushed = function isBrushed(config, brushGroup) {
      if (config.brushed && config.brushed.length !== config.data.length) return true;

      var object = brushGroup.currentMode().brushState();

      for (var key in object) {
        if (object.hasOwnProperty(key)) {
          return true;
        }
      }
      return false;
    };

    var clear = function clear(config, pc, ctx, brushGroup) {
      return function (layer) {
        ctx[layer].clearRect(0, 0, w(config) + 2, h(config) + 2);

        // This will make sure that the foreground items are transparent
        // without the need for changing the opacity style of the foreground canvas
        // as this would stop the css styling from working
        if (layer === 'brushed' && isBrushed(config, brushGroup)) {
          ctx.brushed.fillStyle = pc.selection.style('background-color');
          ctx.brushed.globalAlpha = 1 - config.alphaOnBrushed;
          ctx.brushed.fillRect(0, 0, w(config) + 2, h(config) + 2);
          ctx.brushed.globalAlpha = config.alpha;
        }
        return this;
      };
    };

    var PRECISION = 1e-6;

    var Matrix = function () {
        function Matrix(elements) {
            classCallCheck(this, Matrix);

            this.setElements(elements);
        }

        createClass(Matrix, [{
            key: "e",
            value: function e(i, j) {
                if (i < 1 || i > this.elements.length || j < 1 || j > this.elements[0].length) {
                    return null;
                }
                return this.elements[i - 1][j - 1];
            }
        }, {
            key: "row",
            value: function row(i) {
                if (i > this.elements.length) {
                    return null;
                }
                return new Vector(this.elements[i - 1]);
            }
        }, {
            key: "col",
            value: function col(j) {
                if (this.elements.length === 0) {
                    return null;
                }
                if (j > this.elements[0].length) {
                    return null;
                }
                var col = [],
                    n = this.elements.length;
                for (var i = 0; i < n; i++) {
                    col.push(this.elements[i][j - 1]);
                }
                return new Vector(col);
            }
        }, {
            key: "dimensions",
            value: function dimensions() {
                var cols = this.elements.length === 0 ? 0 : this.elements[0].length;
                return { rows: this.elements.length, cols: cols };
            }
        }, {
            key: "rows",
            value: function rows() {
                return this.elements.length;
            }
        }, {
            key: "cols",
            value: function cols() {
                if (this.elements.length === 0) {
                    return 0;
                }
                return this.elements[0].length;
            }
        }, {
            key: "eql",
            value: function eql(matrix) {
                var M = matrix.elements || matrix;
                if (!M[0] || typeof M[0][0] === 'undefined') {
                    M = new Matrix(M).elements;
                }
                if (this.elements.length === 0 || M.length === 0) {
                    return this.elements.length === M.length;
                }
                if (this.elements.length !== M.length) {
                    return false;
                }
                if (this.elements[0].length !== M[0].length) {
                    return false;
                }
                var i = this.elements.length,
                    nj = this.elements[0].length,
                    j;
                while (i--) {
                    j = nj;
                    while (j--) {
                        if (Math.abs(this.elements[i][j] - M[i][j]) > PRECISION) {
                            return false;
                        }
                    }
                }
                return true;
            }
        }, {
            key: "dup",
            value: function dup() {
                return new Matrix(this.elements);
            }
        }, {
            key: "map",
            value: function map(fn, context) {
                if (this.elements.length === 0) {
                    return new Matrix([]);
                }
                var els = [],
                    i = this.elements.length,
                    nj = this.elements[0].length,
                    j;
                while (i--) {
                    j = nj;
                    els[i] = [];
                    while (j--) {
                        els[i][j] = fn.call(context, this.elements[i][j], i + 1, j + 1);
                    }
                }
                return new Matrix(els);
            }
        }, {
            key: "isSameSizeAs",
            value: function isSameSizeAs(matrix) {
                var M = matrix.elements || matrix;
                if (typeof M[0][0] === 'undefined') {
                    M = new Matrix(M).elements;
                }
                if (this.elements.length === 0) {
                    return M.length === 0;
                }
                return this.elements.length === M.length && this.elements[0].length === M[0].length;
            }
        }, {
            key: "add",
            value: function add(matrix) {
                if (this.elements.length === 0) {
                    return this.map(function (x) {
                        return x;
                    });
                }
                var M = matrix.elements || matrix;
                if (typeof M[0][0] === 'undefined') {
                    M = new Matrix(M).elements;
                }
                if (!this.isSameSizeAs(M)) {
                    return null;
                }
                return this.map(function (x, i, j) {
                    return x + M[i - 1][j - 1];
                });
            }
        }, {
            key: "subtract",
            value: function subtract(matrix) {
                if (this.elements.length === 0) {
                    return this.map(function (x) {
                        return x;
                    });
                }
                var M = matrix.elements || matrix;
                if (typeof M[0][0] === 'undefined') {
                    M = new Matrix(M).elements;
                }
                if (!this.isSameSizeAs(M)) {
                    return null;
                }
                return this.map(function (x, i, j) {
                    return x - M[i - 1][j - 1];
                });
            }
        }, {
            key: "canMultiplyFromLeft",
            value: function canMultiplyFromLeft(matrix) {
                if (this.elements.length === 0) {
                    return false;
                }
                var M = matrix.elements || matrix;
                if (typeof M[0][0] === 'undefined') {
                    M = new Matrix(M).elements;
                }
                // this.columns should equal matrix.rows
                return this.elements[0].length === M.length;
            }
        }, {
            key: "multiply",
            value: function multiply(matrix) {
                if (this.elements.length === 0) {
                    return null;
                }
                if (!matrix.elements) {
                    return this.map(function (x) {
                        return x * matrix;
                    });
                }
                var returnVector = matrix.modulus ? true : false;
                var M = matrix.elements || matrix;
                if (typeof M[0][0] === 'undefined') {
                    M = new Matrix(M).elements;
                }
                if (!this.canMultiplyFromLeft(M)) {
                    return null;
                }
                var i = this.elements.length,
                    nj = M[0].length,
                    j;
                var cols = this.elements[0].length,
                    c,
                    elements = [],
                    sum;
                while (i--) {
                    j = nj;
                    elements[i] = [];
                    while (j--) {
                        c = cols;
                        sum = 0;
                        while (c--) {
                            sum += this.elements[i][c] * M[c][j];
                        }
                        elements[i][j] = sum;
                    }
                }
                var M = new Matrix(elements);
                return returnVector ? M.col(1) : M;
            }
        }, {
            key: "minor",
            value: function minor(a, b, c, d) {
                if (this.elements.length === 0) {
                    return null;
                }
                var elements = [],
                    ni = c,
                    i,
                    nj,
                    j;
                var rows = this.elements.length,
                    cols = this.elements[0].length;
                while (ni--) {
                    i = c - ni - 1;
                    elements[i] = [];
                    nj = d;
                    while (nj--) {
                        j = d - nj - 1;
                        elements[i][j] = this.elements[(a + i - 1) % rows][(b + j - 1) % cols];
                    }
                }
                return new Matrix(elements);
            }
        }, {
            key: "transpose",
            value: function transpose() {
                if (this.elements.length === 0) {
                    return new Matrix([]);
                }
                var rows = this.elements.length,
                    i,
                    cols = this.elements[0].length,
                    j;
                var elements = [],
                    i = cols;
                while (i--) {
                    j = rows;
                    elements[i] = [];
                    while (j--) {
                        elements[i][j] = this.elements[j][i];
                    }
                }
                return new Matrix(elements);
            }
        }, {
            key: "isSquare",
            value: function isSquare() {
                var cols = this.elements.length === 0 ? 0 : this.elements[0].length;
                return this.elements.length === cols;
            }
        }, {
            key: "max",
            value: function max() {
                if (this.elements.length === 0) {
                    return null;
                }
                var m = 0,
                    i = this.elements.length,
                    nj = this.elements[0].length,
                    j;
                while (i--) {
                    j = nj;
                    while (j--) {
                        if (Math.abs(this.elements[i][j]) > Math.abs(m)) {
                            m = this.elements[i][j];
                        }
                    }
                }
                return m;
            }
        }, {
            key: "indexOf",
            value: function indexOf(x) {
                if (this.elements.length === 0) {
                    return null;
                }
                var ni = this.elements.length,
                    i,
                    nj = this.elements[0].length,
                    j;
                for (i = 0; i < ni; i++) {
                    for (j = 0; j < nj; j++) {
                        if (this.elements[i][j] === x) {
                            return {
                                i: i + 1,
                                j: j + 1
                            };
                        }
                    }
                }
                return null;
            }
        }, {
            key: "diagonal",
            value: function diagonal() {
                if (!this.isSquare) {
                    return null;
                }
                var els = [],
                    n = this.elements.length;
                for (var i = 0; i < n; i++) {
                    els.push(this.elements[i][i]);
                }
                return new Vector(els);
            }
        }, {
            key: "toRightTriangular",
            value: function toRightTriangular() {
                if (this.elements.length === 0) {
                    return new Matrix([]);
                }
                var M = this.dup(),
                    els;
                var n = this.elements.length,
                    i,
                    j,
                    np = this.elements[0].length,
                    p;
                for (i = 0; i < n; i++) {
                    if (M.elements[i][i] === 0) {
                        for (j = i + 1; j < n; j++) {
                            if (M.elements[j][i] !== 0) {
                                els = [];
                                for (p = 0; p < np; p++) {
                                    els.push(M.elements[i][p] + M.elements[j][p]);
                                }
                                M.elements[i] = els;
                                break;
                            }
                        }
                    }
                    if (M.elements[i][i] !== 0) {
                        for (j = i + 1; j < n; j++) {
                            var multiplier = M.elements[j][i] / M.elements[i][i];
                            els = [];
                            for (p = 0; p < np; p++) {
                                // Elements with column numbers up to an including the number of the
                                // row that we're subtracting can safely be set straight to zero,
                                // since that's the point of this routine and it avoids having to
                                // loop over and correct rounding errors later
                                els.push(p <= i ? 0 : M.elements[j][p] - M.elements[i][p] * multiplier);
                            }
                            M.elements[j] = els;
                        }
                    }
                }
                return M;
            }
        }, {
            key: "determinant",
            value: function determinant() {
                if (this.elements.length === 0) {
                    return 1;
                }
                if (!this.isSquare()) {
                    return null;
                }
                var M = this.toRightTriangular();
                var det = M.elements[0][0],
                    n = M.elements.length;
                for (var i = 1; i < n; i++) {
                    det = det * M.elements[i][i];
                }
                return det;
            }
        }, {
            key: "isSingular",
            value: function isSingular() {
                return this.isSquare() && this.determinant() === 0;
            }
        }, {
            key: "trace",
            value: function trace() {
                if (this.elements.length === 0) {
                    return 0;
                }
                if (!this.isSquare()) {
                    return null;
                }
                var tr = this.elements[0][0],
                    n = this.elements.length;
                for (var i = 1; i < n; i++) {
                    tr += this.elements[i][i];
                }
                return tr;
            }
        }, {
            key: "rank",
            value: function rank() {
                if (this.elements.length === 0) {
                    return 0;
                }
                var M = this.toRightTriangular(),
                    rank = 0;
                var i = this.elements.length,
                    nj = this.elements[0].length,
                    j;
                while (i--) {
                    j = nj;
                    while (j--) {
                        if (Math.abs(M.elements[i][j]) > PRECISION) {
                            rank++;
                            break;
                        }
                    }
                }
                return rank;
            }
        }, {
            key: "augment",
            value: function augment(matrix) {
                if (this.elements.length === 0) {
                    return this.dup();
                }
                var M = matrix.elements || matrix;
                if (typeof M[0][0] === 'undefined') {
                    M = new Matrix(M).elements;
                }
                var T = this.dup(),
                    cols = T.elements[0].length;
                var i = T.elements.length,
                    nj = M[0].length,
                    j;
                if (i !== M.length) {
                    return null;
                }
                while (i--) {
                    j = nj;
                    while (j--) {
                        T.elements[i][cols + j] = M[i][j];
                    }
                }
                return T;
            }
        }, {
            key: "inverse",
            value: function inverse() {
                if (this.elements.length === 0) {
                    return null;
                }
                if (!this.isSquare() || this.isSingular()) {
                    return null;
                }
                var n = this.elements.length,
                    i = n,
                    j;
                var M = this.augment(Matrix.I(n)).toRightTriangular();
                var np = M.elements[0].length,
                    p,
                    els,
                    divisor;
                var inverse_elements = [],
                    new_element;
                // Matrix is non-singular so there will be no zeros on the
                // diagonal. Cycle through rows from last to first.
                while (i--) {
                    // First, normalise diagonal elements to 1
                    els = [];
                    inverse_elements[i] = [];
                    divisor = M.elements[i][i];
                    for (p = 0; p < np; p++) {
                        new_element = M.elements[i][p] / divisor;
                        els.push(new_element);
                        // Shuffle off the current row of the right hand side into the results
                        // array as it will not be modified by later runs through this loop
                        if (p >= n) {
                            inverse_elements[i].push(new_element);
                        }
                    }
                    M.elements[i] = els;
                    // Then, subtract this row from those above it to give the identity matrix
                    // on the left hand side
                    j = i;
                    while (j--) {
                        els = [];
                        for (p = 0; p < np; p++) {
                            els.push(M.elements[j][p] - M.elements[i][p] * M.elements[j][i]);
                        }
                        M.elements[j] = els;
                    }
                }
                return new Matrix(inverse_elements);
            }
        }, {
            key: "round",
            value: function round() {
                return this.map(function (x) {
                    return Math.round(x);
                });
            }
        }, {
            key: "snapTo",
            value: function snapTo(x) {
                return this.map(function (p) {
                    return Math.abs(p - x) <= PRECISION ? x : p;
                });
            }
        }, {
            key: "inspect",
            value: function inspect() {
                var matrix_rows = [];
                var n = this.elements.length;
                if (n === 0) return '[]';
                for (var i = 0; i < n; i++) {
                    matrix_rows.push(new Vector(this.elements[i]).inspect());
                }
                return matrix_rows.join('\n');
            }
        }, {
            key: "setElements",
            value: function setElements(els) {
                var i,
                    j,
                    elements = els.elements || els;
                if (elements[0] && typeof elements[0][0] !== 'undefined') {
                    i = elements.length;
                    this.elements = [];
                    while (i--) {
                        j = elements[i].length;
                        this.elements[i] = [];
                        while (j--) {
                            this.elements[i][j] = elements[i][j];
                        }
                    }
                    return this;
                }
                var n = elements.length;
                this.elements = [];
                for (i = 0; i < n; i++) {
                    this.elements.push([elements[i]]);
                }
                return this;
            }

            //From glUtils.js

        }, {
            key: "flatten",
            value: function flatten() {
                var result = [];
                if (this.elements.length == 0) {
                    return [];
                }

                for (var j = 0; j < this.elements[0].length; j++) {
                    for (var i = 0; i < this.elements.length; i++) {
                        result.push(this.elements[i][j]);
                    }
                }
                return result;
            }

            //From glUtils.js

        }, {
            key: "ensure4x4",
            value: function ensure4x4() {
                if (this.elements.length == 4 && this.elements[0].length == 4) {
                    return this;
                }

                if (this.elements.length > 4 || this.elements[0].length > 4) {
                    return null;
                }

                for (var i = 0; i < this.elements.length; i++) {
                    for (var j = this.elements[i].length; j < 4; j++) {
                        if (i == j) {
                            this.elements[i].push(1);
                        } else {
                            this.elements[i].push(0);
                        }
                    }
                }

                for (var i = this.elements.length; i < 4; i++) {
                    if (i == 0) {
                        this.elements.push([1, 0, 0, 0]);
                    } else if (i == 1) {
                        this.elements.push([0, 1, 0, 0]);
                    } else if (i == 2) {
                        this.elements.push([0, 0, 1, 0]);
                    } else if (i == 3) {
                        this.elements.push([0, 0, 0, 1]);
                    }
                }

                return this;
            }

            //From glUtils.js

        }, {
            key: "make3x3",
            value: function make3x3() {
                if (this.elements.length != 4 || this.elements[0].length != 4) {
                    return null;
                }

                return new Matrix([[this.elements[0][0], this.elements[0][1], this.elements[0][2]], [this.elements[1][0], this.elements[1][1], this.elements[1][2]], [this.elements[2][0], this.elements[2][1], this.elements[2][2]]]);
            }
        }]);
        return Matrix;
    }();

    Matrix.I = function (n) {
        var els = [],
            i = n,
            j;
        while (i--) {
            j = n;
            els[i] = [];
            while (j--) {
                els[i][j] = i === j ? 1 : 0;
            }
        }
        return new Matrix(els);
    };

    Matrix.Diagonal = function (elements) {
        var i = elements.length;
        var M = Matrix.I(i);
        while (i--) {
            M.elements[i][i] = elements[i];
        }
        return M;
    };

    Matrix.Rotation = function (theta, a) {
        if (!a) {
            return new Matrix([[Math.cos(theta), -Math.sin(theta)], [Math.sin(theta), Math.cos(theta)]]);
        }
        var axis = a.dup();
        if (axis.elements.length !== 3) {
            return null;
        }
        var mod = axis.modulus();
        var x = axis.elements[0] / mod,
            y = axis.elements[1] / mod,
            z = axis.elements[2] / mod;
        var s = Math.sin(theta),
            c = Math.cos(theta),
            t = 1 - c;
        // Formula derived here: http://www.gamedev.net/reference/articles/article1199.asp
        // That proof rotates the co-ordinate system so theta becomes -theta and sin
        // becomes -sin here.
        return new Matrix([[t * x * x + c, t * x * y - s * z, t * x * z + s * y], [t * x * y + s * z, t * y * y + c, t * y * z - s * x], [t * x * z - s * y, t * y * z + s * x, t * z * z + c]]);
    };

    Matrix.RotationX = function (t) {
        var c = Math.cos(t),
            s = Math.sin(t);
        return new Matrix([[1, 0, 0], [0, c, -s], [0, s, c]]);
    };
    Matrix.RotationY = function (t) {
        var c = Math.cos(t),
            s = Math.sin(t);
        return new Matrix([[c, 0, s], [0, 1, 0], [-s, 0, c]]);
    };
    Matrix.RotationZ = function (t) {
        var c = Math.cos(t),
            s = Math.sin(t);
        return new Matrix([[c, -s, 0], [s, c, 0], [0, 0, 1]]);
    };

    Matrix.Random = function (n, m) {
        return Matrix.Zero(n, m).map(function () {
            return Math.random();
        });
    };

    //From glUtils.js
    Matrix.Translation = function (v) {
        if (v.elements.length == 2) {
            var r = Matrix.I(3);
            r.elements[2][0] = v.elements[0];
            r.elements[2][1] = v.elements[1];
            return r;
        }

        if (v.elements.length == 3) {
            var r = Matrix.I(4);
            r.elements[0][3] = v.elements[0];
            r.elements[1][3] = v.elements[1];
            r.elements[2][3] = v.elements[2];
            return r;
        }

        throw "Invalid length for Translation";
    };

    Matrix.Zero = function (n, m) {
        var els = [],
            i = n,
            j;
        while (i--) {
            j = m;
            els[i] = [];
            while (j--) {
                els[i][j] = 0;
            }
        }
        return new Matrix(els);
    };

    Matrix.prototype.toUpperTriangular = Matrix.prototype.toRightTriangular;
    Matrix.prototype.det = Matrix.prototype.determinant;
    Matrix.prototype.tr = Matrix.prototype.trace;
    Matrix.prototype.rk = Matrix.prototype.rank;
    Matrix.prototype.inv = Matrix.prototype.inverse;
    Matrix.prototype.x = Matrix.prototype.multiply;

    var Vector = function () {
        function Vector(elements) {
            classCallCheck(this, Vector);

            this.setElements(elements);
        }

        createClass(Vector, [{
            key: "e",
            value: function e(i) {
                return i < 1 || i > this.elements.length ? null : this.elements[i - 1];
            }
        }, {
            key: "dimensions",
            value: function dimensions() {
                return this.elements.length;
            }
        }, {
            key: "modulus",
            value: function modulus() {
                return Math.sqrt(this.dot(this));
            }
        }, {
            key: "eql",
            value: function eql(vector) {
                var n = this.elements.length;
                var V = vector.elements || vector;
                if (n !== V.length) {
                    return false;
                }
                while (n--) {
                    if (Math.abs(this.elements[n] - V[n]) > PRECISION) {
                        return false;
                    }
                }
                return true;
            }
        }, {
            key: "dup",
            value: function dup() {
                return new Vector(this.elements);
            }
        }, {
            key: "map",
            value: function map(fn, context) {
                var elements = [];
                this.each(function (x, i) {
                    elements.push(fn.call(context, x, i));
                });
                return new Vector(elements);
            }
        }, {
            key: "forEach",
            value: function forEach(fn, context) {
                var n = this.elements.length;
                for (var i = 0; i < n; i++) {
                    fn.call(context, this.elements[i], i + 1);
                }
            }
        }, {
            key: "toUnitVector",
            value: function toUnitVector() {
                var r = this.modulus();
                if (r === 0) {
                    return this.dup();
                }
                return this.map(function (x) {
                    return x / r;
                });
            }
        }, {
            key: "angleFrom",
            value: function angleFrom(vector) {
                var V = vector.elements || vector;
                var n = this.elements.length;
                if (n !== V.length) {
                    return null;
                }
                var dot = 0,
                    mod1 = 0,
                    mod2 = 0;
                // Work things out in parallel to save time
                this.each(function (x, i) {
                    dot += x * V[i - 1];
                    mod1 += x * x;
                    mod2 += V[i - 1] * V[i - 1];
                });
                mod1 = Math.sqrt(mod1);mod2 = Math.sqrt(mod2);
                if (mod1 * mod2 === 0) {
                    return null;
                }
                var theta = dot / (mod1 * mod2);
                if (theta < -1) {
                    theta = -1;
                }
                if (theta > 1) {
                    theta = 1;
                }
                return Math.acos(theta);
            }
        }, {
            key: "isParallelTo",
            value: function isParallelTo(vector) {
                var angle = this.angleFrom(vector);
                return angle === null ? null : angle <= PRECISION;
            }
        }, {
            key: "isAntiparallelTo",
            value: function isAntiparallelTo(vector) {
                var angle = this.angleFrom(vector);
                return angle === null ? null : Math.abs(angle - Math.PI) <= PRECISION;
            }
        }, {
            key: "isPerpendicularTo",
            value: function isPerpendicularTo(vector) {
                var dot = this.dot(vector);
                return dot === null ? null : Math.abs(dot) <= PRECISION;
            }
        }, {
            key: "add",
            value: function add(vector) {
                var V = vector.elements || vector;
                if (this.elements.length !== V.length) {
                    return null;
                }
                return this.map(function (x, i) {
                    return x + V[i - 1];
                });
            }
        }, {
            key: "subtract",
            value: function subtract(vector) {
                var V = vector.elements || vector;
                if (this.elements.length !== V.length) {
                    return null;
                }
                return this.map(function (x, i) {
                    return x - V[i - 1];
                });
            }
        }, {
            key: "multiply",
            value: function multiply(k) {
                return this.map(function (x) {
                    return x * k;
                });
            }
        }, {
            key: "dot",
            value: function dot(vector) {
                var V = vector.elements || vector;
                var product = 0,
                    n = this.elements.length;
                if (n !== V.length) {
                    return null;
                }
                while (n--) {
                    product += this.elements[n] * V[n];
                }
                return product;
            }
        }, {
            key: "cross",
            value: function cross(vector) {
                var B = vector.elements || vector;
                if (this.elements.length !== 3 || B.length !== 3) {
                    return null;
                }
                var A = this.elements;
                return new Vector([A[1] * B[2] - A[2] * B[1], A[2] * B[0] - A[0] * B[2], A[0] * B[1] - A[1] * B[0]]);
            }
        }, {
            key: "max",
            value: function max() {
                var m = 0,
                    i = this.elements.length;
                while (i--) {
                    if (Math.abs(this.elements[i]) > Math.abs(m)) {
                        m = this.elements[i];
                    }
                }
                return m;
            }
        }, {
            key: "indexOf",
            value: function indexOf(x) {
                var index = null,
                    n = this.elements.length;
                for (var i = 0; i < n; i++) {
                    if (index === null && this.elements[i] === x) {
                        index = i + 1;
                    }
                }
                return index;
            }
        }, {
            key: "toDiagonalMatrix",
            value: function toDiagonalMatrix() {
                return Matrix.Diagonal(this.elements);
            }
        }, {
            key: "round",
            value: function round() {
                return this.map(function (x) {
                    return Math.round(x);
                });
            }
        }, {
            key: "snapTo",
            value: function snapTo(x) {
                return this.map(function (y) {
                    return Math.abs(y - x) <= PRECISION ? x : y;
                });
            }
        }, {
            key: "distanceFrom",
            value: function distanceFrom(obj) {
                if (obj.anchor || obj.start && obj.end) {
                    return obj.distanceFrom(this);
                }
                var V = obj.elements || obj;
                if (V.length !== this.elements.length) {
                    return null;
                }
                var sum = 0,
                    part;
                this.each(function (x, i) {
                    part = x - V[i - 1];
                    sum += part * part;
                });
                return Math.sqrt(sum);
            }
        }, {
            key: "liesOn",
            value: function liesOn(line) {
                return line.contains(this);
            }
        }, {
            key: "liesIn",
            value: function liesIn(plane) {
                return plane.contains(this);
            }
        }, {
            key: "rotate",
            value: function rotate(t, obj) {
                var V,
                    R = null,
                    x,
                    y,
                    z;
                if (t.determinant) {
                    R = t.elements;
                }
                switch (this.elements.length) {
                    case 2:
                        {
                            V = obj.elements || obj;
                            if (V.length !== 2) {
                                return null;
                            }
                            if (!R) {
                                R = Matrix.Rotation(t).elements;
                            }
                            x = this.elements[0] - V[0];
                            y = this.elements[1] - V[1];
                            return new Vector([V[0] + R[0][0] * x + R[0][1] * y, V[1] + R[1][0] * x + R[1][1] * y]);
                            break;
                        }
                    case 3:
                        {
                            if (!obj.direction) {
                                return null;
                            }
                            var C = obj.pointClosestTo(this).elements;
                            if (!R) {
                                R = Matrix.Rotation(t, obj.direction).elements;
                            }
                            x = this.elements[0] - C[0];
                            y = this.elements[1] - C[1];
                            z = this.elements[2] - C[2];
                            return new Vector([C[0] + R[0][0] * x + R[0][1] * y + R[0][2] * z, C[1] + R[1][0] * x + R[1][1] * y + R[1][2] * z, C[2] + R[2][0] * x + R[2][1] * y + R[2][2] * z]);
                            break;
                        }
                    default:
                        {
                            return null;
                        }
                }
            }
        }, {
            key: "reflectionIn",
            value: function reflectionIn(obj) {
                if (obj.anchor) {
                    // obj is a plane or line
                    var P = this.elements.slice();
                    var C = obj.pointClosestTo(P).elements;
                    return new Vector([C[0] + (C[0] - P[0]), C[1] + (C[1] - P[1]), C[2] + (C[2] - (P[2] || 0))]);
                } else {
                    // obj is a point
                    var Q = obj.elements || obj;
                    if (this.elements.length !== Q.length) {
                        return null;
                    }
                    return this.map(function (x, i) {
                        return Q[i - 1] + (Q[i - 1] - x);
                    });
                }
            }
        }, {
            key: "to3D",
            value: function to3D() {
                var V = this.dup();
                switch (V.elements.length) {
                    case 3:
                        {
                            break;
                        }
                    case 2:
                        {
                            V.elements.push(0);
                            break;
                        }
                    default:
                        {
                            return null;
                        }
                }
                return V;
            }
        }, {
            key: "inspect",
            value: function inspect() {
                return '[' + this.elements.join(', ') + ']';
            }
        }, {
            key: "setElements",
            value: function setElements(els) {
                this.elements = (els.elements || els).slice();
                return this;
            }

            //From glUtils.js

        }, {
            key: "flatten",
            value: function flatten() {
                return this.elements;
            }
        }]);
        return Vector;
    }();

    Vector.Random = function (n) {
        var elements = [];
        while (n--) {
            elements.push(Math.random());
        }
        return new Vector(elements);
    };

    Vector.Zero = function (n) {
        var elements = [];
        while (n--) {
            elements.push(0);
        }
        return new Vector(elements);
    };

    Vector.prototype.x = Vector.prototype.multiply;
    Vector.prototype.each = Vector.prototype.forEach;

    Vector.i = new Vector([1, 0, 0]);
    Vector.j = new Vector([0, 1, 0]);
    Vector.k = new Vector([0, 0, 1]);

    var computeCentroids = function computeCentroids(config, position, row) {
      var centroids = [];

      var p = Object.keys(config.dimensions);
      var cols = p.length;
      var a = 0.5; // center between axes
      for (var i = 0; i < cols; ++i) {
        // centroids on 'real' axes
        var x = position(p[i]);
        var y = config.dimensions[p[i]].yscale(row[p[i]]);
        centroids.push(new Vector([x, y]));

        // centroids on 'virtual' axes
        if (i < cols - 1) {
          var cx = x + a * (position(p[i + 1]) - x);
          var cy = y + a * (config.dimensions[p[i + 1]].yscale(row[p[i + 1]]) - y);
          if (config.bundleDimension !== null) {
            var leftCentroid = config.clusterCentroids.get(config.dimensions[config.bundleDimension].yscale(row[config.bundleDimension])).get(p[i]);
            var rightCentroid = config.clusterCentroids.get(config.dimensions[config.bundleDimension].yscale(row[config.bundleDimension])).get(p[i + 1]);
            var centroid = 0.5 * (leftCentroid + rightCentroid);
            cy = centroid + (1 - config.bundlingStrength) * (cy - centroid);
          }
          centroids.push(new Vector([cx, cy]));
        }
      }

      return centroids;
    };

    var computeControlPoints = function computeControlPoints(smoothness, centroids) {
      var cols = centroids.length;
      var a = smoothness;
      var cps = [];

      cps.push(centroids[0]);
      cps.push(new Vector([centroids[0].e(1) + a * 2 * (centroids[1].e(1) - centroids[0].e(1)), centroids[0].e(2)]));
      for (var col = 1; col < cols - 1; ++col) {
        var mid = centroids[col];
        var left = centroids[col - 1];
        var right = centroids[col + 1];

        var diff = left.subtract(right);
        cps.push(mid.add(diff.x(a)));
        cps.push(mid);
        cps.push(mid.subtract(diff.x(a)));
      }

      cps.push(new Vector([centroids[cols - 1].e(1) + a * 2 * (centroids[cols - 2].e(1) - centroids[cols - 1].e(1)), centroids[cols - 1].e(2)]));
      cps.push(centroids[cols - 1]);

      return cps;
    };

    // draw single cubic bezier curve

    var singleCurve = function singleCurve(config, position, d, ctx) {
      var centroids = computeCentroids(config, position, d);
      var cps = computeControlPoints(config.smoothness, centroids);

      ctx.moveTo(cps[0].e(1), cps[0].e(2));

      for (var i = 1; i < cps.length; i += 3) {
        if (config.showControlPoints) {
          for (var j = 0; j < 3; j++) {
            ctx.fillRect(cps[i + j].e(1), cps[i + j].e(2), 2, 2);
          }
        }
        ctx.bezierCurveTo(cps[i].e(1), cps[i].e(2), cps[i + 1].e(1), cps[i + 1].e(2), cps[i + 2].e(1), cps[i + 2].e(2));
      }
    };

    // returns the y-position just beyond the separating null value line
    var getNullPosition = function getNullPosition(config) {
      if (config.nullValueSeparator === 'bottom') {
        return h(config) + 1;
      } else if (config.nullValueSeparator === 'top') {
        return 1;
      } else {
        console.log("A value is NULL, but nullValueSeparator is not set; set it to 'bottom' or 'top'.");
      }
      return h(config) + 1;
    };

    var singlePath = function singlePath(config, position, d, ctx) {
      Object.keys(config.dimensions).map(function (p) {
        return [position(p), d[p] === undefined ? getNullPosition(config) : config.dimensions[p].yscale(d[p])];
      }).sort(function (a, b) {
        return a[0] - b[0];
      }).forEach(function (p, i) {
        i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]);
      });
    };

    // draw single polyline
    var colorPath = function colorPath(config, position, d, ctx) {
      ctx.beginPath();
      if (config.bundleDimension !== null && config.bundlingStrength > 0 || config.smoothness > 0) {
        singleCurve(config, position, d, ctx);
      } else {
        singlePath(config, position, d, ctx);
      }
      ctx.stroke();
    };

    var _functor = function _functor(v) {
      return typeof v === 'function' ? v : function () {
        return v;
      };
    };

    var pathMark = function pathMark(config, ctx, position) {
      return function (d, i) {
        ctx.marked.strokeStyle = _functor(config.color)(d, i);
        return colorPath(config, position, d, ctx.marked);
      };
    };

    var renderMarkedDefault = function renderMarkedDefault(config, pc, ctx, position) {
      return function () {
        pc.clear('marked');

        if (config.marked.length) {
          config.marked.forEach(pathMark(config, ctx, position));
        }
      };
    };

    var renderMarkedQueue = function renderMarkedQueue(config, markedQueue) {
      return function () {
        if (config.marked) {
          markedQueue(config.marked);
        } else {
          markedQueue([]); // This is needed to clear the currently marked items
        }
      };
    };

    var renderMarked = function renderMarked(config, pc, events) {
      return function () {
        if (!Object.keys(config.dimensions).length) pc.detectDimensions();

        pc.renderMarked[config.mode]();
        events.call('render', this);
        return this;
      };
    };

    var pathBrushed = function pathBrushed(config, ctx, position) {
      return function (d, i) {
        if (config.brushedColor !== null) {
          ctx.brushed.strokeStyle = _functor(config.brushedColor)(d, i);
        } else {
          ctx.brushed.strokeStyle = _functor(config.color)(d, i);
        }
        return colorPath(config, position, d, ctx.brushed);
      };
    };

    var renderBrushedDefault = function renderBrushedDefault(config, ctx, position, pc, brushGroup) {
      return function () {
        pc.clear('brushed');

        if (isBrushed(config, brushGroup) && config.brushed !== false) {
          config.brushed.forEach(pathBrushed(config, ctx, position));
        }
      };
    };

    var renderBrushedQueue = function renderBrushedQueue(config, brushGroup, brushedQueue) {
      return function () {
        if (isBrushed(config, brushGroup)) {
          brushedQueue(config.brushed);
        } else {
          brushedQueue([]); // This is needed to clear the currently brushed items
        }
      };
    };

    var renderBrushed = function renderBrushed(config, pc, events) {
      return function () {
        if (!Object.keys(config.dimensions).length) pc.detectDimensions();

        pc.renderBrushed[config.mode]();
        events.call('render', this);
        return this;
      };
    };

    var brushReset$4 = function brushReset(config, pc) {
      return function (dimension) {
        var brushesToKeep = [];
        for (var j = 0; j < config.brushes.length; j++) {
          if (config.brushes[j].data !== dimension) {
            brushesToKeep.push(config.brushes[j]);
          }
        }

        config.brushes = brushesToKeep;
        config.brushed = false;

        if (pc.g() !== undefined) {
          var nodes = pc.g().selectAll('.brush').nodes();
          for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].__data__ === dimension) {
              // remove all dummy brushes for this axis or the real brush
              select(select(nodes[i]).nodes()[0].parentNode).selectAll('.dummy').remove();
              config.dimensions[dimension].brush.move(select(nodes[i], null));
            }
          }
        }

        return this;
      };
    };

    // a better "typeof" from this post: http://stackoverflow.com/questions/7390426/better-way-to-get-type-of-a-javascript-variable
    var toType = function toType(v) {
      return {}.toString.call(v).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
    };

    // this descriptive text should live with other introspective methods
    var toString = function toString(config) {
      return function () {
        return 'Parallel Coordinates: ' + Object.keys(config.dimensions).length + ' dimensions (' + Object.keys(config.data[0]).length + ' total) , ' + config.data.length + ' rows';
      };
    };

    // pairs of adjacent dimensions
    var adjacentPairs = function adjacentPairs(arr) {
      var ret = [];
      for (var i = 0; i < arr.length - 1; i++) {
        ret.push([arr[i], arr[i + 1]]);
      }
      return ret;
    };

    var pathHighlight = function pathHighlight(config, ctx, position) {
      return function (d, i) {
        ctx.highlight.strokeStyle = _functor(config.color)(d, i);
        return colorPath(config, position, d, ctx.highlight);
      };
    };

    // highlight an array of data
    var highlight = function highlight(config, pc, canvas, events, ctx, position) {
      return function () {
        var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

        if (data === null) {
          return config.highlighted;
        }

        config.highlighted = data;
        pc.clear('highlight');
        selectAll([canvas.foreground, canvas.brushed]).classed('faded', true);
        data.forEach(pathHighlight(config, ctx, position));
        events.call('highlight', this, data);
        return this;
      };
    };

    // clear highlighting
    var unhighlight = function unhighlight(config, pc, canvas) {
      return function () {
        config.highlighted = [];
        pc.clear('highlight');
        selectAll([canvas.foreground, canvas.brushed]).classed('faded', false);
        return this;
      };
    };

    // mark an array of data
    var mark = function mark(config, pc, canvas, events, ctx, position) {
      return function () {
        var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

        if (data === null) {
          return config.marked;
        }

        // add array to already marked data
        config.marked = config.marked.concat(data);
        selectAll([canvas.foreground, canvas.brushed]).classed('dimmed', true);
        data.forEach(pathMark(config, ctx, position));
        events.call('mark', this, data);
        return this;
      };
    };

    // clear marked data arrays
    var unmark = function unmark(config, pc, canvas) {
      return function () {
        config.marked = [];
        pc.clear('marked');
        selectAll([canvas.foreground, canvas.brushed]).classed('dimmed', false);
        return this;
      };
    };

    var removeAxes = function removeAxes(pc) {
      return function () {
        pc._g.remove();

        delete pc._g;
        return this;
      };
    };

    /**
     * Renders the polylines.
     * If no dimensions have been specified, it will attempt to detect quantitative
     * dimensions based on the first data entry. If scales haven't been set, it will
     * autoscale based on the extent for each dimension.
     *
     * @param config
     * @param pc
     * @param events
     * @returns {Function}
     */
    var render = function render(config, pc, events) {
      return function () {
        // try to autodetect dimensions and create scales
        if (!Object.keys(config.dimensions).length) {
          pc.detectDimensions();
        }
        pc.autoscale();

        pc.render[config.mode]();

        events.call('render', this);
        return this;
      };
    };

    var pathForeground = function pathForeground(config, ctx, position) {
      return function (d, i) {
        ctx.foreground.strokeStyle = _functor(config.color)(d, i);
        return colorPath(config, position, d, ctx.foreground);
      };
    };

    var renderDefault = function renderDefault(config, pc, ctx, position) {
      return function () {
        pc.clear('foreground');
        pc.clear('highlight');

        pc.renderBrushed.default();
        pc.renderMarked.default();

        config.data.forEach(pathForeground(config, ctx, position));
      };
    };

    var renderDefaultQueue = function renderDefaultQueue(config, pc, foregroundQueue) {
      return function () {
        pc.renderBrushed.queue();
        pc.renderMarked.queue();
        foregroundQueue(config.data);
      };
    };

    // try to coerce to number before returning type
    var toTypeCoerceNumbers = function toTypeCoerceNumbers(v) {
      return parseFloat(v) == v && v !== null ? 'number' : toType(v);
    };

    // attempt to determine types of each dimension based on first row of data
    var detectDimensionTypes = function detectDimensionTypes(data) {
      return Object.keys(data[0]).reduce(function (acc, cur) {
        var key = isNaN(Number(cur)) ? cur : parseInt(cur);
        acc[key] = toTypeCoerceNumbers(data[0][cur]);

        return acc;
      }, {});
    };

    var getOrderedDimensionKeys = function getOrderedDimensionKeys(config) {
      return function () {
        return Object.keys(config.dimensions).sort(function (x, y) {
          return ascending$2(config.dimensions[x].index, config.dimensions[y].index);
        });
      };
    };

    var interactive = function interactive(flags) {
      return function () {
        flags.interactive = true;
        return this;
      };
    };

    var shadows = function shadows(flags, pc) {
      return function () {
        flags.shadows = true;
        pc.alphaOnBrushed(0.1);
        pc.render();
        return this;
      };
    };

    /**
     * Setup a new parallel coordinates chart.
     *
     * @param config
     * @param canvas
     * @param ctx
     * @returns {pc} a parcoords closure
     */
    var init$1 = function init(config, canvas, ctx) {
      /**
       * Create the chart within a container. The selector can also be a d3 selection.
       *
       * @param selection a d3 selection
       * @returns {pc} instance for chained api
       */
      var pc = function pc(selection$$1) {
        selection$$1 = pc.selection = select(selection$$1);

        config.width = selection$$1.node().clientWidth;
        config.height = selection$$1.node().clientHeight;
        // canvas data layers
        ['dots', 'foreground', 'brushed', 'marked', 'highlight'].forEach(function (layer) {
          canvas[layer] = selection$$1.append('canvas').attr('class', layer).node();
          ctx[layer] = canvas[layer].getContext('2d');
        });

        // svg tick and brush layers
        pc.svg = selection$$1.append('svg').attr('width', config.width).attr('height', config.height).style('font', '14px sans-serif').style('position', 'absolute').append('svg:g').attr('transform', 'translate(' + config.margin.left + ',' + config.margin.top + ')');
        // for chained api
        return pc;
      };

      // for partial-application style programming
      return pc;
    };

    var flip = function flip(config) {
      return function (d) {
        //__.dimensions[d].yscale.domain().reverse();                               // does not work
        config.dimensions[d].yscale.domain(config.dimensions[d].yscale.domain().reverse()); // works

        return this;
      };
    };

    var detectDimensions = function detectDimensions(pc) {
      return function () {
        pc.dimensions(pc.applyDimensionDefaults());
        return this;
      };
    };

    var scale = function scale(config, pc) {
      return function (d, domain) {
        config.dimensions[d].yscale.domain(domain);
        pc.render.default();
        pc.updateAxes();

        return this;
      };
    };

    var version = "2.2.10";

    var DefaultConfig = {
      data: [],
      highlighted: [],
      marked: [],
      dimensions: {},
      dimensionTitleRotation: 0,
      brushes: [],
      brushed: false,
      brushedColor: null,
      alphaOnBrushed: 0.0,
      lineWidth: 1.4,
      highlightedLineWidth: 3,
      mode: 'default',
      markedLineWidth: 3,
      markedShadowColor: '#ffffff',
      markedShadowBlur: 10,
      rate: 20,
      width: 600,
      height: 300,
      margin: { top: 24, right: 20, bottom: 12, left: 20 },
      nullValueSeparator: 'undefined', // set to "top" or "bottom"
      nullValueSeparatorPadding: { top: 8, right: 0, bottom: 8, left: 0 },
      color: '#069',
      composite: 'source-over',
      alpha: 0.7,
      bundlingStrength: 0.5,
      bundleDimension: null,
      smoothness: 0.0,
      showControlPoints: false,
      hideAxis: [],
      flipAxes: [],
      animationTime: 1100, // How long it takes to flip the axis when you double click
      rotateLabels: false
    };

    var _this$4 = undefined;

    var initState = function initState(userConfig) {
      var config = Object.assign({}, DefaultConfig, userConfig);

      if (userConfig && userConfig.dimensionTitles) {
        console.warn('dimensionTitles passed in userConfig is deprecated. Add title to dimension object.');
        entries(userConfig.dimensionTitles).forEach(function (d) {
          if (config.dimensions[d.key]) {
            config.dimensions[d.key].title = config.dimensions[d.key].title ? config.dimensions[d.key].title : d.value;
          } else {
            config.dimensions[d.key] = {
              title: d.value
            };
          }
        });
      }

      var eventTypes = ['render', 'resize', 'highlight', 'mark', 'brush', 'brushend', 'brushstart', 'axesreorder'].concat(keys(config));

      var events = dispatch.apply(_this$4, eventTypes),
          flags = {
        brushable: false,
        reorderable: false,
        axes: false,
        interactive: false,
        debug: false
      },
          xscale = point$1(),
          dragging = {},
          axis = axisLeft().ticks(5),
          ctx = {},
          canvas = {};

      var brush = {
        modes: {
          None: {
            install: function install(pc) {}, // Nothing to be done.
            uninstall: function uninstall(pc) {}, // Nothing to be done.
            selected: function selected() {
              return [];
            }, // Nothing to return
            brushState: function brushState() {
              return {};
            }
          }
        },
        mode: 'None',
        predicate: 'AND',
        currentMode: function currentMode() {
          return this.modes[this.mode];
        }
      };

      return {
        config: config,
        events: events,
        eventTypes: eventTypes,
        flags: flags,
        xscale: xscale,
        dragging: dragging,
        axis: axis,
        ctx: ctx,
        canvas: canvas,
        brush: brush
      };
    };

    var computeClusterCentroids = function computeClusterCentroids(config, d) {
      var clusterCentroids = new Map();
      var clusterCounts = new Map();
      // determine clusterCounts
      config.data.forEach(function (row) {
        var scaled = config.dimensions[d].yscale(row[d]);
        if (!clusterCounts.has(scaled)) {
          clusterCounts.set(scaled, 0);
        }
        var count = clusterCounts.get(scaled);
        clusterCounts.set(scaled, count + 1);
      });

      config.data.forEach(function (row) {
        Object.keys(config.dimensions).map(function (p) {
          var scaled = config.dimensions[d].yscale(row[d]);
          if (!clusterCentroids.has(scaled)) {
            var _map = new Map();
            clusterCentroids.set(scaled, _map);
          }
          if (!clusterCentroids.get(scaled).has(p)) {
            clusterCentroids.get(scaled).set(p, 0);
          }
          var value = clusterCentroids.get(scaled).get(p);
          value += config.dimensions[p].yscale(row[p]) / clusterCounts.get(scaled);
          clusterCentroids.get(scaled).set(p, value);
        });
      });

      return clusterCentroids;
    };

    var _this$5 = undefined;

    var without = function without(arr, items) {
      items.forEach(function (el) {
        delete arr[el];
      });
      return arr;
    };

    var sideEffects = function sideEffects(config, ctx, pc, xscale, axis, flags, brushedQueue, markedQueue, foregroundQueue) {
      return dispatch.apply(_this$5, Object.keys(config)).on('composite', function (d) {
        ctx.foreground.globalCompositeOperation = d.value;
        ctx.brushed.globalCompositeOperation = d.value;
      }).on('alpha', function (d) {
        ctx.foreground.globalAlpha = d.value;
        ctx.brushed.globalAlpha = d.value;
      }).on('brushedColor', function (d) {
        ctx.brushed.strokeStyle = d.value;
      }).on('width', function (d) {
        return pc.resize();
      }).on('height', function (d) {
        return pc.resize();
      }).on('margin', function (d) {
        return pc.resize();
      }).on('rate', function (d) {
        brushedQueue.rate(d.value);
        markedQueue.rate(d.value);
        foregroundQueue.rate(d.value);
      }).on('dimensions', function (d) {
        config.dimensions = pc.applyDimensionDefaults(Object.keys(d.value));
        xscale.domain(pc.getOrderedDimensionKeys());
        pc.sortDimensions();
        if (flags.interactive) {
          pc.render().updateAxes();
        }
      }).on('bundleDimension', function (d) {
        if (!Object.keys(config.dimensions).length) pc.detectDimensions();
        pc.autoscale();
        if (typeof d.value === 'number') {
          if (d.value < Object.keys(config.dimensions).length) {
            config.bundleDimension = config.dimensions[d.value];
          } else if (d.value < config.hideAxis.length) {
            config.bundleDimension = config.hideAxis[d.value];
          }
        } else {
          config.bundleDimension = d.value;
        }

        config.clusterCentroids = computeClusterCentroids(config, config.bundleDimension);
        if (flags.interactive) {
          pc.render();
        }
      }).on('hideAxis', function (d) {
        pc.brushReset();
        pc.dimensions(pc.applyDimensionDefaults());
        pc.dimensions(without(config.dimensions, d.value));
        pc.render();
      }).on('flipAxes', function (d) {
        if (d.value && d.value.length) {
          d.value.forEach(function (dimension) {
            flipAxisAndUpdatePCP(config, pc, axis)(dimension);
          });
          pc.updateAxes(0);
        }
      });
    };

    var getset = function getset(obj, state, events, side_effects) {
      Object.keys(state).forEach(function (key) {
        obj[key] = function (x) {
          if (!arguments.length) {
            return state[key];
          }
          if (key === 'dimensions' && Object.prototype.toString.call(x) === '[object Array]') {
            console.warn('pc.dimensions([]) is deprecated, use pc.dimensions({})');
            x = obj.applyDimensionDefaults(x);
          }
          var old = state[key];
          state[key] = x;
          side_effects.call(key, obj, { value: x, previous: old });
          events.call(key, obj, { value: x, previous: old });
          return obj;
        };
      });
    };

    // side effects for setters

    var d3_rebind = function d3_rebind(target, source, method) {
      return function () {
        var value = method.apply(source, arguments);
        return value === source ? target : value;
      };
    };

    var _rebind = function _rebind(target, source, method) {
      target[method] = d3_rebind(target, source, source[method]);
      return target;
    };

    var bindEvents = function bindEvents(__, ctx, pc, xscale, flags, brushedQueue, markedQueue, foregroundQueue, events, axis) {
      var side_effects = sideEffects(__, ctx, pc, xscale, axis, flags, brushedQueue, markedQueue, foregroundQueue);

      // create getter/setters
      getset(pc, __, events, side_effects);

      // expose events
      // getter/setter with event firing
      _rebind(pc, events, 'on');

      _rebind(pc, axis, 'ticks', 'orient', 'tickValues', 'tickSubdivide', 'tickSize', 'tickPadding', 'tickFormat');
    };

    // misc

    var ParCoords = function ParCoords(userConfig) {
      var state = initState(userConfig);
      var config = state.config,
          events = state.events,
          flags = state.flags,
          xscale = state.xscale,
          dragging = state.dragging,
          axis = state.axis,
          ctx = state.ctx,
          canvas = state.canvas,
          brush = state.brush;


      var pc = init$1(config, canvas, ctx);

      var position = function position(d) {
        if (xscale.range().length === 0) {
          xscale.range([0, w(config)], 1);
        }
        return dragging[d] == null ? xscale(d) : dragging[d];
      };

      var brushedQueue = renderQueue(pathBrushed(config, ctx, position)).rate(50).clear(function () {
        return pc.clear('brushed');
      });

      var markedQueue = renderQueue(pathMark(config, ctx, position)).rate(50).clear(function () {
        return pc.clear('marked');
      });

      var foregroundQueue = renderQueue(pathForeground(config, ctx, position)).rate(50).clear(function () {
        pc.clear('foreground');
        pc.clear('highlight');
      });

      bindEvents(config, ctx, pc, xscale, flags, brushedQueue, markedQueue, foregroundQueue, events, axis);

      // expose the state of the chart
      pc.state = config;
      pc.flags = flags;

      pc.autoscale = autoscale(config, pc, xscale, ctx);
      pc.scale = scale(config, pc);
      pc.flip = flip(config);
      pc.commonScale = commonScale(config, pc);
      pc.detectDimensions = detectDimensions(pc);
      // attempt to determine types of each dimension based on first row of data
      pc.detectDimensionTypes = detectDimensionTypes;
      pc.applyDimensionDefaults = applyDimensionDefaults(config, pc);
      pc.getOrderedDimensionKeys = getOrderedDimensionKeys(config);

      //Renders the polylines.
      pc.render = render(config, pc, events);
      pc.renderBrushed = renderBrushed(config, pc, events);
      pc.renderMarked = renderMarked(config, pc, events);
      pc.render.default = renderDefault(config, pc, ctx, position);
      pc.render.queue = renderDefaultQueue(config, pc, foregroundQueue);
      pc.renderBrushed.default = renderBrushedDefault(config, ctx, position, pc, brush);
      pc.renderBrushed.queue = renderBrushedQueue(config, brush, brushedQueue);
      pc.renderMarked.default = renderMarkedDefault(config, pc, ctx, position);
      pc.renderMarked.queue = renderMarkedQueue(config, markedQueue);

      pc.compute_real_centroids = computeRealCentroids(config, position);
      pc.shadows = shadows(flags, pc);
      pc.axisDots = axisDots(config, pc, position);
      pc.clear = clear(config, pc, ctx, brush);
      pc.createAxes = createAxes(config, pc, xscale, flags, axis);
      pc.removeAxes = removeAxes(pc);
      pc.updateAxes = updateAxes(config, pc, position, axis, flags);
      pc.applyAxisConfig = applyAxisConfig;
      pc.brushable = brushable(config, pc, flags);
      pc.brushReset = brushReset$4(config, pc);
      pc.selected = selected$4(config, pc);
      pc.reorderable = reorderable(config, pc, xscale, position, dragging, flags);

      // Reorder dimensions, such that the highest value (visually) is on the left and
      // the lowest on the right. Visual values are determined by the data values in
      // the given row.
      pc.reorder = reorder(config, pc, xscale);
      pc.sortDimensionsByRowData = sortDimensionsByRowData(config);
      pc.sortDimensions = sortDimensions(config, position);

      // pairs of adjacent dimensions
      pc.adjacent_pairs = adjacentPairs;
      pc.interactive = interactive(flags);

      // expose internal state
      pc.xscale = xscale;
      pc.ctx = ctx;
      pc.canvas = canvas;
      pc.g = function () {
        return pc._g;
      };

      // rescale for height, width and margins
      // TODO currently assumes chart is brushable, and destroys old brushes
      pc.resize = resize(config, pc, flags, events);

      // highlight an array of data
      pc.highlight = highlight(config, pc, canvas, events, ctx, position);
      // clear highlighting
      pc.unhighlight = unhighlight(config, pc, canvas);

      // mark an array of data
      pc.mark = mark(config, pc, canvas, events, ctx, position);
      // clear marked data
      pc.unmark = unmark(config, pc, canvas);

      // calculate 2d intersection of line a->b with line c->d
      // points are objects with x and y properties
      pc.intersection = intersection;

      // Merges the canvases and SVG elements into one canvas element which is then passed into the callback
      // (so you can choose to save it to disk, etc.)
      pc.mergeParcoords = mergeParcoords(pc);
      pc.brushModes = function () {
        return Object.getOwnPropertyNames(brush.modes);
      };
      pc.brushMode = brushMode(brush, config, pc);

      // install brushes
      install1DAxes(brush, config, pc, events);
      install2DStrums(brush, config, pc, events, xscale);
      installAngularBrush(brush, config, pc, events, xscale);
      install1DMultiAxes(brush, config, pc, events);

      pc.version = version;
      // this descriptive text should live with other introspective methods
      pc.toString = toString(config);
      pc.toType = toType;
      // try to coerce to number before returning type
      pc.toTypeCoerceNumbers = toTypeCoerceNumbers;

      return pc;
    };

    return ParCoords;

})));
//# sourceMappingURL=parcoords.standalone.js.map


(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Components\menu\Menu.svelte generated by Svelte v3.46.4 */

    const file$7 = "src\\Components\\menu\\Menu.svelte";

    function create_fragment$7(ctx) {
    	let div;
    	let ul;
    	let li0;
    	let a0;
    	let t1;
    	let li1;
    	let a1;
    	let t3;
    	let li2;
    	let a2;
    	let t5;
    	let li3;
    	let a3;
    	let t7;
    	let li4;
    	let a4;

    	const block = {
    		c: function create() {
    			div = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Działalność";
    			t1 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Usługi";
    			t3 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "Realizacje";
    			t5 = space();
    			li3 = element("li");
    			a3 = element("a");
    			a3.textContent = "Cennik";
    			t7 = space();
    			li4 = element("li");
    			a4 = element("a");
    			a4.textContent = "Kontakt";
    			attr_dev(a0, "href", "");
    			attr_dev(a0, "class", "svelte-r2kync");
    			add_location(a0, file$7, 35, 12, 639);
    			add_location(li0, file$7, 35, 8, 635);
    			attr_dev(a1, "href", "");
    			attr_dev(a1, "class", "svelte-r2kync");
    			add_location(a1, file$7, 36, 12, 684);
    			add_location(li1, file$7, 36, 8, 680);
    			attr_dev(a2, "href", "");
    			attr_dev(a2, "class", "svelte-r2kync");
    			add_location(a2, file$7, 37, 12, 724);
    			add_location(li2, file$7, 37, 8, 720);
    			attr_dev(a3, "href", "");
    			attr_dev(a3, "class", "svelte-r2kync");
    			add_location(a3, file$7, 38, 12, 768);
    			add_location(li3, file$7, 38, 8, 764);
    			attr_dev(a4, "href", "");
    			attr_dev(a4, "class", "svelte-r2kync");
    			add_location(a4, file$7, 39, 12, 808);
    			add_location(li4, file$7, 39, 8, 804);
    			attr_dev(ul, "class", "svelte-r2kync");
    			add_location(ul, file$7, 34, 4, 621);
    			attr_dev(div, "class", "menu svelte-r2kync");
    			attr_dev(div, "data-animation", "slideLeft");
    			add_location(div, file$7, 33, 0, 570);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(ul, t1);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(ul, t3);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    			append_dev(ul, t5);
    			append_dev(ul, li3);
    			append_dev(li3, a3);
    			append_dev(ul, t7);
    			append_dev(ul, li4);
    			append_dev(li4, a4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Menu', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Menu> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Menu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Menu",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src\Components\header\Header.svelte generated by Svelte v3.46.4 */
    const file$6 = "src\\Components\\header\\Header.svelte";

    function create_fragment$6(ctx) {
    	let header;
    	let div2;
    	let svg;
    	let g1;
    	let g0;
    	let path0;
    	let path1;
    	let path2;
    	let path3;
    	let path4;
    	let path5;
    	let path6;
    	let path7;
    	let path8;
    	let rect;
    	let t0;
    	let div1;
    	let h1;
    	let t2;
    	let div0;
    	let h20;
    	let t4;
    	let h21;
    	let t6;
    	let menu;
    	let current;
    	menu = new Menu({ $$inline: true });

    	const block = {
    		c: function create() {
    			header = element("header");
    			div2 = element("div");
    			svg = svg_element("svg");
    			g1 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			path5 = svg_element("path");
    			path6 = svg_element("path");
    			path7 = svg_element("path");
    			path8 = svg_element("path");
    			rect = svg_element("rect");
    			t0 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "REPARATOR";
    			t2 = space();
    			div0 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Twoja złota rączka";
    			t4 = space();
    			h21 = element("h2");
    			h21.textContent = "Kontakt 796 777 435";
    			t6 = space();
    			create_component(menu.$$.fragment);
    			attr_dev(path0, "d", "M22.57,37.32l7-5.3a.77.77,0,0,1,.81-.07.78.78,0,0,1,.43.69v.3a15.47,15.47,0,0,1-3.08,9.26,14.93,14.93,0,0,1-8.14,5.48l-.58.13V59.62h2.13a1.85,1.85,0,0,1,1,.31,2.74,2.74,0,0,1,1,1.19,4.13,4.13,0,0,1,.33,1.63,3.79,3.79,0,0,1-.58,2.09,2.35,2.35,0,0,1-.71.73,1.85,1.85,0,0,1-1,.31h-.42s0,.07,0,.11v22.4a7.86,7.86,0,0,1-2.24,5.51,7.49,7.49,0,0,1-10.78,0,7.86,7.86,0,0,1-2.24-5.51V66s0-.08,0-.11H5.05a1.85,1.85,0,0,1-1-.31,2.81,2.81,0,0,1-1-1.19,4.13,4.13,0,0,1-.33-1.63,4,4,0,0,1,.58-2.09A2.47,2.47,0,0,1,4,59.93a1.85,1.85,0,0,1,1-.31H6.89V45.05a15.24,15.24,0,0,1-5.43-8.37A15.66,15.66,0,0,1,1,32.92a15.41,15.41,0,0,1,3.09-9.26,14.8,14.8,0,0,1,8.14-5.48h0a14.59,14.59,0,0,1,8.29.28.8.8,0,0,1,.23,1.39l-7,5.3,1,8.69ZM7,66v22.4a6.25,6.25,0,0,0,1.77,4.39,6,6,0,0,0,8.6,0,6.26,6.26,0,0,0,1.78-4.39V65.88H7Zm-2-4.78a.31.31,0,0,0-.18.06,1.14,1.14,0,0,0-.38.5,2.55,2.55,0,0,0-.19,1A2.24,2.24,0,0,0,4.62,64a1,1,0,0,0,.25.28.42.42,0,0,0,.18.06H21.13a.42.42,0,0,0,.18-.06,1.33,1.33,0,0,0,.38-.51,2.55,2.55,0,0,0,.19-1,2.3,2.3,0,0,0-.32-1.22.78.78,0,0,0-.25-.26.31.31,0,0,0-.18-.06Zm7.41-37.06,6.07-4.59a12.73,12.73,0,0,0-2.62-.27,13.22,13.22,0,0,0-10.6,5.33A13.91,13.91,0,0,0,3,36.29,13.57,13.57,0,0,0,8.17,44a.79.79,0,0,1,.28.88v14.7h9V47.16a.79.79,0,0,1,.65-.78c.37-.07.73-.14,1.1-.24a13.25,13.25,0,0,0,7.29-4.9,13.77,13.77,0,0,0,2.69-7l-6.05,4.58a.76.76,0,0,1-.77.09l-8.67-3.84a.79.79,0,0,1-.46-.64l-1.08-9.59A.82.82,0,0,1,12.46,24.15Z");
    			set_style(path0, "stroke", "#0844a3");
    			set_style(path0, "stroke-miterlimit", "10");
    			set_style(path0, "stroke-width", "2px");
    			attr_dev(path0, "class", "svelte-9hhfh6");
    			add_location(path0, file$6, 65, 20, 1637);
    			attr_dev(path1, "d", "M110.05.5H12.17A1.16,1.16,0,0,0,11,1.65v9.59h2.31V2.8H108.9V82h-73v2.3h74.11a1.15,1.15,0,0,0,1.16-1.15V1.65A1.16,1.16,0,0,0,110.05.5Z");
    			set_style(path1, "stroke", "#0844a3");
    			set_style(path1, "stroke-miterlimit", "10");
    			attr_dev(path1, "class", "svelte-9hhfh6");
    			add_location(path1, file$6, 66, 20, 3155);
    			attr_dev(path2, "d", "M61.75.69a1.16,1.16,0,0,0-1.6.32L39.25,32.42H35.94v2.3h3.93a1.17,1.17,0,0,0,1-.51L62.07,2.29A1.16,1.16,0,0,0,61.75.69Z");
    			set_style(path2, "stroke", "#0844a3");
    			set_style(path2, "stroke-miterlimit", "10");
    			attr_dev(path2, "class", "svelte-9hhfh6");
    			add_location(path2, file$6, 67, 20, 3366);
    			attr_dev(path3, "d", "M110.05,34.72H82.35a1.17,1.17,0,0,1-1-.51L60.15,2.29A1.15,1.15,0,0,1,62.07,1L83,32.42h27.08a1.15,1.15,0,1,1,0,2.3");
    			set_style(path3, "stroke", "#0844a3");
    			set_style(path3, "stroke-miterlimit", "10");
    			attr_dev(path3, "class", "svelte-9hhfh6");
    			add_location(path3, file$6, 68, 20, 3562);
    			attr_dev(path4, "d", "M42.87,84.3a1.14,1.14,0,0,1-1.15-1.15V29.37a1.15,1.15,0,0,1,2.3,0V83.15a1.15,1.15,0,0,1-1.15,1.15");
    			set_style(path4, "stroke", "#0844a3");
    			set_style(path4, "stroke-miterlimit", "10");
    			attr_dev(path4, "class", "svelte-9hhfh6");
    			add_location(path4, file$6, 69, 20, 3753);
    			attr_dev(path5, "d", "M79.35,84.3a1.15,1.15,0,0,1-1.15-1.15V29.37a1.15,1.15,0,0,1,2.3,0V83.15a1.14,1.14,0,0,1-1.15,1.15");
    			set_style(path5, "stroke", "#0844a3");
    			set_style(path5, "stroke-miterlimit", "10");
    			attr_dev(path5, "class", "svelte-9hhfh6");
    			add_location(path5, file$6, 70, 20, 3928);
    			attr_dev(path6, "d", "M65.72,45.55H56.5a.57.57,0,0,1-.57-.58V22.39a.57.57,0,0,1,.57-.57h9.22a.57.57,0,0,1,.57.57V45a.57.57,0,0,1-.57.58m-8.64-1.16h8.06V23H57.08Z");
    			set_style(path6, "stroke", "#0844a3");
    			set_style(path6, "stroke-miterlimit", "10");
    			set_style(path6, "stroke-width", "2px");
    			attr_dev(path6, "class", "svelte-9hhfh6");
    			add_location(path6, file$6, 70, 173, 4081);
    			attr_dev(path7, "d", "M65.72,76H56.5a.56.56,0,0,1-.57-.57V52.8a.56.56,0,0,1,.57-.57h9.22a.56.56,0,0,1,.57.57V75.38a.56.56,0,0,1-.57.57M57.08,74.8h8.06V53.38H57.08Z");
    			set_style(path7, "stroke", "#0844a3");
    			set_style(path7, "stroke-miterlimit", "10");
    			set_style(path7, "stroke-width", "2px");
    			attr_dev(path7, "class", "svelte-9hhfh6");
    			add_location(path7, file$6, 70, 385, 4293);
    			attr_dev(path8, "d", "M100.39,68.69H89.1a.58.58,0,0,1-.58-.58V45a.58.58,0,0,1,.58-.58h11.29A.57.57,0,0,1,101,45V68.11a.57.57,0,0,1-.57.58M89.68,67.54H99.81v-22H89.68Z");
    			set_style(path8, "stroke", "#0844a3");
    			set_style(path8, "stroke-miterlimit", "10");
    			set_style(path8, "stroke-width", "2px");
    			attr_dev(path8, "class", "svelte-9hhfh6");
    			add_location(path8, file$6, 71, 20, 4529);
    			attr_dev(rect, "x", "0.02");
    			attr_dev(rect, "y", "11.24");
    			attr_dev(rect, "width", "35.92");
    			attr_dev(rect, "height", "87.16");
    			set_style(rect, "fill", "none");
    			attr_dev(rect, "class", "svelte-9hhfh6");
    			add_location(rect, file$6, 72, 20, 4768);
    			attr_dev(g0, "id", "f0f7ea7c-b89b-40dc-9d17-fb178b9436d2");
    			attr_dev(g0, "data-name", "Warstwa 1");
    			attr_dev(g0, "class", "svelte-9hhfh6");
    			add_location(g0, file$6, 64, 16, 1548);
    			attr_dev(g1, "id", "e8bdef0a-3dd8-40f2-814f-e713fe868088");
    			attr_dev(g1, "data-name", "Warstwa 2");
    			attr_dev(g1, "class", "svelte-9hhfh6");
    			add_location(g1, file$6, 63, 12, 1463);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 111.71 98.4");
    			attr_dev(svg, "data-animation", "draw");
    			attr_dev(svg, "data-newclass", "logo-svg-after");
    			attr_dev(svg, "class", "svelte-9hhfh6");
    			add_location(svg, file$6, 62, 8, 1330);
    			attr_dev(h1, "class", "svelte-9hhfh6");
    			add_location(h1, file$6, 77, 12, 4944);
    			attr_dev(h20, "class", "svelte-9hhfh6");
    			add_location(h20, file$6, 79, 16, 4999);
    			attr_dev(h21, "class", "svelte-9hhfh6");
    			add_location(h21, file$6, 80, 16, 5044);
    			attr_dev(div0, "class", "svelte-9hhfh6");
    			add_location(div0, file$6, 78, 12, 4976);
    			attr_dev(div1, "class", "logoTexts svelte-9hhfh6");
    			add_location(div1, file$6, 76, 8, 4907);
    			attr_dev(div2, "class", "container svelte-9hhfh6");
    			add_location(div2, file$6, 61, 4, 1297);
    			attr_dev(header, "class", "svelte-9hhfh6");
    			add_location(header, file$6, 60, 0, 1283);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, div2);
    			append_dev(div2, svg);
    			append_dev(svg, g1);
    			append_dev(g1, g0);
    			append_dev(g0, path0);
    			append_dev(g0, path1);
    			append_dev(g0, path2);
    			append_dev(g0, path3);
    			append_dev(g0, path4);
    			append_dev(g0, path5);
    			append_dev(g0, path6);
    			append_dev(g0, path7);
    			append_dev(g0, path8);
    			append_dev(g0, rect);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, h1);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, h20);
    			append_dev(div0, t4);
    			append_dev(div0, h21);
    			append_dev(header, t6);
    			mount_component(menu, header, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(menu.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(menu.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			destroy_component(menu);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Menu });
    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    const digitCharacters = [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y",
        "Z",
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m",
        "n",
        "o",
        "p",
        "q",
        "r",
        "s",
        "t",
        "u",
        "v",
        "w",
        "x",
        "y",
        "z",
        "#",
        "$",
        "%",
        "*",
        "+",
        ",",
        "-",
        ".",
        ":",
        ";",
        "=",
        "?",
        "@",
        "[",
        "]",
        "^",
        "_",
        "{",
        "|",
        "}",
        "~"
    ];
    const decode83 = (str) => {
        let value = 0;
        for (let i = 0; i < str.length; i++) {
            const c = str[i];
            const digit = digitCharacters.indexOf(c);
            value = value * 83 + digit;
        }
        return value;
    };

    const sRGBToLinear = (value) => {
        let v = value / 255;
        if (v <= 0.04045) {
            return v / 12.92;
        }
        else {
            return Math.pow((v + 0.055) / 1.055, 2.4);
        }
    };
    const linearTosRGB = (value) => {
        let v = Math.max(0, Math.min(1, value));
        if (v <= 0.0031308) {
            return Math.round(v * 12.92 * 255 + 0.5);
        }
        else {
            return Math.round((1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255 + 0.5);
        }
    };
    const sign = (n) => (n < 0 ? -1 : 1);
    const signPow = (val, exp) => sign(val) * Math.pow(Math.abs(val), exp);

    class ValidationError extends Error {
        constructor(message) {
            super(message);
            this.name = "ValidationError";
            this.message = message;
        }
    }

    /**
     * Returns an error message if invalid or undefined if valid
     * @param blurhash
     */
    const validateBlurhash = (blurhash) => {
        if (!blurhash || blurhash.length < 6) {
            throw new ValidationError("The blurhash string must be at least 6 characters");
        }
        const sizeFlag = decode83(blurhash[0]);
        const numY = Math.floor(sizeFlag / 9) + 1;
        const numX = (sizeFlag % 9) + 1;
        if (blurhash.length !== 4 + 2 * numX * numY) {
            throw new ValidationError(`blurhash length mismatch: length is ${blurhash.length} but it should be ${4 + 2 * numX * numY}`);
        }
    };
    const decodeDC = (value) => {
        const intR = value >> 16;
        const intG = (value >> 8) & 255;
        const intB = value & 255;
        return [sRGBToLinear(intR), sRGBToLinear(intG), sRGBToLinear(intB)];
    };
    const decodeAC = (value, maximumValue) => {
        const quantR = Math.floor(value / (19 * 19));
        const quantG = Math.floor(value / 19) % 19;
        const quantB = value % 19;
        const rgb = [
            signPow((quantR - 9) / 9, 2.0) * maximumValue,
            signPow((quantG - 9) / 9, 2.0) * maximumValue,
            signPow((quantB - 9) / 9, 2.0) * maximumValue
        ];
        return rgb;
    };
    const decode = (blurhash, width, height, punch) => {
        validateBlurhash(blurhash);
        punch = punch | 1;
        const sizeFlag = decode83(blurhash[0]);
        const numY = Math.floor(sizeFlag / 9) + 1;
        const numX = (sizeFlag % 9) + 1;
        const quantisedMaximumValue = decode83(blurhash[1]);
        const maximumValue = (quantisedMaximumValue + 1) / 166;
        const colors = new Array(numX * numY);
        for (let i = 0; i < colors.length; i++) {
            if (i === 0) {
                const value = decode83(blurhash.substring(2, 6));
                colors[i] = decodeDC(value);
            }
            else {
                const value = decode83(blurhash.substring(4 + i * 2, 6 + i * 2));
                colors[i] = decodeAC(value, maximumValue * punch);
            }
        }
        const bytesPerRow = width * 4;
        const pixels = new Uint8ClampedArray(bytesPerRow * height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0;
                let g = 0;
                let b = 0;
                for (let j = 0; j < numY; j++) {
                    for (let i = 0; i < numX; i++) {
                        const basis = Math.cos((Math.PI * x * i) / width) *
                            Math.cos((Math.PI * y * j) / height);
                        let color = colors[i + j * numX];
                        r += color[0] * basis;
                        g += color[1] * basis;
                        b += color[2] * basis;
                    }
                }
                let intR = linearTosRGB(r);
                let intG = linearTosRGB(g);
                let intB = linearTosRGB(b);
                pixels[4 * x + 0 + y * bytesPerRow] = intR;
                pixels[4 * x + 1 + y * bytesPerRow] = intG;
                pixels[4 * x + 2 + y * bytesPerRow] = intB;
                pixels[4 * x + 3 + y * bytesPerRow] = 255; // alpha
            }
        }
        return pixels;
    };
    var decode$1 = decode;

    /* node_modules\svelte-waypoint\src\Waypoint.svelte generated by Svelte v3.46.4 */
    const file$5 = "node_modules\\svelte-waypoint\\src\\Waypoint.svelte";

    // (139:2) {#if visible}
    function create_if_block$2(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[10],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[10])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[10], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(139:2) {#if visible}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*visible*/ ctx[3] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", div_class_value = "wrapper " + /*className*/ ctx[2] + " " + /*c*/ ctx[0] + " svelte-142y8oi");
    			attr_dev(div, "style", /*style*/ ctx[1]);
    			add_location(div, file$5, 137, 0, 3091);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(/*waypoint*/ ctx[4].call(null, div));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*visible*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*visible*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*className, c*/ 5 && div_class_value !== (div_class_value = "wrapper " + /*className*/ ctx[2] + " " + /*c*/ ctx[0] + " svelte-142y8oi")) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (!current || dirty & /*style*/ 2) {
    				attr_dev(div, "style", /*style*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function throttleFn(fn, time) {
    	let last, deferTimer;

    	return () => {
    		const now = +new Date();

    		if (last && now < last + time) {
    			// hold on to it
    			clearTimeout(deferTimer);

    			deferTimer = setTimeout(
    				function () {
    					last = now;
    					fn();
    				},
    				time
    			);
    		} else {
    			last = now;
    			fn();
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Waypoint', slots, ['default']);
    	const dispatch = createEventDispatcher();
    	let { offset = 0 } = $$props;
    	let { throttle = 250 } = $$props;
    	let { c = '' } = $$props;
    	let { style = '' } = $$props;
    	let { once = true } = $$props;
    	let { threshold = 1.0 } = $$props;
    	let { disabled = false } = $$props;
    	let { class: className = "" } = $$props;
    	let visible = disabled;
    	let wasVisible = false;
    	let intersecting = false;

    	let removeHandlers = () => {
    		
    	};

    	function callEvents(wasVisible, observer, node) {
    		if (visible && !wasVisible) {
    			dispatch('enter');
    			return;
    		}

    		if (wasVisible && !intersecting) {
    			dispatch('leave');
    		}

    		if (once && wasVisible && !intersecting) {
    			removeHandlers();
    		}
    	}

    	function waypoint(node) {
    		if (!window || disabled) return;

    		if (window.IntersectionObserver && window.IntersectionObserverEntry) {
    			const observer = new IntersectionObserver(([{ isIntersecting }]) => {
    					wasVisible = visible;
    					intersecting = isIntersecting;

    					if (wasVisible && once && !isIntersecting) {
    						callEvents(wasVisible);
    						return;
    					}

    					$$invalidate(3, visible = isIntersecting);
    					callEvents(wasVisible);
    				},
    			{ rootMargin: offset + 'px', threshold });

    			observer.observe(node);
    			removeHandlers = () => observer.unobserve(node);
    			return removeHandlers;
    		}

    		function checkIsVisible() {
    			// Kudos https://github.com/twobin/react-lazyload/blob/master/src/index.jsx#L93
    			if (!(node.offsetWidth || node.offsetHeight || node.getClientRects().length)) return;

    			let top;
    			let height;

    			try {
    				({ top, height } = node.getBoundingClientRect());
    			} catch(e) {
    				({ top, height } = defaultBoundingClientRect);
    			}

    			const windowInnerHeight = window.innerHeight || document.documentElement.clientHeight;
    			wasVisible = visible;
    			intersecting = top - offset <= windowInnerHeight && top + height + offset >= 0;

    			if (wasVisible && once && !isIntersecting) {
    				callEvents(wasVisible, observer);
    				return;
    			}

    			$$invalidate(3, visible = intersecting);
    			callEvents(wasVisible);
    		}

    		checkIsVisible();
    		const throttled = throttleFn(checkIsVisible, throttle);
    		window.addEventListener('scroll', throttled);
    		window.addEventListener('resize', throttled);

    		removeHandlers = () => {
    			window.removeEventListener('scroll', throttled);
    			window.removeEventListener('resize', throttled);
    		};

    		return removeHandlers;
    	}

    	const writable_props = ['offset', 'throttle', 'c', 'style', 'once', 'threshold', 'disabled', 'class'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Waypoint> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('offset' in $$props) $$invalidate(5, offset = $$props.offset);
    		if ('throttle' in $$props) $$invalidate(6, throttle = $$props.throttle);
    		if ('c' in $$props) $$invalidate(0, c = $$props.c);
    		if ('style' in $$props) $$invalidate(1, style = $$props.style);
    		if ('once' in $$props) $$invalidate(7, once = $$props.once);
    		if ('threshold' in $$props) $$invalidate(8, threshold = $$props.threshold);
    		if ('disabled' in $$props) $$invalidate(9, disabled = $$props.disabled);
    		if ('class' in $$props) $$invalidate(2, className = $$props.class);
    		if ('$$scope' in $$props) $$invalidate(10, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		onDestroy,
    		dispatch,
    		offset,
    		throttle,
    		c,
    		style,
    		once,
    		threshold,
    		disabled,
    		className,
    		visible,
    		wasVisible,
    		intersecting,
    		removeHandlers,
    		throttleFn,
    		callEvents,
    		waypoint
    	});

    	$$self.$inject_state = $$props => {
    		if ('offset' in $$props) $$invalidate(5, offset = $$props.offset);
    		if ('throttle' in $$props) $$invalidate(6, throttle = $$props.throttle);
    		if ('c' in $$props) $$invalidate(0, c = $$props.c);
    		if ('style' in $$props) $$invalidate(1, style = $$props.style);
    		if ('once' in $$props) $$invalidate(7, once = $$props.once);
    		if ('threshold' in $$props) $$invalidate(8, threshold = $$props.threshold);
    		if ('disabled' in $$props) $$invalidate(9, disabled = $$props.disabled);
    		if ('className' in $$props) $$invalidate(2, className = $$props.className);
    		if ('visible' in $$props) $$invalidate(3, visible = $$props.visible);
    		if ('wasVisible' in $$props) wasVisible = $$props.wasVisible;
    		if ('intersecting' in $$props) intersecting = $$props.intersecting;
    		if ('removeHandlers' in $$props) removeHandlers = $$props.removeHandlers;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		c,
    		style,
    		className,
    		visible,
    		waypoint,
    		offset,
    		throttle,
    		once,
    		threshold,
    		disabled,
    		$$scope,
    		slots
    	];
    }

    class Waypoint extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			offset: 5,
    			throttle: 6,
    			c: 0,
    			style: 1,
    			once: 7,
    			threshold: 8,
    			disabled: 9,
    			class: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Waypoint",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get offset() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set offset(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get throttle() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set throttle(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get c() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set c(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get once() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set once(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get threshold() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set threshold(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get class() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-image\src\Image.svelte generated by Svelte v3.46.4 */
    const file$4 = "node_modules\\svelte-image\\src\\Image.svelte";

    // (92:6) {:else}
    function create_else_block(ctx) {
    	let img;
    	let img_class_value;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "class", img_class_value = "placeholder " + /*placeholderClass*/ ctx[14] + " svelte-ilz1a1");
    			if (!src_url_equal(img.src, img_src_value = /*src*/ ctx[4])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*alt*/ ctx[1]);
    			toggle_class(img, "blur", /*blur*/ ctx[8]);
    			add_location(img, file$4, 92, 8, 2107);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*placeholderClass*/ 16384 && img_class_value !== (img_class_value = "placeholder " + /*placeholderClass*/ ctx[14] + " svelte-ilz1a1")) {
    				attr_dev(img, "class", img_class_value);
    			}

    			if (dirty & /*src*/ 16 && !src_url_equal(img.src, img_src_value = /*src*/ ctx[4])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*alt*/ 2) {
    				attr_dev(img, "alt", /*alt*/ ctx[1]);
    			}

    			if (dirty & /*placeholderClass, blur*/ 16640) {
    				toggle_class(img, "blur", /*blur*/ ctx[8]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(92:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (90:6) {#if blurhash}
    function create_if_block$1(ctx) {
    	let canvas;
    	let canvas_width_value;
    	let canvas_height_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			canvas = element("canvas");
    			attr_dev(canvas, "class", "placeholder svelte-ilz1a1");
    			attr_dev(canvas, "width", canvas_width_value = /*blurhashSize*/ ctx[16].width);
    			attr_dev(canvas, "height", canvas_height_value = /*blurhashSize*/ ctx[16].height);
    			add_location(canvas, file$4, 90, 8, 1979);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, canvas, anchor);

    			if (!mounted) {
    				dispose = action_destroyer(/*decodeBlurhash*/ ctx[20].call(null, canvas));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*blurhashSize*/ 65536 && canvas_width_value !== (canvas_width_value = /*blurhashSize*/ ctx[16].width)) {
    				attr_dev(canvas, "width", canvas_width_value);
    			}

    			if (dirty & /*blurhashSize*/ 65536 && canvas_height_value !== (canvas_height_value = /*blurhashSize*/ ctx[16].height)) {
    				attr_dev(canvas, "height", canvas_height_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(canvas);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(90:6) {#if blurhash}",
    		ctx
    	});

    	return block;
    }

    // (79:0) <Waypoint   class="{wrapperClass}"   style="min-height: 100px; width: 100%;"   once   {threshold}   {offset}   disabled="{!lazy}" >
    function create_default_slot$1(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let picture;
    	let source0;
    	let t2;
    	let source1;
    	let t3;
    	let img;
    	let img_src_value;
    	let img_class_value;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*blurhash*/ ctx[15]) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			if_block.c();
    			t1 = space();
    			picture = element("picture");
    			source0 = element("source");
    			t2 = space();
    			source1 = element("source");
    			t3 = space();
    			img = element("img");
    			set_style(div0, "width", "100%");
    			set_style(div0, "padding-bottom", /*ratio*/ ctx[7]);
    			add_location(div0, file$4, 88, 6, 1895);
    			attr_dev(source0, "type", "image/webp");
    			attr_dev(source0, "srcset", /*srcsetWebp*/ ctx[6]);
    			attr_dev(source0, "sizes", /*sizes*/ ctx[9]);
    			add_location(source0, file$4, 95, 8, 2213);
    			attr_dev(source1, "srcset", /*srcset*/ ctx[5]);
    			attr_dev(source1, "sizes", /*sizes*/ ctx[9]);
    			add_location(source1, file$4, 96, 8, 2280);
    			if (!src_url_equal(img.src, img_src_value = /*src*/ ctx[4])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", img_class_value = "main " + /*c*/ ctx[0] + " " + /*className*/ ctx[17] + " svelte-ilz1a1");
    			attr_dev(img, "alt", /*alt*/ ctx[1]);
    			attr_dev(img, "width", /*width*/ ctx[2]);
    			attr_dev(img, "height", /*height*/ ctx[3]);
    			add_location(img, file$4, 97, 8, 2316);
    			add_location(picture, file$4, 94, 6, 2195);
    			set_style(div1, "position", "relative");
    			set_style(div1, "overflow", "hidden");
    			add_location(div1, file$4, 87, 4, 1837);
    			set_style(div2, "position", "relative");
    			set_style(div2, "width", "100%");
    			attr_dev(div2, "class", "svelte-ilz1a1");
    			toggle_class(div2, "loaded", /*loaded*/ ctx[18]);
    			add_location(div2, file$4, 86, 2, 1773);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t0);
    			if_block.m(div1, null);
    			append_dev(div1, t1);
    			append_dev(div1, picture);
    			append_dev(picture, source0);
    			append_dev(picture, t2);
    			append_dev(picture, source1);
    			append_dev(picture, t3);
    			append_dev(picture, img);

    			if (!mounted) {
    				dispose = action_destroyer(/*load*/ ctx[19].call(null, img));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*ratio*/ 128) {
    				set_style(div0, "padding-bottom", /*ratio*/ ctx[7]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, t1);
    				}
    			}

    			if (dirty & /*srcsetWebp*/ 64) {
    				attr_dev(source0, "srcset", /*srcsetWebp*/ ctx[6]);
    			}

    			if (dirty & /*sizes*/ 512) {
    				attr_dev(source0, "sizes", /*sizes*/ ctx[9]);
    			}

    			if (dirty & /*srcset*/ 32) {
    				attr_dev(source1, "srcset", /*srcset*/ ctx[5]);
    			}

    			if (dirty & /*sizes*/ 512) {
    				attr_dev(source1, "sizes", /*sizes*/ ctx[9]);
    			}

    			if (dirty & /*src*/ 16 && !src_url_equal(img.src, img_src_value = /*src*/ ctx[4])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*c, className*/ 131073 && img_class_value !== (img_class_value = "main " + /*c*/ ctx[0] + " " + /*className*/ ctx[17] + " svelte-ilz1a1")) {
    				attr_dev(img, "class", img_class_value);
    			}

    			if (dirty & /*alt*/ 2) {
    				attr_dev(img, "alt", /*alt*/ ctx[1]);
    			}

    			if (dirty & /*width*/ 4) {
    				attr_dev(img, "width", /*width*/ ctx[2]);
    			}

    			if (dirty & /*height*/ 8) {
    				attr_dev(img, "height", /*height*/ ctx[3]);
    			}

    			if (dirty & /*loaded*/ 262144) {
    				toggle_class(div2, "loaded", /*loaded*/ ctx[18]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(79:0) <Waypoint   class=\\\"{wrapperClass}\\\"   style=\\\"min-height: 100px; width: 100%;\\\"   once   {threshold}   {offset}   disabled=\\\"{!lazy}\\\" >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let waypoint;
    	let current;

    	waypoint = new Waypoint({
    			props: {
    				class: /*wrapperClass*/ ctx[13],
    				style: "min-height: 100px; width: 100%;",
    				once: true,
    				threshold: /*threshold*/ ctx[11],
    				offset: /*offset*/ ctx[10],
    				disabled: !/*lazy*/ ctx[12],
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(waypoint.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(waypoint, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const waypoint_changes = {};
    			if (dirty & /*wrapperClass*/ 8192) waypoint_changes.class = /*wrapperClass*/ ctx[13];
    			if (dirty & /*threshold*/ 2048) waypoint_changes.threshold = /*threshold*/ ctx[11];
    			if (dirty & /*offset*/ 1024) waypoint_changes.offset = /*offset*/ ctx[10];
    			if (dirty & /*lazy*/ 4096) waypoint_changes.disabled = !/*lazy*/ ctx[12];

    			if (dirty & /*$$scope, loaded, src, c, className, alt, width, height, srcset, sizes, srcsetWebp, blurhashSize, blurhash, placeholderClass, blur, ratio*/ 2606079) {
    				waypoint_changes.$$scope = { dirty, ctx };
    			}

    			waypoint.$set(waypoint_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(waypoint.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(waypoint.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(waypoint, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Image', slots, []);
    	let { c = "" } = $$props;
    	let { alt = "" } = $$props;
    	let { width = null } = $$props;
    	let { height = null } = $$props;
    	let { src = "" } = $$props;
    	let { srcset = "" } = $$props;
    	let { srcsetWebp = "" } = $$props;
    	let { ratio = "100%" } = $$props;
    	let { blur = true } = $$props;
    	let { sizes = "(max-width: 1000px) 100vw, 1000px" } = $$props;
    	let { offset = 0 } = $$props;
    	let { threshold = 1.0 } = $$props;
    	let { lazy = true } = $$props;
    	let { wrapperClass = "" } = $$props;
    	let { placeholderClass = "" } = $$props;
    	let { blurhash = null } = $$props;
    	let { blurhashSize = null } = $$props;
    	let { class: className = "" } = $$props;
    	let loaded = !lazy;

    	function load(img) {
    		img.onload = () => $$invalidate(18, loaded = true);
    	}

    	function decodeBlurhash(canvas) {
    		const pixels = decode$1(blurhash, blurhashSize.width, blurhashSize.height);
    		const ctx = canvas.getContext('2d');
    		const imageData = ctx.createImageData(blurhashSize.width, blurhashSize.height);
    		imageData.data.set(pixels);
    		ctx.putImageData(imageData, 0, 0);
    	}

    	const writable_props = [
    		'c',
    		'alt',
    		'width',
    		'height',
    		'src',
    		'srcset',
    		'srcsetWebp',
    		'ratio',
    		'blur',
    		'sizes',
    		'offset',
    		'threshold',
    		'lazy',
    		'wrapperClass',
    		'placeholderClass',
    		'blurhash',
    		'blurhashSize',
    		'class'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Image> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('c' in $$props) $$invalidate(0, c = $$props.c);
    		if ('alt' in $$props) $$invalidate(1, alt = $$props.alt);
    		if ('width' in $$props) $$invalidate(2, width = $$props.width);
    		if ('height' in $$props) $$invalidate(3, height = $$props.height);
    		if ('src' in $$props) $$invalidate(4, src = $$props.src);
    		if ('srcset' in $$props) $$invalidate(5, srcset = $$props.srcset);
    		if ('srcsetWebp' in $$props) $$invalidate(6, srcsetWebp = $$props.srcsetWebp);
    		if ('ratio' in $$props) $$invalidate(7, ratio = $$props.ratio);
    		if ('blur' in $$props) $$invalidate(8, blur = $$props.blur);
    		if ('sizes' in $$props) $$invalidate(9, sizes = $$props.sizes);
    		if ('offset' in $$props) $$invalidate(10, offset = $$props.offset);
    		if ('threshold' in $$props) $$invalidate(11, threshold = $$props.threshold);
    		if ('lazy' in $$props) $$invalidate(12, lazy = $$props.lazy);
    		if ('wrapperClass' in $$props) $$invalidate(13, wrapperClass = $$props.wrapperClass);
    		if ('placeholderClass' in $$props) $$invalidate(14, placeholderClass = $$props.placeholderClass);
    		if ('blurhash' in $$props) $$invalidate(15, blurhash = $$props.blurhash);
    		if ('blurhashSize' in $$props) $$invalidate(16, blurhashSize = $$props.blurhashSize);
    		if ('class' in $$props) $$invalidate(17, className = $$props.class);
    	};

    	$$self.$capture_state = () => ({
    		decode: decode$1,
    		Waypoint,
    		c,
    		alt,
    		width,
    		height,
    		src,
    		srcset,
    		srcsetWebp,
    		ratio,
    		blur,
    		sizes,
    		offset,
    		threshold,
    		lazy,
    		wrapperClass,
    		placeholderClass,
    		blurhash,
    		blurhashSize,
    		className,
    		loaded,
    		load,
    		decodeBlurhash
    	});

    	$$self.$inject_state = $$props => {
    		if ('c' in $$props) $$invalidate(0, c = $$props.c);
    		if ('alt' in $$props) $$invalidate(1, alt = $$props.alt);
    		if ('width' in $$props) $$invalidate(2, width = $$props.width);
    		if ('height' in $$props) $$invalidate(3, height = $$props.height);
    		if ('src' in $$props) $$invalidate(4, src = $$props.src);
    		if ('srcset' in $$props) $$invalidate(5, srcset = $$props.srcset);
    		if ('srcsetWebp' in $$props) $$invalidate(6, srcsetWebp = $$props.srcsetWebp);
    		if ('ratio' in $$props) $$invalidate(7, ratio = $$props.ratio);
    		if ('blur' in $$props) $$invalidate(8, blur = $$props.blur);
    		if ('sizes' in $$props) $$invalidate(9, sizes = $$props.sizes);
    		if ('offset' in $$props) $$invalidate(10, offset = $$props.offset);
    		if ('threshold' in $$props) $$invalidate(11, threshold = $$props.threshold);
    		if ('lazy' in $$props) $$invalidate(12, lazy = $$props.lazy);
    		if ('wrapperClass' in $$props) $$invalidate(13, wrapperClass = $$props.wrapperClass);
    		if ('placeholderClass' in $$props) $$invalidate(14, placeholderClass = $$props.placeholderClass);
    		if ('blurhash' in $$props) $$invalidate(15, blurhash = $$props.blurhash);
    		if ('blurhashSize' in $$props) $$invalidate(16, blurhashSize = $$props.blurhashSize);
    		if ('className' in $$props) $$invalidate(17, className = $$props.className);
    		if ('loaded' in $$props) $$invalidate(18, loaded = $$props.loaded);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		c,
    		alt,
    		width,
    		height,
    		src,
    		srcset,
    		srcsetWebp,
    		ratio,
    		blur,
    		sizes,
    		offset,
    		threshold,
    		lazy,
    		wrapperClass,
    		placeholderClass,
    		blurhash,
    		blurhashSize,
    		className,
    		loaded,
    		load,
    		decodeBlurhash
    	];
    }

    class Image extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			c: 0,
    			alt: 1,
    			width: 2,
    			height: 3,
    			src: 4,
    			srcset: 5,
    			srcsetWebp: 6,
    			ratio: 7,
    			blur: 8,
    			sizes: 9,
    			offset: 10,
    			threshold: 11,
    			lazy: 12,
    			wrapperClass: 13,
    			placeholderClass: 14,
    			blurhash: 15,
    			blurhashSize: 16,
    			class: 17
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Image",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get c() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set c(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get alt() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set alt(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get src() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set src(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get srcset() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set srcset(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get srcsetWebp() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set srcsetWebp(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ratio() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ratio(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get blur() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set blur(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sizes() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sizes(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get offset() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set offset(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get threshold() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set threshold(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lazy() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lazy(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get wrapperClass() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set wrapperClass(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholderClass() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholderClass(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get blurhash() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set blurhash(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get blurhashSize() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set blurhashSize(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get class() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\imgBg\ImgBg.svelte generated by Svelte v3.46.4 */
    const file$3 = "src\\Components\\imgBg\\ImgBg.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let t;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = space();
    			img = element("img");
    			attr_dev(div, "class", "svelte-tt39jf");
    			add_location(div, file$3, 21, 0, 381);
    			if (!src_url_equal(img.src, img_src_value = /*src*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "data-parallax", 0.5);
    			attr_dev(img, "class", "svelte-tt39jf");
    			add_location(img, file$3, 22, 0, 394);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*src*/ 1 && !src_url_equal(img.src, img_src_value = /*src*/ ctx[0])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ImgBg', slots, []);
    	let { src } = $$props;
    	const writable_props = ['src'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ImgBg> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('src' in $$props) $$invalidate(0, src = $$props.src);
    	};

    	$$self.$capture_state = () => ({ Image, src });

    	$$self.$inject_state = $$props => {
    		if ('src' in $$props) $$invalidate(0, src = $$props.src);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [src];
    }

    class ImgBg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { src: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ImgBg",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*src*/ ctx[0] === undefined && !('src' in props)) {
    			console.warn("<ImgBg> was created without expected prop 'src'");
    		}
    	}

    	get src() {
    		throw new Error("<ImgBg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set src(value) {
    		throw new Error("<ImgBg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\segmentedElement\segmentedElement.svelte generated by Svelte v3.46.4 */
    const file$2 = "src\\Components\\segmentedElement\\segmentedElement.svelte";

    // (25:4) {#if bg}
    function create_if_block(ctx) {
    	let imgbg;
    	let current;

    	imgbg = new ImgBg({
    			props: { src: /*bg*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(imgbg.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(imgbg, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const imgbg_changes = {};
    			if (dirty & /*bg*/ 1) imgbg_changes.src = /*bg*/ ctx[0];
    			imgbg.$set(imgbg_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(imgbg.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(imgbg.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(imgbg, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(25:4) {#if bg}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let section;
    	let t;
    	let div;
    	let current;
    	let if_block = /*bg*/ ctx[0] && create_if_block(ctx);
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			section = element("section");
    			if (if_block) if_block.c();
    			t = space();
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "svelte-3911fz");
    			add_location(div, file$2, 27, 4, 510);
    			attr_dev(section, "class", "segmentedElement svelte-3911fz");
    			add_location(section, file$2, 23, 0, 415);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			if (if_block) if_block.m(section, null);
    			append_dev(section, t);
    			append_dev(section, div);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*bg*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*bg*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(section, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[1],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SegmentedElement', slots, ['default']);
    	let { bg } = $$props;
    	const writable_props = ['bg'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SegmentedElement> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('bg' in $$props) $$invalidate(0, bg = $$props.bg);
    		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ ImgBg, bg });

    	$$self.$inject_state = $$props => {
    		if ('bg' in $$props) $$invalidate(0, bg = $$props.bg);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [bg, $$scope, slots];
    }

    class SegmentedElement extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { bg: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SegmentedElement",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*bg*/ ctx[0] === undefined && !('bg' in props)) {
    			console.warn("<SegmentedElement> was created without expected prop 'bg'");
    		}
    	}

    	get bg() {
    		throw new Error("<SegmentedElement>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bg(value) {
    		throw new Error("<SegmentedElement>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\textContainer\textContainer.svelte generated by Svelte v3.46.4 */

    const file$1 = "src\\Components\\textContainer\\textContainer.svelte";

    function create_fragment$1(ctx) {
    	let section;
    	let div;
    	let t;
    	let img;
    	let img_src_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			section = element("section");
    			div = element("div");
    			if (default_slot) default_slot.c();
    			t = space();
    			img = element("img");
    			attr_dev(div, "class", "textContainer svelte-d3rn2r");
    			add_location(div, file$1, 36, 4, 585);
    			if (!src_url_equal(img.src, img_src_value = "./media/pants.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "svelte-d3rn2r");
    			add_location(img, file$1, 39, 4, 648);
    			attr_dev(section, "class", "svelte-d3rn2r");
    			add_location(section, file$1, 35, 0, 570);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			append_dev(section, t);
    			append_dev(section, img);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TextContainer', slots, ['default']);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TextContainer> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class TextContainer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TextContainer",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    function naturalize(number) {
        if(number < 0 || !number) {
            return 0;
        } else {
            return number;
        }
    }

    function getOffset(element) {
        if (!element.getClientRects().length)
        {
          return { top: 0, left: 0 };
        }

        let rect = element.getBoundingClientRect();
        let win = element.ownerDocument.defaultView;
        return (
        {
          top: rect.top + win.pageYOffset,
          left: rect.left + win.pageXOffset
        });   
    }

    function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

    function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

    /*!
     * GSAP 3.9.1
     * https://greensock.com
     *
     * @license Copyright 2008-2021, GreenSock. All rights reserved.
     * Subject to the terms at https://greensock.com/standard-license or for
     * Club GreenSock members, the agreement issued with that membership.
     * @author: Jack Doyle, jack@greensock.com
    */

    /* eslint-disable */
    var _config = {
      autoSleep: 120,
      force3D: "auto",
      nullTargetWarn: 1,
      units: {
        lineHeight: ""
      }
    },
        _defaults = {
      duration: .5,
      overwrite: false,
      delay: 0
    },
        _suppressOverwrites,
        _bigNum$1 = 1e8,
        _tinyNum = 1 / _bigNum$1,
        _2PI = Math.PI * 2,
        _HALF_PI = _2PI / 4,
        _gsID = 0,
        _sqrt = Math.sqrt,
        _cos = Math.cos,
        _sin = Math.sin,
        _isString = function _isString(value) {
      return typeof value === "string";
    },
        _isFunction = function _isFunction(value) {
      return typeof value === "function";
    },
        _isNumber = function _isNumber(value) {
      return typeof value === "number";
    },
        _isUndefined = function _isUndefined(value) {
      return typeof value === "undefined";
    },
        _isObject = function _isObject(value) {
      return typeof value === "object";
    },
        _isNotFalse = function _isNotFalse(value) {
      return value !== false;
    },
        _windowExists$1 = function _windowExists() {
      return typeof window !== "undefined";
    },
        _isFuncOrString = function _isFuncOrString(value) {
      return _isFunction(value) || _isString(value);
    },
        _isTypedArray = typeof ArrayBuffer === "function" && ArrayBuffer.isView || function () {},
        // note: IE10 has ArrayBuffer, but NOT ArrayBuffer.isView().
    _isArray = Array.isArray,
        _strictNumExp = /(?:-?\.?\d|\.)+/gi,
        //only numbers (including negatives and decimals) but NOT relative values.
    _numExp = /[-+=.]*\d+[.e\-+]*\d*[e\-+]*\d*/g,
        //finds any numbers, including ones that start with += or -=, negative numbers, and ones in scientific notation like 1e-8.
    _numWithUnitExp = /[-+=.]*\d+[.e-]*\d*[a-z%]*/g,
        _complexStringNumExp = /[-+=.]*\d+\.?\d*(?:e-|e\+)?\d*/gi,
        //duplicate so that while we're looping through matches from exec(), it doesn't contaminate the lastIndex of _numExp which we use to search for colors too.
    _relExp = /[+-]=-?[.\d]+/,
        _delimitedValueExp = /[^,'"\[\]\s]+/gi,
        // previously /[#\-+.]*\b[a-z\d\-=+%.]+/gi but didn't catch special characters.
    _unitExp = /[\d.+\-=]+(?:e[-+]\d*)*/i,
        _globalTimeline,
        _win$1,
        _coreInitted,
        _doc$1,
        _globals = {},
        _installScope = {},
        _coreReady,
        _install = function _install(scope) {
      return (_installScope = _merge(scope, _globals)) && gsap;
    },
        _missingPlugin = function _missingPlugin(property, value) {
      return console.warn("Invalid property", property, "set to", value, "Missing plugin? gsap.registerPlugin()");
    },
        _warn = function _warn(message, suppress) {
      return !suppress && console.warn(message);
    },
        _addGlobal = function _addGlobal(name, obj) {
      return name && (_globals[name] = obj) && _installScope && (_installScope[name] = obj) || _globals;
    },
        _emptyFunc = function _emptyFunc() {
      return 0;
    },
        _reservedProps = {},
        _lazyTweens = [],
        _lazyLookup = {},
        _lastRenderedFrame,
        _plugins = {},
        _effects = {},
        _nextGCFrame = 30,
        _harnessPlugins = [],
        _callbackNames = "",
        _harness = function _harness(targets) {
      var target = targets[0],
          harnessPlugin,
          i;
      _isObject(target) || _isFunction(target) || (targets = [targets]);

      if (!(harnessPlugin = (target._gsap || {}).harness)) {
        // find the first target with a harness. We assume targets passed into an animation will be of similar type, meaning the same kind of harness can be used for them all (performance optimization)
        i = _harnessPlugins.length;

        while (i-- && !_harnessPlugins[i].targetTest(target)) {}

        harnessPlugin = _harnessPlugins[i];
      }

      i = targets.length;

      while (i--) {
        targets[i] && (targets[i]._gsap || (targets[i]._gsap = new GSCache(targets[i], harnessPlugin))) || targets.splice(i, 1);
      }

      return targets;
    },
        _getCache = function _getCache(target) {
      return target._gsap || _harness(toArray(target))[0]._gsap;
    },
        _getProperty = function _getProperty(target, property, v) {
      return (v = target[property]) && _isFunction(v) ? target[property]() : _isUndefined(v) && target.getAttribute && target.getAttribute(property) || v;
    },
        _forEachName = function _forEachName(names, func) {
      return (names = names.split(",")).forEach(func) || names;
    },
        //split a comma-delimited list of names into an array, then run a forEach() function and return the split array (this is just a way to consolidate/shorten some code).
    _round = function _round(value) {
      return Math.round(value * 100000) / 100000 || 0;
    },
        _roundPrecise = function _roundPrecise(value) {
      return Math.round(value * 10000000) / 10000000 || 0;
    },
        // increased precision mostly for timing values.
    _arrayContainsAny = function _arrayContainsAny(toSearch, toFind) {
      //searches one array to find matches for any of the items in the toFind array. As soon as one is found, it returns true. It does NOT return all the matches; it's simply a boolean search.
      var l = toFind.length,
          i = 0;

      for (; toSearch.indexOf(toFind[i]) < 0 && ++i < l;) {}

      return i < l;
    },
        _lazyRender = function _lazyRender() {
      var l = _lazyTweens.length,
          a = _lazyTweens.slice(0),
          i,
          tween;

      _lazyLookup = {};
      _lazyTweens.length = 0;

      for (i = 0; i < l; i++) {
        tween = a[i];
        tween && tween._lazy && (tween.render(tween._lazy[0], tween._lazy[1], true)._lazy = 0);
      }
    },
        _lazySafeRender = function _lazySafeRender(animation, time, suppressEvents, force) {
      _lazyTweens.length && _lazyRender();
      animation.render(time, suppressEvents, force);
      _lazyTweens.length && _lazyRender(); //in case rendering caused any tweens to lazy-init, we should render them because typically when someone calls seek() or time() or progress(), they expect an immediate render.
    },
        _numericIfPossible = function _numericIfPossible(value) {
      var n = parseFloat(value);
      return (n || n === 0) && (value + "").match(_delimitedValueExp).length < 2 ? n : _isString(value) ? value.trim() : value;
    },
        _passThrough = function _passThrough(p) {
      return p;
    },
        _setDefaults = function _setDefaults(obj, defaults) {
      for (var p in defaults) {
        p in obj || (obj[p] = defaults[p]);
      }

      return obj;
    },
        _setKeyframeDefaults = function _setKeyframeDefaults(excludeDuration) {
      return function (obj, defaults) {
        for (var p in defaults) {
          p in obj || p === "duration" && excludeDuration || p === "ease" || (obj[p] = defaults[p]);
        }
      };
    },
        _merge = function _merge(base, toMerge) {
      for (var p in toMerge) {
        base[p] = toMerge[p];
      }

      return base;
    },
        _mergeDeep = function _mergeDeep(base, toMerge) {
      for (var p in toMerge) {
        p !== "__proto__" && p !== "constructor" && p !== "prototype" && (base[p] = _isObject(toMerge[p]) ? _mergeDeep(base[p] || (base[p] = {}), toMerge[p]) : toMerge[p]);
      }

      return base;
    },
        _copyExcluding = function _copyExcluding(obj, excluding) {
      var copy = {},
          p;

      for (p in obj) {
        p in excluding || (copy[p] = obj[p]);
      }

      return copy;
    },
        _inheritDefaults = function _inheritDefaults(vars) {
      var parent = vars.parent || _globalTimeline,
          func = vars.keyframes ? _setKeyframeDefaults(_isArray(vars.keyframes)) : _setDefaults;

      if (_isNotFalse(vars.inherit)) {
        while (parent) {
          func(vars, parent.vars.defaults);
          parent = parent.parent || parent._dp;
        }
      }

      return vars;
    },
        _arraysMatch = function _arraysMatch(a1, a2) {
      var i = a1.length,
          match = i === a2.length;

      while (match && i-- && a1[i] === a2[i]) {}

      return i < 0;
    },
        _addLinkedListItem = function _addLinkedListItem(parent, child, firstProp, lastProp, sortBy) {
      if (firstProp === void 0) {
        firstProp = "_first";
      }

      if (lastProp === void 0) {
        lastProp = "_last";
      }

      var prev = parent[lastProp],
          t;

      if (sortBy) {
        t = child[sortBy];

        while (prev && prev[sortBy] > t) {
          prev = prev._prev;
        }
      }

      if (prev) {
        child._next = prev._next;
        prev._next = child;
      } else {
        child._next = parent[firstProp];
        parent[firstProp] = child;
      }

      if (child._next) {
        child._next._prev = child;
      } else {
        parent[lastProp] = child;
      }

      child._prev = prev;
      child.parent = child._dp = parent;
      return child;
    },
        _removeLinkedListItem = function _removeLinkedListItem(parent, child, firstProp, lastProp) {
      if (firstProp === void 0) {
        firstProp = "_first";
      }

      if (lastProp === void 0) {
        lastProp = "_last";
      }

      var prev = child._prev,
          next = child._next;

      if (prev) {
        prev._next = next;
      } else if (parent[firstProp] === child) {
        parent[firstProp] = next;
      }

      if (next) {
        next._prev = prev;
      } else if (parent[lastProp] === child) {
        parent[lastProp] = prev;
      }

      child._next = child._prev = child.parent = null; // don't delete the _dp just so we can revert if necessary. But parent should be null to indicate the item isn't in a linked list.
    },
        _removeFromParent = function _removeFromParent(child, onlyIfParentHasAutoRemove) {
      child.parent && (!onlyIfParentHasAutoRemove || child.parent.autoRemoveChildren) && child.parent.remove(child);
      child._act = 0;
    },
        _uncache = function _uncache(animation, child) {
      if (animation && (!child || child._end > animation._dur || child._start < 0)) {
        // performance optimization: if a child animation is passed in we should only uncache if that child EXTENDS the animation (its end time is beyond the end)
        var a = animation;

        while (a) {
          a._dirty = 1;
          a = a.parent;
        }
      }

      return animation;
    },
        _recacheAncestors = function _recacheAncestors(animation) {
      var parent = animation.parent;

      while (parent && parent.parent) {
        //sometimes we must force a re-sort of all children and update the duration/totalDuration of all ancestor timelines immediately in case, for example, in the middle of a render loop, one tween alters another tween's timeScale which shoves its startTime before 0, forcing the parent timeline to shift around and shiftChildren() which could affect that next tween's render (startTime). Doesn't matter for the root timeline though.
        parent._dirty = 1;
        parent.totalDuration();
        parent = parent.parent;
      }

      return animation;
    },
        _hasNoPausedAncestors = function _hasNoPausedAncestors(animation) {
      return !animation || animation._ts && _hasNoPausedAncestors(animation.parent);
    },
        _elapsedCycleDuration = function _elapsedCycleDuration(animation) {
      return animation._repeat ? _animationCycle(animation._tTime, animation = animation.duration() + animation._rDelay) * animation : 0;
    },
        // feed in the totalTime and cycleDuration and it'll return the cycle (iteration minus 1) and if the playhead is exactly at the very END, it will NOT bump up to the next cycle.
    _animationCycle = function _animationCycle(tTime, cycleDuration) {
      var whole = Math.floor(tTime /= cycleDuration);
      return tTime && whole === tTime ? whole - 1 : whole;
    },
        _parentToChildTotalTime = function _parentToChildTotalTime(parentTime, child) {
      return (parentTime - child._start) * child._ts + (child._ts >= 0 ? 0 : child._dirty ? child.totalDuration() : child._tDur);
    },
        _setEnd = function _setEnd(animation) {
      return animation._end = _roundPrecise(animation._start + (animation._tDur / Math.abs(animation._ts || animation._rts || _tinyNum) || 0));
    },
        _alignPlayhead = function _alignPlayhead(animation, totalTime) {
      // adjusts the animation's _start and _end according to the provided totalTime (only if the parent's smoothChildTiming is true and the animation isn't paused). It doesn't do any rendering or forcing things back into parent timelines, etc. - that's what totalTime() is for.
      var parent = animation._dp;

      if (parent && parent.smoothChildTiming && animation._ts) {
        animation._start = _roundPrecise(parent._time - (animation._ts > 0 ? totalTime / animation._ts : ((animation._dirty ? animation.totalDuration() : animation._tDur) - totalTime) / -animation._ts));

        _setEnd(animation);

        parent._dirty || _uncache(parent, animation); //for performance improvement. If the parent's cache is already dirty, it already took care of marking the ancestors as dirty too, so skip the function call here.
      }

      return animation;
    },

    /*
    _totalTimeToTime = (clampedTotalTime, duration, repeat, repeatDelay, yoyo) => {
    	let cycleDuration = duration + repeatDelay,
    		time = _round(clampedTotalTime % cycleDuration);
    	if (time > duration) {
    		time = duration;
    	}
    	return (yoyo && (~~(clampedTotalTime / cycleDuration) & 1)) ? duration - time : time;
    },
    */
    _postAddChecks = function _postAddChecks(timeline, child) {
      var t;

      if (child._time || child._initted && !child._dur) {
        //in case, for example, the _start is moved on a tween that has already rendered. Imagine it's at its end state, then the startTime is moved WAY later (after the end of this timeline), it should render at its beginning.
        t = _parentToChildTotalTime(timeline.rawTime(), child);

        if (!child._dur || _clamp(0, child.totalDuration(), t) - child._tTime > _tinyNum) {
          child.render(t, true);
        }
      } //if the timeline has already ended but the inserted tween/timeline extends the duration, we should enable this timeline again so that it renders properly. We should also align the playhead with the parent timeline's when appropriate.


      if (_uncache(timeline, child)._dp && timeline._initted && timeline._time >= timeline._dur && timeline._ts) {
        //in case any of the ancestors had completed but should now be enabled...
        if (timeline._dur < timeline.duration()) {
          t = timeline;

          while (t._dp) {
            t.rawTime() >= 0 && t.totalTime(t._tTime); //moves the timeline (shifts its startTime) if necessary, and also enables it. If it's currently zero, though, it may not be scheduled to render until later so there's no need to force it to align with the current playhead position. Only move to catch up with the playhead.

            t = t._dp;
          }
        }

        timeline._zTime = -_tinyNum; // helps ensure that the next render() will be forced (crossingStart = true in render()), even if the duration hasn't changed (we're adding a child which would need to get rendered). Definitely an edge case. Note: we MUST do this AFTER the loop above where the totalTime() might trigger a render() because this _addToTimeline() method gets called from the Animation constructor, BEFORE tweens even record their targets, etc. so we wouldn't want things to get triggered in the wrong order.
      }
    },
        _addToTimeline = function _addToTimeline(timeline, child, position, skipChecks) {
      child.parent && _removeFromParent(child);
      child._start = _roundPrecise((_isNumber(position) ? position : position || timeline !== _globalTimeline ? _parsePosition(timeline, position, child) : timeline._time) + child._delay);
      child._end = _roundPrecise(child._start + (child.totalDuration() / Math.abs(child.timeScale()) || 0));

      _addLinkedListItem(timeline, child, "_first", "_last", timeline._sort ? "_start" : 0);

      _isFromOrFromStart(child) || (timeline._recent = child);
      skipChecks || _postAddChecks(timeline, child);
      return timeline;
    },
        _scrollTrigger = function _scrollTrigger(animation, trigger) {
      return (_globals.ScrollTrigger || _missingPlugin("scrollTrigger", trigger)) && _globals.ScrollTrigger.create(trigger, animation);
    },
        _attemptInitTween = function _attemptInitTween(tween, totalTime, force, suppressEvents) {
      _initTween(tween, totalTime);

      if (!tween._initted) {
        return 1;
      }

      if (!force && tween._pt && (tween._dur && tween.vars.lazy !== false || !tween._dur && tween.vars.lazy) && _lastRenderedFrame !== _ticker.frame) {
        _lazyTweens.push(tween);

        tween._lazy = [totalTime, suppressEvents];
        return 1;
      }
    },
        _parentPlayheadIsBeforeStart = function _parentPlayheadIsBeforeStart(_ref) {
      var parent = _ref.parent;
      return parent && parent._ts && parent._initted && !parent._lock && (parent.rawTime() < 0 || _parentPlayheadIsBeforeStart(parent));
    },
        // check parent's _lock because when a timeline repeats/yoyos and does its artificial wrapping, we shouldn't force the ratio back to 0
    _isFromOrFromStart = function _isFromOrFromStart(_ref2) {
      var data = _ref2.data;
      return data === "isFromStart" || data === "isStart";
    },
        _renderZeroDurationTween = function _renderZeroDurationTween(tween, totalTime, suppressEvents, force) {
      var prevRatio = tween.ratio,
          ratio = totalTime < 0 || !totalTime && (!tween._start && _parentPlayheadIsBeforeStart(tween) && !(!tween._initted && _isFromOrFromStart(tween)) || (tween._ts < 0 || tween._dp._ts < 0) && !_isFromOrFromStart(tween)) ? 0 : 1,
          // if the tween or its parent is reversed and the totalTime is 0, we should go to a ratio of 0. Edge case: if a from() or fromTo() stagger tween is placed later in a timeline, the "startAt" zero-duration tween could initially render at a time when the parent timeline's playhead is technically BEFORE where this tween is, so make sure that any "from" and "fromTo" startAt tweens are rendered the first time at a ratio of 1.
      repeatDelay = tween._rDelay,
          tTime = 0,
          pt,
          iteration,
          prevIteration;

      if (repeatDelay && tween._repeat) {
        // in case there's a zero-duration tween that has a repeat with a repeatDelay
        tTime = _clamp(0, tween._tDur, totalTime);
        iteration = _animationCycle(tTime, repeatDelay);
        tween._yoyo && iteration & 1 && (ratio = 1 - ratio);

        if (iteration !== _animationCycle(tween._tTime, repeatDelay)) {
          // if iteration changed
          prevRatio = 1 - ratio;
          tween.vars.repeatRefresh && tween._initted && tween.invalidate();
        }
      }

      if (ratio !== prevRatio || force || tween._zTime === _tinyNum || !totalTime && tween._zTime) {
        if (!tween._initted && _attemptInitTween(tween, totalTime, force, suppressEvents)) {
          // if we render the very beginning (time == 0) of a fromTo(), we must force the render (normal tweens wouldn't need to render at a time of 0 when the prevTime was also 0). This is also mandatory to make sure overwriting kicks in immediately.
          return;
        }

        prevIteration = tween._zTime;
        tween._zTime = totalTime || (suppressEvents ? _tinyNum : 0); // when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect.

        suppressEvents || (suppressEvents = totalTime && !prevIteration); // if it was rendered previously at exactly 0 (_zTime) and now the playhead is moving away, DON'T fire callbacks otherwise they'll seem like duplicates.

        tween.ratio = ratio;
        tween._from && (ratio = 1 - ratio);
        tween._time = 0;
        tween._tTime = tTime;
        pt = tween._pt;

        while (pt) {
          pt.r(ratio, pt.d);
          pt = pt._next;
        }

        tween._startAt && totalTime < 0 && tween._startAt.render(totalTime, true, true);
        tween._onUpdate && !suppressEvents && _callback(tween, "onUpdate");
        tTime && tween._repeat && !suppressEvents && tween.parent && _callback(tween, "onRepeat");

        if ((totalTime >= tween._tDur || totalTime < 0) && tween.ratio === ratio) {
          ratio && _removeFromParent(tween, 1);

          if (!suppressEvents) {
            _callback(tween, ratio ? "onComplete" : "onReverseComplete", true);

            tween._prom && tween._prom();
          }
        }
      } else if (!tween._zTime) {
        tween._zTime = totalTime;
      }
    },
        _findNextPauseTween = function _findNextPauseTween(animation, prevTime, time) {
      var child;

      if (time > prevTime) {
        child = animation._first;

        while (child && child._start <= time) {
          if (child.data === "isPause" && child._start > prevTime) {
            return child;
          }

          child = child._next;
        }
      } else {
        child = animation._last;

        while (child && child._start >= time) {
          if (child.data === "isPause" && child._start < prevTime) {
            return child;
          }

          child = child._prev;
        }
      }
    },
        _setDuration = function _setDuration(animation, duration, skipUncache, leavePlayhead) {
      var repeat = animation._repeat,
          dur = _roundPrecise(duration) || 0,
          totalProgress = animation._tTime / animation._tDur;
      totalProgress && !leavePlayhead && (animation._time *= dur / animation._dur);
      animation._dur = dur;
      animation._tDur = !repeat ? dur : repeat < 0 ? 1e10 : _roundPrecise(dur * (repeat + 1) + animation._rDelay * repeat);
      totalProgress > 0 && !leavePlayhead ? _alignPlayhead(animation, animation._tTime = animation._tDur * totalProgress) : animation.parent && _setEnd(animation);
      skipUncache || _uncache(animation.parent, animation);
      return animation;
    },
        _onUpdateTotalDuration = function _onUpdateTotalDuration(animation) {
      return animation instanceof Timeline ? _uncache(animation) : _setDuration(animation, animation._dur);
    },
        _zeroPosition = {
      _start: 0,
      endTime: _emptyFunc,
      totalDuration: _emptyFunc
    },
        _parsePosition = function _parsePosition(animation, position, percentAnimation) {
      var labels = animation.labels,
          recent = animation._recent || _zeroPosition,
          clippedDuration = animation.duration() >= _bigNum$1 ? recent.endTime(false) : animation._dur,
          //in case there's a child that infinitely repeats, users almost never intend for the insertion point of a new child to be based on a SUPER long value like that so we clip it and assume the most recently-added child's endTime should be used instead.
      i,
          offset,
          isPercent;

      if (_isString(position) && (isNaN(position) || position in labels)) {
        //if the string is a number like "1", check to see if there's a label with that name, otherwise interpret it as a number (absolute value).
        offset = position.charAt(0);
        isPercent = position.substr(-1) === "%";
        i = position.indexOf("=");

        if (offset === "<" || offset === ">") {
          i >= 0 && (position = position.replace(/=/, ""));
          return (offset === "<" ? recent._start : recent.endTime(recent._repeat >= 0)) + (parseFloat(position.substr(1)) || 0) * (isPercent ? (i < 0 ? recent : percentAnimation).totalDuration() / 100 : 1);
        }

        if (i < 0) {
          position in labels || (labels[position] = clippedDuration);
          return labels[position];
        }

        offset = parseFloat(position.charAt(i - 1) + position.substr(i + 1));

        if (isPercent && percentAnimation) {
          offset = offset / 100 * (_isArray(percentAnimation) ? percentAnimation[0] : percentAnimation).totalDuration();
        }

        return i > 1 ? _parsePosition(animation, position.substr(0, i - 1), percentAnimation) + offset : clippedDuration + offset;
      }

      return position == null ? clippedDuration : +position;
    },
        _createTweenType = function _createTweenType(type, params, timeline) {
      var isLegacy = _isNumber(params[1]),
          varsIndex = (isLegacy ? 2 : 1) + (type < 2 ? 0 : 1),
          vars = params[varsIndex],
          irVars,
          parent;

      isLegacy && (vars.duration = params[1]);
      vars.parent = timeline;

      if (type) {
        irVars = vars;
        parent = timeline;

        while (parent && !("immediateRender" in irVars)) {
          // inheritance hasn't happened yet, but someone may have set a default in an ancestor timeline. We could do vars.immediateRender = _isNotFalse(_inheritDefaults(vars).immediateRender) but that'd exact a slight performance penalty because _inheritDefaults() also runs in the Tween constructor. We're paying a small kb price here to gain speed.
          irVars = parent.vars.defaults || {};
          parent = _isNotFalse(parent.vars.inherit) && parent.parent;
        }

        vars.immediateRender = _isNotFalse(irVars.immediateRender);
        type < 2 ? vars.runBackwards = 1 : vars.startAt = params[varsIndex - 1]; // "from" vars
      }

      return new Tween(params[0], vars, params[varsIndex + 1]);
    },
        _conditionalReturn = function _conditionalReturn(value, func) {
      return value || value === 0 ? func(value) : func;
    },
        _clamp = function _clamp(min, max, value) {
      return value < min ? min : value > max ? max : value;
    },
        getUnit = function getUnit(value, v) {
      return !_isString(value) || !(v = _unitExp.exec(value)) ? "" : value.substr(v.index + v[0].length);
    },
        // note: protect against padded numbers as strings, like "100.100". That shouldn't return "00" as the unit. If it's numeric, return no unit.
    clamp = function clamp(min, max, value) {
      return _conditionalReturn(value, function (v) {
        return _clamp(min, max, v);
      });
    },
        _slice = [].slice,
        _isArrayLike = function _isArrayLike(value, nonEmpty) {
      return value && _isObject(value) && "length" in value && (!nonEmpty && !value.length || value.length - 1 in value && _isObject(value[0])) && !value.nodeType && value !== _win$1;
    },
        _flatten = function _flatten(ar, leaveStrings, accumulator) {
      if (accumulator === void 0) {
        accumulator = [];
      }

      return ar.forEach(function (value) {
        var _accumulator;

        return _isString(value) && !leaveStrings || _isArrayLike(value, 1) ? (_accumulator = accumulator).push.apply(_accumulator, toArray(value)) : accumulator.push(value);
      }) || accumulator;
    },
        //takes any value and returns an array. If it's a string (and leaveStrings isn't true), it'll use document.querySelectorAll() and convert that to an array. It'll also accept iterables like jQuery objects.
    toArray = function toArray(value, scope, leaveStrings) {
      return _isString(value) && !leaveStrings && (_coreInitted || !_wake()) ? _slice.call((scope || _doc$1).querySelectorAll(value), 0) : _isArray(value) ? _flatten(value, leaveStrings) : _isArrayLike(value) ? _slice.call(value, 0) : value ? [value] : [];
    },
        selector = function selector(value) {
      value = toArray(value)[0] || _warn("Invalid scope") || {};
      return function (v) {
        var el = value.current || value.nativeElement || value;
        return toArray(v, el.querySelectorAll ? el : el === value ? _warn("Invalid scope") || _doc$1.createElement("div") : value);
      };
    },
        shuffle = function shuffle(a) {
      return a.sort(function () {
        return .5 - Math.random();
      });
    },
        // alternative that's a bit faster and more reliably diverse but bigger:   for (let j, v, i = a.length; i; j = Math.floor(Math.random() * i), v = a[--i], a[i] = a[j], a[j] = v); return a;
    //for distributing values across an array. Can accept a number, a function or (most commonly) a function which can contain the following properties: {base, amount, from, ease, grid, axis, length, each}. Returns a function that expects the following parameters: index, target, array. Recognizes the following
    distribute = function distribute(v) {
      if (_isFunction(v)) {
        return v;
      }

      var vars = _isObject(v) ? v : {
        each: v
      },
          //n:1 is just to indicate v was a number; we leverage that later to set v according to the length we get. If a number is passed in, we treat it like the old stagger value where 0.1, for example, would mean that things would be distributed with 0.1 between each element in the array rather than a total "amount" that's chunked out among them all.
      ease = _parseEase(vars.ease),
          from = vars.from || 0,
          base = parseFloat(vars.base) || 0,
          cache = {},
          isDecimal = from > 0 && from < 1,
          ratios = isNaN(from) || isDecimal,
          axis = vars.axis,
          ratioX = from,
          ratioY = from;

      if (_isString(from)) {
        ratioX = ratioY = {
          center: .5,
          edges: .5,
          end: 1
        }[from] || 0;
      } else if (!isDecimal && ratios) {
        ratioX = from[0];
        ratioY = from[1];
      }

      return function (i, target, a) {
        var l = (a || vars).length,
            distances = cache[l],
            originX,
            originY,
            x,
            y,
            d,
            j,
            max,
            min,
            wrapAt;

        if (!distances) {
          wrapAt = vars.grid === "auto" ? 0 : (vars.grid || [1, _bigNum$1])[1];

          if (!wrapAt) {
            max = -_bigNum$1;

            while (max < (max = a[wrapAt++].getBoundingClientRect().left) && wrapAt < l) {}

            wrapAt--;
          }

          distances = cache[l] = [];
          originX = ratios ? Math.min(wrapAt, l) * ratioX - .5 : from % wrapAt;
          originY = wrapAt === _bigNum$1 ? 0 : ratios ? l * ratioY / wrapAt - .5 : from / wrapAt | 0;
          max = 0;
          min = _bigNum$1;

          for (j = 0; j < l; j++) {
            x = j % wrapAt - originX;
            y = originY - (j / wrapAt | 0);
            distances[j] = d = !axis ? _sqrt(x * x + y * y) : Math.abs(axis === "y" ? y : x);
            d > max && (max = d);
            d < min && (min = d);
          }

          from === "random" && shuffle(distances);
          distances.max = max - min;
          distances.min = min;
          distances.v = l = (parseFloat(vars.amount) || parseFloat(vars.each) * (wrapAt > l ? l - 1 : !axis ? Math.max(wrapAt, l / wrapAt) : axis === "y" ? l / wrapAt : wrapAt) || 0) * (from === "edges" ? -1 : 1);
          distances.b = l < 0 ? base - l : base;
          distances.u = getUnit(vars.amount || vars.each) || 0; //unit

          ease = ease && l < 0 ? _invertEase(ease) : ease;
        }

        l = (distances[i] - distances.min) / distances.max || 0;
        return _roundPrecise(distances.b + (ease ? ease(l) : l) * distances.v) + distances.u; //round in order to work around floating point errors
      };
    },
        _roundModifier = function _roundModifier(v) {
      //pass in 0.1 get a function that'll round to the nearest tenth, or 5 to round to the closest 5, or 0.001 to the closest 1000th, etc.
      var p = Math.pow(10, ((v + "").split(".")[1] || "").length); //to avoid floating point math errors (like 24 * 0.1 == 2.4000000000000004), we chop off at a specific number of decimal places (much faster than toFixed())

      return function (raw) {
        var n = Math.round(parseFloat(raw) / v) * v * p;
        return (n - n % 1) / p + (_isNumber(raw) ? 0 : getUnit(raw)); // n - n % 1 replaces Math.floor() in order to handle negative values properly. For example, Math.floor(-150.00000000000003) is 151!
      };
    },
        snap = function snap(snapTo, value) {
      var isArray = _isArray(snapTo),
          radius,
          is2D;

      if (!isArray && _isObject(snapTo)) {
        radius = isArray = snapTo.radius || _bigNum$1;

        if (snapTo.values) {
          snapTo = toArray(snapTo.values);

          if (is2D = !_isNumber(snapTo[0])) {
            radius *= radius; //performance optimization so we don't have to Math.sqrt() in the loop.
          }
        } else {
          snapTo = _roundModifier(snapTo.increment);
        }
      }

      return _conditionalReturn(value, !isArray ? _roundModifier(snapTo) : _isFunction(snapTo) ? function (raw) {
        is2D = snapTo(raw);
        return Math.abs(is2D - raw) <= radius ? is2D : raw;
      } : function (raw) {
        var x = parseFloat(is2D ? raw.x : raw),
            y = parseFloat(is2D ? raw.y : 0),
            min = _bigNum$1,
            closest = 0,
            i = snapTo.length,
            dx,
            dy;

        while (i--) {
          if (is2D) {
            dx = snapTo[i].x - x;
            dy = snapTo[i].y - y;
            dx = dx * dx + dy * dy;
          } else {
            dx = Math.abs(snapTo[i] - x);
          }

          if (dx < min) {
            min = dx;
            closest = i;
          }
        }

        closest = !radius || min <= radius ? snapTo[closest] : raw;
        return is2D || closest === raw || _isNumber(raw) ? closest : closest + getUnit(raw);
      });
    },
        random = function random(min, max, roundingIncrement, returnFunction) {
      return _conditionalReturn(_isArray(min) ? !max : roundingIncrement === true ? !!(roundingIncrement = 0) : !returnFunction, function () {
        return _isArray(min) ? min[~~(Math.random() * min.length)] : (roundingIncrement = roundingIncrement || 1e-5) && (returnFunction = roundingIncrement < 1 ? Math.pow(10, (roundingIncrement + "").length - 2) : 1) && Math.floor(Math.round((min - roundingIncrement / 2 + Math.random() * (max - min + roundingIncrement * .99)) / roundingIncrement) * roundingIncrement * returnFunction) / returnFunction;
      });
    },
        pipe = function pipe() {
      for (var _len = arguments.length, functions = new Array(_len), _key = 0; _key < _len; _key++) {
        functions[_key] = arguments[_key];
      }

      return function (value) {
        return functions.reduce(function (v, f) {
          return f(v);
        }, value);
      };
    },
        unitize = function unitize(func, unit) {
      return function (value) {
        return func(parseFloat(value)) + (unit || getUnit(value));
      };
    },
        normalize = function normalize(min, max, value) {
      return mapRange(min, max, 0, 1, value);
    },
        _wrapArray = function _wrapArray(a, wrapper, value) {
      return _conditionalReturn(value, function (index) {
        return a[~~wrapper(index)];
      });
    },
        wrap = function wrap(min, max, value) {
      // NOTE: wrap() CANNOT be an arrow function! A very odd compiling bug causes problems (unrelated to GSAP).
      var range = max - min;
      return _isArray(min) ? _wrapArray(min, wrap(0, min.length), max) : _conditionalReturn(value, function (value) {
        return (range + (value - min) % range) % range + min;
      });
    },
        wrapYoyo = function wrapYoyo(min, max, value) {
      var range = max - min,
          total = range * 2;
      return _isArray(min) ? _wrapArray(min, wrapYoyo(0, min.length - 1), max) : _conditionalReturn(value, function (value) {
        value = (total + (value - min) % total) % total || 0;
        return min + (value > range ? total - value : value);
      });
    },
        _replaceRandom = function _replaceRandom(value) {
      //replaces all occurrences of random(...) in a string with the calculated random value. can be a range like random(-100, 100, 5) or an array like random([0, 100, 500])
      var prev = 0,
          s = "",
          i,
          nums,
          end,
          isArray;

      while (~(i = value.indexOf("random(", prev))) {
        end = value.indexOf(")", i);
        isArray = value.charAt(i + 7) === "[";
        nums = value.substr(i + 7, end - i - 7).match(isArray ? _delimitedValueExp : _strictNumExp);
        s += value.substr(prev, i - prev) + random(isArray ? nums : +nums[0], isArray ? 0 : +nums[1], +nums[2] || 1e-5);
        prev = end + 1;
      }

      return s + value.substr(prev, value.length - prev);
    },
        mapRange = function mapRange(inMin, inMax, outMin, outMax, value) {
      var inRange = inMax - inMin,
          outRange = outMax - outMin;
      return _conditionalReturn(value, function (value) {
        return outMin + ((value - inMin) / inRange * outRange || 0);
      });
    },
        interpolate = function interpolate(start, end, progress, mutate) {
      var func = isNaN(start + end) ? 0 : function (p) {
        return (1 - p) * start + p * end;
      };

      if (!func) {
        var isString = _isString(start),
            master = {},
            p,
            i,
            interpolators,
            l,
            il;

        progress === true && (mutate = 1) && (progress = null);

        if (isString) {
          start = {
            p: start
          };
          end = {
            p: end
          };
        } else if (_isArray(start) && !_isArray(end)) {
          interpolators = [];
          l = start.length;
          il = l - 2;

          for (i = 1; i < l; i++) {
            interpolators.push(interpolate(start[i - 1], start[i])); //build the interpolators up front as a performance optimization so that when the function is called many times, it can just reuse them.
          }

          l--;

          func = function func(p) {
            p *= l;
            var i = Math.min(il, ~~p);
            return interpolators[i](p - i);
          };

          progress = end;
        } else if (!mutate) {
          start = _merge(_isArray(start) ? [] : {}, start);
        }

        if (!interpolators) {
          for (p in end) {
            _addPropTween.call(master, start, p, "get", end[p]);
          }

          func = function func(p) {
            return _renderPropTweens(p, master) || (isString ? start.p : start);
          };
        }
      }

      return _conditionalReturn(progress, func);
    },
        _getLabelInDirection = function _getLabelInDirection(timeline, fromTime, backward) {
      //used for nextLabel() and previousLabel()
      var labels = timeline.labels,
          min = _bigNum$1,
          p,
          distance,
          label;

      for (p in labels) {
        distance = labels[p] - fromTime;

        if (distance < 0 === !!backward && distance && min > (distance = Math.abs(distance))) {
          label = p;
          min = distance;
        }
      }

      return label;
    },
        _callback = function _callback(animation, type, executeLazyFirst) {
      var v = animation.vars,
          callback = v[type],
          params,
          scope;

      if (!callback) {
        return;
      }

      params = v[type + "Params"];
      scope = v.callbackScope || animation;
      executeLazyFirst && _lazyTweens.length && _lazyRender(); //in case rendering caused any tweens to lazy-init, we should render them because typically when a timeline finishes, users expect things to have rendered fully. Imagine an onUpdate on a timeline that reports/checks tweened values.

      return params ? callback.apply(scope, params) : callback.call(scope);
    },
        _interrupt = function _interrupt(animation) {
      _removeFromParent(animation);

      animation.scrollTrigger && animation.scrollTrigger.kill(false);
      animation.progress() < 1 && _callback(animation, "onInterrupt");
      return animation;
    },
        _quickTween,
        _createPlugin = function _createPlugin(config) {
      config = !config.name && config["default"] || config; //UMD packaging wraps things oddly, so for example MotionPathHelper becomes {MotionPathHelper:MotionPathHelper, default:MotionPathHelper}.

      var name = config.name,
          isFunc = _isFunction(config),
          Plugin = name && !isFunc && config.init ? function () {
        this._props = [];
      } : config,
          //in case someone passes in an object that's not a plugin, like CustomEase
      instanceDefaults = {
        init: _emptyFunc,
        render: _renderPropTweens,
        add: _addPropTween,
        kill: _killPropTweensOf,
        modifier: _addPluginModifier,
        rawVars: 0
      },
          statics = {
        targetTest: 0,
        get: 0,
        getSetter: _getSetter,
        aliases: {},
        register: 0
      };

      _wake();

      if (config !== Plugin) {
        if (_plugins[name]) {
          return;
        }

        _setDefaults(Plugin, _setDefaults(_copyExcluding(config, instanceDefaults), statics)); //static methods


        _merge(Plugin.prototype, _merge(instanceDefaults, _copyExcluding(config, statics))); //instance methods


        _plugins[Plugin.prop = name] = Plugin;

        if (config.targetTest) {
          _harnessPlugins.push(Plugin);

          _reservedProps[name] = 1;
        }

        name = (name === "css" ? "CSS" : name.charAt(0).toUpperCase() + name.substr(1)) + "Plugin"; //for the global name. "motionPath" should become MotionPathPlugin
      }

      _addGlobal(name, Plugin);

      config.register && config.register(gsap, Plugin, PropTween);
    },

    /*
     * --------------------------------------------------------------------------------------
     * COLORS
     * --------------------------------------------------------------------------------------
     */
    _255 = 255,
        _colorLookup = {
      aqua: [0, _255, _255],
      lime: [0, _255, 0],
      silver: [192, 192, 192],
      black: [0, 0, 0],
      maroon: [128, 0, 0],
      teal: [0, 128, 128],
      blue: [0, 0, _255],
      navy: [0, 0, 128],
      white: [_255, _255, _255],
      olive: [128, 128, 0],
      yellow: [_255, _255, 0],
      orange: [_255, 165, 0],
      gray: [128, 128, 128],
      purple: [128, 0, 128],
      green: [0, 128, 0],
      red: [_255, 0, 0],
      pink: [_255, 192, 203],
      cyan: [0, _255, _255],
      transparent: [_255, _255, _255, 0]
    },
        // possible future idea to replace the hard-coded color name values - put this in the ticker.wake() where we set the _doc:
    // let ctx = _doc.createElement("canvas").getContext("2d");
    // _forEachName("aqua,lime,silver,black,maroon,teal,blue,navy,white,olive,yellow,orange,gray,purple,green,red,pink,cyan", color => {ctx.fillStyle = color; _colorLookup[color] = splitColor(ctx.fillStyle)});
    _hue = function _hue(h, m1, m2) {
      h += h < 0 ? 1 : h > 1 ? -1 : 0;
      return (h * 6 < 1 ? m1 + (m2 - m1) * h * 6 : h < .5 ? m2 : h * 3 < 2 ? m1 + (m2 - m1) * (2 / 3 - h) * 6 : m1) * _255 + .5 | 0;
    },
        splitColor = function splitColor(v, toHSL, forceAlpha) {
      var a = !v ? _colorLookup.black : _isNumber(v) ? [v >> 16, v >> 8 & _255, v & _255] : 0,
          r,
          g,
          b,
          h,
          s,
          l,
          max,
          min,
          d,
          wasHSL;

      if (!a) {
        if (v.substr(-1) === ",") {
          //sometimes a trailing comma is included and we should chop it off (typically from a comma-delimited list of values like a textShadow:"2px 2px 2px blue, 5px 5px 5px rgb(255,0,0)" - in this example "blue," has a trailing comma. We could strip it out inside parseComplex() but we'd need to do it to the beginning and ending values plus it wouldn't provide protection from other potential scenarios like if the user passes in a similar value.
          v = v.substr(0, v.length - 1);
        }

        if (_colorLookup[v]) {
          a = _colorLookup[v];
        } else if (v.charAt(0) === "#") {
          if (v.length < 6) {
            //for shorthand like #9F0 or #9F0F (could have alpha)
            r = v.charAt(1);
            g = v.charAt(2);
            b = v.charAt(3);
            v = "#" + r + r + g + g + b + b + (v.length === 5 ? v.charAt(4) + v.charAt(4) : "");
          }

          if (v.length === 9) {
            // hex with alpha, like #fd5e53ff
            a = parseInt(v.substr(1, 6), 16);
            return [a >> 16, a >> 8 & _255, a & _255, parseInt(v.substr(7), 16) / 255];
          }

          v = parseInt(v.substr(1), 16);
          a = [v >> 16, v >> 8 & _255, v & _255];
        } else if (v.substr(0, 3) === "hsl") {
          a = wasHSL = v.match(_strictNumExp);

          if (!toHSL) {
            h = +a[0] % 360 / 360;
            s = +a[1] / 100;
            l = +a[2] / 100;
            g = l <= .5 ? l * (s + 1) : l + s - l * s;
            r = l * 2 - g;
            a.length > 3 && (a[3] *= 1); //cast as number

            a[0] = _hue(h + 1 / 3, r, g);
            a[1] = _hue(h, r, g);
            a[2] = _hue(h - 1 / 3, r, g);
          } else if (~v.indexOf("=")) {
            //if relative values are found, just return the raw strings with the relative prefixes in place.
            a = v.match(_numExp);
            forceAlpha && a.length < 4 && (a[3] = 1);
            return a;
          }
        } else {
          a = v.match(_strictNumExp) || _colorLookup.transparent;
        }

        a = a.map(Number);
      }

      if (toHSL && !wasHSL) {
        r = a[0] / _255;
        g = a[1] / _255;
        b = a[2] / _255;
        max = Math.max(r, g, b);
        min = Math.min(r, g, b);
        l = (max + min) / 2;

        if (max === min) {
          h = s = 0;
        } else {
          d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
          h *= 60;
        }

        a[0] = ~~(h + .5);
        a[1] = ~~(s * 100 + .5);
        a[2] = ~~(l * 100 + .5);
      }

      forceAlpha && a.length < 4 && (a[3] = 1);
      return a;
    },
        _colorOrderData = function _colorOrderData(v) {
      // strips out the colors from the string, finds all the numeric slots (with units) and returns an array of those. The Array also has a "c" property which is an Array of the index values where the colors belong. This is to help work around issues where there's a mis-matched order of color/numeric data like drop-shadow(#f00 0px 1px 2px) and drop-shadow(0x 1px 2px #f00). This is basically a helper function used in _formatColors()
      var values = [],
          c = [],
          i = -1;
      v.split(_colorExp).forEach(function (v) {
        var a = v.match(_numWithUnitExp) || [];
        values.push.apply(values, a);
        c.push(i += a.length + 1);
      });
      values.c = c;
      return values;
    },
        _formatColors = function _formatColors(s, toHSL, orderMatchData) {
      var result = "",
          colors = (s + result).match(_colorExp),
          type = toHSL ? "hsla(" : "rgba(",
          i = 0,
          c,
          shell,
          d,
          l;

      if (!colors) {
        return s;
      }

      colors = colors.map(function (color) {
        return (color = splitColor(color, toHSL, 1)) && type + (toHSL ? color[0] + "," + color[1] + "%," + color[2] + "%," + color[3] : color.join(",")) + ")";
      });

      if (orderMatchData) {
        d = _colorOrderData(s);
        c = orderMatchData.c;

        if (c.join(result) !== d.c.join(result)) {
          shell = s.replace(_colorExp, "1").split(_numWithUnitExp);
          l = shell.length - 1;

          for (; i < l; i++) {
            result += shell[i] + (~c.indexOf(i) ? colors.shift() || type + "0,0,0,0)" : (d.length ? d : colors.length ? colors : orderMatchData).shift());
          }
        }
      }

      if (!shell) {
        shell = s.split(_colorExp);
        l = shell.length - 1;

        for (; i < l; i++) {
          result += shell[i] + colors[i];
        }
      }

      return result + shell[l];
    },
        _colorExp = function () {
      var s = "(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#(?:[0-9a-f]{3,4}){1,2}\\b",
          //we'll dynamically build this Regular Expression to conserve file size. After building it, it will be able to find rgb(), rgba(), # (hexadecimal), and named color values like red, blue, purple, etc.,
      p;

      for (p in _colorLookup) {
        s += "|" + p + "\\b";
      }

      return new RegExp(s + ")", "gi");
    }(),
        _hslExp = /hsl[a]?\(/,
        _colorStringFilter = function _colorStringFilter(a) {
      var combined = a.join(" "),
          toHSL;
      _colorExp.lastIndex = 0;

      if (_colorExp.test(combined)) {
        toHSL = _hslExp.test(combined);
        a[1] = _formatColors(a[1], toHSL);
        a[0] = _formatColors(a[0], toHSL, _colorOrderData(a[1])); // make sure the order of numbers/colors match with the END value.

        return true;
      }
    },

    /*
     * --------------------------------------------------------------------------------------
     * TICKER
     * --------------------------------------------------------------------------------------
     */
    _tickerActive,
        _ticker = function () {
      var _getTime = Date.now,
          _lagThreshold = 500,
          _adjustedLag = 33,
          _startTime = _getTime(),
          _lastUpdate = _startTime,
          _gap = 1000 / 240,
          _nextTime = _gap,
          _listeners = [],
          _id,
          _req,
          _raf,
          _self,
          _delta,
          _i,
          _tick = function _tick(v) {
        var elapsed = _getTime() - _lastUpdate,
            manual = v === true,
            overlap,
            dispatch,
            time,
            frame;

        elapsed > _lagThreshold && (_startTime += elapsed - _adjustedLag);
        _lastUpdate += elapsed;
        time = _lastUpdate - _startTime;
        overlap = time - _nextTime;

        if (overlap > 0 || manual) {
          frame = ++_self.frame;
          _delta = time - _self.time * 1000;
          _self.time = time = time / 1000;
          _nextTime += overlap + (overlap >= _gap ? 4 : _gap - overlap);
          dispatch = 1;
        }

        manual || (_id = _req(_tick)); //make sure the request is made before we dispatch the "tick" event so that timing is maintained. Otherwise, if processing the "tick" requires a bunch of time (like 15ms) and we're using a setTimeout() that's based on 16.7ms, it'd technically take 31.7ms between frames otherwise.

        if (dispatch) {
          for (_i = 0; _i < _listeners.length; _i++) {
            // use _i and check _listeners.length instead of a variable because a listener could get removed during the loop, and if that happens to an element less than the current index, it'd throw things off in the loop.
            _listeners[_i](time, _delta, frame, v);
          }
        }
      };

      _self = {
        time: 0,
        frame: 0,
        tick: function tick() {
          _tick(true);
        },
        deltaRatio: function deltaRatio(fps) {
          return _delta / (1000 / (fps || 60));
        },
        wake: function wake() {
          if (_coreReady) {
            if (!_coreInitted && _windowExists$1()) {
              _win$1 = _coreInitted = window;
              _doc$1 = _win$1.document || {};
              _globals.gsap = gsap;
              (_win$1.gsapVersions || (_win$1.gsapVersions = [])).push(gsap.version);

              _install(_installScope || _win$1.GreenSockGlobals || !_win$1.gsap && _win$1 || {});

              _raf = _win$1.requestAnimationFrame;
            }

            _id && _self.sleep();

            _req = _raf || function (f) {
              return setTimeout(f, _nextTime - _self.time * 1000 + 1 | 0);
            };

            _tickerActive = 1;

            _tick(2);
          }
        },
        sleep: function sleep() {
          (_raf ? _win$1.cancelAnimationFrame : clearTimeout)(_id);
          _tickerActive = 0;
          _req = _emptyFunc;
        },
        lagSmoothing: function lagSmoothing(threshold, adjustedLag) {
          _lagThreshold = threshold || 1 / _tinyNum; //zero should be interpreted as basically unlimited

          _adjustedLag = Math.min(adjustedLag, _lagThreshold, 0);
        },
        fps: function fps(_fps) {
          _gap = 1000 / (_fps || 240);
          _nextTime = _self.time * 1000 + _gap;
        },
        add: function add(callback) {
          _listeners.indexOf(callback) < 0 && _listeners.push(callback);

          _wake();
        },
        remove: function remove(callback, i) {
          ~(i = _listeners.indexOf(callback)) && _listeners.splice(i, 1) && _i >= i && _i--;
        },
        _listeners: _listeners
      };
      return _self;
    }(),
        _wake = function _wake() {
      return !_tickerActive && _ticker.wake();
    },
        //also ensures the core classes are initialized.

    /*
    * -------------------------------------------------
    * EASING
    * -------------------------------------------------
    */
    _easeMap = {},
        _customEaseExp = /^[\d.\-M][\d.\-,\s]/,
        _quotesExp = /["']/g,
        _parseObjectInString = function _parseObjectInString(value) {
      //takes a string like "{wiggles:10, type:anticipate})" and turns it into a real object. Notice it ends in ")" and includes the {} wrappers. This is because we only use this function for parsing ease configs and prioritized optimization rather than reusability.
      var obj = {},
          split = value.substr(1, value.length - 3).split(":"),
          key = split[0],
          i = 1,
          l = split.length,
          index,
          val,
          parsedVal;

      for (; i < l; i++) {
        val = split[i];
        index = i !== l - 1 ? val.lastIndexOf(",") : val.length;
        parsedVal = val.substr(0, index);
        obj[key] = isNaN(parsedVal) ? parsedVal.replace(_quotesExp, "").trim() : +parsedVal;
        key = val.substr(index + 1).trim();
      }

      return obj;
    },
        _valueInParentheses = function _valueInParentheses(value) {
      var open = value.indexOf("(") + 1,
          close = value.indexOf(")"),
          nested = value.indexOf("(", open);
      return value.substring(open, ~nested && nested < close ? value.indexOf(")", close + 1) : close);
    },
        _configEaseFromString = function _configEaseFromString(name) {
      //name can be a string like "elastic.out(1,0.5)", and pass in _easeMap as obj and it'll parse it out and call the actual function like _easeMap.Elastic.easeOut.config(1,0.5). It will also parse custom ease strings as long as CustomEase is loaded and registered (internally as _easeMap._CE).
      var split = (name + "").split("("),
          ease = _easeMap[split[0]];
      return ease && split.length > 1 && ease.config ? ease.config.apply(null, ~name.indexOf("{") ? [_parseObjectInString(split[1])] : _valueInParentheses(name).split(",").map(_numericIfPossible)) : _easeMap._CE && _customEaseExp.test(name) ? _easeMap._CE("", name) : ease;
    },
        _invertEase = function _invertEase(ease) {
      return function (p) {
        return 1 - ease(1 - p);
      };
    },
        // allow yoyoEase to be set in children and have those affected when the parent/ancestor timeline yoyos.
    _propagateYoyoEase = function _propagateYoyoEase(timeline, isYoyo) {
      var child = timeline._first,
          ease;

      while (child) {
        if (child instanceof Timeline) {
          _propagateYoyoEase(child, isYoyo);
        } else if (child.vars.yoyoEase && (!child._yoyo || !child._repeat) && child._yoyo !== isYoyo) {
          if (child.timeline) {
            _propagateYoyoEase(child.timeline, isYoyo);
          } else {
            ease = child._ease;
            child._ease = child._yEase;
            child._yEase = ease;
            child._yoyo = isYoyo;
          }
        }

        child = child._next;
      }
    },
        _parseEase = function _parseEase(ease, defaultEase) {
      return !ease ? defaultEase : (_isFunction(ease) ? ease : _easeMap[ease] || _configEaseFromString(ease)) || defaultEase;
    },
        _insertEase = function _insertEase(names, easeIn, easeOut, easeInOut) {
      if (easeOut === void 0) {
        easeOut = function easeOut(p) {
          return 1 - easeIn(1 - p);
        };
      }

      if (easeInOut === void 0) {
        easeInOut = function easeInOut(p) {
          return p < .5 ? easeIn(p * 2) / 2 : 1 - easeIn((1 - p) * 2) / 2;
        };
      }

      var ease = {
        easeIn: easeIn,
        easeOut: easeOut,
        easeInOut: easeInOut
      },
          lowercaseName;

      _forEachName(names, function (name) {
        _easeMap[name] = _globals[name] = ease;
        _easeMap[lowercaseName = name.toLowerCase()] = easeOut;

        for (var p in ease) {
          _easeMap[lowercaseName + (p === "easeIn" ? ".in" : p === "easeOut" ? ".out" : ".inOut")] = _easeMap[name + "." + p] = ease[p];
        }
      });

      return ease;
    },
        _easeInOutFromOut = function _easeInOutFromOut(easeOut) {
      return function (p) {
        return p < .5 ? (1 - easeOut(1 - p * 2)) / 2 : .5 + easeOut((p - .5) * 2) / 2;
      };
    },
        _configElastic = function _configElastic(type, amplitude, period) {
      var p1 = amplitude >= 1 ? amplitude : 1,
          //note: if amplitude is < 1, we simply adjust the period for a more natural feel. Otherwise the math doesn't work right and the curve starts at 1.
      p2 = (period || (type ? .3 : .45)) / (amplitude < 1 ? amplitude : 1),
          p3 = p2 / _2PI * (Math.asin(1 / p1) || 0),
          easeOut = function easeOut(p) {
        return p === 1 ? 1 : p1 * Math.pow(2, -10 * p) * _sin((p - p3) * p2) + 1;
      },
          ease = type === "out" ? easeOut : type === "in" ? function (p) {
        return 1 - easeOut(1 - p);
      } : _easeInOutFromOut(easeOut);

      p2 = _2PI / p2; //precalculate to optimize

      ease.config = function (amplitude, period) {
        return _configElastic(type, amplitude, period);
      };

      return ease;
    },
        _configBack = function _configBack(type, overshoot) {
      if (overshoot === void 0) {
        overshoot = 1.70158;
      }

      var easeOut = function easeOut(p) {
        return p ? --p * p * ((overshoot + 1) * p + overshoot) + 1 : 0;
      },
          ease = type === "out" ? easeOut : type === "in" ? function (p) {
        return 1 - easeOut(1 - p);
      } : _easeInOutFromOut(easeOut);

      ease.config = function (overshoot) {
        return _configBack(type, overshoot);
      };

      return ease;
    }; // a cheaper (kb and cpu) but more mild way to get a parameterized weighted ease by feeding in a value between -1 (easeIn) and 1 (easeOut) where 0 is linear.
    // _weightedEase = ratio => {
    // 	let y = 0.5 + ratio / 2;
    // 	return p => (2 * (1 - p) * p * y + p * p);
    // },
    // a stronger (but more expensive kb/cpu) parameterized weighted ease that lets you feed in a value between -1 (easeIn) and 1 (easeOut) where 0 is linear.
    // _weightedEaseStrong = ratio => {
    // 	ratio = .5 + ratio / 2;
    // 	let o = 1 / 3 * (ratio < .5 ? ratio : 1 - ratio),
    // 		b = ratio - o,
    // 		c = ratio + o;
    // 	return p => p === 1 ? p : 3 * b * (1 - p) * (1 - p) * p + 3 * c * (1 - p) * p * p + p * p * p;
    // };


    _forEachName("Linear,Quad,Cubic,Quart,Quint,Strong", function (name, i) {
      var power = i < 5 ? i + 1 : i;

      _insertEase(name + ",Power" + (power - 1), i ? function (p) {
        return Math.pow(p, power);
      } : function (p) {
        return p;
      }, function (p) {
        return 1 - Math.pow(1 - p, power);
      }, function (p) {
        return p < .5 ? Math.pow(p * 2, power) / 2 : 1 - Math.pow((1 - p) * 2, power) / 2;
      });
    });

    _easeMap.Linear.easeNone = _easeMap.none = _easeMap.Linear.easeIn;

    _insertEase("Elastic", _configElastic("in"), _configElastic("out"), _configElastic());

    (function (n, c) {
      var n1 = 1 / c,
          n2 = 2 * n1,
          n3 = 2.5 * n1,
          easeOut = function easeOut(p) {
        return p < n1 ? n * p * p : p < n2 ? n * Math.pow(p - 1.5 / c, 2) + .75 : p < n3 ? n * (p -= 2.25 / c) * p + .9375 : n * Math.pow(p - 2.625 / c, 2) + .984375;
      };

      _insertEase("Bounce", function (p) {
        return 1 - easeOut(1 - p);
      }, easeOut);
    })(7.5625, 2.75);

    _insertEase("Expo", function (p) {
      return p ? Math.pow(2, 10 * (p - 1)) : 0;
    });

    _insertEase("Circ", function (p) {
      return -(_sqrt(1 - p * p) - 1);
    });

    _insertEase("Sine", function (p) {
      return p === 1 ? 1 : -_cos(p * _HALF_PI) + 1;
    });

    _insertEase("Back", _configBack("in"), _configBack("out"), _configBack());

    _easeMap.SteppedEase = _easeMap.steps = _globals.SteppedEase = {
      config: function config(steps, immediateStart) {
        if (steps === void 0) {
          steps = 1;
        }

        var p1 = 1 / steps,
            p2 = steps + (immediateStart ? 0 : 1),
            p3 = immediateStart ? 1 : 0,
            max = 1 - _tinyNum;
        return function (p) {
          return ((p2 * _clamp(0, max, p) | 0) + p3) * p1;
        };
      }
    };
    _defaults.ease = _easeMap["quad.out"];

    _forEachName("onComplete,onUpdate,onStart,onRepeat,onReverseComplete,onInterrupt", function (name) {
      return _callbackNames += name + "," + name + "Params,";
    });
    /*
     * --------------------------------------------------------------------------------------
     * CACHE
     * --------------------------------------------------------------------------------------
     */


    var GSCache = function GSCache(target, harness) {
      this.id = _gsID++;
      target._gsap = this;
      this.target = target;
      this.harness = harness;
      this.get = harness ? harness.get : _getProperty;
      this.set = harness ? harness.getSetter : _getSetter;
    };
    /*
     * --------------------------------------------------------------------------------------
     * ANIMATION
     * --------------------------------------------------------------------------------------
     */

    var Animation = /*#__PURE__*/function () {
      function Animation(vars) {
        this.vars = vars;
        this._delay = +vars.delay || 0;

        if (this._repeat = vars.repeat === Infinity ? -2 : vars.repeat || 0) {
          // TODO: repeat: Infinity on a timeline's children must flag that timeline internally and affect its totalDuration, otherwise it'll stop in the negative direction when reaching the start.
          this._rDelay = vars.repeatDelay || 0;
          this._yoyo = !!vars.yoyo || !!vars.yoyoEase;
        }

        this._ts = 1;

        _setDuration(this, +vars.duration, 1, 1);

        this.data = vars.data;
        _tickerActive || _ticker.wake();
      }

      var _proto = Animation.prototype;

      _proto.delay = function delay(value) {
        if (value || value === 0) {
          this.parent && this.parent.smoothChildTiming && this.startTime(this._start + value - this._delay);
          this._delay = value;
          return this;
        }

        return this._delay;
      };

      _proto.duration = function duration(value) {
        return arguments.length ? this.totalDuration(this._repeat > 0 ? value + (value + this._rDelay) * this._repeat : value) : this.totalDuration() && this._dur;
      };

      _proto.totalDuration = function totalDuration(value) {
        if (!arguments.length) {
          return this._tDur;
        }

        this._dirty = 0;
        return _setDuration(this, this._repeat < 0 ? value : (value - this._repeat * this._rDelay) / (this._repeat + 1));
      };

      _proto.totalTime = function totalTime(_totalTime, suppressEvents) {
        _wake();

        if (!arguments.length) {
          return this._tTime;
        }

        var parent = this._dp;

        if (parent && parent.smoothChildTiming && this._ts) {
          _alignPlayhead(this, _totalTime);

          !parent._dp || parent.parent || _postAddChecks(parent, this); // edge case: if this is a child of a timeline that already completed, for example, we must re-activate the parent.
          //in case any of the ancestor timelines had completed but should now be enabled, we should reset their totalTime() which will also ensure that they're lined up properly and enabled. Skip for animations that are on the root (wasteful). Example: a TimelineLite.exportRoot() is performed when there's a paused tween on the root, the export will not complete until that tween is unpaused, but imagine a child gets restarted later, after all [unpaused] tweens have completed. The start of that child would get pushed out, but one of the ancestors may have completed.

          while (parent && parent.parent) {
            if (parent.parent._time !== parent._start + (parent._ts >= 0 ? parent._tTime / parent._ts : (parent.totalDuration() - parent._tTime) / -parent._ts)) {
              parent.totalTime(parent._tTime, true);
            }

            parent = parent.parent;
          }

          if (!this.parent && this._dp.autoRemoveChildren && (this._ts > 0 && _totalTime < this._tDur || this._ts < 0 && _totalTime > 0 || !this._tDur && !_totalTime)) {
            //if the animation doesn't have a parent, put it back into its last parent (recorded as _dp for exactly cases like this). Limit to parents with autoRemoveChildren (like globalTimeline) so that if the user manually removes an animation from a timeline and then alters its playhead, it doesn't get added back in.
            _addToTimeline(this._dp, this, this._start - this._delay);
          }
        }

        if (this._tTime !== _totalTime || !this._dur && !suppressEvents || this._initted && Math.abs(this._zTime) === _tinyNum || !_totalTime && !this._initted && (this.add || this._ptLookup)) {
          // check for _ptLookup on a Tween instance to ensure it has actually finished being instantiated, otherwise if this.reverse() gets called in the Animation constructor, it could trigger a render() here even though the _targets weren't populated, thus when _init() is called there won't be any PropTweens (it'll act like the tween is non-functional)
          this._ts || (this._pTime = _totalTime); // otherwise, if an animation is paused, then the playhead is moved back to zero, then resumed, it'd revert back to the original time at the pause
          //if (!this._lock) { // avoid endless recursion (not sure we need this yet or if it's worth the performance hit)
          //   this._lock = 1;

          _lazySafeRender(this, _totalTime, suppressEvents); //   this._lock = 0;
          //}

        }

        return this;
      };

      _proto.time = function time(value, suppressEvents) {
        return arguments.length ? this.totalTime(Math.min(this.totalDuration(), value + _elapsedCycleDuration(this)) % (this._dur + this._rDelay) || (value ? this._dur : 0), suppressEvents) : this._time; // note: if the modulus results in 0, the playhead could be exactly at the end or the beginning, and we always defer to the END with a non-zero value, otherwise if you set the time() to the very end (duration()), it would render at the START!
      };

      _proto.totalProgress = function totalProgress(value, suppressEvents) {
        return arguments.length ? this.totalTime(this.totalDuration() * value, suppressEvents) : this.totalDuration() ? Math.min(1, this._tTime / this._tDur) : this.ratio;
      };

      _proto.progress = function progress(value, suppressEvents) {
        return arguments.length ? this.totalTime(this.duration() * (this._yoyo && !(this.iteration() & 1) ? 1 - value : value) + _elapsedCycleDuration(this), suppressEvents) : this.duration() ? Math.min(1, this._time / this._dur) : this.ratio;
      };

      _proto.iteration = function iteration(value, suppressEvents) {
        var cycleDuration = this.duration() + this._rDelay;

        return arguments.length ? this.totalTime(this._time + (value - 1) * cycleDuration, suppressEvents) : this._repeat ? _animationCycle(this._tTime, cycleDuration) + 1 : 1;
      } // potential future addition:
      // isPlayingBackwards() {
      // 	let animation = this,
      // 		orientation = 1; // 1 = forward, -1 = backward
      // 	while (animation) {
      // 		orientation *= animation.reversed() || (animation.repeat() && !(animation.iteration() & 1)) ? -1 : 1;
      // 		animation = animation.parent;
      // 	}
      // 	return orientation < 0;
      // }
      ;

      _proto.timeScale = function timeScale(value) {
        if (!arguments.length) {
          return this._rts === -_tinyNum ? 0 : this._rts; // recorded timeScale. Special case: if someone calls reverse() on an animation with timeScale of 0, we assign it -_tinyNum to remember it's reversed.
        }

        if (this._rts === value) {
          return this;
        }

        var tTime = this.parent && this._ts ? _parentToChildTotalTime(this.parent._time, this) : this._tTime; // make sure to do the parentToChildTotalTime() BEFORE setting the new _ts because the old one must be used in that calculation.
        // future addition? Up side: fast and minimal file size. Down side: only works on this animation; if a timeline is reversed, for example, its childrens' onReverse wouldn't get called.
        //(+value < 0 && this._rts >= 0) && _callback(this, "onReverse", true);
        // prioritize rendering where the parent's playhead lines up instead of this._tTime because there could be a tween that's animating another tween's timeScale in the same rendering loop (same parent), thus if the timeScale tween renders first, it would alter _start BEFORE _tTime was set on that tick (in the rendering loop), effectively freezing it until the timeScale tween finishes.

        this._rts = +value || 0;
        this._ts = this._ps || value === -_tinyNum ? 0 : this._rts; // _ts is the functional timeScale which would be 0 if the animation is paused.

        _recacheAncestors(this.totalTime(_clamp(-this._delay, this._tDur, tTime), true));

        _setEnd(this); // if parent.smoothChildTiming was false, the end time didn't get updated in the _alignPlayhead() method, so do it here.


        return this;
      };

      _proto.paused = function paused(value) {
        if (!arguments.length) {
          return this._ps;
        }

        if (this._ps !== value) {
          this._ps = value;

          if (value) {
            this._pTime = this._tTime || Math.max(-this._delay, this.rawTime()); // if the pause occurs during the delay phase, make sure that's factored in when resuming.

            this._ts = this._act = 0; // _ts is the functional timeScale, so a paused tween would effectively have a timeScale of 0. We record the "real" timeScale as _rts (recorded time scale)
          } else {
            _wake();

            this._ts = this._rts; //only defer to _pTime (pauseTime) if tTime is zero. Remember, someone could pause() an animation, then scrub the playhead and resume(). If the parent doesn't have smoothChildTiming, we render at the rawTime() because the startTime won't get updated.

            this.totalTime(this.parent && !this.parent.smoothChildTiming ? this.rawTime() : this._tTime || this._pTime, this.progress() === 1 && Math.abs(this._zTime) !== _tinyNum && (this._tTime -= _tinyNum)); // edge case: animation.progress(1).pause().play() wouldn't render again because the playhead is already at the end, but the call to totalTime() below will add it back to its parent...and not remove it again (since removing only happens upon rendering at a new time). Offsetting the _tTime slightly is done simply to cause the final render in totalTime() that'll pop it off its timeline (if autoRemoveChildren is true, of course). Check to make sure _zTime isn't -_tinyNum to avoid an edge case where the playhead is pushed to the end but INSIDE a tween/callback, the timeline itself is paused thus halting rendering and leaving a few unrendered. When resuming, it wouldn't render those otherwise.
          }
        }

        return this;
      };

      _proto.startTime = function startTime(value) {
        if (arguments.length) {
          this._start = value;
          var parent = this.parent || this._dp;
          parent && (parent._sort || !this.parent) && _addToTimeline(parent, this, value - this._delay);
          return this;
        }

        return this._start;
      };

      _proto.endTime = function endTime(includeRepeats) {
        return this._start + (_isNotFalse(includeRepeats) ? this.totalDuration() : this.duration()) / Math.abs(this._ts || 1);
      };

      _proto.rawTime = function rawTime(wrapRepeats) {
        var parent = this.parent || this._dp; // _dp = detached parent

        return !parent ? this._tTime : wrapRepeats && (!this._ts || this._repeat && this._time && this.totalProgress() < 1) ? this._tTime % (this._dur + this._rDelay) : !this._ts ? this._tTime : _parentToChildTotalTime(parent.rawTime(wrapRepeats), this);
      };

      _proto.globalTime = function globalTime(rawTime) {
        var animation = this,
            time = arguments.length ? rawTime : animation.rawTime();

        while (animation) {
          time = animation._start + time / (animation._ts || 1);
          animation = animation._dp;
        }

        return time;
      };

      _proto.repeat = function repeat(value) {
        if (arguments.length) {
          this._repeat = value === Infinity ? -2 : value;
          return _onUpdateTotalDuration(this);
        }

        return this._repeat === -2 ? Infinity : this._repeat;
      };

      _proto.repeatDelay = function repeatDelay(value) {
        if (arguments.length) {
          var time = this._time;
          this._rDelay = value;

          _onUpdateTotalDuration(this);

          return time ? this.time(time) : this;
        }

        return this._rDelay;
      };

      _proto.yoyo = function yoyo(value) {
        if (arguments.length) {
          this._yoyo = value;
          return this;
        }

        return this._yoyo;
      };

      _proto.seek = function seek(position, suppressEvents) {
        return this.totalTime(_parsePosition(this, position), _isNotFalse(suppressEvents));
      };

      _proto.restart = function restart(includeDelay, suppressEvents) {
        return this.play().totalTime(includeDelay ? -this._delay : 0, _isNotFalse(suppressEvents));
      };

      _proto.play = function play(from, suppressEvents) {
        from != null && this.seek(from, suppressEvents);
        return this.reversed(false).paused(false);
      };

      _proto.reverse = function reverse(from, suppressEvents) {
        from != null && this.seek(from || this.totalDuration(), suppressEvents);
        return this.reversed(true).paused(false);
      };

      _proto.pause = function pause(atTime, suppressEvents) {
        atTime != null && this.seek(atTime, suppressEvents);
        return this.paused(true);
      };

      _proto.resume = function resume() {
        return this.paused(false);
      };

      _proto.reversed = function reversed(value) {
        if (arguments.length) {
          !!value !== this.reversed() && this.timeScale(-this._rts || (value ? -_tinyNum : 0)); // in case timeScale is zero, reversing would have no effect so we use _tinyNum.

          return this;
        }

        return this._rts < 0;
      };

      _proto.invalidate = function invalidate() {
        this._initted = this._act = 0;
        this._zTime = -_tinyNum;
        return this;
      };

      _proto.isActive = function isActive() {
        var parent = this.parent || this._dp,
            start = this._start,
            rawTime;
        return !!(!parent || this._ts && this._initted && parent.isActive() && (rawTime = parent.rawTime(true)) >= start && rawTime < this.endTime(true) - _tinyNum);
      };

      _proto.eventCallback = function eventCallback(type, callback, params) {
        var vars = this.vars;

        if (arguments.length > 1) {
          if (!callback) {
            delete vars[type];
          } else {
            vars[type] = callback;
            params && (vars[type + "Params"] = params);
            type === "onUpdate" && (this._onUpdate = callback);
          }

          return this;
        }

        return vars[type];
      };

      _proto.then = function then(onFulfilled) {
        var self = this;
        return new Promise(function (resolve) {
          var f = _isFunction(onFulfilled) ? onFulfilled : _passThrough,
              _resolve = function _resolve() {
            var _then = self.then;
            self.then = null; // temporarily null the then() method to avoid an infinite loop (see https://github.com/greensock/GSAP/issues/322)

            _isFunction(f) && (f = f(self)) && (f.then || f === self) && (self.then = _then);
            resolve(f);
            self.then = _then;
          };

          if (self._initted && self.totalProgress() === 1 && self._ts >= 0 || !self._tTime && self._ts < 0) {
            _resolve();
          } else {
            self._prom = _resolve;
          }
        });
      };

      _proto.kill = function kill() {
        _interrupt(this);
      };

      return Animation;
    }();

    _setDefaults(Animation.prototype, {
      _time: 0,
      _start: 0,
      _end: 0,
      _tTime: 0,
      _tDur: 0,
      _dirty: 0,
      _repeat: 0,
      _yoyo: false,
      parent: null,
      _initted: false,
      _rDelay: 0,
      _ts: 1,
      _dp: 0,
      ratio: 0,
      _zTime: -_tinyNum,
      _prom: 0,
      _ps: false,
      _rts: 1
    });
    /*
     * -------------------------------------------------
     * TIMELINE
     * -------------------------------------------------
     */


    var Timeline = /*#__PURE__*/function (_Animation) {
      _inheritsLoose(Timeline, _Animation);

      function Timeline(vars, position) {
        var _this;

        if (vars === void 0) {
          vars = {};
        }

        _this = _Animation.call(this, vars) || this;
        _this.labels = {};
        _this.smoothChildTiming = !!vars.smoothChildTiming;
        _this.autoRemoveChildren = !!vars.autoRemoveChildren;
        _this._sort = _isNotFalse(vars.sortChildren);
        _globalTimeline && _addToTimeline(vars.parent || _globalTimeline, _assertThisInitialized(_this), position);
        vars.reversed && _this.reverse();
        vars.paused && _this.paused(true);
        vars.scrollTrigger && _scrollTrigger(_assertThisInitialized(_this), vars.scrollTrigger);
        return _this;
      }

      var _proto2 = Timeline.prototype;

      _proto2.to = function to(targets, vars, position) {
        _createTweenType(0, arguments, this);

        return this;
      };

      _proto2.from = function from(targets, vars, position) {
        _createTweenType(1, arguments, this);

        return this;
      };

      _proto2.fromTo = function fromTo(targets, fromVars, toVars, position) {
        _createTweenType(2, arguments, this);

        return this;
      };

      _proto2.set = function set(targets, vars, position) {
        vars.duration = 0;
        vars.parent = this;
        _inheritDefaults(vars).repeatDelay || (vars.repeat = 0);
        vars.immediateRender = !!vars.immediateRender;
        new Tween(targets, vars, _parsePosition(this, position), 1);
        return this;
      };

      _proto2.call = function call(callback, params, position) {
        return _addToTimeline(this, Tween.delayedCall(0, callback, params), position);
      } //ONLY for backward compatibility! Maybe delete?
      ;

      _proto2.staggerTo = function staggerTo(targets, duration, vars, stagger, position, onCompleteAll, onCompleteAllParams) {
        vars.duration = duration;
        vars.stagger = vars.stagger || stagger;
        vars.onComplete = onCompleteAll;
        vars.onCompleteParams = onCompleteAllParams;
        vars.parent = this;
        new Tween(targets, vars, _parsePosition(this, position));
        return this;
      };

      _proto2.staggerFrom = function staggerFrom(targets, duration, vars, stagger, position, onCompleteAll, onCompleteAllParams) {
        vars.runBackwards = 1;
        _inheritDefaults(vars).immediateRender = _isNotFalse(vars.immediateRender);
        return this.staggerTo(targets, duration, vars, stagger, position, onCompleteAll, onCompleteAllParams);
      };

      _proto2.staggerFromTo = function staggerFromTo(targets, duration, fromVars, toVars, stagger, position, onCompleteAll, onCompleteAllParams) {
        toVars.startAt = fromVars;
        _inheritDefaults(toVars).immediateRender = _isNotFalse(toVars.immediateRender);
        return this.staggerTo(targets, duration, toVars, stagger, position, onCompleteAll, onCompleteAllParams);
      };

      _proto2.render = function render(totalTime, suppressEvents, force) {
        var prevTime = this._time,
            tDur = this._dirty ? this.totalDuration() : this._tDur,
            dur = this._dur,
            tTime = totalTime <= 0 ? 0 : _roundPrecise(totalTime),
            // if a paused timeline is resumed (or its _start is updated for another reason...which rounds it), that could result in the playhead shifting a **tiny** amount and a zero-duration child at that spot may get rendered at a different ratio, like its totalTime in render() may be 1e-17 instead of 0, for example.
        crossingStart = this._zTime < 0 !== totalTime < 0 && (this._initted || !dur),
            time,
            child,
            next,
            iteration,
            cycleDuration,
            prevPaused,
            pauseTween,
            timeScale,
            prevStart,
            prevIteration,
            yoyo,
            isYoyo;
        this !== _globalTimeline && tTime > tDur && totalTime >= 0 && (tTime = tDur);

        if (tTime !== this._tTime || force || crossingStart) {
          if (prevTime !== this._time && dur) {
            //if totalDuration() finds a child with a negative startTime and smoothChildTiming is true, things get shifted around internally so we need to adjust the time accordingly. For example, if a tween starts at -30 we must shift EVERYTHING forward 30 seconds and move this timeline's startTime backward by 30 seconds so that things align with the playhead (no jump).
            tTime += this._time - prevTime;
            totalTime += this._time - prevTime;
          }

          time = tTime;
          prevStart = this._start;
          timeScale = this._ts;
          prevPaused = !timeScale;

          if (crossingStart) {
            dur || (prevTime = this._zTime); //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration timeline, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect.

            (totalTime || !suppressEvents) && (this._zTime = totalTime);
          }

          if (this._repeat) {
            //adjust the time for repeats and yoyos
            yoyo = this._yoyo;
            cycleDuration = dur + this._rDelay;

            if (this._repeat < -1 && totalTime < 0) {
              return this.totalTime(cycleDuration * 100 + totalTime, suppressEvents, force);
            }

            time = _roundPrecise(tTime % cycleDuration); //round to avoid floating point errors. (4 % 0.8 should be 0 but some browsers report it as 0.79999999!)

            if (tTime === tDur) {
              // the tDur === tTime is for edge cases where there's a lengthy decimal on the duration and it may reach the very end but the time is rendered as not-quite-there (remember, tDur is rounded to 4 decimals whereas dur isn't)
              iteration = this._repeat;
              time = dur;
            } else {
              iteration = ~~(tTime / cycleDuration);

              if (iteration && iteration === tTime / cycleDuration) {
                time = dur;
                iteration--;
              }

              time > dur && (time = dur);
            }

            prevIteration = _animationCycle(this._tTime, cycleDuration);
            !prevTime && this._tTime && prevIteration !== iteration && (prevIteration = iteration); // edge case - if someone does addPause() at the very beginning of a repeating timeline, that pause is technically at the same spot as the end which causes this._time to get set to 0 when the totalTime would normally place the playhead at the end. See https://greensock.com/forums/topic/23823-closing-nav-animation-not-working-on-ie-and-iphone-6-maybe-other-older-browser/?tab=comments#comment-113005

            if (yoyo && iteration & 1) {
              time = dur - time;
              isYoyo = 1;
            }
            /*
            make sure children at the end/beginning of the timeline are rendered properly. If, for example,
            a 3-second long timeline rendered at 2.9 seconds previously, and now renders at 3.2 seconds (which
            would get translated to 2.8 seconds if the timeline yoyos or 0.2 seconds if it just repeats), there
            could be a callback or a short tween that's at 2.95 or 3 seconds in which wouldn't render. So
            we need to push the timeline to the end (and/or beginning depending on its yoyo value). Also we must
            ensure that zero-duration tweens at the very beginning or end of the Timeline work.
            */


            if (iteration !== prevIteration && !this._lock) {
              var rewinding = yoyo && prevIteration & 1,
                  doesWrap = rewinding === (yoyo && iteration & 1);
              iteration < prevIteration && (rewinding = !rewinding);
              prevTime = rewinding ? 0 : dur;
              this._lock = 1;
              this.render(prevTime || (isYoyo ? 0 : _roundPrecise(iteration * cycleDuration)), suppressEvents, !dur)._lock = 0;
              this._tTime = tTime; // if a user gets the iteration() inside the onRepeat, for example, it should be accurate.

              !suppressEvents && this.parent && _callback(this, "onRepeat");
              this.vars.repeatRefresh && !isYoyo && (this.invalidate()._lock = 1);

              if (prevTime && prevTime !== this._time || prevPaused !== !this._ts || this.vars.onRepeat && !this.parent && !this._act) {
                // if prevTime is 0 and we render at the very end, _time will be the end, thus won't match. So in this edge case, prevTime won't match _time but that's okay. If it gets killed in the onRepeat, eject as well.
                return this;
              }

              dur = this._dur; // in case the duration changed in the onRepeat

              tDur = this._tDur;

              if (doesWrap) {
                this._lock = 2;
                prevTime = rewinding ? dur : -0.0001;
                this.render(prevTime, true);
                this.vars.repeatRefresh && !isYoyo && this.invalidate();
              }

              this._lock = 0;

              if (!this._ts && !prevPaused) {
                return this;
              } //in order for yoyoEase to work properly when there's a stagger, we must swap out the ease in each sub-tween.


              _propagateYoyoEase(this, isYoyo);
            }
          }

          if (this._hasPause && !this._forcing && this._lock < 2) {
            pauseTween = _findNextPauseTween(this, _roundPrecise(prevTime), _roundPrecise(time));

            if (pauseTween) {
              tTime -= time - (time = pauseTween._start);
            }
          }

          this._tTime = tTime;
          this._time = time;
          this._act = !timeScale; //as long as it's not paused, force it to be active so that if the user renders independent of the parent timeline, it'll be forced to re-render on the next tick.

          if (!this._initted) {
            this._onUpdate = this.vars.onUpdate;
            this._initted = 1;
            this._zTime = totalTime;
            prevTime = 0; // upon init, the playhead should always go forward; someone could invalidate() a completed timeline and then if they restart(), that would make child tweens render in reverse order which could lock in the wrong starting values if they build on each other, like tl.to(obj, {x: 100}).to(obj, {x: 0}).
          }

          if (!prevTime && time && !suppressEvents) {
            _callback(this, "onStart");

            if (this._tTime !== tTime) {
              // in case the onStart triggered a render at a different spot, eject. Like if someone did animation.pause(0.5) or something inside the onStart.
              return this;
            }
          }

          if (time >= prevTime && totalTime >= 0) {
            child = this._first;

            while (child) {
              next = child._next;

              if ((child._act || time >= child._start) && child._ts && pauseTween !== child) {
                if (child.parent !== this) {
                  // an extreme edge case - the child's render could do something like kill() the "next" one in the linked list, or reparent it. In that case we must re-initiate the whole render to be safe.
                  return this.render(totalTime, suppressEvents, force);
                }

                child.render(child._ts > 0 ? (time - child._start) * child._ts : (child._dirty ? child.totalDuration() : child._tDur) + (time - child._start) * child._ts, suppressEvents, force);

                if (time !== this._time || !this._ts && !prevPaused) {
                  //in case a tween pauses or seeks the timeline when rendering, like inside of an onUpdate/onComplete
                  pauseTween = 0;
                  next && (tTime += this._zTime = -_tinyNum); // it didn't finish rendering, so flag zTime as negative so that so that the next time render() is called it'll be forced (to render any remaining children)

                  break;
                }
              }

              child = next;
            }
          } else {
            child = this._last;
            var adjustedTime = totalTime < 0 ? totalTime : time; //when the playhead goes backward beyond the start of this timeline, we must pass that information down to the child animations so that zero-duration tweens know whether to render their starting or ending values.

            while (child) {
              next = child._prev;

              if ((child._act || adjustedTime <= child._end) && child._ts && pauseTween !== child) {
                if (child.parent !== this) {
                  // an extreme edge case - the child's render could do something like kill() the "next" one in the linked list, or reparent it. In that case we must re-initiate the whole render to be safe.
                  return this.render(totalTime, suppressEvents, force);
                }

                child.render(child._ts > 0 ? (adjustedTime - child._start) * child._ts : (child._dirty ? child.totalDuration() : child._tDur) + (adjustedTime - child._start) * child._ts, suppressEvents, force);

                if (time !== this._time || !this._ts && !prevPaused) {
                  //in case a tween pauses or seeks the timeline when rendering, like inside of an onUpdate/onComplete
                  pauseTween = 0;
                  next && (tTime += this._zTime = adjustedTime ? -_tinyNum : _tinyNum); // it didn't finish rendering, so adjust zTime so that so that the next time render() is called it'll be forced (to render any remaining children)

                  break;
                }
              }

              child = next;
            }
          }

          if (pauseTween && !suppressEvents) {
            this.pause();
            pauseTween.render(time >= prevTime ? 0 : -_tinyNum)._zTime = time >= prevTime ? 1 : -1;

            if (this._ts) {
              //the callback resumed playback! So since we may have held back the playhead due to where the pause is positioned, go ahead and jump to where it's SUPPOSED to be (if no pause happened).
              this._start = prevStart; //if the pause was at an earlier time and the user resumed in the callback, it could reposition the timeline (changing its startTime), throwing things off slightly, so we make sure the _start doesn't shift.

              _setEnd(this);

              return this.render(totalTime, suppressEvents, force);
            }
          }

          this._onUpdate && !suppressEvents && _callback(this, "onUpdate", true);
          if (tTime === tDur && tDur >= this.totalDuration() || !tTime && prevTime) if (prevStart === this._start || Math.abs(timeScale) !== Math.abs(this._ts)) if (!this._lock) {
            (totalTime || !dur) && (tTime === tDur && this._ts > 0 || !tTime && this._ts < 0) && _removeFromParent(this, 1); // don't remove if the timeline is reversed and the playhead isn't at 0, otherwise tl.progress(1).reverse() won't work. Only remove if the playhead is at the end and timeScale is positive, or if the playhead is at 0 and the timeScale is negative.

            if (!suppressEvents && !(totalTime < 0 && !prevTime) && (tTime || prevTime || !tDur)) {
              _callback(this, tTime === tDur && totalTime >= 0 ? "onComplete" : "onReverseComplete", true);

              this._prom && !(tTime < tDur && this.timeScale() > 0) && this._prom();
            }
          }
        }

        return this;
      };

      _proto2.add = function add(child, position) {
        var _this2 = this;

        _isNumber(position) || (position = _parsePosition(this, position, child));

        if (!(child instanceof Animation)) {
          if (_isArray(child)) {
            child.forEach(function (obj) {
              return _this2.add(obj, position);
            });
            return this;
          }

          if (_isString(child)) {
            return this.addLabel(child, position);
          }

          if (_isFunction(child)) {
            child = Tween.delayedCall(0, child);
          } else {
            return this;
          }
        }

        return this !== child ? _addToTimeline(this, child, position) : this; //don't allow a timeline to be added to itself as a child!
      };

      _proto2.getChildren = function getChildren(nested, tweens, timelines, ignoreBeforeTime) {
        if (nested === void 0) {
          nested = true;
        }

        if (tweens === void 0) {
          tweens = true;
        }

        if (timelines === void 0) {
          timelines = true;
        }

        if (ignoreBeforeTime === void 0) {
          ignoreBeforeTime = -_bigNum$1;
        }

        var a = [],
            child = this._first;

        while (child) {
          if (child._start >= ignoreBeforeTime) {
            if (child instanceof Tween) {
              tweens && a.push(child);
            } else {
              timelines && a.push(child);
              nested && a.push.apply(a, child.getChildren(true, tweens, timelines));
            }
          }

          child = child._next;
        }

        return a;
      };

      _proto2.getById = function getById(id) {
        var animations = this.getChildren(1, 1, 1),
            i = animations.length;

        while (i--) {
          if (animations[i].vars.id === id) {
            return animations[i];
          }
        }
      };

      _proto2.remove = function remove(child) {
        if (_isString(child)) {
          return this.removeLabel(child);
        }

        if (_isFunction(child)) {
          return this.killTweensOf(child);
        }

        _removeLinkedListItem(this, child);

        if (child === this._recent) {
          this._recent = this._last;
        }

        return _uncache(this);
      };

      _proto2.totalTime = function totalTime(_totalTime2, suppressEvents) {
        if (!arguments.length) {
          return this._tTime;
        }

        this._forcing = 1;

        if (!this._dp && this._ts) {
          //special case for the global timeline (or any other that has no parent or detached parent).
          this._start = _roundPrecise(_ticker.time - (this._ts > 0 ? _totalTime2 / this._ts : (this.totalDuration() - _totalTime2) / -this._ts));
        }

        _Animation.prototype.totalTime.call(this, _totalTime2, suppressEvents);

        this._forcing = 0;
        return this;
      };

      _proto2.addLabel = function addLabel(label, position) {
        this.labels[label] = _parsePosition(this, position);
        return this;
      };

      _proto2.removeLabel = function removeLabel(label) {
        delete this.labels[label];
        return this;
      };

      _proto2.addPause = function addPause(position, callback, params) {
        var t = Tween.delayedCall(0, callback || _emptyFunc, params);
        t.data = "isPause";
        this._hasPause = 1;
        return _addToTimeline(this, t, _parsePosition(this, position));
      };

      _proto2.removePause = function removePause(position) {
        var child = this._first;
        position = _parsePosition(this, position);

        while (child) {
          if (child._start === position && child.data === "isPause") {
            _removeFromParent(child);
          }

          child = child._next;
        }
      };

      _proto2.killTweensOf = function killTweensOf(targets, props, onlyActive) {
        var tweens = this.getTweensOf(targets, onlyActive),
            i = tweens.length;

        while (i--) {
          _overwritingTween !== tweens[i] && tweens[i].kill(targets, props);
        }

        return this;
      };

      _proto2.getTweensOf = function getTweensOf(targets, onlyActive) {
        var a = [],
            parsedTargets = toArray(targets),
            child = this._first,
            isGlobalTime = _isNumber(onlyActive),
            // a number is interpreted as a global time. If the animation spans
        children;

        while (child) {
          if (child instanceof Tween) {
            if (_arrayContainsAny(child._targets, parsedTargets) && (isGlobalTime ? (!_overwritingTween || child._initted && child._ts) && child.globalTime(0) <= onlyActive && child.globalTime(child.totalDuration()) > onlyActive : !onlyActive || child.isActive())) {
              // note: if this is for overwriting, it should only be for tweens that aren't paused and are initted.
              a.push(child);
            }
          } else if ((children = child.getTweensOf(parsedTargets, onlyActive)).length) {
            a.push.apply(a, children);
          }

          child = child._next;
        }

        return a;
      } // potential future feature - targets() on timelines
      // targets() {
      // 	let result = [];
      // 	this.getChildren(true, true, false).forEach(t => result.push(...t.targets()));
      // 	return result.filter((v, i) => result.indexOf(v) === i);
      // }
      ;

      _proto2.tweenTo = function tweenTo(position, vars) {
        vars = vars || {};

        var tl = this,
            endTime = _parsePosition(tl, position),
            _vars = vars,
            startAt = _vars.startAt,
            _onStart = _vars.onStart,
            onStartParams = _vars.onStartParams,
            immediateRender = _vars.immediateRender,
            initted,
            tween = Tween.to(tl, _setDefaults({
          ease: vars.ease || "none",
          lazy: false,
          immediateRender: false,
          time: endTime,
          overwrite: "auto",
          duration: vars.duration || Math.abs((endTime - (startAt && "time" in startAt ? startAt.time : tl._time)) / tl.timeScale()) || _tinyNum,
          onStart: function onStart() {
            tl.pause();

            if (!initted) {
              var duration = vars.duration || Math.abs((endTime - (startAt && "time" in startAt ? startAt.time : tl._time)) / tl.timeScale());
              tween._dur !== duration && _setDuration(tween, duration, 0, 1).render(tween._time, true, true);
              initted = 1;
            }

            _onStart && _onStart.apply(tween, onStartParams || []); //in case the user had an onStart in the vars - we don't want to overwrite it.
          }
        }, vars));

        return immediateRender ? tween.render(0) : tween;
      };

      _proto2.tweenFromTo = function tweenFromTo(fromPosition, toPosition, vars) {
        return this.tweenTo(toPosition, _setDefaults({
          startAt: {
            time: _parsePosition(this, fromPosition)
          }
        }, vars));
      };

      _proto2.recent = function recent() {
        return this._recent;
      };

      _proto2.nextLabel = function nextLabel(afterTime) {
        if (afterTime === void 0) {
          afterTime = this._time;
        }

        return _getLabelInDirection(this, _parsePosition(this, afterTime));
      };

      _proto2.previousLabel = function previousLabel(beforeTime) {
        if (beforeTime === void 0) {
          beforeTime = this._time;
        }

        return _getLabelInDirection(this, _parsePosition(this, beforeTime), 1);
      };

      _proto2.currentLabel = function currentLabel(value) {
        return arguments.length ? this.seek(value, true) : this.previousLabel(this._time + _tinyNum);
      };

      _proto2.shiftChildren = function shiftChildren(amount, adjustLabels, ignoreBeforeTime) {
        if (ignoreBeforeTime === void 0) {
          ignoreBeforeTime = 0;
        }

        var child = this._first,
            labels = this.labels,
            p;

        while (child) {
          if (child._start >= ignoreBeforeTime) {
            child._start += amount;
            child._end += amount;
          }

          child = child._next;
        }

        if (adjustLabels) {
          for (p in labels) {
            if (labels[p] >= ignoreBeforeTime) {
              labels[p] += amount;
            }
          }
        }

        return _uncache(this);
      };

      _proto2.invalidate = function invalidate() {
        var child = this._first;
        this._lock = 0;

        while (child) {
          child.invalidate();
          child = child._next;
        }

        return _Animation.prototype.invalidate.call(this);
      };

      _proto2.clear = function clear(includeLabels) {
        if (includeLabels === void 0) {
          includeLabels = true;
        }

        var child = this._first,
            next;

        while (child) {
          next = child._next;
          this.remove(child);
          child = next;
        }

        this._dp && (this._time = this._tTime = this._pTime = 0);
        includeLabels && (this.labels = {});
        return _uncache(this);
      };

      _proto2.totalDuration = function totalDuration(value) {
        var max = 0,
            self = this,
            child = self._last,
            prevStart = _bigNum$1,
            prev,
            start,
            parent;

        if (arguments.length) {
          return self.timeScale((self._repeat < 0 ? self.duration() : self.totalDuration()) / (self.reversed() ? -value : value));
        }

        if (self._dirty) {
          parent = self.parent;

          while (child) {
            prev = child._prev; //record it here in case the tween changes position in the sequence...

            child._dirty && child.totalDuration(); //could change the tween._startTime, so make sure the animation's cache is clean before analyzing it.

            start = child._start;

            if (start > prevStart && self._sort && child._ts && !self._lock) {
              //in case one of the tweens shifted out of order, it needs to be re-inserted into the correct position in the sequence
              self._lock = 1; //prevent endless recursive calls - there are methods that get triggered that check duration/totalDuration when we add().

              _addToTimeline(self, child, start - child._delay, 1)._lock = 0;
            } else {
              prevStart = start;
            }

            if (start < 0 && child._ts) {
              //children aren't allowed to have negative startTimes unless smoothChildTiming is true, so adjust here if one is found.
              max -= start;

              if (!parent && !self._dp || parent && parent.smoothChildTiming) {
                self._start += start / self._ts;
                self._time -= start;
                self._tTime -= start;
              }

              self.shiftChildren(-start, false, -1e999);
              prevStart = 0;
            }

            child._end > max && child._ts && (max = child._end);
            child = prev;
          }

          _setDuration(self, self === _globalTimeline && self._time > max ? self._time : max, 1, 1);

          self._dirty = 0;
        }

        return self._tDur;
      };

      Timeline.updateRoot = function updateRoot(time) {
        if (_globalTimeline._ts) {
          _lazySafeRender(_globalTimeline, _parentToChildTotalTime(time, _globalTimeline));

          _lastRenderedFrame = _ticker.frame;
        }

        if (_ticker.frame >= _nextGCFrame) {
          _nextGCFrame += _config.autoSleep || 120;
          var child = _globalTimeline._first;
          if (!child || !child._ts) if (_config.autoSleep && _ticker._listeners.length < 2) {
            while (child && !child._ts) {
              child = child._next;
            }

            child || _ticker.sleep();
          }
        }
      };

      return Timeline;
    }(Animation);

    _setDefaults(Timeline.prototype, {
      _lock: 0,
      _hasPause: 0,
      _forcing: 0
    });

    var _addComplexStringPropTween = function _addComplexStringPropTween(target, prop, start, end, setter, stringFilter, funcParam) {
      //note: we call _addComplexStringPropTween.call(tweenInstance...) to ensure that it's scoped properly. We may call it from within a plugin too, thus "this" would refer to the plugin.
      var pt = new PropTween(this._pt, target, prop, 0, 1, _renderComplexString, null, setter),
          index = 0,
          matchIndex = 0,
          result,
          startNums,
          color,
          endNum,
          chunk,
          startNum,
          hasRandom,
          a;
      pt.b = start;
      pt.e = end;
      start += ""; //ensure values are strings

      end += "";

      if (hasRandom = ~end.indexOf("random(")) {
        end = _replaceRandom(end);
      }

      if (stringFilter) {
        a = [start, end];
        stringFilter(a, target, prop); //pass an array with the starting and ending values and let the filter do whatever it needs to the values.

        start = a[0];
        end = a[1];
      }

      startNums = start.match(_complexStringNumExp) || [];

      while (result = _complexStringNumExp.exec(end)) {
        endNum = result[0];
        chunk = end.substring(index, result.index);

        if (color) {
          color = (color + 1) % 5;
        } else if (chunk.substr(-5) === "rgba(") {
          color = 1;
        }

        if (endNum !== startNums[matchIndex++]) {
          startNum = parseFloat(startNums[matchIndex - 1]) || 0; //these nested PropTweens are handled in a special way - we'll never actually call a render or setter method on them. We'll just loop through them in the parent complex string PropTween's render method.

          pt._pt = {
            _next: pt._pt,
            p: chunk || matchIndex === 1 ? chunk : ",",
            //note: SVG spec allows omission of comma/space when a negative sign is wedged between two numbers, like 2.5-5.3 instead of 2.5,-5.3 but when tweening, the negative value may switch to positive, so we insert the comma just in case.
            s: startNum,
            c: endNum.charAt(1) === "=" ? parseFloat(endNum.substr(2)) * (endNum.charAt(0) === "-" ? -1 : 1) : parseFloat(endNum) - startNum,
            m: color && color < 4 ? Math.round : 0
          };
          index = _complexStringNumExp.lastIndex;
        }
      }

      pt.c = index < end.length ? end.substring(index, end.length) : ""; //we use the "c" of the PropTween to store the final part of the string (after the last number)

      pt.fp = funcParam;

      if (_relExp.test(end) || hasRandom) {
        pt.e = 0; //if the end string contains relative values or dynamic random(...) values, delete the end it so that on the final render we don't actually set it to the string with += or -= characters (forces it to use the calculated value).
      }

      this._pt = pt; //start the linked list with this new PropTween. Remember, we call _addComplexStringPropTween.call(tweenInstance...) to ensure that it's scoped properly. We may call it from within a plugin too, thus "this" would refer to the plugin.

      return pt;
    },
        _addPropTween = function _addPropTween(target, prop, start, end, index, targets, modifier, stringFilter, funcParam) {
      _isFunction(end) && (end = end(index || 0, target, targets));
      var currentValue = target[prop],
          parsedStart = start !== "get" ? start : !_isFunction(currentValue) ? currentValue : funcParam ? target[prop.indexOf("set") || !_isFunction(target["get" + prop.substr(3)]) ? prop : "get" + prop.substr(3)](funcParam) : target[prop](),
          setter = !_isFunction(currentValue) ? _setterPlain : funcParam ? _setterFuncWithParam : _setterFunc,
          pt;

      if (_isString(end)) {
        if (~end.indexOf("random(")) {
          end = _replaceRandom(end);
        }

        if (end.charAt(1) === "=") {
          pt = parseFloat(parsedStart) + parseFloat(end.substr(2)) * (end.charAt(0) === "-" ? -1 : 1) + (getUnit(parsedStart) || 0);

          if (pt || pt === 0) {
            // to avoid isNaN, like if someone passes in a value like "!= whatever"
            end = pt;
          }
        }
      }

      if (parsedStart !== end) {
        if (!isNaN(parsedStart * end) && end !== "") {
          // fun fact: any number multiplied by "" is evaluated as the number 0!
          pt = new PropTween(this._pt, target, prop, +parsedStart || 0, end - (parsedStart || 0), typeof currentValue === "boolean" ? _renderBoolean : _renderPlain, 0, setter);
          funcParam && (pt.fp = funcParam);
          modifier && pt.modifier(modifier, this, target);
          return this._pt = pt;
        }

        !currentValue && !(prop in target) && _missingPlugin(prop, end);
        return _addComplexStringPropTween.call(this, target, prop, parsedStart, end, setter, stringFilter || _config.stringFilter, funcParam);
      }
    },
        //creates a copy of the vars object and processes any function-based values (putting the resulting values directly into the copy) as well as strings with "random()" in them. It does NOT process relative values.
    _processVars = function _processVars(vars, index, target, targets, tween) {
      _isFunction(vars) && (vars = _parseFuncOrString(vars, tween, index, target, targets));

      if (!_isObject(vars) || vars.style && vars.nodeType || _isArray(vars) || _isTypedArray(vars)) {
        return _isString(vars) ? _parseFuncOrString(vars, tween, index, target, targets) : vars;
      }

      var copy = {},
          p;

      for (p in vars) {
        copy[p] = _parseFuncOrString(vars[p], tween, index, target, targets);
      }

      return copy;
    },
        _checkPlugin = function _checkPlugin(property, vars, tween, index, target, targets) {
      var plugin, pt, ptLookup, i;

      if (_plugins[property] && (plugin = new _plugins[property]()).init(target, plugin.rawVars ? vars[property] : _processVars(vars[property], index, target, targets, tween), tween, index, targets) !== false) {
        tween._pt = pt = new PropTween(tween._pt, target, property, 0, 1, plugin.render, plugin, 0, plugin.priority);

        if (tween !== _quickTween) {
          ptLookup = tween._ptLookup[tween._targets.indexOf(target)]; //note: we can't use tween._ptLookup[index] because for staggered tweens, the index from the fullTargets array won't match what it is in each individual tween that spawns from the stagger.

          i = plugin._props.length;

          while (i--) {
            ptLookup[plugin._props[i]] = pt;
          }
        }
      }

      return plugin;
    },
        _overwritingTween,
        //store a reference temporarily so we can avoid overwriting itself.
    _initTween = function _initTween(tween, time) {
      var vars = tween.vars,
          ease = vars.ease,
          startAt = vars.startAt,
          immediateRender = vars.immediateRender,
          lazy = vars.lazy,
          onUpdate = vars.onUpdate,
          onUpdateParams = vars.onUpdateParams,
          callbackScope = vars.callbackScope,
          runBackwards = vars.runBackwards,
          yoyoEase = vars.yoyoEase,
          keyframes = vars.keyframes,
          autoRevert = vars.autoRevert,
          dur = tween._dur,
          prevStartAt = tween._startAt,
          targets = tween._targets,
          parent = tween.parent,
          fullTargets = parent && parent.data === "nested" ? parent.parent._targets : targets,
          autoOverwrite = tween._overwrite === "auto" && !_suppressOverwrites,
          tl = tween.timeline,
          cleanVars,
          i,
          p,
          pt,
          target,
          hasPriority,
          gsData,
          harness,
          plugin,
          ptLookup,
          index,
          harnessVars,
          overwritten;
      tl && (!keyframes || !ease) && (ease = "none");
      tween._ease = _parseEase(ease, _defaults.ease);
      tween._yEase = yoyoEase ? _invertEase(_parseEase(yoyoEase === true ? ease : yoyoEase, _defaults.ease)) : 0;

      if (yoyoEase && tween._yoyo && !tween._repeat) {
        //there must have been a parent timeline with yoyo:true that is currently in its yoyo phase, so flip the eases.
        yoyoEase = tween._yEase;
        tween._yEase = tween._ease;
        tween._ease = yoyoEase;
      }

      tween._from = !tl && !!vars.runBackwards; //nested timelines should never run backwards - the backwards-ness is in the child tweens.

      if (!tl || keyframes && !vars.stagger) {
        //if there's an internal timeline, skip all the parsing because we passed that task down the chain.
        harness = targets[0] ? _getCache(targets[0]).harness : 0;
        harnessVars = harness && vars[harness.prop]; //someone may need to specify CSS-specific values AND non-CSS values, like if the element has an "x" property plus it's a standard DOM element. We allow people to distinguish by wrapping plugin-specific stuff in a css:{} object for example.

        cleanVars = _copyExcluding(vars, _reservedProps);
        prevStartAt && _removeFromParent(prevStartAt.render(-1, true));

        if (startAt) {
          _removeFromParent(tween._startAt = Tween.set(targets, _setDefaults({
            data: "isStart",
            overwrite: false,
            parent: parent,
            immediateRender: true,
            lazy: _isNotFalse(lazy),
            startAt: null,
            delay: 0,
            onUpdate: onUpdate,
            onUpdateParams: onUpdateParams,
            callbackScope: callbackScope,
            stagger: 0
          }, startAt))); //copy the properties/values into a new object to avoid collisions, like var to = {x:0}, from = {x:500}; timeline.fromTo(e, from, to).fromTo(e, to, from);


          time < 0 && !immediateRender && !autoRevert && tween._startAt.render(-1, true); // rare edge case, like if a render is forced in the negative direction of a non-initted tween.

          if (immediateRender) {
            time > 0 && !autoRevert && (tween._startAt = 0); //tweens that render immediately (like most from() and fromTo() tweens) shouldn't revert when their parent timeline's playhead goes backward past the startTime because the initial render could have happened anytime and it shouldn't be directly correlated to this tween's startTime. Imagine setting up a complex animation where the beginning states of various objects are rendered immediately but the tween doesn't happen for quite some time - if we revert to the starting values as soon as the playhead goes backward past the tween's startTime, it will throw things off visually. Reversion should only happen in Timeline instances where immediateRender was false or when autoRevert is explicitly set to true.

            if (dur && time <= 0) {
              time && (tween._zTime = time);
              return; //we skip initialization here so that overwriting doesn't occur until the tween actually begins. Otherwise, if you create several immediateRender:true tweens of the same target/properties to drop into a Timeline, the last one created would overwrite the first ones because they didn't get placed into the timeline yet before the first render occurs and kicks in overwriting.
            } // if (time > 0) {
            // 	autoRevert || (tween._startAt = 0); //tweens that render immediately (like most from() and fromTo() tweens) shouldn't revert when their parent timeline's playhead goes backward past the startTime because the initial render could have happened anytime and it shouldn't be directly correlated to this tween's startTime. Imagine setting up a complex animation where the beginning states of various objects are rendered immediately but the tween doesn't happen for quite some time - if we revert to the starting values as soon as the playhead goes backward past the tween's startTime, it will throw things off visually. Reversion should only happen in Timeline instances where immediateRender was false or when autoRevert is explicitly set to true.
            // } else if (dur && !(time < 0 && prevStartAt)) {
            // 	time && (tween._zTime = time);
            // 	return; //we skip initialization here so that overwriting doesn't occur until the tween actually begins. Otherwise, if you create several immediateRender:true tweens of the same target/properties to drop into a Timeline, the last one created would overwrite the first ones because they didn't get placed into the timeline yet before the first render occurs and kicks in overwriting.
            // }

          } else if (autoRevert === false) {
            tween._startAt = 0;
          }
        } else if (runBackwards && dur) {
          //from() tweens must be handled uniquely: their beginning values must be rendered but we don't want overwriting to occur yet (when time is still 0). Wait until the tween actually begins before doing all the routines like overwriting. At that time, we should render at the END of the tween to ensure that things initialize correctly (remember, from() tweens go backwards)
          if (prevStartAt) {
            !autoRevert && (tween._startAt = 0);
          } else {
            time && (immediateRender = false); //in rare cases (like if a from() tween runs and then is invalidate()-ed), immediateRender could be true but the initial forced-render gets skipped, so there's no need to force the render in this context when the _time is greater than 0

            p = _setDefaults({
              overwrite: false,
              data: "isFromStart",
              //we tag the tween with as "isFromStart" so that if [inside a plugin] we need to only do something at the very END of a tween, we have a way of identifying this tween as merely the one that's setting the beginning values for a "from()" tween. For example, clearProps in CSSPlugin should only get applied at the very END of a tween and without this tag, from(...{height:100, clearProps:"height", delay:1}) would wipe the height at the beginning of the tween and after 1 second, it'd kick back in.
              lazy: immediateRender && _isNotFalse(lazy),
              immediateRender: immediateRender,
              //zero-duration tweens render immediately by default, but if we're not specifically instructed to render this tween immediately, we should skip this and merely _init() to record the starting values (rendering them immediately would push them to completion which is wasteful in that case - we'd have to render(-1) immediately after)
              stagger: 0,
              parent: parent //ensures that nested tweens that had a stagger are handled properly, like gsap.from(".class", {y:gsap.utils.wrap([-100,100])})

            }, cleanVars);
            harnessVars && (p[harness.prop] = harnessVars); // in case someone does something like .from(..., {css:{}})

            _removeFromParent(tween._startAt = Tween.set(targets, p));

            time < 0 && tween._startAt.render(-1, true); // rare edge case, like if a render is forced in the negative direction of a non-initted from() tween.

            tween._zTime = time;

            if (!immediateRender) {
              _initTween(tween._startAt, _tinyNum); //ensures that the initial values are recorded

            } else if (!time) {
              return;
            }
          }
        }

        tween._pt = 0;
        lazy = dur && _isNotFalse(lazy) || lazy && !dur;

        for (i = 0; i < targets.length; i++) {
          target = targets[i];
          gsData = target._gsap || _harness(targets)[i]._gsap;
          tween._ptLookup[i] = ptLookup = {};
          _lazyLookup[gsData.id] && _lazyTweens.length && _lazyRender(); //if other tweens of the same target have recently initted but haven't rendered yet, we've got to force the render so that the starting values are correct (imagine populating a timeline with a bunch of sequential tweens and then jumping to the end)

          index = fullTargets === targets ? i : fullTargets.indexOf(target);

          if (harness && (plugin = new harness()).init(target, harnessVars || cleanVars, tween, index, fullTargets) !== false) {
            tween._pt = pt = new PropTween(tween._pt, target, plugin.name, 0, 1, plugin.render, plugin, 0, plugin.priority);

            plugin._props.forEach(function (name) {
              ptLookup[name] = pt;
            });

            plugin.priority && (hasPriority = 1);
          }

          if (!harness || harnessVars) {
            for (p in cleanVars) {
              if (_plugins[p] && (plugin = _checkPlugin(p, cleanVars, tween, index, target, fullTargets))) {
                plugin.priority && (hasPriority = 1);
              } else {
                ptLookup[p] = pt = _addPropTween.call(tween, target, p, "get", cleanVars[p], index, fullTargets, 0, vars.stringFilter);
              }
            }
          }

          tween._op && tween._op[i] && tween.kill(target, tween._op[i]);

          if (autoOverwrite && tween._pt) {
            _overwritingTween = tween;

            _globalTimeline.killTweensOf(target, ptLookup, tween.globalTime(time)); // make sure the overwriting doesn't overwrite THIS tween!!!


            overwritten = !tween.parent;
            _overwritingTween = 0;
          }

          tween._pt && lazy && (_lazyLookup[gsData.id] = 1);
        }

        hasPriority && _sortPropTweensByPriority(tween);
        tween._onInit && tween._onInit(tween); //plugins like RoundProps must wait until ALL of the PropTweens are instantiated. In the plugin's init() function, it sets the _onInit on the tween instance. May not be pretty/intuitive, but it's fast and keeps file size down.
      }

      tween._onUpdate = onUpdate;
      tween._initted = (!tween._op || tween._pt) && !overwritten; // if overwrittenProps resulted in the entire tween being killed, do NOT flag it as initted or else it may render for one tick.

      keyframes && time <= 0 && tl.render(_bigNum$1, true, true); // if there's a 0% keyframe, it'll render in the "before" state for any staggered/delayed animations thus when the following tween initializes, it'll use the "before" state instead of the "after" state as the initial values.
    },
        _addAliasesToVars = function _addAliasesToVars(targets, vars) {
      var harness = targets[0] ? _getCache(targets[0]).harness : 0,
          propertyAliases = harness && harness.aliases,
          copy,
          p,
          i,
          aliases;

      if (!propertyAliases) {
        return vars;
      }

      copy = _merge({}, vars);

      for (p in propertyAliases) {
        if (p in copy) {
          aliases = propertyAliases[p].split(",");
          i = aliases.length;

          while (i--) {
            copy[aliases[i]] = copy[p];
          }
        }
      }

      return copy;
    },
        // parses multiple formats, like {"0%": {x: 100}, {"50%": {x: -20}} and { x: {"0%": 100, "50%": -20} }, and an "ease" can be set on any object. We populate an "allProps" object with an Array for each property, like {x: [{}, {}], y:[{}, {}]} with data for each property tween. The objects have a "t" (time), "v", (value), and "e" (ease) property. This allows us to piece together a timeline later.
    _parseKeyframe = function _parseKeyframe(prop, obj, allProps, easeEach) {
      var ease = obj.ease || easeEach || "power1.inOut",
          p,
          a;

      if (_isArray(obj)) {
        a = allProps[prop] || (allProps[prop] = []); // t = time (out of 100), v = value, e = ease

        obj.forEach(function (value, i) {
          return a.push({
            t: i / (obj.length - 1) * 100,
            v: value,
            e: ease
          });
        });
      } else {
        for (p in obj) {
          a = allProps[p] || (allProps[p] = []);
          p === "ease" || a.push({
            t: parseFloat(prop),
            v: obj[p],
            e: ease
          });
        }
      }
    },
        _parseFuncOrString = function _parseFuncOrString(value, tween, i, target, targets) {
      return _isFunction(value) ? value.call(tween, i, target, targets) : _isString(value) && ~value.indexOf("random(") ? _replaceRandom(value) : value;
    },
        _staggerTweenProps = _callbackNames + "repeat,repeatDelay,yoyo,repeatRefresh,yoyoEase",
        _staggerPropsToSkip = {};

    _forEachName(_staggerTweenProps + ",id,stagger,delay,duration,paused,scrollTrigger", function (name) {
      return _staggerPropsToSkip[name] = 1;
    });
    /*
     * --------------------------------------------------------------------------------------
     * TWEEN
     * --------------------------------------------------------------------------------------
     */


    var Tween = /*#__PURE__*/function (_Animation2) {
      _inheritsLoose(Tween, _Animation2);

      function Tween(targets, vars, position, skipInherit) {
        var _this3;

        if (typeof vars === "number") {
          position.duration = vars;
          vars = position;
          position = null;
        }

        _this3 = _Animation2.call(this, skipInherit ? vars : _inheritDefaults(vars)) || this;
        var _this3$vars = _this3.vars,
            duration = _this3$vars.duration,
            delay = _this3$vars.delay,
            immediateRender = _this3$vars.immediateRender,
            stagger = _this3$vars.stagger,
            overwrite = _this3$vars.overwrite,
            keyframes = _this3$vars.keyframes,
            defaults = _this3$vars.defaults,
            scrollTrigger = _this3$vars.scrollTrigger,
            yoyoEase = _this3$vars.yoyoEase,
            parent = vars.parent || _globalTimeline,
            parsedTargets = (_isArray(targets) || _isTypedArray(targets) ? _isNumber(targets[0]) : "length" in vars) ? [targets] : toArray(targets),
            tl,
            i,
            copy,
            l,
            p,
            curTarget,
            staggerFunc,
            staggerVarsToMerge;
        _this3._targets = parsedTargets.length ? _harness(parsedTargets) : _warn("GSAP target " + targets + " not found. https://greensock.com", !_config.nullTargetWarn) || [];
        _this3._ptLookup = []; //PropTween lookup. An array containing an object for each target, having keys for each tweening property

        _this3._overwrite = overwrite;

        if (keyframes || stagger || _isFuncOrString(duration) || _isFuncOrString(delay)) {
          vars = _this3.vars;
          tl = _this3.timeline = new Timeline({
            data: "nested",
            defaults: defaults || {}
          });
          tl.kill();
          tl.parent = tl._dp = _assertThisInitialized(_this3);
          tl._start = 0;

          if (stagger || _isFuncOrString(duration) || _isFuncOrString(delay)) {
            l = parsedTargets.length;
            staggerFunc = stagger && distribute(stagger);

            if (_isObject(stagger)) {
              //users can pass in callbacks like onStart/onComplete in the stagger object. These should fire with each individual tween.
              for (p in stagger) {
                if (~_staggerTweenProps.indexOf(p)) {
                  staggerVarsToMerge || (staggerVarsToMerge = {});
                  staggerVarsToMerge[p] = stagger[p];
                }
              }
            }

            for (i = 0; i < l; i++) {
              copy = _copyExcluding(vars, _staggerPropsToSkip);
              copy.stagger = 0;
              yoyoEase && (copy.yoyoEase = yoyoEase);
              staggerVarsToMerge && _merge(copy, staggerVarsToMerge);
              curTarget = parsedTargets[i]; //don't just copy duration or delay because if they're a string or function, we'd end up in an infinite loop because _isFuncOrString() would evaluate as true in the child tweens, entering this loop, etc. So we parse the value straight from vars and default to 0.

              copy.duration = +_parseFuncOrString(duration, _assertThisInitialized(_this3), i, curTarget, parsedTargets);
              copy.delay = (+_parseFuncOrString(delay, _assertThisInitialized(_this3), i, curTarget, parsedTargets) || 0) - _this3._delay;

              if (!stagger && l === 1 && copy.delay) {
                // if someone does delay:"random(1, 5)", repeat:-1, for example, the delay shouldn't be inside the repeat.
                _this3._delay = delay = copy.delay;
                _this3._start += delay;
                copy.delay = 0;
              }

              tl.to(curTarget, copy, staggerFunc ? staggerFunc(i, curTarget, parsedTargets) : 0);
              tl._ease = _easeMap.none;
            }

            tl.duration() ? duration = delay = 0 : _this3.timeline = 0; // if the timeline's duration is 0, we don't need a timeline internally!
          } else if (keyframes) {
            _inheritDefaults(_setDefaults(tl.vars.defaults, {
              ease: "none"
            }));

            tl._ease = _parseEase(keyframes.ease || vars.ease || "none");
            var time = 0,
                a,
                kf,
                v;

            if (_isArray(keyframes)) {
              keyframes.forEach(function (frame) {
                return tl.to(parsedTargets, frame, ">");
              });
            } else {
              copy = {};

              for (p in keyframes) {
                p === "ease" || p === "easeEach" || _parseKeyframe(p, keyframes[p], copy, keyframes.easeEach);
              }

              for (p in copy) {
                a = copy[p].sort(function (a, b) {
                  return a.t - b.t;
                });
                time = 0;

                for (i = 0; i < a.length; i++) {
                  kf = a[i];
                  v = {
                    ease: kf.e,
                    duration: (kf.t - (i ? a[i - 1].t : 0)) / 100 * duration
                  };
                  v[p] = kf.v;
                  tl.to(parsedTargets, v, time);
                  time += v.duration;
                }
              }

              tl.duration() < duration && tl.to({}, {
                duration: duration - tl.duration()
              }); // in case keyframes didn't go to 100%
            }
          }

          duration || _this3.duration(duration = tl.duration());
        } else {
          _this3.timeline = 0; //speed optimization, faster lookups (no going up the prototype chain)
        }

        if (overwrite === true && !_suppressOverwrites) {
          _overwritingTween = _assertThisInitialized(_this3);

          _globalTimeline.killTweensOf(parsedTargets);

          _overwritingTween = 0;
        }

        _addToTimeline(parent, _assertThisInitialized(_this3), position);

        vars.reversed && _this3.reverse();
        vars.paused && _this3.paused(true);

        if (immediateRender || !duration && !keyframes && _this3._start === _roundPrecise(parent._time) && _isNotFalse(immediateRender) && _hasNoPausedAncestors(_assertThisInitialized(_this3)) && parent.data !== "nested") {
          _this3._tTime = -_tinyNum; //forces a render without having to set the render() "force" parameter to true because we want to allow lazying by default (using the "force" parameter always forces an immediate full render)

          _this3.render(Math.max(0, -delay)); //in case delay is negative

        }

        scrollTrigger && _scrollTrigger(_assertThisInitialized(_this3), scrollTrigger);
        return _this3;
      }

      var _proto3 = Tween.prototype;

      _proto3.render = function render(totalTime, suppressEvents, force) {
        var prevTime = this._time,
            tDur = this._tDur,
            dur = this._dur,
            tTime = totalTime > tDur - _tinyNum && totalTime >= 0 ? tDur : totalTime < _tinyNum ? 0 : totalTime,
            time,
            pt,
            iteration,
            cycleDuration,
            prevIteration,
            isYoyo,
            ratio,
            timeline,
            yoyoEase;

        if (!dur) {
          _renderZeroDurationTween(this, totalTime, suppressEvents, force);
        } else if (tTime !== this._tTime || !totalTime || force || !this._initted && this._tTime || this._startAt && this._zTime < 0 !== totalTime < 0) {
          //this senses if we're crossing over the start time, in which case we must record _zTime and force the render, but we do it in this lengthy conditional way for performance reasons (usually we can skip the calculations): this._initted && (this._zTime < 0) !== (totalTime < 0)
          time = tTime;
          timeline = this.timeline;

          if (this._repeat) {
            //adjust the time for repeats and yoyos
            cycleDuration = dur + this._rDelay;

            if (this._repeat < -1 && totalTime < 0) {
              return this.totalTime(cycleDuration * 100 + totalTime, suppressEvents, force);
            }

            time = _roundPrecise(tTime % cycleDuration); //round to avoid floating point errors. (4 % 0.8 should be 0 but some browsers report it as 0.79999999!)

            if (tTime === tDur) {
              // the tDur === tTime is for edge cases where there's a lengthy decimal on the duration and it may reach the very end but the time is rendered as not-quite-there (remember, tDur is rounded to 4 decimals whereas dur isn't)
              iteration = this._repeat;
              time = dur;
            } else {
              iteration = ~~(tTime / cycleDuration);

              if (iteration && iteration === tTime / cycleDuration) {
                time = dur;
                iteration--;
              }

              time > dur && (time = dur);
            }

            isYoyo = this._yoyo && iteration & 1;

            if (isYoyo) {
              yoyoEase = this._yEase;
              time = dur - time;
            }

            prevIteration = _animationCycle(this._tTime, cycleDuration);

            if (time === prevTime && !force && this._initted) {
              //could be during the repeatDelay part. No need to render and fire callbacks.
              return this;
            }

            if (iteration !== prevIteration) {
              timeline && this._yEase && _propagateYoyoEase(timeline, isYoyo); //repeatRefresh functionality

              if (this.vars.repeatRefresh && !isYoyo && !this._lock) {
                this._lock = force = 1; //force, otherwise if lazy is true, the _attemptInitTween() will return and we'll jump out and get caught bouncing on each tick.

                this.render(_roundPrecise(cycleDuration * iteration), true).invalidate()._lock = 0;
              }
            }
          }

          if (!this._initted) {
            if (_attemptInitTween(this, totalTime < 0 ? totalTime : time, force, suppressEvents)) {
              this._tTime = 0; // in constructor if immediateRender is true, we set _tTime to -_tinyNum to have the playhead cross the starting point but we can't leave _tTime as a negative number.

              return this;
            }

            if (dur !== this._dur) {
              // while initting, a plugin like InertiaPlugin might alter the duration, so rerun from the start to ensure everything renders as it should.
              return this.render(totalTime, suppressEvents, force);
            }
          }

          this._tTime = tTime;
          this._time = time;

          if (!this._act && this._ts) {
            this._act = 1; //as long as it's not paused, force it to be active so that if the user renders independent of the parent timeline, it'll be forced to re-render on the next tick.

            this._lazy = 0;
          }

          this.ratio = ratio = (yoyoEase || this._ease)(time / dur);

          if (this._from) {
            this.ratio = ratio = 1 - ratio;
          }

          if (time && !prevTime && !suppressEvents) {
            _callback(this, "onStart");

            if (this._tTime !== tTime) {
              // in case the onStart triggered a render at a different spot, eject. Like if someone did animation.pause(0.5) or something inside the onStart.
              return this;
            }
          }

          pt = this._pt;

          while (pt) {
            pt.r(ratio, pt.d);
            pt = pt._next;
          }

          timeline && timeline.render(totalTime < 0 ? totalTime : !time && isYoyo ? -_tinyNum : timeline._dur * timeline._ease(time / this._dur), suppressEvents, force) || this._startAt && (this._zTime = totalTime);

          if (this._onUpdate && !suppressEvents) {
            totalTime < 0 && this._startAt && this._startAt.render(totalTime, true, force); //note: for performance reasons, we tuck this conditional logic inside less traveled areas (most tweens don't have an onUpdate). We'd just have it at the end before the onComplete, but the values should be updated before any onUpdate is called, so we ALSO put it here and then if it's not called, we do so later near the onComplete.

            _callback(this, "onUpdate");
          }

          this._repeat && iteration !== prevIteration && this.vars.onRepeat && !suppressEvents && this.parent && _callback(this, "onRepeat");

          if ((tTime === this._tDur || !tTime) && this._tTime === tTime) {
            totalTime < 0 && this._startAt && !this._onUpdate && this._startAt.render(totalTime, true, true);
            (totalTime || !dur) && (tTime === this._tDur && this._ts > 0 || !tTime && this._ts < 0) && _removeFromParent(this, 1); // don't remove if we're rendering at exactly a time of 0, as there could be autoRevert values that should get set on the next tick (if the playhead goes backward beyond the startTime, negative totalTime). Don't remove if the timeline is reversed and the playhead isn't at 0, otherwise tl.progress(1).reverse() won't work. Only remove if the playhead is at the end and timeScale is positive, or if the playhead is at 0 and the timeScale is negative.

            if (!suppressEvents && !(totalTime < 0 && !prevTime) && (tTime || prevTime)) {
              // if prevTime and tTime are zero, we shouldn't fire the onReverseComplete. This could happen if you gsap.to(... {paused:true}).play();
              _callback(this, tTime === tDur ? "onComplete" : "onReverseComplete", true);

              this._prom && !(tTime < tDur && this.timeScale() > 0) && this._prom();
            }
          }
        }

        return this;
      };

      _proto3.targets = function targets() {
        return this._targets;
      };

      _proto3.invalidate = function invalidate() {
        this._pt = this._op = this._startAt = this._onUpdate = this._lazy = this.ratio = 0;
        this._ptLookup = [];
        this.timeline && this.timeline.invalidate();
        return _Animation2.prototype.invalidate.call(this);
      };

      _proto3.kill = function kill(targets, vars) {
        if (vars === void 0) {
          vars = "all";
        }

        if (!targets && (!vars || vars === "all")) {
          this._lazy = this._pt = 0;
          return this.parent ? _interrupt(this) : this;
        }

        if (this.timeline) {
          var tDur = this.timeline.totalDuration();
          this.timeline.killTweensOf(targets, vars, _overwritingTween && _overwritingTween.vars.overwrite !== true)._first || _interrupt(this); // if nothing is left tweening, interrupt.

          this.parent && tDur !== this.timeline.totalDuration() && _setDuration(this, this._dur * this.timeline._tDur / tDur, 0, 1); // if a nested tween is killed that changes the duration, it should affect this tween's duration. We must use the ratio, though, because sometimes the internal timeline is stretched like for keyframes where they don't all add up to whatever the parent tween's duration was set to.

          return this;
        }

        var parsedTargets = this._targets,
            killingTargets = targets ? toArray(targets) : parsedTargets,
            propTweenLookup = this._ptLookup,
            firstPT = this._pt,
            overwrittenProps,
            curLookup,
            curOverwriteProps,
            props,
            p,
            pt,
            i;

        if ((!vars || vars === "all") && _arraysMatch(parsedTargets, killingTargets)) {
          vars === "all" && (this._pt = 0);
          return _interrupt(this);
        }

        overwrittenProps = this._op = this._op || [];

        if (vars !== "all") {
          //so people can pass in a comma-delimited list of property names
          if (_isString(vars)) {
            p = {};

            _forEachName(vars, function (name) {
              return p[name] = 1;
            });

            vars = p;
          }

          vars = _addAliasesToVars(parsedTargets, vars);
        }

        i = parsedTargets.length;

        while (i--) {
          if (~killingTargets.indexOf(parsedTargets[i])) {
            curLookup = propTweenLookup[i];

            if (vars === "all") {
              overwrittenProps[i] = vars;
              props = curLookup;
              curOverwriteProps = {};
            } else {
              curOverwriteProps = overwrittenProps[i] = overwrittenProps[i] || {};
              props = vars;
            }

            for (p in props) {
              pt = curLookup && curLookup[p];

              if (pt) {
                if (!("kill" in pt.d) || pt.d.kill(p) === true) {
                  _removeLinkedListItem(this, pt, "_pt");
                }

                delete curLookup[p];
              }

              if (curOverwriteProps !== "all") {
                curOverwriteProps[p] = 1;
              }
            }
          }
        }

        this._initted && !this._pt && firstPT && _interrupt(this); //if all tweening properties are killed, kill the tween. Without this line, if there's a tween with multiple targets and then you killTweensOf() each target individually, the tween would technically still remain active and fire its onComplete even though there aren't any more properties tweening.

        return this;
      };

      Tween.to = function to(targets, vars) {
        return new Tween(targets, vars, arguments[2]);
      };

      Tween.from = function from(targets, vars) {
        return _createTweenType(1, arguments);
      };

      Tween.delayedCall = function delayedCall(delay, callback, params, scope) {
        return new Tween(callback, 0, {
          immediateRender: false,
          lazy: false,
          overwrite: false,
          delay: delay,
          onComplete: callback,
          onReverseComplete: callback,
          onCompleteParams: params,
          onReverseCompleteParams: params,
          callbackScope: scope
        });
      };

      Tween.fromTo = function fromTo(targets, fromVars, toVars) {
        return _createTweenType(2, arguments);
      };

      Tween.set = function set(targets, vars) {
        vars.duration = 0;
        vars.repeatDelay || (vars.repeat = 0);
        return new Tween(targets, vars);
      };

      Tween.killTweensOf = function killTweensOf(targets, props, onlyActive) {
        return _globalTimeline.killTweensOf(targets, props, onlyActive);
      };

      return Tween;
    }(Animation);

    _setDefaults(Tween.prototype, {
      _targets: [],
      _lazy: 0,
      _startAt: 0,
      _op: 0,
      _onInit: 0
    }); //add the pertinent timeline methods to Tween instances so that users can chain conveniently and create a timeline automatically. (removed due to concerns that it'd ultimately add to more confusion especially for beginners)
    // _forEachName("to,from,fromTo,set,call,add,addLabel,addPause", name => {
    // 	Tween.prototype[name] = function() {
    // 		let tl = new Timeline();
    // 		return _addToTimeline(tl, this)[name].apply(tl, toArray(arguments));
    // 	}
    // });
    //for backward compatibility. Leverage the timeline calls.


    _forEachName("staggerTo,staggerFrom,staggerFromTo", function (name) {
      Tween[name] = function () {
        var tl = new Timeline(),
            params = _slice.call(arguments, 0);

        params.splice(name === "staggerFromTo" ? 5 : 4, 0, 0);
        return tl[name].apply(tl, params);
      };
    });
    /*
     * --------------------------------------------------------------------------------------
     * PROPTWEEN
     * --------------------------------------------------------------------------------------
     */


    var _setterPlain = function _setterPlain(target, property, value) {
      return target[property] = value;
    },
        _setterFunc = function _setterFunc(target, property, value) {
      return target[property](value);
    },
        _setterFuncWithParam = function _setterFuncWithParam(target, property, value, data) {
      return target[property](data.fp, value);
    },
        _setterAttribute = function _setterAttribute(target, property, value) {
      return target.setAttribute(property, value);
    },
        _getSetter = function _getSetter(target, property) {
      return _isFunction(target[property]) ? _setterFunc : _isUndefined(target[property]) && target.setAttribute ? _setterAttribute : _setterPlain;
    },
        _renderPlain = function _renderPlain(ratio, data) {
      return data.set(data.t, data.p, Math.round((data.s + data.c * ratio) * 1000000) / 1000000, data);
    },
        _renderBoolean = function _renderBoolean(ratio, data) {
      return data.set(data.t, data.p, !!(data.s + data.c * ratio), data);
    },
        _renderComplexString = function _renderComplexString(ratio, data) {
      var pt = data._pt,
          s = "";

      if (!ratio && data.b) {
        //b = beginning string
        s = data.b;
      } else if (ratio === 1 && data.e) {
        //e = ending string
        s = data.e;
      } else {
        while (pt) {
          s = pt.p + (pt.m ? pt.m(pt.s + pt.c * ratio) : Math.round((pt.s + pt.c * ratio) * 10000) / 10000) + s; //we use the "p" property for the text inbetween (like a suffix). And in the context of a complex string, the modifier (m) is typically just Math.round(), like for RGB colors.

          pt = pt._next;
        }

        s += data.c; //we use the "c" of the PropTween to store the final chunk of non-numeric text.
      }

      data.set(data.t, data.p, s, data);
    },
        _renderPropTweens = function _renderPropTweens(ratio, data) {
      var pt = data._pt;

      while (pt) {
        pt.r(ratio, pt.d);
        pt = pt._next;
      }
    },
        _addPluginModifier = function _addPluginModifier(modifier, tween, target, property) {
      var pt = this._pt,
          next;

      while (pt) {
        next = pt._next;
        pt.p === property && pt.modifier(modifier, tween, target);
        pt = next;
      }
    },
        _killPropTweensOf = function _killPropTweensOf(property) {
      var pt = this._pt,
          hasNonDependentRemaining,
          next;

      while (pt) {
        next = pt._next;

        if (pt.p === property && !pt.op || pt.op === property) {
          _removeLinkedListItem(this, pt, "_pt");
        } else if (!pt.dep) {
          hasNonDependentRemaining = 1;
        }

        pt = next;
      }

      return !hasNonDependentRemaining;
    },
        _setterWithModifier = function _setterWithModifier(target, property, value, data) {
      data.mSet(target, property, data.m.call(data.tween, value, data.mt), data);
    },
        _sortPropTweensByPriority = function _sortPropTweensByPriority(parent) {
      var pt = parent._pt,
          next,
          pt2,
          first,
          last; //sorts the PropTween linked list in order of priority because some plugins need to do their work after ALL of the PropTweens were created (like RoundPropsPlugin and ModifiersPlugin)

      while (pt) {
        next = pt._next;
        pt2 = first;

        while (pt2 && pt2.pr > pt.pr) {
          pt2 = pt2._next;
        }

        if (pt._prev = pt2 ? pt2._prev : last) {
          pt._prev._next = pt;
        } else {
          first = pt;
        }

        if (pt._next = pt2) {
          pt2._prev = pt;
        } else {
          last = pt;
        }

        pt = next;
      }

      parent._pt = first;
    }; //PropTween key: t = target, p = prop, r = renderer, d = data, s = start, c = change, op = overwriteProperty (ONLY populated when it's different than p), pr = priority, _next/_prev for the linked list siblings, set = setter, m = modifier, mSet = modifierSetter (the original setter, before a modifier was added)


    var PropTween = /*#__PURE__*/function () {
      function PropTween(next, target, prop, start, change, renderer, data, setter, priority) {
        this.t = target;
        this.s = start;
        this.c = change;
        this.p = prop;
        this.r = renderer || _renderPlain;
        this.d = data || this;
        this.set = setter || _setterPlain;
        this.pr = priority || 0;
        this._next = next;

        if (next) {
          next._prev = this;
        }
      }

      var _proto4 = PropTween.prototype;

      _proto4.modifier = function modifier(func, tween, target) {
        this.mSet = this.mSet || this.set; //in case it was already set (a PropTween can only have one modifier)

        this.set = _setterWithModifier;
        this.m = func;
        this.mt = target; //modifier target

        this.tween = tween;
      };

      return PropTween;
    }(); //Initialization tasks

    _forEachName(_callbackNames + "parent,duration,ease,delay,overwrite,runBackwards,startAt,yoyo,immediateRender,repeat,repeatDelay,data,paused,reversed,lazy,callbackScope,stringFilter,id,yoyoEase,stagger,inherit,repeatRefresh,keyframes,autoRevert,scrollTrigger", function (name) {
      return _reservedProps[name] = 1;
    });

    _globals.TweenMax = _globals.TweenLite = Tween;
    _globals.TimelineLite = _globals.TimelineMax = Timeline;
    _globalTimeline = new Timeline({
      sortChildren: false,
      defaults: _defaults,
      autoRemoveChildren: true,
      id: "root",
      smoothChildTiming: true
    });
    _config.stringFilter = _colorStringFilter;
    /*
     * --------------------------------------------------------------------------------------
     * GSAP
     * --------------------------------------------------------------------------------------
     */

    var _gsap = {
      registerPlugin: function registerPlugin() {
        for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }

        args.forEach(function (config) {
          return _createPlugin(config);
        });
      },
      timeline: function timeline(vars) {
        return new Timeline(vars);
      },
      getTweensOf: function getTweensOf(targets, onlyActive) {
        return _globalTimeline.getTweensOf(targets, onlyActive);
      },
      getProperty: function getProperty(target, property, unit, uncache) {
        _isString(target) && (target = toArray(target)[0]); //in case selector text or an array is passed in

        var getter = _getCache(target || {}).get,
            format = unit ? _passThrough : _numericIfPossible;

        unit === "native" && (unit = "");
        return !target ? target : !property ? function (property, unit, uncache) {
          return format((_plugins[property] && _plugins[property].get || getter)(target, property, unit, uncache));
        } : format((_plugins[property] && _plugins[property].get || getter)(target, property, unit, uncache));
      },
      quickSetter: function quickSetter(target, property, unit) {
        target = toArray(target);

        if (target.length > 1) {
          var setters = target.map(function (t) {
            return gsap.quickSetter(t, property, unit);
          }),
              l = setters.length;
          return function (value) {
            var i = l;

            while (i--) {
              setters[i](value);
            }
          };
        }

        target = target[0] || {};

        var Plugin = _plugins[property],
            cache = _getCache(target),
            p = cache.harness && (cache.harness.aliases || {})[property] || property,
            // in case it's an alias, like "rotate" for "rotation".
        setter = Plugin ? function (value) {
          var p = new Plugin();
          _quickTween._pt = 0;
          p.init(target, unit ? value + unit : value, _quickTween, 0, [target]);
          p.render(1, p);
          _quickTween._pt && _renderPropTweens(1, _quickTween);
        } : cache.set(target, p);

        return Plugin ? setter : function (value) {
          return setter(target, p, unit ? value + unit : value, cache, 1);
        };
      },
      isTweening: function isTweening(targets) {
        return _globalTimeline.getTweensOf(targets, true).length > 0;
      },
      defaults: function defaults(value) {
        value && value.ease && (value.ease = _parseEase(value.ease, _defaults.ease));
        return _mergeDeep(_defaults, value || {});
      },
      config: function config(value) {
        return _mergeDeep(_config, value || {});
      },
      registerEffect: function registerEffect(_ref3) {
        var name = _ref3.name,
            effect = _ref3.effect,
            plugins = _ref3.plugins,
            defaults = _ref3.defaults,
            extendTimeline = _ref3.extendTimeline;
        (plugins || "").split(",").forEach(function (pluginName) {
          return pluginName && !_plugins[pluginName] && !_globals[pluginName] && _warn(name + " effect requires " + pluginName + " plugin.");
        });

        _effects[name] = function (targets, vars, tl) {
          return effect(toArray(targets), _setDefaults(vars || {}, defaults), tl);
        };

        if (extendTimeline) {
          Timeline.prototype[name] = function (targets, vars, position) {
            return this.add(_effects[name](targets, _isObject(vars) ? vars : (position = vars) && {}, this), position);
          };
        }
      },
      registerEase: function registerEase(name, ease) {
        _easeMap[name] = _parseEase(ease);
      },
      parseEase: function parseEase(ease, defaultEase) {
        return arguments.length ? _parseEase(ease, defaultEase) : _easeMap;
      },
      getById: function getById(id) {
        return _globalTimeline.getById(id);
      },
      exportRoot: function exportRoot(vars, includeDelayedCalls) {
        if (vars === void 0) {
          vars = {};
        }

        var tl = new Timeline(vars),
            child,
            next;
        tl.smoothChildTiming = _isNotFalse(vars.smoothChildTiming);

        _globalTimeline.remove(tl);

        tl._dp = 0; //otherwise it'll get re-activated when adding children and be re-introduced into _globalTimeline's linked list (then added to itself).

        tl._time = tl._tTime = _globalTimeline._time;
        child = _globalTimeline._first;

        while (child) {
          next = child._next;

          if (includeDelayedCalls || !(!child._dur && child instanceof Tween && child.vars.onComplete === child._targets[0])) {
            _addToTimeline(tl, child, child._start - child._delay);
          }

          child = next;
        }

        _addToTimeline(_globalTimeline, tl, 0);

        return tl;
      },
      utils: {
        wrap: wrap,
        wrapYoyo: wrapYoyo,
        distribute: distribute,
        random: random,
        snap: snap,
        normalize: normalize,
        getUnit: getUnit,
        clamp: clamp,
        splitColor: splitColor,
        toArray: toArray,
        selector: selector,
        mapRange: mapRange,
        pipe: pipe,
        unitize: unitize,
        interpolate: interpolate,
        shuffle: shuffle
      },
      install: _install,
      effects: _effects,
      ticker: _ticker,
      updateRoot: Timeline.updateRoot,
      plugins: _plugins,
      globalTimeline: _globalTimeline,
      core: {
        PropTween: PropTween,
        globals: _addGlobal,
        Tween: Tween,
        Timeline: Timeline,
        Animation: Animation,
        getCache: _getCache,
        _removeLinkedListItem: _removeLinkedListItem,
        suppressOverwrites: function suppressOverwrites(value) {
          return _suppressOverwrites = value;
        }
      }
    };

    _forEachName("to,from,fromTo,delayedCall,set,killTweensOf", function (name) {
      return _gsap[name] = Tween[name];
    });

    _ticker.add(Timeline.updateRoot);

    _quickTween = _gsap.to({}, {
      duration: 0
    }); // ---- EXTRA PLUGINS --------------------------------------------------------

    var _getPluginPropTween = function _getPluginPropTween(plugin, prop) {
      var pt = plugin._pt;

      while (pt && pt.p !== prop && pt.op !== prop && pt.fp !== prop) {
        pt = pt._next;
      }

      return pt;
    },
        _addModifiers = function _addModifiers(tween, modifiers) {
      var targets = tween._targets,
          p,
          i,
          pt;

      for (p in modifiers) {
        i = targets.length;

        while (i--) {
          pt = tween._ptLookup[i][p];

          if (pt && (pt = pt.d)) {
            if (pt._pt) {
              // is a plugin
              pt = _getPluginPropTween(pt, p);
            }

            pt && pt.modifier && pt.modifier(modifiers[p], tween, targets[i], p);
          }
        }
      }
    },
        _buildModifierPlugin = function _buildModifierPlugin(name, modifier) {
      return {
        name: name,
        rawVars: 1,
        //don't pre-process function-based values or "random()" strings.
        init: function init(target, vars, tween) {
          tween._onInit = function (tween) {
            var temp, p;

            if (_isString(vars)) {
              temp = {};

              _forEachName(vars, function (name) {
                return temp[name] = 1;
              }); //if the user passes in a comma-delimited list of property names to roundProps, like "x,y", we round to whole numbers.


              vars = temp;
            }

            if (modifier) {
              temp = {};

              for (p in vars) {
                temp[p] = modifier(vars[p]);
              }

              vars = temp;
            }

            _addModifiers(tween, vars);
          };
        }
      };
    }; //register core plugins


    var gsap = _gsap.registerPlugin({
      name: "attr",
      init: function init(target, vars, tween, index, targets) {
        var p, pt;

        for (p in vars) {
          pt = this.add(target, "setAttribute", (target.getAttribute(p) || 0) + "", vars[p], index, targets, 0, 0, p);
          pt && (pt.op = p);

          this._props.push(p);
        }
      }
    }, {
      name: "endArray",
      init: function init(target, value) {
        var i = value.length;

        while (i--) {
          this.add(target, i, target[i] || 0, value[i]);
        }
      }
    }, _buildModifierPlugin("roundProps", _roundModifier), _buildModifierPlugin("modifiers"), _buildModifierPlugin("snap", snap)) || _gsap; //to prevent the core plugins from being dropped via aggressive tree shaking, we must include them in the variable declaration in this way.

    Tween.version = Timeline.version = gsap.version = "3.9.1";
    _coreReady = 1;
    _windowExists$1() && _wake();
    _easeMap.Power0;
        _easeMap.Power1;
        _easeMap.Power2;
        _easeMap.Power3;
        _easeMap.Power4;
        _easeMap.Linear;
        _easeMap.Quad;
        _easeMap.Cubic;
        _easeMap.Quart;
        _easeMap.Quint;
        _easeMap.Strong;
        _easeMap.Elastic;
        _easeMap.Back;
        _easeMap.SteppedEase;
        _easeMap.Bounce;
        _easeMap.Sine;
        _easeMap.Expo;
        _easeMap.Circ;

    /*!
     * CSSPlugin 3.9.1
     * https://greensock.com
     *
     * Copyright 2008-2021, GreenSock. All rights reserved.
     * Subject to the terms at https://greensock.com/standard-license or for
     * Club GreenSock members, the agreement issued with that membership.
     * @author: Jack Doyle, jack@greensock.com
    */

    var _win,
        _doc,
        _docElement,
        _pluginInitted,
        _tempDiv,
        _recentSetterPlugin,
        _windowExists = function _windowExists() {
      return typeof window !== "undefined";
    },
        _transformProps = {},
        _RAD2DEG = 180 / Math.PI,
        _DEG2RAD = Math.PI / 180,
        _atan2 = Math.atan2,
        _bigNum = 1e8,
        _capsExp = /([A-Z])/g,
        _horizontalExp = /(?:left|right|width|margin|padding|x)/i,
        _complexExp = /[\s,\(]\S/,
        _propertyAliases = {
      autoAlpha: "opacity,visibility",
      scale: "scaleX,scaleY",
      alpha: "opacity"
    },
        _renderCSSProp = function _renderCSSProp(ratio, data) {
      return data.set(data.t, data.p, Math.round((data.s + data.c * ratio) * 10000) / 10000 + data.u, data);
    },
        _renderPropWithEnd = function _renderPropWithEnd(ratio, data) {
      return data.set(data.t, data.p, ratio === 1 ? data.e : Math.round((data.s + data.c * ratio) * 10000) / 10000 + data.u, data);
    },
        _renderCSSPropWithBeginning = function _renderCSSPropWithBeginning(ratio, data) {
      return data.set(data.t, data.p, ratio ? Math.round((data.s + data.c * ratio) * 10000) / 10000 + data.u : data.b, data);
    },
        //if units change, we need a way to render the original unit/value when the tween goes all the way back to the beginning (ratio:0)
    _renderRoundedCSSProp = function _renderRoundedCSSProp(ratio, data) {
      var value = data.s + data.c * ratio;
      data.set(data.t, data.p, ~~(value + (value < 0 ? -.5 : .5)) + data.u, data);
    },
        _renderNonTweeningValue = function _renderNonTweeningValue(ratio, data) {
      return data.set(data.t, data.p, ratio ? data.e : data.b, data);
    },
        _renderNonTweeningValueOnlyAtEnd = function _renderNonTweeningValueOnlyAtEnd(ratio, data) {
      return data.set(data.t, data.p, ratio !== 1 ? data.b : data.e, data);
    },
        _setterCSSStyle = function _setterCSSStyle(target, property, value) {
      return target.style[property] = value;
    },
        _setterCSSProp = function _setterCSSProp(target, property, value) {
      return target.style.setProperty(property, value);
    },
        _setterTransform = function _setterTransform(target, property, value) {
      return target._gsap[property] = value;
    },
        _setterScale = function _setterScale(target, property, value) {
      return target._gsap.scaleX = target._gsap.scaleY = value;
    },
        _setterScaleWithRender = function _setterScaleWithRender(target, property, value, data, ratio) {
      var cache = target._gsap;
      cache.scaleX = cache.scaleY = value;
      cache.renderTransform(ratio, cache);
    },
        _setterTransformWithRender = function _setterTransformWithRender(target, property, value, data, ratio) {
      var cache = target._gsap;
      cache[property] = value;
      cache.renderTransform(ratio, cache);
    },
        _transformProp = "transform",
        _transformOriginProp = _transformProp + "Origin",
        _supports3D,
        _createElement = function _createElement(type, ns) {
      var e = _doc.createElementNS ? _doc.createElementNS((ns || "http://www.w3.org/1999/xhtml").replace(/^https/, "http"), type) : _doc.createElement(type); //some servers swap in https for http in the namespace which can break things, making "style" inaccessible.

      return e.style ? e : _doc.createElement(type); //some environments won't allow access to the element's style when created with a namespace in which case we default to the standard createElement() to work around the issue. Also note that when GSAP is embedded directly inside an SVG file, createElement() won't allow access to the style object in Firefox (see https://greensock.com/forums/topic/20215-problem-using-tweenmax-in-standalone-self-containing-svg-file-err-cannot-set-property-csstext-of-undefined/).
    },
        _getComputedProperty = function _getComputedProperty(target, property, skipPrefixFallback) {
      var cs = getComputedStyle(target);
      return cs[property] || cs.getPropertyValue(property.replace(_capsExp, "-$1").toLowerCase()) || cs.getPropertyValue(property) || !skipPrefixFallback && _getComputedProperty(target, _checkPropPrefix(property) || property, 1) || ""; //css variables may not need caps swapped out for dashes and lowercase.
    },
        _prefixes = "O,Moz,ms,Ms,Webkit".split(","),
        _checkPropPrefix = function _checkPropPrefix(property, element, preferPrefix) {
      var e = element || _tempDiv,
          s = e.style,
          i = 5;

      if (property in s && !preferPrefix) {
        return property;
      }

      property = property.charAt(0).toUpperCase() + property.substr(1);

      while (i-- && !(_prefixes[i] + property in s)) {}

      return i < 0 ? null : (i === 3 ? "ms" : i >= 0 ? _prefixes[i] : "") + property;
    },
        _initCore = function _initCore() {
      if (_windowExists() && window.document) {
        _win = window;
        _doc = _win.document;
        _docElement = _doc.documentElement;
        _tempDiv = _createElement("div") || {
          style: {}
        };
        _createElement("div");
        _transformProp = _checkPropPrefix(_transformProp);
        _transformOriginProp = _transformProp + "Origin";
        _tempDiv.style.cssText = "border-width:0;line-height:0;position:absolute;padding:0"; //make sure to override certain properties that may contaminate measurements, in case the user has overreaching style sheets.

        _supports3D = !!_checkPropPrefix("perspective");
        _pluginInitted = 1;
      }
    },
        _getBBoxHack = function _getBBoxHack(swapIfPossible) {
      //works around issues in some browsers (like Firefox) that don't correctly report getBBox() on SVG elements inside a <defs> element and/or <mask>. We try creating an SVG, adding it to the documentElement and toss the element in there so that it's definitely part of the rendering tree, then grab the bbox and if it works, we actually swap out the original getBBox() method for our own that does these extra steps whenever getBBox is needed. This helps ensure that performance is optimal (only do all these extra steps when absolutely necessary...most elements don't need it).
      var svg = _createElement("svg", this.ownerSVGElement && this.ownerSVGElement.getAttribute("xmlns") || "http://www.w3.org/2000/svg"),
          oldParent = this.parentNode,
          oldSibling = this.nextSibling,
          oldCSS = this.style.cssText,
          bbox;

      _docElement.appendChild(svg);

      svg.appendChild(this);
      this.style.display = "block";

      if (swapIfPossible) {
        try {
          bbox = this.getBBox();
          this._gsapBBox = this.getBBox; //store the original

          this.getBBox = _getBBoxHack;
        } catch (e) {}
      } else if (this._gsapBBox) {
        bbox = this._gsapBBox();
      }

      if (oldParent) {
        if (oldSibling) {
          oldParent.insertBefore(this, oldSibling);
        } else {
          oldParent.appendChild(this);
        }
      }

      _docElement.removeChild(svg);

      this.style.cssText = oldCSS;
      return bbox;
    },
        _getAttributeFallbacks = function _getAttributeFallbacks(target, attributesArray) {
      var i = attributesArray.length;

      while (i--) {
        if (target.hasAttribute(attributesArray[i])) {
          return target.getAttribute(attributesArray[i]);
        }
      }
    },
        _getBBox = function _getBBox(target) {
      var bounds;

      try {
        bounds = target.getBBox(); //Firefox throws errors if you try calling getBBox() on an SVG element that's not rendered (like in a <symbol> or <defs>). https://bugzilla.mozilla.org/show_bug.cgi?id=612118
      } catch (error) {
        bounds = _getBBoxHack.call(target, true);
      }

      bounds && (bounds.width || bounds.height) || target.getBBox === _getBBoxHack || (bounds = _getBBoxHack.call(target, true)); //some browsers (like Firefox) misreport the bounds if the element has zero width and height (it just assumes it's at x:0, y:0), thus we need to manually grab the position in that case.

      return bounds && !bounds.width && !bounds.x && !bounds.y ? {
        x: +_getAttributeFallbacks(target, ["x", "cx", "x1"]) || 0,
        y: +_getAttributeFallbacks(target, ["y", "cy", "y1"]) || 0,
        width: 0,
        height: 0
      } : bounds;
    },
        _isSVG = function _isSVG(e) {
      return !!(e.getCTM && (!e.parentNode || e.ownerSVGElement) && _getBBox(e));
    },
        //reports if the element is an SVG on which getBBox() actually works
    _removeProperty = function _removeProperty(target, property) {
      if (property) {
        var style = target.style;

        if (property in _transformProps && property !== _transformOriginProp) {
          property = _transformProp;
        }

        if (style.removeProperty) {
          if (property.substr(0, 2) === "ms" || property.substr(0, 6) === "webkit") {
            //Microsoft and some Webkit browsers don't conform to the standard of capitalizing the first prefix character, so we adjust so that when we prefix the caps with a dash, it's correct (otherwise it'd be "ms-transform" instead of "-ms-transform" for IE9, for example)
            property = "-" + property;
          }

          style.removeProperty(property.replace(_capsExp, "-$1").toLowerCase());
        } else {
          //note: old versions of IE use "removeAttribute()" instead of "removeProperty()"
          style.removeAttribute(property);
        }
      }
    },
        _addNonTweeningPT = function _addNonTweeningPT(plugin, target, property, beginning, end, onlySetAtEnd) {
      var pt = new PropTween(plugin._pt, target, property, 0, 1, onlySetAtEnd ? _renderNonTweeningValueOnlyAtEnd : _renderNonTweeningValue);
      plugin._pt = pt;
      pt.b = beginning;
      pt.e = end;

      plugin._props.push(property);

      return pt;
    },
        _nonConvertibleUnits = {
      deg: 1,
      rad: 1,
      turn: 1
    },
        //takes a single value like 20px and converts it to the unit specified, like "%", returning only the numeric amount.
    _convertToUnit = function _convertToUnit(target, property, value, unit) {
      var curValue = parseFloat(value) || 0,
          curUnit = (value + "").trim().substr((curValue + "").length) || "px",
          // some browsers leave extra whitespace at the beginning of CSS variables, hence the need to trim()
      style = _tempDiv.style,
          horizontal = _horizontalExp.test(property),
          isRootSVG = target.tagName.toLowerCase() === "svg",
          measureProperty = (isRootSVG ? "client" : "offset") + (horizontal ? "Width" : "Height"),
          amount = 100,
          toPixels = unit === "px",
          toPercent = unit === "%",
          px,
          parent,
          cache,
          isSVG;

      if (unit === curUnit || !curValue || _nonConvertibleUnits[unit] || _nonConvertibleUnits[curUnit]) {
        return curValue;
      }

      curUnit !== "px" && !toPixels && (curValue = _convertToUnit(target, property, value, "px"));
      isSVG = target.getCTM && _isSVG(target);

      if ((toPercent || curUnit === "%") && (_transformProps[property] || ~property.indexOf("adius"))) {
        px = isSVG ? target.getBBox()[horizontal ? "width" : "height"] : target[measureProperty];
        return _round(toPercent ? curValue / px * amount : curValue / 100 * px);
      }

      style[horizontal ? "width" : "height"] = amount + (toPixels ? curUnit : unit);
      parent = ~property.indexOf("adius") || unit === "em" && target.appendChild && !isRootSVG ? target : target.parentNode;

      if (isSVG) {
        parent = (target.ownerSVGElement || {}).parentNode;
      }

      if (!parent || parent === _doc || !parent.appendChild) {
        parent = _doc.body;
      }

      cache = parent._gsap;

      if (cache && toPercent && cache.width && horizontal && cache.time === _ticker.time) {
        return _round(curValue / cache.width * amount);
      } else {
        (toPercent || curUnit === "%") && (style.position = _getComputedProperty(target, "position"));
        parent === target && (style.position = "static"); // like for borderRadius, if it's a % we must have it relative to the target itself but that may not have position: relative or position: absolute in which case it'd go up the chain until it finds its offsetParent (bad). position: static protects against that.

        parent.appendChild(_tempDiv);
        px = _tempDiv[measureProperty];
        parent.removeChild(_tempDiv);
        style.position = "absolute";

        if (horizontal && toPercent) {
          cache = _getCache(parent);
          cache.time = _ticker.time;
          cache.width = parent[measureProperty];
        }
      }

      return _round(toPixels ? px * curValue / amount : px && curValue ? amount / px * curValue : 0);
    },
        _get = function _get(target, property, unit, uncache) {
      var value;
      _pluginInitted || _initCore();

      if (property in _propertyAliases && property !== "transform") {
        property = _propertyAliases[property];

        if (~property.indexOf(",")) {
          property = property.split(",")[0];
        }
      }

      if (_transformProps[property] && property !== "transform") {
        value = _parseTransform(target, uncache);
        value = property !== "transformOrigin" ? value[property] : value.svg ? value.origin : _firstTwoOnly(_getComputedProperty(target, _transformOriginProp)) + " " + value.zOrigin + "px";
      } else {
        value = target.style[property];

        if (!value || value === "auto" || uncache || ~(value + "").indexOf("calc(")) {
          value = _specialProps[property] && _specialProps[property](target, property, unit) || _getComputedProperty(target, property) || _getProperty(target, property) || (property === "opacity" ? 1 : 0); // note: some browsers, like Firefox, don't report borderRadius correctly! Instead, it only reports every corner like  borderTopLeftRadius
        }
      }

      return unit && !~(value + "").trim().indexOf(" ") ? _convertToUnit(target, property, value, unit) + unit : value;
    },
        _tweenComplexCSSString = function _tweenComplexCSSString(target, prop, start, end) {
      //note: we call _tweenComplexCSSString.call(pluginInstance...) to ensure that it's scoped properly. We may call it from within a plugin too, thus "this" would refer to the plugin.
      if (!start || start === "none") {
        // some browsers like Safari actually PREFER the prefixed property and mis-report the unprefixed value like clipPath (BUG). In other words, even though clipPath exists in the style ("clipPath" in target.style) and it's set in the CSS properly (along with -webkit-clip-path), Safari reports clipPath as "none" whereas WebkitClipPath reports accurately like "ellipse(100% 0% at 50% 0%)", so in this case we must SWITCH to using the prefixed property instead. See https://greensock.com/forums/topic/18310-clippath-doesnt-work-on-ios/
        var p = _checkPropPrefix(prop, target, 1),
            s = p && _getComputedProperty(target, p, 1);

        if (s && s !== start) {
          prop = p;
          start = s;
        } else if (prop === "borderColor") {
          start = _getComputedProperty(target, "borderTopColor"); // Firefox bug: always reports "borderColor" as "", so we must fall back to borderTopColor. See https://greensock.com/forums/topic/24583-how-to-return-colors-that-i-had-after-reverse/
        }
      }

      var pt = new PropTween(this._pt, target.style, prop, 0, 1, _renderComplexString),
          index = 0,
          matchIndex = 0,
          a,
          result,
          startValues,
          startNum,
          color,
          startValue,
          endValue,
          endNum,
          chunk,
          endUnit,
          startUnit,
          relative,
          endValues;
      pt.b = start;
      pt.e = end;
      start += ""; //ensure values are strings

      end += "";

      if (end === "auto") {
        target.style[prop] = end;
        end = _getComputedProperty(target, prop) || end;
        target.style[prop] = start;
      }

      a = [start, end];

      _colorStringFilter(a); //pass an array with the starting and ending values and let the filter do whatever it needs to the values. If colors are found, it returns true and then we must match where the color shows up order-wise because for things like boxShadow, sometimes the browser provides the computed values with the color FIRST, but the user provides it with the color LAST, so flip them if necessary. Same for drop-shadow().


      start = a[0];
      end = a[1];
      startValues = start.match(_numWithUnitExp) || [];
      endValues = end.match(_numWithUnitExp) || [];

      if (endValues.length) {
        while (result = _numWithUnitExp.exec(end)) {
          endValue = result[0];
          chunk = end.substring(index, result.index);

          if (color) {
            color = (color + 1) % 5;
          } else if (chunk.substr(-5) === "rgba(" || chunk.substr(-5) === "hsla(") {
            color = 1;
          }

          if (endValue !== (startValue = startValues[matchIndex++] || "")) {
            startNum = parseFloat(startValue) || 0;
            startUnit = startValue.substr((startNum + "").length);
            relative = endValue.charAt(1) === "=" ? +(endValue.charAt(0) + "1") : 0;

            if (relative) {
              endValue = endValue.substr(2);
            }

            endNum = parseFloat(endValue);
            endUnit = endValue.substr((endNum + "").length);
            index = _numWithUnitExp.lastIndex - endUnit.length;

            if (!endUnit) {
              //if something like "perspective:300" is passed in and we must add a unit to the end
              endUnit = endUnit || _config.units[prop] || startUnit;

              if (index === end.length) {
                end += endUnit;
                pt.e += endUnit;
              }
            }

            if (startUnit !== endUnit) {
              startNum = _convertToUnit(target, prop, startValue, endUnit) || 0;
            } //these nested PropTweens are handled in a special way - we'll never actually call a render or setter method on them. We'll just loop through them in the parent complex string PropTween's render method.


            pt._pt = {
              _next: pt._pt,
              p: chunk || matchIndex === 1 ? chunk : ",",
              //note: SVG spec allows omission of comma/space when a negative sign is wedged between two numbers, like 2.5-5.3 instead of 2.5,-5.3 but when tweening, the negative value may switch to positive, so we insert the comma just in case.
              s: startNum,
              c: relative ? relative * endNum : endNum - startNum,
              m: color && color < 4 || prop === "zIndex" ? Math.round : 0
            };
          }
        }

        pt.c = index < end.length ? end.substring(index, end.length) : ""; //we use the "c" of the PropTween to store the final part of the string (after the last number)
      } else {
        pt.r = prop === "display" && end === "none" ? _renderNonTweeningValueOnlyAtEnd : _renderNonTweeningValue;
      }

      _relExp.test(end) && (pt.e = 0); //if the end string contains relative values or dynamic random(...) values, delete the end it so that on the final render we don't actually set it to the string with += or -= characters (forces it to use the calculated value).

      this._pt = pt; //start the linked list with this new PropTween. Remember, we call _tweenComplexCSSString.call(pluginInstance...) to ensure that it's scoped properly. We may call it from within another plugin too, thus "this" would refer to the plugin.

      return pt;
    },
        _keywordToPercent = {
      top: "0%",
      bottom: "100%",
      left: "0%",
      right: "100%",
      center: "50%"
    },
        _convertKeywordsToPercentages = function _convertKeywordsToPercentages(value) {
      var split = value.split(" "),
          x = split[0],
          y = split[1] || "50%";

      if (x === "top" || x === "bottom" || y === "left" || y === "right") {
        //the user provided them in the wrong order, so flip them
        value = x;
        x = y;
        y = value;
      }

      split[0] = _keywordToPercent[x] || x;
      split[1] = _keywordToPercent[y] || y;
      return split.join(" ");
    },
        _renderClearProps = function _renderClearProps(ratio, data) {
      if (data.tween && data.tween._time === data.tween._dur) {
        var target = data.t,
            style = target.style,
            props = data.u,
            cache = target._gsap,
            prop,
            clearTransforms,
            i;

        if (props === "all" || props === true) {
          style.cssText = "";
          clearTransforms = 1;
        } else {
          props = props.split(",");
          i = props.length;

          while (--i > -1) {
            prop = props[i];

            if (_transformProps[prop]) {
              clearTransforms = 1;
              prop = prop === "transformOrigin" ? _transformOriginProp : _transformProp;
            }

            _removeProperty(target, prop);
          }
        }

        if (clearTransforms) {
          _removeProperty(target, _transformProp);

          if (cache) {
            cache.svg && target.removeAttribute("transform");

            _parseTransform(target, 1); // force all the cached values back to "normal"/identity, otherwise if there's another tween that's already set to render transforms on this element, it could display the wrong values.


            cache.uncache = 1;
          }
        }
      }
    },
        // note: specialProps should return 1 if (and only if) they have a non-zero priority. It indicates we need to sort the linked list.
    _specialProps = {
      clearProps: function clearProps(plugin, target, property, endValue, tween) {
        if (tween.data !== "isFromStart") {
          var pt = plugin._pt = new PropTween(plugin._pt, target, property, 0, 0, _renderClearProps);
          pt.u = endValue;
          pt.pr = -10;
          pt.tween = tween;

          plugin._props.push(property);

          return 1;
        }
      }
      /* className feature (about 0.4kb gzipped).
      , className(plugin, target, property, endValue, tween) {
      	let _renderClassName = (ratio, data) => {
      			data.css.render(ratio, data.css);
      			if (!ratio || ratio === 1) {
      				let inline = data.rmv,
      					target = data.t,
      					p;
      				target.setAttribute("class", ratio ? data.e : data.b);
      				for (p in inline) {
      					_removeProperty(target, p);
      				}
      			}
      		},
      		_getAllStyles = (target) => {
      			let styles = {},
      				computed = getComputedStyle(target),
      				p;
      			for (p in computed) {
      				if (isNaN(p) && p !== "cssText" && p !== "length") {
      					styles[p] = computed[p];
      				}
      			}
      			_setDefaults(styles, _parseTransform(target, 1));
      			return styles;
      		},
      		startClassList = target.getAttribute("class"),
      		style = target.style,
      		cssText = style.cssText,
      		cache = target._gsap,
      		classPT = cache.classPT,
      		inlineToRemoveAtEnd = {},
      		data = {t:target, plugin:plugin, rmv:inlineToRemoveAtEnd, b:startClassList, e:(endValue.charAt(1) !== "=") ? endValue : startClassList.replace(new RegExp("(?:\\s|^)" + endValue.substr(2) + "(?![\\w-])"), "") + ((endValue.charAt(0) === "+") ? " " + endValue.substr(2) : "")},
      		changingVars = {},
      		startVars = _getAllStyles(target),
      		transformRelated = /(transform|perspective)/i,
      		endVars, p;
      	if (classPT) {
      		classPT.r(1, classPT.d);
      		_removeLinkedListItem(classPT.d.plugin, classPT, "_pt");
      	}
      	target.setAttribute("class", data.e);
      	endVars = _getAllStyles(target, true);
      	target.setAttribute("class", startClassList);
      	for (p in endVars) {
      		if (endVars[p] !== startVars[p] && !transformRelated.test(p)) {
      			changingVars[p] = endVars[p];
      			if (!style[p] && style[p] !== "0") {
      				inlineToRemoveAtEnd[p] = 1;
      			}
      		}
      	}
      	cache.classPT = plugin._pt = new PropTween(plugin._pt, target, "className", 0, 0, _renderClassName, data, 0, -11);
      	if (style.cssText !== cssText) { //only apply if things change. Otherwise, in cases like a background-image that's pulled dynamically, it could cause a refresh. See https://greensock.com/forums/topic/20368-possible-gsap-bug-switching-classnames-in-chrome/.
      		style.cssText = cssText; //we recorded cssText before we swapped classes and ran _getAllStyles() because in cases when a className tween is overwritten, we remove all the related tweening properties from that class change (otherwise class-specific stuff can't override properties we've directly set on the target's style object due to specificity).
      	}
      	_parseTransform(target, true); //to clear the caching of transforms
      	data.css = new gsap.plugins.css();
      	data.css.init(target, changingVars, tween);
      	plugin._props.push(...data.css._props);
      	return 1;
      }
      */

    },

    /*
     * --------------------------------------------------------------------------------------
     * TRANSFORMS
     * --------------------------------------------------------------------------------------
     */
    _identity2DMatrix = [1, 0, 0, 1, 0, 0],
        _rotationalProperties = {},
        _isNullTransform = function _isNullTransform(value) {
      return value === "matrix(1, 0, 0, 1, 0, 0)" || value === "none" || !value;
    },
        _getComputedTransformMatrixAsArray = function _getComputedTransformMatrixAsArray(target) {
      var matrixString = _getComputedProperty(target, _transformProp);

      return _isNullTransform(matrixString) ? _identity2DMatrix : matrixString.substr(7).match(_numExp).map(_round);
    },
        _getMatrix = function _getMatrix(target, force2D) {
      var cache = target._gsap || _getCache(target),
          style = target.style,
          matrix = _getComputedTransformMatrixAsArray(target),
          parent,
          nextSibling,
          temp,
          addedToDOM;

      if (cache.svg && target.getAttribute("transform")) {
        temp = target.transform.baseVal.consolidate().matrix; //ensures that even complex values like "translate(50,60) rotate(135,0,0)" are parsed because it mashes it into a matrix.

        matrix = [temp.a, temp.b, temp.c, temp.d, temp.e, temp.f];
        return matrix.join(",") === "1,0,0,1,0,0" ? _identity2DMatrix : matrix;
      } else if (matrix === _identity2DMatrix && !target.offsetParent && target !== _docElement && !cache.svg) {
        //note: if offsetParent is null, that means the element isn't in the normal document flow, like if it has display:none or one of its ancestors has display:none). Firefox returns null for getComputedStyle() if the element is in an iframe that has display:none. https://bugzilla.mozilla.org/show_bug.cgi?id=548397
        //browsers don't report transforms accurately unless the element is in the DOM and has a display value that's not "none". Firefox and Microsoft browsers have a partial bug where they'll report transforms even if display:none BUT not any percentage-based values like translate(-50%, 8px) will be reported as if it's translate(0, 8px).
        temp = style.display;
        style.display = "block";
        parent = target.parentNode;

        if (!parent || !target.offsetParent) {
          // note: in 3.3.0 we switched target.offsetParent to _doc.body.contains(target) to avoid [sometimes unnecessary] MutationObserver calls but that wasn't adequate because there are edge cases where nested position: fixed elements need to get reparented to accurately sense transforms. See https://github.com/greensock/GSAP/issues/388 and https://github.com/greensock/GSAP/issues/375
          addedToDOM = 1; //flag

          nextSibling = target.nextSibling;

          _docElement.appendChild(target); //we must add it to the DOM in order to get values properly

        }

        matrix = _getComputedTransformMatrixAsArray(target);
        temp ? style.display = temp : _removeProperty(target, "display");

        if (addedToDOM) {
          nextSibling ? parent.insertBefore(target, nextSibling) : parent ? parent.appendChild(target) : _docElement.removeChild(target);
        }
      }

      return force2D && matrix.length > 6 ? [matrix[0], matrix[1], matrix[4], matrix[5], matrix[12], matrix[13]] : matrix;
    },
        _applySVGOrigin = function _applySVGOrigin(target, origin, originIsAbsolute, smooth, matrixArray, pluginToAddPropTweensTo) {
      var cache = target._gsap,
          matrix = matrixArray || _getMatrix(target, true),
          xOriginOld = cache.xOrigin || 0,
          yOriginOld = cache.yOrigin || 0,
          xOffsetOld = cache.xOffset || 0,
          yOffsetOld = cache.yOffset || 0,
          a = matrix[0],
          b = matrix[1],
          c = matrix[2],
          d = matrix[3],
          tx = matrix[4],
          ty = matrix[5],
          originSplit = origin.split(" "),
          xOrigin = parseFloat(originSplit[0]) || 0,
          yOrigin = parseFloat(originSplit[1]) || 0,
          bounds,
          determinant,
          x,
          y;

      if (!originIsAbsolute) {
        bounds = _getBBox(target);
        xOrigin = bounds.x + (~originSplit[0].indexOf("%") ? xOrigin / 100 * bounds.width : xOrigin);
        yOrigin = bounds.y + (~(originSplit[1] || originSplit[0]).indexOf("%") ? yOrigin / 100 * bounds.height : yOrigin);
      } else if (matrix !== _identity2DMatrix && (determinant = a * d - b * c)) {
        //if it's zero (like if scaleX and scaleY are zero), skip it to avoid errors with dividing by zero.
        x = xOrigin * (d / determinant) + yOrigin * (-c / determinant) + (c * ty - d * tx) / determinant;
        y = xOrigin * (-b / determinant) + yOrigin * (a / determinant) - (a * ty - b * tx) / determinant;
        xOrigin = x;
        yOrigin = y;
      }

      if (smooth || smooth !== false && cache.smooth) {
        tx = xOrigin - xOriginOld;
        ty = yOrigin - yOriginOld;
        cache.xOffset = xOffsetOld + (tx * a + ty * c) - tx;
        cache.yOffset = yOffsetOld + (tx * b + ty * d) - ty;
      } else {
        cache.xOffset = cache.yOffset = 0;
      }

      cache.xOrigin = xOrigin;
      cache.yOrigin = yOrigin;
      cache.smooth = !!smooth;
      cache.origin = origin;
      cache.originIsAbsolute = !!originIsAbsolute;
      target.style[_transformOriginProp] = "0px 0px"; //otherwise, if someone sets  an origin via CSS, it will likely interfere with the SVG transform attribute ones (because remember, we're baking the origin into the matrix() value).

      if (pluginToAddPropTweensTo) {
        _addNonTweeningPT(pluginToAddPropTweensTo, cache, "xOrigin", xOriginOld, xOrigin);

        _addNonTweeningPT(pluginToAddPropTweensTo, cache, "yOrigin", yOriginOld, yOrigin);

        _addNonTweeningPT(pluginToAddPropTweensTo, cache, "xOffset", xOffsetOld, cache.xOffset);

        _addNonTweeningPT(pluginToAddPropTweensTo, cache, "yOffset", yOffsetOld, cache.yOffset);
      }

      target.setAttribute("data-svg-origin", xOrigin + " " + yOrigin);
    },
        _parseTransform = function _parseTransform(target, uncache) {
      var cache = target._gsap || new GSCache(target);

      if ("x" in cache && !uncache && !cache.uncache) {
        return cache;
      }

      var style = target.style,
          invertedScaleX = cache.scaleX < 0,
          px = "px",
          deg = "deg",
          origin = _getComputedProperty(target, _transformOriginProp) || "0",
          x,
          y,
          z,
          scaleX,
          scaleY,
          rotation,
          rotationX,
          rotationY,
          skewX,
          skewY,
          perspective,
          xOrigin,
          yOrigin,
          matrix,
          angle,
          cos,
          sin,
          a,
          b,
          c,
          d,
          a12,
          a22,
          t1,
          t2,
          t3,
          a13,
          a23,
          a33,
          a42,
          a43,
          a32;
      x = y = z = rotation = rotationX = rotationY = skewX = skewY = perspective = 0;
      scaleX = scaleY = 1;
      cache.svg = !!(target.getCTM && _isSVG(target));
      matrix = _getMatrix(target, cache.svg);

      if (cache.svg) {
        t1 = (!cache.uncache || origin === "0px 0px") && !uncache && target.getAttribute("data-svg-origin"); // if origin is 0,0 and cache.uncache is true, let the recorded data-svg-origin stay. Otherwise, whenever we set cache.uncache to true, we'd need to set element.style.transformOrigin = (cache.xOrigin - bbox.x) + "px " + (cache.yOrigin - bbox.y) + "px". Remember, to work around browser inconsistencies we always force SVG elements' transformOrigin to 0,0 and offset the translation accordingly.

        _applySVGOrigin(target, t1 || origin, !!t1 || cache.originIsAbsolute, cache.smooth !== false, matrix);
      }

      xOrigin = cache.xOrigin || 0;
      yOrigin = cache.yOrigin || 0;

      if (matrix !== _identity2DMatrix) {
        a = matrix[0]; //a11

        b = matrix[1]; //a21

        c = matrix[2]; //a31

        d = matrix[3]; //a41

        x = a12 = matrix[4];
        y = a22 = matrix[5]; //2D matrix

        if (matrix.length === 6) {
          scaleX = Math.sqrt(a * a + b * b);
          scaleY = Math.sqrt(d * d + c * c);
          rotation = a || b ? _atan2(b, a) * _RAD2DEG : 0; //note: if scaleX is 0, we cannot accurately measure rotation. Same for skewX with a scaleY of 0. Therefore, we default to the previously recorded value (or zero if that doesn't exist).

          skewX = c || d ? _atan2(c, d) * _RAD2DEG + rotation : 0;
          skewX && (scaleY *= Math.abs(Math.cos(skewX * _DEG2RAD)));

          if (cache.svg) {
            x -= xOrigin - (xOrigin * a + yOrigin * c);
            y -= yOrigin - (xOrigin * b + yOrigin * d);
          } //3D matrix

        } else {
          a32 = matrix[6];
          a42 = matrix[7];
          a13 = matrix[8];
          a23 = matrix[9];
          a33 = matrix[10];
          a43 = matrix[11];
          x = matrix[12];
          y = matrix[13];
          z = matrix[14];
          angle = _atan2(a32, a33);
          rotationX = angle * _RAD2DEG; //rotationX

          if (angle) {
            cos = Math.cos(-angle);
            sin = Math.sin(-angle);
            t1 = a12 * cos + a13 * sin;
            t2 = a22 * cos + a23 * sin;
            t3 = a32 * cos + a33 * sin;
            a13 = a12 * -sin + a13 * cos;
            a23 = a22 * -sin + a23 * cos;
            a33 = a32 * -sin + a33 * cos;
            a43 = a42 * -sin + a43 * cos;
            a12 = t1;
            a22 = t2;
            a32 = t3;
          } //rotationY


          angle = _atan2(-c, a33);
          rotationY = angle * _RAD2DEG;

          if (angle) {
            cos = Math.cos(-angle);
            sin = Math.sin(-angle);
            t1 = a * cos - a13 * sin;
            t2 = b * cos - a23 * sin;
            t3 = c * cos - a33 * sin;
            a43 = d * sin + a43 * cos;
            a = t1;
            b = t2;
            c = t3;
          } //rotationZ


          angle = _atan2(b, a);
          rotation = angle * _RAD2DEG;

          if (angle) {
            cos = Math.cos(angle);
            sin = Math.sin(angle);
            t1 = a * cos + b * sin;
            t2 = a12 * cos + a22 * sin;
            b = b * cos - a * sin;
            a22 = a22 * cos - a12 * sin;
            a = t1;
            a12 = t2;
          }

          if (rotationX && Math.abs(rotationX) + Math.abs(rotation) > 359.9) {
            //when rotationY is set, it will often be parsed as 180 degrees different than it should be, and rotationX and rotation both being 180 (it looks the same), so we adjust for that here.
            rotationX = rotation = 0;
            rotationY = 180 - rotationY;
          }

          scaleX = _round(Math.sqrt(a * a + b * b + c * c));
          scaleY = _round(Math.sqrt(a22 * a22 + a32 * a32));
          angle = _atan2(a12, a22);
          skewX = Math.abs(angle) > 0.0002 ? angle * _RAD2DEG : 0;
          perspective = a43 ? 1 / (a43 < 0 ? -a43 : a43) : 0;
        }

        if (cache.svg) {
          //sense if there are CSS transforms applied on an SVG element in which case we must overwrite them when rendering. The transform attribute is more reliable cross-browser, but we can't just remove the CSS ones because they may be applied in a CSS rule somewhere (not just inline).
          t1 = target.getAttribute("transform");
          cache.forceCSS = target.setAttribute("transform", "") || !_isNullTransform(_getComputedProperty(target, _transformProp));
          t1 && target.setAttribute("transform", t1);
        }
      }

      if (Math.abs(skewX) > 90 && Math.abs(skewX) < 270) {
        if (invertedScaleX) {
          scaleX *= -1;
          skewX += rotation <= 0 ? 180 : -180;
          rotation += rotation <= 0 ? 180 : -180;
        } else {
          scaleY *= -1;
          skewX += skewX <= 0 ? 180 : -180;
        }
      }

      cache.x = x - ((cache.xPercent = x && (cache.xPercent || (Math.round(target.offsetWidth / 2) === Math.round(-x) ? -50 : 0))) ? target.offsetWidth * cache.xPercent / 100 : 0) + px;
      cache.y = y - ((cache.yPercent = y && (cache.yPercent || (Math.round(target.offsetHeight / 2) === Math.round(-y) ? -50 : 0))) ? target.offsetHeight * cache.yPercent / 100 : 0) + px;
      cache.z = z + px;
      cache.scaleX = _round(scaleX);
      cache.scaleY = _round(scaleY);
      cache.rotation = _round(rotation) + deg;
      cache.rotationX = _round(rotationX) + deg;
      cache.rotationY = _round(rotationY) + deg;
      cache.skewX = skewX + deg;
      cache.skewY = skewY + deg;
      cache.transformPerspective = perspective + px;

      if (cache.zOrigin = parseFloat(origin.split(" ")[2]) || 0) {
        style[_transformOriginProp] = _firstTwoOnly(origin);
      }

      cache.xOffset = cache.yOffset = 0;
      cache.force3D = _config.force3D;
      cache.renderTransform = cache.svg ? _renderSVGTransforms : _supports3D ? _renderCSSTransforms : _renderNon3DTransforms;
      cache.uncache = 0;
      return cache;
    },
        _firstTwoOnly = function _firstTwoOnly(value) {
      return (value = value.split(" "))[0] + " " + value[1];
    },
        //for handling transformOrigin values, stripping out the 3rd dimension
    _addPxTranslate = function _addPxTranslate(target, start, value) {
      var unit = getUnit(start);
      return _round(parseFloat(start) + parseFloat(_convertToUnit(target, "x", value + "px", unit))) + unit;
    },
        _renderNon3DTransforms = function _renderNon3DTransforms(ratio, cache) {
      cache.z = "0px";
      cache.rotationY = cache.rotationX = "0deg";
      cache.force3D = 0;

      _renderCSSTransforms(ratio, cache);
    },
        _zeroDeg = "0deg",
        _zeroPx = "0px",
        _endParenthesis = ") ",
        _renderCSSTransforms = function _renderCSSTransforms(ratio, cache) {
      var _ref = cache || this,
          xPercent = _ref.xPercent,
          yPercent = _ref.yPercent,
          x = _ref.x,
          y = _ref.y,
          z = _ref.z,
          rotation = _ref.rotation,
          rotationY = _ref.rotationY,
          rotationX = _ref.rotationX,
          skewX = _ref.skewX,
          skewY = _ref.skewY,
          scaleX = _ref.scaleX,
          scaleY = _ref.scaleY,
          transformPerspective = _ref.transformPerspective,
          force3D = _ref.force3D,
          target = _ref.target,
          zOrigin = _ref.zOrigin,
          transforms = "",
          use3D = force3D === "auto" && ratio && ratio !== 1 || force3D === true; // Safari has a bug that causes it not to render 3D transform-origin values properly, so we force the z origin to 0, record it in the cache, and then do the math here to offset the translate values accordingly (basically do the 3D transform-origin part manually)


      if (zOrigin && (rotationX !== _zeroDeg || rotationY !== _zeroDeg)) {
        var angle = parseFloat(rotationY) * _DEG2RAD,
            a13 = Math.sin(angle),
            a33 = Math.cos(angle),
            cos;

        angle = parseFloat(rotationX) * _DEG2RAD;
        cos = Math.cos(angle);
        x = _addPxTranslate(target, x, a13 * cos * -zOrigin);
        y = _addPxTranslate(target, y, -Math.sin(angle) * -zOrigin);
        z = _addPxTranslate(target, z, a33 * cos * -zOrigin + zOrigin);
      }

      if (transformPerspective !== _zeroPx) {
        transforms += "perspective(" + transformPerspective + _endParenthesis;
      }

      if (xPercent || yPercent) {
        transforms += "translate(" + xPercent + "%, " + yPercent + "%) ";
      }

      if (use3D || x !== _zeroPx || y !== _zeroPx || z !== _zeroPx) {
        transforms += z !== _zeroPx || use3D ? "translate3d(" + x + ", " + y + ", " + z + ") " : "translate(" + x + ", " + y + _endParenthesis;
      }

      if (rotation !== _zeroDeg) {
        transforms += "rotate(" + rotation + _endParenthesis;
      }

      if (rotationY !== _zeroDeg) {
        transforms += "rotateY(" + rotationY + _endParenthesis;
      }

      if (rotationX !== _zeroDeg) {
        transforms += "rotateX(" + rotationX + _endParenthesis;
      }

      if (skewX !== _zeroDeg || skewY !== _zeroDeg) {
        transforms += "skew(" + skewX + ", " + skewY + _endParenthesis;
      }

      if (scaleX !== 1 || scaleY !== 1) {
        transforms += "scale(" + scaleX + ", " + scaleY + _endParenthesis;
      }

      target.style[_transformProp] = transforms || "translate(0, 0)";
    },
        _renderSVGTransforms = function _renderSVGTransforms(ratio, cache) {
      var _ref2 = cache || this,
          xPercent = _ref2.xPercent,
          yPercent = _ref2.yPercent,
          x = _ref2.x,
          y = _ref2.y,
          rotation = _ref2.rotation,
          skewX = _ref2.skewX,
          skewY = _ref2.skewY,
          scaleX = _ref2.scaleX,
          scaleY = _ref2.scaleY,
          target = _ref2.target,
          xOrigin = _ref2.xOrigin,
          yOrigin = _ref2.yOrigin,
          xOffset = _ref2.xOffset,
          yOffset = _ref2.yOffset,
          forceCSS = _ref2.forceCSS,
          tx = parseFloat(x),
          ty = parseFloat(y),
          a11,
          a21,
          a12,
          a22,
          temp;

      rotation = parseFloat(rotation);
      skewX = parseFloat(skewX);
      skewY = parseFloat(skewY);

      if (skewY) {
        //for performance reasons, we combine all skewing into the skewX and rotation values. Remember, a skewY of 10 degrees looks the same as a rotation of 10 degrees plus a skewX of 10 degrees.
        skewY = parseFloat(skewY);
        skewX += skewY;
        rotation += skewY;
      }

      if (rotation || skewX) {
        rotation *= _DEG2RAD;
        skewX *= _DEG2RAD;
        a11 = Math.cos(rotation) * scaleX;
        a21 = Math.sin(rotation) * scaleX;
        a12 = Math.sin(rotation - skewX) * -scaleY;
        a22 = Math.cos(rotation - skewX) * scaleY;

        if (skewX) {
          skewY *= _DEG2RAD;
          temp = Math.tan(skewX - skewY);
          temp = Math.sqrt(1 + temp * temp);
          a12 *= temp;
          a22 *= temp;

          if (skewY) {
            temp = Math.tan(skewY);
            temp = Math.sqrt(1 + temp * temp);
            a11 *= temp;
            a21 *= temp;
          }
        }

        a11 = _round(a11);
        a21 = _round(a21);
        a12 = _round(a12);
        a22 = _round(a22);
      } else {
        a11 = scaleX;
        a22 = scaleY;
        a21 = a12 = 0;
      }

      if (tx && !~(x + "").indexOf("px") || ty && !~(y + "").indexOf("px")) {
        tx = _convertToUnit(target, "x", x, "px");
        ty = _convertToUnit(target, "y", y, "px");
      }

      if (xOrigin || yOrigin || xOffset || yOffset) {
        tx = _round(tx + xOrigin - (xOrigin * a11 + yOrigin * a12) + xOffset);
        ty = _round(ty + yOrigin - (xOrigin * a21 + yOrigin * a22) + yOffset);
      }

      if (xPercent || yPercent) {
        //The SVG spec doesn't support percentage-based translation in the "transform" attribute, so we merge it into the translation to simulate it.
        temp = target.getBBox();
        tx = _round(tx + xPercent / 100 * temp.width);
        ty = _round(ty + yPercent / 100 * temp.height);
      }

      temp = "matrix(" + a11 + "," + a21 + "," + a12 + "," + a22 + "," + tx + "," + ty + ")";
      target.setAttribute("transform", temp);
      forceCSS && (target.style[_transformProp] = temp); //some browsers prioritize CSS transforms over the transform attribute. When we sense that the user has CSS transforms applied, we must overwrite them this way (otherwise some browser simply won't render the  transform attribute changes!)
    },
        _addRotationalPropTween = function _addRotationalPropTween(plugin, target, property, startNum, endValue, relative) {
      var cap = 360,
          isString = _isString(endValue),
          endNum = parseFloat(endValue) * (isString && ~endValue.indexOf("rad") ? _RAD2DEG : 1),
          change = relative ? endNum * relative : endNum - startNum,
          finalValue = startNum + change + "deg",
          direction,
          pt;

      if (isString) {
        direction = endValue.split("_")[1];

        if (direction === "short") {
          change %= cap;

          if (change !== change % (cap / 2)) {
            change += change < 0 ? cap : -cap;
          }
        }

        if (direction === "cw" && change < 0) {
          change = (change + cap * _bigNum) % cap - ~~(change / cap) * cap;
        } else if (direction === "ccw" && change > 0) {
          change = (change - cap * _bigNum) % cap - ~~(change / cap) * cap;
        }
      }

      plugin._pt = pt = new PropTween(plugin._pt, target, property, startNum, change, _renderPropWithEnd);
      pt.e = finalValue;
      pt.u = "deg";

      plugin._props.push(property);

      return pt;
    },
        _assign = function _assign(target, source) {
      // Internet Explorer doesn't have Object.assign(), so we recreate it here.
      for (var p in source) {
        target[p] = source[p];
      }

      return target;
    },
        _addRawTransformPTs = function _addRawTransformPTs(plugin, transforms, target) {
      //for handling cases where someone passes in a whole transform string, like transform: "scale(2, 3) rotate(20deg) translateY(30em)"
      var startCache = _assign({}, target._gsap),
          exclude = "perspective,force3D,transformOrigin,svgOrigin",
          style = target.style,
          endCache,
          p,
          startValue,
          endValue,
          startNum,
          endNum,
          startUnit,
          endUnit;

      if (startCache.svg) {
        startValue = target.getAttribute("transform");
        target.setAttribute("transform", "");
        style[_transformProp] = transforms;
        endCache = _parseTransform(target, 1);

        _removeProperty(target, _transformProp);

        target.setAttribute("transform", startValue);
      } else {
        startValue = getComputedStyle(target)[_transformProp];
        style[_transformProp] = transforms;
        endCache = _parseTransform(target, 1);
        style[_transformProp] = startValue;
      }

      for (p in _transformProps) {
        startValue = startCache[p];
        endValue = endCache[p];

        if (startValue !== endValue && exclude.indexOf(p) < 0) {
          //tweening to no perspective gives very unintuitive results - just keep the same perspective in that case.
          startUnit = getUnit(startValue);
          endUnit = getUnit(endValue);
          startNum = startUnit !== endUnit ? _convertToUnit(target, p, startValue, endUnit) : parseFloat(startValue);
          endNum = parseFloat(endValue);
          plugin._pt = new PropTween(plugin._pt, endCache, p, startNum, endNum - startNum, _renderCSSProp);
          plugin._pt.u = endUnit || 0;

          plugin._props.push(p);
        }
      }

      _assign(endCache, startCache);
    }; // handle splitting apart padding, margin, borderWidth, and borderRadius into their 4 components. Firefox, for example, won't report borderRadius correctly - it will only do borderTopLeftRadius and the other corners. We also want to handle paddingTop, marginLeft, borderRightWidth, etc.


    _forEachName("padding,margin,Width,Radius", function (name, index) {
      var t = "Top",
          r = "Right",
          b = "Bottom",
          l = "Left",
          props = (index < 3 ? [t, r, b, l] : [t + l, t + r, b + r, b + l]).map(function (side) {
        return index < 2 ? name + side : "border" + side + name;
      });

      _specialProps[index > 1 ? "border" + name : name] = function (plugin, target, property, endValue, tween) {
        var a, vars;

        if (arguments.length < 4) {
          // getter, passed target, property, and unit (from _get())
          a = props.map(function (prop) {
            return _get(plugin, prop, property);
          });
          vars = a.join(" ");
          return vars.split(a[0]).length === 5 ? a[0] : vars;
        }

        a = (endValue + "").split(" ");
        vars = {};
        props.forEach(function (prop, i) {
          return vars[prop] = a[i] = a[i] || a[(i - 1) / 2 | 0];
        });
        plugin.init(target, vars, tween);
      };
    });

    var CSSPlugin = {
      name: "css",
      register: _initCore,
      targetTest: function targetTest(target) {
        return target.style && target.nodeType;
      },
      init: function init(target, vars, tween, index, targets) {
        var props = this._props,
            style = target.style,
            startAt = tween.vars.startAt,
            startValue,
            endValue,
            endNum,
            startNum,
            type,
            specialProp,
            p,
            startUnit,
            endUnit,
            relative,
            isTransformRelated,
            transformPropTween,
            cache,
            smooth,
            hasPriority;
        _pluginInitted || _initCore();

        for (p in vars) {
          if (p === "autoRound") {
            continue;
          }

          endValue = vars[p];

          if (_plugins[p] && _checkPlugin(p, vars, tween, index, target, targets)) {
            // plugins
            continue;
          }

          type = typeof endValue;
          specialProp = _specialProps[p];

          if (type === "function") {
            endValue = endValue.call(tween, index, target, targets);
            type = typeof endValue;
          }

          if (type === "string" && ~endValue.indexOf("random(")) {
            endValue = _replaceRandom(endValue);
          }

          if (specialProp) {
            specialProp(this, target, p, endValue, tween) && (hasPriority = 1);
          } else if (p.substr(0, 2) === "--") {
            //CSS variable
            startValue = (getComputedStyle(target).getPropertyValue(p) + "").trim();
            endValue += "";
            _colorExp.lastIndex = 0;

            if (!_colorExp.test(startValue)) {
              // colors don't have units
              startUnit = getUnit(startValue);
              endUnit = getUnit(endValue);
            }

            endUnit ? startUnit !== endUnit && (startValue = _convertToUnit(target, p, startValue, endUnit) + endUnit) : startUnit && (endValue += startUnit);
            this.add(style, "setProperty", startValue, endValue, index, targets, 0, 0, p);
            props.push(p);
          } else if (type !== "undefined") {
            if (startAt && p in startAt) {
              // in case someone hard-codes a complex value as the start, like top: "calc(2vh / 2)". Without this, it'd use the computed value (always in px)
              startValue = typeof startAt[p] === "function" ? startAt[p].call(tween, index, target, targets) : startAt[p];
              _isString(startValue) && ~startValue.indexOf("random(") && (startValue = _replaceRandom(startValue));
              getUnit(startValue + "") || (startValue += _config.units[p] || getUnit(_get(target, p)) || ""); // for cases when someone passes in a unitless value like {x: 100}; if we try setting translate(100, 0px) it won't work.

              (startValue + "").charAt(1) === "=" && (startValue = _get(target, p)); // can't work with relative values
            } else {
              startValue = _get(target, p);
            }

            startNum = parseFloat(startValue);
            relative = type === "string" && endValue.charAt(1) === "=" ? +(endValue.charAt(0) + "1") : 0;
            relative && (endValue = endValue.substr(2));
            endNum = parseFloat(endValue);

            if (p in _propertyAliases) {
              if (p === "autoAlpha") {
                //special case where we control the visibility along with opacity. We still allow the opacity value to pass through and get tweened.
                if (startNum === 1 && _get(target, "visibility") === "hidden" && endNum) {
                  //if visibility is initially set to "hidden", we should interpret that as intent to make opacity 0 (a convenience)
                  startNum = 0;
                }

                _addNonTweeningPT(this, style, "visibility", startNum ? "inherit" : "hidden", endNum ? "inherit" : "hidden", !endNum);
              }

              if (p !== "scale" && p !== "transform") {
                p = _propertyAliases[p];
                ~p.indexOf(",") && (p = p.split(",")[0]);
              }
            }

            isTransformRelated = p in _transformProps; //--- TRANSFORM-RELATED ---

            if (isTransformRelated) {
              if (!transformPropTween) {
                cache = target._gsap;
                cache.renderTransform && !vars.parseTransform || _parseTransform(target, vars.parseTransform); // if, for example, gsap.set(... {transform:"translateX(50vw)"}), the _get() call doesn't parse the transform, thus cache.renderTransform won't be set yet so force the parsing of the transform here.

                smooth = vars.smoothOrigin !== false && cache.smooth;
                transformPropTween = this._pt = new PropTween(this._pt, style, _transformProp, 0, 1, cache.renderTransform, cache, 0, -1); //the first time through, create the rendering PropTween so that it runs LAST (in the linked list, we keep adding to the beginning)

                transformPropTween.dep = 1; //flag it as dependent so that if things get killed/overwritten and this is the only PropTween left, we can safely kill the whole tween.
              }

              if (p === "scale") {
                this._pt = new PropTween(this._pt, cache, "scaleY", cache.scaleY, (relative ? relative * endNum : endNum - cache.scaleY) || 0);
                props.push("scaleY", p);
                p += "X";
              } else if (p === "transformOrigin") {
                endValue = _convertKeywordsToPercentages(endValue); //in case something like "left top" or "bottom right" is passed in. Convert to percentages.

                if (cache.svg) {
                  _applySVGOrigin(target, endValue, 0, smooth, 0, this);
                } else {
                  endUnit = parseFloat(endValue.split(" ")[2]) || 0; //handle the zOrigin separately!

                  endUnit !== cache.zOrigin && _addNonTweeningPT(this, cache, "zOrigin", cache.zOrigin, endUnit);

                  _addNonTweeningPT(this, style, p, _firstTwoOnly(startValue), _firstTwoOnly(endValue));
                }

                continue;
              } else if (p === "svgOrigin") {
                _applySVGOrigin(target, endValue, 1, smooth, 0, this);

                continue;
              } else if (p in _rotationalProperties) {
                _addRotationalPropTween(this, cache, p, startNum, endValue, relative);

                continue;
              } else if (p === "smoothOrigin") {
                _addNonTweeningPT(this, cache, "smooth", cache.smooth, endValue);

                continue;
              } else if (p === "force3D") {
                cache[p] = endValue;
                continue;
              } else if (p === "transform") {
                _addRawTransformPTs(this, endValue, target);

                continue;
              }
            } else if (!(p in style)) {
              p = _checkPropPrefix(p) || p;
            }

            if (isTransformRelated || (endNum || endNum === 0) && (startNum || startNum === 0) && !_complexExp.test(endValue) && p in style) {
              startUnit = (startValue + "").substr((startNum + "").length);
              endNum || (endNum = 0); // protect against NaN

              endUnit = getUnit(endValue) || (p in _config.units ? _config.units[p] : startUnit);
              startUnit !== endUnit && (startNum = _convertToUnit(target, p, startValue, endUnit));
              this._pt = new PropTween(this._pt, isTransformRelated ? cache : style, p, startNum, relative ? relative * endNum : endNum - startNum, !isTransformRelated && (endUnit === "px" || p === "zIndex") && vars.autoRound !== false ? _renderRoundedCSSProp : _renderCSSProp);
              this._pt.u = endUnit || 0;

              if (startUnit !== endUnit && endUnit !== "%") {
                //when the tween goes all the way back to the beginning, we need to revert it to the OLD/ORIGINAL value (with those units). We record that as a "b" (beginning) property and point to a render method that handles that. (performance optimization)
                this._pt.b = startValue;
                this._pt.r = _renderCSSPropWithBeginning;
              }
            } else if (!(p in style)) {
              if (p in target) {
                //maybe it's not a style - it could be a property added directly to an element in which case we'll try to animate that.
                this.add(target, p, startValue || target[p], endValue, index, targets);
              } else {
                _missingPlugin(p, endValue);

                continue;
              }
            } else {
              _tweenComplexCSSString.call(this, target, p, startValue, endValue);
            }

            props.push(p);
          }
        }

        hasPriority && _sortPropTweensByPriority(this);
      },
      get: _get,
      aliases: _propertyAliases,
      getSetter: function getSetter(target, property, plugin) {
        //returns a setter function that accepts target, property, value and applies it accordingly. Remember, properties like "x" aren't as simple as target.style.property = value because they've got to be applied to a proxy object and then merged into a transform string in a renderer.
        var p = _propertyAliases[property];
        p && p.indexOf(",") < 0 && (property = p);
        return property in _transformProps && property !== _transformOriginProp && (target._gsap.x || _get(target, "x")) ? plugin && _recentSetterPlugin === plugin ? property === "scale" ? _setterScale : _setterTransform : (_recentSetterPlugin = plugin || {}) && (property === "scale" ? _setterScaleWithRender : _setterTransformWithRender) : target.style && !_isUndefined(target.style[property]) ? _setterCSSStyle : ~property.indexOf("-") ? _setterCSSProp : _getSetter(target, property);
      },
      core: {
        _removeProperty: _removeProperty,
        _getMatrix: _getMatrix
      }
    };
    gsap.utils.checkPrefix = _checkPropPrefix;

    (function (positionAndScale, rotation, others, aliases) {
      var all = _forEachName(positionAndScale + "," + rotation + "," + others, function (name) {
        _transformProps[name] = 1;
      });

      _forEachName(rotation, function (name) {
        _config.units[name] = "deg";
        _rotationalProperties[name] = 1;
      });

      _propertyAliases[all[13]] = positionAndScale + "," + rotation;

      _forEachName(aliases, function (name) {
        var split = name.split(":");
        _propertyAliases[split[1]] = all[split[0]];
      });
    })("x,y,z,scale,scaleX,scaleY,xPercent,yPercent", "rotation,rotationX,rotationY,skewX,skewY", "transform,transformOrigin,svgOrigin,force3D,smoothOrigin,transformPerspective", "0:translateX,1:translateY,2:translateZ,8:rotate,8:rotationZ,8:rotateZ,9:rotateX,10:rotateY");

    _forEachName("x,y,z,top,right,bottom,left,width,height,fontSize,padding,margin,perspective", function (name) {
      _config.units[name] = "px";
    });

    gsap.registerPlugin(CSSPlugin);

    var gsapWithCSS = gsap.registerPlugin(CSSPlugin) || gsap;
        // to protect from tree shaking
    gsapWithCSS.core.Tween;

    class svgDraw {
        el;
        className;
        constructor(el, className) {
            this.el = el;
            this.className = className;
        }
        pause() {

        }
        play() {
            setTimeout(() => {
                console.log(this.className);
                this.el.classList.add(this.className);
            }, 10);
        }
    }

    const defaults = {
        "duration": 0.6,
        "ease": "sine.out",
        "delay": 0
    };

    const Animations = {
        "fade": (el, dur=defaults.duration, es=defaults.ease, dl=defaults.delay) => {
            const animation = gsapWithCSS.fromTo(el, {opacity: 0}, {opacity: 1, duration:dur, ease:es, delay:dl});
            return animation;
        },
        "fadeUp": (el, dur=defaults.duration, es=defaults.ease, dl=defaults.delay) => {
            const animation = gsapWithCSS.fromTo(el, {opacity: 0, y:+10}, {opacity: 1, y:+0, duration:dur, ease:es, delay:dl});
            return animation;
        },
        "fadeDown": (el, dur=defaults.duration, es=defaults.ease, dl=defaults.delay) => {
            const animation = gsapWithCSS.fromTo(el, {opacity: 0, y:-10}, {opacity: 1, y:+0, duration:dur, ease:es, delay:dl});
            return animation;
        },
        "fadeLeft": (el, dur=defaults.duration, es=defaults.ease, dl=defaults.delay) => {
            const animation = gsapWithCSS.fromTo(el, {opacity: 0, x:-10}, {opacity: 1, x:+0, duration:dur, ease:es, delay:dl});
            return animation;
        },
        "slideLeft": (el, dur=1, es=defaults.ease, dl=defaults.delay) => {
            const animation = gsapWithCSS.fromTo(el, {opacity: 1, x:-400}, {opacity: 1, x:+0, duration:dur, ease:es, delay:dl});
            return animation;
        },
        "draw": (el, dur=defaults.duration, es=defaults.ease, dl=defaults.delay, newClass=el.dataset.newclass) => {
            const animation = new svgDraw(el, newClass);
            return animation;
        }
    };

    class AnimatedElement {
        isDone;
        yPos;
        el;
        constructor(el) {
            this.el = el;
            this.yPos = naturalize(getOffset(el).top - window.innerHeight*0.9);
            this.animation = Animations[el.dataset.animation](this.el);
            // if(el.dataset.animation!="draw") {
                this.animation.pause();
            // }
            this.isDone = false;
            this.el.classList.add('animated');
        }

        animate() {
            if(!this.isDone) {
                this.animation.play();
            }
            this.isDone = true;
            this.el.classList.remove('animated');
        }
    }

    class Parallax {
        el;
        yPos;
        ratio;
        constructor(el) {
            this.el = el;
            console.log(el);
            this.yPos = naturalize(getOffset(el).top - window.innerHeight);
            this.ratio = Number(el.dataset.parallax);
            this.el.classList.add('parallax');
        }
    }

    class Page {
        yPos;
        animatedElements = [];
        parallaxes = [];

        constructor() {
            document.querySelectorAll("[data-animation]").forEach((el) => {
                this.animatedElements.push(new AnimatedElement(el));
            });
            document.querySelectorAll("[data-parallax]").forEach((el) => {
                this.parallaxes.push(new Parallax(el));
            });
            console.log(this.parallaxes);
        }

        handleScroll() {
            this.yPos = window.pageYOffset;
            for(let i in this.animatedElements) {
                if(this.yPos>=this.animatedElements[i].yPos) {
                    this.animatedElements[i].animate();
                    this.animatedElements.slice(i);
                }
            }
            for(let i in this.parallaxes) {
                if(this.yPos>=this.parallaxes[i].yPos) {
                    this.parallaxes[i].el.style.transform = `translateY(${(this.yPos - this.parallaxes[i].yPos)*this.parallaxes[i].ratio}px)`;
                }
            }
        }

        init() {
            this.handleScroll();
            document.addEventListener('scroll', ()=> {
                this.handleScroll();
            });
        }
    }

    /* src\App.svelte generated by Svelte v3.46.4 */
    const file = "src\\App.svelte";

    // (49:0) <SegmentedElement bg="./media/plumbing.jpg">
    function create_default_slot_2(ctx) {
    	let h3;
    	let t1;
    	let div5;
    	let div0;
    	let svg0;
    	let path0;
    	let g0;
    	let path1;
    	let path2;
    	let path3;
    	let rect0;
    	let t2;
    	let p0;
    	let t4;
    	let div1;
    	let svg1;
    	let path4;
    	let g1;
    	let path5;
    	let path6;
    	let path7;
    	let rect1;
    	let t5;
    	let p1;
    	let t7;
    	let div2;
    	let svg2;
    	let path8;
    	let g2;
    	let path9;
    	let path10;
    	let path11;
    	let rect2;
    	let t8;
    	let p2;
    	let t10;
    	let div3;
    	let svg3;
    	let path12;
    	let g3;
    	let path13;
    	let path14;
    	let path15;
    	let rect3;
    	let t11;
    	let p3;
    	let t13;
    	let div4;
    	let svg4;
    	let path16;
    	let g4;
    	let path17;
    	let path18;
    	let path19;
    	let rect4;
    	let t14;
    	let p4;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Staram się zapewnić wykonanie usług na najwyższym poziomie.";
    			t1 = space();
    			div5 = element("div");
    			div0 = element("div");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			g0 = svg_element("g");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			rect0 = svg_element("rect");
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "Serwis, utrzymanie, remonty nieruchomosci";
    			t4 = space();
    			div1 = element("div");
    			svg1 = svg_element("svg");
    			path4 = svg_element("path");
    			g1 = svg_element("g");
    			path5 = svg_element("path");
    			path6 = svg_element("path");
    			path7 = svg_element("path");
    			rect1 = svg_element("rect");
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "Serwis, utrzymanie, remonty nieruchomosci";
    			t7 = space();
    			div2 = element("div");
    			svg2 = svg_element("svg");
    			path8 = svg_element("path");
    			g2 = svg_element("g");
    			path9 = svg_element("path");
    			path10 = svg_element("path");
    			path11 = svg_element("path");
    			rect2 = svg_element("rect");
    			t8 = space();
    			p2 = element("p");
    			p2.textContent = "Serwis, utrzymanie, remonty nieruchomosci";
    			t10 = space();
    			div3 = element("div");
    			svg3 = svg_element("svg");
    			path12 = svg_element("path");
    			g3 = svg_element("g");
    			path13 = svg_element("path");
    			path14 = svg_element("path");
    			path15 = svg_element("path");
    			rect3 = svg_element("rect");
    			t11 = space();
    			p3 = element("p");
    			p3.textContent = "Serwis, utrzymanie, remonty nieruchomosci";
    			t13 = space();
    			div4 = element("div");
    			svg4 = svg_element("svg");
    			path16 = svg_element("path");
    			g4 = svg_element("g");
    			path17 = svg_element("path");
    			path18 = svg_element("path");
    			path19 = svg_element("path");
    			rect4 = svg_element("rect");
    			t14 = space();
    			p4 = element("p");
    			p4.textContent = "Serwis, utrzymanie, remonty nieruchomosci";
    			attr_dev(h3, "class", "svelte-snollg");
    			add_location(h3, file, 49, 1, 982);
    			attr_dev(path0, "d", "M310.08,232.57a4.94,4.94,0,0,0-.26,2,2.85,2.85,0,0,0,.24.91,2.49,2.49,0,0,0,.53.79l40.81,41a2.54,2.54,0,0,0,1.09.65,3.34,3.34,0,0,0,1.09.15,6.55,6.55,0,0,0,2-.46,14.35,14.35,0,0,0,3.16-1.79l.54-.41,2.76,2.78-10,9.95-35.5-13.84a3.45,3.45,0,0,0-3.64.85l-6.21,6.17-4.34-4.37a3.54,3.54,0,0,0-2.65-1,4.22,4.22,0,0,0-4,4,3.56,3.56,0,0,0,1,2.66l1,1-19.63,19.52a2.68,2.68,0,0,0-.61.93,3.22,3.22,0,0,0-.19.9,4.33,4.33,0,0,0,.24,1.55,9.21,9.21,0,0,0,1.16,2.3,16.18,16.18,0,0,0,1.82,2.18,16.64,16.64,0,0,0,1.88,1.62,8.79,8.79,0,0,0,3,1.51,3.77,3.77,0,0,0,1.53.08,2.48,2.48,0,0,0,.77-.25,2.67,2.67,0,0,0,.68-.49L308,293.9l1,1a3.5,3.5,0,0,0,2.65,1,4.2,4.2,0,0,0,4-4,3.54,3.54,0,0,0-1-2.66l-3.5-3.52,4.58-4.54,35.49,13.83a3.46,3.46,0,0,0,3.65-.85l14.07-14a3.54,3.54,0,0,0,1.06-2.37,3,3,0,0,0-.87-2.3l-5-5a1.25,1.25,0,0,1,.09-.12,14.35,14.35,0,0,0,2.32-4.11,5.12,5.12,0,0,0,.25-1.95,2.84,2.84,0,0,0-.23-.91,2.57,2.57,0,0,0-.54-.8l-40.81-41a2.72,2.72,0,0,0-1.08-.65,3.36,3.36,0,0,0-1.1-.14,6.07,6.07,0,0,0-2,.46,14.81,14.81,0,0,0-3.16,1.79,25.68,25.68,0,0,0-3.12,2.67,26,26,0,0,0-2.38,2.69A14.18,14.18,0,0,0,310.08,232.57Zm-22.93,79.6a.64.64,0,0,1-.22.14,1.22,1.22,0,0,1-.32.06,2.41,2.41,0,0,1-.91-.15,7.49,7.49,0,0,1-1.86-1,13.86,13.86,0,0,1-1.94-1.63,14.21,14.21,0,0,1-1.45-1.7,7.14,7.14,0,0,1-1.22-2.4,1.87,1.87,0,0,1-.05-.79.81.81,0,0,1,.07-.22.91.91,0,0,1,.11-.16L299,284.82l7.79,7.83Zm26.17-21.51a1.86,1.86,0,0,1,.52,1.38,2.15,2.15,0,0,1-.65,1.44,2.12,2.12,0,0,1-1.42.63,1.85,1.85,0,0,1-1.38-.53L298.08,281.2a1.84,1.84,0,0,1-.52-1.38,2.09,2.09,0,0,1,.64-1.42,2.14,2.14,0,0,1,1.44-.64,1.79,1.79,0,0,1,1.37.53Zm54.48-13.73a1.35,1.35,0,0,1,.39,1,1.6,1.6,0,0,1-.48,1.05l-14.07,14a1.52,1.52,0,0,1-1.62.38l-36-14.05a.94.94,0,0,0-1,.24l-5,5-2-2,6.2-6.17a1.53,1.53,0,0,1,1.62-.38l36.05,14.05a1,1,0,0,0,1-.24L364,278.75a1,1,0,0,0,.3-.65.89.89,0,0,0-.24-.65l-3.26-3.27c.38-.34.75-.68,1.11-1s.71-.73,1.05-1.1Zm-49.29-52.09a12.23,12.23,0,0,1,3.5-2,3.06,3.06,0,0,1,1.21-.17,1.12,1.12,0,0,1,.39.1.77.77,0,0,1,.29.19l40.81,41a1,1,0,0,1,.24.41,2,2,0,0,1,.06.53,4.32,4.32,0,0,1-.33,1.37,13.07,13.07,0,0,1-1.57,2.7,23.17,23.17,0,0,1-2.47,2.86,24.9,24.9,0,0,1-2.49,2.18,12.13,12.13,0,0,1-3.51,2,3,3,0,0,1-1.2.17,1.23,1.23,0,0,1-.39-.1.94.94,0,0,1-.29-.2l-40.81-41a1,1,0,0,1-.24-.4,1.35,1.35,0,0,1-.06-.52,4.26,4.26,0,0,1,.33-1.37,12.78,12.78,0,0,1,1.56-2.71,25.41,25.41,0,0,1,5-5Z");
    			attr_dev(path0, "transform", "translate(-196.67 -220.61)");
    			set_style(path0, "fill", "#fbd233");
    			set_style(path0, "stroke", "#fdd338");
    			set_style(path0, "stroke-miterlimit", "10");
    			set_style(path0, "stroke-width", "0.47899064833815px");
    			add_location(path0, file, 53, 4, 1227);
    			attr_dev(path1, "d", "M212.63,297.9l37.49-32.56a1.34,1.34,0,0,1,1.88,0l9.59,11.05a1.25,1.25,0,0,1,.21,1.23c0,.1-3.72,10.71-3.16,19.94.43,7.3,6.33,12.66,13.79,19.44,1.83,1.66,3.71,3.38,5.67,5.26,10.62,10.16,8.34,20.83,8.24,21.28a1.5,1.5,0,0,1-1.33,1.15c-.46,0-11.34.8-19.92-11.14-1.58-2.2-3-4.31-4.4-6.35-5.67-8.34-10.15-14.93-17.32-16.39-9.07-1.84-20.08.32-20.19.34a1.24,1.24,0,0,1-1.19-.38l-9.59-11.05A1.33,1.33,0,0,1,212.63,297.9Zm38.09-29.74-35.39,30.73,8.32,9.58c2.71-.47,12.21-1.89,20.51-.2,8.12,1.65,12.83,8.58,18.79,17.35,1.38,2,2.81,4.13,4.38,6.31,6.26,8.72,13.71,10,16.56,10.17.24-2.84,0-10.4-7.75-17.83-1.93-1.85-3.81-3.56-5.63-5.21-7.85-7.14-14.05-12.77-14.54-21.05-.51-8.45,2.22-17.65,3.07-20.27Z");
    			attr_dev(path1, "transform", "translate(-196.67 -220.61)");
    			set_style(path1, "fill", "#ffd400");
    			add_location(path1, file, 55, 6, 3739);
    			attr_dev(path2, "d", "M274.19,330.93a3.48,3.48,0,1,1-.63,5.13A3.67,3.67,0,0,1,274.19,330.93Zm2.89,3.33a1,1,0,1,0-1.41,0A1,1,0,0,0,277.08,334.26Z");
    			attr_dev(path2, "transform", "translate(-196.67 -220.61)");
    			set_style(path2, "fill", "#ffd400");
    			add_location(path2, file, 56, 6, 4506);
    			attr_dev(path3, "d", "M197.18,280.1l37.49-32.55a1.33,1.33,0,0,1,1.88,0c7.09,8.17,14.61,18.48,14.69,18.58L249,267.84c-.07-.1-7-9.55-13.75-17.47l-35.38,30.72c7,8,15.29,16,15.38,16.06l-2,2c-.09-.09-9.12-8.83-16.34-17.15A1.34,1.34,0,0,1,197.18,280.1Z");
    			attr_dev(path3, "transform", "translate(-196.67 -220.61)");
    			set_style(path3, "fill", "#ffd400");
    			add_location(path3, file, 57, 6, 4709);
    			attr_dev(rect0, "x", "215.13");
    			attr_dev(rect0, "y", "290.25");
    			attr_dev(rect0, "width", "49.65");
    			attr_dev(rect0, "height", "2.52");
    			attr_dev(rect0, "transform", "translate(-329.02 8.11) rotate(-40.97)");
    			set_style(rect0, "fill", "#ffd400");
    			add_location(rect0, file, 58, 6, 5014);
    			add_location(g0, file, 54, 4, 3728);
    			attr_dev(svg0, "id", "e5378e40-b45c-4af2-ab39-e52fd890ec1b");
    			attr_dev(svg0, "data-name", "Warstwa 1");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "viewBox", "0 0 173.6 124.14");
    			attr_dev(svg0, "class", "svelte-snollg");
    			add_location(svg0, file, 52, 3, 1090);
    			attr_dev(p0, "class", "svelte-snollg");
    			add_location(p0, file, 61, 3, 5172);
    			attr_dev(div0, "class", "svelte-snollg");
    			add_location(div0, file, 51, 2, 1080);
    			attr_dev(path4, "d", "M310.08,232.57a4.94,4.94,0,0,0-.26,2,2.85,2.85,0,0,0,.24.91,2.49,2.49,0,0,0,.53.79l40.81,41a2.54,2.54,0,0,0,1.09.65,3.34,3.34,0,0,0,1.09.15,6.55,6.55,0,0,0,2-.46,14.35,14.35,0,0,0,3.16-1.79l.54-.41,2.76,2.78-10,9.95-35.5-13.84a3.45,3.45,0,0,0-3.64.85l-6.21,6.17-4.34-4.37a3.54,3.54,0,0,0-2.65-1,4.22,4.22,0,0,0-4,4,3.56,3.56,0,0,0,1,2.66l1,1-19.63,19.52a2.68,2.68,0,0,0-.61.93,3.22,3.22,0,0,0-.19.9,4.33,4.33,0,0,0,.24,1.55,9.21,9.21,0,0,0,1.16,2.3,16.18,16.18,0,0,0,1.82,2.18,16.64,16.64,0,0,0,1.88,1.62,8.79,8.79,0,0,0,3,1.51,3.77,3.77,0,0,0,1.53.08,2.48,2.48,0,0,0,.77-.25,2.67,2.67,0,0,0,.68-.49L308,293.9l1,1a3.5,3.5,0,0,0,2.65,1,4.2,4.2,0,0,0,4-4,3.54,3.54,0,0,0-1-2.66l-3.5-3.52,4.58-4.54,35.49,13.83a3.46,3.46,0,0,0,3.65-.85l14.07-14a3.54,3.54,0,0,0,1.06-2.37,3,3,0,0,0-.87-2.3l-5-5a1.25,1.25,0,0,1,.09-.12,14.35,14.35,0,0,0,2.32-4.11,5.12,5.12,0,0,0,.25-1.95,2.84,2.84,0,0,0-.23-.91,2.57,2.57,0,0,0-.54-.8l-40.81-41a2.72,2.72,0,0,0-1.08-.65,3.36,3.36,0,0,0-1.1-.14,6.07,6.07,0,0,0-2,.46,14.81,14.81,0,0,0-3.16,1.79,25.68,25.68,0,0,0-3.12,2.67,26,26,0,0,0-2.38,2.69A14.18,14.18,0,0,0,310.08,232.57Zm-22.93,79.6a.64.64,0,0,1-.22.14,1.22,1.22,0,0,1-.32.06,2.41,2.41,0,0,1-.91-.15,7.49,7.49,0,0,1-1.86-1,13.86,13.86,0,0,1-1.94-1.63,14.21,14.21,0,0,1-1.45-1.7,7.14,7.14,0,0,1-1.22-2.4,1.87,1.87,0,0,1-.05-.79.81.81,0,0,1,.07-.22.91.91,0,0,1,.11-.16L299,284.82l7.79,7.83Zm26.17-21.51a1.86,1.86,0,0,1,.52,1.38,2.15,2.15,0,0,1-.65,1.44,2.12,2.12,0,0,1-1.42.63,1.85,1.85,0,0,1-1.38-.53L298.08,281.2a1.84,1.84,0,0,1-.52-1.38,2.09,2.09,0,0,1,.64-1.42,2.14,2.14,0,0,1,1.44-.64,1.79,1.79,0,0,1,1.37.53Zm54.48-13.73a1.35,1.35,0,0,1,.39,1,1.6,1.6,0,0,1-.48,1.05l-14.07,14a1.52,1.52,0,0,1-1.62.38l-36-14.05a.94.94,0,0,0-1,.24l-5,5-2-2,6.2-6.17a1.53,1.53,0,0,1,1.62-.38l36.05,14.05a1,1,0,0,0,1-.24L364,278.75a1,1,0,0,0,.3-.65.89.89,0,0,0-.24-.65l-3.26-3.27c.38-.34.75-.68,1.11-1s.71-.73,1.05-1.1Zm-49.29-52.09a12.23,12.23,0,0,1,3.5-2,3.06,3.06,0,0,1,1.21-.17,1.12,1.12,0,0,1,.39.1.77.77,0,0,1,.29.19l40.81,41a1,1,0,0,1,.24.41,2,2,0,0,1,.06.53,4.32,4.32,0,0,1-.33,1.37,13.07,13.07,0,0,1-1.57,2.7,23.17,23.17,0,0,1-2.47,2.86,24.9,24.9,0,0,1-2.49,2.18,12.13,12.13,0,0,1-3.51,2,3,3,0,0,1-1.2.17,1.23,1.23,0,0,1-.39-.1.94.94,0,0,1-.29-.2l-40.81-41a1,1,0,0,1-.24-.4,1.35,1.35,0,0,1-.06-.52,4.26,4.26,0,0,1,.33-1.37,12.78,12.78,0,0,1,1.56-2.71,25.41,25.41,0,0,1,5-5Z");
    			attr_dev(path4, "transform", "translate(-196.67 -220.61)");
    			set_style(path4, "fill", "#fbd233");
    			set_style(path4, "stroke", "#fdd338");
    			set_style(path4, "stroke-miterlimit", "10");
    			set_style(path4, "stroke-width", "0.47899064833815px");
    			add_location(path4, file, 65, 4, 5382);
    			attr_dev(path5, "d", "M212.63,297.9l37.49-32.56a1.34,1.34,0,0,1,1.88,0l9.59,11.05a1.25,1.25,0,0,1,.21,1.23c0,.1-3.72,10.71-3.16,19.94.43,7.3,6.33,12.66,13.79,19.44,1.83,1.66,3.71,3.38,5.67,5.26,10.62,10.16,8.34,20.83,8.24,21.28a1.5,1.5,0,0,1-1.33,1.15c-.46,0-11.34.8-19.92-11.14-1.58-2.2-3-4.31-4.4-6.35-5.67-8.34-10.15-14.93-17.32-16.39-9.07-1.84-20.08.32-20.19.34a1.24,1.24,0,0,1-1.19-.38l-9.59-11.05A1.33,1.33,0,0,1,212.63,297.9Zm38.09-29.74-35.39,30.73,8.32,9.58c2.71-.47,12.21-1.89,20.51-.2,8.12,1.65,12.83,8.58,18.79,17.35,1.38,2,2.81,4.13,4.38,6.31,6.26,8.72,13.71,10,16.56,10.17.24-2.84,0-10.4-7.75-17.83-1.93-1.85-3.81-3.56-5.63-5.21-7.85-7.14-14.05-12.77-14.54-21.05-.51-8.45,2.22-17.65,3.07-20.27Z");
    			attr_dev(path5, "transform", "translate(-196.67 -220.61)");
    			set_style(path5, "fill", "#ffd400");
    			add_location(path5, file, 67, 6, 7894);
    			attr_dev(path6, "d", "M274.19,330.93a3.48,3.48,0,1,1-.63,5.13A3.67,3.67,0,0,1,274.19,330.93Zm2.89,3.33a1,1,0,1,0-1.41,0A1,1,0,0,0,277.08,334.26Z");
    			attr_dev(path6, "transform", "translate(-196.67 -220.61)");
    			set_style(path6, "fill", "#ffd400");
    			add_location(path6, file, 68, 6, 8661);
    			attr_dev(path7, "d", "M197.18,280.1l37.49-32.55a1.33,1.33,0,0,1,1.88,0c7.09,8.17,14.61,18.48,14.69,18.58L249,267.84c-.07-.1-7-9.55-13.75-17.47l-35.38,30.72c7,8,15.29,16,15.38,16.06l-2,2c-.09-.09-9.12-8.83-16.34-17.15A1.34,1.34,0,0,1,197.18,280.1Z");
    			attr_dev(path7, "transform", "translate(-196.67 -220.61)");
    			set_style(path7, "fill", "#ffd400");
    			add_location(path7, file, 69, 6, 8864);
    			attr_dev(rect1, "x", "215.13");
    			attr_dev(rect1, "y", "290.25");
    			attr_dev(rect1, "width", "49.65");
    			attr_dev(rect1, "height", "2.52");
    			attr_dev(rect1, "transform", "translate(-329.02 8.11) rotate(-40.97)");
    			set_style(rect1, "fill", "#ffd400");
    			add_location(rect1, file, 70, 6, 9169);
    			add_location(g1, file, 66, 4, 7883);
    			attr_dev(svg1, "id", "e5378e40-b45c-4af2-ab39-e52fd890ec1b");
    			attr_dev(svg1, "data-name", "Warstwa 1");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "viewBox", "0 0 173.6 124.14");
    			attr_dev(svg1, "class", "svelte-snollg");
    			add_location(svg1, file, 64, 3, 5245);
    			attr_dev(p1, "class", "svelte-snollg");
    			add_location(p1, file, 73, 3, 9327);
    			attr_dev(div1, "class", "svelte-snollg");
    			add_location(div1, file, 63, 2, 5235);
    			attr_dev(path8, "d", "M310.08,232.57a4.94,4.94,0,0,0-.26,2,2.85,2.85,0,0,0,.24.91,2.49,2.49,0,0,0,.53.79l40.81,41a2.54,2.54,0,0,0,1.09.65,3.34,3.34,0,0,0,1.09.15,6.55,6.55,0,0,0,2-.46,14.35,14.35,0,0,0,3.16-1.79l.54-.41,2.76,2.78-10,9.95-35.5-13.84a3.45,3.45,0,0,0-3.64.85l-6.21,6.17-4.34-4.37a3.54,3.54,0,0,0-2.65-1,4.22,4.22,0,0,0-4,4,3.56,3.56,0,0,0,1,2.66l1,1-19.63,19.52a2.68,2.68,0,0,0-.61.93,3.22,3.22,0,0,0-.19.9,4.33,4.33,0,0,0,.24,1.55,9.21,9.21,0,0,0,1.16,2.3,16.18,16.18,0,0,0,1.82,2.18,16.64,16.64,0,0,0,1.88,1.62,8.79,8.79,0,0,0,3,1.51,3.77,3.77,0,0,0,1.53.08,2.48,2.48,0,0,0,.77-.25,2.67,2.67,0,0,0,.68-.49L308,293.9l1,1a3.5,3.5,0,0,0,2.65,1,4.2,4.2,0,0,0,4-4,3.54,3.54,0,0,0-1-2.66l-3.5-3.52,4.58-4.54,35.49,13.83a3.46,3.46,0,0,0,3.65-.85l14.07-14a3.54,3.54,0,0,0,1.06-2.37,3,3,0,0,0-.87-2.3l-5-5a1.25,1.25,0,0,1,.09-.12,14.35,14.35,0,0,0,2.32-4.11,5.12,5.12,0,0,0,.25-1.95,2.84,2.84,0,0,0-.23-.91,2.57,2.57,0,0,0-.54-.8l-40.81-41a2.72,2.72,0,0,0-1.08-.65,3.36,3.36,0,0,0-1.1-.14,6.07,6.07,0,0,0-2,.46,14.81,14.81,0,0,0-3.16,1.79,25.68,25.68,0,0,0-3.12,2.67,26,26,0,0,0-2.38,2.69A14.18,14.18,0,0,0,310.08,232.57Zm-22.93,79.6a.64.64,0,0,1-.22.14,1.22,1.22,0,0,1-.32.06,2.41,2.41,0,0,1-.91-.15,7.49,7.49,0,0,1-1.86-1,13.86,13.86,0,0,1-1.94-1.63,14.21,14.21,0,0,1-1.45-1.7,7.14,7.14,0,0,1-1.22-2.4,1.87,1.87,0,0,1-.05-.79.81.81,0,0,1,.07-.22.91.91,0,0,1,.11-.16L299,284.82l7.79,7.83Zm26.17-21.51a1.86,1.86,0,0,1,.52,1.38,2.15,2.15,0,0,1-.65,1.44,2.12,2.12,0,0,1-1.42.63,1.85,1.85,0,0,1-1.38-.53L298.08,281.2a1.84,1.84,0,0,1-.52-1.38,2.09,2.09,0,0,1,.64-1.42,2.14,2.14,0,0,1,1.44-.64,1.79,1.79,0,0,1,1.37.53Zm54.48-13.73a1.35,1.35,0,0,1,.39,1,1.6,1.6,0,0,1-.48,1.05l-14.07,14a1.52,1.52,0,0,1-1.62.38l-36-14.05a.94.94,0,0,0-1,.24l-5,5-2-2,6.2-6.17a1.53,1.53,0,0,1,1.62-.38l36.05,14.05a1,1,0,0,0,1-.24L364,278.75a1,1,0,0,0,.3-.65.89.89,0,0,0-.24-.65l-3.26-3.27c.38-.34.75-.68,1.11-1s.71-.73,1.05-1.1Zm-49.29-52.09a12.23,12.23,0,0,1,3.5-2,3.06,3.06,0,0,1,1.21-.17,1.12,1.12,0,0,1,.39.1.77.77,0,0,1,.29.19l40.81,41a1,1,0,0,1,.24.41,2,2,0,0,1,.06.53,4.32,4.32,0,0,1-.33,1.37,13.07,13.07,0,0,1-1.57,2.7,23.17,23.17,0,0,1-2.47,2.86,24.9,24.9,0,0,1-2.49,2.18,12.13,12.13,0,0,1-3.51,2,3,3,0,0,1-1.2.17,1.23,1.23,0,0,1-.39-.1.94.94,0,0,1-.29-.2l-40.81-41a1,1,0,0,1-.24-.4,1.35,1.35,0,0,1-.06-.52,4.26,4.26,0,0,1,.33-1.37,12.78,12.78,0,0,1,1.56-2.71,25.41,25.41,0,0,1,5-5Z");
    			attr_dev(path8, "transform", "translate(-196.67 -220.61)");
    			set_style(path8, "fill", "#fbd233");
    			set_style(path8, "stroke", "#fdd338");
    			set_style(path8, "stroke-miterlimit", "10");
    			set_style(path8, "stroke-width", "0.47899064833815px");
    			add_location(path8, file, 77, 4, 9537);
    			attr_dev(path9, "d", "M212.63,297.9l37.49-32.56a1.34,1.34,0,0,1,1.88,0l9.59,11.05a1.25,1.25,0,0,1,.21,1.23c0,.1-3.72,10.71-3.16,19.94.43,7.3,6.33,12.66,13.79,19.44,1.83,1.66,3.71,3.38,5.67,5.26,10.62,10.16,8.34,20.83,8.24,21.28a1.5,1.5,0,0,1-1.33,1.15c-.46,0-11.34.8-19.92-11.14-1.58-2.2-3-4.31-4.4-6.35-5.67-8.34-10.15-14.93-17.32-16.39-9.07-1.84-20.08.32-20.19.34a1.24,1.24,0,0,1-1.19-.38l-9.59-11.05A1.33,1.33,0,0,1,212.63,297.9Zm38.09-29.74-35.39,30.73,8.32,9.58c2.71-.47,12.21-1.89,20.51-.2,8.12,1.65,12.83,8.58,18.79,17.35,1.38,2,2.81,4.13,4.38,6.31,6.26,8.72,13.71,10,16.56,10.17.24-2.84,0-10.4-7.75-17.83-1.93-1.85-3.81-3.56-5.63-5.21-7.85-7.14-14.05-12.77-14.54-21.05-.51-8.45,2.22-17.65,3.07-20.27Z");
    			attr_dev(path9, "transform", "translate(-196.67 -220.61)");
    			set_style(path9, "fill", "#ffd400");
    			add_location(path9, file, 79, 6, 12049);
    			attr_dev(path10, "d", "M274.19,330.93a3.48,3.48,0,1,1-.63,5.13A3.67,3.67,0,0,1,274.19,330.93Zm2.89,3.33a1,1,0,1,0-1.41,0A1,1,0,0,0,277.08,334.26Z");
    			attr_dev(path10, "transform", "translate(-196.67 -220.61)");
    			set_style(path10, "fill", "#ffd400");
    			add_location(path10, file, 80, 6, 12816);
    			attr_dev(path11, "d", "M197.18,280.1l37.49-32.55a1.33,1.33,0,0,1,1.88,0c7.09,8.17,14.61,18.48,14.69,18.58L249,267.84c-.07-.1-7-9.55-13.75-17.47l-35.38,30.72c7,8,15.29,16,15.38,16.06l-2,2c-.09-.09-9.12-8.83-16.34-17.15A1.34,1.34,0,0,1,197.18,280.1Z");
    			attr_dev(path11, "transform", "translate(-196.67 -220.61)");
    			set_style(path11, "fill", "#ffd400");
    			add_location(path11, file, 81, 6, 13019);
    			attr_dev(rect2, "x", "215.13");
    			attr_dev(rect2, "y", "290.25");
    			attr_dev(rect2, "width", "49.65");
    			attr_dev(rect2, "height", "2.52");
    			attr_dev(rect2, "transform", "translate(-329.02 8.11) rotate(-40.97)");
    			set_style(rect2, "fill", "#ffd400");
    			add_location(rect2, file, 82, 6, 13324);
    			add_location(g2, file, 78, 4, 12038);
    			attr_dev(svg2, "id", "e5378e40-b45c-4af2-ab39-e52fd890ec1b");
    			attr_dev(svg2, "data-name", "Warstwa 1");
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg2, "viewBox", "0 0 173.6 124.14");
    			attr_dev(svg2, "class", "svelte-snollg");
    			add_location(svg2, file, 76, 3, 9400);
    			attr_dev(p2, "class", "svelte-snollg");
    			add_location(p2, file, 85, 3, 13482);
    			attr_dev(div2, "class", "svelte-snollg");
    			add_location(div2, file, 75, 2, 9390);
    			attr_dev(path12, "d", "M310.08,232.57a4.94,4.94,0,0,0-.26,2,2.85,2.85,0,0,0,.24.91,2.49,2.49,0,0,0,.53.79l40.81,41a2.54,2.54,0,0,0,1.09.65,3.34,3.34,0,0,0,1.09.15,6.55,6.55,0,0,0,2-.46,14.35,14.35,0,0,0,3.16-1.79l.54-.41,2.76,2.78-10,9.95-35.5-13.84a3.45,3.45,0,0,0-3.64.85l-6.21,6.17-4.34-4.37a3.54,3.54,0,0,0-2.65-1,4.22,4.22,0,0,0-4,4,3.56,3.56,0,0,0,1,2.66l1,1-19.63,19.52a2.68,2.68,0,0,0-.61.93,3.22,3.22,0,0,0-.19.9,4.33,4.33,0,0,0,.24,1.55,9.21,9.21,0,0,0,1.16,2.3,16.18,16.18,0,0,0,1.82,2.18,16.64,16.64,0,0,0,1.88,1.62,8.79,8.79,0,0,0,3,1.51,3.77,3.77,0,0,0,1.53.08,2.48,2.48,0,0,0,.77-.25,2.67,2.67,0,0,0,.68-.49L308,293.9l1,1a3.5,3.5,0,0,0,2.65,1,4.2,4.2,0,0,0,4-4,3.54,3.54,0,0,0-1-2.66l-3.5-3.52,4.58-4.54,35.49,13.83a3.46,3.46,0,0,0,3.65-.85l14.07-14a3.54,3.54,0,0,0,1.06-2.37,3,3,0,0,0-.87-2.3l-5-5a1.25,1.25,0,0,1,.09-.12,14.35,14.35,0,0,0,2.32-4.11,5.12,5.12,0,0,0,.25-1.95,2.84,2.84,0,0,0-.23-.91,2.57,2.57,0,0,0-.54-.8l-40.81-41a2.72,2.72,0,0,0-1.08-.65,3.36,3.36,0,0,0-1.1-.14,6.07,6.07,0,0,0-2,.46,14.81,14.81,0,0,0-3.16,1.79,25.68,25.68,0,0,0-3.12,2.67,26,26,0,0,0-2.38,2.69A14.18,14.18,0,0,0,310.08,232.57Zm-22.93,79.6a.64.64,0,0,1-.22.14,1.22,1.22,0,0,1-.32.06,2.41,2.41,0,0,1-.91-.15,7.49,7.49,0,0,1-1.86-1,13.86,13.86,0,0,1-1.94-1.63,14.21,14.21,0,0,1-1.45-1.7,7.14,7.14,0,0,1-1.22-2.4,1.87,1.87,0,0,1-.05-.79.81.81,0,0,1,.07-.22.91.91,0,0,1,.11-.16L299,284.82l7.79,7.83Zm26.17-21.51a1.86,1.86,0,0,1,.52,1.38,2.15,2.15,0,0,1-.65,1.44,2.12,2.12,0,0,1-1.42.63,1.85,1.85,0,0,1-1.38-.53L298.08,281.2a1.84,1.84,0,0,1-.52-1.38,2.09,2.09,0,0,1,.64-1.42,2.14,2.14,0,0,1,1.44-.64,1.79,1.79,0,0,1,1.37.53Zm54.48-13.73a1.35,1.35,0,0,1,.39,1,1.6,1.6,0,0,1-.48,1.05l-14.07,14a1.52,1.52,0,0,1-1.62.38l-36-14.05a.94.94,0,0,0-1,.24l-5,5-2-2,6.2-6.17a1.53,1.53,0,0,1,1.62-.38l36.05,14.05a1,1,0,0,0,1-.24L364,278.75a1,1,0,0,0,.3-.65.89.89,0,0,0-.24-.65l-3.26-3.27c.38-.34.75-.68,1.11-1s.71-.73,1.05-1.1Zm-49.29-52.09a12.23,12.23,0,0,1,3.5-2,3.06,3.06,0,0,1,1.21-.17,1.12,1.12,0,0,1,.39.1.77.77,0,0,1,.29.19l40.81,41a1,1,0,0,1,.24.41,2,2,0,0,1,.06.53,4.32,4.32,0,0,1-.33,1.37,13.07,13.07,0,0,1-1.57,2.7,23.17,23.17,0,0,1-2.47,2.86,24.9,24.9,0,0,1-2.49,2.18,12.13,12.13,0,0,1-3.51,2,3,3,0,0,1-1.2.17,1.23,1.23,0,0,1-.39-.1.94.94,0,0,1-.29-.2l-40.81-41a1,1,0,0,1-.24-.4,1.35,1.35,0,0,1-.06-.52,4.26,4.26,0,0,1,.33-1.37,12.78,12.78,0,0,1,1.56-2.71,25.41,25.41,0,0,1,5-5Z");
    			attr_dev(path12, "transform", "translate(-196.67 -220.61)");
    			set_style(path12, "fill", "#fbd233");
    			set_style(path12, "stroke", "#fdd338");
    			set_style(path12, "stroke-miterlimit", "10");
    			set_style(path12, "stroke-width", "0.47899064833815px");
    			add_location(path12, file, 89, 4, 13692);
    			attr_dev(path13, "d", "M212.63,297.9l37.49-32.56a1.34,1.34,0,0,1,1.88,0l9.59,11.05a1.25,1.25,0,0,1,.21,1.23c0,.1-3.72,10.71-3.16,19.94.43,7.3,6.33,12.66,13.79,19.44,1.83,1.66,3.71,3.38,5.67,5.26,10.62,10.16,8.34,20.83,8.24,21.28a1.5,1.5,0,0,1-1.33,1.15c-.46,0-11.34.8-19.92-11.14-1.58-2.2-3-4.31-4.4-6.35-5.67-8.34-10.15-14.93-17.32-16.39-9.07-1.84-20.08.32-20.19.34a1.24,1.24,0,0,1-1.19-.38l-9.59-11.05A1.33,1.33,0,0,1,212.63,297.9Zm38.09-29.74-35.39,30.73,8.32,9.58c2.71-.47,12.21-1.89,20.51-.2,8.12,1.65,12.83,8.58,18.79,17.35,1.38,2,2.81,4.13,4.38,6.31,6.26,8.72,13.71,10,16.56,10.17.24-2.84,0-10.4-7.75-17.83-1.93-1.85-3.81-3.56-5.63-5.21-7.85-7.14-14.05-12.77-14.54-21.05-.51-8.45,2.22-17.65,3.07-20.27Z");
    			attr_dev(path13, "transform", "translate(-196.67 -220.61)");
    			set_style(path13, "fill", "#ffd400");
    			add_location(path13, file, 91, 6, 16204);
    			attr_dev(path14, "d", "M274.19,330.93a3.48,3.48,0,1,1-.63,5.13A3.67,3.67,0,0,1,274.19,330.93Zm2.89,3.33a1,1,0,1,0-1.41,0A1,1,0,0,0,277.08,334.26Z");
    			attr_dev(path14, "transform", "translate(-196.67 -220.61)");
    			set_style(path14, "fill", "#ffd400");
    			add_location(path14, file, 92, 6, 16971);
    			attr_dev(path15, "d", "M197.18,280.1l37.49-32.55a1.33,1.33,0,0,1,1.88,0c7.09,8.17,14.61,18.48,14.69,18.58L249,267.84c-.07-.1-7-9.55-13.75-17.47l-35.38,30.72c7,8,15.29,16,15.38,16.06l-2,2c-.09-.09-9.12-8.83-16.34-17.15A1.34,1.34,0,0,1,197.18,280.1Z");
    			attr_dev(path15, "transform", "translate(-196.67 -220.61)");
    			set_style(path15, "fill", "#ffd400");
    			add_location(path15, file, 93, 6, 17174);
    			attr_dev(rect3, "x", "215.13");
    			attr_dev(rect3, "y", "290.25");
    			attr_dev(rect3, "width", "49.65");
    			attr_dev(rect3, "height", "2.52");
    			attr_dev(rect3, "transform", "translate(-329.02 8.11) rotate(-40.97)");
    			set_style(rect3, "fill", "#ffd400");
    			add_location(rect3, file, 94, 6, 17479);
    			add_location(g3, file, 90, 4, 16193);
    			attr_dev(svg3, "id", "e5378e40-b45c-4af2-ab39-e52fd890ec1b");
    			attr_dev(svg3, "data-name", "Warstwa 1");
    			attr_dev(svg3, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg3, "viewBox", "0 0 173.6 124.14");
    			attr_dev(svg3, "class", "svelte-snollg");
    			add_location(svg3, file, 88, 3, 13555);
    			attr_dev(p3, "class", "svelte-snollg");
    			add_location(p3, file, 97, 3, 17637);
    			attr_dev(div3, "class", "svelte-snollg");
    			add_location(div3, file, 87, 2, 13545);
    			attr_dev(path16, "d", "M310.08,232.57a4.94,4.94,0,0,0-.26,2,2.85,2.85,0,0,0,.24.91,2.49,2.49,0,0,0,.53.79l40.81,41a2.54,2.54,0,0,0,1.09.65,3.34,3.34,0,0,0,1.09.15,6.55,6.55,0,0,0,2-.46,14.35,14.35,0,0,0,3.16-1.79l.54-.41,2.76,2.78-10,9.95-35.5-13.84a3.45,3.45,0,0,0-3.64.85l-6.21,6.17-4.34-4.37a3.54,3.54,0,0,0-2.65-1,4.22,4.22,0,0,0-4,4,3.56,3.56,0,0,0,1,2.66l1,1-19.63,19.52a2.68,2.68,0,0,0-.61.93,3.22,3.22,0,0,0-.19.9,4.33,4.33,0,0,0,.24,1.55,9.21,9.21,0,0,0,1.16,2.3,16.18,16.18,0,0,0,1.82,2.18,16.64,16.64,0,0,0,1.88,1.62,8.79,8.79,0,0,0,3,1.51,3.77,3.77,0,0,0,1.53.08,2.48,2.48,0,0,0,.77-.25,2.67,2.67,0,0,0,.68-.49L308,293.9l1,1a3.5,3.5,0,0,0,2.65,1,4.2,4.2,0,0,0,4-4,3.54,3.54,0,0,0-1-2.66l-3.5-3.52,4.58-4.54,35.49,13.83a3.46,3.46,0,0,0,3.65-.85l14.07-14a3.54,3.54,0,0,0,1.06-2.37,3,3,0,0,0-.87-2.3l-5-5a1.25,1.25,0,0,1,.09-.12,14.35,14.35,0,0,0,2.32-4.11,5.12,5.12,0,0,0,.25-1.95,2.84,2.84,0,0,0-.23-.91,2.57,2.57,0,0,0-.54-.8l-40.81-41a2.72,2.72,0,0,0-1.08-.65,3.36,3.36,0,0,0-1.1-.14,6.07,6.07,0,0,0-2,.46,14.81,14.81,0,0,0-3.16,1.79,25.68,25.68,0,0,0-3.12,2.67,26,26,0,0,0-2.38,2.69A14.18,14.18,0,0,0,310.08,232.57Zm-22.93,79.6a.64.64,0,0,1-.22.14,1.22,1.22,0,0,1-.32.06,2.41,2.41,0,0,1-.91-.15,7.49,7.49,0,0,1-1.86-1,13.86,13.86,0,0,1-1.94-1.63,14.21,14.21,0,0,1-1.45-1.7,7.14,7.14,0,0,1-1.22-2.4,1.87,1.87,0,0,1-.05-.79.81.81,0,0,1,.07-.22.91.91,0,0,1,.11-.16L299,284.82l7.79,7.83Zm26.17-21.51a1.86,1.86,0,0,1,.52,1.38,2.15,2.15,0,0,1-.65,1.44,2.12,2.12,0,0,1-1.42.63,1.85,1.85,0,0,1-1.38-.53L298.08,281.2a1.84,1.84,0,0,1-.52-1.38,2.09,2.09,0,0,1,.64-1.42,2.14,2.14,0,0,1,1.44-.64,1.79,1.79,0,0,1,1.37.53Zm54.48-13.73a1.35,1.35,0,0,1,.39,1,1.6,1.6,0,0,1-.48,1.05l-14.07,14a1.52,1.52,0,0,1-1.62.38l-36-14.05a.94.94,0,0,0-1,.24l-5,5-2-2,6.2-6.17a1.53,1.53,0,0,1,1.62-.38l36.05,14.05a1,1,0,0,0,1-.24L364,278.75a1,1,0,0,0,.3-.65.89.89,0,0,0-.24-.65l-3.26-3.27c.38-.34.75-.68,1.11-1s.71-.73,1.05-1.1Zm-49.29-52.09a12.23,12.23,0,0,1,3.5-2,3.06,3.06,0,0,1,1.21-.17,1.12,1.12,0,0,1,.39.1.77.77,0,0,1,.29.19l40.81,41a1,1,0,0,1,.24.41,2,2,0,0,1,.06.53,4.32,4.32,0,0,1-.33,1.37,13.07,13.07,0,0,1-1.57,2.7,23.17,23.17,0,0,1-2.47,2.86,24.9,24.9,0,0,1-2.49,2.18,12.13,12.13,0,0,1-3.51,2,3,3,0,0,1-1.2.17,1.23,1.23,0,0,1-.39-.1.94.94,0,0,1-.29-.2l-40.81-41a1,1,0,0,1-.24-.4,1.35,1.35,0,0,1-.06-.52,4.26,4.26,0,0,1,.33-1.37,12.78,12.78,0,0,1,1.56-2.71,25.41,25.41,0,0,1,5-5Z");
    			attr_dev(path16, "transform", "translate(-196.67 -220.61)");
    			set_style(path16, "fill", "#fbd233");
    			set_style(path16, "stroke", "#fdd338");
    			set_style(path16, "stroke-miterlimit", "10");
    			set_style(path16, "stroke-width", "0.47899064833815px");
    			add_location(path16, file, 101, 4, 17847);
    			attr_dev(path17, "d", "M212.63,297.9l37.49-32.56a1.34,1.34,0,0,1,1.88,0l9.59,11.05a1.25,1.25,0,0,1,.21,1.23c0,.1-3.72,10.71-3.16,19.94.43,7.3,6.33,12.66,13.79,19.44,1.83,1.66,3.71,3.38,5.67,5.26,10.62,10.16,8.34,20.83,8.24,21.28a1.5,1.5,0,0,1-1.33,1.15c-.46,0-11.34.8-19.92-11.14-1.58-2.2-3-4.31-4.4-6.35-5.67-8.34-10.15-14.93-17.32-16.39-9.07-1.84-20.08.32-20.19.34a1.24,1.24,0,0,1-1.19-.38l-9.59-11.05A1.33,1.33,0,0,1,212.63,297.9Zm38.09-29.74-35.39,30.73,8.32,9.58c2.71-.47,12.21-1.89,20.51-.2,8.12,1.65,12.83,8.58,18.79,17.35,1.38,2,2.81,4.13,4.38,6.31,6.26,8.72,13.71,10,16.56,10.17.24-2.84,0-10.4-7.75-17.83-1.93-1.85-3.81-3.56-5.63-5.21-7.85-7.14-14.05-12.77-14.54-21.05-.51-8.45,2.22-17.65,3.07-20.27Z");
    			attr_dev(path17, "transform", "translate(-196.67 -220.61)");
    			set_style(path17, "fill", "#ffd400");
    			add_location(path17, file, 103, 6, 20359);
    			attr_dev(path18, "d", "M274.19,330.93a3.48,3.48,0,1,1-.63,5.13A3.67,3.67,0,0,1,274.19,330.93Zm2.89,3.33a1,1,0,1,0-1.41,0A1,1,0,0,0,277.08,334.26Z");
    			attr_dev(path18, "transform", "translate(-196.67 -220.61)");
    			set_style(path18, "fill", "#ffd400");
    			add_location(path18, file, 104, 6, 21126);
    			attr_dev(path19, "d", "M197.18,280.1l37.49-32.55a1.33,1.33,0,0,1,1.88,0c7.09,8.17,14.61,18.48,14.69,18.58L249,267.84c-.07-.1-7-9.55-13.75-17.47l-35.38,30.72c7,8,15.29,16,15.38,16.06l-2,2c-.09-.09-9.12-8.83-16.34-17.15A1.34,1.34,0,0,1,197.18,280.1Z");
    			attr_dev(path19, "transform", "translate(-196.67 -220.61)");
    			set_style(path19, "fill", "#ffd400");
    			add_location(path19, file, 105, 6, 21329);
    			attr_dev(rect4, "x", "215.13");
    			attr_dev(rect4, "y", "290.25");
    			attr_dev(rect4, "width", "49.65");
    			attr_dev(rect4, "height", "2.52");
    			attr_dev(rect4, "transform", "translate(-329.02 8.11) rotate(-40.97)");
    			set_style(rect4, "fill", "#ffd400");
    			add_location(rect4, file, 106, 6, 21634);
    			add_location(g4, file, 102, 4, 20348);
    			attr_dev(svg4, "id", "e5378e40-b45c-4af2-ab39-e52fd890ec1b");
    			attr_dev(svg4, "data-name", "Warstwa 1");
    			attr_dev(svg4, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg4, "viewBox", "0 0 173.6 124.14");
    			attr_dev(svg4, "class", "svelte-snollg");
    			add_location(svg4, file, 100, 3, 17710);
    			attr_dev(p4, "class", "svelte-snollg");
    			add_location(p4, file, 109, 3, 21792);
    			attr_dev(div4, "class", "svelte-snollg");
    			add_location(div4, file, 99, 2, 17700);
    			attr_dev(div5, "class", "container svelte-snollg");
    			add_location(div5, file, 50, 1, 1053);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div0, svg0);
    			append_dev(svg0, path0);
    			append_dev(svg0, g0);
    			append_dev(g0, path1);
    			append_dev(g0, path2);
    			append_dev(g0, path3);
    			append_dev(g0, rect0);
    			append_dev(div0, t2);
    			append_dev(div0, p0);
    			append_dev(div5, t4);
    			append_dev(div5, div1);
    			append_dev(div1, svg1);
    			append_dev(svg1, path4);
    			append_dev(svg1, g1);
    			append_dev(g1, path5);
    			append_dev(g1, path6);
    			append_dev(g1, path7);
    			append_dev(g1, rect1);
    			append_dev(div1, t5);
    			append_dev(div1, p1);
    			append_dev(div5, t7);
    			append_dev(div5, div2);
    			append_dev(div2, svg2);
    			append_dev(svg2, path8);
    			append_dev(svg2, g2);
    			append_dev(g2, path9);
    			append_dev(g2, path10);
    			append_dev(g2, path11);
    			append_dev(g2, rect2);
    			append_dev(div2, t8);
    			append_dev(div2, p2);
    			append_dev(div5, t10);
    			append_dev(div5, div3);
    			append_dev(div3, svg3);
    			append_dev(svg3, path12);
    			append_dev(svg3, g3);
    			append_dev(g3, path13);
    			append_dev(g3, path14);
    			append_dev(g3, path15);
    			append_dev(g3, rect3);
    			append_dev(div3, t11);
    			append_dev(div3, p3);
    			append_dev(div5, t13);
    			append_dev(div5, div4);
    			append_dev(div4, svg4);
    			append_dev(svg4, path16);
    			append_dev(svg4, g4);
    			append_dev(g4, path17);
    			append_dev(g4, path18);
    			append_dev(g4, path19);
    			append_dev(g4, rect4);
    			append_dev(div4, t14);
    			append_dev(div4, p4);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(49:0) <SegmentedElement bg=\\\"./media/plumbing.jpg\\\">",
    		ctx
    	});

    	return block;
    }

    // (114:0) <TextContainer>
    function create_default_slot_1(ctx) {
    	let h4;
    	let t1;
    	let p0;
    	let t3;
    	let p1;
    	let t5;
    	let p2;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			h4.textContent = "Działalność";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Zajmuję się remontami oraz aranżacją wnętrz mieszkalnych \r\n\t\ti użytkowych w rozsądnej cenie. Staram się zapewnić wykonanie\r\n\t\tusługi na najwyższym poziomie z dbałością o szczegóły.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "Zakres prac obejmuje usługi hydrauliczne, usługi elektryczne, wykańczanie wnętrz,\r\n\t\ta także konserwację i utrzymanie w należytym stanie instalacji i obiektów.";
    			t5 = space();
    			p2 = element("p");
    			p2.textContent = "W swojej pracy wsłuchuję się w potrzeby klientów po czym podejmuję \r\n\t\tniezbędne kroki, tak aby spełnić oczekiwanie i fachowo wykonując\r\n\t\tpowierzone zadanie.";
    			add_location(h4, file, 114, 1, 21901);
    			add_location(p0, file, 115, 1, 21924);
    			add_location(p1, file, 118, 1, 22114);
    			add_location(p2, file, 120, 1, 22284);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p2, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(p2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(114:0) <TextContainer>",
    		ctx
    	});

    	return block;
    }

    // (125:0) <SegmentedElement bg="./media/parts.jpg">
    function create_default_slot(ctx) {
    	let div3;
    	let div0;
    	let svg0;
    	let path0;
    	let g0;
    	let path1;
    	let path2;
    	let path3;
    	let rect0;
    	let t0;
    	let p0;
    	let t2;
    	let div1;
    	let svg1;
    	let path4;
    	let g1;
    	let path5;
    	let path6;
    	let path7;
    	let rect1;
    	let t3;
    	let p1;
    	let t5;
    	let div2;
    	let svg2;
    	let path8;
    	let g2;
    	let path9;
    	let path10;
    	let path11;
    	let rect2;
    	let t6;
    	let p2;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			g0 = svg_element("g");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			rect0 = svg_element("rect");
    			t0 = space();
    			p0 = element("p");
    			p0.textContent = "Serwis, utrzymanie, remonty nieruchomosci";
    			t2 = space();
    			div1 = element("div");
    			svg1 = svg_element("svg");
    			path4 = svg_element("path");
    			g1 = svg_element("g");
    			path5 = svg_element("path");
    			path6 = svg_element("path");
    			path7 = svg_element("path");
    			rect1 = svg_element("rect");
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "Serwis, utrzymanie, remonty nieruchomosci";
    			t5 = space();
    			div2 = element("div");
    			svg2 = svg_element("svg");
    			path8 = svg_element("path");
    			g2 = svg_element("g");
    			path9 = svg_element("path");
    			path10 = svg_element("path");
    			path11 = svg_element("path");
    			rect2 = svg_element("rect");
    			t6 = space();
    			p2 = element("p");
    			p2.textContent = "Serwis, utrzymanie, remonty nieruchomosci";
    			attr_dev(path0, "d", "M310.08,232.57a4.94,4.94,0,0,0-.26,2,2.85,2.85,0,0,0,.24.91,2.49,2.49,0,0,0,.53.79l40.81,41a2.54,2.54,0,0,0,1.09.65,3.34,3.34,0,0,0,1.09.15,6.55,6.55,0,0,0,2-.46,14.35,14.35,0,0,0,3.16-1.79l.54-.41,2.76,2.78-10,9.95-35.5-13.84a3.45,3.45,0,0,0-3.64.85l-6.21,6.17-4.34-4.37a3.54,3.54,0,0,0-2.65-1,4.22,4.22,0,0,0-4,4,3.56,3.56,0,0,0,1,2.66l1,1-19.63,19.52a2.68,2.68,0,0,0-.61.93,3.22,3.22,0,0,0-.19.9,4.33,4.33,0,0,0,.24,1.55,9.21,9.21,0,0,0,1.16,2.3,16.18,16.18,0,0,0,1.82,2.18,16.64,16.64,0,0,0,1.88,1.62,8.79,8.79,0,0,0,3,1.51,3.77,3.77,0,0,0,1.53.08,2.48,2.48,0,0,0,.77-.25,2.67,2.67,0,0,0,.68-.49L308,293.9l1,1a3.5,3.5,0,0,0,2.65,1,4.2,4.2,0,0,0,4-4,3.54,3.54,0,0,0-1-2.66l-3.5-3.52,4.58-4.54,35.49,13.83a3.46,3.46,0,0,0,3.65-.85l14.07-14a3.54,3.54,0,0,0,1.06-2.37,3,3,0,0,0-.87-2.3l-5-5a1.25,1.25,0,0,1,.09-.12,14.35,14.35,0,0,0,2.32-4.11,5.12,5.12,0,0,0,.25-1.95,2.84,2.84,0,0,0-.23-.91,2.57,2.57,0,0,0-.54-.8l-40.81-41a2.72,2.72,0,0,0-1.08-.65,3.36,3.36,0,0,0-1.1-.14,6.07,6.07,0,0,0-2,.46,14.81,14.81,0,0,0-3.16,1.79,25.68,25.68,0,0,0-3.12,2.67,26,26,0,0,0-2.38,2.69A14.18,14.18,0,0,0,310.08,232.57Zm-22.93,79.6a.64.64,0,0,1-.22.14,1.22,1.22,0,0,1-.32.06,2.41,2.41,0,0,1-.91-.15,7.49,7.49,0,0,1-1.86-1,13.86,13.86,0,0,1-1.94-1.63,14.21,14.21,0,0,1-1.45-1.7,7.14,7.14,0,0,1-1.22-2.4,1.87,1.87,0,0,1-.05-.79.81.81,0,0,1,.07-.22.91.91,0,0,1,.11-.16L299,284.82l7.79,7.83Zm26.17-21.51a1.86,1.86,0,0,1,.52,1.38,2.15,2.15,0,0,1-.65,1.44,2.12,2.12,0,0,1-1.42.63,1.85,1.85,0,0,1-1.38-.53L298.08,281.2a1.84,1.84,0,0,1-.52-1.38,2.09,2.09,0,0,1,.64-1.42,2.14,2.14,0,0,1,1.44-.64,1.79,1.79,0,0,1,1.37.53Zm54.48-13.73a1.35,1.35,0,0,1,.39,1,1.6,1.6,0,0,1-.48,1.05l-14.07,14a1.52,1.52,0,0,1-1.62.38l-36-14.05a.94.94,0,0,0-1,.24l-5,5-2-2,6.2-6.17a1.53,1.53,0,0,1,1.62-.38l36.05,14.05a1,1,0,0,0,1-.24L364,278.75a1,1,0,0,0,.3-.65.89.89,0,0,0-.24-.65l-3.26-3.27c.38-.34.75-.68,1.11-1s.71-.73,1.05-1.1Zm-49.29-52.09a12.23,12.23,0,0,1,3.5-2,3.06,3.06,0,0,1,1.21-.17,1.12,1.12,0,0,1,.39.1.77.77,0,0,1,.29.19l40.81,41a1,1,0,0,1,.24.41,2,2,0,0,1,.06.53,4.32,4.32,0,0,1-.33,1.37,13.07,13.07,0,0,1-1.57,2.7,23.17,23.17,0,0,1-2.47,2.86,24.9,24.9,0,0,1-2.49,2.18,12.13,12.13,0,0,1-3.51,2,3,3,0,0,1-1.2.17,1.23,1.23,0,0,1-.39-.1.94.94,0,0,1-.29-.2l-40.81-41a1,1,0,0,1-.24-.4,1.35,1.35,0,0,1-.06-.52,4.26,4.26,0,0,1,.33-1.37,12.78,12.78,0,0,1,1.56-2.71,25.41,25.41,0,0,1,5-5Z");
    			attr_dev(path0, "transform", "translate(-196.67 -220.61)");
    			set_style(path0, "fill", "#fbd233");
    			set_style(path0, "stroke", "#fdd338");
    			set_style(path0, "stroke-miterlimit", "10");
    			set_style(path0, "stroke-width", "0.47899064833815px");
    			add_location(path0, file, 128, 4, 22688);
    			attr_dev(path1, "d", "M212.63,297.9l37.49-32.56a1.34,1.34,0,0,1,1.88,0l9.59,11.05a1.25,1.25,0,0,1,.21,1.23c0,.1-3.72,10.71-3.16,19.94.43,7.3,6.33,12.66,13.79,19.44,1.83,1.66,3.71,3.38,5.67,5.26,10.62,10.16,8.34,20.83,8.24,21.28a1.5,1.5,0,0,1-1.33,1.15c-.46,0-11.34.8-19.92-11.14-1.58-2.2-3-4.31-4.4-6.35-5.67-8.34-10.15-14.93-17.32-16.39-9.07-1.84-20.08.32-20.19.34a1.24,1.24,0,0,1-1.19-.38l-9.59-11.05A1.33,1.33,0,0,1,212.63,297.9Zm38.09-29.74-35.39,30.73,8.32,9.58c2.71-.47,12.21-1.89,20.51-.2,8.12,1.65,12.83,8.58,18.79,17.35,1.38,2,2.81,4.13,4.38,6.31,6.26,8.72,13.71,10,16.56,10.17.24-2.84,0-10.4-7.75-17.83-1.93-1.85-3.81-3.56-5.63-5.21-7.85-7.14-14.05-12.77-14.54-21.05-.51-8.45,2.22-17.65,3.07-20.27Z");
    			attr_dev(path1, "transform", "translate(-196.67 -220.61)");
    			set_style(path1, "fill", "#ffd400");
    			add_location(path1, file, 130, 6, 25200);
    			attr_dev(path2, "d", "M274.19,330.93a3.48,3.48,0,1,1-.63,5.13A3.67,3.67,0,0,1,274.19,330.93Zm2.89,3.33a1,1,0,1,0-1.41,0A1,1,0,0,0,277.08,334.26Z");
    			attr_dev(path2, "transform", "translate(-196.67 -220.61)");
    			set_style(path2, "fill", "#ffd400");
    			add_location(path2, file, 131, 6, 25967);
    			attr_dev(path3, "d", "M197.18,280.1l37.49-32.55a1.33,1.33,0,0,1,1.88,0c7.09,8.17,14.61,18.48,14.69,18.58L249,267.84c-.07-.1-7-9.55-13.75-17.47l-35.38,30.72c7,8,15.29,16,15.38,16.06l-2,2c-.09-.09-9.12-8.83-16.34-17.15A1.34,1.34,0,0,1,197.18,280.1Z");
    			attr_dev(path3, "transform", "translate(-196.67 -220.61)");
    			set_style(path3, "fill", "#ffd400");
    			add_location(path3, file, 132, 6, 26170);
    			attr_dev(rect0, "x", "215.13");
    			attr_dev(rect0, "y", "290.25");
    			attr_dev(rect0, "width", "49.65");
    			attr_dev(rect0, "height", "2.52");
    			attr_dev(rect0, "transform", "translate(-329.02 8.11) rotate(-40.97)");
    			set_style(rect0, "fill", "#ffd400");
    			add_location(rect0, file, 133, 6, 26475);
    			add_location(g0, file, 129, 4, 25189);
    			attr_dev(svg0, "id", "e5378e40-b45c-4af2-ab39-e52fd890ec1b");
    			attr_dev(svg0, "data-name", "Warstwa 1");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "viewBox", "0 0 173.6 124.14");
    			attr_dev(svg0, "class", "svelte-snollg");
    			add_location(svg0, file, 127, 3, 22551);
    			attr_dev(p0, "class", "svelte-snollg");
    			add_location(p0, file, 136, 3, 26633);
    			attr_dev(div0, "class", "svelte-snollg");
    			add_location(div0, file, 126, 2, 22541);
    			attr_dev(path4, "d", "M310.08,232.57a4.94,4.94,0,0,0-.26,2,2.85,2.85,0,0,0,.24.91,2.49,2.49,0,0,0,.53.79l40.81,41a2.54,2.54,0,0,0,1.09.65,3.34,3.34,0,0,0,1.09.15,6.55,6.55,0,0,0,2-.46,14.35,14.35,0,0,0,3.16-1.79l.54-.41,2.76,2.78-10,9.95-35.5-13.84a3.45,3.45,0,0,0-3.64.85l-6.21,6.17-4.34-4.37a3.54,3.54,0,0,0-2.65-1,4.22,4.22,0,0,0-4,4,3.56,3.56,0,0,0,1,2.66l1,1-19.63,19.52a2.68,2.68,0,0,0-.61.93,3.22,3.22,0,0,0-.19.9,4.33,4.33,0,0,0,.24,1.55,9.21,9.21,0,0,0,1.16,2.3,16.18,16.18,0,0,0,1.82,2.18,16.64,16.64,0,0,0,1.88,1.62,8.79,8.79,0,0,0,3,1.51,3.77,3.77,0,0,0,1.53.08,2.48,2.48,0,0,0,.77-.25,2.67,2.67,0,0,0,.68-.49L308,293.9l1,1a3.5,3.5,0,0,0,2.65,1,4.2,4.2,0,0,0,4-4,3.54,3.54,0,0,0-1-2.66l-3.5-3.52,4.58-4.54,35.49,13.83a3.46,3.46,0,0,0,3.65-.85l14.07-14a3.54,3.54,0,0,0,1.06-2.37,3,3,0,0,0-.87-2.3l-5-5a1.25,1.25,0,0,1,.09-.12,14.35,14.35,0,0,0,2.32-4.11,5.12,5.12,0,0,0,.25-1.95,2.84,2.84,0,0,0-.23-.91,2.57,2.57,0,0,0-.54-.8l-40.81-41a2.72,2.72,0,0,0-1.08-.65,3.36,3.36,0,0,0-1.1-.14,6.07,6.07,0,0,0-2,.46,14.81,14.81,0,0,0-3.16,1.79,25.68,25.68,0,0,0-3.12,2.67,26,26,0,0,0-2.38,2.69A14.18,14.18,0,0,0,310.08,232.57Zm-22.93,79.6a.64.64,0,0,1-.22.14,1.22,1.22,0,0,1-.32.06,2.41,2.41,0,0,1-.91-.15,7.49,7.49,0,0,1-1.86-1,13.86,13.86,0,0,1-1.94-1.63,14.21,14.21,0,0,1-1.45-1.7,7.14,7.14,0,0,1-1.22-2.4,1.87,1.87,0,0,1-.05-.79.81.81,0,0,1,.07-.22.91.91,0,0,1,.11-.16L299,284.82l7.79,7.83Zm26.17-21.51a1.86,1.86,0,0,1,.52,1.38,2.15,2.15,0,0,1-.65,1.44,2.12,2.12,0,0,1-1.42.63,1.85,1.85,0,0,1-1.38-.53L298.08,281.2a1.84,1.84,0,0,1-.52-1.38,2.09,2.09,0,0,1,.64-1.42,2.14,2.14,0,0,1,1.44-.64,1.79,1.79,0,0,1,1.37.53Zm54.48-13.73a1.35,1.35,0,0,1,.39,1,1.6,1.6,0,0,1-.48,1.05l-14.07,14a1.52,1.52,0,0,1-1.62.38l-36-14.05a.94.94,0,0,0-1,.24l-5,5-2-2,6.2-6.17a1.53,1.53,0,0,1,1.62-.38l36.05,14.05a1,1,0,0,0,1-.24L364,278.75a1,1,0,0,0,.3-.65.89.89,0,0,0-.24-.65l-3.26-3.27c.38-.34.75-.68,1.11-1s.71-.73,1.05-1.1Zm-49.29-52.09a12.23,12.23,0,0,1,3.5-2,3.06,3.06,0,0,1,1.21-.17,1.12,1.12,0,0,1,.39.1.77.77,0,0,1,.29.19l40.81,41a1,1,0,0,1,.24.41,2,2,0,0,1,.06.53,4.32,4.32,0,0,1-.33,1.37,13.07,13.07,0,0,1-1.57,2.7,23.17,23.17,0,0,1-2.47,2.86,24.9,24.9,0,0,1-2.49,2.18,12.13,12.13,0,0,1-3.51,2,3,3,0,0,1-1.2.17,1.23,1.23,0,0,1-.39-.1.94.94,0,0,1-.29-.2l-40.81-41a1,1,0,0,1-.24-.4,1.35,1.35,0,0,1-.06-.52,4.26,4.26,0,0,1,.33-1.37,12.78,12.78,0,0,1,1.56-2.71,25.41,25.41,0,0,1,5-5Z");
    			attr_dev(path4, "transform", "translate(-196.67 -220.61)");
    			set_style(path4, "fill", "#fbd233");
    			set_style(path4, "stroke", "#fdd338");
    			set_style(path4, "stroke-miterlimit", "10");
    			set_style(path4, "stroke-width", "0.47899064833815px");
    			add_location(path4, file, 140, 4, 26843);
    			attr_dev(path5, "d", "M212.63,297.9l37.49-32.56a1.34,1.34,0,0,1,1.88,0l9.59,11.05a1.25,1.25,0,0,1,.21,1.23c0,.1-3.72,10.71-3.16,19.94.43,7.3,6.33,12.66,13.79,19.44,1.83,1.66,3.71,3.38,5.67,5.26,10.62,10.16,8.34,20.83,8.24,21.28a1.5,1.5,0,0,1-1.33,1.15c-.46,0-11.34.8-19.92-11.14-1.58-2.2-3-4.31-4.4-6.35-5.67-8.34-10.15-14.93-17.32-16.39-9.07-1.84-20.08.32-20.19.34a1.24,1.24,0,0,1-1.19-.38l-9.59-11.05A1.33,1.33,0,0,1,212.63,297.9Zm38.09-29.74-35.39,30.73,8.32,9.58c2.71-.47,12.21-1.89,20.51-.2,8.12,1.65,12.83,8.58,18.79,17.35,1.38,2,2.81,4.13,4.38,6.31,6.26,8.72,13.71,10,16.56,10.17.24-2.84,0-10.4-7.75-17.83-1.93-1.85-3.81-3.56-5.63-5.21-7.85-7.14-14.05-12.77-14.54-21.05-.51-8.45,2.22-17.65,3.07-20.27Z");
    			attr_dev(path5, "transform", "translate(-196.67 -220.61)");
    			set_style(path5, "fill", "#ffd400");
    			add_location(path5, file, 142, 6, 29355);
    			attr_dev(path6, "d", "M274.19,330.93a3.48,3.48,0,1,1-.63,5.13A3.67,3.67,0,0,1,274.19,330.93Zm2.89,3.33a1,1,0,1,0-1.41,0A1,1,0,0,0,277.08,334.26Z");
    			attr_dev(path6, "transform", "translate(-196.67 -220.61)");
    			set_style(path6, "fill", "#ffd400");
    			add_location(path6, file, 143, 6, 30122);
    			attr_dev(path7, "d", "M197.18,280.1l37.49-32.55a1.33,1.33,0,0,1,1.88,0c7.09,8.17,14.61,18.48,14.69,18.58L249,267.84c-.07-.1-7-9.55-13.75-17.47l-35.38,30.72c7,8,15.29,16,15.38,16.06l-2,2c-.09-.09-9.12-8.83-16.34-17.15A1.34,1.34,0,0,1,197.18,280.1Z");
    			attr_dev(path7, "transform", "translate(-196.67 -220.61)");
    			set_style(path7, "fill", "#ffd400");
    			add_location(path7, file, 144, 6, 30325);
    			attr_dev(rect1, "x", "215.13");
    			attr_dev(rect1, "y", "290.25");
    			attr_dev(rect1, "width", "49.65");
    			attr_dev(rect1, "height", "2.52");
    			attr_dev(rect1, "transform", "translate(-329.02 8.11) rotate(-40.97)");
    			set_style(rect1, "fill", "#ffd400");
    			add_location(rect1, file, 145, 6, 30630);
    			add_location(g1, file, 141, 4, 29344);
    			attr_dev(svg1, "id", "e5378e40-b45c-4af2-ab39-e52fd890ec1b");
    			attr_dev(svg1, "data-name", "Warstwa 1");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "viewBox", "0 0 173.6 124.14");
    			attr_dev(svg1, "class", "svelte-snollg");
    			add_location(svg1, file, 139, 3, 26706);
    			attr_dev(p1, "class", "svelte-snollg");
    			add_location(p1, file, 148, 3, 30788);
    			attr_dev(div1, "class", "svelte-snollg");
    			add_location(div1, file, 138, 2, 26696);
    			attr_dev(path8, "d", "M310.08,232.57a4.94,4.94,0,0,0-.26,2,2.85,2.85,0,0,0,.24.91,2.49,2.49,0,0,0,.53.79l40.81,41a2.54,2.54,0,0,0,1.09.65,3.34,3.34,0,0,0,1.09.15,6.55,6.55,0,0,0,2-.46,14.35,14.35,0,0,0,3.16-1.79l.54-.41,2.76,2.78-10,9.95-35.5-13.84a3.45,3.45,0,0,0-3.64.85l-6.21,6.17-4.34-4.37a3.54,3.54,0,0,0-2.65-1,4.22,4.22,0,0,0-4,4,3.56,3.56,0,0,0,1,2.66l1,1-19.63,19.52a2.68,2.68,0,0,0-.61.93,3.22,3.22,0,0,0-.19.9,4.33,4.33,0,0,0,.24,1.55,9.21,9.21,0,0,0,1.16,2.3,16.18,16.18,0,0,0,1.82,2.18,16.64,16.64,0,0,0,1.88,1.62,8.79,8.79,0,0,0,3,1.51,3.77,3.77,0,0,0,1.53.08,2.48,2.48,0,0,0,.77-.25,2.67,2.67,0,0,0,.68-.49L308,293.9l1,1a3.5,3.5,0,0,0,2.65,1,4.2,4.2,0,0,0,4-4,3.54,3.54,0,0,0-1-2.66l-3.5-3.52,4.58-4.54,35.49,13.83a3.46,3.46,0,0,0,3.65-.85l14.07-14a3.54,3.54,0,0,0,1.06-2.37,3,3,0,0,0-.87-2.3l-5-5a1.25,1.25,0,0,1,.09-.12,14.35,14.35,0,0,0,2.32-4.11,5.12,5.12,0,0,0,.25-1.95,2.84,2.84,0,0,0-.23-.91,2.57,2.57,0,0,0-.54-.8l-40.81-41a2.72,2.72,0,0,0-1.08-.65,3.36,3.36,0,0,0-1.1-.14,6.07,6.07,0,0,0-2,.46,14.81,14.81,0,0,0-3.16,1.79,25.68,25.68,0,0,0-3.12,2.67,26,26,0,0,0-2.38,2.69A14.18,14.18,0,0,0,310.08,232.57Zm-22.93,79.6a.64.64,0,0,1-.22.14,1.22,1.22,0,0,1-.32.06,2.41,2.41,0,0,1-.91-.15,7.49,7.49,0,0,1-1.86-1,13.86,13.86,0,0,1-1.94-1.63,14.21,14.21,0,0,1-1.45-1.7,7.14,7.14,0,0,1-1.22-2.4,1.87,1.87,0,0,1-.05-.79.81.81,0,0,1,.07-.22.91.91,0,0,1,.11-.16L299,284.82l7.79,7.83Zm26.17-21.51a1.86,1.86,0,0,1,.52,1.38,2.15,2.15,0,0,1-.65,1.44,2.12,2.12,0,0,1-1.42.63,1.85,1.85,0,0,1-1.38-.53L298.08,281.2a1.84,1.84,0,0,1-.52-1.38,2.09,2.09,0,0,1,.64-1.42,2.14,2.14,0,0,1,1.44-.64,1.79,1.79,0,0,1,1.37.53Zm54.48-13.73a1.35,1.35,0,0,1,.39,1,1.6,1.6,0,0,1-.48,1.05l-14.07,14a1.52,1.52,0,0,1-1.62.38l-36-14.05a.94.94,0,0,0-1,.24l-5,5-2-2,6.2-6.17a1.53,1.53,0,0,1,1.62-.38l36.05,14.05a1,1,0,0,0,1-.24L364,278.75a1,1,0,0,0,.3-.65.89.89,0,0,0-.24-.65l-3.26-3.27c.38-.34.75-.68,1.11-1s.71-.73,1.05-1.1Zm-49.29-52.09a12.23,12.23,0,0,1,3.5-2,3.06,3.06,0,0,1,1.21-.17,1.12,1.12,0,0,1,.39.1.77.77,0,0,1,.29.19l40.81,41a1,1,0,0,1,.24.41,2,2,0,0,1,.06.53,4.32,4.32,0,0,1-.33,1.37,13.07,13.07,0,0,1-1.57,2.7,23.17,23.17,0,0,1-2.47,2.86,24.9,24.9,0,0,1-2.49,2.18,12.13,12.13,0,0,1-3.51,2,3,3,0,0,1-1.2.17,1.23,1.23,0,0,1-.39-.1.94.94,0,0,1-.29-.2l-40.81-41a1,1,0,0,1-.24-.4,1.35,1.35,0,0,1-.06-.52,4.26,4.26,0,0,1,.33-1.37,12.78,12.78,0,0,1,1.56-2.71,25.41,25.41,0,0,1,5-5Z");
    			attr_dev(path8, "transform", "translate(-196.67 -220.61)");
    			set_style(path8, "fill", "#fbd233");
    			set_style(path8, "stroke", "#fdd338");
    			set_style(path8, "stroke-miterlimit", "10");
    			set_style(path8, "stroke-width", "0.47899064833815px");
    			add_location(path8, file, 152, 4, 30998);
    			attr_dev(path9, "d", "M212.63,297.9l37.49-32.56a1.34,1.34,0,0,1,1.88,0l9.59,11.05a1.25,1.25,0,0,1,.21,1.23c0,.1-3.72,10.71-3.16,19.94.43,7.3,6.33,12.66,13.79,19.44,1.83,1.66,3.71,3.38,5.67,5.26,10.62,10.16,8.34,20.83,8.24,21.28a1.5,1.5,0,0,1-1.33,1.15c-.46,0-11.34.8-19.92-11.14-1.58-2.2-3-4.31-4.4-6.35-5.67-8.34-10.15-14.93-17.32-16.39-9.07-1.84-20.08.32-20.19.34a1.24,1.24,0,0,1-1.19-.38l-9.59-11.05A1.33,1.33,0,0,1,212.63,297.9Zm38.09-29.74-35.39,30.73,8.32,9.58c2.71-.47,12.21-1.89,20.51-.2,8.12,1.65,12.83,8.58,18.79,17.35,1.38,2,2.81,4.13,4.38,6.31,6.26,8.72,13.71,10,16.56,10.17.24-2.84,0-10.4-7.75-17.83-1.93-1.85-3.81-3.56-5.63-5.21-7.85-7.14-14.05-12.77-14.54-21.05-.51-8.45,2.22-17.65,3.07-20.27Z");
    			attr_dev(path9, "transform", "translate(-196.67 -220.61)");
    			set_style(path9, "fill", "#ffd400");
    			add_location(path9, file, 154, 6, 33510);
    			attr_dev(path10, "d", "M274.19,330.93a3.48,3.48,0,1,1-.63,5.13A3.67,3.67,0,0,1,274.19,330.93Zm2.89,3.33a1,1,0,1,0-1.41,0A1,1,0,0,0,277.08,334.26Z");
    			attr_dev(path10, "transform", "translate(-196.67 -220.61)");
    			set_style(path10, "fill", "#ffd400");
    			add_location(path10, file, 155, 6, 34277);
    			attr_dev(path11, "d", "M197.18,280.1l37.49-32.55a1.33,1.33,0,0,1,1.88,0c7.09,8.17,14.61,18.48,14.69,18.58L249,267.84c-.07-.1-7-9.55-13.75-17.47l-35.38,30.72c7,8,15.29,16,15.38,16.06l-2,2c-.09-.09-9.12-8.83-16.34-17.15A1.34,1.34,0,0,1,197.18,280.1Z");
    			attr_dev(path11, "transform", "translate(-196.67 -220.61)");
    			set_style(path11, "fill", "#ffd400");
    			add_location(path11, file, 156, 6, 34480);
    			attr_dev(rect2, "x", "215.13");
    			attr_dev(rect2, "y", "290.25");
    			attr_dev(rect2, "width", "49.65");
    			attr_dev(rect2, "height", "2.52");
    			attr_dev(rect2, "transform", "translate(-329.02 8.11) rotate(-40.97)");
    			set_style(rect2, "fill", "#ffd400");
    			add_location(rect2, file, 157, 6, 34785);
    			add_location(g2, file, 153, 4, 33499);
    			attr_dev(svg2, "id", "e5378e40-b45c-4af2-ab39-e52fd890ec1b");
    			attr_dev(svg2, "data-name", "Warstwa 1");
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg2, "viewBox", "0 0 173.6 124.14");
    			attr_dev(svg2, "class", "svelte-snollg");
    			add_location(svg2, file, 151, 3, 30861);
    			attr_dev(p2, "class", "svelte-snollg");
    			add_location(p2, file, 160, 3, 34943);
    			attr_dev(div2, "class", "svelte-snollg");
    			add_location(div2, file, 150, 2, 30851);
    			attr_dev(div3, "class", "container svelte-snollg");
    			add_location(div3, file, 125, 1, 22514);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, svg0);
    			append_dev(svg0, path0);
    			append_dev(svg0, g0);
    			append_dev(g0, path1);
    			append_dev(g0, path2);
    			append_dev(g0, path3);
    			append_dev(g0, rect0);
    			append_dev(div0, t0);
    			append_dev(div0, p0);
    			append_dev(div3, t2);
    			append_dev(div3, div1);
    			append_dev(div1, svg1);
    			append_dev(svg1, path4);
    			append_dev(svg1, g1);
    			append_dev(g1, path5);
    			append_dev(g1, path6);
    			append_dev(g1, path7);
    			append_dev(g1, rect1);
    			append_dev(div1, t3);
    			append_dev(div1, p1);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, svg2);
    			append_dev(svg2, path8);
    			append_dev(svg2, g2);
    			append_dev(g2, path9);
    			append_dev(g2, path10);
    			append_dev(g2, path11);
    			append_dev(g2, rect2);
    			append_dev(div2, t6);
    			append_dev(div2, p2);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(125:0) <SegmentedElement bg=\\\"./media/parts.jpg\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let header;
    	let t0;
    	let segmentedelement0;
    	let t1;
    	let textcontainer;
    	let t2;
    	let segmentedelement1;
    	let current;
    	header = new Header({ $$inline: true });

    	segmentedelement0 = new SegmentedElement({
    			props: {
    				bg: "./media/plumbing.jpg",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	textcontainer = new TextContainer({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	segmentedelement1 = new SegmentedElement({
    			props: {
    				bg: "./media/parts.jpg",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(header.$$.fragment);
    			t0 = space();
    			create_component(segmentedelement0.$$.fragment);
    			t1 = space();
    			create_component(textcontainer.$$.fragment);
    			t2 = space();
    			create_component(segmentedelement1.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(segmentedelement0, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(textcontainer, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(segmentedelement1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const segmentedelement0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				segmentedelement0_changes.$$scope = { dirty, ctx };
    			}

    			segmentedelement0.$set(segmentedelement0_changes);
    			const textcontainer_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				textcontainer_changes.$$scope = { dirty, ctx };
    			}

    			textcontainer.$set(textcontainer_changes);
    			const segmentedelement1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				segmentedelement1_changes.$$scope = { dirty, ctx };
    			}

    			segmentedelement1.$set(segmentedelement1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(segmentedelement0.$$.fragment, local);
    			transition_in(textcontainer.$$.fragment, local);
    			transition_in(segmentedelement1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(segmentedelement0.$$.fragment, local);
    			transition_out(textcontainer.$$.fragment, local);
    			transition_out(segmentedelement1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(segmentedelement0, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(textcontainer, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(segmentedelement1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	onMount(() => {
    		const page = new Page();
    		page.init();
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Header,
    		SegmentedElement,
    		TextContainer,
    		onMount,
    		Page
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map

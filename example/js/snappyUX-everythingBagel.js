
const sux = ((_s) => {
    
    // find in array by function, and remove it from the array as you do...
    Array.prototype.rip = function(fn) {
        let found = [];
        for (let i = this.length - 1; i >= 0; i--) {
            if (fn(this[i])) {
                found.push(this[i]);
                this.splice(i, 1);
            }
        }
        return found.reverse();
    };
    
    // find One in array by function, and remove it from the array as you do...
    Array.prototype.ripOne = function(fn) {
        for (let i = this.length - 1; i >= 0; i--) {
            if (fn(this[i])) {
                let tmp = this[i];
                this.splice(i, 1);
                return tmp;
            }
        }
        return null;
    };
    
    // ------------------------------------------------------------------------------
    // COMPONENTS
    
    let compCounter = 1000;
    
    let compMap = new Map(); // maps suxId to component
    let dataMap = new Map(); // maps data to components
    let drawMap = new Map(); // maps draw functions to their components
    
    _s._compMap = compMap;
    _s._dataMap = dataMap;
    _s._drawMap = drawMap;
    
    // for tracking components created during a draw cycle
    _s._createdDuringDraw = [];
    
    /**
     * returns true if arg passed is a DOM element
     */
    _s.isElement = e => (e instanceof Element || e instanceof HTMLDocument);
    
    /**
     * Generates a unique id of text/numbers (base 36) based on an incrementing counter.
     */
    _s.genId = () => (++compCounter).toString(36);
    
    /**
     * Returns the component object for a given suxId
     */
    _s.get = (compId) => compMap.get(compId);
    
    /**
     * Returns the DOM element for a component, caches it against the component object for future speed.
     */
    _s.element = (c) => {
        if (!c) return;
        if (typeof c === 'string') c = compMap.get(c);
        
        if (c.element) return c.element;
        
        return (c.element = document.querySelector('[sux="' + c.suxId + '"]'));
    };
    
    /**
     * Similar to 'element()', returns a JQueryified object of the component's element, caching the result.
     */
    _s.jq = (c) => {
        if (!c) return;
        if (typeof c === 'string') c = compMap.get(c);
        if (c._jq) return c._jq;
        if (window.$) {
            return (c._jq = $(_s.element(c))); // eslint-disable-line no-undef
        }
    };
    
    /**
     * Registers a component with the framework, including referencing its data, draw function, etc.
     */
    _s.register = (c) => {
        if (!c.suxId) c.suxId = _s.genId();
        if (compMap.has(c.suxId)) return;
        
        compMap.set(c.suxId, c);
        drawMap.set(c.draw, c);
        
        // see if it has 'when' functions to register as event listeners...
        _s.when(c);
        
        if (c.data?.length) {
            c.data.forEach(a => {
                if (typeof a === 'object') { // not doing basic types (strings, booleans, ints, etc)
                    if (a instanceof Date) return; // also not doing Dates
                    
                    let comps = dataMap.get(a);
                    if (!comps) dataMap.set(a, (comps = [c])); // add the data to the map
                    else comps.push(c);
                }
            });
        } else {
            c.data = [];
        }
        
        _s._createdDuringDraw.push(c);
    };
    
    // Internal function that creates a component from common arguments passed to mount, inject, etc.
    // eg: draw function, data, if it's a component already, etc.
    const compFromArgs = (args) => {
        let comp = null;
        // look for a draw function ("anonymous" component)
        let i = args.findIndex(a => typeof a === 'function');
        if (i > -1) {
            let f = args[i];
            // function, so mounting anonymously...
            args.splice(i, 1);
            
            // create a component object
            comp = {
                suxId: _s.genId(),
                draw: f,
                data: args
            };
            
        } else {
            // no function, it's object/component already
            i = args.findIndex(a => typeof a === 'object' && a.draw);
            if (i < -1) {
                throw new Error('No component or draw function was passed to the mount.');
            }
            comp = args[i];
            args.splice(i, 1);
        }
        return comp;
    };
    
    /**
     * Mounts a component into an element, replacing its content with the component's markup.
     * This creates an "inny" component ( 'repaint()' ubdates innerHTML rather than outerHTML )
     */
    _s.mount = (...args) => {
        // pull the element from the args...
        let i = args.findIndex(a => typeof a === 'string' || _s.isElement(a));
        let element = null;
        if (i > -1) {
            element = args[i];
            args.splice(i, 1);
            if (typeof element === 'string') element = document.getElementById(element);
        }
        if (!element) throw new Error('Element or id of element required to mount.');
        
        let sux = element.getAttribute('sux');
        
        if (sux) {
            _s.clearKids(element);
            let comp = compMap.get(sux);
            if (comp) {
                comp.cleared?.();
                _s.youDontSay(comp);
            }
        }
        
        let comp = compFromArgs(args);
        comp.inny = true;
        
        _s._createdDuringDraw = [comp];
        _s.register(comp);
        element.setAttribute('sux', comp.suxId);
        const result = element.innerHTML = comp.draw(...comp.data);
        
        _s.settle();
        return result;
    };
    
    /**
     * Specifically for anonymous components, injecting their creation and markup into some other markup.
     * This creates an "outy" component ( 'repaint()' updates outerHTML rather than innerHTML )
     */
    _s.inject = (...args) => {
        let comp = compFromArgs(args);
        comp.outy = true;
        _s.register(comp);
        return comp.draw(...comp.data).replace('>', ` sux="${comp.suxId}">`);
    };
    
    /**
     * If you create HTML and add it to the document (rather than the framework calling it), and if you
     * created sub components to do this... when you add it to the document, call this to notify the
     * sub-components created that they are now mounted.
     */
    _s.settle = () => {
        let tmp = [..._s._createdDuringDraw];
        _s._createdDuringDraw = [];
        
        tmp.forEach(c => (c.mounted) ? c.mounted() : null);
    };
    
    /**
     * Repaints a component, calling the draw() function and updating its markup in the DOM.
     */
    _s.repaint = c => {
        if (!c) return;
        if (typeof c === 'string') c = compMap.get(c);
        
        _s.clearKids(c);
        
        const element = _s.element(c);
        if (element) {
            _s._createdDuringDraw = [];
            
            // redraw the html...
            let content = c.draw(...(c.data));
            
            if (c.outy) {
                // inject the suxId...
                content = content.replace('>', ` sux="${c.suxId}">`);
                // update the element...
                element.outerHTML = content;
                delete c.element;
                
            } else {
                element.innerHTML = content;
            }
            
            _s._runMounts(element);
            
            _s._createdDuringDraw.forEach(c => (c.mounted) ? c.mounted() : null);
            _s._createdDuringDraw = [];
            
            c.repainted?.();
        } else {
            console.log('Element not found for ' + c.suxId);
        }
    };
    
    
    /**
     * Notify the system that some data has been modified. If you have told the framework about some data,
     * that "binds" it to the component, such that any logic could modify it and tell the system it was touched,
     * and the system will repaint or notify any components that have the relationship to that data.
     */
    _s.touchData = (dat) => {
        if (typeof dat !== 'object' || dat instanceof Date) return; // not doing basic types or dates
        
        let comps = dataMap.get(dat);
        if (comps) comps.forEach(c => {
            if (c.dataTouched) {
                c.dataTouched(dat);
            } else {
                _s.repaint(c);
            }
        });
    };
    
    /**
     * Similar to 'touchData()', except you are telling the system it should be replaced, and similarly the
     * framework will notify/repaint components of the change.
     */
    _s.replaceData = (orig, update) => {
        if (typeof orig !== 'object' || orig instanceof Date) return; // not doing basic types or dates
        if (typeof update !== 'object' || update instanceof Date) {
            throw new Error('Updating object to basic type is sadpanda.');
        }
        
        let comps = dataMap.get(orig);
        if (comps) comps.forEach(c => {
            if (c.dataReplace) {
                c.dataReplace(orig, update);
            } else {
                // replace orig object in c.data
                let i = c.data.indexOf(orig);
                if (i > -1) c.data[i] = update;
                _s.repaint(c);
            }
        });
    };
    
    /**
     * Mostly for internal, but whenever a component with child-components repaints, we should clean up all the
     * references to the child components so that fresh can be rebuilt.
     */
    _s.clearKids = (cx) => {
        let e = null;
        if (!_s.isElement(cx)) {
            if (cx?.suxId) {
                e = _s.element(cx);
                
            } else {
                if (typeof cx !== 'string') cx = cx.suxId;
                if (!cx) return;
            }
        }
        
        e = e || (_s.isElement(cx) ?  cx : sux.element(cx));
        if (!e) {
            // maybe not mounted yet?... in which case, no kids to clear...
            return;
        }
        
        _s._clearMounts(e);
        
        let ksux = e.querySelectorAll('[sux]');
        
        ksux.forEach(ex => {
            let id = ex.getAttribute('sux');
            let c = compMap.get(id);
            if (!c) return;
            
            compMap.delete(id);
            drawMap.delete(c.draw);
            _s.youDontSay(c);
            
            if (c.data?.length) {
                c.data.forEach(d => {
                    let comps = dataMap.get(d);
                    if (comps) {
                        let i = comps.indexOf(c);
                        if (i > -1) comps.splice(i, 1);
                    }
                });
            }
            
            if (c.cleared) c.cleared();
        });
    };
    
    /**
     * Given a component, or the suxId of a component, it will walk up the DOM tree to find the parent component.
     */
    _s.parent = (s) => {
        if (!s) return null;
        
        let c = null;
        let e = null;
        if (s.suxId) {
            // passed in a component, set the string to the id and the component reference
            c = s;
            s = s.suxId;
            e = _s.element(c);
        } else if (typeof s === 'string') {
            // passed in a string, get the component reference
            c = compMap.get(s);
        }
        
        if (c?.parent) return c?.parent;
        
        if (!e) {
            if (_s.isElement(s)) {
                // we were given an element to search from...
                e = s;
            } else if (c?.element) {
                // we were given a component to search from, with an element already set...
                e = c?.element;
            } else {
                e = document.querySelector('[sux="' + s + '"]');
                if (c) c.element = e;
            }
        }
        
        if (!e) e = document.getElementById(s);
        if (!e) return null;
        
        // step up one...
        if (e) e = e.parentElement;
        
        // loop up elements until we find a parent with a sux attribute...
        while (e && !e.getAttribute('sux')) e = e.parentElement;
        
        if (!e) {
            console.log('PARENT NOT FOUND!');
            return null;
        }
        
        let parent = compMap.get(e.getAttribute('sux'));
        parent.element = e;
        
        if (c) c.parent = parent;
        
        return parent;
    };
    
    
    // ------------------------------------------------------------------------------
    // NAMED FACTORIES
    
    /**
     * Given the name of a component and a factory function (a function that creates an instance of a component),
     * registers that factory for that name.
     */
    _s.registerFactory = (name, func) => {
        let newFunc = (...args) => {
            let comp = func(...args);
            _s.register(comp);
            return comp;
        };
        _s.factories.set(name, newFunc);
    };
    
    /**
     * Given the name of the component factory (see 'registerFactory()'), returns a promise that resolves to the
     * factory function. The Promise is so that it can load the required resources to build the component.
     */
    _s.getFactory = async (...args) => {
        let name = args.shift();
        
        if (_s.factories.has(name)) {
            return _s.factories.get(name);
        } else {
            let prom = _s.loadPromises[name];
            if (prom) return prom;
            else {
                prom = _s.loadPromises[name] = _s._loadBundle(name);
                return  prom;
            }
        }
    };
    
    
    // ------------------------------------------------------------------------------
    // EVENT HANDLING
    
    let handlerMap = {};
    
    /**
     * Pass it a function, and it will cache a reference to it, give it an ID, and return HTML for inside an
     * element attribute that will trigger a user event.
     *
     * eg: <a onclick="sux._event('asfASF')">   ...it's the content inside the 'onclick' attribute.
     */
    _s.event = (func) => {
        let id = _s.genId();
        handlerMap[id] = func;
        return 'sux._event(\'' + id + '\', this, event)';
    };
    
    // Internal function that is used by user's triggering events in the document.
    _s._event = (id, e, evt) => {
        handlerMap[id](e, evt);
    };
    
    /**
     * Give it the name of the attribute, and it will create the string needed for the html element.
     * eg: sux.eventAttr('onclick', () => {})
     *  ...will return...
     *  ' onclick="sux._event('asfASF')" '
     *
     *  ...use it to create any kind of event attribute where you want to invoke a JS function.
     */
    _s.eventAttr = (attr, func) => {
        return ' ' + attr + '="' + _s.event(func) + '" ';
    };
    
    /**
     * Helper functions for common event attributes.
     */
    _s.onclick = (func) => _s.eventAttr('onclick', func);
    _s.onchange = (func) => _s.eventAttr('onchange', func);
    _s.onsubmit = (func) => _s.eventAttr('onsubmit', func);
    _s.onmouseover = (func) => _s.eventAttr('onmouseover', func);
    _s.onmouseout = (func) => _s.eventAttr('onmouseout', func);
    
    
    /**
     * Draws into a tag the ability to run a function after the tag is mounted.
     */
    _s._mountRefs = {};
    _s.mountFunc = (func) => {
        let id = _s.genId();
        _s._mountRefs[id] = func;
        return ' sux_mref="' + id + '" ';
    };
    
    // internal, gets any invocations of `mountFunc` and applies them to the elements
    _s._runMounts = (e) => {
        if (!e) e = document;
        e.querySelectorAll('[sux_mref]').forEach(ex => {
            let id = ex.getAttribute('sux_mref');
            if (_s._mountRefs[id]) {
                let func = _s._mountRefs[id];
                delete _s._mountRefs[id];
                ex.removeAttribute('sux_mref');
                func(ex);
            }
        });
    };
    
    // Internal, for clearing component html, we don't want to have ref's sitting around orphaned
    _s._clearMounts = (e) => {
        if (!e) return;
        e.querySelectorAll('[sux_mref]').forEach(ex => {
            let id = ex.getAttribute('sux_mref');
            ex.removeAttribute('sux_mref');
            delete _s._mountRefs[id];
        });
    };
    
    
    /**
     * "Binding" is a loose term that you want to set something against an element, and listen for various
     * events on that element.
     *
     * event: an event you want to listen to, can also be an object mapping multiple events to 'from' functions
     * draw: if you want to take over writing the string that's added to the tag (eg: ' checked ' for checkboxes)
     * to: function that does stuff when the element is mounted (like setting value of an input field)
     * from: event handler executed when the event is triggered
     */
    _s.bind = (params) => {
        if (!params) return;
        let { event, draw, to, from } = params;
        
        let mountString = draw ? draw() : _s.mountFunc(to);
        let eventString = null;
        if (typeof event === 'string') eventString = _s.eventAttr(event, from);
        else if (typeof event === 'object') {
            eventString = Object.keys(event).map(k => _s.eventAttr(k, event[k])).join(' ');
        }
        return mountString + eventString;
    };
    
    // internal, helping parse arguments to bind functions below
    const binderParams = (args) => {
        return (args.length === 1) ? args[0] : {
            prop: args.ripOne(v => (typeof v === 'string')),
            obj: args.ripOne(v => (typeof v === 'object')),
        };
    };
    
    /**
     * Binds an element's 'value' to the 'onchange' event handler (eg: text input field)
     */
    _s.bindValueChange = (...args) => {
        if (!args) return;
        let { prop, obj, to, from } = binderParams(args);
        
        return _s.bind({
            event: { 'onchange': e => obj[prop] = (from ? from(e.value) : e.value) },
            to: e => {
                const val = obj[prop];
                e.value = (to ? to(val) : (val === null || val === undefined) ? '' : val );
            },
        });
    };
    
    /**
     * Binds an element's 'checked' state to the 'onchange' event handler (eg: checkboxes)
     */
    _s.bindCheckedChange = (...args) => {
        if (!args) return;
        let { prop, obj, to, from } = binderParams(args);
        
        let val = to ? to(obj[prop]) : obj[prop];
        return _s.bind({
            event: 'onchange',
            draw: () => (val ? ' checked ' : ''),
            from: e => (obj[prop] = from ? from(e.checked) : e.checked)
        });
    };
    
    
    // ------------------------------------------------------------------------------
    // LISTENERS
    
    
    _s._sayWhenListeners = {};
    _s._whenObjects = new Map();
    
    /**
     * Registers a listener function for the provided event name.
     */
    _s.when = (evt, func) => {
        if (typeof evt === 'string') {
            let listeners = _s._sayWhenListeners[evt];
            if (!listeners) listeners = _s._sayWhenListeners[evt] = [];
            listeners.push(func);
            
        } else if (typeof evt === 'object') {
            let obj = evt;
            let handlerList = [];
            
            let keyList = null;
            if (evt.constructor?.name === 'Object') keyList = Object.keys(evt);
            else keyList = Object.getOwnPropertyNames(Object.getPrototypeOf(evt));
            
            // turn "when * ()" into handlers...
            keyList?.forEach(k => {
                if (k.length > 4 && k.startsWith('when')) {
                    let tmp = { k, h: (...args) => obj[k](...args) };
                    handlerList.push(tmp);
                    _s.when(k.substring(4), tmp.h);
                }
            });
            if (handlerList.length) {
                _s._whenObjects.set(obj, handlerList);
            }
        }
    };
    
    /**
     * Notifies all registered listeners for a given event and passes along the arguments.
     */
    _s.say = (evt, ...args) => {
        let listeners = _s._sayWhenListeners[evt];
        (listeners || []).forEach(f => f(...args));
    };
    
    /**
     * Removes a listener function for the provided event name.
     */
    _s.youDontSay = (evt, handler) => {
        if (!evt) return;
        
        if (typeof evt === 'string') {
            let listeners = _s._sayWhenListeners[evt];
            if (listeners) {
                let i = listeners.indexOf(handler);
                if (i > -1) listeners.splice(i, 1);
                
                if (listeners.length === 0) delete _s._sayWhenListeners[evt];
            }
        } else if (typeof evt === 'object') {
            let handlerList = _s._whenObjects.get(evt);
            if (handlerList) {
                console.log('clearing handlers for object...');
                handlerList.forEach(h => {
                    _s.youDontSay(h.k, h.h);
                });
                _s._whenObjects.delete(evt);
            }
        }
    };
    
    
    // ------------------------------------------------------------------------------
    // MISC UTILS
    
    /**
     * Without changing the object reference, update the content of an object with that of another.
     * (generally Object.assign() but with a clearing of the original object first, with a `touchData()` call).
     */
    _s.bodySnatch = (obj, snatcher) => {
        // clear object...
        for (var key in obj) delete obj[key];
        Object.assign(obj, snatcher);
        _s.touchData(obj);
    };
    
    return _s;
})({});


((_s) => {
    
    /**
     * Helper function to make HTTP calls. Note that the "postOrParams" argument can be either an object for POST
     * or, or the parameters of the object will become the queryString for a GET request.
     *
     * NOTE: any response that is not "ok" will require a catch() to handle the error.
     */
    _s.http = async (url, method, postOrParams, headers) => {
        method = method.toUpperCase();
        
        const defaultHeaders = { 'Content-Type': 'application/json' };
        const fetchOptions = { method, headers: { ...defaultHeaders, ...headers } };
        
        if (postOrParams) {
            if (method === 'GET' && postOrParams) {
                url = (url.includes('?') ?  '&' : '?') + new URLSearchParams(postOrParams).toString();
            }
            
            if (method === 'POST' && postOrParams) {
                fetchOptions.body = JSON.stringify(postOrParams);
            }
        }
        
        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        return await response.json();
    };
    
    /**
     * Wrapper of the 'http()' function for POST requests.
     */
    _s.httpPost = async (hostPath, path, post, headers) => {
        if (!hostPath.endsWith('/') && path) hostPath += '/';
        let url = hostPath + ( path || '');
        return _s.http(url, 'POST', post, headers);
    };
    
    /**
     * Wrapper of the 'http()' function for GET requests.
     */
    _s.httpGet = async (hostPath, path, params, headers) => {
        if (!hostPath.endsWith('/') && path) hostPath += '/';
        let url = hostPath + ( path || '');
        return _s.http(url, 'GET', params, headers);
    };
    
    /**
     * So that you don't need the full URL in all the code, setting up an API makes the code cleaner.
     * example: {
     *    coreLambdaApi: {
     *       hostPath: `https://somehost:8080/dev/core/`
     *   },
     *   otherLambda: {
     *       hostPath: `https://otherhost:6548/dev/other/`
     *   }
     * }
     *
     * ...using the above will look like...
     *     await sux.coreLambdaApi.post('healthCheck', { notThing: 'bad-request' }, {});
     *
     * ...path argument is appended to the hostPath. You _could_ put a querystring on that path
     * argument, but it's nicer just the use the params argument object.
     */
    _s.setupApi = (config) => {
        Object.keys(config).forEach(k => {
            let conf = config[k];
            if (!_s[k]) {
                _s[k] = {
                    post: async (path, post, headers) => sux.httpPost(conf.hostPath, path, post, headers),
                    get: async (path, params, headers) => sux.httpGet(conf.hostPath, path, params, headers)
                };
            }
        });
    };
    
})(sux || window.sux || {});


((_s) => {

    // ------------------------------------------------------------------------------
    // BUNDLING/RESOURCES AND ROUTING
    
    _s.bundles = {};
    _s.loadPromises = {};
    _s.factories = new Map();
    _s.requestedResources = new Map();
    
    _s.routes = [];
    _s.siteLoader = null;
    
    
    /**
     * Loads a javascript file into the document
     */
    _s.loadScript = (source) => {
        let prom = _s.requestedResources.get(source);
        if (prom) return prom;
        
        prom = new Promise((resolve) => {
            let script = document.createElement('script');
            
            script.onload = () => setTimeout(() => resolve(), 50);
            script.type = 'text/javascript';
            
            script.src = source;
            document.head.appendChild(script);
        });
        
        _s.requestedResources.set(source, prom);
        
        return prom;
    };
    
    /**
     * Loads a stylesheet into the document head.
     */
    _s.loadStylesheet = (href) => {
        // if loaded, return, otherwise do the thing
        if (_s.requestedResources.has(href))  return;
        _s.requestedResources.set(href, Promise.resolve());
        
        // create the link and trigger the load
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    };
    
    /**
     * Loads a named bundle (previously provided to 'loadBundles()'), of source and style into the document.
     */
    _s._loadBundle = async (name) => {
        let bundle = _s.bundles[name];
        if (bundle.style) {
            _s.loadStylesheet(bundle.style);
            
        }
        let source = bundle.source;
        if (!Array.isArray(source)) source = [source];
        
        // wait for all the loadings...
        await Promise.allSettled(source.map(src => _s.loadScript(src)));
        
        if (!_s.factories.has(name)) {
            throw new Error('Bundle did not register a factory.');
        }
        
        return _s.factories.get(name);
    };
    
    /**
     * Loads a bundle configuration into the system. Bundles connect a name to source and style resources as well
     * as a route to get there with a hash in the URL.
     * example: {
     *       home: {
     *           route: /home/g,
     *           source: "js/components/home.js"
     *       },
     *       dancers: {
     *           route: /dancers/g,
     *           source: "js/components/dancers.js",
     *           style: "css/components/dancers.css"
     *       },
     * }
     *
     * NOTE: the system only loads a resource once. You could share a stylesheet or script between bundles
     * and the system will only load it once.
     */
    _s.loadBundles = (bundles) => {
        _s.bundles = bundles;
        let bundleKeys = Object.keys(bundles);
        bundleKeys.forEach(name => {
            let b = bundles[name];
            if (b?.route) {
                b.name = name;
                _s.routes.push(b);
            }
        });
        if (!_s.siteLoader) {
            _s.siteLoader = setTimeout(async () => {
                for (let key of bundleKeys) {
                    await _s._loadBundle(key);
                }
            }, 1000);
        }
    };
    
    /**
     * Helper function for navigating to a hash in the current document location.
     * NOTE: the '#' is added for you, sux.go('home') will navigate to '#home'.
     */
    _s.go = (hash) => {
        document.location = ('#' + hash);
    };
    
    /**
     * Helper that wires up an 'onclick' event (like 'sux.onclick()'), but it just routes with a hash.
     */
    _s.onclickGo = (hash) => {
        return _s.eventAttr('onclick', () => _s.go(hash));
    };
    
    /**
     * Helper that goes to previous address in history
     */
    _s.onclickBack = () => {
        return _s.eventAttr('onclick', () => history.back());
    };
    
    /**
     * Does the actual routing, doesn't change the document location, just routes to the appropriate component.
     * Can also be used to kick things off on document load.
     */
    _s.route = async (hash) => {
        if (hash && (typeof hash === 'object') && hash.newURL) hash = window.location.hash;
        if (!hash) hash = (window.location.hash || '#home') + '';
        
        if (hash[0] === '#') hash = hash.substring(1);
        
        let route = _s.routes.find(r => r.route.test(hash));
        
        // reset the 'lastIndex' of all the regexes so they can be used again
        _s.routes.forEach(r => r.route.lastIndex = 0);
        
        if (!route) {
            console.log('No route found for ' + hash + '!');
            return;
        }
        _s.say('Routing', hash, route);
    };
    
    /**
     * Helper function for parsing querystrings, and if no string
     * provided will do whatever is in the current URL.
     */
    _s.parseQstring = (query) => {
        if (!query) {
            let docLoc = (document.location + '').split('#')[0];
            query = docLoc.split('?');
            if (query.length === 1) return {};
            query = query[1];
        }
        
        const duri = (ux) => decodeURIComponent((ux + '').replace(/\+/g, '%20'));
        
        let params = query.split('&');
        let result = {};
        for (let i = 0; i < params.length; i++) {
            let pair = params[i].split('=');
            let key = duri(pair[0]);
            let val = duri(pair[1] || '');
            if (result[pair[0]]) {
                if (Array.isArray(result[key])) {
                    result[key].push(val);
                } else {
                    result[key] = [ result[key], val ];
                }
            } else {
                result[key] = val;
            }
        }
        return result;
    };
    
    
    /**
     * Class for a component that will swap in and out other components without repainting them.
     */
    class CompSwapper {
        constructor({ routeNames, loadingDraw, factoryRunner, showFunc, hideFunc }) {
            this.namesToCareAbout = {};
            (routeNames || []).forEach(name => this.namesToCareAbout[name] = true);
            
            this.loadingDraw = loadingDraw;
            this.factoryRunner = factoryRunner;
            this.showFunc = showFunc;
            this.hideFunc = hideFunc;
            
            this.running = false;
            this.stagedElements = {};
        }
        
        mounted() {
            this.running = true;
            _s.repaint(this);
        }
        
        async show(name) {
            if (!this.namesToCareAbout[name]) return;
            
            let nextElement = null;
            
            if (!this.stagedElements[name]) {
                // add a NEW DIV element to the main-stage element...
                nextElement = document.createElement('div');
                nextElement.style.display = 'none';
                
                _s.element(this).appendChild(nextElement);
                
                let factory = _s.getFactory(name);
                if (factory instanceof Promise) factory = await factory;
                
                let nextComp = this.factoryRunner(name, factory);
                if (nextComp instanceof Promise) nextComp = await nextComp;
                
                _s.mount(nextElement, nextComp);
                
                this.stagedElements[name] = nextElement;
                
            } else {
                nextElement = this.stagedElements[name];
            }
            
            // hide previous, show the next...
            if (this.currentElement) {
                this.currentElement.style.display = 'none';
                this.hideFunc?.(_s.get(this.currentElement.getAttribute('sux')));
            }
            if (nextElement) nextElement.style.display = 'block';
            
            const comp = _s.get(nextElement.getAttribute('sux'));
            
            // run the showFunc if provided
            comp && this.showFunc?.(comp);
            
            this.currentElement = nextElement;
        }
        
        draw () {
            return this.running ? this.inny ? '' : `<div>${this.loadingDraw()}</div>` : this.loadingDraw();
        }
    }
    
    _s.registerFactory('comp-swapper',  (opts) => new CompSwapper(opts));
    
    
    // try again...
    _s.registerFactory('route-triggered-swapper',  async (config) => {
        let comp = new (class extends CompSwapper {
            constructor(conf) {
                super(conf);
                this.factoryRunner = async () => {};
                
                this.showFunc = (comp) => {
                    if (!comp._hasShown) {
                        comp._hasShown = true;
                    } else {
                        comp?.routeChanged?.(this.newHashPath, this.newRoute);
                    }
                };
                this.hideFunc = (comp) => comp?.routeHiding?.();
            }
            
            async whenRouting(hashPath, route) {
                this.factoryRunner = async (name, factory) => {
                    return factory(hashPath, route);
                };
                this.newHashPath = hashPath;
                this.newRoute = route;
                this.show(route.name);
            }
        })(config);
        
        return comp;
    });
    
    
    // FINAL SETUP -------------------------------------------------------------
    
    // listen for hash changes in the document location...
    window.addEventListener('hashchange', _s.route);
    
})(sux || window.sux || {});



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


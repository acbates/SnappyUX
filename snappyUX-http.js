
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
            if (method === 'GET') {
                url = (url.includes('?') ?  '&' : '?') + new URLSearchParams(postOrParams).toString();
            } else {
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
    _s.httpPost = async (...args) => _s.httpCall('POST', ...args);
    
    /**
     * Wrapper of the 'http()' function for GET requests.
     */
    _s.httpGet = async (...args) => _s.httpCall('GET', ...args);
    
    /**
     * Wrapper of the 'http()' function for all types of requests, passing in a method.
     */
    _s.httpCall = async (method, hostPath, path, params, headers, preflight = (obj => obj)) => {
        let tmp = preflight({ method, hostPath, path, params, headers });
        
        if (tmp && tmp instanceof Promise) tmp = await tmp;
        
        if (tmp) {
            method = tmp.method;
            hostPath = tmp.hostPath;
            path = tmp.path;
            params = tmp.params;
            headers = tmp.headers;
        }
        
        if (!hostPath.endsWith('/') && path) hostPath += '/';
        let url = hostPath + ( path || '');
        return _s.http(url, method, params, headers);
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
                    get: async (path, params, headers) => sux.httpCall('GET', conf.hostPath, path, params, headers, conf.preflight),
                    post: async (path, post, headers) => sux.httpCall('POST', conf.hostPath, path, post, headers, conf.preflight),
                    call: async (method, path, post, headers) => sux.httpCall(method, conf.hostPath, path, post, headers, conf.preflight)
                };
            }
        });
    };
    
})(sux || window.sux || {});

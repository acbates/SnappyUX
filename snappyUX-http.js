
((_s) => {
    
    /**
     * Helper function to make HTTP calls. Note that the "postOrParams" argument can be either an object for POST
     * or, or the parameters of the object will become the queryString for a GET request.
     *
     * NOTE: any response that is not "ok" will require a catch() to handle the error.
     */
    _s.http = (url, method, postOrParams, headers) => {
        return new Promise((resolve, reject) => {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json', ...(headers || {}) }
            };
            
            if (method === 'POST') {
                options.body = JSON.stringify(postOrParams || {});
                
            } else if (method === 'GET' && postOrParams) {
                // create the query string from params, including the encoding...
                let qs = Object.keys(postOrParams).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(postOrParams[k])).join('&');
                url = (url.includes('?') ?  '&' : '?') + qs;
            }
            
            fetch(url, options).then(async r => {
                if (r.ok) {
                    resolve(await r.json());
                } else {
                    reject(await r.json());
                }
            });
        });
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
    
    console.log('LOADED HTTP??');
    
})(sux || window.sux || {});

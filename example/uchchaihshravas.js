

Array.prototype.rip = function(fn) {
    let found = [];
    for (let i = this.length - 1; i >= 0; i--) {
        if (fn(this[i])) {
            found.push(this[i]);
            this.splice(i, 1);
        }
    }
    return found.reverse();
}


// ********************************************************************
// Uchchaihshravas --- the divine flying horse
//
// HTTP server to serve static files from a directory
//
// ********************************************************************
let launchMessage = `
  ___ ___      __         __          __ __          __
 |   Y   .----|  |--.----|  |--.---.-|__|  |--.-----|  |--.----.---.-.--.--.---.-.-----.
 |   |   |  __|     |  __|     |  _  |  |     |__ --|     |   _|  _  |  |  |  _  |__ --|
 |   |   |____|__|__|____|__|__|___._|__|__|__|_____|__|__|__| |___._|\\___/|___._|_____|
 |   1   |
 |       |                                      ...is awake and ready to play...
 \`-------'
 
  node http-serve.js [static-dir] [port]
    - static-dir: optional, the directory to serve static files from (default: './')
    - port: optional, the port to serve on (default: 2727)
 --------
`;

const args = process.argv.slice(2);

const http = require('http');
const fs = require('fs');
const path = require('path');

const SERVICE_PORT = parseInt(args.rip(s => s.match(/\d{4}/))?.[0] || '2727');

let colourAlternate = 0;


let STATIC_DIR = args[0] || './';
if (STATIC_DIR === SERVICE_PORT + '') STATIC_DIR = './';
if (STATIC_DIR) {
  if (!STATIC_DIR.endsWith('/')) STATIC_DIR += '/';
  if (!fs.existsSync(STATIC_DIR)) {
    console.log('Static directory not found: ' + STATIC_DIR);
    process.exit(1);
  }
}

launchMessage += '  Serving static files from: ' + STATIC_DIR + '\n';
launchMessage += '  On port: ' + SERVICE_PORT + '\n';
launchMessage += '  http://localhost:' + SERVICE_PORT + '\n';
launchMessage += '  http://127.0.0.1:' + SERVICE_PORT + '\n';
launchMessage += ' --------\n';


let rootState = null;

let rootScript = process.argv[1];

if (!process.rootState) {
  // original load...
  process.rootState = {};
  
  delete require.cache[rootScript];
  require(rootScript);
  
  let rootChange = () => {
    delete require.cache[rootScript];
    require(rootScript);
  }
  
  let ce = null;
  fs.watch(rootScript, (_, file) => {
    if (ce) clearTimeout(ce);
    ce = setTimeout(rootChange, 100);
  });
  
  // Ok...
  // ...now we can actually start the service
  http.createServer(function (req, res) {
    try {
      if (process?.rootState?.handleHttp) {
        process?.rootState?.handleHttp(req, res);
      }
    } catch(ex) {
      console.log('unhandled exception?...');
      console.log(ex);
    }
  }).listen(SERVICE_PORT, function() {
    console.log(launchMessage);
  });
  
  process.rootState = {};
}



let timers = {};
let watching = new Set();
const watcher = p => {
    if (!p || !fs.existsSync(p)) return;
    if (!fs.lstatSync(p).isDirectory()) {
        p = p.substring(0, p.lastIndexOf('/'));
    }
    
    if (watching.has(p)) return;
    watching.add(p);
    
    fs.watch(p, (_, file) => {
        if (!file.endsWith('~')) {
            let key = p.endsWith('/' + file) ? p : p + '/' + file;
            
            if (timers[key]) clearTimeout(timers[key]);
            timers[key] = setTimeout(() => {
                
                console.log('file changed >> ' + key);
                
                delete require.cache[path.resolve(key)];
                timers[key] = null;
            }, 50);
        }
    });
}


process.rootState.handleHttp = async (req, res) => {
  if (req.url.includes('favicon')) return;
  
  let turl = (req.url + '');
  if (turl === '/' || turl.startsWith('/?') || turl.startsWith('/#')) req.url = '/index.html' + turl.substring(1);
  
  const method = req?.method?.toUpperCase() || '';
  
  // let basicRef = (req.url + '').substring(1).split('?')[0];
  let basicRef = (req.url + '').substring(1);
  
  // Any OPTIONS call, just return allowing everything
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-ats-application',
      'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT',
      'Access-Control-Allow-Origin': '*',
      'Connection': 'keep-alive',
      'Content-Length': '0',
      'Content-Type': 'application/json',
      'Date': new Date() + ''
    });
    
    res.end();
    
  } else if (method === 'GET' && fs.existsSync(STATIC_DIR + basicRef)) {
    
    process.stdout.write((colourAlternate++) % 2 === 0 ? ('\x1b[33m' + STATIC_DIR + basicRef + '\x1b[0m ') : (STATIC_DIR + basicRef + '  '));
    
    let file = fs.readFileSync(STATIC_DIR + basicRef);
    // work out content type based on file extension for basic types using a case statement
    let ext = basicRef.split('.').pop().toLowerCase();
    let contentType = 'text/plain';
    switch (ext) {
      case 'html':
        contentType = 'text/html';
        break;
      case 'css':
        contentType = 'text/css';
        break;
      case 'js':
        contentType = 'text/javascript';
        break;
      case 'json':
        contentType = 'application/json';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'jpg':
        contentType = 'image/jpeg';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
    }
    
    res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Content-Length': file.length
    });
    res.write(file);
    res.end();
    
    return;
      //
      // } else {
      //     res.writeHead(404, {'Content-Type': 'text/html'});
      //     res.end('<h2>404 Not Found</h2><p>Have a nice day :)</p>');
      // }
  } else {
      basicRef = basicRef.split('?')[0];
      
      if (!fs.existsSync(STATIC_DIR + basicRef) || !basicRef.endsWith('.js')) {
          res.writeHead(404, {'Content-Type': 'text/html'});
          res.end('<h2>404 Not Found</h2><p>Have a nice day :)</p>');
          return;
      }
      
      const parseQstring = (query) => {
          if (!query) {
              let docLoc = (req.url + '').split('#')[0];
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
      
      let params = parseQstring();
      
      
      if (method === 'POST') {
          let body = '';
          
          let postObj = await new Promise((resolve, reject) => {
              req.on('data', chunk => {
                  body += chunk.toString(); // convert Buffer to string
              });
              
              req.on('end', () => {
                  resolve(JSON.parse(body));
              });
          });
          
          params = { ...params, ...postObj };
      }
      
      // run the script
      let service = require(STATIC_DIR + basicRef);
      watcher(STATIC_DIR + basicRef);
      
      let response = service[method](params, req.headers);
      if (response instanceof Promise) response = await response;
      
      let txt = JSON.stringify(response);
      res.writeHead(200, {
          'Content-Type': 'text/json',
          'Access-Control-Allow-Origin': '*',
          'Content-Length': txt.length
      });
      res.write(txt);
      res.end();
  }
};



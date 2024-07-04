# Snappy UX

### A little backstory ( just skip it )...
In 2003, while working for a small software company, an idea was born to create
UIs in a manner similar to Java Swing applications. The concept was simple:
each on-screen element had a box and a corresponding block of code. These
blocks were components that could contain sub-components and receive data. When
data changed, the appropriate component would repaint itself.

This framework, dubbed "Snappee," was what the industry would later call a
Single-Page-Application framework. I am certain I wasn't the first to make
a JS framework in this way, but nothing was published at the time, predating
well-known tools like JQuery, Dojo, and Prototype. Snappee was in production
apps for over a decade until company dissolved.

In the decade since, JavaScript has improved dramatically, incorporating much
of the syntactic sugar that once made Snappee unique. After exploring modern
frameworks like Angular, React, and Vue—with their strengths and weaknesses—I
found myself reminiscing about Snappee's speed and simplicity.

As some framework developers now move away from complex rendering schemes like
virtual DOMs, I became curious about reimagining Snappee with modern
JS. An easy development process requiring no compilation step, and its
performance remained impressive even on older machines.

This is that rewrite, SnappyUX.


### General Approach
Modern tooling like IntelliJ can syntax highlight HTML in JS strings, and
particularly in JS string literals. So let's just use string literals as
the template engine, which can obviously take advantage of the full capability
of JS itself.

Super lightweight; minified file without compression is 7kb at the moment,
3kb compressed.

No compilation step, lazy loading of resources if you wish.

Only opinionated where it matters (component registration, etc), assume
nothing else. It's just assembling strings, so assemble whatever strings
you want.


## Components
The core of everything is giving an area of the UI to some code, keeping that
code close and easy to update.

In SnappyUX, a component can be any object with a `'draw()'` function. You can
write them however you want, class or simply an assembled object.


```javascript
class MyComponent {
    draw() {
        return `<div>My Component</div>`;
    }
}

let componentInstance = new MyComponent();

// or, just make an object with a draw() function...

let componentInstance = {
    draw: () => {
        return `<div>My Component</div>`;
    }
};
```

## Mounting...
You has html element, you want to give it to a component...

```html
<html>
<body>
  <div id="component-should-play-here">
    ...
  </div>
</body>
```
```javascript
// get element and instance of component...
const myElement = document.getElementById('component-should-play-here');
const componentInstance = new MyComponent();

// tell SnappyUX to mount it...
sux.mount(myElement, componentInstance);

```

...so think of mounting as a rider getting on a horse; to be able to do that the
horse has to exist.


## Injecting...
Now consider a sub-component; we're mounting a component into an element that exists,
but while we're drawing the component we need to use another component as a sub-component.
In this case there is no existing element to mount, so what we're doing is injecting
a component during the draw of another...


```javascript
// we have a component we want to use...
let simpleComponent = {
    draw: () => {
        return `<div> This is content in my component!! </div>`;
    }
};

// a larger component that wants to use the simpleComponent
let parentComponent = {
    draw: () => {
        return `
            <div>
                <h1>Some Heading</h1>
                <p>Some paragraph</p>
                
                ${ sux.inject(componentInstance) }
                
            </div>
        `;
    }
};

// For the sake of a complete example, we mount the parent component...
sux.mount(document.getElementById('component-should-play-here'), parentComponent);
```

...lookie that, we have ourselves a component framework !! :) 

__NOTE:__ Components that are injected need to have a single top level tag in the html
from their draw function. The framework will be adding some properties to that tag, and
if there are multiple top level tags, the repainting will be amusing! (only the first tag
will repaint leaving the others to get repeated)

```javascript

// Bad...
let badComponentDraw = {
    draw: () => {
        return `
            <div> First top level tag </div>
            <div> Second top level tag </div>
        `;
    }
};

// Good...
let badComponentDraw = {
    draw: () => {
        return `
          <div>
            <div> First top level tag </div>
            <div> Second top level tag </div>
          </div>
        `;
    }
};
```





##  Casually creating components ("Anonymous" components)...
It is important to so easily create components. From the above, you can probably see how
it's pretty easy to casually drop components into a component structure...

```javascript
let parentComponent = {
    draw: () => {
        return `
            <div>
                <h1>Some Heading</h1>
                <p>Some paragraph</p>
                
                ${ sux.inject(() => `
                    <div> This is content in my component!! </div>
                `)}
                
            </div>
        `;
    }
};
```
...and in modern tooling like IntelliJ, the HTML is all sytax highlighted and everything.

__NOTE:__ because we haven't put any extra hassle in making an instance, getting a variable,
blah blah... it's just the draw function given to the `inject()` function. This is what
will be referred to as an __"Anonymous"__ component.

In a `draw()` function, we're just assembling strings, and making use of JS's string literals.
So lists of components is easy...

```javascript
let listOfData = [ 'first', 'second', 'third' ];
let parentComponent = {
    draw: () => {
        return `
            <div>
                <h1>Some Heading</h1>
                <p>Some paragraph</p>
                
                ${ listOfData.map( label => sux.inject(() => `
                
                    <div> This is is the ${ label } component!! </div>
                    
                `)).join('') }
                
            </div>
        `;
    }
};
```
...it's just using the Array's `map()` function to iterate, and because we're making
a string for html, there's a `join()` to concatenate the html snippets into the result.


## Events...
We need to let the user interact with things, we need click handlers and such...

```javascript
let listOfData = [ 'first', 'second', 'third' ];

let stuffToDoWhenClicked = () => console.log('I was clicked!!');

let parentComponent = {
    draw: () => {
        return `
            <div>
                <h1>Some Heading</h1>
                <p>Some paragraph</p>
                
                ${ listOfData.map( label => sux.inject(() => `
                
                    <div onclick="${ sux.event( stuffToDoWhenClicked() ) }">
                        This is is the ${ label } component!!
                    </div>
                    
                `)).join('') }
                
            </div>
        `;
    }
};
```
...clicking the child div now runs the function provided.

This is super common, so there are helpers to make it even easier. The following lines are
equivalent to what is above...

```javascript
// have the framework write out a provided attribute...
<div ${ sux.eventAttr('onclick', stuffToDoWhenClicked() ) }>
    
// onclick is so common that it has its own helper...
<div ${ sux.onclick( stuffToDoWhenClicked() ) }>
    
// and you could of course bury an arrow function if you wanted...
<div ${ sux.onclick( () => console.log('I was clicked!!') ) }>
```


## Repainting
Consider the following snippet...
```javascript
const data = {
    someProperty: 'THIS PROPERTY HAS VALUE!'
};

let fantasticalComponent = {
    draw: () => {
        return `<div>Value of sompeProperty is: ${ data.someProperty }</div>`;
    }
};


setTimeout(() => {
    // data tweak
    data.someProperty = 'new value!';
    
    sux.repaint(data);
    
}, 5000); // 5000 moments later...
```
Data tweaked, tell framework to repaint the component.


## Internally registered data
The framework will look at data passed to it, but also data that is set as a `'data'` property
on the component. For anonymous components, this array is made and set on the component instance.

The following are equivalent...
```javascript
const pieceOfData = { someProperty: 'first data!' };
const secondData = { someProperty: 'first data!' };

// built object component...
let someComp = {
    data: [ pieceOfData, secondData ],
    draw: (dx) => {
        return `<div>Value of sompeProperty is: ${ dx.someProperty }</div>`;
    }
};

// class definition and component instance...
class OtherComp {
    constructor() {
        this.data = [ pieceOfData, secondData ];
    }
    draw(dx) {
        return `<div>Value of sompeProperty is: ${ dx.someProperty }</div>`;
    }
}

const otherInstance = new OtherComp();


// anonymous component passing in the data...
let html = `
    ${ sux.inject(pieceOfData, secondData, (dx) => {
       <div>Value of sompeProperty is: ${ dx.someProperty }</div>
    }) }
`;

```

...so, don't set `'data'` property on your component unless you want the framework to be
watching it.

__ALSO NOTE:__ You really don't have to use this data array, but it's there to make use of
the `'touchData()'` and `'replaceData()'` notifications explained below.


## Reacting to data changes
Other framework do a whole pile of nonsense for getting reactivity. SnappyUX doesn't have
that noise, but there's a simple way to tell the framework you care about a chunk of data
and would like its magic to work when you update it...

```javascript
const data = {
    someProperty: 'initial value!'
};

let someComponent = {
    draw: () => {
        return `
            <div>
                <h1>Some Heading</h1>
                <p>Some paragraph</p>
                
                ${ sux.inject(data, (dx) => `
                    <div> Content of data is: ${ dx.someProperty }  </div>
                `)}
                
            </div>
        `;
    }
};

setTimeout(() => {
    // data tweak
    data.someProperty = 'new value!';
    
    sux.repaint(data);

}, 5000); // 5000 moments later...
```
Now, this looks almost identical, change `repaint()` for `touchData()` in the previous example,
however, we don't have a reference to the anonymous component actually making use of the
data. Also keep in mind that you can tell multiple components to use a piece of data,
they could also get notice of being updated.

__NOTE:__ In this example, the inner component is using a `dx` variable rather than the
direct data reference. All data provided to the framework in the `inject()` call are passed
as arguments to the draw function.

__ALSO NOTE:__ Order of arguments to the `inject()` function are not important, so you can
arrange them to whatever you feel is most readable.

Multiple data items passing along...

```javascript
const oneData = { first: 'first data!' };
const twoData = { second: 'second data!' };

const comp = { draw: () => `

        ${ sux.inject(oneData, twoData, (dOne, dTwo) => `
            <div> ${ dOne.first } ${ dTwo.second }  </div>
        `)}
`};
```

### How About Not Reacting?
If your component has a `'dataTouched()'` handler function, the framework will call that
instead, but it will be up to your component to repaint if it wishes to.

Consider the two following components...
```javascript
let uptightCompInstance = {
    draw: () => {
        return `<div>Value of sompeProperty is: ${ data.someProperty }</div>`;
    },
    dataTouched: () => {
        console.log('Ignoring data updates, go away.');
    }
};

let eagerBeaverCompInstance = new class {
    draw() {
        return `<div>Value of sompeProperty is: ${ data.someProperty }</div>`;
    }
    
    dataTouched() {
        console.log('I LOVE UPDATES!!!');
        sux.repaint(this);
    }
};

```
I wrote the second example as a class to show the benefit of being able to use `'this'`
to refer to itself when calling the framework, etc.

NOTE: Even if you don't repaint, the data was mutated internally. So if the component
is repainted for any other reason, that object will be updated. If you don't want it mutated,
either:
 - avoid mutating it
 - don't give it to the framework to watch

SIDE NOTE: I would normally not make a new instance of a class as the same line as the class
definition, but I wanted the two examples to be directly analogous (creating variables
with usable instances of a component);



## Replacing Data
Similar to above, but replacing. Consider the following...


```javascript
let listOfData = [ { name: 'first record' }, { name: 'second record' } ];

let parentComponent = {
    draw: () => {
        return `<div>
            ${ listOfData.map( record => sux.inject(record, (rx) => `
            
                <div> This is is the ${ rx.name } child component!! </div>
                
            `)).join('') }
        </div>`;
    }
};

setTimeout(() => {
    // pluck a piece of data...
    const newRecord = { name: 'NEW record!!' };
    
    // replace the first record with the new one...
    sux.replaceData(listOfData[0], newRecord);

}, 5000); // 5000 moments later...
```

So, what's happening:
- we have an array with some record objects
- iterating that array and creating child components
- we are passing the record object itself to the child component to use
- this will register the record with the framework as something to watch
- 5000 moments later, we replace the first record with a new one

...the first child component will be updated with the new record data and repainted.

__NOTE:__ The framework is looking inside the component at its data array, and replacing
that particular object, and then repainting the component.


## Listening / Objecting to data replacement
Similar to the `'dataTouched()'` function, there is a `'dataReplace()'` function you can
optionally implement to get the event. It will be passed the original and the new object.

This is so you can look for the original object and make decisions, replace the object
yourself in the data array, or just ignore the event. Unlike `'dataTouched()'`, if you
don't replace the object, the framework will not be replacing the data object.

```javascript
let replacingDataComponent = {
    data: [{ someProperty: 'first data!' }],
    
    draw: (rx) => {
        return `<div>Value of sompeProperty is: ${ rx.someProperty }</div>`;
    },
    dataReplace: (original, replacement) => {
        this.data[0] = replacement
        sux.repaint(this);
    }
};

let notReplacingComponent = {
    draw: () => {
        return `<div>Value of sompeProperty is: ${ data.someProperty }</div>`;
    },
    dataReplace: (original, replacement) => {
        console.log('I won\'t be replacing the object today...');
    }
};
```



## Lifecycle: Mounted
With most frameworks, we usually find ourselves in two states; writing logic for a
component that already exists in the DOM, or in logic for a component that has not
yet been committed to the DOM and actually in the document. In framework like React,
it can be _really_ annoying as it blocks various actions from happening depending
on what you're doing.

Not here.

But you can easily find out if you're mounted or not, and it won't object to any
logic you want to run regardless of when you want to run it...

```javascript
// we have a component we want to use...
let simpleComponent = {
    draw: () => {
        return `<div> This is content in my component!! </div>`;
    },
    mounted: () => {
        console.log('child component was mounted!');
    }
};
```


## Lifecycle: Cleared
Inversely, you need to know when something is cleared from the DOM. Also just as easy...

```javascript
// we have a component we want to use...
let simpleComponent = {
    draw: () => {
        return `<div> This is content in my component!! </div>`;
    },
    mounted: () => {
        console.log('child component was mounted!');
    },
    cleared: () => {
        console.log('child component was cleared!');
    }
};
```

Knowing when you're being looked at, and know when no longer needed. That's it for lifecycle.



## Code Events ("say when...")

![alt text](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsJpeRjrIRL4C0HGiE6tNorSDrsze1RA_Cw2i-6hWeQ49nNiECq0NoBAhVAzs0fPdOqmg&usqp=CAU)

Simple eventing and listening methods,  `"say(eventName, payload)"` to broadcast something
to listeners, and `"when(event, handler)"` to listen for named events.


```javascript
// just 'say' and provide data, that data will become arguments to the handlers...
let dataOne = { name: 'first record' };
let dataTwo = { name: 'second record' };
sux.say('SomeEvent', dataOne, dataTwo);

sux.when('SomeEvent', (dataOne, dataTwo) => console.log('Route changed to:', route));
```

### Registering multiple 'when' handlers...
When calling `'when()'` to register a listener, you can just pass an object and it will look
for any function that starts with `"when"` and register that function as a handler for whatever
the rest of the function name is.

Also, components are all inspected this way, so a component with a `'whenRouting()'` will
automatically get `'Routing'` events...

```javascript
let helloComponent = {
    draw: () => {
        return `<div> This is hello content </div>`;
    },
    whenRouting: () => {
        console.log('child component was mounted!');
    }
};
```

## Bundles & Routing
We have cool components, but now we need to organise the source tree, and navigate in a way
that involves the URL and browser history.

### Bundles
A collection of source code and style sheets. Loading bundles will allow the framework to
load the source code and style sheets when the route is matched. The resources (source and
styles) will only loaded once, so you can share resources between components and they
will only be loaded The one time.

```javascript
sux.loadBundles({
    users: {
        route: /users/g,
        source: 'js/components/users.js'
    },
    home: {
        route: /home/g,
        source: [
            'js/fancyTable.js',
            'js/components/home.js',
        ],
        style: [
            'css/components/fairly-common.css',
            'css/components/home.css'
        ]
    }
});

```
In the above example, we have two bundles; one for the `'users'` route, and one for the `'home'` route.
The address is managed in the # of the application (`index.html#hello/there`). This is automatically tracked by the
back/forward of the browser, and has handy events to make use of.

When the route changes, the framework will run through the list testing the regular expression
against the hash value.

### Registered Factories
Because we don't know what route the user will load, we need a way to build components by
name/route. This is what factories do, and what the router makes use of.

Bundles are named (`'home'` and `'users'` in the above example), and their source code
needs to register factories/functions with the framework that will construct instances of
their respective components.

```javascript
sux.registerFactory('home', () => new Home());
```
Now the user will match the regular expression for the `'home'` bundle, and call this
factory to make an instance. This is done with the `getFactory()` function.

```javascript
const factory = await sux.getFactory('home');
const homeCompInstance = factory();

const otherComp = (await sux.getFactory('users'))(userData);
```

NOTE: the `getFactory()` function is asynchronous, so you need to await the call to make
use of the factory. This is because the bundle that the factory is in may not be loaded.
The framework will make sure the bundle source code is loaded before returning the factory.


### Routing
The framework will automatically check the hash value of the application, and when it changes
it will run through the list of bundles to see if the route matches. With a bundle found,
it will call the registered factory for the name of the bundle to create the component.



### 'routeChanged()' handler
As shown above, these `'say/when'` handlers are for global named events, literally all
events to that name. The default router also calls a `'routeChanged()'` optional handler
on your component when the route for that component itself is matched. This is for the
times when the component is set to receive a route path with an ID in it for example
(like `/users/123`), and you you need the component to know that the requested ID has changed.


```javascript
let userDetailsComponent = {
    draw: () => {
        return `<div> This is hello content </div>`;
    },
    routeChanged: (hashPath) => {
        const userId = hashPath.split('/')[1];
    }
};
```
...only routes configured for this component/bundle will trigger `'routeChanged()'`, and
thus it's safe to assume that it can parse off the id that it expects to get.











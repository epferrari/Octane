    /* ------------------------------------------------------- */
	/*                 OCTANE MVC FRAMEWORK                    */
	/* ------------------------------------------------------- */
    
                    // @author Ethan Ferrari
                    // ethanferrari.com/octane
                    // onefiremedia.com
                    // version 0.0.5
                    // January 2015
            
    
	(function($,_,__){
		
       'use strict';
        
        if(!_) { 
            throw new Error('Cannot run Octane. A Lodash (_) compatible utility library is not present. ');
            return false; 
        }
		if(!__) { 
            throw new Error('Cannot run Octane. The doubleUnder (__) utility library not present. ');
            return false; 
        }
		if(window.octane) { 
            throw new Error('Variable "octane" was already defined in global scope. Will be overwritten.');
        }
        
	/* ------------------------------------------------------- */
	// base extension utility constructor
	/* ------------------------------------------------------- */
		
        function OctaneBase(){}
        
        OctaneBase.prototype = {
            extend : function(extension){
               return _.extend(this,extension);
            }
        };
        
        Object.defineProperty(OctaneBase.prototype,'Base',{
            value : OctaneBase,
            writable : false,
            configurable : false
        });
        
		// augment an object with the properties and method of another object
		// overwrites properties by default, set to false to only augment undefined properties
		Object.defineProperty(OctaneBase.prototype,'augment',{
			value: function  (obj,overwrite){
			
						overwrite = _.isBoolean(overwrite) ? overwrite : true;
				        var $this = this;
                        var keys,key,n;
                
						if(_.isObject(obj)){
                            keys = Object.keys(obj),
                            n = keys.length;
                            
							while(n--){
                                key = keys[n];
                                if(overwrite){ // do overwrite, bind methods to current object
                                    this[key] = obj[key];
                                }else { // only write undefined properties
                                    if(!(this[key])) {
                                        this[key] = obj[key];
                                        //this[key] = _.isFunction(obj[key]) ? obj[key].bind($this) : obj[key];
                                    }	
                                }
							}
						}
						return this; // chainable
					},
			writable : false,
			configuarable : false
		});
		
		// quick method to define immutable properties
		Object.defineProperty(OctaneBase.prototype,'define',{
			value : function (isWritable,prop,val){
							
							if(_.isBoolean(arguments[0])){
								isWritable = arguments[0];
								prop = arguments[1];
								val = arguments[2];
							} else {
								// if no writable definition is passed, read first argument as prop
								prop = arguments[0];
								val = arguments[1];
								// default to non-writable
								isWritable = false;	
							}
							
							switch(true){
								case _.isObject(prop):
									var keys = Object.keys(prop);
                                    var key;
                                    
									for (var i=0,n = keys.length; i<n; i++){
										key = keys[i];
										Object.defineProperty(this,key,{
											value : prop[key] ,
											configurable : false,
											writable: isWritable,
											enumerable: true
										});
                                    }
									break;	
								case _.isString(prop):
									Object.defineProperty(this,prop,{
										value : val,
										configurable : false,
										writable : isWritable,
										enumerable:true
									});
									break;
							}
                            return this; // chainable
						},
			writable	: false,
			configuarable : false
		});
		
        /* ------------------------------------------------------- */
	   //          PUBLIC APPLICATION OBJECT
	   /* ------------------------------------------------------- */
        
        
        var Octane = new OctaneBase();
        Octane.initialized = false;
       
		
	/* ------------------------------------------------------- */
	// internal application object and properties
	/* ------------------------------------------------------- */
		
		var _octane = new OctaneBase();
		_octane.define({
				modules		    : {},
				models		    : {},
                Models          : {},
                Collections     : {},
				views		    : {},
				controllers     : {},
                eventRegister   : {}
		});
        
    /* ------------------------------------------------------- */
	// simple promise implementation
	/* ------------------------------------------------------- */
        
        
        function OctanePromise(fn){
            
            if( !_.isFunction(fn)){
                throw 'OctanePromise expects function as first argument';
            }
            state = 'pending';
            this.result = null;
            this.error = null;
            this.define({
                isResolved : function(){
                    return state == 'resolved';
                },
                isRejected : function(){
                    return state == 'rejected';
                },
                isPending : function(){
                    return state == 'pending';
                },
                resolveCallbacks : [],
                rejectCallbacks : []
            });
            
            var resolve = function(data){
                
                state = 'resolved';
                
                var callbacks = this.resolveCallbacks;
                var n = callbacks.length;
                var i=0;
                
                this.define({ 
                    result : data
                });
                for(;i<n;i++){
                    setTimeout(function(){
                        callbacks[i].call && callbacks[i].call(null,data);
                    },0);
                }
             };
            var reject = function(error){
                
                state = 'rejected';
                this.define({ error : error });
                
                var callbacks = this.rejectCallbacks;
                var n = callbacks.length;
                var i=0;
               
                for(;i<n;i++){
                    setTimeout(function(){
                        callbacks[i].call && callbacks[i].call(null,error);
                    },0);
                }
            }
            
            fn.apply(fn,[resolve.bind(this),reject.bind(this)]);
        }
        OctanePromise.resolve = function(data){
            return new OctanePromise(function(resolve){
                resolve(data);
            });
        }
        OctanePromise.reject = function(err){
            return new OctanePromise(function(resolve,reject){
                reject(err);
            });
        }
        
        OctanePromise.prototype = new OctaneBase;
        OctanePromise.prototype.constructor = OctanePromise;
        OctanePromise.prototype.define({
            then : function(resolve,reject){
            
                _.isFunction(resolve) ||( resolve = function(){} );
                _.isFunction(reject) || ( reject = false );
                
                this.resolveCallbacks.push(resolve);
                reject && this.rejectCallbacks.push(reject);
                
                if(this.isResolved()){
                    return resolve(this.result);
                }
                if(this.isRejected()){
                    reject && reject(this.error);
                    return this;
                }
            }
            
        });
        
        Octane.define({
            promisify : function(deferred){
                var args = Array.prototype.slice.call(arguments,1); 
                return new Promise(function(resolve,reject){
                    deferred.apply(deferred,args).then(resolve,reject);
                });
	       }
        });

    /* ------------------------------------------------------- */
	/*       COMPILER, ORDINANCES, AND DESIGNATE HOOK          */
	/* ------------------------------------------------------- */
        
        var Compiler = {
            ordinances : [],
            designate : function(selector,task){
                task._compilerID = Octane.GUID();
                this.ordinances.push({
                    selector   : selector,
                    task        : task
                });    
            },
            run : function(context){
              
                context || (context = document);
                var tasksCompleted;
                var taskRunner = function(ordinance){
                    return new Promise(function(resolve){
                        var selector = ordinance.selector;
                        var task = ordinance.task;
                        var taskID = task._compilerID;
                        var designation; // the value of the defined ordinance attribute
                        
                        _.each(context.querySelectorAll(selector),function(elem){
                            // set hash so we don't re-apply a task
                            elem._compiled || (elem._compiled = {});
                            if(!elem._compiled[taskID]){
                                
                                elem._compiled[taskID] = true;
                                
                                // pass the value of the ordinance to the task
                                var ord = selector.match(/\[(.*)\]/);
                                _.isArray(ord) && (ord = ord[1]);
                                designation = elem.getAttribute(ord);
                                
                                try{
                                    task.apply(null,[elem,designation]);
                                } catch (ex){
                                    Octane.log(ex);
                                }
                            }
                        });
                        resolve();
                    });
                };
              
                tasksCompleted = this.ordinances.map(taskRunner);
                return Promise.all(tasksCompleted);
            }
        };
        
        Octane.define({
            compiler : function(selector,task){
                Compiler.designate.apply(Compiler,[selector,task]);
                return Octane;
            },
            // alias of .compiler
            designate : function(selector,task){
                Compiler.designate.apply(Compiler,[selector,task]);
                return Octane;
            },
            recompile : Compiler.run.bind(Compiler)
        });
	
	/* ------------------------------------------------------- */
	/*                       GUID                              */
	/* ------------------------------------------------------- */		
		
		// set a unique identifier for the DOM element so we don't double count it
		Octane.define({
			GUID : function(){
				var random4 = function() {
					return (((1 + Math.random()) * 0x10000)|0).toString(16).substring(1).toUpperCase();
				};
				return random4() +'-'+ random4() +'-'+ random4() + random4();
			}
		});
	
	/* ------------------------------------------------------- */
	/*                   ERRORS & LOGGING                      */
	/* ------------------------------------------------------- */		
		
		_octane.augment({
			logfile    : [],
			log 	   : function(message){
                 _octane.logfile.push(message);
            }
		});
        
        Octane.define({
            log : function(message){
                Octane.hasModule('Debug') && _octane.log(message);
            }
        });
		
        
        function OctaneError(message){
            this.message = message || 'An Octane error occurred.';
            this.stack = Error().stack;
        }
        
        OctaneError.prototype = Object.create(Error.prototype);
        OctaneError.prototype.constructor = OctaneError;
        OctaneError.prototype.name = 'OctaneError';
        
        Octane.define({
             error : function(message){
                 throw new OctaneError(message);
             }
        });
    
    /* ------------------------------------------------------- */
	/*                     XMLHttpRequest                      */
	/* ------------------------------------------------------- */
        
        function uriEncodeObject(source){
            
            source = _.isObject(source) ? source : {};

            var keys = Object.keys(source);
            var n = keys.length;
            var array = [];

            while(n--) {
             array.push(encodeURIComponent(keys[n]) + "=" + encodeURIComponent(source[keys[n]]));
            }

            return array.join("&");
        }
            
            
        function http(url,method,data,headers){
            return new Promise(function(resolve,reject){
                
                var encoded = uriEncodeObject(data);
                var $headers = {
                    'Content-Type':'application/x-www-form-urlencoded'
                    //'Content-Length':encoded.length
                };
                var request;
                var headerKeys;
                var header;
                var value;
                
                _.extend($headers,headers);
                headerKeys = Object.keys($headers);
                
                try{
                    request = new (window.XMLHttpRequest || window.ActiveXObject)("MSXML2.XMLHTTP.3.0");
                } catch(ex){
                    Octane.error('Could not create XMLHttpRequest object');
                }
                
                request.onreadystatechange = function(){
                    if(request.readyState === 4){
                        new __.Switch({
                            '200' : function(resolve){
                                var response;

                                try {
                                    response = JSON.parse(request.responseText);
                                } catch(ex){
                                    response = request.responseText;
                                }
                                resolve(response);
                            },
                            '404' : function(reslove,reject){
                                reject(Octane.error('The server responded with 400 not found'));
                            },
                            '500' : function(resolve,reject){
                                 reject(Octane.error('An internal server error occurred'));
                            }
                        }).run(request.status,[resolve,reject]);
                    }
                };  
               
                request.open(method,url,true);
                
               for(var i=0,n = headerKeys.length; i<n; i++){
                    header = headerKeys[i];
                    value = $headers[header];
                    request.setRequestHeader(header,value);
                }
                request.send(encoded);
            });
                
            
        }
        
        function Http(url,headers){
            this.url = url;
            this.headers = _.isObject(headers) ? headers : {};
        }
        
        Http.prototype = new OctaneBase();
        Http.prototype.define({
            
            get : function(){
                return http(this.url,'GET',null,this.headers);
            },
            post : function(data){
                return http(this.url,'POST',data,this.headers);
            },    
            put : function(data){
                return http(this.url,'PUT',data,this.headers);
            },
            delete : function(){
                return http(this.url,'DELETE',null,this.headers);
            }
        });
        
        Octane.define({
            http : function(url,headers){
                return new Http(url,headers);
            }
        });
        
        _octane.loadedCache = [];
        
        Octane.define({
            
            getLibrary : function(url){
                return new Promise(function(resolve,reject){
                    
                    var cleanURL = url.replace(/[.\/:]/g,'_');
                    var loaded = document.querySelectorAll('script#'+cleanURL); 
                    var script,content; 
                    
                    if(loaded.length !== 0){
                        // script is loaded
                        Octane.hasLibrary(cleanURL).then(resolve,reject);
                    } else {
                        
                        Octane.handle('script:loaded:'+cleanURL,function(){
                            content = _octane.loadedCache.pop();
                            Octane.addLibrary(cleanURL,content).then(resolve,reject);
                        });
                        Octane.handle('script:failed:'+cleanURL,function(){
                            reject('Script failed to load from '+url);
                        });
                        
                        script = document.createElement('script');
                        script.id = cleanURL;
                        script.src = url;
                        script.onload = function(){
                            Octane.fire('script:loaded:'+cleanURL);
                        };
                        script.onerror = function(){
                            Octane.fire('script:failed:'+cleanURL);
                        };
                        
                        document.body.appendChild(script);
                    }
                });
            },
            jsonp : function(json){
                if(_.isString(json)){
                    try{
                        json = JSON.parse(json);
                    }catch(ex){
                       Octane.log('failed to parse JSON from Octane.jsonp() '+ex.message); 
                    }
                } 
                if(_.isObject(json)){
                    _octane.loadedCache.push(json);
                }       
            }       
        });
      
        
        
	/* ------------------------------------------------------- */
	/*                          EVENTS                         */
	/* ------------------------------------------------------- */		
		
        _octane.eventHandlerMap = {};
        _octane.eventHandler = function(e){
            
            var elem = e.target || e.srcElement;
            var id = elem._guid;
            var handlers = _octane.eventHandlerMap[id] ? _octane.eventHandlerMap[id][e.type] : [];
            var swatch = new __.Switch({
                'function' : function(elem,handler,e){
                   try{
                       handler(e,elem);
                   }catch(ex){/* ignore */}
                },
                'object' : function(elem,handler,e){
                    try{
                        handler.handleEvent(e,elem);
                    }catch(ex){/* ignore */}
                }
            });
            
            try{
                handlers.__forEach(function(handler){
                    swatch.run(__.typeOf(handler),[elem,handler,e]);
                });
            }catch(ex){/* ignore */}
        };
        _octane.addHandler = function (type,elem,handler){
                                    
            var id = elem._guid || (elem._guid = Octane.GUID());
            var map = this.eventHandlerMap;
            try{
                map[id][type].push(handler);
            } catch(ex){
               try{
                    map[id][type] = [];
                    map[id][type].push(handler);
               } catch (ex){
                    map[id] = {};
                    map[id][type] = [];
                    map[id][type].push(handler);
               }
            } 
        };
        
        Octane.define({
			handle		: 	function(type,$elem,$handler){
                                
                                var types = type ? type.split(' ') : [];
                                var n=types.length;
                                var handler, elem;
                                
                                if(arguments.length == 3){
                                    handler = arguments[2];
                                    elem = arguments[1];
                                } else if (arguments.length == 2){
                                    handler = arguments[1];
                                    elem = window;
                                } else {
									return;
								}
                               
                                while(n--){
                                    _octane.addHandler(types[n],elem,handler); 
                                    window.addEventListener(types[n],_octane.eventHandler,false);
                                }
                                return this; // chainable
							},
            drop        :     function(){
                
                                var type,elem,handler;
                                var swatch = new __.Switch({
                                    '3' :function(args){
                                        handler = args[2];
                                        elem = args[1];
                                        type = args[0];
                                        try{
                                            _.pull(_octane.eventHandlerMap[elem._guid][type],handler);
                                        }catch(ex){ /* ignore */ }
                                    },
                                    '2' : function(args){
                                        elem = args[1];
                                        type = args[0];
                                        try{
                                            delete _octane.eventHandlerMap[elem._guid][type];
                                        }catch(ex){ /* ignore */ }
                                    },
                                    '1' : function(args){
                                        elem = arguments[0];
                                        try{
                                            delete _octane.eventHandlerMap[elem._guid];
                                        }catch(ex){ /* ignore */ }
                                    }
                                }).run(arguments.length,[arguments]);
                               
                                return this; // chainable
                        },
			fire 		: 	function(type,detail){
								if(_.isString(type)){
									var e = detail ? __.customEvent(type,detail) : __.createEvent(type);
									window.dispatchEvent(e);
								}
							},
            
            // programatically alert that user data has changed on a data-bound element
            trip : function(elem){

                        var rand = Math.random(),
                            e = __.customEvent('input',{bubbles:true,detail:rand});

                        elem.dispatchEvent && elem.dispatchEvent(e);
                    },
		});
	
        
                    
	
	/* ------------------------------------------------------- */
	/*                       LIBRARIES                         */
	/* ------------------------------------------------------- */	
	
		_octane.libraries = {};
		
        function Library(name,data){
            var $this = this;
            return new Promise(function(resolve,reject){
                if(!_.isObject(data)){
                    reject('invalid library data, not an object');
                } else {
                    var lib = _.isObject(data) ? data : {};
                    $this.name = name;
                    $this.checkout = function(){
                        return lib;
                    };
                    $this.contrib = function(prop,data){
                        if(!lib[prop]){
                            lib[prop] = data;
                        }
                    };
                    resolve(lib);
                }
            });
        }
        
		Octane.define({
			library : function(name,lib){
                if(_.isObject(lib)){
				    return _octane.libraries[name] = new Library(name,lib);
                } else {
                    return Promise.reject('could not create library '+name+'. Data was not an object');
                }
                
			},
            getLib : function(name){
                return Octane.hasLibrary(name).then(function(data){
                    return data;
                });
            },
			hasLibrary : function(name){
                var lib = _octane.libraries[name];
                if(lib instanceof Library){
                    return lib;
                } else {
                    return Promise.reject('Error: Library '+name+' does not exist');
                }
			}
		});
     
    /* ------------------------------------------------------- */
	/*                      VIEW MODEL                        */
	/* ------------------------------------------------------- */		
		
		function ViewModel(){
			this.define({ scope : {} });
            this.parse();
            this.refreshAll();
		}
		
		ViewModel.prototype = new OctaneBase;
		ViewModel.prototype.define({
            // find bound elements on the DOM
			parse	: function(scope){
						
                            scope || (scope = document);
                            var $this = this;
                            this.bindScope = scope.querySelectorAll('[o-bind],[o-update]');
                            var n = this.bindScope.length;

                            while(n--){
                               this.watch(this.bindScope[n]);
                            }
                        },
            // set up a watch on bound elements
			watch : function(elem){
                        
                            var $this = this;
                            var $scope = this.scope;
                            // element hasn't been parsed yet
                            if(!elem._watched){
                                elem._watched = true;
                                if(!elem._guid) elem._guid = Octane.GUID();
                                //this._setFilters(elem);
                                this._watchBinds(elem);
                                this._watchUpdates(elem);
                                //this._watchSyncs(elem);
                            }   
                        },
            /*_watchSyncs : function(elem){
                            
                            var nested = elem.querySelectorAll('[o-sync]');
                            var model = elem.getAttribute('o-sync');
                            var template = new Octane.Template(elem);
                            elem.innerHTML = '';
                            template.save();
                            elem.innerHTML = '';

                            Octane.handle('statechange:'+model,function(e){
                                var model = elem.getAttribute('o-sync');
                                var data = Octane.ViewModel.get(model).get();
                                Octane.Template.get(elem._guid).set(data).renderTo(elem);
                            });
                        },*/
            /*_setFilters : function(elem){
                            var filter = elem.getAttribute('o-filter');
                            if(filter){
                                try{
                                    // split the filter between name and argument, if it has one
                                    filter = filter.split(',');
                                    _octane.filterMap[elem._guid] = filter;
                                } catch (ex){
                                    Octane.log(ex);
                                }
                            }
                        },*/
            _watchBinds : function(elem){
                            
                            var $this = this;
                            var oBind = elem.getAttribute('o-bind');
                            var $scope = this.scope;
                            var deep,l;

                            if(oBind){
                                elem._bind = oBind;

                                Octane
                                .handle('input click select',elem,$this.uptake)
                                .handle('statechange:'+oBind,$this.refresh);
                                
                                deep = oBind.split('.'),
                                l = deep.length;
                                
                                // set event handlers for all levels of model change
                                deep.reduce(function(o,x,i){
                                   var watch;
                                    if(i === 0){
                                        watch = x;
                                    }else{
                                        watch = o+'.'+x;
                                    }
                                    
                                    //edit
									_.isArray($scope[watch]) || ($scope[watch] = []);
									$scope[watch].push({
										key:oBind,
										elem:elem,
										attr:'value'
									});
                                    // end edit

                                    Octane.handle('statechange:'+watch,$this.refresh.bind($this));
                                     return watch;
                                },'');
                                
                                // store reference to element in the ViewModel
                                // with its attr to update and the key to update with 
                                /*deep.reduce(function(o,x,i){
                                    if(i == (l-1)){
                                        var bindTarget = {
                                            key:oBind,
                                            elem:elem,
                                            attr:'value'
                                        };
                                        if(_.isObject(o[x]) ){
                                            o[x].__binds__.push(bindTarget);
                                        }else{
                                            o[x] = {__binds__ :[bindTarget]};
                                        }
                                    } else {   
                                        return o[x] = _.isObject(o[x]) ? o[x] : {__binds__ :[]};
                                    }
                                },$scope);*/
                            } // end if o-bind
                        },
            _watchUpdates : function(elem){
                        
                            var _oUpdate = elem.getAttribute('o-update');
                            var $this = this;
                            var $scope = this.scope;
                            var oUpdate;
                            
                            if(_oUpdate){
                                elem._update = oUpdate;
                                oUpdate = {};

                                // not a JSON string, default to updating HTML value
                                if(_oUpdate.length > 0 && _oUpdate.indexOf("{") !== 0){
                                    oUpdate[_oUpdate] = 'html';
                                } else {
                                    try{
                                        oUpdate = _.invert( JSON.parse(_oUpdate) );
                                    }catch(ex){
                                       Octane.log(ex.message + ' in ViewModel.parse(), element: '+elem +' Error: '+ex );
                                    }
                                }
                                
                                // push element+attr to scope[key] for one-way updates 
                                _.forOwn(oUpdate,function(attr,key){
                                   
                                    var deep = key.split('.');
                                    var l = deep.length;
                                    
                                    // set event handlers for all levels of model change
                                    deep.reduce(function(o,x,i){
                                        var watch;
                                        var index;
                                        if(i === 0){
                                            watch = x;
                                        }else{
                                            watch = o+'.'+x;
                                        }
                                        
										_.isArray($scope[watch]) || ($scope[watch] = []);
                                        
										$scope[watch].push({
											key:key,
											elem:elem,
											attr:attr
										});
                                        
                                        Octane.handle('statechange:'+watch,$this.refresh.bind($this));
                                         return watch;
                                    },'');
                                   
                                    // store reference to element in the ViewModel
                                    // with its attr to update and the model key to update with 
                                    /*deep.reduce(function(o,x,i,arr){

                                        if(i == (l-1)){ // last iteration
                                            var updateTarget = {
                                                key:key,
                                                elem:elem,
                                                attr:attr
                                            };
                                            if(_.isObject(o[x]) ){
                                                o[x].__binds__.push(updateTarget);
                                            }else{
                                                o[x] = { __binds__ : [updateTarget] };
                                            }
                                        } else {
                                            return o[x] = _.isObject(o[x]) ? o[x] : {__binds__:[]};
                                        }
                                    },$scope);*/
                                });
                            }  // end if o-update
            },
            	
			// run event type thru ViewModel scope to update elems/attrs bound to model
			refresh 	: 	function (e){
								
                                // ignore non statechange events
                                if(e.type.split(':')[0] != 'statechange') return;
                
                                // loop bound model datapoint in scope
                                var $update = this._update.bind(this);
                                var $scope = this.scope;
                                // create array of nested keys, 
                                // ex. "statechange:App.loading.message" becomes ["App","loading","message"]
                                /*var updated = e.type ? e.type.replace('statechange:','').split('.') : [];
                                var toUpdate = updated.reduce(function(o,x,i){
                                    return _.isObject(o[x]) ? o[x] : {};   
                                },$scope);
								var targets;
                                console.log('toUpdate',toUpdate);
                                // recursively get targets
                                targets = this._getUpdateTargets(toUpdate);
                                // remove undefined
                                targets = _.compact(targets);
                                // flatten
                                targets = targets.__concatAll();
                                _.each(targets,function(target){
                                   $update(target.key,target.elem,target.attr);
                                });*/ 
                                var key = e.type.replace('statechange:','');
                                _.isArray($scope[key]) && _.each($scope[key],$update); 
                                       
							},
            // recursively look through the ViewModel for targets to update
             _getUpdateTargets : function(object){
                                
                                var keys = Object.keys(object);
                                var $this = this;
                                    
                                return keys.__map(function(key){
                                    var prop = object[key];
                                    var _prop;

                                    if( _.isPlainObject(prop) ){
                                       if( _prop = $this._getUpdateTargets(prop)[0] ){ // nested object, loop it
                                            return _prop;
                                        }
                                    } else if (_.isArray(prop) ){ // prop = __binds__ = array of targets
                                        return prop; 
                                    }
                                });
                            },
            // perform an update on a single
			_update       : function(updateTarget){
                                
                                var viewmodel = this;
                                var key = updateTarget.key;
                                var elem = updateTarget.elem;
                                var attr = updateTarget.attr;
                                var fresh = Octane.get(key);
                                var filter = elem.getAttribute('o-filter');
                                var prop,updater;
                                
                                // remove cached elements no longer on DOM 
                                if(!elem.parentNode){
                                    _.pull(this.scope[key],updateTarget);
                                }
                                
								if(__.isNull(fresh) || __.isUndefined(fresh)){
                                    fresh = '';
                                }
                                // break filter into name and optional parameter to pass as second argument to filtering function
                                filter && ( filter = filter.split(',') );
                                
                                if(attr.indexOf('.') !== -1){ // there is a '.' in the attr, ex. 'style.color'
                                    // update style on element
                                    prop = attr.split('.')[1];

                                    elem.style[prop] = fresh;
                                } else {

                                    updater = new __.Switch({
                                        'html' : function(fresh){
                                            elem.innerHTML = filter ? Octane.applyFilter(filter[0],fresh,filter[1]) : fresh;
                                        },
                                        'text' : function(fresh){
                                            elem.textContent = filter ? Octane.applyFilter(filter[0],fresh,filter[1]) : fresh;
                                        },
                                        'value' : function(fresh){
                                            elem.value = fresh;
                                        },
                                        'src' : function(fresh){
                                            elem.src = fresh;
                                        },
                                        'default' : function(fresh,attr){
                                            elem.setAttribute(attr,fresh);
                                        }
                                    }).run(attr,[fresh,attr]);
                                }
                            },
            // fire statechange on all bound models, thus updating the entire DOM
            // fired once ViewModel at initialization
            // expensive, should be avoided unless absolutely necessary
            refreshAll  : function(){
                            
                                var models = Object.keys(_octane.models);
                                var n = models.length;

                                while(n--){
                                    Octane.fire('statechange:'+models[n]);
                                }
                            },
           
			// respond to user changes to DOM data bound to this model
			uptake		: 	function(event,element){
                                
								var oBind = element._bind;
                                // remove model name from string
                               	var modelName = oBind ? Octane._parseModelName(oBind) : null;
                               	var pointer = oBind ? Octane._parseModelKey(oBind) : null;
                                
                                if(element.tagName == 'TEXT-AREA'){
                                    element.value = element.innerHTML;
                                }
                                if(element.value != Octane.get(oBind) ){
                                   Octane.set(oBind,element.value);
                                }				
							},
            // expenive operation to re-parse the DOM and fire statechange on all bound models
            rescope     : function(){
                                this.parse();
                                this.refreshAll();
                            },
            // integrate a Backbone Model into Octane's data binding system
            bind : function(model,become){
                
                // protected via closure
                var isRegistered = false;
                var registeredTo = null;
                
                // save original methods
                model.__legacy__ = {
                    set : model.set,
                    get : model.get,
                    clear : model.clear
                }
                
                // attach to a named model for data-binding
                _.extend(model,{
                    become : function(name){
                        _octane.models[name] && _octane.models[name].detach();
                        _octane.models[name] = this;
                        isRegistered = true;
                        registeredTo = name;
                        Octane.fire('statechange:'+name);
                        return this;
                    },
                    detach : function(){
                        if( isRegistered ){
                            var name = registeredTo;
                            _octane.models[name] = null;
                            isRegistered = false;
                            registeredTo = null;
                            Octane.fire('statechange:'+name);   
                        }
                        return this;
                    },
                    isRegistered : function(){
                        return isRegistered;
                    },
                    registeredTo : function(){
                        return registeredTo;
                    },
                    set : function(){
                        OctaneModel.set.apply(this,arguments);
                    },
                    get : function(){
                        this.state = this.attributes;
                        return OctaneModel.prototype._get.apply(this,arguments);
                    },
                    clear: function(options) {
                        var attrs = {};
                        for (var key in this.attributes) attrs[key] = void 0;
                        return this.set(attrs, _.extend({}, options, {unset: true}));
                    }
                });
                if(become) model.become(become);
                return model;   
            },
            // remove an integrated Backbone Model
            unbind : function(bind){
                var model = _octane.models[bind];
                if(model){
                    if(model.__legacy__){
                        model.set = model.__legacy__.set;
                        model.get = model.__legacy__.get;
                        model.clear = model.__legacy__.clear;
                    }
                    if(model.isRegistered()){
                        model.detach();
                    }
                    // remove all traces of the intregration
                    delete model.attach;
                    delete model.detach;
                    delete model.isRegistered;
                    delete model.registeredTo;
                    delete model.__legacy__;
                    
                    return model;
                }
            },
            get : function(bind){
                return _octane.models[bind];
            }
		});
        
        
	/* ------------------------------------------------------- */
	/*                         MODELS                          */
	/* ------------------------------------------------------- */
	   
        // base Model factory
		function OctaneModel(data,bind){
            
            var isRegistered = false;
            var registeredTo= null;
            
            this.className = this.className || 'OctaneModel';
            this.define({
                guid : 'model_'+Octane.GUID(),
                state : {},
                become : function(name){
                    _octane.models[name] && _octane.models[name].detach();
                    _octane.models[name] = this;
                    isRegistered = true;
                    registeredTo = name;
                    Octane.fire('statechange:'+name);
                    return this;
                },
                detach : function(){
                    if( isRegistered ){
                        var name = registeredTo;
                        _octane.models[name] = null;
                        isRegistered = false;
                        registeredTo = null;
                        Octane.fire('statechange:'+name);   
                    }
                    return this;
                },
                isRegistered : function(){
                    return isRegistered;
                },
                registeredTo : function(){
                    return registeredTo;
                },
                // aliases to match ViewModel static methods for Backbone models
                bind : function(name){
                    return this.become.apply(this,[name]);
                },
                unbind : function(){
                    return this.detatch.apply(this);
                }
            });
            this.set(this.defaults);
            this.set(data);
            this.initialize && this.initialize.apply(this,arguments);
            if(bind) this.become(bind);
        }
        
        // static methods
        Octane.define.call(OctaneModel,{
            // static factory
            create : function(data,bind){
                return new this(data,bind);
            }, 
            // set method for Backbone models bound with Octane.ViewModel
            // very similar to OctaneModel.prototype._set, begging for a DRY refactor
            set : function(key,val,options){
                    
                    var attrs,attrs,cached,keys,attrKeys;
                    var $this=this;

                    if(__.typeOf(key) == 'object'){
                        attrs = key;
                        options = val;
                    } else {
                        (attrs = {})[key] = val;
                    }

                    _.extend((cached = {}),this.attributes);

                    // run hooks on attrs, which may mutate them or add other properties to attrs
                    if(this.isRegistered()){
                        _.forOwn(attrs,function(value,key){
                            _octane.hooks[$this.registeredTo()+'.'+key] && OctaneModel.prototype._applyHooks.apply($this,[key,attrs]);
                        });
                    }

                    _.forOwn(attrs,function(value,key){
                        var keyArray = key.split('.');
                        var attrKey = keyArray[0];
                        var k = keyArray.length;

                        // run the reducer from OctaneModel._set, but on the cached attrs
                        keyArray.reduce(function(o,x,index){
                            if(index == (k-1)){ // last iteration
                                return o[x] = value;
                            }else{
                                return o[x] = _.isObject(o[x]) ? o[x] : {};
                            }    
                        },cached);

                        if(cached[attrKey] != $this.attributes[attrKey]){
                            // apply model's original set method
                            $this.__legacy__.set.apply($this,[ attrKey,cached[attrKey],options ]);
                            // alert octane listeners
                            if($this.isRegistered()){
                                octane.fire('statechange:'+$this.registeredTo()+'.'+key);
                            }
                        }
                    });

                    return this.attributes;
                }
        }); // end static methods
        
		OctaneModel.prototype = new OctaneBase; 
        // dummies
        OctaneModel.prototype.initialize = function(){};
        OctaneModel.prototype.defaults = {};
        OctaneModel.prototype.constructor = OctaneModel;
		OctaneModel.prototype.define({
            
			_set	: function(){
                        
                        var setObject,keystrings,n,m,key,value;
                        
                        // handle key,value and {key:value}
                        if(_.isString(arguments[0])){
                            setObject = {};
                            setObject[arguments[0]] = arguments[1];
                        } else if(_.isObject(arguments[0])){
                            setObject = arguments[0];
                        } else {
                            return {};
                        }

                        // array for state properties changed
                        keystrings = Object.keys(setObject);
                        n = keystrings.length;
                        
                        // apply any hooks
                        if( this.isRegistered() ){
                            while(n--){
                                _octane.hooks[this.registeredTo()+'.'+keystrings[n]] && this._applyHooks(keystrings[n],setObject);
                            }
                        }
                        
                        // re-measure in case there have been additional properties
                        // added to the setObject via hooks
                        keystrings = Object.keys(setObject);
                        m = keystrings.length;
                
                        // set each key in model state
                        while(m--){
                            key = keystrings[m]
                            value = setObject[key];
                            this._setState(key,value);
                        }
                        // alert any subscribers
                        if( this.isRegistered() ){
                            Octane.fire(this.registeredTo()+':statechange');
                            Octane.fire('statechange:'+this.registeredTo()); // can't remember which is linked to tasks and ViewModel...
                        }

                        return setObject;
                    },
            // use reduce to set a value using a nested key, ex "App.loading.message" would set {App:{loading:{message:value}}}
            _setState : function(keystring,value){
                            
                            var $state = this.state;
                            var keyArray = keystring.split('.');
                            var k = keyArray.length;
                            var modelUpdated;
                            
                            try{
                                keyArray.reduce(function(o,x,index){
                                    if(index == (k-1)){ // last iteration
                                        return o[x] = value;
                                    }else{
                                        return o[x] = _.isPlainObject(o[x]) ? o[x] : {}; // create if object if not already
                                    }    
                                },$state);
                                modelUpdated = true;
                            }catch(e){
                                modelUpdated = false;
                                Octane.log('Unable to set model data "'+keystring+'". Error: '+e);
                            }
                            
                            modelUpdated && this.isRegistered() &&  Octane.fire('statechange:'+this.registeredTo()+'.'+keystring);
                        
                    },
            // helper, applies hooks on changed model state attributes before they get set
            _applyHooks : function(keystring,setObject){
                            
                            if( this.isRegistered() ){
                                var 
                                name = this.registeredTo(),
                                hooks = _octane.hooks[name+'.'+keystring];
                                if(_.isArray(hooks)){
                                    _.each(hooks,function(hook){
                                        _.extend( setObject,hook(setObject));
                                    });
                                }
                            }
                    },
            _unset : function(){
                
                            var
                            keys,
                            toUnset = {};
							
                            if(_.isString(arguments[0])){
                                keys = [ arguments[0] ];
                            } else if(_.isArray(arguments[0])){
                                keys = arguments[0];
                            } else {
                                return;
                            }
                
                            _.each(keys,function(key){
                                toUnset[key] = null;
                            });
                
                            this.set(toUnset);
                        
                        },
            _destroy:   function(){
                            
                            var 
                            keys = Object.keys(this.state),
                            n = keys.length;
                
                            while(n--){
                                delete this.state[keys[n]];
                            }
                            if( this.isRegistered()){
                                this.detach();
                            }
                        },               
			_get	: 	function(keystring){
                
                            var $this = this;
                            var data;

                            if(keystring && _.isString(keystring)){
                               
                                var keyArray = keystring.split('.');
                                var l = keyArray.length;

                                try{
                                    data = keyArray.reduce(function(o,x,i){
                                        return o[x];  
                                    },$this.state);
                                }catch(ex){
                                    data = '';
                                   Octane.log('Unable to get model data "'+keystring+'". Error: '+ex.message);
                                }
                                return data;
                            } else {
                                return this.state;
                            }
						},
            _clear : function(){
                            var 
                            stateProps = Object.keys(this.state),
                            n=stateProps.length,
                            prop;
                            
                            while(n--){
                                prop = stateProps[n];
                                delete this.attributes[prop];
                                this.isRegistered() && Octane.fire('statechange:'+this.registeredTo()+'.'+prop);
                            }
                            // alert any subscribers
                            if( this.isRegistered() ){
                                Octane.fire(this.registeredTo()+':statechange');
                                Octane.fire( 'statechange:'+this.registeredTo() ); // can't remember which is linked to tasks and ViewModel...
                            }
                            return this;
                        },
            reset   : function(defaults){
                            this.clear().set(defaults || this.defaults);
                    }
		});
        // overwritable aliases for extension classes
        OctaneModel.prototype.augment({
            get : function(){
                    return this._get.apply(this,arguments);
            },
            set :  function(){
                    return this._set.apply(this,arguments);
            },
            unset :  function(){
                    return this._unset.apply(this,arguments);
            },
            clear : function(){
                return this._clear();
            },
            destroy : function(){
                this._destroy();
            }
        });
        
        
        
        // prototype chaining Backbone.js style
        var extend = function(){
            
            var className,config,staticMethods,parentFactory,parentDefaults,childFactory,Factory;
            
            if(__.typeOf(arguments[0]) == 'string'){
                className = arguments[0];
                config = _.isPlainObject(arguments[1]) ? arguments[1] : {};
                staticMethods = _.isPlainObject(arguments[2]) ? arguments[2] : {};
            }else{
                config = _.isPlainObject(arguments[0]) ? arguments[0] : {};
                staticMethods = _.isPlainObject(arguments[1]) ? arguments[1] : {};
            }
             
            parentFactory = this;
            parentDefaults = parentFactory.prototype.defaults || {};
           
            if(config.constructor != Object && _.isFunction(config.constructor)){
               childFactory = config.constructor;
            } else {
                childFactory = function(){ 
                    //parentFactory.prototype.initialize.apply(this,arguments);
                    return parentFactory.apply(this,arguments);
                };
            }
            
            _.extend(childFactory,parentFactory,staticMethods);
            
            Factory = function(){ this.constructor = childFactory; };
            Factory.prototype = parentFactory.prototype;
            childFactory.prototype = new Factory;
            
            
            childFactory.prototype.defaults = {};
            childFactory.prototype.className = className || 'OctaneModel';
            _.extend(childFactory.prototype, config);
            _.extend(childFactory.prototype.defaults, parentDefaults, config.defaults);
            
            return childFactory;
        }
        
        OctaneModel.extend = /*OctaneCollection.extend = */ extend;
		
        // a factory for creating constructor functions
        // that can inherit from each other
        // imbued with the static methods define and extend that cannot be overwritten
        var Factory = function(){
            this.initialize.apply(this,arguments);
        };
        Factory.prototype = new OctaneBase;
        Factory.prototype.initialize = function(){};
        Octane.define.apply(Factory,[{
            define : Octane.define
        }]);
        Factory.define('extend',extend);
        
        Octane.define({
            Factory     : Factory,
            Model       : OctaneModel,
            
            // functional alias for calling new octane.Model()
            // returns a named model if it already exists
			model 		: function (name){
                            var model;
                            if(_octane.models[name]){
                                model = _octane.models[name];
                            } else {
                                model = new OctaneModel().become(name);
                            }
                            return model;       
                        },
            // access a bound model's get method from the application object
            get         : function(modelStateKey){
                            
                            var modelName = Octane._parseModelName(modelStateKey);
                            var stateKey = Octane._parseModelKey(modelStateKey);
                            var model = _octane.models[modelName];
                            
                            if(model && stateKey){
                                return model.get(stateKey);
                            } else if(model){
                                return model.get();
                            }
                        },
            // access a bound model's set method from the application object
            set         : function(){
                            
                            var arg0 = arguments[0];
                            var arg1 = arguments[1];
                            var swatch,fresh,keys,i,n;
                            
                            swatch = new __.Switch({
                                'string' : function(arg0,arg1){
                                    fresh = {};
                                    fresh[arg0] = arg1;
                                },
                                'object' : function(arg0){
                                    fresh = arg0;
                                },
                                'default' : function(){
                                    fresh = {};
                                }
                            }).run(__.typeOf(arg0),[arg0,arg1]);
                            
                           
                            keys = Object.keys(fresh);
                            n=keys.length;
                            i=0;
                            for(;i<n;i++){
                               doSet( keys[i] );
                            }
                            
                            // helper
                            function doSet(keystring){
                                
                                var modelName = Octane._parseModelName(keystring);
                                var key = Octane._parseModelKey(keystring);
                                var value = fresh[keystring];
                                var model = _octane.models[modelName];
                                
                                model && model.set(key,value);
                            }
                
                        },
            // access a bound model's unset method from the application object
            unset       : function(){
                            
                            
                            var subject = arguments[0];
                            var toUnset, swatch;
                
                            swatch = new __.Switch({
                                'string' : function(sub){
                                    toUnset = sub.split(',');
                                    toUnset = toUnset.map(function(key){
                                       return key.trim();
                                    });
                                },
                                'array' : function(sub){
                                    toUnset = sub;
                                },
                                'default' : function(){
                                    toUnset = [];
                                }
                            }).run(__.typeOf(subject),[subject]);

                            toUnset.forEach(function(keystring){
                                
                                var  modelName = Octane._parseModelName(keystring);
                                var key = Octane._parseModelKey(keystring);
                                var model = _octane.models[modelName];
                               
                                model && model.unset(key);
                            });
                        },
            // get the model name from a keystring, ex "App.loading.message" would return "App"
            _parseModelName  : function(bind){
                            try {
                                return bind.split('.')[0];
                            } catch (ex){
                               Octane.error('could not parse model name from '+bind+': '+ex.message);
                                return false;
                            }
                        },
            // get the nested key from a keystring, ex "App.loading.message" would return "loading.message"
            _parseModelKey   : function(o_bind){
                            try{
                                return o_bind.split('.').slice(1).join('.');
                            } catch (ex){
                                Octane.error('could not parse model key from '+o_bind+': '+ex.message);
                                return false;
                            }
                        }
            
		});
        
    /* ------------------------------------------------------- */
    /*                       FILTERS                           */
    /* ------------------------------------------------------- */

        _octane.filters = {};
        
        Octane.define({
            // filterFunction as -> function(dataToBeFiltered[,optionalParameter to be passed])
            filter : function(name,filterFunction){
                _octane.filters[name] = filterFunction;
            },
            applyFilter : function(filter,dirty,param){
                var filtered = dirty;
                
                try {
                    filtered = _octane.filters[filter].apply(null,[dirty,param]);
                } catch(ex){
                    Octane.log(ex);
                }
                return filtered;
            }       
        });
        
       
       /* ------------------------------------------------------- */
	   /*                          TASKS                          */
	   /* ------------------------------------------------------- */
        
        
        // param 1 : a model key to listen for change on
        // add param 2 as function(data held in model[key])
        function task(key,$task){
				               
            var cache ={};
            var keyArray = key.split('.');
            
            keyArray.reduce(function(o,x,i,a){
                var watch;
                if(i === 0){
                    watch = x;
                }else{
                    watch = o+'.'+x;
                }
                Octane.handle('statechange:'+watch,function(e){
                    var currentVal = Octane.get(key);
                    if(currentVal != cache[key]){
                        cache[key] = currentVal;
                        $task(currentVal,key);
                    }
                });
                return watch;
            },'');    
        }
        
        Octane.define({ 
            task : function(key,$task){
                task(key,$task);
                return this;
            }
        });
                                
        
    /* ------------------------------------------------------- */
	/*                          HOOKS                          */
	/* ------------------------------------------------------- */
	   
        _octane.hooks = {};
        
        // a function to be applied before the setting of data in the model
        // if one model data value changes depending on another, a hook is the place for that logic
        // key is the incoming data key to parse for, func is the function to apply
         
         Octane.define({ 
             hook : function hook(oBind,func){

                try{
                    _octane.hooks[oBind].push(func);
                } catch(ex){
                    _octane.hooks[oBind] = [];
                    _octane.hooks[oBind].push(func);
                }

                return this; // chainable	
            }
         });
            
    
	/* ------------------------------------------------------- */
	/*                     CONTROLLERS                         */
	/* ------------------------------------------------------- */
		
		function Controller(name,viewID){
			this.define({
				name		: name,
                view        : document.querySelector('o-view#'+viewID)
			});
			
			// add this Controller instance to the _octane's controllers object
            _octane.controllers[name] = this;
		}
		
		Controller.prototype = new OctaneBase;
        Controller.prototype.constructor = Controller;

	
		Octane.define({
			controller 	: function (name,viewID){
							if(!name){
								return new Controller(Octane.GUID(),viewID);
							} else if(!_octane.controllers[name]){
								return new Controller(name,viewID);
							} else {
								return _octane.controllers[name];
							}
						}                    
		});
	
	
	/* ------------------------------------------------------- */
	/*                         MODULES                         */
	/* ------------------------------------------------------- */
		
        
        _octane.moduleConfigs = {};
        _octane.moduleExports = {};
        var bootlog = _octane.bootlog = [];
        
		function OctaneModule (name,dependencies){
            this.initialized = false;
            this.name = name;
            this.dependencies = dependencies;
        }
       
        OctaneModule.prototype = new OctaneBase;
        OctaneModule.prototype.initialize = function(){};
        OctaneModule.prototype.constructor = OctaneModule;
        OctaneModule.prototype.define({
            
            import          	:   function(module){
                                    	return _octane.moduleExports[module];
                                },
            export          	:   function(exports){
                                    
                                    _.isObject(_octane.moduleExports[this.name]) || (_octane.moduleExports[this.name] = {});
                                    
                                    try{
                                        _.extend(_octane.moduleExports[this.name],exports);
                                    }catch (ex){
                                        Octane.log('Could not create exports, '+this.name+' module. '+ex.message);
                                    }
                                },
            _initialize         : function(){
                                    
                                    this.dependenciesLoaded = [];
                                    
                                    var $this = this;
                                    var config = _octane.moduleConfigs[this.name] || {};
                                    var message = [
                                        this.name+': initializing...',
                                        this.name+': successfully initialized!',
                                        this.name+': already initialized, continuing...',
                                        this.name+': failed to initialize!'
                                    ]; 
                                    
                                    if(!this.initialized){
                                        return OctaneModule.checkDependencies(this)
                                            .then(function(){
                                            
                                                bootlog.push(message[1]);
                                                $this.initialize(config);
                                                Octane.App.set({
                                                    "loadingProgress" : (Math.ceil(100 / Object.keys(_octane.modules).length))
                                                });
                                                // hook-in for updating a loading screen
                                                Octane.fire('loaded:module',{
                                                    detail:{moduleID: $this.name }
                                                });
                                                $this.initialized = true;
                                                return Promise.resolve($this);
                                            })
                                            .catch(function(err){
                                                bootlog.push(err);
                                                $this.initialized = false;
                                                return Promise.reject(message[3]);
                                            });   
                                    } else {
                                        return Promise.resolve(this);
                                    }
                                },
            checkDependency     :   function (dependency){
                                        
                                        dependency = dependency ? dependency.trim() : '';
                                        
                                        var $this = this;
                                        var dep = _octane.modules[dependency];
                                        var message = [
                                            this.name+': no dependencies, preparing to initialize...',
                                            this.name+': Could not load module, missing module dependency "'+ dependency +'"',
                                            this.name+': dependency "'+ dependency +'" loaded and initialized, continuing...',
                                            this.name+': dependency "'+ dependency +'" not yet loaded, loading now...'
                                        ];
                                       
                                        switch(true){
                                            case (!dependency || dependency.length === 0) : // no dependency
                                                bootlog.push(message[0]);
                                                return Promise.resolve();
                                            case ( !(dep && dep instanceof OctaneModule) ) : // module is not present, fail
                                                bootlog.push(message[1]);
                                                return Promise.reject(message[1]);
                                            case ( dep && dep.initialized) : // module is already loaded, continue
                                                bootlog.push(message[2]);
                                                // remove dependency from list
                                                this.dependenciesLoaded.push(dependency);
                                                _.pull(this.dependencies,name);
                                                return Promise.resolve();
                                            case (!dep.initialized): // module is not loaded, try to load it
                                                bootlog.push(message[3]);
                                                return dep._initialize().then(function(){
                                                    $this.dependenciesLoaded.push(dependency);
                                                    _.pull($this.dependencies,name);
                                                })
                                                .catch(function(err){
                                                    bootlog.push(err);
                                                    Promise.reject(err);
                                                });
                                        } 
                                }
        });
        
        // Static methods
        _.extend(OctaneModule,{
            checkDependencies   : function(module){

                                        var deps = module.dependencies || [];
                                        var n = deps.length;
                                        var results = [];
                                        var message = [
                                            module.name+': checking dependencies...',
                                            module.name+': no dependencies, preparing to initialize...'
                                        ];

                                        bootlog.push(message[0]);

                                        if(n === 0){
                                            bootlog.push(message[1]);
                                            return Promise.resolve();   
                                        } else {
                                            while(n--){
                                                results.push(module.checkDependency(deps[n]));               
                                            }
                                            return Promise.all(results);
                                        }       
                                }
        });
        
        
		// called at Octane.initialize()
		var initModules = function(initConfig){
			
			_.isPlainObject(initConfig) || (initConfig = {});
            
            // make sure core modules are loaded before 3rd party/app specific modules
            return _octane.modules['StartupUtilities']._initialize()
                .then(function(){
                    return _octane.modules['Router']._initialize();
                })
                .then(function(){
                    return _octane.modules['OctaneModals']._initialize();
                })
                .then(function(){ // precompile
                    return Compiler.run();
                })
                .then(function(){
                
                    var modules = _octane.modules;
                    var moduleNames = Object.keys(modules);
                    var m = moduleNames.length;
                    var modulesLoaded = [];    
                    var tryLoading = function(moduleName){
                        
                        var module = modules[moduleName];
                        _octane.moduleConfigs[moduleName] || (_octane.moduleConfigs[moduleName] = {});
                        _.extend(_octane.moduleConfigs[moduleName],initConfig[moduleName]);
                        if(!module.initialized){
                            
                            bootlog.push(moduleName+': not loaded, loading...');
                            modulesLoaded.push( module._initialize());
                        }
                    };
                    
                    // load each module
                    while(m--){
                        tryLoading( moduleNames[m] );
                    }
                
                    return Promise.all(modulesLoaded);
                })
                .catch(function(err){
                    bootlog.push(err);
                });
		}
		
        
		Octane.define({
            Module      : OctaneModule,
            module     : function(name,dependencies){ 
                            return (_octane.modules[name] = new OctaneModule(name,dependencies) );
                        },
            hasModule : function (name){ 
                            return (_octane.modules[name] && _octane.modules[name].initialized);
                        },
            moduleConfig : function(module,cfg){
                            _.isPlainObject(cfg) && (_octane.moduleConfigs[module] = cfg);
                        }
        });
        
   
        
    /* ------------------------------------------------------- */
	/*                          DOM                            */
	/* ------------------------------------------------------- */
        
        
        
        // global model and controller
        // octane DOM elements
            
        
        Octane.define({ dom : {} });
        
        Octane.define.call(Octane.dom,{
            loadingContainer : function(){
                return document.getElementsByTagName('o-loading-container')[0] || document.createElement('o-loading-container');
            },
            bgContainer : function(){
                return document.getElementsByTagName('o-background')[0] || document.createElement('o-background');
            },
            appContainer : function(){
                return document.getElementsByTagName('o-app-container')[0] || document.createElement('o-app-container');
            },
            viewContainer  : function(){
                return document.getElementsByTagName('o-view-container')[0] || document.createElement('o-view-container');

            },
            modalContainer : function(){
                return document.getElementsByTagName('o-modal-container')[0] || document.createElement('o-modal-container');
            },
            views    : function(){
                return document.getElementsByTagName('o-view') || [];
            }
        });
        
        
    /* ------------------------------------------------------- */
	/*                       TEMPLATES                         */
	/* ------------------------------------------------------- */
        
        _octane.templates = {};
        
        function Template(elem){
            
            var name = elem.getAttribute('name');
            this.id = name || elem._guid || (elem._guid = Octane.GUID());
            this.markup = elem.innerHTML;
            this.content = ''; 
        }
        
        // static methods
        _.extend(Template,{
            
            get : function(id){
                return _octane.templates[id];
            },
            create : function(elem){
                return new Template(elem);
            },
            parse : function (template,data){

                _.isString(template) || (template = ''),
                _.isObject(data) || (data = {});

                var pattern = /\{\{([^{^}]+)\}\}/g;
                var matches = template.match(pattern);
                var n;

                if(_.isArray(matches)){
                    n = matches.length;
                    while(n--){
                        template = this._replace(template,matches[n],data);
                    }  
                }
                return template;
            },
            _replace : function replace (template,match,data){
                        
                // match ex. {{postedBy.firstName @filter:myFilter @param:myParam}}

                var stripped = match.replace(/[{}]+/g,''); // stripped ex. postedBy.firstName @filter:myFilter @param:myParam

                var split = stripped.split(' ');   // split ex. ["postedBy.firstName","@filter:myFilter","@param:myParam"]

                var key = split[0]; // key ex. "postedBy.firstName"

                var filter = split[1];  // filter ex. "@filter:myFilter" 

                var param = split[2];  // param ex. "@param:myParam"

                var regexp = new RegExp("(\\{\\{"+stripped+"\\}\\})","g"); 
                //var regexp = new RegExp("("+match+")","g");

                var nested = key.split('.'); // nested ex. ["postedBy","firstName"]

                var n = nested.length;

                var value = nested.reduce(function (prev,curr,index){
                    if(index == (n-1) && _.isObject(prev)){ // last iteration
                       return prev[curr]; // return value
                    }
                    if(_.isObject(prev)){ 
                        return prev[curr]; // go one level deeper
                    } else { 
                        return null; // no further nesting, value defined in key does not exist
                    }
                },data) || ''; // start with data object passed to template

                // apply filter if present
                if(filter){
                    param && ( param = param.replace('@param:','') );
                    filter = filter.replace('@filter:','');
                    value = Octane.applyFilter(filter,value,param);
                }

                // replace all occurences of {{postedBy.firstName @filter:myFilter @param:myParam}} 
                // in template with filtered value of data.postedBy.firstName, 
                // or data.postedBy.firstName if "myFilter" didn't exist
                return  template.replace(regexp,value); 
            },
            compile : function(scope){
                
                scope || (scope = document);
                
                var $this = this;
                var tmpls = scope.querySelectorAll('script[type="text/octane-template"],o-template');
                var t = tmpls.length;

                while(t--){
                    this._cache(tmpls[t]);
                }        
            },
            _cache : function(elem){
                if(elem){
                    // compile nested templates
                    this.compile(elem);
                    var tmp = this.create(elem);
                    tmp.save();
                    elem.parentElement.removeChild(elem);
                }   
            },
            render : function (template,elem,method){
                
                // a surrogate
                var div = document.createElement('div');
				var firstChild = elem.firstChild;
                var content = template.content;
                var nodes,swatch;
                
                // turn surrogate html into nodes  
                div.innerHTML = content;
                div.normalize();
                nodes = div.childNodes;
                
                swatch = new __.Switch({
                    prepend : function(elem,nodes){
                        var i=0,n=nodes.length,node;
                        for(;i<n;i++){
                            node = nodes[i];
                            if(node && node.nodeType == (Node.ELEMENT_NODE || Node.TEXT_NODE)){
                                elem.insertBefore(node,firstChild);
                            }
                        }
                    },
                    append : function(elem,nodes){
                        var i=0,n=nodes.length,node;
                        for(;i<n;i++){
                            node = nodes[i];
                            if(node && node.nodeType == (Node.ELEMENT_NODE || Node.TEXT_NODE)){
                                elem.appendChild(nodes[i]);
                            }
                        }
                    },
                    replace : function(elem,nodes,content){
                        elem.innerHTML = content;
                    },
                    default : function(elem,nodes,content){
                        elem.innerHTML = content;
                    }
                });
                swatch.run(method,[elem,nodes,content]);
                
                Octane.recompile(elem);
            },
            prototype : new OctaneBase
        });
        
        // instance methods
        Template.prototype.define({
            
            set : function(data){
                this.content = Template.parse(this.markup,data);
                return this; // chainable
            },
            replace : function(elem){
                Template.render(this,elem,'replace');
            },
            renderTo : function(elem){
               Template.render(this,elem,'elem');
            },
            prependTo : function(elem){
                Template.render(this,elem,'prepend');
            },
            appendTo : function(elem){
                Template.render(this,elem,'append');
            },
            save : function(){
                if(!_octane.templates[this.id]){
                    _octane.templates[this.id] = this;
                }else{
                    Octane.log('Could not create template '+this.id+'. Already exists');
                } 
            }
        });
        
        Octane.define({ Template : Template });
            
        
    /* ------------------------------------------------------- */
	/*                     O-CONTROLLER ORDINANCE              */
	/* ------------------------------------------------------- */
        
        Octane.designate('[o-controller]',function(elem,designation){
            
            var obj, action, event, controller, method;

            try{
                obj = JSON.parse(designation);
                event = Object.keys(obj)[0];
                action = obj[event];
            }catch(ex){
                event = 'click';
                action = designation;
            }

            controller = action.split('.')[0];
            method = action.split('.')[1];

            elem.addEventListener(event,function(e){
                var $controller = _octane.controllers[controller];
                try{
                    $controller[method].apply($controller,[elem]);
                } catch (ex){
                    Octane.log(ex);
                }
            });
        });
     
    /* ------------------------------------------------------- */
	/*                 O-SYNC ORDINANCE               */
	/* ------------------------------------------------------- */
        
        Octane.designate('[o-sync]',function(elem,model){
            
            //var nested = elem.querySelectorAll('[o-sync]');
            //Octane.recompile(elem);
            var template = new Octane.Template(elem);
            template.save();
            elem.innerHTML = '';

            Octane.handle('statechange:'+model,function(e){
                var data = Octane.ViewModel.get(model).get();
                Octane.Template.get(elem._guid).set(data).renderTo(elem);
            });
        });
                        
    /* ------------------------------------------------------- */
	/*                          INIT                           */
	/* ------------------------------------------------------- */
        
        
        
        Octane.define({
            initialize : function initialize (config){
                
                _.isObject(config) ||(config={});
                
                // don't reinitialize
                if(Octane.initialized){ return }
                else { Octane.define({initialized : true }) }
               
                // parse the DOM initially to create virtual DOM model
                Octane.define({
                    // default application models
                    ViewModel   : new ViewModel(),
                    App         : new OctaneModel().become('App'),
                    uiMessages  : new OctaneModel().become('uiMessages'),
                    uiStyles    : new OctaneModel().become('uiStyles')
                });
                
                Octane.App.set({
                    loadingProgress : 0,
                    name : config.appName
                });
                
                Octane.hook('App.loadingProgress',function($state){
                    var currentProgress = Octane.get('App.loadingProgress') || 0;
                    $state.loadingProgress = currentProgress + $state.loadingProgress;
                    return $state;
                });
                
                // add debugging support if module included, 
                // pass internal _octane app object as module config
                if(_octane.modules['Debug']){
                    config.Debug = {protected : _octane};
                }
                Octane.Template.compile();
                // load modules -> compile -> ready
                return initModules(config)
                    .then(function(){
                        return Compiler.run();
                    })
                    .then(function(){
                        Octane.fire('octane:ready');    
                    });
            }
        });
        
        window.octane = window.$o = Octane;
        
	})($,_,__);
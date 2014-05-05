!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.IMVVM=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict'

var IMVVM = _dereq_('./src/imvvm.js');

module.exports = IMVVM;
},{"./src/imvvm.js":3}],2:[function(_dereq_,module,exports){

var utils = _dereq_('./utils');
var extend = utils.extend;

exports.getInitialState = function(appNamespace, domainModel, stateChangedHandler, enableUndo) {

	if(typeof stateChangedHandler !== 'function'){
		throw new TypeError('stateChangedHandler must be a function!');
	}

	enableUndo === void(0) ? true : enableUndo;

	var ApplicationDataContext,
		appState = {},
		dataContexts = {},
		domain,
		links = {},
		watchedDataContexts = {},
		dataContext,
		transientState = {},
		processedState = {},
		watchedState,
		watchedItem,
		watchedProp,
		watchedDataContext,
		link,
		calledBack = false;

	var appStateChangedHandler = function(caller, newState, newAppState, callback) {
		
		var nextState = {},
			prevState = void(0),
			redoState = void(0),
			newStateKeys,
			keyIdx,
			transientStateKeysLen,
			dataContext,
			linkedDataContext,
			processedStateKeys = [],
			processedStateKeysLen,
			watchedField,
			subscribers,
			subscriber;

		if(typeof newAppState === 'function'){
			callback = newAppState;
			newAppState = {};
		}

		newState = newState || {};
		newStateKeys = Object.keys(newState);

		//Check to see if appState is a ready made state object. If so
		//pass it straight to the stateChangedHandler. If a callback was passed in
		//it would be assigned to newState
		if(Object.getPrototypeOf(newState).constructor.classType === "DomainViewModel") {

			nextState = extend(newState);
			prevState = newState.previousState;
			redoState = newAppState;
			//Need to reset ViewModel with instance object so that setState is associated with
			//the current ViewModel. This reason this ccurs is that when a ViewModel is created it
			//assigns a setState function to all instance fields and binds itself to it. When undo is called
			//the data is rolled back but viewModels are not recreated and therefore the setState functions
			//are associated with outdated viewModels and returns unexpected output. So to realign the ViewModels
			//with setState we recreate them.
			for(dataContext in domain){
				nextState[dataContext] = new dataContexts[dataContext](nextState[dataContext]);
			}

			//relink
			for(dataContext in domain){
				if(domain.hasOwnProperty(dataContext)){
					for(linkedDataContext in links[dataContext]){
						if(links[dataContext].hasOwnProperty(linkedDataContext)){
							nextState[dataContext].state[links[dataContext][linkedDataContext]] =
								(linkedDataContext in domain) ? extend(nextState[linkedDataContext].state) :
									nextState[linkedDataContext];
						}
					}
				}
			}

			if(typeof callback === 'function'){
				appState = new ApplicationDataContext(nextState, prevState, redoState, enableUndo);
				callback(appState);
				return;
			}
		
		} else {

			if(!!newStateKeys.length){
				if(caller === appNamespace){
					nextState = extend(newState);
				} else {
					nextState[caller] = extend(newState);
				}
			}
			transientState = extend(nextState, transientState, newAppState);
			transientStateKeys = Object.keys(transientState);
			if(transientStateKeys.length === 0){
				return;
			}

			transientStateKeysLen = transientStateKeys.length - 1;
			
			for (keyIdx = transientStateKeysLen; keyIdx >= 0; keyIdx--) {
				if(transientStateKeys[keyIdx] in domain){
					nextState[transientStateKeys[keyIdx]] = extend(appState[transientStateKeys[keyIdx]], transientState[transientStateKeys[keyIdx]]);
					nextState[transientStateKeys[keyIdx]] = new dataContexts[transientStateKeys[keyIdx]](nextState[transientStateKeys[keyIdx]]);
				} else {
					nextState[transientStateKeys[keyIdx]] = transientState[transientStateKeys[keyIdx]];
				}
			};

			processedState = extend(processedState, nextState);

			//Triggers
			nextState = extend(appState, processedState);

			transientState = {};
			for (keyIdx = transientStateKeysLen; keyIdx >= 0; keyIdx--) {
				if(transientStateKeys[keyIdx] in watchedDataContexts){
					for(watchedField in watchedDataContexts[transientStateKeys[keyIdx]]){
						if(watchedDataContexts[transientStateKeys[keyIdx]].hasOwnProperty(watchedField)){
							if(newStateKeys.indexOf(watchedField) !== -1){
								subscribers = watchedDataContexts[transientStateKeys[keyIdx]][watchedField];
								for(subscriber in subscribers){
									if(subscribers.hasOwnProperty(subscriber)){
										
										//Cross reference dataContext link Phase
										if(subscriber in links){
											for(dataContext in links[subscriber]){
												if(links[subscriber].hasOwnProperty(dataContext)){
													nextState[subscriber].state[links[subscriber][dataContext]] =
														(dataContext in domain) ? extend(nextState[dataContext].state) :
															nextState[dataContext];
												}
												if(dataContext in links){
													for(dataContext2 in links[dataContext]){
														if(links[dataContext].hasOwnProperty(dataContext2)){
															nextState[dataContext].state[links[dataContext][dataContext2]] =
																(dataContext2 in domain) ? extend(nextState[dataContext2].state) :
																	nextState[dataContext2];
														}
													}
												}
											}
										}
										transientState = extend(transientState, subscribers[subscriber].call(appState[subscriber],
											nextState[transientStateKeys[keyIdx]][watchedField],
											appState[transientStateKeys[keyIdx]][watchedField], watchedField, transientStateKeys[keyIdx]));
									}
								}
							}
						}
					}
				}
			};
			if(!!Object.keys(transientState).length){
				appStateChangedHandler(void(0), {}, transientState);
				return;
			}
			
			//Link Phase
			processedStateKeys = Object.keys(processedState);
			processedStateKeysLen = processedStateKeys.length - 1;
			for (keyIdx = processedStateKeysLen; keyIdx >= 0; keyIdx--) {
				if(caller === appNamespace){
					if(processedStateKeys[keyIdx] in links[appNamespace]){
						for(dataContext in links[appNamespace][processedStateKeys[keyIdx]]){
							if(links[appNamespace][processedStateKeys[keyIdx]].hasOwnProperty(dataContext)){
								nextState[dataContext].state[links[appNamespace][processedStateKeys[keyIdx]][dataContext]] =
									nextState[processedStateKeys[keyIdx]];
							}
							if(dataContext in links){
								for(dataContext2 in links[dataContext]){
									if(links[dataContext].hasOwnProperty(dataContext2)){
										nextState[dataContext].state[links[dataContext][dataContext2]] =
											(dataContext2 in domain) ? extend(nextState[dataContext2].state) :
												nextState[dataContext2];
									}
								}
							}
						}
					}
				} else {
					if(processedStateKeys[keyIdx] in links){
						for(dataContext in links[processedStateKeys[keyIdx]]){
							if(links[processedStateKeys[keyIdx]].hasOwnProperty(dataContext)){
								nextState[processedStateKeys[keyIdx]].state[links[processedStateKeys[keyIdx]][dataContext]] =
									(dataContext in domain) ? extend(nextState[dataContext].state) :
										nextState[dataContext];
							}
							if(dataContext in links){
								for(dataContext2 in links[dataContext]){
									if(links[dataContext].hasOwnProperty(dataContext2)){
										nextState[dataContext].state[links[dataContext][dataContext2]] =
											(dataContext2 in domain) ? extend(nextState[dataContext2].state) :
												nextState[dataContext2];
									}
								}
							}
						}
					}
				}
	    }

			prevState = calledBack ? appState.previousState : appState;

		}

		if(!!prevState){
			Object.freeze(prevState);
		}

		appState = new ApplicationDataContext(nextState, prevState, redoState, enableUndo);
		Object.freeze(appState);
		Object.freeze(appState.state);

		if(typeof callback === 'function'){
			calledBack = true;
			callback(appState);
			return;
		}
		//All the work is done! -> Notify the View
		stateChangedHandler(appState);
		calledBack = false;
		transientState = {};
		processedState = {};

	};

	//Initialize Application Data Context
	ApplicationDataContext = domainModel.call(this, appStateChangedHandler.bind(this, appNamespace));
	appState = new ApplicationDataContext(void(0), void(0), void(0), enableUndo);
  appState.state = appState.state || {};

	domain = appState.constructor.originalSpec.getDomainDataContext();
	delete appState.constructor.originalSpec.getDomainDataContext;

	//Initialize all dataContexts
	for(dataContext in domain){
		if(domain.hasOwnProperty(dataContext)){
			dataContexts[dataContext] = domain[dataContext].call(this, appStateChangedHandler.bind(this, dataContext));
			appState.state[dataContext] = new dataContexts[dataContext](appState.state[dataContext], true);
    }
  }

  //Store links
	for(dataContext in domain){
		if(domain.hasOwnProperty(dataContext)){
			if('getWatchedState' in appState[dataContext].constructor.originalSpec){
				watchedState = appState[dataContext].constructor.originalSpec.getWatchedState();
				for(watchedItem in watchedState){
					if(watchedState.hasOwnProperty(watchedItem)){
						if(watchedItem in domain || watchedItem in appState.state){
							if('alias' in watchedState[watchedItem]){
								if(!(dataContext in links)){
									links[dataContext] = {};
								}
								links[dataContext][watchedItem] = watchedState[watchedItem].alias;	

								if(!(watchedItem in domain)){
									if(!(appNamespace in links)){
										links[appNamespace] = {};
									}
									if(!(dataContext in links[appNamespace])){
										links[appNamespace][watchedItem] = {};
									}
									links[appNamespace][watchedItem][dataContext] = watchedState[watchedItem].alias;
								}
							}
							for(watchedProp in watchedState[watchedItem].fields){
								if(watchedState[watchedItem].fields.hasOwnProperty(watchedProp)){
									if(watchedItem in domain){
										watchedDataContext = {};
										if(!(watchedItem in watchedDataContexts)){
											watchedDataContexts[watchedItem] = {};
										}
										watchedDataContext[watchedProp] = {};
										watchedDataContext[watchedProp][dataContext] = watchedState[watchedItem].fields[watchedProp];
										watchedDataContexts[watchedItem] = watchedDataContext;
									}
								}
							}
						}
					}
				}
			}
		}
	}

	//apply links
	for(dataContext in domain){
		if(domain.hasOwnProperty(dataContext)){
			for(link in links[dataContext]){
			  if(links[dataContext].hasOwnProperty(link)){
			    appState[dataContext].state[links[dataContext][link]] = (link in domain) ? extend(appState[link].state): appState[link];
			  }
			}
		}
	}
	
	//reinitialize with all data in place
	for(dataContext in domain){
		if(domain.hasOwnProperty(dataContext)){
			appState.state[dataContext] = new dataContexts[dataContext](appState.state[dataContext]/*, true*/);
    }
  }

	appState = new ApplicationDataContext(appState, void(0), void(0), enableUndo);
	Object.freeze(appState.state);
	Object.freeze(appState);
	return appState;
};
},{"./utils":8}],3:[function(_dereq_,module,exports){

var model = _dereq_('./imvvmModel');
var viewModel = _dereq_('./imvvmViewModel');
var domainModel = _dereq_('./imvvmDomainViewModel');
var mixin = _dereq_('./mixin');

var utils = _dereq_('./utils');
var extend = utils.extend;
var mixInto = utils.mixInto;

var ModelBase = function(){};
var ViewModelBase = function(){};
var DomainViewModelBase = function(){};

mixInto(ModelBase, model.Mixin);
mixInto(ViewModelBase, viewModel.Mixin);
mixInto(DomainViewModelBase, domainModel.Mixin);

var IMVVMClass = {
  createClass: function(ctor, classType, spec){

    var Constructor = function(){};
    Constructor.prototype = new ctor();      
    Constructor.prototype.constructor = Constructor;

    var DescriptorConstructor = Constructor;

    var ConvenienceConstructor = function(stateChangedHandler) {
      var descriptor = new DescriptorConstructor();
      return descriptor.construct.apply(ConvenienceConstructor, arguments);
    };

    ConvenienceConstructor.componentConstructor = Constructor;
    Constructor.ConvenienceConstructor = ConvenienceConstructor;
    
    ConvenienceConstructor.originalSpec = spec;

    // Expose the convience constructor on the prototype so that it can be
    // easily accessed on descriptors. E.g. <Foo />.type === Foo.type and for
    // static methods like <Foo />.type.staticMethod();
    // This should not be named constructor since this may not be the function
    // that created the descriptor, and it may not even be a constructor.
    ConvenienceConstructor.type = Constructor;
    Constructor.prototype.type = Constructor;

    ConvenienceConstructor.classType = classType;
    Constructor.prototype.classType = classType;

    ConvenienceConstructor.getDescriptor = function(){
      var descriptor = {},
        proto = this.prototype,
        viewModels = {},
        autoFreeze = [],
        aliases = {},
        key;

      if('__processedSpec__' in this.originalSpec){
        return this.originalSpec.__processedSpec__;
      }

      for(key in this.originalSpec){
        if(this.originalSpec.hasOwnProperty(key)){
          if('get' in this.originalSpec[key] || 'set' in this.originalSpec[key]){
            //assume it is a descriptor
            this.originalSpec[key].enumerable = true;
            if('viewModel' in this.originalSpec[key]) {
              viewModels[key] = this.originalSpec[key].viewModel;
              delete this.originalSpec[key].viewModel;
              delete this.originalSpec[key].set;
            } else {
              if('aliasFor' in this.originalSpec[key]){
                aliases[this.originalSpec[key].aliasFor] = key;
                delete this.originalSpec[key].aliasFor;
              }

              if('kind' in this.originalSpec[key]){
                if(this.originalSpec[key].kind === 'pseudo'){
                  this.originalSpec[key].enumerable = false;
                } else if (this.originalSpec[key].kind === 'instance' ||
                  this.originalSpec[key].kind === 'array') { //'instance' || 'array'
                  autoFreeze.push({fieldName: key, kind: this.originalSpec[key].kind});
                } else {
                  throw new TypeError('"'+this.originalSpec[key].kind +'" '+
                    'is not a valid "kind" value. Valid values are "pseudo","instance" and "array". Please review field "' + key + '".');
                }
                delete this.originalSpec[key].kind;
              }
            }
            descriptor[key] = this.originalSpec[key];
          } else {
            if(key !== 'getInitialState' && key !== 'getWatchedState'){
              proto[key] = this.originalSpec[key];
            }
          }
        }
      }

      if(!!Object.keys(viewModels).length){
        this.originalSpec.getDomainDataContext = function(){
          return viewModels;
        }
      }

      this.originalSpec.__processedSpec__ = { 
        descriptor: descriptor,
        proto: proto,
        originalSpec: this.originalSpec || {},
        freezeFields: autoFreeze,
        aliases: aliases
      };

      return this.originalSpec.__processedSpec__;
    };

    return ConvenienceConstructor;
  },
};

var IMVVM = {
  createModel: IMVVMClass.createClass.bind(this, ModelBase, 'Model'),
  createViewModel: IMVVMClass.createClass.bind(this, ViewModelBase, 'ViewModel'),
  createDomainViewModel: IMVVMClass.createClass.bind(this, DomainViewModelBase, 'DomainViewModel'),
  mixin: mixin,
  extend: extend
};

module.exports = IMVVM;

},{"./imvvmDomainViewModel":4,"./imvvmModel":5,"./imvvmViewModel":6,"./mixin":7,"./utils":8}],4:[function(_dereq_,module,exports){

var utils = _dereq_('./utils');
var extend = utils.extend;

var IMVVMDomainViewModel = {
  Mixin: {
    construct: function(stateChangedHandler){
      
      var desc = this.getDescriptor();
      desc.proto.setState = stateChangedHandler;

      desc.proto.revert = function(){
        this.setState(this.previousState, !!this.previousState ? this : void(0));
      };

      desc.proto.advance = function(){
        if(this.canAdvance){
          this.setState(this.nextState, this.nextState.nextState);
        }
      };

      var dataContext = function(nextState, prevState, redoState, enableUndo) {
        
        var freezeFields = desc.freezeFields,
          domainModel = Object.create(desc.proto, desc.descriptor),
          fld;
        
        if(!!enableUndo){
          if(!!prevState){
            Object.defineProperty(domainModel, 'previousState', {
              configurable: false,
              enumerable: false,
              writable: false,
              value: prevState
            });
            Object.defineProperty(domainModel, 'canRevert', {
              configurable: false,
              enumerable: false,
              writable: false,
              value: true
            });
          } else {
            Object.defineProperty(domainModel, 'canRevert', {
              configurable: false,
              enumerable: false,
              writable: false,
              value: false
            });
          }
          if(!!redoState && 'state' in redoState){
            Object.defineProperty(domainModel, 'nextState', {
              configurable: false,
              enumerable: false,
              writable: false,
              value: redoState
            });
            Object.defineProperty(domainModel, 'canAdvance', {
              configurable: false,
              enumerable: false,
              writable: false,
              value: true
            });
          } else {
            Object.defineProperty(domainModel, 'canAdvance', {
              configurable: false,
              enumerable: false,
              writable: false,
              value: false
            });
          }
        }

        if(nextState === void(0)){
          //Add state prop so that it can be referenced from within getInitialState
          nextState = ('getInitialState' in desc.originalSpec) ? desc.originalSpec.getInitialState.call(domainModel) : {};
        } else if('state' in nextState){
          delete nextState.state;
        
          //Need to have 'state' prop in domainModel before can extend domainModel to get correct state
          Object.defineProperty(domainModel, 'state', {
            configurable: true,
            enumerable: false,
            writable: true,
            value: nextState
          });
          nextState = extend(nextState, domainModel);
        }

        //freeze arrays and model instances and initialize if necessary
        for (fld = freezeFields.length - 1; fld >= 0; fld--) {
          if(freezeFields[fld].kind === 'array'){
            nextState[freezeFields[fld].fieldName] = nextState[freezeFields[fld].fieldName] || [];
            Object.freeze(nextState[freezeFields[fld].fieldName]);
          } else {
            throw new TypeError('kind:"instance" can only be specified in a ViewModel.');
          }
        };

        Object.defineProperty(domainModel, 'state', {
          configurable: false,
          enumerable: false,
          writable: false,
          value: nextState
        });

        return domainModel;
      };
      
      return dataContext;
    }
  }
};

module.exports = IMVVMDomainViewModel;

},{"./utils":8}],5:[function(_dereq_,module,exports){

var utils = _dereq_('./utils');
var extend = utils.extend;

var IMVVMModel = {
  Mixin: {
    construct: function(stateChangedHandler){

      var desc = this.getDescriptor();
      
      var dataContext = function(nextState, extendState, initialize) {
        var freezeFields = desc.freezeFields,
          fld,
          model = Object.create(desc.proto, desc.descriptor);

        if(nextState === void(0)){
          initialize = true;
        } else if(typeof nextState === 'boolean'){
          initialize = nextState;
          nextState = void(0);
        } else if(typeof extendState === 'boolean'){
          initialize = extendState;
          extendState = void(0);
        }
        nextState = extend(nextState, extendState);

        Object.defineProperty(model, 'state', {
          configurable: true,
          enumerable: false,
          writable: true,
          value: nextState
        });

        nextState = extend(nextState, model);
        
        if(initialize){
          for(var aliasFor in desc.aliases){
            if(desc.aliases.hasOwnProperty(aliasFor) && aliasFor in nextState){
              nextState[desc.aliases[aliasFor]] = nextState[aliasFor];
              delete nextState[aliasFor];
            }
          }
          if('getInitialState' in desc.originalSpec){
            nextState = extend(nextState, desc.originalSpec.getInitialState.call(model));
          }
        }

        //freeze arrays and model instances and initialize if necessary
        for (fld = freezeFields.length - 1; fld >= 0; fld--) {
          if(freezeFields[fld].kind === 'array'){
            nextState[freezeFields[fld].fieldName] = nextState[freezeFields[fld].fieldName] || [];
            Object.freeze(nextState[freezeFields[fld].fieldName]);
          } else {
            throw new TypeError('kind:"instance" can only be specified in a ViewModel.');
          }
        };

        Object.defineProperty(model, 'state', {
          configurable: false,
          enumerable: false,
          writable: false,
          value: nextState
        });

        model.__stateChangedHandler = (function(){
            return stateChangedHandler;
        })();

        return Object.freeze(model);
      };
      return dataContext;
    }
  }
};

module.exports = IMVVMModel;

},{"./utils":8}],6:[function(_dereq_,module,exports){

var utils = _dereq_('./utils');
var extend = utils.extend;

var IMVVMViewModel = {
  Mixin: {
    construct: function(stateChangedHandler){

      var desc = this.getDescriptor(this);
      desc.proto.setState = stateChangedHandler;

      var dataContext = function(nextState, initialize) {

        //nextState has already been extended with prevState in core
        nextState = nextState || {};
        nextState = ('state' in nextState ? nextState.state : nextState);
        
        var freezeFields = desc.freezeFields,
          fld,
          viewModel = Object.create(desc.proto, desc.descriptor),
          tempDesc,
          tempModel;

        Object.defineProperty(viewModel, 'state', {
          configurable: true,
          enumerable: false,
          writable: true,
          value: nextState
        });

        if(initialize){
          nextState = ('getInitialState' in desc.originalSpec) ?
            extend(nextState, desc.originalSpec.getInitialState.call(viewModel)) : nextState;
          
          Object.defineProperty(viewModel, 'state', {
            configurable: true,
            enumerable: false,
            writable: true,
            value: nextState
          });

        }

        //freeze arrays and viewModel instances
        for (fld = freezeFields.length - 1; fld >= 0; fld--) {
          if(freezeFields[fld].kind === 'instance'){
              if(viewModel[freezeFields[fld].fieldName]){
                tempDesc = viewModel[freezeFields[fld].fieldName].constructor.originalSpec.__processedSpec__;
                tempModel = Object.create(tempDesc.proto, tempDesc.descriptor);
                
                tempModel.__stateChangedHandler = (function(fld){
                  return viewModel[fld].__stateChangedHandler;
                })(freezeFields[fld].fieldName);

                Object.defineProperty(tempModel, 'state', {
                  configurable: true,
                  enumerable: false,
                  writable: true,
                  value: viewModel[freezeFields[fld].fieldName].state
                });

                tempModel.__proto__.setState = function(state, callback){ //callback may be useful for DB updates
                  this.__stateChangedHandler.call(viewModel, extend(this.state, state), callback);
                };

                Object.freeze(viewModel[freezeFields[fld].fieldName]);
              }

          } else {
            nextState[freezeFields[fld].fieldName] = nextState[freezeFields[fld].fieldName] || [];
            Object.freeze(nextState[freezeFields[fld].fieldName]);
          }
        };

        Object.defineProperty(viewModel, 'state', {
          configurable: false,
          enumerable: false,
          writable: false,
          value: nextState
        });
        
        return Object.freeze(viewModel);

      };
      return dataContext;
    }
  }
};

module.exports = IMVVMViewModel;

},{"./utils":8}],7:[function(_dereq_,module,exports){

var core = _dereq_('./core');
var NAMESPACE = '__IMVVM__';

var mixin = {
	stateChangedHandler: function(dataContext){
  	this.setState({domainDataContext: dataContext})
  },
	getInitialState: function(){
		var dataContext = core.getInitialState(NAMESPACE, this.props.domainModel,
			this.stateChangedHandler, this.props.enableUndo);
		return {domainDataContext: dataContext};
	}
};

module.exports = mixin;
},{"./core":2}],8:[function(_dereq_,module,exports){

var utils = {
  
  extend: function () {
    var newObj = {};
    for (var i = 0; i < arguments.length; i++) {
      var obj = arguments[i];
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          newObj[key] = obj[key];
        }
      }
    }
    return newObj;
  },

  mixInto: function(constructor, methodBag) {
    var methodName;
    for (methodName in methodBag) {
      if (!methodBag.hasOwnProperty(methodName)) {
        continue;
      }
      constructor.prototype[methodName] = methodBag[methodName];
    }
  }
  
};

module.exports = utils;
},{}]},{},[1])
(1)
});
'use strict';

var IMVVM = IMVVM || {};

var IMVVMBase = function() {};

var IMVVMInterface = {
  //setState: null,
  //getInitialState: null,
  init: function(){
    return this.DataContext();
  }
};

var uuid = function () {
  /*jshint bitwise:false */
  var i, random;
  var uuid = '';

  for (i = 0; i < 32; i++) {
    random = Math.random() * 16 | 0;
    if (i === 8 || i === 12 || i === 16 || i === 20) {
      uuid += '-';
    }
    uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random))
      .toString(16);
  }

  return uuid;
};

var extend = function () {
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
};

var mixInto = function(constructor, methodBag) {
  var methodName;
  for (methodName in methodBag) {
    if (!methodBag.hasOwnProperty(methodName)) {
      continue;
    }
    constructor.prototype[methodName] = methodBag[methodName];
  }
};


var IMVVMModel = {
  Mixin: {
    construct: function(raiseStateChangeHandler){
      var key, descriptor = {};
      var proto = this.prototype;
      var Model = this.classType === 'Model';
      var ViewModel = this.classType === 'ViewModel';
      var AppViewModel = this.classType === 'AppViewModel';
      var originalSpec = this.originalSpec || {};
      
      for(key in this.originalSpec){
        if(this.originalSpec.hasOwnProperty(key)){
          if('get' in this.originalSpec[key] || 'set' in this.originalSpec[key]){
            //assume it is a descriptor
            descriptor[key] = this.originalSpec[key];
          } else {
            proto[key] = this.originalSpec[key];
          }
        }
      }
      if(!Model){
        proto.setState = raiseStateChangeHandler;
      }
      proto.extend = extend;
      var dataContext = function(state, withContext, oldState) {
        if(ViewModel){
          proto.DataContext = dataContext;
          if(!('init' in proto)){
            proto.init = function(){
              return this.DataContext();
            }
          }
        }
        if(AppViewModel){

          //bind true
          proto.DataContext = function(newState, callback, initialize){
            return proto.setState(newState, callback, true);
          }
          if(!('init' in proto)){
            proto.init = function(){
              return this.DataContext();
            }
          }
        }
        var model = Object.create(proto, descriptor);
        if(Model){
          var argCount = arguments.length;
          var lastIsBoolean = typeof Array.prototype.slice.call(arguments, -1)[0] === 'boolean';
          if(argCount === 1){
            if(lastIsBoolean){
              withContext = state;
              state = {};
            } else {
              //state = state || {};
              withContext = true;
            }
          } else if(argCount === 2){
            if(!lastIsBoolean){
              oldState = withContext;
              withContext = true;
            }
          } else if(argCount === 3){
            if(lastIsBoolean){
              var temp = withContext;
              withContext = oldState;
              oldState = temp;
            } 
          } else {
            state = {};
            withContext = true;
          }
          
          if(originalSpec.getInitialState){
            state = extend(state, originalSpec.getInitialState(state, oldState));
          }

          if(withContext){
            //This will self distruct
            Object.defineProperty(model, 'context', {
              configurable: true,
              enumerable: true,
              set: function(context){
                this.setState = raiseStateChangeHandler(context);
                delete this.context;
              }
            });
          }
        } else {
          state = state || {};
          if(ViewModel){
            state = extend(state, withContext);

            if(originalSpec.getInitialState){
              state = extend(state, originalSpec.getInitialState(state, oldState));
            }
          
            Object.defineProperty(model, 'state', {
              configurable: false,
              enumerable: false,
              writable: false,
              value: state
            });

            Object.keys(model).map(function(key){
              if(Object.prototype.toString.call(this[key]) === '[object Object]' &&
                ('context' in this[key])){
                this[key].context = this; 
                Object.freeze(this[key]);
              }
            }.bind(model));

            state.__proto__ = model.__proto__;
            return Object.freeze(state);
          } else { //Assume it is AppViewModel

            Object.defineProperty(state, 'previousState', {
              configurable: false,
              enumerable: true,
              writable: false,
              value: withContext
            });
            //Do this after previousState is set so that it is included
            if(originalSpec.getInitialState){
              state = extend(state, originalSpec.getInitialState(state, withContext ? withContext.state: void 0));
            }
            //set this last
            //TODO - rework this, as __proto__ is deprecated
            state.__proto__ = model.__proto__;
          }
        }

        Object.defineProperty(model, 'state', {
          configurable: false,
          enumerable: false,
          writable: false,
          value: state
        });
        return model;
      }.bind(this);
      return dataContext;
    }
  }
};

mixInto(IMVVMBase, IMVVMModel.Mixin);

var IMVVMClass = {
  createClass: function(classType, spec){

    var Constructor = function(){};
    Constructor.prototype = new IMVVMBase();      
    Constructor.prototype.constructor = Constructor;

    var DescriptorConstructor = Constructor;

    var ConvenienceConstructor = function(raiseStateChangeHandler) {
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

/*    // Reduce time spent doing lookups by setting these on the prototype.
    for (var methodName in IMVVMInterface) {
      if (!Constructor.prototype[methodName]) {
        Constructor.prototype[methodName] = null;
      }
    }
*/

    /*
    if (__DEV__) {
      // In DEV the convenience constructor generates a proxy to another
      // instance around it to warn about access to properties on the
      // descriptor.
      DescriptorConstructor = createDescriptorProxy(Constructor);
    }*/

    return ConvenienceConstructor;
  },
};

IMVVM.createModel = IMVVMClass.createClass.bind(this, 'Model');
IMVVM.createViewModel = IMVVMClass.createClass.bind(this, 'ViewModel');
IMVVM.createAppViewModel = IMVVMClass.createClass.bind(this, 'AppViewModel');

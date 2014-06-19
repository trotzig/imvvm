IMVVM
=====

IMVVM helps implement the Model-View-ViewModel pattern in [React](http://facebook.github.io/react/) applications. It's role is to provide the framework to create Models and ViewModels, with React acting as the View. It is designed to complement React. The IMVVM API gets its inspiration from the React library. So it feels like React. This makes it easy to understand and enables you to be productive in a short time frame.

Documentation can be found [here.](https://github.com/entrendipity/imvvm/wiki)

## Usage

IMVVM can be loaded as:

-   standalone. `IMVVM` is exposed as a global variable

```javscript
 <script src="imvvm.min.js"></script>
```

-   a Node.js module

```
$ npm install imvvm
```

-   a Bower module

```
$ bower install imvvm
```

-   a RequireJS module

```
require(['./imvvm.min.js'], function (IMVVM) {
    // Do something with IMVVM
});
```

## Getting Started
###Install and start the example application (which is intended to act as a reference implementation).
The example application is a good starting place when figuring out how things work. To get it running, navigate to the `./example` directory and run the following commands.

  ```
  $ npm install
  $ cd app
  $ bower install
  $ bower install imvvm
  $ cd ..
  $ grunt serve
  ```

### Create a Model

```javascript
var PersonModel = IMVVM.createModel({

  getInitialState: function(){
    return {
      age: calculateAge(this.dob),
      id: this.id ? this.id : uuid()
    };
  },

  id: {
    get: function(){
      return this.state.id;
    }
  },

  name: {
    get: function(){
      return this.state.firstName;
    },
    set: function(newValue){
      this.setState({'name': newValue});
    }
  },

  dob: {
    get: function(){
      return this.state.dob;
    },
    set: function(newValue){
      var age;
      if(newValue.length === 10){
        age = calculateAge(newValue);
      }
      if(newValue.length === 0){
        age = 'Enter your Birthday';
      }
      this.setState({
        dob: newValue,
        age: age
      });
    }
  },

  gender: {
    get: function(){
      return this.state.gender;
    },
    set: function(newValue){
      this.setState({'gender': newValue});
    }
  },

  age: {
    get: function(){
      return this.state.age;
    }
  },

});
```

#####getInitialState()
The `getInitialState` function initializes any fields that require a value during initialization. Such values include, default values and calculated fields. This function has access to the state which was passed into the constructor, and is able to reference this state via `this.state.property`.
#####name
`name` is a simple field descriptor. It defines a getter and setter. The getter returns state that resides in the state's property of the same name. The setter will transition the model to the next state, when a value is assigned to it. It uses the value and passes it, as an object, to the setState function. This will notify any ViewModels that have registered a stateChangedHandler with this model.
#####age
`age` is a calculated field. It is set by setting `dob`. `dob` uses a calculateAge function to set the value of age and passes both the dob and age values to setState. Please note that `age` needed to be initialized in the getInitialState() function.

### Create a ViewModel

```javascript
var personStateChangedHandler = function(nextState){
  var persons = {};
  persons.collection = this.collection.map(function(person){
    if(person.id === nextState.id){
      persons.selectedPerson = new Person(nextState);
      return persons.selectedPerson;
    }
    return person;
  }.bind(this));

  this.setState(persons);
};

var Person = function(){
  return new PersonModel(personStateChangedHandler).apply(this, arguments);
};

var PersonsViewModel = IMVVM.createViewModel({

  getInitialState: function(){
    var nextState = {};
    nextState.collection = DataService.getData().map(function(person, idx){
      if (idx === 0){
        nextState.selectedPerson = new Person(person, true);
        return nextState.selectedPerson;
      }
      return new Person(person, true);
    }.bind(this));
    return nextState;
  },

  getWatchedState: function() {
    return {
      'hobbies': {
        alias: 'hobbiesContext',
      },
      'online': {
        alias: 'imOnline'
      }
    };
  },

  imOnline: {
    kind:'pseudo',
    get: function(){
      return this.state.imOnline;
    }
  },

  selectedPerson: {
    kind: 'instance',
    get: function() { return this.state.selectedPerson; }
  },

  collection: {
    kind: 'array',
    get: function(){ return this.state.collection; },
  },

  selectedHobby: {
    kind: 'pseudo',
    get: function() {
      return this.state.hobbiesContext.current ? this.state.hobbiesContext.current.name: void(0);
    }
  },

  selectPerson: function(id){
    for (var i = this.collection.length - 1; i >= 0; i--) {
      if(this.selectedPerson.id !== id && this.collection[i].id === id){
        this.setState({ selectedPerson: new Person(this.collection[i]) });
        break;
      }
    }
  },

  addPerson: function(value){
    var nextState = {};
    var name;

    if(value && value.length > 0){
      name = value.split(' ');
      nextState.selectedPerson = new Person({
        firstName: name[0],
        lastName: name.slice(1).join(' ')
      }, true);
      nextState.collection = this.collection.slice(0);
      nextState.collection = nextState.collection.concat(nextState.selectedPerson);
      this.setState(nextState);
    }
  },

  deletePerson: function(uid){
    var nextState = {};
    nextState.collection = this.collection.filter(function(person){
      return person.id !== uid;
    });
    nextState.selectedPerson = void(0);
    if(nextState.collection.length > 0){
      if (this.selectedPerson.id === uid){
        nextState.selectedPerson = new Person(nextState.collection[0]);
      } else {
        nextState.selectedPerson = new Person(this.selectedPerson);
      }
    }
    this.setState(nextState);
  },
});

```
#####getInitialState()
The `getInitialState` function initializes any fields that require a value and
can initialize models to establish the data for the Viewmodel. Unlike Models, the ViewModel does not have access to `state`.
#####getWatchedState()
The `getWatchedState` function establises links between ViewModels. In the code above, `getWatchedState` is referencing the `hobbies` data context with the alias of hobbiesContext. This enables the ViewModel to refer to `hobbies` as `hobbiesContext` (i.e. `this.state.hobbiesContext...`). Enabling fields to be displayed from other ViewModels and will be automatically update thier values.

We can also reference fields from the DomainViewModel. We simply specify the field name and supply an alias. Then it can be referred to from the state object.
#####imOnline
The `imOnline` field is referencing the linked DomainModel field `online` with an alias of `imOnline`. It simply forwards the online value it recieves from the DomainViewModel to the View and has no influence over its output. It is for this reason that the field descriptor has a `kind` decorator of `pseudo`. Fields that obtain their value from other sources and have no influence on the output value, should be flagged with the decorator `kind:'pseudo'`.
#####selectedPerson
`selectedPerson` is another field that has a `kind` decorator. The `selectedPerson` field is of kind `instance`. Which simply means that it will return a model instance.

#####collection
`collection` has a `kind` decorator of `array`. Yes, you guessed it, because it returns an array.

_The reason that the kind decorator is used is because IMVVM does some extra processing with these types._

#####personStateChangedHandler
`personStateChangedHandler` will be invoked anytime `setState` is called within the model that it is registered to. This function processes changes in the ViewModel and notifies the DomainModel of any changes so that the DomainModel can transition to the next state.

#####Person
`Person` is a wrapper around the `PersonModel` constructor. It makes `PersonModel` easier to invoke and acts like a Model Factory of sorts. The parameters passed to `Person` are passed directly to the `PersonModel` constructor, but not before registering the stateChangedHandler `personStateChangedHandler`, to ensure that all state changes in PersonModel notify interested Models/ViewModels and is handled approapriately.

#####selectPerson, addPerson & deletePerson
These functions are exposed to the View and enable tasks to be performed in the ViewModel. However, the View will also interact with any Models the ViewModel exposes to it. In this instance the ViewModel exposes the PersonModel via the `selectedPerson` property. See [A word on how to update a Model from the View](#a-word-on-how-to-update-a-model-from-the-view)

I've added a code snippet of HobbiesViewModel, from the example application to help explain a little more about `getWatchedState`.

__HobbiesViewModel snippet__

```javascript
var onPersonChangedHandler = function(nextState, prevState, field, context){
  if(this.current !== void(0) && context === 'persons' &&
    nextState.id !== prevState.id){
    return { hobbies: { current: void(0) }, busy: false };
  }
};

var HobbiesViewModel = IMVVM.createViewModel({

  getWatchedState: function() {
    return {
      'persons': {
        alias: 'personsContext',
        fields: {
          'selectedPerson': onPersonChangedHandler
        }
      },
      'busy': {
        alias: 'busy'
      }
    };
  },

  ...

  selectHobby: function(id){
    for (var i = this.hobbies.length - 1; i >= 0; i--) {
      if ((this.current === void(0) || this.current.id !== id) && this.hobbies[i].id === id){

        this.setState({current: new Hobby(this.hobbies[i])}, {busy: true});

        /*
          //OR use a callback
          this.setState({current: new Hobby(this.hobbies[i])}, function(){
            this.setState(void(0), {busy: true});
          }.bind(this));
        */

        break;
      }
    }
  },

  ...

  });
```

#####getWatchedState()
Notice in this instance of the `getWatchedState` function, the `persons` object has an extra property called `fields`. `fields` the ViewModel should be notified when `persons.selectedPerson` changes, and if it does change trigger the `onPersonChanged` handler.

Both the `alias` and `fields` properties are optional. However at least one must be present.

#####onPersonChangedHandler
`onPersonChangedHandler` will be triggered whenever any of the fields that it is assigned to changes. It is important to note that if there is a change, `onPersonChangedHandler` must return a state object. If no change has occurred, return either void(0) or don't return anything. It should also be noted that the returned state object has a property with the data context, `hobbies`, and the associated next state object. This is necessary so that any data context or domain property can be updated from this ViewModel by specfying it in the returned object.

#####selectHobby
The `selectHobby` function is nothing special. What is different about it, is the `setState` function. A ViewModel's `setState` function has an extra parameter which enables the ViewModel to update state in other data contexts. The second parameter takes a state object, not dissimilar to the state object that is returned from `onPersonChangedHandler`. The second parameter accepts an object that specifies the data context or domain property and its associated state.

For instance `this.setState({current: new Hobby(this.hobbies[i])}, {busy: true});`. The first parameter is the next state for the `hobbies` data context, the second parameter specifies that `busy`, a property in the domain data context, should be changed to `true`. This second parameter also accepts other data contexts (e.g. `{persons: {selectedPerson: new Person(personState)}}`).

Also noted within comments, is that this can be achieved within a callback, ensuring to pass `void(0)` as the first parameter to `setState`.

***n.b. You may have noticed that not all fields have setters, however, the values are still able to be updated. This is what `setState` does. You only need to supply a setter if you would like the View to update the field directly.***

### Create a DomainViewModel
```javascript
var DomainViewModel = IMVVM.createDomainViewModel({

  getInitialState: function(){
    return {
      online: true,
      busy: false
    };
  },

  persons: {
    viewModel: PersonsViewModel,
    get: function(){
      return this.state.persons;
    }
  },

  hobbies: {
    viewModel: HobbiesViewModel,
    get: function(){
      return this.state.hobbies;
    }
  },

  personCount: {
    kind:'pseudo',
    get: function(){
      return this.persons ? this.persons.collection.length : 0;
    }
  },

  busy: {
    get: function(){
      return this.state.busy;
    },
  },

  online: {
    get: function(){
      return this.state.online;
    },
    set: function(newValue){
      this.setState({'online': newValue });
    }
  },

});
```
#####getInitialState()
The 'getInitialState' is the same as for the ViewModel.
#####persons
The `persons` property sets up a data context called 'persons'. It has a special decorator called `viewModel`, which specifies the associated ViewModel for this data context.

___

>___This is probably a good time to explain a little about what gets exposed to the View.___
>
>When a Model, ViewModel or DomainViewModel is instantiated, IMVVM takes all the defined functions and places them on the Object's prototype. It also takes all the field descriptors and assigns them as properties for the newly created object.
>
>So all functions and fields defined within a Model, ViewModel or DomainModel, are visible to other objects. This means that the View has visibility and access to these functions and fields, including any implementation specific functions, which probably should be kept separate from the View.
>
>What would be preferred, is to only expose the properties and functions the View needs. To accomplish this, define variables, properties or functions outside of your Models, ViewModels and DomainViewModels, and simply reference them. That way the View API is kept nice and clean and your implementation is kept separate.
>
>Refer to the reference implementation (i.e. example application), which uses this technique.

___
### Hook up the View
Once you have created your Models. ViewModels and DomainViewModel, you're ready to hook it up the the View. All you need to do is specify the mixin and IMVVM will attach a `domainDataContext` to the state object that will be kept in sync with you're ViewModel.

```javascript
var ApplicationView = React.createClass({

  mixins: [IMVVM.mixin],

  render: function(){
    return (
      <div>
        <NavBarView appContext={this.state.domainDataContext} />
        <SideBarView appContext={this.state.domainDataContext} />
        <DetailsView appContext={this.state.domainDataContext} />
      </div>
    );
  }

});
```

The `domainDataContext` has all the properties that were specified in the DomainViewModel. So this `domainDataContext` will have the following properties:
- busy
- online
- personCount
- persons (dataContext)
  + imOnline
  + selectedPerson
    * [model properties and functions...]
  + collection
  + selectedHobby
  + selectPerson
  + addPerson
  + deletePerson
- hobbies (dataContext)
  + [viewModel properties and functions...]

### Render the View

Then you just render the View, specifying a `domainModel` prop, that references the 'DomainViewModel'.
```javascript
React.renderComponent(<ApplicationView domainModel={DomainViewModel}/>,
  document.getElementById('container'));
```

#####A word on how to update a Model from the View

As mentioned above, the `PersonsViewModel` has a `persons` data context. This data context exposes a `Person` model instance via the `selectedPerson` property.

To update the `Person` instance, simply assign values to the associated properties on the `selectedPerson` property.

__FormView example__
```javascript
var FormView = React.createClass({
  updateName: function(e){
    this.props.appContext.persons.selectedPerson.name = e.target.value;
  },
  updateGender: function(e){
    this.props.appContext.persons.selectedPerson.gender = e.target.value;
  },
  updateDOB: function(e){
    this.props.appContext.persons.selectedPerson.dob = e.target.value;
  },
  render: function() {
    var current = this.props.appContext.persons.selectedPerson;
    return (
      <div key={current.id}>
        <form role="form">
          <div>
              <label>Name</label>
              <div>
                <input type="text" value={current.name}
                onChange={this.updateName} />
            </div>
          </div>
          <div>
              <label>Gender</label>
              <div>
                <div>
                <label>
                  <input type="radio" onChange={this.updateGender}
                    value="male"
                    checked={current.gender === 'male'} />
                  Male
                </label>
              </div>
              <div>
                <label>
                  <input type="radio" onChange={this.updateGender}
                    value="female"
                    checked={current.gender === 'female'} />
                  Female
                </label>
              </div>
            </div>
          </div>
          <div>
              <label>Birthday</label>
              <div>
                <input type="text"
                placeholder="yyyy-mm-dd"
                value={current.dob}
                onChange={this.updateDOB} />
            </div>
          </div>
          <div className="form-group">
              <label>Age</label>
              <div>
                <div>
                  {current.age}
                </div>
            </div>
          </div>
        </form>
      </div>
    );
  }
});
```

## Author
Entrendipity  - [Follow @entrendipity](https://twitter.com/intent/follow?screen_name=entrendipity)

Frank Panetta  - [Follow @fattenap](https://twitter.com/intent/follow?screen_name=fattenap)

##License
###The MIT License (MIT)

Copyright (c) 2014 Entrendipity

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

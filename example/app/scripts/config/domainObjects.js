/** 
 * @jsx React.DOM 
 */
/*jshint quotmark:false */
/*jshint white:false */
/*jshint trailing:false */
/*jshint newcap:false */
/* global AppViewModel, PersonsViewModel, HobbiesViewModel */

'use strict';

var domainObjects = {
	/*jshint camelcase:false */
	'persons': {
		viewModel: PersonsViewModel,
		initArgs : [],
		dependsOn: [{property: 'hobbies.selected', alias: 'selectedHobby'},
                {property: 'online', alias: 'imOnline'}]
	},
	'hobbies': {
		viewModel: HobbiesViewModel,
		initArgs : [],
		dependsOn: [{property: 'persons.selected'},
								{property: 'myAppState.appState', alias: 'appState'}]
	},
	'myAppState': {
		viewModel: AppViewModel
	}
};
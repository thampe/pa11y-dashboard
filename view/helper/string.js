'use strict';

module.exports = helper;

function helper(hbs) {

	// Convert a string to lower-case
	hbs.registerHelper('lowercase', context => {
		if (context === null || typeof context === 'undefined') {
			return '';
		}
		return String(context).toLowerCase();
	});

}

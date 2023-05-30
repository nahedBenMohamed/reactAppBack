const { execute } = require('../providers/db');
const { SQL } = require('../../config');

module.exports = {
	getGenders: async function () {
		try {
			
			const data = await execute(SQL.allQuery.getGenders);
			;
			return data[0];
		} catch (error) {
			console.error('Error getting genders: ', error);
			throw error;
		}
	},

	getLanguages: async function () {
		try {
			
			const data = await execute(SQL.allQuery.getLanguages);
			;
			return data[0];
		} catch (error) {
			console.error('Error getting languages: ', error);
			throw error;
		}
	}
};

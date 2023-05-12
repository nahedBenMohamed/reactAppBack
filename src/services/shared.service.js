const { connection } = require('../providers');
const { SQL } = require('../../config');

module.exports = {
	getGenders: async function () {
		try {
			const conn = await connection.connection();
			const data = await conn.execute(SQL.allQuery.getGenders);
			conn.release();
			return data[0];
		} catch (error) {
			console.error('Error getting genders: ', error);
			throw error;
		}
	},

	getLanguages: async function () {
		try {
			const conn = await connection.connection();
			const data = await conn.execute(SQL.allQuery.getLanguages);
			conn.release();
			return data[0];
		} catch (error) {
			console.error('Error getting languages: ', error);
			throw error;
		}
	}
};

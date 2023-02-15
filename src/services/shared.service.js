const { connection } = require('../providers');
const { SQL } = require('../../config');
module.exports = {
	getGenders: async function () {
		const conn = await connection.connection();
		let data = await conn.execute(SQL.allQuery.getGenders);
		conn.release();
		return data[0];
	},
	getLanguages: async function () {
		const conn = await connection.connection();
		let data = await conn.execute(SQL.allQuery.getLanguages);
		conn.release();
		return data[0];
	}
};

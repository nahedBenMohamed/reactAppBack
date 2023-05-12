const { connection } = require('../providers');
const { SQL } = require('../../config');

module.exports = {
	createRecord: async function (body) {
		try {
			const conn = await connection.connection();
			let data = await conn.execute(
				SQL.recordQueries.createRecord(
					body.session,
					body.diagnostic_content,
					body.filepath,
					body.filename,
					body.duration_in_seconds
				)
			);
			conn.release();
			return data[0];
		} catch (err) {
			throw new Error(`Error creating record: ${err.message}`);
		}
	},
	removeRecord: async function (id) {
		try {
			const conn = await connection.connection();
			let data = await conn.execute(SQL.recordQueries.removeRecord(id));
			conn.release();
			return data[0];
		} catch (err) {
			throw new Error(`Error removing record: ${err.message}`);
		}
	},
	getRecords: async function (id, diagnostic_content) {
		try {
			const conn = await connection.connection();
			let data = await conn.execute(SQL.recordQueries.getRecords(id, diagnostic_content));
			conn.release();
			return data[0];
		} catch (err) {
			throw new Error(`Error getting records: ${err.message}`);
		}
	}
};

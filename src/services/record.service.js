const { execute } = require('../providers/db');
const { SQL } = require('../../config');

module.exports = {
	createRecord: async function (body) {
		try {
			
			let data = await execute(
				SQL.recordQueries.createRecord(
					body.session,
					body.diagnostic_content,
					body.filepath,
					body.filename,
					body.duration_in_seconds
				)
			);
			;
			return data[0];
		} catch (err) {
			throw new Error(`Error creating record: ${err.message}`);
		}
	},
	removeRecord: async function (id) {
		try {
			
			let data = await execute(SQL.recordQueries.removeRecord(id));
			;
			return data[0];
		} catch (err) {
			throw new Error(`Error removing record: ${err.message}`);
		}
	},
	getRecords: async function (id, diagnostic_content) {
		try {
			
			let data = await execute(SQL.recordQueries.getRecords(id, diagnostic_content));
			;
			return data[0];
		} catch (err) {
			throw new Error(`Error getting records: ${err.message}`);
		}
	}
};

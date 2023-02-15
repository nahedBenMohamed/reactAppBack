

const { connection } = require('../providers');
const { SQL } = require('../../config');


module.exports = {
    createRecord: async function (body) {
        const conn = await connection.connection();
        let data = await conn
            .execute(SQL.recordQueries.createRecord(body.session, body.diagnostic_content, body.filepath, body.filename, body.duration_in_seconds));
        conn.release();
        return data[0];
    },
    removeRecord: async function (id) {
		const conn = await connection.connection();
        let data = await conn
            .execute(SQL.recordQueries.removeRecord(id));
        conn.release();    
        return data[0];
    },
    getRecords: async function (id) {
		const conn = await connection.connection();
        let data = await conn
            .execute(SQL.recordQueries.getRecords(id));
        conn.release();    
        return data[0];
    }
}
const { connection } = require('../providers');
const { SQL } = require('../../config');
const isEmpty = require('../helpers/isEmpty');
module.exports = {
	createChild: async function (body, userId) {
		const conn = await connection.connection();
		await conn.execute(
			SQL.chilQueries.createChild(userId, body.gender, body.firstName, body.lastName, body.birthDay, body.other)
		);

		const res = await conn.execute(SQL.chilQueries.getLastID('child'));
		if (body.languages?.length > 0 && res[0]?.length > 0) {
			const childId = res[0][0].id;
			body.languages.map(async language => {
				await conn.execute(SQL.chilQueries.addChildLanguage(childId, language));
			});
		}
		conn.release();
		return res;
	},
	getChildById: async function (childId) {
		const conn = await connection.connection();
		let data = await conn.execute(SQL.chilQueries.getChildById(childId));
		if (data?.[0]?.[0]) data[0][0].languages = data[0][0]?.languages?.split(',') || [];
		conn.release();
		return data[0];
	},
	updateChild: async function (childId, body) {
		const conn = await connection.connection();
		let sql = '';
		let data = [];
		if (body.gender && body.gender !== '') sql += `gender='${body.gender}',`;
		if (body.firstName && body.firstName !== '') sql += ` firstname='${body.firstName}',`;
		if (body.lastName && body.lastName !== '') sql += ` lastname='${body.lastName}',`;
		if (body.birthDay && body.birthDay !== '') sql += ` birthdate='${body.birthDay}',`;
		if (body.other && body.other !== '') sql += ` other='${body.other}',`;
		if (sql !== '') {
			sql = sql.substring(0, sql.length - 1);
			data = await conn.execute(SQL.chilQueries.updateChild(childId, sql));
		}
		if (body.languages && !isEmpty(body.languages)) {
			data = await conn.execute(SQL.chilQueries.deleteChildLanguage(childId));
			body.languages.map(async language => {
				await conn.execute(SQL.chilQueries.addChildLanguage(childId, language));
			});
		}
		conn.release();
		return data[0];
	},
	deleteChild: async function (childId) {
		const conn = await connection.connection();
		let data = await conn.execute(SQL.chilQueries.deleteChild(childId));
		conn.release();
		return data[0];
	}
};

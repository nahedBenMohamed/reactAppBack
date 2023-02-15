const { connection } = require('../providers');
const { SQL } = require('../../config');

module.exports = {
	getAllChildByUserId: async function (params, query) {
		let results = {};
		let data;
		let order_by = query?.order_by ? query?.order_by : 'child.created desc';
		let search_for = query.search_for ? query.search_for : '';
		let offset;
		const conn = await connection.connection();
		
		if (query.page && query.items_per_page) {
			offset = query.items_per_page * (query.page - 1);
			data = await conn.execute(SQL.userQueries.getAllChildPaginateByUserId(
				params.userId,
				order_by,
				search_for,
				query.items_per_page,
				offset
			))
		}
		let allData = await conn.execute(SQL.userQueries.getAllChildByUserId(params.userId, order_by, search_for))
		results = {
			total: allData?.[0]?.length || 0,
			page: query.page ? query.page : '',
			limit: query.items_per_page ? query.items_per_page : '',
			offset: offset,
			data: data?.[0] ? data[0] : allData?.[0]
		};
		conn.release();
		return results;
	},
	getUserBySUB: async function (sub) {
		const conn = await connection.connection();
		const results = conn.execute(SQL.userQueries.getUserBySUBId(sub))
		conn.release();
		return results;
	},
	getUserById: async function (id) {
		const conn = await connection.connection();
		const results = await conn.execute(SQL.userQueries.getUserById(id));
		conn.release();
		return results
	},
	insetNewUser: async function (body) {
		const conn = await connection.connection();
		const results = await conn.execute(SQL.userQueries.insetUser(body));
		conn.release();
		return results;
	}
};

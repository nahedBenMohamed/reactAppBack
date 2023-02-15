const { connection } = require('../providers');
const { SQL } = require('../../config');
const { CryptoProviders } = require('../helpers/properties');

module.exports = {
	getDiagnostics: async function () {
		const conn = await connection.connection();
		let data = await conn.execute(SQL.diagnosticsQueries.getDiagnostics);
		conn.release();
		return data[0];
	},
	getDiagnosticDetails: async function (diagnosisId, session) {
		const conn = await connection.connection();
		let existingSession = await conn.execute(SQL.diagnosticsQueries.getDiagnosisSessionDetails(session));
		let childAgeInMonths = existingSession?.[0]?.[0]?.child_age_in_months;
		let sessionStartedStatus = existingSession?.[0]?.[0]?.started;
		let data = await conn.execute(
			SQL.diagnosticsQueries.getDiagnosisDetails(diagnosisId, childAgeInMonths, sessionStartedStatus)
		);

		if (session) {
			let sessionDetails = await conn.execute(SQL.diagnosticsQueries.getDiagnosisSessionDetails(session));

			Object.assign(data[0]?.[0], { session: sessionDetails[0]?.[0] });
		}
		conn.release();
		return await data[0];
	},
	getDiagnosticGroups: async function (query) {
		const conn = await connection.connection();
		let data = await conn.execute(SQL.diagnosticsQueries.getDiagnosticGroups);
		data[0].length > 0 &&
			(await Promise.all(
				data[0].map(async (group, index) => {
					let req = query.childId
						? SQL.diagnosticsQueries.getDiagnosticGroupsDetailsByChild(group.id, query.childId)
						: SQL.diagnosticsQueries.getDiagnosticGroupsDetails(group.id);
					let diagResult = await conn.execute(req);
					data[0][index].diagnostics = diagResult[0];
				})
			));
		conn.release();

		return data[0];
	},
	getDiagnosticSessions: async function (userId, query) {
		const conn = await connection.connection();
		let sql = SQL.diagnosticsQueries.diagnosticSessions.getDiagnosticSession(userId);
		if (query.childId) sql += SQL.diagnosticsQueries.diagnosticSessions.withChild(query.childId);
		if (query.diagnosisId) sql += SQL.diagnosticsQueries.diagnosticSessions.withDiagnosis(query.diagnosisId);
		if (query.searchFor && query.searchFor != '')
			sql += SQL.diagnosticsQueries.diagnosticSessions.withSearch(query.searchFor);
		let order_by = query.orderBy ? query.orderBy : 'diagnostic_session.date_initialized desc';
		sql += SQL.diagnosticsQueries.diagnosticSessions.orderBy(order_by);
		let data = await conn.execute(sql);
		conn.release();
		return data[0];
	},
	deleteDiagnosticSessionById: async function (sessionId) {
		const conn = await connection.connection();
		let data = await conn.execute(SQL.diagnosticsQueries.deleteDiagnosticSessionById(sessionId));
		conn.release();
		return data[0];
	},
	InsetDiagnosticSession: async function (data) {
		const conn = await connection.connection();
		let response = await conn.execute(SQL.diagnosticsQueries.insertSession(data));

		if (await response) {
			let session = CryptoProviders(JSON.stringify({ sessionId: response[0].insertId })).token();
			await conn.execute(
				SQL.diagnosticsQueries.updateSessionToken({
					id: response[0].insertId,
					body: { session }
				})
			);
			response[0].session = session;
		}
		conn.release();
		return response[0];
	},
	updateDiagnosticSession: async function (id, body) {
		const conn = await connection.connection();
		let response = await conn.execute(SQL.diagnosticsQueries.updateSessionToken({ id, body }));
		conn.release();
		return response[0];
	},
	getDiagnosticContentByDiagnosticId: async function (id, session) {
		const conn = await connection.connection();
		let sessionDetails = await conn.execute(SQL.diagnosticsQueries.getDiagnosisSessionDetails(session));
		let childAgeInMonths = sessionDetails?.[0]?.[0]?.child_age_in_months;
		let questionIds = await conn.execute(
			SQL.diagnosticsQueries.getDiagnosticExtendsIds(id, session, childAgeInMonths)
		);

		let response = await conn.execute(
			SQL.diagnosticsQueries.getDiagnosisContent(id, session, childAgeInMonths, questionIds?.[0]?.[0]?.answer_ids)
		);

		conn.release();
		return response[0];
	},
	addDiagnosisResult: async function (content, body) {
		const conn = await connection.connection();

		let data;

		if (body.extended) {
			let extendedResult = await conn.execute(
				SQL.diagnosticsQueries.getDiagnosticExtendedResultDetails(body.session, content, body.diagnostic)
			);
			if (extendedResult[0].length === 0) {
				data = await conn.execute(
					SQL.diagnosticsQueries.insetANewExtendedResult(
						body.session,
						content,
						body.diagnostic,
						body.extended
					)
				);
			} else {
				data = await conn.execute(
					SQL.diagnosticsQueries.updateExtendedResult(body.session, content, body.diagnostic, body.extended)
				);
			}
		} else {
			await conn.execute(SQL.diagnosticsQueries.deleteDiagnosticResult(body.session, content));
			data = await conn.execute(
				SQL.diagnosticsQueries.addDiagnosticResultOrNotes(
					body.session,
					content,
					body.result.answer,
					body.result.notes
				)
			);
		}
		conn.release();
		return data[0];
	},
	getDiagnosisSessionById: async function (sessionId) {
		const conn = await connection.connection();
		const data = await conn.execute(SQL.diagnosticsQueries.getDiagnosisSessionDetails(sessionId));
		conn.release();
		return data[0];
	},
	getDiagnosisContentGrammars: async function (body, childAgeInMonths) {
		const conn = await connection.connection();
		let sql = SQL.diagnosticsQueries.getDiagnosisGrammar(childAgeInMonths);
		if (body.session) sql = SQL.diagnosticsQueries.getDiagnosisGrammarWitSession(body.session, childAgeInMonths);
		const data = await conn.execute(sql);
		if (data?.[0].length > 0) {
			let items = [];
			let scores = {
				total: {},
				groups: []
			};
			let a_score = 0,
				b_score = 0,
				group_a_score = 0,
				group_b_score = 0,
				group_a_score_total = 0,
				group_b_score_total = 0;
			let last_group_name = '';
			data?.[0].map((item, index) => {
				let selected = item.selected_answers ? item.selected_answers.split(',').length : 0;
				if (last_group_name != item.group_name) {
					if (index > 0)
						scores.groups.push({
							name: last_group_name,
							a: group_a_score,
							b: group_b_score,
							a_total: group_a_score_total,
							b_total: group_b_score_total
						});
					group_a_score = 0;
					group_b_score = 0;
					group_a_score_total = 0;
					group_b_score_total = 0;
					last_group_name = item.group_name;
				}
				if (selected >= item.min_occur) item.has_score = true;
				else item.has_score = false;
				if (item.belongs_to == 0) group_a_score_total += item.score;
				else group_b_score_total += item.score;
				if (item.has_score) {
					if (item.belongs_to == 0) {
						group_a_score += item.score;
						a_score += item.score;
					} else {
						group_b_score += item.score;
						b_score += item.score;
					}
				}
				items.push(item);
			});
			scores.groups.push({
				name: last_group_name,
				a: group_a_score,
				b: group_b_score,
				a_total: group_a_score_total,
				b_total: group_b_score_total
			});
			scores.total.a = a_score;
			scores.total.b = b_score;
			return { scores, items };
		}
	}
};

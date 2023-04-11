const { connection } = require('../providers');
const { SQL } = require('../../config');
const { CryptoProviders } = require('../helpers/properties');
const { getAnalysesResultScores } = require('./evaluation.service');
const moment = require('moment/moment');

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
	updateDiagnosticSession: async function (id, body, session) {
		const conn = await connection.connection();
		if (body?.status === 'finished') Object.assign(body, { date_finished: moment().format('YYYY-MM-DD HH:mm:ss') });
		if (body?.status === 'paused') Object.assign(body, { date_paused: moment().format('YYYY-MM-DD HH:mm:ss') });
		if (body?.status === 'played') Object.assign(body, { date_played: moment().format('YYYY-MM-DD HH:mm:ss') });
		if (body?.status === 'canceled') Object.assign(body, { date_canceled: moment().format('YYYY-MM-DD HH:mm:ss') });
		if (body.contentIds && body?.status === 'initialized') {
			// initialize session in  practice mode by removing  the old result related to current session
			body.contentIds.forEach(
				async contentId => await conn.execute(SQL.diagnosticsQueries.deleteDiagnosticResult(session, contentId))
			);
			// remove the unused content id from the session update body
			delete body.contentIds;
		}

		let response = await conn.execute(SQL.diagnosticsQueries.updateSessionToken({ id, body, session }));
		// save last completed session as default
		if (body.status && body.status == 'finished') this.addDiagnosisResultAnalyses(session);
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
		let hasDiagnosticExtension = false;
		if (questionIds?.[0]?.[0]?.answer_ids && questionIds?.[0]?.[0]?.answer_ids.length > 0) {
			hasDiagnosticExtension = true;
		}

		let response = await conn.execute(
			SQL.diagnosticsQueries.getDiagnosisContent(
				id,
				session,
				childAgeInMonths,
				questionIds?.[0]?.[0]?.answer_ids,
				hasDiagnosticExtension
			)
		);

		if (id == 5) {
			let additionalResult = await Promise.all(
				response[0].map(async content => {
					// query all additional question data including stand classifications  details
					let data = await conn.execute(
						SQL.diagnosticsQueries.getDiagnosisExtendedQuestionContent(session, content?.id)
					);
					let selectedClassification = await conn.execute(
						SQL.diagnosticsQueries.getDiagnosisClassificationQuestionContent(session, content?.id)
					);
					let classificationAnswers = { classificationResults: [] };
					// separate classifications with other questions details
					let othersQuestions = data[0].filter(item => ['text', 'checkbox'].includes(item.type));
					//?  all classifications answers will have a common details like , diagnostic id , content id , session ...
					// so it gonna be better if we centralized it in one object
					let classificationCommonDetails = data[0].filter(item => ['classification'].includes(item.type));
					Object.assign(classificationAnswers, { ...classificationCommonDetails[0] });
					// combine  all classifications results into a single result object
					selectedClassification[0]
						.sort((a, b) => a.belonging_id - b.belonging_id)
						.forEach(({ additional, answer, belonging_id, id }) =>
							classificationAnswers.classificationResults.push({ id, answer, belonging_id, additional })
						);

					return {
						...content,
						// merge all questions with classifications answers
						extraContent: [...othersQuestions, classificationAnswers]
					};
				})
			);

			response[0] = additionalResult;
		}
		conn.release();
		return response[0];
	},
	addDiagnosisResult: async function (content, body) {
		const conn = await connection.connection();
		let data;

		if (body.additionalContent) {
			data = await conn.execute(
				SQL.diagnosticsQueries.DiagnosticUpdateClassificationAdditionalOption(
					body.additionalContent.id,
					body.additionalContent.value
				)
			);
		} else if (body.extraContent) {
			let check = await conn.execute(
				SQL.diagnosticsQueries
					.DiagnosticExtrasQuestionResultQueries(body.session, content, body.extraContent, body.extraContent)
					.checkForExistingItem()
			);

			if (check[0].length > 0) {
				data = await conn.execute(
					SQL.diagnosticsQueries
						.DiagnosticExtrasQuestionResultQueries(
							body.session,
							content,
							body.extraContent,
							body.extraContent
						)
						.update()
				);
			} else {
				data = await conn.execute(
					SQL.diagnosticsQueries
						.DiagnosticExtrasQuestionResultQueries(
							body.session,
							content,
							body.extraContent,

							body.extraContent
						)
						.setNewOne()
				);
			}
		} else if (body.extended) {
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
			let check = await conn.execute(
				SQL.diagnosticsQueries
					.DiagnosticResultQueries(body.session, content, body.result)
					.checkForExistingItem()
			);

			if (check[0].length > 0) {
				data = await conn.execute(
					SQL.diagnosticsQueries.DiagnosticResultQueries(body.session, content, body.result).update()
				);
			} else {
				data = await conn.execute(
					SQL.diagnosticsQueries.DiagnosticResultQueries(body.session, content, body.result).setNewOne()
				);
			}
		}
		conn.release();
		return data[0];
	},

	setDiagnosticClassificationResult: async function (session, content, body, questionNumber) {
		const conn = await connection.connection();
		let { answer } = body;
		if (answer.length > 0) {
			await conn.execute(
				SQL.diagnosticsQueries
					.DiagnosticExtrasQuestionClassificationResultQueries(
						session,
						content,
						answer?.split('.'),
						questionNumber
					)
					.deleteOneByQuestionNumber()
			);

			await conn.execute(
				SQL.diagnosticsQueries
					.DiagnosticExtrasQuestionClassificationResultQueries(
						session,
						content,
						answer?.split('.'),
						questionNumber
					)
					.setNewOnes()
			);
		}
	},
	getDiagnosisSessionById: async function (sessionId) {
		const conn = await connection.connection();
		const data = await conn.execute(SQL.diagnosticsQueries.getDiagnosisSessionDetails(sessionId));
		conn.release();
		return data[0];
	},

	addDiagnosisResultAnalyses: async function (session) {
		const conn = await connection.connection();
		if (session) {
			let body = { session: session };
			const { scores, diagnostic_session } = await getAnalysesResultScores(body);
			await conn.execute(
				SQL.diagnosticsQueries.updateDiagnosisResult(diagnostic_session.diagnostic, diagnostic_session.child)
			);
			scores.forEach(async score => {
				let data = {};

				switch (score.type) {
					case 'values':
						data = { values: score.values, interpretation: score.interpretation };
						break;
					case 'table':
						data = { head: score.head, values: score.values };
						break;
					case 'message':
						data = { label: score.label, link: score.link };
						break;
					case 'compact_values':
						data = { values: score.values };
					case 'accordion':
					// must be updated for test 2 to have the same structure
					case 'text':
					case 'questions':
					case 'answers':
					default:
						data = score.values;
				}
				let tvalue = score.tvalue ? score.tvalue : 0;
				let visible = score.visible ? score.visible : 'yes';
				await conn.execute(
					SQL.diagnosticsQueries.insertDiagnosisResult(
						diagnostic_session.diagnostic,
						session,
						diagnostic_session.child,
						score.scoreName,
						score.type,
						visible,
						tvalue,
						data
					)
				);
			});
		}
		conn.release();
	}
};

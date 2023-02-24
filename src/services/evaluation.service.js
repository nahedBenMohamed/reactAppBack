const { connection } = require('../providers');
const { SQL } = require('../../config');
const { getChildById } = require('./child.service');

const getAnalyses = async query => {
	const conn = await connection.connection();
	let sql = query.childId
		? SQL.evaluationsQueries.getAnalysesByChildId(query.childId)
		: SQL.evaluationsQueries.getAnalyses;
	let data = await conn.execute(sql);
	conn.release();
	return data[0];
};
const setAnalysesResult = async body => {
	const conn = await connection.connection();
	let result = await getAnalysesResultScores(body);
	if (body.use_in_profile === 'yes') {
		await conn.execute(
			SQL.evaluationsQueries.updateAnalysesResultProfile(
				result?.diagnostic_session.diagnostic,
				result.diagnostic_session.child
			)
		);
	}
	let results = result.scores.map(async score => {
		let tvalue = await getTvalue(score);
		let visible = await getScoreVisible(score);
		let sql = SQL.evaluationsQueries.updateAnalysesResult(
			score.type,
			visible,
			tvalue,
			JSON.stringify(score.data),
			body.session,
			score.scoreName
		);
		if (body.use_in_profile)
			sql = SQL.evaluationsQueries.updateAnalysesResultWithProfile(
				score.type,
				visible,
				tvalue,
				JSON.stringify(score.data),
				body.session,
				body.use_in_profile,
				score.scoreName
			);

		return await conn.execute(sql);
	});
	conn.release();
	return results;
};
const getAnalysesResultScores = async body => {
	const conn = await connection.connection();
	const session = await conn.execute(SQL.diagnosticsQueries.getDiagnosisSessionDetails(body.session));
	let diagnosticId = session[0]?.[0]?.diagnostic;
	let child = await getChildById(session[0]?.[0]?.child);
	let childAgeInMonths = session[0]?.[0]?.child_age_in_months;
	let childGender = child?.[0]?.gender == 1 ? 'm' : 'w';
	let childLanguage = child?.[0]?.languages.length > 1 ? 'm' : 'e';
	let data = await conn.execute(SQL.evaluationsQueries.getSumResultAnalysesBySession(body.session));
	let rawValue = data[0]?.[0].raw_value;
	let result = await conn.execute(
		SQL.evaluationsQueries.getAnalysesDiagnosis(diagnosticId, childAgeInMonths, childGender, childLanguage)
	);
	let rawValueAkkusativ, rawValueDativ;
	if (diagnosticId == 9) {
		rawValueAkkusativ = getRawValueByTagName(session, 'Akkusativ');
		rawValueDativ = getRawValueByTagName(session, 'Dativ');
	}
	let scores = await getAnalysesValue(
		result,
		diagnosticId,
		rawValue,
		body,
		rawValueAkkusativ,
		rawValueDativ,
		childAgeInMonths
	);
	conn.release();
	return { scores: scores, diagnostic_session: session[0]?.[0] };
};
const getAnalysesValue = async (
	result,
	diagnosticId,
	rawValue,
	body,
	rawValueAkkusativ,
	rawValueDativ,
	childAgeInMonths
) => {
	let scoreTable = [],
		scores = [];
	let total = 0,
		decimals = 0,
		type_total;
	let akkusativ_used,
		dativ_used,
		raw_value_append,
		ratio = '-',
		visibile = null,
		raw_value_append_akkusativ_label = '',
		raw_value_append_dativ_label = '';
	let needs_extended_analysis_dativ = false,
		needs_extended_analysis_akkusativ = false,
		needs_extended_analysis = false,
		needs_grammar_analysis = false,
		hide_questions = false;
	if (diagnosticId == 5) {
		visibile = 'no';
		scores.push({
			scoreName: 'Situationsbilder beschreiben',
			type: 'compact_values',
			values: []
		});
	}
	const conn = await connection.connection();
	const raw_values = await getRawValues(body.session, diagnosticId);
	await Promise.all(
		result?.[0]?.map(async item => {
			let raw_value_specific;
			let score_name = item.score_name;
			switch (score_name) {
				case 'Nomen & Verben (phonologisch)':
					raw_value_specific = await getRawValue(raw_values, 'phonologischer Ablenker Nomen und Verben ');
					break;
				case 'Nomen (semantisch)':
					raw_value_specific = await getRawValue(raw_values, 'semantischer Ablenker Nomen');
					break;
				case 'Verben (semantisch)':
					raw_value_specific = await getRawValue(raw_values, 'semantischer Ablenker Verben');
					break;
				case 'Wortschatz: Nomen':
					raw_value_specific =
						(await getRawValueByTagName(body.session, 'Nomen')) +
						(await getRawValueAppendByTagName(body.session, 'Nomen', '02', 'answer_01'));
					break;
				case 'Verben (semantisch)':
					raw_value_specific =
						(await getRawValueByTagName(body.session, 'Verb')) +
						(await getRawValueAppendByTagName(body.session, 'Verb', '02', 'answer_01'));
					break;
				case 'Aussprache: Phonologie':
					raw_value_specific = +rawValue + (await getRawValueAppend(body.session, '02', 'answer_03'));
					break;
				case 'Artikeleinsetzung': {
					raw_value_append = await getRawValueAppend(body.session, '07', 'answer_01');
					raw_value_specific = +rawValue + +raw_value_append;
					break;
				}
				case 'Genusmarkierung': {
					raw_value_append = await getRawValueAppend(body.session, '07', 'answer_02');
					raw_value_specific = +rawValue + +raw_value_append;
					break;
				}
				case 'MLU':
				case 'Vollständigkeit': {
					const result = await getRawValueForExtendAnswer(body.session, score_name);
					rawValue = result.rawValue;
					ratio = result.ratio;
					decimals = result.decimals;
					break;
				}
				case 'Akkusativ': {
					let sumRawValue = await conn.execute(
						SQL.evaluationsQueries.getSumExtendedAnswer(body.session, score_name)
					);
					let labelResult = await conn.execute(SQL.evaluationsQueries.getLabel(diagnosticId, score_name));
					akkusativ_used = +sumRawValue[0]?.[0].raw_value_append;
					raw_value_append_akkusativ_label = labelResult[0]?.[0].label;
					raw_value_specific = rawValueAkkusativ;
					break;
				}
				case 'Dativ': {
					let sumRawValue = await conn.execute(
						SQL.evaluationsQueries.getSumExtendedAnswer(body.session, score_name)
					);
					let labelResult = await conn.execute(SQL.evaluationsQueries.getLabel(diagnosticId, score_name));
					dativ_used = +sumRawValue[0]?.[0].raw_value_append;
					raw_value_append_dativ_label = labelResult[0]?.[0].label;
					raw_value_specific = rawValueDativ;
					break;
				}
				case 'Score A': {
					let grammars = await getDiagnosisContentGrammars(body, childAgeInMonths);
					raw_value = grammars?.scores?.total.a;
					break;
				}
				case 'Score B ': {
					let grammars = await getDiagnosisContentGrammars(body, childAgeInMonths);
					raw_value = grammars?.scores?.total.b;
					break;
				}
				default:
				// code block
			}
			if ([3, 4, 8, 6, 5].includes(diagnosticId)) {
				raw_value_specific = rawValue;
			}
			if (diagnosticId == 10) {
				const result = await diagnostic_10_Result(body.session, diagnosticId, rawValue);
				raw_value_specific = result.rawValue;
				scoreTable = [...result.scoreTable];
			}
			let resp = await conn.execute(SQL.evaluationsQueries.getAnalysesValues(item.id, raw_value_specific));
			let score = resp[0]?.[0];
			if (score?.interpretation < 2) {
				needs_extended_analysis = true;
				if (score_name == 'Dativ') needs_extended_analysis_dativ = true;
				if (score_name == 'Akkusativ') needs_extended_analysis_akkusativ = true;
			}

			let foundIndex = scores.findIndex(x => x.scoreName == 'Situationsbilder beschreiben');
			if (await checkNeedGrammarAnalyses(score, score_name, childAgeInMonths)) {
				needs_grammar_analysis = true;
				hide_questions = true;
			}

			scores[foundIndex]?.values.push({
				name: score_name,
				raw_value: score?.raw_value,
				class: score?.interpretation < 0 ? 'red' : 'green',
				tvalue: score?.tvalue,
				decimals: decimals,
				width: 'small-3'
			});

			scores.push({
				scoreName: score_name,
				type: 'values',
				visible: visibile,
				tvalue: score?.tvalue,
				values: {
					raw_value: score?.raw_value,
					score: score?.score,
					tvalue: score?.tvalue,
					confidence_interval: score?.confidence_interval
				},
				decimals: decimals,
				interpretation: score?.interpretation
			});
			if (scoreTable.length > 0) scores = [...scores, ...scoreTable];
			return scores;
		})
	);
	if ([3, 4, 8].includes(diagnosticId))
		scores = await getScoreTableByTag(scores, body.session, childAgeInMonths, diagnosticId, total);
	if (diagnosticId == 6) scores = await getScoreExtend(scores, body.session, needs_extended_analysis, total);
	if (diagnosticId == 9)
		scores = await getScoreForTest9(
			scores,
			body.session,
			raw_value_append_akkusativ_label,
			raw_value_append_dativ_label,
			needs_extended_analysis_akkusativ,
			needs_extended_analysis_dativ,
			akkusativ_used,
			dativ_used
		);
	if (diagnosticId == 5)
		scores = await getScoreForTest5(ratio, scores, hide_questions, body.session, needs_grammar_analysis);
	conn.release();
	return scores;
};
const getRawValueByTagName = async (session, tagName) => {
	const conn = await connection.connection();
	let data = await conn.execute(SQL.evaluationsQueries.getRawValueByTag(session, tagName));
	conn.release();
	return +data[0]?.[0].raw_value;
};
const getRawValueAppendByTagName = async (session, tagName, id, answerId) => {
	const conn = await connection.connection();
	let dataAppend = await conn.execute(SQL.evaluationsQueries.getRawValueAppendByTag(id, answerId, session, tagName));
	conn.release();
	return +dataAppend?.[0]?.[0].raw_value_append;
};
const getRawValueAppend = async (session, id, answerId) => {
	const conn = await connection.connection();
	let data = await conn.execute(SQL.evaluationsQueries.getRawValueAppend(id, answerId, session));
	conn.release();
	return +data?.[0]?.[0].raw_value_append;
};
const getRawValues = async (session, diagnosticId) => {
	let raw_values = [];
	if (diagnosticId == 1) {
		const conn = await connection.connection();
		let data = await conn.execute(SQL.evaluationsQueries.getTagsResult(session));
		data[0]?.map(item => {
			return raw_values.push({ name: item.name, value: item.raw_value });
		});
		conn.release();
	}
	return raw_values;
};
const diagnostic_10_Result = async (session, diagnosticId, rawValue) => {
	let scoreTable = [];
	const conn = await connection.connection();
	let data = await conn.execute(SQL.diagnosticsQueries.getDiagnosisContentById(diagnosticId));
	data[0]?.map(item => {
		return scoreTable.push({
			scoreName: 'Detailauswertung ' + item.name,
			type: 'table',
			visible: 'yes',
			head: ['label_skill', 'label_exists'],
			values: []
		});
	});
	let resultExtend = await conn.execute(SQL.evaluationsQueries.getResultDiagnosticExtend(diagnosticId, session));
	let show_do_extended_analysis = true;
	resultExtend?.[0]?.map(async item => {
		let answerScore = 'Nein';
		if (item.answer == 'checked') {
			rawValue = +rawValue + 1;
			answerScore = 'Ja';
		}
		if (item.answer != null) show_do_extended_analysis = false;
		let foundIndex = scoreTable.findIndex(x => x.scoreName == 'Detailauswertung ' + item.name);
		scoreTable[foundIndex].values.push({
			label: item.label,
			score: answerScore
		});
	});
	if (show_do_extended_analysis) {
		scoreTable.push({
			scoreName: 'Bitte beachten',
			type: 'message',
			visible: 'yes',
			label: 'label_do_extended_analysis_for_tvalue',
			link: {
				tabSelected: 1,
				label: 'btn_go_to_data'
			}
		});
		scoreTable.forEach(score => {
			if (score.type == 'table') score.visible = 'no';
		});
	}
	conn.release();
	return { scoreTable: scoreTable, rawValue: rawValue };
};
const getRawValueForExtendAnswer = async (session, score_name) => {
	const conn = await connection.connection();
	const extendAnswer = await conn.execute(SQL.evaluationsQueries.getExtendedAnswers(session));
	let words = 0,
		sentences = 0;
	let full = 0,
		total = 0,
		incomplete = 0,
		type1 = 0,
		type2 = 0;
	let ratio = '-';
	let type_total;
	let decimals = 0;
	extendAnswer?.[0]?.map(async answer => {
		if (score_name == 'Vollständigkeit') {
			let additional = JSON.parse('[' + answer.additional + ']');
			if (additional[0]?.class == 'green') full++;
			if (additional[0]?.class == 'red') incomplete++;
			if (additional[0]?.class != 'grey') total++;
			if (additional[0]?.checks?.includes('1')) type1++;
			if (additional[0]?.checks?.includes('2')) type2++;
		} else {
			words += answer.answer.split(' ').length;
			sentences++;
		}
	});
	if (score_name == 'MLU') {
		rawValue = sentences > 0 ? (words / sentences).toFixed(2) : 0;
		rawValue = rawValue.substring(0, rawValue.length - 1);
		decimals = 1;
	} else {
		rawValue = total > 0 ? Math.trunc((full / total) * 100) : 0;
	}

	type_total = type1 + type2;
	if (type_total > 0)
		ratio = Math.round((type1 / type_total) * 100) + '% - ' + Math.round((type2 / type_total) * 100) + '%';
	conn.release();
	return { rawValue: rawValue, ratio: ratio, decimals: decimals };
};
const getScoreTableByTag = async (scores, session, childAgeInMonths, diagnosticId, total) => {
	let values = [];
	const conn = await connection.connection();
	const resultTag = await conn.execute(SQL.evaluationsQueries.getResultTag(session, childAgeInMonths, diagnosticId));
	resultTag?.[0]?.map(async item => {
		if (item.count_tag > 0) {
			total = total + item.count_incorrect;
			values.push({
				name: item.name,
				mistakes_per_items: item.count_incorrect + '/' + item.count_tag,
				count_incorrect: item.count_incorrect
			});
		}
	});
	scores.push({
		scoreName: 'Detailauswertung',
		type: 'table',
		head: ['label_structure', 'label_mistakes_per_items', 'label_error_distribution'],
		values: await calculateErrorDistribution(values, 'count_incorrect', total, 'error_distribution')
	});
	conn.release();
	return scores;
};
const getScoreExtend = async (scores, session, needs_extended_analysis, total) => {
	const conn = await connection.connection();

	let show_do_extended_analysis = false;
	let values = [];
	const resultExtended = await conn.execute(SQL.diagnosticsQueries.getDiagnosisExtended(6));
	await Promise.all(
		resultExtended?.[0]?.map(async item => {
			const resultScore = await conn.execute(
				SQL.evaluationsQueries.getEvaluationDetails(item.answer_id, session)
			);
			values.push({
				name: item.question_id,
				score: resultScore[0]?.[0].t_value == null ? 0 : resultScore[0]?.[0].t_value
			});
			total += +resultScore[0]?.[0].t_value;
			if (resultScore[0]?.[0].t_value == null) show_do_extended_analysis = true;
			return { values, show_do_extended_analysis };
		})
	);
	if (show_do_extended_analysis) {
		scores.push({
			scoreName: 'Detailauswertung',
			type: 'message',
			label: needs_extended_analysis ? 'label_do_extended_analysis' : 'label_no_need_for_extended_analysis',
			link: needs_extended_analysis
				? {
						tabSelected: 1,
						label: 'btn_go_to_data'
				  }
				: null
		});
	} else {
		values = await calculateErrorDistribution(values, 'score', total, 'error_distribution');
		scores.push({
			scoreName: 'Detailauswertung',
			type: 'table',
			head: ['label_error_type', 'label_error_count', 'label_error_distribution'],
			values: values
		});
	}
	conn.release();
	return scores;
};
const getScoreForTest9 = async (
	scores,
	session,
	raw_value_append_akkusativ_label,
	raw_value_append_dativ_label,
	needs_extended_analysis_akkusativ,
	needs_extended_analysis_dativ,
	akkusativ_used,
	dativ_used
) => {
	{
		const conn = await connection.connection();
		let totalAkkusative = 0,
			totalDativ = 0;
		const values = [];
		let show_do_extended_analysis = false;
		let head = ['label_error_type', 'label_error_count', 'label_error_distribution'];
		const resultExtended = await conn.execute(SQL.diagnosticsQueries.getDiagnosisExtended(9));
		scores.push({
			scoreName: 'Detailauswertung Akkusativ',
			type: 'table',
			head: head,
			values: values
		});
		scores.push({
			scoreName: 'Detailauswertung Dativ',
			type: 'table',
			head: head,
			values: values
		});
		await Promise.all(
			resultExtended?.[0]?.map(async item => {
				const resultScoreAkkusativ = await conn.execute(
					SQL.evaluationsQueries.getResultDetails(item.answer_id, session, 'Akkusativ')
				);
				let foundIndex = scores.findIndex(x => x.scoreName == 'Detailauswertung Akkusativ');
				scores[foundIndex].values.push({
					name: item.question_id,
					score: resultScoreAkkusativ[0]?.[0].t_value == null ? 0 : resultScoreAkkusativ[0]?.[0].t_value
				});
				totalAkkusative = totalAkkusative + resultScoreAkkusativ[0]?.[0].t_value;
				if (resultScoreAkkusativ[0]?.[0].t_value == null) show_do_extended_analysis = true;

				const resultScoreDativ = await conn.execute(
					SQL.evaluationsQueries.getResultDetails(item.answer_id, session, 'Dativ')
				);
				let foundIndexD = scores.findIndex(x => x.scoreName == 'Detailauswertung Akkusativ');
				scores[foundIndexD].values.push({
					name: item.question_id,
					score: resultScoreDativ[0]?.[0].t_value == null ? 0 : resultScoreDativ[0]?.[0].t_value
				});
				totalDativ = totalDativ + resultScoreDativ[0]?.[0].t_value;
				return { scores, show_do_extended_analysis };
			})
		);
		if (akkusativ_used > 0 || dativ_used > 0) show_do_extended_analysis = false;
		let foundIndexA = scores.findIndex(x => x.scoreName == 'Detailauswertung Akkusativ');
		scores[foundIndexA].values.push({
			name: raw_value_append_akkusativ_label,
			score: akkusativ_used == 0 ? null : akkusativ_used
		});
		let foundIndexD = scores.findIndex(x => x.scoreName == 'Detailauswertung Dativ');
		scores[foundIndexD].values.push({
			name: raw_value_append_dativ_label,
			score: dativ_used == 0 ? null : dativ_used
		});
		totalDativ = totalDativ + dativ_used;
		totalAkkusative = totalAkkusative + akkusativ_used;
		if (show_do_extended_analysis) {
			scores[foundIndexA] = {
				scoreName: 'Detailauswertung Akkusativ',
				type: 'message',
				label: needs_extended_analysis_akkusativ
					? 'label_do_extended_analysis_akkusativ'
					: 'label_no_need_for_extended_analysis',
				link: needs_extended_analysis_akkusativ
					? {
							tabSelected: 1,
							label: 'btn_go_to_data'
					  }
					: null
			};
			scores[foundIndexD] = {
				scoreName: 'Detailauswertung Dativ',
				type: 'message',
				label: needs_extended_analysis_dativ
					? 'label_do_extended_analysis_dativ'
					: 'label_no_need_for_extended_analysis',
				link: needs_extended_analysis_dativ
					? {
							tabSelected: 1,
							label: 'btn_go_to_data'
					  }
					: null
			};
		} else {
			scores[foundIndexA].values = await calculateErrorDistribution(
				scores[foundIndexA].values,
				'score',
				totalAkkusative,
				'error_distribution'
			);
			scores[foundIndexD].values = await calculateErrorDistribution(
				scores[foundIndexD].values,
				'score',
				totalDativ,
				'error_distribution'
			);
		}
		conn.release();
		return scores;
	}
};
const getScoreForTest5 = async (ratio, scores, hide_questions, session, needs_grammar_analysis) => {
	const conn = await connection.connection();
	scores[scores.findIndex(x => x.scoreName == 'Situationsbilder beschreiben')].values.push({
		name: 'Ausl. obl. Konst. - Ausl. Funktionswort',
		raw_value: ratio
	});
	scores.push({
		scoreName: 'Detaillierte Auswertung',
		type: 'text',
		visible: hide_questions ? 'no' : 'yes',
		label: 'label_do_answer_questions'
	});
	scores.push({
		scoreName: 'Fragen',
		type: 'questions',
		visible: hide_questions ? 'no' : 'yes',
		values: []
	});
	const contentResult = await conn.execute(SQL.evaluationsQueries.getContentAnalysisQuestions(5, session));
	contentResult?.[0]?.map(async item => {
		if (item.answer && item.answer == 'correct') needs_grammar_analysis = true;
		scores[scores.findIndex(x => x.scoreName == 'Fragen')].values.push(item);
	});

	scores.push({
		scoreName: 'Antworten',
		type: 'answers',
		visible: hide_questions ? 'no' : 'yes',
		values: []
	});
	let resultExtend = await conn.execute(SQL.evaluationsQueries.getExtendedAnswers(session));
	resultExtend?.[0]?.map(async item => {
		item.additional = JSON.parse('[' + item.additional + ']');
		scores[scores.findIndex(x => x.scoreName == 'Antworten')].values.push(item);
	});

	href = `/account/analysis/results/grammar?id=5&child=48&session=${session}`;
	scores.push({
		scoreName: 'Empfehlung zur detaillierten Grammatikanalyse',
		type: 'message',
		visible: needs_grammar_analysis ? 'no' : 'yes',
		label: 'label_do_grammar_analysis',
		link: {
			href: href,
			label: 'btn_go_to_grammar'
		}
	});
	scores.push({
		scoreName: 'Keine Scoreermittlung notwendig',
		type: 'message',
		visible: needs_grammar_analysis ? 'no' : 'yes',
		label: 'label_no_need_for_grammar_analysis',
		link: {
			href: href,
			label: 'btn_go_to_grammar'
		}
	});
	conn.release();
	return scores;
};
const calculateErrorDistribution = (values, property, total, errorType) => {
	values = values.map(value => {
		const percent = total != 0 ? Math.round((value[property] / total) * 100) : 0;
		value[errorType] = percent + '%';
		if (property == 'count_incorrect') delete value.count_incorrect;
		return value;
	});
	return values;
};
const getTvalue = score => (score.tvalue ? score.tvalue : 0);
const getScoreVisible = score => (score.visible ? score.visible : 'yes');
const getRawValue = (raw_values, name) => raw_values.find(item => item.name === name)?.value;
const checkNeedGrammarAnalyses = (score, score_name, childAgeInMonths) => {
	return (score?.interpretation < 0 && score_name.indexOf('Score') === -1) || childAgeInMonths < 36;
};
const setDiagnosticResultDetail = async body => {
	let results;
	const conn = await connection.connection();
	const { session, diagnosticId, diagnosticContent, answer, answerId } = body;
	if (session && diagnosticId && diagnosticContent) {
		let result = await conn.execute(
			SQL.evaluationsQueries.getDiagnosticResultDetail(diagnosticId, diagnosticContent, session)
		);
		if (answer && answerId) {
			if (result[0].length > 0) {
				results = await conn.execute(
					SQL.evaluationsQueries.editDiagnosticResultDetail(
						diagnosticId,
						diagnosticContent,
						answer,
						answerId,
						session
					)
				);
			} else {
				results = await conn.execute(
					SQL.evaluationsQueries.setDiagnosticResultDetail(
						diagnosticId,
						diagnosticContent,
						answer,
						answerId,
						session
					)
				);
			}
		}
	}
	conn.release();
	return results;
};
const getArticulationTypes = async () => {
	const conn = await connection.connection();
	let data = await conn.execute(SQL.evaluationsQueries.getArticulationType);
	conn.release();
	return data[0];
};
const getLexiconErrorTypes = async () => {
	const conn = await connection.connection();
	let data = await conn.execute(SQL.evaluationsQueries.getLexiconErrorType);
	conn.release();
	return data[0];
};
const getDiagnosisContentGrammars = async (body, childAgeInMonths) => {
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
};
module.exports = {
	getAnalyses,
	setAnalysesResult,
	getAnalysesResultScores,
	setDiagnosticResultDetail,
	getArticulationTypes,
	getLexiconErrorTypes
};

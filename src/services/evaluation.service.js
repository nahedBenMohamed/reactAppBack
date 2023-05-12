const { connection } = require('../providers');
const { SQL } = require('../../config');
const { getChildById } = require('./child.service');
const { parseDataJson } = require('../helpers/properties');
const { formatAccordionData } = require('../helpers');

const getAnalyses = async query => {
	try {
		const conn = await connection.connection(); // Establish a database connection
		let sql = query.childId
			? SQL.evaluationsQueries.getAnalysesByChildId(query.childId)
			: SQL.evaluationsQueries.getAnalyses;
		const data = await conn.execute(sql); // Execute the query and store the results in the "data" variable
		conn.release(); // Release the database connection
		return data[0]; // Return the first row of the result set
	} catch (error) {
		console.error(error); // Log any errors to the console
		throw error; // Re-throw the error to allow the calling function to handle it
	}
};

const setAnalysesResult = async body => {
	try {
		const conn = await connection.connection(); // Establish a database connection

		// Call getAnalysesResultScores() to fetch the result scores
		let result = await getAnalysesResultScores(body);

		// If use_in_profile is set to 'yes', update the analyses result profile in the database
		if (body.use_in_profile === 'yes') {
			await conn.execute(
				SQL.evaluationsQueries.updateAnalysesResultProfile(
					result?.diagnostic_session.diagnostic,
					result.diagnostic_session.child
				)
			);
		}

		// Process the scores and update the analyses result in the database
		let results = await Promise.all(
			result.scores.map(async score => {
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
						break;
					case 'accordion':
						data = { accordion: formatAccordionData(score.accordion) };
						break;
					case 'text':
					case 'questions':
					case 'answers':
					default:
						data = score.values;
				}

				// Get the tvalue and visibility of the score
				let tvalue = await getTvalue(score);
				let visible = await getScoreVisible(score);

				// Construct the SQL query to update the analyses result in the database
				let sql = SQL.evaluationsQueries.updateAnalysesResult(
					score.type,
					visible,
					tvalue,
					JSON.stringify(data),
					body.session,
					score.scoreName
				);

				// If use_in_profile is set to 'yes', add the profile data to the SQL query
				if (body.use_in_profile) {
					sql = SQL.evaluationsQueries.updateAnalysesResultWithProfile(
						score.type,
						visible,
						tvalue,
						JSON.stringify(data),
						body.session,
						body.use_in_profile,
						score.scoreName
					);
				}

				// Execute the SQL query and return the result
				return await conn.execute(sql);
			})
		);

		conn.release(); // Release the database connection
		return results;
	} catch (error) {
		console.error(error); // Log any errors to the console
		throw error; // Re-throw the error to allow the calling function to handle it
	}
};

const getAnalysesResultScores = async body => {
	const conn = await connection.connection(); // Establish a database connection

	// Fetch the diagnosis session details from the database
	const session = await conn.execute(SQL.diagnosticsQueries.getDiagnosisSessionDetails(body.session));
	let diagnosticId = session[0]?.[0]?.diagnostic;

	// Fetch the child details from the database
	let child = await getChildById(session[0]?.[0]?.child);
	let childAgeInMonths = session[0]?.[0]?.child_age_in_months;
	let childGender = child?.[0]?.gender == 1 ? 'm' : 'w';
	let childLanguage = child?.[0]?.languages.length > 1 ? 'm' : 'e';

	// Fetch the raw and total values from the database
	let data = await conn.execute(SQL.evaluationsQueries.getSumResultAnalysesBySession(body.session));
	let rawValue = data[0]?.[0].raw_value;
	let totalValue = +data[0]?.[0].total_value;

	// Fetch the analyses diagnosis details from the database
	let result = await conn.execute(
		SQL.evaluationsQueries.getAnalysesDiagnosis(diagnosticId, childAgeInMonths, childGender, childLanguage)
	);

	// Fetch the raw values for Akkusativ and Dativ for diagnosis ID 9
	let rawValueAkkusativ, rawValueDativ;
	if (diagnosticId == 9) {
		rawValueAkkusativ = getRawValueByTagName(session, 'Akkusativ');
		rawValueDativ = getRawValueByTagName(session, 'Dativ');
	}

	// Calculate the scores
	let scores = await getAnalysesValue(
		result,
		diagnosticId,
		rawValue,
		body,
		rawValueAkkusativ,
		rawValueDativ,
		childAgeInMonths,
		totalValue
	);

	conn.release(); // Release the database connection

	// Reverse the scores array for diagnosis ID 7
	if (diagnosticId == 7) {
		scores.reverse();
	}

	return { scores: scores, diagnostic_session: session[0]?.[0] };
};
const getAnalysesValue = async (
	result,
	diagnosticId,
	rawValue,
	body,
	rawValueAkkusativ,
	rawValueDativ,
	childAgeInMonths,
	totalValue
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
					let grammars = await getDiagnosisContentGrammars(body);
					raw_value = grammars?.scores?.total.a;
					break;
				}
				case 'Score B ': {
					let grammars = await getDiagnosisContentGrammars(body);
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
	//respect same view np order (Wortschatz: Nomen, Wortschatz: Verben,Aussprache: Phonologie)
	const last = scores.pop();
	scores.unshift(last);
	switch (diagnosticId) {
		case 2:
			scores = await getScoreForTest2(
				scores,
				body.session,
				totalValue,
				childAgeInMonths,
				needs_extended_analysis
			);
		case 3:
		case 4:
		case 8:
			scores = await getScoreTableByTag(scores, body.session, childAgeInMonths, diagnosticId, total);
			break;
		case 5:
			scores = await getScoreForTest5(ratio, scores, hide_questions, body.session, needs_grammar_analysis);
			break;
		case 6:
			scores = await getScoreExtend(scores, body.session, needs_extended_analysis, total);
			break;
		case 9:
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
			break;
		default:
			break;
	}

	conn.release();

	return scores;
};
const getRawValueByTagName = async (session, tagName) => {
	// Use a try-catch block to catch any errors that may occur during the execution of the code.
	try {
		// Rename the `data` variable to `queryResult` to make its purpose clearer.
		const conn = await connection.connection();
		const queryResult = await conn.execute(SQL.evaluationsQueries.getRawValueByTag(session, tagName));
		conn.release();
		// Add a fallback value of 0 in case the query result is undefined or the raw_value property is undefined.
		return +queryResult?.[0]?.[0]?.raw_value || 0;
	} catch (error) {
		// Add an error log to the console in case an error occurs during the execution of the code.
		console.error(`Error in getRawValueByTagName: ${error}`);
		return 0;
	}
};

const getRawValueAppendByTagName = async (session, tagName, id, answerId) => {
	// Use a try-catch block to catch any errors that may occur during the execution of the code.
	try {
		// Rename the `dataAppend` variable to `queryResult` to make its purpose clearer.
		const conn = await connection.connection();
		const queryResult = await conn.execute(
			SQL.evaluationsQueries.getRawValueAppendByTag(id, answerId, session, tagName)
		);
		conn.release();
		// Add a fallback value of 0 in case the query result is undefined or the raw_value_append property is undefined.
		return +queryResult?.[0]?.[0]?.raw_value_append || 0;
	} catch (error) {
		// Add an error log to the console in case an error occurs during the execution of the code.
		console.error(`Error in getRawValueAppendByTagName: ${error}`);
		return 0;
	}
};

const getRawValueAppend = async (session, id, answerId) => {
	// Use a try-catch block to catch any errors that may occur during the execution of the code.
	try {
		// Rename the `data` variable to `queryResult` to make its purpose clearer.
		const conn = await connection.connection();
		const queryResult = await conn.execute(SQL.evaluationsQueries.getRawValueAppend(id, answerId, session));
		conn.release();
		// Add a fallback value of 0 in case the query result is undefined or the raw_value_append property is undefined.
		return +queryResult?.[0]?.[0]?.raw_value_append || 0;
	} catch (error) {
		// Add an error log to the console in case an error occurs during the execution of the code.
		console.error(`Error in getRawValueAppend: ${error}`);
		return 0;
	}
};

const getRawValues = async (session, diagnosticId) => {
	// Initialize an empty array for raw_values.
	let raw_values = [];

	if (diagnosticId) {
		// Use a try-catch block to catch any errors that may occur during the execution of the code.
		try {
			const conn = await connection.connection();
			const queryResult = await conn.execute(SQL.evaluationsQueries.getTagsResult(session));
			// Use the Array.prototype.map method to create an array of objects with the name and value properties.
			raw_values = queryResult?.[0]?.map(item => ({ name: item.name, value: item.raw_value })) || [];
			conn.release();
		} catch (error) {
			console.error(`Error in getRawValues: ${error}`);
			return raw_values;
		}
	}

	// Return the raw_values array.
	return raw_values;
};

const diagnostic_10_Result = async (session, diagnosticId, rawValue) => {
	// Initialize an empty array for scoreTable.
	let scoreTable = [];

	try {
		const conn = await connection.connection();
		const diagnosisContentResult = await conn.execute(SQL.diagnosticsQueries.getDiagnosisContentById(diagnosticId));
		// Use the Array.prototype.map method to create an array of objects for scoreTable.
		scoreTable =
			diagnosisContentResult?.[0]?.map(item => ({
				scoreName: 'Detailauswertung ' + item.name,
				type: 'table',
				visible: 'yes',
				head: ['label_skill', 'label_exists'],
				values: []
			})) || [];

		const resultExtend = await conn.execute(
			SQL.evaluationsQueries.getResultDiagnosticExtend(diagnosticId, session)
		);
		let show_do_extended_analysis = true;
		// Use a for-of loop instead of Array.prototype.map to work with async-await.
		for (const item of resultExtend?.[0] || []) {
			let answerScore = 'Nein';
			if (item.answer == 'checked') {
				rawValue = +rawValue + 1;
				answerScore = 'Ja';
			}
			if (item.answer != null) show_do_extended_analysis = false;
			const foundIndex = scoreTable.findIndex(x => x.scoreName == 'Detailauswertung ' + item.name);
			scoreTable[foundIndex].values.push({
				label: item.label,
				score: answerScore
			});
		}

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
			// Use Array.prototype.forEach instead of for-of loop to set table scores to not visible.
			scoreTable.forEach(score => {
				if (score.type == 'table') score.visible = 'no';
			});
		}

		conn.release();
		return { scoreTable: scoreTable, rawValue: rawValue };
	} catch (error) {
		console.error(`Error in diagnostic_10_Result: ${error}`);
		return { scoreTable: scoreTable, rawValue: rawValue };
	}
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

	// Use a for-of loop instead of Array.prototype.map to work with async-await.
	for (const answer of extendAnswer?.[0] || []) {
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
	}

	if (score_name == 'MLU') {
		// Calculate rawValue and set decimals to 1 for MLU score.
		let rawValue = sentences > 0 ? (words / sentences).toFixed(2) : 0;
		rawValue = rawValue.substring(0, rawValue.length - 1);
		decimals = 1;
		// Return object with rawValue, ratio, and decimals properties.
		return { rawValue: +rawValue, ratio: ratio, decimals: decimals };
	} else {
		// Calculate rawValue for Vollständigkeit score.
		let rawValue = total > 0 ? Math.trunc((full / total) * 100) : 0;
		type_total = type1 + type2;
		// Calculate ratio if type_total is greater than 0.
		if (type_total > 0) {
			ratio = Math.round((type1 / type_total) * 100) + '% - ' + Math.round((type2 / type_total) * 100) + '%';
		}
		conn.release();
		// Return object with rawValue, ratio, and decimals properties.
		return { rawValue: rawValue, ratio: ratio, decimals: decimals };
	}
};

const getScoreTableByTag = async (scores, session, childAgeInMonths, diagnosticId, total) => {
	let values = [];
	const conn = await connection.connection();
	const resultTag = await conn.execute(SQL.evaluationsQueries.getResultTag(session, childAgeInMonths, diagnosticId));

	// Use a for-of loop instead of Array.prototype.map to work with async-await.
	for (const item of resultTag?.[0] || []) {
		if (item.count_tag > 0) {
			total = total + item.count_incorrect;
			values.push({
				name: item.name,
				mistakes_per_items: item.count_incorrect + '/' + item.count_tag,
				count_incorrect: item.count_incorrect
			});
		}
	}

	scores.push({
		scoreName: 'Detailauswertung',
		type: 'table',
		head: ['label_structure', 'label_mistakes_per_items', 'label_error_distribution'],
		// Use await to calculate the error distribution and set the 'values' property.
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

	// Use Promise.all to make all the async calls concurrently and wait for them to finish.
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
			// No need to return anything from this map function.
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
		// Use await to calculate the error distribution and set the 'values' property.
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
};
const getScoreForTest5 = async (ratio, scores, hide_questions, session, needs_grammar_analysis) => {
	// establish database connection
	const conn = await connection.connection();

	// add ratio value to 'Situationsbilder beschreiben' score
	scores[scores.findIndex(x => x.scoreName == 'Situationsbilder beschreiben')].values.push({
		name: 'Ausl. obl. Konst. - Ausl. Funktionswort',
		raw_value: ratio
	});

	// add 'Detaillierte Auswertung' score
	scores.push({
		scoreName: 'Detaillierte Auswertung',
		type: 'text',
		visible: hide_questions ? 'no' : 'yes',
		label: 'label_do_answer_questions'
	});

	// add 'Fragen' score
	scores.push({
		scoreName: 'Fragen',
		type: 'questions',
		visible: hide_questions ? 'no' : 'yes',
		values: []
	});

	// get content analysis questions from the database and add them to the 'Fragen' score
	const contentResult = await conn.execute(SQL.evaluationsQueries.getContentAnalysisQuestions(5, session));
	contentResult?.[0]?.forEach(async item => {
		if (item.answer && item.answer == 'correct') needs_grammar_analysis = true;
		scores[scores.findIndex(x => x.scoreName == 'Fragen')].values.push(item);
	});

	// add 'Antworten' score
	scores.push({
		scoreName: 'Antworten',
		type: 'answers',
		visible: hide_questions ? 'no' : 'yes',
		values: []
	});

	// get extended answers from the database and add them to the 'Antworten' score
	let resultExtend = await conn.execute(SQL.evaluationsQueries.getExtendedAnswers(session));
	resultExtend?.[0]?.forEach(async item => {
		item.additional = JSON.parse('[' + item.additional + ']');
		scores[scores.findIndex(x => x.scoreName == 'Antworten')].values.push(item);
	});

	// add recommendation for detailed grammar analysis if necessary
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

	// add message for no need for grammar analysis if necessary
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

	// release database connection
	conn.release();

	// return scores array
	return scores;
};

// calculate error distribution for each value in the array based on the total
// number of errors and the provided property that represents the error count
const calculateErrorDistribution = (values, property, total, errorType) => {
	return values.map(value => {
		const percent = total !== 0 ? Math.round((value[property] / total) * 100) : 0;
		value[errorType] = `${percent}%`;
		// remove the 'count_incorrect' property to clean up the output
		if (property === 'count_incorrect') delete value.count_incorrect;
		return value;
	});
};

// helper function to get the tvalue from a score object
const getTvalue = score => (score.tvalue ? score.tvalue : 0);

// helper function to get the visible property from a score object
const getScoreVisible = score => (score.visible ? score.visible : 'yes');

// helper function to get the value from an array of raw values based on its name property
const getRawValue = (raw_values, name) => {
	const item = raw_values.find(item => item.name === name);
	return item ? item.value : null;
};

// helper function to check if a grammar analysis is needed based on the score and age of the child
const checkNeedGrammarAnalyses = (score, score_name, childAgeInMonths) => {
	return (score?.interpretation < 0 && score_name.indexOf('Score') === -1) || childAgeInMonths < 36;
};

const setDiagnosticResultDetail = async body => {
	let results;
	const conn = await connection.connection();

	// Destructure the input parameters
	const { session, diagnosticId, diagnosticContent, answer, answerId } = body;

	// Check if session, diagnosticId and diagnosticContent are defined
	if (session && diagnosticId && diagnosticContent) {
		// Get the diagnostic result detail using diagnosticId, diagnosticContent and session as parameters
		let result = await conn.execute(
			SQL.evaluationsQueries.getDiagnosticResultDetail(diagnosticId, diagnosticContent, session)
		);

		// Check if answer and answerId are defined
		if (answer && answerId) {
			// If result is found, edit the diagnostic result detail using the same parameters as setDiagnosticResultDetail
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
			}
			// If result is not found, set a new diagnostic result detail using the same parameters as setDiagnosticResultDetail
			else {
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
	try {
		const conn = await connection.connection();
		const data = await conn.execute(SQL.evaluationsQueries.getArticulationType);
		conn.release();
		return data[0];
	} catch (err) {
		console.error(`Error in getArticulationTypes: ${err}`);
		throw err;
	}
};

const getLexiconErrorTypes = async () => {
	try {
		const conn = await connection.connection();
		const data = await conn.execute(SQL.evaluationsQueries.getLexiconErrorType);
		conn.release();
		return data[0];
	} catch (err) {
		console.error(`Error in getLexiconErrorTypes: ${err}`);
		throw err;
	}
};

const getDiagnosisContentGrammars = async body => {
	try {
		const conn = await connection.connection();
		let sql = SQL.diagnosticsQueries.getDiagnosisGrammar(body.childAgeInMonths);

		// Conditionally add session to the SQL query
		if (body.session) {
			sql = SQL.diagnosticsQueries.getDiagnosisGrammarWitSession(body.session, body.childAgeInMonths);
		}

		const data = await conn.execute(sql);

		// Initialize variables for scores
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

		// Loop through data and calculate scores
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

		// Add last group scores to scores object
		scores.groups.push({
			name: last_group_name,
			a: group_a_score,
			b: group_b_score,
			a_total: group_a_score_total,
			b_total: group_b_score_total
		});

		// Add total scores to scores object
		scores.total.a = a_score;
		scores.total.b = b_score;

		conn.release();
		return { scores, items };
	} catch (err) {
		// Handle errors
		console.error(err);
		throw err;
	}
};

// Fetches segments for consonants from the database
const getSegmentsForConsonants = async () => {
	const conn = await connection.connection();
	let data = await conn.execute(SQL.evaluationsQueries.getSegment);
	conn.release();
	return data[0];
};

// Fetches segments for vowels from the database and formats the result
const getSegmentsForVowels = async () => {
	const conn = await connection.connection();
	let data = await conn.execute(SQL.evaluationsQueries.getVowels);
	let result = [];
	data[0].map(item => {
		item.letters = item.name;
		result.push(item);
	});
	conn.release();
	return result;
};

const getWordPhonetic = async (score_append_text, id, session, answerId) => {
	// Establish database connection
	const conn = await connection.connection();

	// Initialize empty array for word phonetic data
	let word_phonetic = [];

	// Get diagnosis content result details from the database
	const data = await conn.execute(SQL.diagnosticsQueries.getDiagnosisContentResultDetails(id, session, answerId));

	// Push the name and index of each item in data to the word phonetic array
	data?.[0]?.forEach((item, index) => {
		word_phonetic.push({ name: index + 1, value: item.name });

		// Add the item name to score_append_text if answerId is 'answer_08'
		if (answerId == 'answer_08') score_append_text += item.name + ', ';
	});

	// Remove the last comma and add a period to the end of score_append_text
	score_append_text = score_append_text.slice(0, -1) + '.';

	// Release the database connection
	conn.release();

	// Return an object with score_append_text, word_phonetic, and data
	return { score_append_text: score_append_text, word_phonetic: word_phonetic, data: data[0] };
};

const getLexiconErrorType = async (session, id, answerId, tagName, errorTypeTag) => {
	let lexicon = [];
	try {
		const conn = await connection.connection();
		// Use template literals to avoid concatenation errors and improve readability
		const dataError = await conn.execute(
			SQL.evaluationsQueries.getLexiconErrorTypeByTagName(session, id, answerId, tagName, errorTypeTag)
		);
		dataError?.[0]?.forEach(item => {
			lexicon.push({
				name: item.name,
				count: item.count,
				total: item.total
			});
		});
		lexicon.forEach(lexic => {
			let percent = lexic.total != 0 ? Math.round((lexic.count / lexic.total) * 100) : 0;
			// Modify properties to use more descriptive names and simplify code later
			lexic.count_related = `${lexic.count}/${lexic.total}`;
			lexic.error_distribution = `${percent}%`;
			delete lexic.count;
			delete lexic.total;
		});
		conn.release();
	} catch (err) {
		console.error(err);
	}
	return lexicon;
};

const getTruncation = async (session, childAgeInMonths) => {
	// Declare an empty array for truncations
	let truncations = [];

	// Connect to the database
	const conn = await connection.connection();

	// Execute SQL query to get target items having phonetic structure
	const dataTarget = await conn.execute(
		SQL.evaluationsQueries.getTargetItemHavingPhonetic(session, childAgeInMonths)
	);

	// Loop through the target items returned from the query
	dataTarget?.[0]?.forEach(item => {
		let key = item.phonetic_structure;

		// Clean up the HTML of the target item
		let target = '<p class="word clearfix">' + item.target_item_html + '</p>';
		target = target.replace('\n', '');
		target = target.replace('"', '"');
		target = target.replace('  ', '');
		target = target.replace('> <', '><');

		// If the answer is not null, clean up the HTML of the answer
		let realized_as;
		if (item.answer_04 == null) {
			realized_as = target;
		} else {
			realized_as = '<p class="word clearfix">' + item.answer_04 + '</p>';
			realized_as = realized_as.replace('\n', '');
			realized_as = realized_as.replace('"', '"');
			realized_as = realized_as.replace('  ', '');
		}

		// Find the index of the current key in the truncations array
		let foundIndex = truncations.findIndex(x => x.name == key);

		// If the key already exists in the truncations array, add the target and realized_as to its corresponding item
		if (truncations[foundIndex]) {
			truncations[foundIndex].target += target;
			truncations[foundIndex].realized_as += realized_as;
		}
		// If the key does not exist in the truncations array, add a new item for it
		else {
			truncations.push({
				name: key,
				target: target,
				realized_as: realized_as
			});
		}
	});

	// Release the database connection
	conn.release();

	// Return the truncations array
	return truncations;
};

const getPhoneticContentData = async (session, childAgeInMonths, tagName = '') => {
	const conn = await connection.connection();
	let sql = SQL.evaluationsQueries.getTargetItem(session, childAgeInMonths);

	// Change SQL query based on tag name parameter
	if (tagName === 'articulation') {
		sql = SQL.evaluationsQueries.getAnswer_04(session);
	} else if (tagName !== '') {
		sql = SQL.evaluationsQueries.getTargetItemByTag(session, childAgeInMonths, tagName);
	}

	// Retrieve target items from the database
	const dataTargetHtml = await conn.execute(sql);

	let phonetic_contents_data = [];

	// Loop through target items and parse JSON data, if applicable
	dataTargetHtml?.[0]?.forEach(item => {
		if (item.answer_04 != null) {
			if (item.answer_04.indexOf('data-json') !== -1) {
				let expression = /data-json=\"([^"]*)\"/;
				let matches = item.answer_04.match(expression);
				if (matches.length > 0) {
					item.json = parseDataJson(matches[1]);
				}
			}
		}

		// Modify phonetic structure and segment properties for certain tag names
		if (tagName !== '' && tagName !== 'articulation') {
			item.phonetic_structure = item.phonetic_structure.replace(', ', ',');
			item.segment = item.phonetic_structure.split(',');
		}

		phonetic_contents_data.push(item);
	});

	conn.release();
	return phonetic_contents_data;
};

const getSyllablesStructure = async (phonetic_contents_data, totalValue) => {
	let count_initial_consonant_removed = 0,
		count_initial_consonant_total = 0,
		count_initial_bonding_removed = 0,
		count_initial_bonding_total = 0,
		count_final_consonant_removed = 0,
		count_final_consonant_total = 0,
		count_final_bonding_removed = 0,
		count_final_bonding_total = 0,
		count_bonding_reduction = 0,
		count_bonding_reduction_total = 0,
		count_deaffrication = 0,
		count_deaffrication_total = 0,
		count_addition = 0;
	phonetic_contents_data.map(item => {
		if (item.answer_04 != null) {
			let html = item.answer_04;
			if (item.json) {
				if (item.json.structures.initial_consonant_removed)
					count_initial_consonant_removed += item.json.structures.initial_consonant_removed;
				if (item.json.structures.initial_bonding_removed)
					count_initial_bonding_removed += item.json.structures.initial_bonding_removed;
				if (item.json.structures.final_consonant_removed)
					count_final_consonant_removed += item.json.structures.final_consonant_removed;
				if (item.json.structures.final_bonding_removed)
					count_final_bonding_removed += item.json.structures.final_bonding_removed;
				if (item.json.structures.bonding_reduction)
					count_bonding_reduction += item.json.structures.bonding_reduction;
				if (item.json.structures.deaffrication) count_deaffrication += item.json.structures.deaffrication;
			} else html = item.target_item_html;
			count_initial_consonant_total += html.match(/letter initial/g)?.length || 0;
			count_initial_bonding_total += html.match(/bond initial/g)?.length || 0;
			count_final_consonant_total += html.match(/letter final/g)?.length || 0;
			count_final_bonding_total += html.match(/bond final/g)?.length || 0;
			count_bonding_reduction_total += html.match(/bond/g)?.length || 0;
			count_deaffrication_total += html.match(/affricate/g)?.length || 0;
			count_addition += html.match(/added/g)?.length || 0;
		}
	});
	return [
		{
			name: 'label_initial_consonant_removed',
			value: count_initial_consonant_removed + '/' + count_initial_consonant_total
		},
		{
			name: 'label_initial_bonding_removed',
			value: count_initial_bonding_removed + '/' + count_initial_bonding_total
		},
		{
			name: 'label_final_consonant_removed',
			value: count_final_consonant_removed + '/' + count_final_consonant_total
		},
		{
			name: 'label_final_bonding_removed',
			value: count_final_bonding_removed + '/' + count_final_bonding_total
		},
		{
			name: 'label_bonding_reduction',
			value: count_bonding_reduction + '/' + count_bonding_reduction_total
		},
		{
			name: 'label_deaffrication',
			value: count_deaffrication + '/' + count_deaffrication_total
		},
		{
			name: 'label_addition',
			value: count_addition + '/' + totalValue
		}
	];
};
const getConsonantStructures = async phonetic_contents_data => {
	let count_bonds_incorrect = 0,
		count_bonds_total = 0,
		count_first_replaced = 0,
		count_second_replaced = 0,
		count_third_replaced = 0,
		count_bonds_double = 0,
		count_bonds_triple = 0,
		count_all_replaced_in_bond = 0,
		count_all_removed_in_bond = 0,
		count_reduction_on_first = 0,
		count_reduction_on_second = 0,
		count_reduction_on_third = 0,
		count_reduction_on_x = 0;

	let affections = {
		first_replaced: '',
		second_replaced: '',
		third_replaced: '',
		all_replaced: '',
		reduction_on_first: '',
		reduction_on_second: '',
		reduction_on_third: '',
		reduction_on_x: '',
		all_removed: ''
	};
	phonetic_contents_data.map(item => {
		if (item.answer_04 != null) {
			let html = item.answer_04;
			if (item.json) {
				count_bonds_incorrect += item.json.structures.bonds_at_least_one_incorrect ? 1 : 0;
				if (item.json.consonants.count_first_replaced) {
					count_first_replaced += item.json.consonants.count_first_replaced;
					affections.first_replaced +=
						'<span class="before">' +
						item.target_item_html +
						'</span><span class="after">' +
						item.answer_04 +
						'</span><br/>';
				}
				if (item.json.consonants.count_second_replaced) {
					count_second_replaced += item.json.consonants.count_second_replaced;
					affections.second_replaced +=
						'<span class="before">' +
						item.target_item_html +
						'</span><span class="after">' +
						item.answer_04 +
						'</span><br/>';
				}
				if (item.json.consonants.count_third_replaced && item.json.consonants.count_third_replaced > 0) {
					count_third_replaced += item.json.consonants.count_third_replaced;
					affections.third_replaced +=
						'<span class="before">' +
						item.target_item_html +
						'</span><span class="after">' +
						item.answer_04 +
						'</span><br/>';
				}
				if (item.json.consonants.all_replaced_in_bond) {
					count_all_replaced_in_bond += item.json.consonants.all_replaced ? 1 : 0;
					affections.all_replaced +=
						'<span class="before">' +
						item.target_item_html +
						'</span><span class="after">' +
						item.answer_04 +
						'</span><br/>';
				}
				if (item.json.consonants.reduction_on_first) {
					count_reduction_on_first += item.json.consonants.reduction_on_first ? 1 : 0;
					affections.reduction_on_first +=
						'<span class="before">' +
						item.target_item_html +
						'</span><span class="after">' +
						item.answer_04 +
						'</span><br/>';
				}
				if (item.json.consonants.reduction_on_second) {
					count_reduction_on_second += item.json.consonants.reduction_on_second ? 1 : 0;
					affections.reduction_on_second +=
						'<span class="before">' +
						item.target_item_html +
						'</span><span class="after">' +
						item.answer_04 +
						'</span><br/>';
				}
				if (item.json.consonants.reduction_on_third) {
					count_reduction_on_third += item.json.consonants.reduction_on_third ? 1 : 0;
					affections.reduction_on_third +=
						'<span class="before">' +
						item.target_item_html +
						'</span><span class="after">' +
						item.answer_04 +
						'</span><br/>';
				}
				if (item.json.consonants.reduction_on_x) {
					count_reduction_on_x += item.json.consonants.reduction_on_x ? 1 : 0;
					affections.reduction_on_x +=
						'<span class="before">' +
						item.target_item_html +
						'</span><span class="after">' +
						item.answer_04 +
						'</span><br/>';
				}
				if (item.json.consonants.all_removed_in_bond) {
					count_all_removed_in_bond += item.json.consonants.all_removed_in_bond ? 1 : 0;
					affections.all_removed +=
						'<span class="before">' +
						item.target_item_html +
						'</span><span class="after">' +
						item.answer_04 +
						'</span><br/>';
				}
			} else html = item.target_item_html;
			count_bonds_total += html.match('/bond/g');
			count_bonds_double += html.match('/double/g');
			count_bonds_triple += html.match('/triple/g');
		}
	});
	Object.entries(affections).map(([k, v]) => {
		let value = '<p class="word clearfix">' + v + '</p>';
		value = value.replace('\n', '');
		value = value.replace('"', '"');
		value = value.replace('  ', '');
		value = value.replace('> <', '><');
		v = value;
		return v;
	});
	let count_bonds_correct = count_bonds_total - count_bonds_incorrect;
	return [
		{
			name: 'label_bonds_all_correct',
			replaced: count_bonds_correct + '/' + count_bonds_total,
			affection: '-'
		},
		{
			name: 'label_first_replaced',
			replaced: count_first_replaced + '/' + count_bonds_total,
			affection: affections['first_replaced'] != '' ? affections['first_replaced'] : '-'
		},
		{
			name: 'label_second_replaced',
			replaced: count_second_replaced + '/' + count_bonds_total,
			affection: affections['second_replaced'] != '' ? affections['second_replaced'] : '-'
		},
		{
			name: 'label_third_replaced',
			replaced: count_third_replaced + '/' + count_bonds_triple,
			affection: affections['third_replaced'] != '' ? affections['third_replaced'] : '-'
		},
		{
			name: 'label_all_replaced_in_bond',
			replaced: count_all_replaced_in_bond + '/' + count_bonds_total,
			affection: affections['all_replaced'] != '' ? affections['all_replaced'] : '-'
		},
		{
			name: 'label_reduction_on_first',
			replaced: count_reduction_on_first + '/' + count_bonds_total,
			affection: affections['reduction_on_first'] != '' ? affections['reduction_on_first'] : '-'
		},
		{
			name: 'label_reduction_on_second',
			replaced: count_reduction_on_second + '/' + count_bonds_total,
			affection: affections['reduction_on_second'] != '' ? affections['reduction_on_second'] : '-'
		},
		{
			name: 'label_reduction_on_third',
			replaced: count_reduction_on_third + '/' + count_bonds_triple,
			affection: affections['reduction_on_third'] != '' ? affections['reduction_on_third'] : '-'
		},
		{
			name: 'label_reduction_on_x',
			replaced: count_reduction_on_x + '/' + count_bonds_total,
			affection: affections['reduction_on_x'] != '' ? affections['reduction_on_x'] : '-'
		},
		{
			name: 'label_all_removed_in_bond',
			replaced: count_all_removed_in_bond + '/' + count_bonds_total,
			affection: affections['all_removed'] != '' ? affections['all_removed'] : '-'
		}
	];
};
const getContextProcesses = async (session, total_for_processes) => {
	// Establish a database connection
	const conn = await connection.connection();

	// Initialize an empty array for context processes
	let context_processes = [];

	// Get the extended diagnosis question data for the session
	const dataExtendQuestion = await conn.execute(
		SQL.diagnosticsQueries.getDiagnosisExtendedQuestion(session, '02', 'answer_05', 'answer_06', 'answer_07')
	);

	// Map the question data to the context process array
	dataExtendQuestion?.[0]?.forEach(item => {
		context_processes.push({
			questionId: item.question_id,
			score: (item.score !== '' && item.score!==null ? item.score : '0') + '/' + total_for_processes
		});
	});

	// Release the database connection
	conn.release();

	// Return the context process array
	return context_processes;
};
async function GetSubstituionsAndSoundPreference(phonetic_contents_data) {
	// Initialize arrays for substitution processes and sound preferences
	let substitution_processes = [];
	let sound_preferences = [];

	// Get the articulation types
	let articulation_types = await getArticulationTypes();

	// Map the articulation types to the substitution process array
	articulation_types.map(articulation_type => {
		substitution_processes.push({
			name: articulation_type.name,
			affects: '',
			count: 0
		});
	});

	// Loop through the phonetic content data
	phonetic_contents_data.map(phoneticContent => {
		if (phoneticContent.json?.replacements) {
			// Loop through the replacements in the phonetic content
			phoneticContent.json.replacements.map(replacement => {
				// Check if the replacement segment contains 'initial', 'medial', or 'final'
				if (
					replacement.segment.indexOf('initial') !== -1 ||
					replacement.segment.indexOf('medial') !== -1 ||
					replacement.segment.indexOf('final') !== -1
				) {
					// Find the index of the sound preference with the same name as the original sound
					let foundIndex = sound_preferences.findIndex(x => x.name == replacement.original);

					// If the sound preference does not exist, create it
					if (foundIndex == -1) {
						sound_preferences.push({
							name: replacement.original,
							initial: '',
							medial: '',
							final: '',
							total: 0
						});
					} else {
						// Update the sound preference with the replacement information
						Object.entries(sound_preferences[foundIndex]).forEach(([k, v]) => {
							if (
								replacement.segment.indexOf(k) == -1 &&
								replacement.replaced.indexOf(v) == -1 &&
								k !== 'name'
							) {
								sound_preferences[foundIndex][k] = v + (v == '' ? '' : ', ') + replacement.replaced;
								sound_preferences[foundIndex].total++;
							}
						});
					}
				}

				// Check if the replacement is selected
				if (replacement.selected) {
					// Split the selected types by comma
					let selected_types = replacement.selected.split(',');

					// Loop through the selected types
					selected_types.map(type_id => {
						// Find the index of the articulation type with the same ID as the selected type
						let foundIndex = articulation_types.findIndex(x => x.id == type_id);
						let index = substitution_processes.findIndex(
							x => x.name == articulation_types[foundIndex].name
						);

						// Update the substitution process with the replacement information
						let affects = substitution_processes[index].affects;
						substitution_processes[index].affects =
							affects + (affects == '' ? '' : ', ') + replacement.original;
						let count = substitution_processes[index].count;
						substitution_processes[index].count = count + 1;
					});
				}
			});
		}
	});

	// Remove sound preferences with a total count of less than 2 and nullify the total count of the rest
	sound_preferences.forEach(sound_preference => {
		if (sound_preference.total < 2) {
			sound_preference = null;
		} else {
			sound_preference.total = null;
		}
	});

	// Return the substitution processes and sound preferences
	return { substitution_processes, sound_preferences };
}

async function getSubstitutions(phonetic_contents, segments, type) {
	// Initialize arrays for substitutions and substitution groups
	let substitutions = [];
	let substitution_groups = [];

	// Set the class name to 'even'
	let className = 'even';

	// Get the articulation types
	const articulation_types = await getArticulationTypes();

	// Loop through the segments
	segments.map(segment => {
		// Initialize variables
		let realized_as = '';
		let testcase = '';
		let processData = '';
		let constancy_consequence = '';
		let has_all_replaced = true;
		let has_replacement = false;
		let has_target_item = false;
		let replaced_letters = [];

		// Loop through the phonetic contents
		phonetic_contents.map(phonetic_content => {
			if (phonetic_content.segment) {
				// Loop through the segments in the phonetic content
				phonetic_content.segment.map(phonetic_segment => {
					if (phonetic_segment == segment.name) {
						has_target_item = true;
						has_replacement = false;

						// Loop through the replacements in the phonetic content
						if (phonetic_content.json?.replacements) {
							phonetic_content.json.replacements.map(replacement => {
								if (replacement.segment == segment.name) {
									has_replacement = true;
									if (!replaced_letters.includes(replacement.replaced))
										replaced_letters.push(replacement.replaced);
									realized_as += '<p>' + replacement.replaced + '</p>';
									if (replacement.selected) {
										processData += '<p class="process">';
										selected_types = replacement.selected.split(',');
										selected_types.map(type_id => {
											let foundIndex = articulation_types.findIndex(x => x.id == type_id);
											processData += `<span data-tooltip title="${articulation_types[foundIndex].name}" data-position="top" data-alignment="center">${articulation_types[foundIndex].short}</span>`;
										});
										processData += '</p>';
									}
								}
							});
						}

						// Add the realized_as and testcase to the variables
						if (has_replacement) {
							realized_as += `<p>${segment.letters}</p>`;
							has_all_replaced = false;
						}
						testcase += `<p>${phonetic_content.target_item}</p>`;
					}
				});
			}
		});

		if (has_target_item) {
			processData = processData.replace('"', '"');

			// Find the index of the substitution group with the same name as the segment letters
			let index = substitution_groups.findIndex(x => x.name == segment.letters);

			// If the substitution group does not exist, create it
			if (index == -1) {
				substitution_groups.push({
					name: segment.letters,
					substitutions: [],
					replaced_letters: [],
					has_replacements: false,
					constancy: false,
					consequence: false
				});
			} else {
				// Add the substitution to the substitution group
				substitution_groups[index]?.substitutions.push({
					name: segment.name,
					has_replacement: replaced_letters.length > 0 ? true : false,
					has_all_correct: replaced_letters.length == 0 ? true : false,
					has_all_replaced: has_all_replaced,
					replaced_letters: replaced_letters,
					columns: [realized_as, testcase, processData, constancy_consequence]
				});
			}
		}
	});

	// Loop through the substitution groups
	substitution_groups.forEach(v => {
		let count_all_correct = 0;
		let count_all_replaced = 0;
		// Loop through the substitutions in the substitution group
		v.substitutions.map(value => {
			if (value.has_all_correct) {
				count_all_correct++;
			}
			if (value.has_all_replaced) {
				count_all_replaced++;
			}
			if (value.has_replacement) {
				v.has_replacements = value.has_replacement;
			}
			if (value.replaced_letters.length) {
				value.replaced_letters.map(letter => {
					if (!v.replaced_letters.includes(letter)) v.replaced_letters.push(letter);
				});
			}
		});

		// Set the constancy property of the substitution group
		if (count_all_replaced == v.substitutions.length || count_all_correct == v.substitutions.length) {
			v.constancy = true;
		}

		if (v.replaced_letters.length == 1) {
			v.constancy = true;
		}
	});

	// Loop through the substitution groups
	substitution_groups.forEach(group => {
		if (group.has_remplacements) className = className == 'even' ? 'ood' : 'even';

		// Loop through the substitutions in the substitution group
		group.substitutions.map((v, index) => {
			if (index == 0)
				v.columns[3] =
					'<p>' +
					(group.constancy ? 'konstant' : 'inkonstant') +
					' ' +
					(group.consequence ? 'konsequent' : 'inkonsequent') +
					'</p>';

			v.class = className;

			if (type == 'vowels') {
				delete v.columns[2];
			}

			// Add the substitution to the substitutions array
			return substitutions.push({
				name: v.name,
				columns: v.columns,
				class: v.class
			});
		});
	});

	// Return the substitutions
	return substitutions;
}

// Refactored function: getScoreForTest2
async function getScoreForTest2(scores, session, totalValue, childAgeInMonths, needs_extended_analysis) {
	// Initialize variables
	let score_append_text = '<br/>';
	let count_syllables_stressed = 0,
		count_syllables = 0,
		count_syllables_removed_stressed = 0,
		count_syllables_removed_unstressed = 0;

	// Establish database connection
	const conn = await connection.connection();

	// Fetch and update phonetic deformity results
	let result_phonetic_deformity = await getWordPhonetic(score_append_text, '02', session, 'answer_08');
	score_append_text = result_phonetic_deformity.score_append_text;

	// Fetch and store accentuation change results
	let result_accentuation_change = await getWordPhonetic(score_append_text, '02', session, 'answer_09');

	// Push phonetic deformity results to scores
	scores.push({
		scoreName: 'Phonetik',
		type: 'message',
		visible: result_accentuation_change.data.length > 0 ? 'yes' : 'no',
		label: 'label_phonetic_deformity',
		append_text: score_append_text
	});

	// Push extended analysis recommendation to scores
	scores.push({
		scoreName: 'Empfehlung zur Detailauswertung',
		type: 'message',
		visible: 'yes',
		label: needs_extended_analysis
			? 'label_do_extended_analysis_phonetic'
			: 'label_no_need_for_extended_analysis_phonetic',
		class: needs_extended_analysis ? 'alert' : 'success'
	});

	// Fetch not evaluable results
	let result_not_evaluable = await getWordPhonetic(score_append_text, '02', session, 'answer_11');
	let total_for_processes = totalValue - result_not_evaluable.data.length;

	// Check if diagnostic extension exists
	let questionIds = await conn.execute(SQL.diagnosticsQueries.getDiagnosticExtendsIds(2, session, childAgeInMonths));
	let hasDiagnosticExtension = false;
	if (questionIds?.[0]?.[0]?.answer_ids && questionIds?.[0]?.[0]?.answer_ids.length > 0) {
		hasDiagnosticExtension = true;
	}

	// Fetch phonetic contents
	let phonetic_contents = await conn.execute(
		SQL.diagnosticsQueries.getDiagnosisContent(
			2,
			session,
			childAgeInMonths,
			questionIds?.[0]?.[0]?.answer_ids,
			hasDiagnosticExtension
		)
	);

	// Count diagnostic content attributes
	let count_diagnostic_contents = phonetic_contents[0].length;
	phonetic_contents[0].forEach(item => {
		let html = item.target_item_html;
		if (html.indexOf('stressed') !== -1) count_syllables_stressed++;
		if (item.json) {
			if (item.json.syllables.count_removed_stressed)
				count_syllables_removed_stressed += item.json.syllables.count_removed_stressed;
			if (item.json.syllables.count_removed_unstressed)
				count_syllables_removed_unstressed += item.json.syllables.count_removed_unstressed;
		}
		const matches = html.match(/syllable/g);
		if (matches != null) count_syllables += matches.length;
	});

	// Fetch data sum
	const dataSum = await conn.execute(
		SQL.evaluationsQueries.getDiagnosisResultDetails(session, '02', 'answer_09', 'incorrect')
	);
	count_accentuation = +dataSum[0][0]?.count_accentuation;

	// Fetch various phonetic content data
	let phonetic_content = await getPhoneticContentData(session, childAgeInMonths);
	let phonetic_contents_segment = await getPhoneticContentData(session, childAgeInMonths, 'Segment');
	let segments = await getSegmentsForConsonants();
	let phonetic_contents_vokal = await getPhoneticContentData(session, childAgeInMonths, 'Vokal');
	let segmentsvowels = await getSegmentsForVowels();
	let phonetic_contents_Articulation = await getPhoneticContentData(session, childAgeInMonths, 'articulation');
	let resultPhoneticProcesses = await GetSubstituionsAndSoundPreference(phonetic_contents_Articulation);

	// Push results to scores
	scores.push({
		scoreName: 'Ergebnisübersicht',
		type: 'accordion',
		accordion: {
			'Lexikon: Nomen': {
				head: ['label_error_type', 'label_error_count', 'label_error_distribution'],
				values: await getLexiconErrorType(session, '02', 'answer_02', 'Nomen', 'Nomen')
			},
			'Lexikon: Verben': {
				head: ['label_error_type', 'label_error_count', 'label_error_distribution'],
				values: await getLexiconErrorType(session, '02', 'answer_02', 'Verb', 'Verben')
			},
			'Aussprache: Kontextprozesse': {
				head: ['label_context_processes', 'label_amount_possibilities'],
				values: await getContextProcesses(session, total_for_processes)
			},
			'Aussprache: Veränderung der Wortstruktur und Wortbetonung': {
				head: ['label_error_type', 'label_amount_possibilities'],
				values: [
					{
						name: 'Auslassung betonter Silben',
						value: count_syllables_removed_stressed + '/' + count_syllables_stressed
					},
					{
						name: 'Auslassung unbetonter Silben',
						value: count_syllables_removed_unstressed + '/' + count_syllables
					},
					{ name: 'Betonungsveränderungen', value: count_accentuation + '/' + count_diagnostic_contents }
				]
			},
			'Aussprache: Trunkierung von Mehrsilbern durch Silbenauslassung': {
				head: ['label_stress_pattern', 'label_target', 'label_realized_as'],
				class: 'truncations',
				values: await getTruncation(session, childAgeInMonths)
			},
			'Aussprache: Silbenstrukturprozesse': {
				head: ['label_error_type', 'label_amount_possibilities'],
				values: await getSyllablesStructure(phonetic_content, totalValue)
			},
			'Aussprache: Genauere Darstellung der Veränderungen bei Konsonantenverbindungen und Affrikaten (initial und final)':
			{
				head: ['label_error_type', 'label_amount_possibilities', 'label_affected'],
				values: await getConsonantStructures(phonetic_content)
			},
			'Aussprache: Analyse der Substitutionsprozesse bei Konsonanten': {
				head: [
					'label_segment',
					'label_realized_as',
					'label_test      case',
					'label_process',
					'label_constancy_consequence'
				],
				class: 'substitutions',
				values: await getSubstitutions(phonetic_contents_segment, segments, 'consonants')
			},
			'Aussprache: Substitution bei Vokalen': {
				head: ['label_segment', 'label_realized_as', 'label_testcase', 'label_constancy_consequence'],
				class: 'substitutions',
				values: await getSubstitutions(phonetic_contents_vokal, segmentsvowels, 'vowels')
			},
			'Aussprache: Übersicht über Substitutionsprozesse bei Einzelkonsonanten und in Konsonantenverbindungen': {
				head: ['label_process', 'label_affected', 'label_count'],
				class: 'substitution',
				values: resultPhoneticProcesses.substitution_processes
			},
			'Aussprache: Lautpräferenz und funktionale Belastung': {
				head: ['label_sound_stands_for', 'label_initial', 'label_medial', 'label_final'],
				values: resultPhoneticProcesses.sound_preferences
			},
			'Aussprache: Phonetische Realisierung / Fehlbildungen': {
				head: ['label_nr', 'label_word_phonetic_deformity'],
				values: result_phonetic_deformity.word_phonetic
			},
			'Aussprache: Betonungsveränderungen': {
				head: ['label_nr', 'label_word_accentuation_change'],
				values: result_accentuation_change.word_phonetic
			},
			'Nicht auswertbare Wörter': { head: ['label_nr', 'label_word'], values: result_not_evaluable.word_phonetic }
		}
	});

	// Release connection
	conn.release();

	// Return scores
	return scores;
}

module.exports = {
	getAnalyses,
	setAnalysesResult,
	getAnalysesResultScores,
	setDiagnosticResultDetail,
	getArticulationTypes,
	getLexiconErrorTypes,
	getDiagnosisContentGrammars
};

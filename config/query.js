const { session } = require('passport');

module.exports = {
	allQuery: {
		getGenders: 'SELECT * FROM gender',
		getLanguages: 'SELECT * FROM language'
	},
	chilQueries: {
		createChild: (user, gender, firstName, lastName, birthdate, other) =>
			`INSERT INTO child (user,gender,firstname,lastname,birthdate,other) VALUES ('${user}','${gender}','${firstName}','${lastName}','${birthdate}','${other}')`,
		updateChild: (childId, sql) => `UPDATE child SET ${sql} WHERE id=${childId}`,
		deleteChild: childId => `DELETE FROM child WHERE id=${childId}`,
		addChildLanguage: (child, language) =>
			`INSERT INTO child_language (child,language) VALUES (${child},${language})`,
		getChildById: childId =>
			`SELECT child.id, child.gender, child.firstname AS firstName, user , child.lastname AS lastName,child.other, DATE_FORMAT(child.birthdate, '%Y-%m-%d') AS birthdate, child.created, TIMESTAMPDIFF(MONTH, child.birthdate, CURDATE()) AS age_in_months,(SELECT GROUP_CONCAT(child_language.language) FROM child_language WHERE child_language.child = child.id) as languages FROM child WHERE child.id=${childId};`,
		deleteChildLanguage: childId => `DELETE FROM child_language WHERE child=${childId}`,
		getLastID: tableName => `select id from ${tableName} order by id DESC limit 1`
	},
	userQueries: {
		getUserById: id => `SELECT * FROM user where id="${id}"`,
		getUserBySUBId: sub => `SELECT * FROM user where sub="${sub}"`,
		insetUser: ({ sub, accepted_terms }) =>
			`INSERT INTO user (sub,accepted_terms) VALUES ('${sub}','${accepted_terms}')`,
		getAllChildPaginateByUserId: (userId, order_by, search_for, items_per_page, offset) =>
			`SELECT child.id, child.gender, child.firstname  AS firstName, child.lastname AS lastName, DATE_FORMAT(child.birthdate, '%d.%m.%Y') AS birthdate, child.created, (SELECT GROUP_CONCAT(language.name SEPARATOR ', ')
			 FROM child c LEFT JOIN child_language ON child_language.child = c.id LEFT JOIN language ON child_language.language = language.id WHERE child_language.child = child.id) as language_names FROM child WHERE child.user = ${userId}
			HAVING child.firstname LIKE '%${search_for}%' OR child.lastname LIKE '%${search_for}%' OR birthdate LIKE '%${search_for}%' ORDER BY ${order_by}  LIMIT ${items_per_page} OFFSET ${offset}`,
		getAllChildByUserId: (userId, order_by, search_for) =>
			`SELECT child.id, child.gender, child.firstname AS firstName, child.lastname AS lastName, DATE_FORMAT(child.birthdate, '%d.%m.%Y') AS birthdate, child.created, (SELECT GROUP_CONCAT(language.name SEPARATOR ', ') FROM child c LEFT JOIN child_language ON child_language.child = c.id LEFT JOIN language ON child_language.language = language.id WHERE child_language.child = child.id) as language_names FROM child WHERE child.user = ${userId} HAVING child.firstname LIKE '%${search_for}%' OR child.lastname LIKE '%${search_for}%' OR birthdate LIKE '%${search_for}%' ORDER BY ${order_by} `
	},
	diagnosticsQueries: {
		getDiagnosticById: id => `SELECT * FROM diagnostic WHERE id=${id}`,
		getDiagnostics: `select diagnostic.id AS id, 
		diagnostic.prio AS prio,
	      diagnostic.age_min  AS ageMin, diagnostic.age_max AS ageMax, 
		diagnostic.title AS title, diagnostic.subtitle AS subTitle, diagnostic.duration_in_min AS durationInMin, 
		diagnostic.aside_text AS asideText,
		diagnostic.description AS description,diagnostic.prehistory AS preHistory,diagnostic.description_test_start AS descriptionTestStart,
		diagnostic.diagnostic_group AS diagnosticGroup,diagnostic.diagnostic_group_additional AS diagnosticGroupAdditional FROM diagnostic`,

		getDiagnosisDetails: (diagnosisId, childAgeInMonths, sessionStartedStatus) =>
			`SELECT diagnostic.*,
			(SELECT COUNT(id) FROM diagnostic_content WHERE diagnostic=diagnostic.id  AND ${
				sessionStartedStatus === 'training' ? " training='yes'" : " training='no'"
			}${
				childAgeInMonths ? ' AND age_min<=' + childAgeInMonths + ' AND age_max>= ' + childAgeInMonths : ' '
			} ) as diagnostic_content_length,

			(SELECT GROUP_CONCAT(diagnostic_image.file) FROM diagnostic_image WHERE diagnostic_image.diagnostic = diagnostic.id) as images
			FROM diagnostic 
			WHERE diagnostic.id=${diagnosisId};`,

		getDiagnosisSessionDetails: session => `SELECT *,
		(SELECT TRUNCATE(COUNT(answer)*100.0 / ( select COUNT(*) from diagnostic_content
		where diagnostic_content.diagnostic=diagnostic_session.diagnostic  AND 
		(CASE WHEN diagnostic_session.started="training" THEN diagnostic_content.training="yes" ELSE diagnostic_content.training="no" END)
		 AND age_min<=diagnostic_session.child_age_in_months    AND age_max>=diagnostic_session.child_age_in_months ),0 )
		FROM diagnostic_result where diagnostic_result.session="${session}" 
		and diagnostic_result.diagnostic_content in (select id from diagnostic_content  where
		  (CASE WHEN diagnostic_session.started="training" THEN diagnostic_content.training="yes" ELSE diagnostic_content.training="no" END))
		) as process_percent 
		FROM diagnostic_session WHERE session="${session}";`,

		getDiagnosticGroups: 'SELECT * FROM diagnostic_group',
		getDiagnosticGroupsDetails: groupId => `SELECT diagnostic.*FROM diagnostic WHERE diagnostic.diagnostic_group=
		${groupId} OR diagnostic.diagnostic_group_additional=${groupId}`,
		getDiagnosticGroupsDetailsByChild: (
			groupId,
			childId
		) => `SELECT diagnostic.*, (SELECT diagnostic_session.process_percent FROM diagnostic_session WHERE diagnostic_session.diagnostic = diagnostic.id AND diagnostic_session.child=
			${childId} ORDER BY diagnostic_session.date_initialized DESC LIMIT 1) AS process_percent FROM diagnostic WHERE diagnostic.diagnostic_group= ${groupId} OR diagnostic.diagnostic_group_additional=${groupId} `,
		diagnosticSessions: {
			getDiagnosticSession: userId =>
				`SELECT diagnostic_session.*, diagnostic.title, (SELECT use_in_profile FROM diagnostic_result_analysis WHERE session = diagnostic_session.session and type='values' LIMIT 1) as use_in_profile 
		FROM diagnostic_session 
		LEFT JOIN diagnostic ON diagnostic_session.diagnostic = diagnostic.id
		WHERE user=${userId} `,
			withChild: childId => `AND child=${childId} `,
			withDiagnosis: diagnosisId => `AND diagnostic_session.diagnostic=${diagnosisId} `,
			withSearch: searchFor => `and diagnostic.title LIKE '%${searchFor}%' `,
			orderBy: orderBy => `ORDER BY ${orderBy}`
		},
		deleteDiagnosticSessionById: sessionId => `DELETE FROM diagnostic_session WHERE session='${sessionId}'`,
		deleteDiagnosticResult: (session, id) =>
			`DELETE FROM diagnostic_result WHERE session='${session}' AND diagnostic_content='${id}'`,
		addDiagnosticResult: (session, contentId, answer, notes) =>
			`INSERT INTO diagnostic_result (session,diagnostic_content,answer,notes) VALUES ('${session}','${contentId}','${answer}','${notes}')`,
		insertSession: ({ userId, diagnosticId, childId }) =>
			`INSERT INTO  diagnostic_session (user,diagnostic,child,child_age_in_months) 
			 VALUES (${userId},${diagnosticId},${childId},(SELECT TIMESTAMPDIFF(MONTH, child.birthdate, CURDATE()) AS age_in_months 
			 FROM child 
			 WHERE child.id=${childId}))`,
		DiagnosticExtrasQuestionClassificationResultQueries: (session, contentId, body, questionNumber) => {
			let answer = '';
			body.length > 0 &&
				body.forEach((questionValue, i) => {
					answer += `('${session}','${contentId}','5','3', '${questionNumber}', '${questionNumber}.','{}',"${questionValue}")`;
					if (body.length - 1 > i) {
						answer += ',';
					}
				});

			return {
				deleteOneByQuestionNumber: () =>
					`DELETE FROM diagnostic_result_extended_answers  WHERE  session="${session}" AND belonging_id = ${questionNumber} AND diagnostic_content="${contentId}";`,
				setNewOnes: () => {
					let sql = `
					INSERT INTO diagnostic_result_extended_answers 
					(session,diagnostic_content,diagnostic,question_id,belonging_id,question_num,additional,answer) 
					VALUES  ${answer}`;

					return sql;
				}
			};
		},

		DiagnosticExtrasQuestionResultQueries: (session, contentId, body) => {
			let setters = '',
				answer = '',
				updatesSettlers = '';

			Object.keys(body).forEach((x, i) => {
				setters += `${x}`;
				answer += `"${body[x]}"`;
				updatesSettlers = `${x}="${body[x]}"`;
				if (Object.keys(body).length - 1 > i) {
					setters += ',';
					answer += ',';
					updatesSettlers += ',';
				}
			});

			return {
				checkForExistingItem: () =>
					`SELECT * FROM diagnostic_result_extended WHERE session="${session}" AND diagnostic_content="${contentId}" AND question_id="${body.question_id}"`,
				setNewOne: () =>
					`INSERT INTO diagnostic_result_extended (session,diagnostic_content,diagnostic,${setters})  VALUES ('${session}','${contentId}','5',${answer})`,
				update: () =>
					`UPDATE diagnostic_result_extended SET ${updatesSettlers} WHERE session="${session}" AND diagnostic_content="${contentId}" AND   question_id="${body.question_id}"`
			};
		},

		DiagnosticUpdateClassificationAdditionalOption: (classificationId, body) => {
			let sql = `UPDATE diagnostic_result_extended_answers SET additional='${JSON.stringify(
				body
			)}' WHERE id="${classificationId}" `;
			return sql;
		},
		DiagnosticResultQueries: (session, contentId, body) => {
			let setters = '',
				answer = '',
				updatesSettlers = '';

			Object.keys(body).forEach((x, i) => {
				setters += `${x}`;
				answer += `${body[x]}`;
				updatesSettlers = `${setters}="${answer}"`;
				if (Object.keys(body).length - 1 > i) {
					setters += ',';
					answer += ',';
					updatesSettlers += ',';
				}
			});

			return {
				checkForExistingItem: () =>
					`SELECT * FROM diagnostic_result WHERE session="${session}" AND diagnostic_content="${contentId}"`,
				setNewOne: () =>
					`INSERT INTO diagnostic_result (session,diagnostic_content,${setters})  VALUES ('${session}','${contentId}','${answer}')`,
				update: () =>
					`UPDATE diagnostic_result SET ${updatesSettlers} WHERE session="${session}" AND diagnostic_content="${contentId}"`
			};
		},

		getDiagnosticExtendedResultDetails: (session, contentId, diagnosticId) =>
			`SELECT * FROM diagnostic_result_detail_0${diagnosticId} WHERE session='${session}' AND diagnostic_content='${contentId}'`,
		insetANewExtendedResult: (session, contentId, diagnosticId, body) => {
			let setters = '',
				answer = '';
			// change this to remove sql syntax error split each answer_ids with "incorrect or correct value"
			const keys = Object.keys(body)[0].split(',');
			keys.forEach((x, i) => {
				setters += `${x.trim()}`;
				// change this to get the corresponding value and enclose it in double quotes
				answer += `"${body[Object.keys(body)[0]].split(',')[i].trim()}"`;
				if (keys.length - 1 > i) {
					setters += ',';
					answer += ',';
				}
			});

			return `INSERT INTO diagnostic_result_detail_0${diagnosticId} (session,diagnostic_content,${setters}) VALUES ('${session}','${contentId}',${answer})`;
		},
		updateExtendedResult: (session, contentId, diagnosticId, body) => {
			let setter = '';
			Object.keys(body).forEach((x, i) => {
				setter += `${x}="${body[x]}"`;
				if (Object.keys(body).length - 1 > i) {
					setter += ',';
				}
			});

			return `UPDATE diagnostic_result_detail_0${diagnosticId} SET ${setter} WHERE session='${session}' AND diagnostic_content='${contentId}'`;
		},
		updateSessionToken: ({ id, body, session }) => {
			let setter = session
				? `process_percent=(SELECT TRUNCATE(COUNT(answer)*100.0 / ( select COUNT(*) from diagnostic_content
			where diagnostic_content.diagnostic=diagnostic_session.diagnostic  AND 
			(CASE WHEN diagnostic_session.started="training" THEN diagnostic_content.training="yes" ELSE diagnostic_content.training="no" END)
			 AND age_min<=diagnostic_session.child_age_in_months    AND age_max>=diagnostic_session.child_age_in_months ),0)
			FROM diagnostic_result where diagnostic_result.session="${session}"
			and diagnostic_result.diagnostic_content in (select id from diagnostic_content  where  (CASE WHEN diagnostic_session.started="training" 
			THEN diagnostic_content.training="yes" ELSE diagnostic_content.training="no" END))), `
				: '';
			Object.keys(body).forEach((x, i) => {
				setter += `${x}="${body[x]}"`;
				if (Object.keys(body).length - 1 > i) {
					setter += ',';
				}
			});
			let sessionId = session ? `session="${session}"` : `id="${id}"`;
			return `UPDATE diagnostic_session SET ${setter} WHERE ${sessionId};`;
		},
		getDiagnosisExtendedQuestionContent: (session, content) => ` 
				SELECT  * ,  (SELECT
			      diagnostic_result_extended.answer FROM diagnostic_result_extended 
				where session="${session}" AND diagnostic_result_extended.diagnostic_content= diagnostic_content_extended.diagnostic_content and 
				diagnostic_content_extended.question_id = diagnostic_result_extended.question_id) as questionAnswer
				FROM diagnostic_content_extended
				 
				WHERE diagnostic_content_extended.diagnostic_content = ${content}
				ORDER BY diagnostic_content_extended.id ASC ; `,
		getDiagnosisClassificationQuestionContent: (session, content) => ` 
		SELECT * FROM diagnostic_result_extended_answers 
		WHERE session ='${session}' 
		AND diagnostic_result_extended_answers.diagnostic_content='${content}' ;`,

		getDiagnosisContent: (id, session, childAgeInMonths, questionIDS, hasDiagnosticExtension) => {
			let extendQueries = '';
			if (questionIDS?.length > 0) {
				extendQueries = 'JSON_OBJECT(';
				questionIDS.split(',').forEach((question, index) => {
					extendQueries += `'${question}',(select ${question}   from  diagnostic_result_detail_0${id}  where  diagnostic_session.session="${session}" and 
					 diagnostic_result_detail_0${id}.diagnostic_content = diagnostic_content.id and diagnostic_result_detail_0${id}.session="${session}"  )`;
					if (index < questionIDS.split(',').length - 1) extendQueries += ',';
				});
				extendQueries += ') as extendedResult,';
			}

			let sql = `SELECT diagnostic_content.*,
			(SELECT answer FROM diagnostic_result where session="${session}"  AND diagnostic_result.diagnostic_content=diagnostic_content.id) as selected_answer,
			(SELECT notes FROM diagnostic_result where session="${session}" AND diagnostic_result.diagnostic_content=diagnostic_content.id) as currentSlide_note,
			(SELECT GROUP_CONCAT(diagnostic_extended.question_id SEPARATOR ',') FROM diagnostic_extended WHERE diagnostic_extended.diagnostic = diagnostic_content.diagnostic) as question_ids,
			(SELECT GROUP_CONCAT(diagnostic_extended.type SEPARATOR ',') FROM diagnostic_extended WHERE diagnostic_extended.diagnostic = diagnostic_content.diagnostic) as question_types,
			(SELECT GROUP_CONCAT(diagnostic_extended.answer_id SEPARATOR ',') FROM diagnostic_extended  WHERE diagnostic_extended.diagnostic = diagnostic_content.diagnostic) as answer_ids,
			(SELECT GROUP_CONCAT(diagnostic_extended.hide_in_test SEPARATOR ',') FROM diagnostic_extended  WHERE diagnostic_extended.diagnostic = diagnostic_content.diagnostic) as hide_in_tests,
			${extendQueries}
			${questionIDS},
			(SELECT GROUP_CONCAT(diagnostic_content_image.file SEPARATOR ',') FROM diagnostic_content_image
			 WHERE diagnostic_content_image.diagnostic_content = diagnostic_content.id) as image
			 FROM diagnostic_content
			 ${
					hasDiagnosticExtension
						? `LEFT JOIN (SELECT * FROM diagnostic_result_detail_0${id} WHERE session='${session}') diagnostic_result_detail_0${id}  ON diagnostic_content.id = diagnostic_result_detail_0${id} .diagnostic_content`
						: ''
				}
			 JOIN diagnostic_session ON  diagnostic_session.session="${session}"  
			 WHERE diagnostic_content.diagnostic=${id}  AND
			 (CASE WHEN diagnostic_session.started="training" THEN diagnostic_content.training="yes" ELSE diagnostic_content.training="no" END)
			  AND diagnostic_content.age_min<=${childAgeInMonths} 
			 AND diagnostic_content.age_max>=${childAgeInMonths}
			 ORDER BY diagnostic_content.id ; `;
			return sql;
		},

		getDiagnosisContentForEval: (session, content, childAgeInMonths) => {
			let sql = `SELECT diagnostic_content.*,
			(
				SELECT answer
				FROM diagnostic_result
				where session = "${session}"
					AND diagnostic_result.diagnostic_content = diagnostic_content.id
			) as selected_answer
		FROM diagnostic_content where diagnostic_content.diagnostic = ${content} AND diagnostic_content.training="no" AND diagnostic_content.age_min<=${childAgeInMonths}
		AND diagnostic_content.age_max>=${childAgeInMonths}; `;
			return sql;
		},

		getDiagnosisContentByIdContent: (
			contentId,
			id,
			session,
			childAgeInMonths,
			questionIDS,
			hasDiagnosticExtension
		) => {
			let extendQueries = '';
			if (questionIDS?.length > 0) {
				extendQueries = 'JSON_OBJECT(';
				questionIDS.split(',').forEach((question, index) => {
					extendQueries += `'${question}',(select ${question}   from  diagnostic_result_detail_0${id}  where  diagnostic_session.session="${session}" and 
					 diagnostic_result_detail_0${id}.diagnostic_content = diagnostic_content.id and diagnostic_result_detail_0${id}.session="${session}"  )`;
					if (index < questionIDS.split(',').length - 1) extendQueries += ',';
				});
				extendQueries += ') as extendedResult,';
			}

			let sql = `SELECT diagnostic_content.*,
			(SELECT answer FROM diagnostic_result where session="${session}"  AND diagnostic_result.diagnostic_content=diagnostic_content.id) as selected_answer,
			(SELECT notes FROM diagnostic_result where session="${session}" AND diagnostic_result.diagnostic_content=diagnostic_content.id) as currentSlide_note,
			(SELECT GROUP_CONCAT(diagnostic_extended.question_id SEPARATOR ',') FROM diagnostic_extended WHERE diagnostic_extended.diagnostic = diagnostic_content.diagnostic) as question_ids,
			(SELECT GROUP_CONCAT(diagnostic_extended.type SEPARATOR ',') FROM diagnostic_extended WHERE diagnostic_extended.diagnostic = diagnostic_content.diagnostic) as question_types,
			(SELECT GROUP_CONCAT(diagnostic_extended.answer_id SEPARATOR ',') FROM diagnostic_extended  WHERE diagnostic_extended.diagnostic = diagnostic_content.diagnostic) as answer_ids,
			(SELECT GROUP_CONCAT(diagnostic_extended.hide_in_test SEPARATOR ',') FROM diagnostic_extended  WHERE diagnostic_extended.diagnostic = diagnostic_content.diagnostic) as hide_in_tests,
			${extendQueries}
			${questionIDS},
			(SELECT GROUP_CONCAT(diagnostic_content_image.file SEPARATOR ',') FROM diagnostic_content_image
			 WHERE diagnostic_content_image.diagnostic_content = diagnostic_content.id) as image
			 FROM diagnostic_content
			 ${
					hasDiagnosticExtension
						? `LEFT JOIN (SELECT * FROM diagnostic_result_detail_0${id} WHERE session='${session}') diagnostic_result_detail_0${id}  ON diagnostic_content.id = diagnostic_result_detail_0${id} .diagnostic_content`
						: ''
				}
			 JOIN diagnostic_session ON  diagnostic_session.session="${session}"  
			 WHERE diagnostic_content.diagnostic=${id}  AND
			 (CASE WHEN diagnostic_session.started="training" THEN diagnostic_content.training="yes" ELSE diagnostic_content.training="no" END)
			 AND diagnostic_content.id=${contentId}  
			  AND diagnostic_content.age_min<=${childAgeInMonths}
			 AND diagnostic_content.age_max>=${childAgeInMonths}; `;
			return sql;
		},

		getDiagnosticExtendsIds: (id, session, childAgeInMonths) => {
			let sql = `SELECT ( SELECT GROUP_CONCAT(diagnostic_extended.answer_id SEPARATOR ',') FROM diagnostic_extended  WHERE diagnostic_extended.diagnostic = diagnostic_content.diagnostic ) as answer_ids
				FROM diagnostic_content JOIN diagnostic_session ON  diagnostic_session.session="${session}"   	WHERE diagnostic_content.diagnostic=${id}  AND
				(CASE WHEN diagnostic_session.started="training" THEN diagnostic_content.training="yes" ELSE diagnostic_content.training="no" END)
				 AND diagnostic_content.age_min<=${childAgeInMonths} 
				AND diagnostic_content.age_max>=${childAgeInMonths};`;

			return sql;
		},

		getDiagnosisContentById: diagnosisId =>
			`SELECT diagnostic_content.* FROM diagnostic_content WHERE diagnostic_content.diagnostic=${diagnosisId} AND training='no'`,

		getDiagnosisExtended: diagnosisId =>
			`SELECT diagnostic_extended.* FROM diagnostic_extended WHERE diagnostic_extended.diagnostic=${diagnosisId}`,
		getDiagnosisExtendedQuestion: (
			session,
			id,
			answerId1,
			answerId2,
			answerId3
		) => `SELECT diagnostic_extended.question_id,(SELECT SUM(IF(
			CASE diagnostic_extended.answer_id WHEN '${answerId1}' THEN diagnostic_result_detail_${id}.${answerId1} WHEN '${answerId2}' THEN diagnostic_result_detail_${id}.${answerId2} 
			WHEN '${answerId3}' THEN diagnostic_result_detail_${id}.${answerId3} END = 'incorrect', 1, 0)) FROM diagnostic_result_detail_${id} 
			WHERE diagnostic_result_detail_${id}.session='${session}') AS score FROM diagnostic_extended WHERE diagnostic_extended.diagnostic=2 AND 
			(diagnostic_extended.answer_id='${answerId1}' OR diagnostic_extended.answer_id='${answerId2}' OR diagnostic_extended.answer_id='${answerId3}')`,
		getDiagnosisGrammarWitSession: (
			session,
			childAgeInMonths
		) => `SELECT *,(SELECT GROUP_CONCAT(dga.diagnostic_result_extended_answer) FROM diagnostic_result_grammar_answer dga LEFT JOIN diagnostic_result_extended_answers drea ON dga.diagnostic_result_extended_answer = drea.id WHERE dga.diagnostic_content_grammar = diagnostic_content_grammar.id AND dga.session='${session}' AND drea.id IS NOT NULL) AS selected_answers 
	FROM diagnostic_content_grammar WHERE diagnostic_content_grammar.age_min<=${childAgeInMonths} AND diagnostic_content_grammar.age_max>=${childAgeInMonths} ORDER BY id ASC`,
		setDiagnosisGrammarWitSession: (session, diagnostic_content_grammar_id, diagnostic_result_extended_answer) => `
		INSERT INTO diagnostic_result_grammar_answer (session, diagnostic_content_grammar, diagnostic_result_extended_answer) 
		VALUES ('${session}', '${diagnostic_content_grammar_id}', '${diagnostic_result_extended_answer}')`,
		removeDiagnosisGrammarWitSession: (
			session,
			diagnostic_content_grammar_id,
			diagnostic_result_extended_answer
		) => `
    DELETE FROM diagnostic_result_grammar_answer 
    WHERE session='${session}' AND diagnostic_content_grammar='${diagnostic_content_grammar_id}' AND diagnostic_result_extended_answer='${diagnostic_result_extended_answer}'`,

		getDiagnosisGrammar: childAgeInMonths =>
			`SELECT * FROM diagnostic_content_grammar WHERE diagnostic_content_grammar.age_min<=${childAgeInMonths} AND diagnostic_content_grammar.age_max>=${childAgeInMonths} ORDER BY id ASC`,
		updateDiagnosisResult: (diagnostic, child) =>
			`UPDATE diagnostic_result_analysis SET use_in_profile='no' WHERE diagnostic='${diagnostic}' AND child='${child}'`,
		insertDiagnosisResult: (
			diagnostic,
			session,
			child,
			scoreName,
			type,
			visible,
			tvalue,
			values
		) => `INSERT INTO diagnostic_result_analysis (diagnostic,session,child,score_name,type,visible,tvalue,data) VALUES (
			'${diagnostic}','${session}','${child}','${scoreName}','${type}','${visible}','${tvalue}','${JSON.stringify(values)}')`,
		getDiagnosisContentResultDetails: (id, session, answerId) =>
			`SELECT diagnostic_content.name FROM diagnostic_content LEFT JOIN diagnostic_result_detail_${id} ON  diagnostic_content.id = diagnostic_result_detail_${id}.diagnostic_content 
			WHERE diagnostic_result_detail_${id}.session='${session}' AND diagnostic_result_detail_${id}.${answerId} = 'incorrect'`
	},
	queriesHelpers: {
		checkIfExist: (table, id) => `SELECT id FROM ${table} WHERE id = ${id};`
	},
	evaluationsQueries: {
		getAnalyses: `SELECT dp.diagnostic, profile.*, IF ((SELECT COUNT(diagnostic_profile.diagnostic) FROM diagnostic_profile WHERE diagnostic_profile.diagnostic = dp.diagnostic) > 1 AND profile.type = 'label', 'yes', 'no') AS has_sublabel FROM diagnostic_profile dp LEFT JOIN profile ON dp.profile = profile.id ORDER by profile.id  `,
		getAnalysesByChildId:
			childId => `SELECT dp.diagnostic, profile.*, dra.tvalue, dra.session, ds.date_finished, IF ((SELECT COUNT(diagnostic_profile.diagnostic) FROM diagnostic_profile WHERE diagnostic_profile.diagnostic = dp.diagnostic) > 1 AND profile.type = 'label', 'yes', 'no') AS has_sublabel FROM diagnostic_profile dp LEFT JOIN profile ON dp.profile = profile.id 
		LEFT JOIN (SELECT * FROM diagnostic_result_analysis WHERE use_in_profile='yes' AND child='${childId}') dra ON dra.score_name = profile.name LEFT JOIN diagnostic_session ds ON dra.session = ds.session ORDER by profile.id`,
		updateAnalysesResultProfile: (diagnostic, child) =>
			`UPDATE diagnostic_result_analysis SET use_in_profile='no' WHERE diagnostic=${diagnostic} AND child=${child}`,
		updateAnalysesResult: (
			type,
			visible,
			tvalue,
			data,
			session,
			scoreName
		) => `UPDATE diagnostic_result_analysis SET type='${type}',
		visible='${visible}',
		tvalue='${tvalue}',
		data='${data}' WHERE session='${session}' AND score_name='${scoreName}' `,
		updateAnalysesResultWithProfile: (
			type,
			visible,
			tvalue,
			data,
			session,
			useInProfile,
			scoreName
		) => `UPDATE diagnostic_result_analysis SET type='${type}',
		visible='${visible}',
		tvalue='${tvalue}',
		data='${data}',use_in_profile='${useInProfile}' WHERE session='${session}' AND score_name='${scoreName}' `,
		getSumResultAnalysesBySession:
			session => `SELECT SUM(IF(diagnostic_result.answer = 'correct', 1, 0)) AS raw_value, COUNT(diagnostic_result.id) AS total_value 
		FROM diagnostic_result WHERE diagnostic_result.session='${session}'`,
		getAnalysesDiagnosis: (
			diagnosticId,
			childAgeInMonths,
			childGender,
			childLanguage
		) => `SELECT diagnostic_analysis.* 
		FROM diagnostic_analysis 
		WHERE diagnostic_analysis.diagnostic=${diagnosticId}  
		AND diagnostic_analysis.age_min<=${childAgeInMonths} 
		AND diagnostic_analysis.age_max>=${childAgeInMonths} 
		AND diagnostic_analysis.gender='${childGender}'  
		AND diagnostic_analysis.language='${childLanguage}' `,
		getTagsResult:
			session => `SELECT diagnostic_tag.name, SUM(diagnostic_result.answer) AS raw_value FROM diagnostic_result 
		LEFT JOIN diagnostic_content_tag ON diagnostic_result.diagnostic_content = diagnostic_content_tag.diagnostic_content 
		LEFT JOIN diagnostic_tag ON diagnostic_content_tag.diagnostic_tag = diagnostic_tag.id 
		WHERE diagnostic_result.session='${session}' AND diagnostic_result.answer='correct' GROUP BY diagnostic_tag.name`,
		getAnalysesValues: (diagnosisAnalysisId, rawValueSpecific) => `SELECT dav.* FROM diagnostic_analysis_values dav 
		WHERE dav.diagnostic_analysis='${diagnosisAnalysisId}' AND dav.raw_value='${rawValueSpecific}' `,
		getRawValueAppend: (
			detailNumber,
			answer,
			session
		) => `SELECT SUM(IF(diagnostic_result_detail_${detailNumber}.${answer} = 'correct', 1, 0)) AS raw_value_append FROM diagnostic_result_detail_${detailNumber} 
	WHERE diagnostic_result_detail_${detailNumber}.session='${session}'`,
		getResultDiagnosticExtend: (
			diagnosticId,
			session
		) => `SELECT diagnostic_content_extended.*, diagnostic_content.name, diagnostic_result_extended.answer FROM diagnostic_content_extended 
		LEFT JOIN (SELECT * FROM diagnostic_result_extended WHERE session='${session}') diagnostic_result_extended 
		ON diagnostic_content_extended.question_id = diagnostic_result_extended.question_id AND diagnostic_content_extended.diagnostic_content = diagnostic_result_extended.diagnostic_content 
		LEFT JOIN diagnostic_content ON diagnostic_content_extended.diagnostic_content = diagnostic_content.id 
		WHERE diagnostic_content_extended.diagnostic="${diagnosticId}" AND training='no'`,
		getExtendedAnswers: session =>
			`SELECT * FROM diagnostic_result_extended_answers WHERE session='${session}' ORDER BY belonging_id ASC`,
		getResultExtendedAnswers: (session, tagName) =>
			`SELECT ${tagName} FROM diagnostic_result_extended_answers WHERE session='${session}' ORDER BY belonging_id ASC`,
		getRawValueByTag: (session, tagName) =>
			`SELECT SUM(IF(diagnostic_result.answer = 'correct', 1, 0)) AS raw_value FROM diagnostic_result 
			LEFT JOIN diagnostic_content_tag ON diagnostic_result.diagnostic_content = diagnostic_content_tag.diagnostic_content
			LEFT JOIN diagnostic_tag ON diagnostic_content_tag.diagnostic_tag = diagnostic_tag.id
			 WHERE diagnostic_result.session='${session}' AND diagnostic_tag.name='${tagName}'`,
		getRawValueAppendByTag: (
			detailNumber,
			answer,
			session,
			tagName
		) => `SELECT SUM(IF(diagnostic_result_detail_${detailNumber}.${answer} = 'correct', 1, 0)) AS raw_value_append FROM diagnostic_result_detail_${detailNumber} 
			LEFT JOIN diagnostic_content_tag ON diagnostic_result_detail_${detailNumber}.diagnostic_content = diagnostic_content_tag.diagnostic_content
			 LEFT JOIN diagnostic_tag ON diagnostic_content_tag.diagnostic_tag = diagnostic_tag.id
			 WHERE diagnostic_result_detail_${detailNumber}.session='${session}' AND diagnostic_tag.name='${tagName}'`,
		getResultTag: (
			session,
			childAgeInMonths,
			diagnosticId
		) => `SELECT dt.*, (SELECT COUNT(diagnostic_result.id) FROM diagnostic_result 
		LEFT JOIN diagnostic_content ON diagnostic_result.diagnostic_content = diagnostic_content.id 
		LEFT JOIN diagnostic_content_tag ON diagnostic_result.diagnostic_content = diagnostic_content_tag.diagnostic_content 
		WHERE diagnostic_content.age_min <= ${childAgeInMonths} AND diagnostic_content.age_max>=${childAgeInMonths} AND 
		diagnostic_result.session='${session}' AND diagnostic_content_tag.diagnostic_tag = dt.id) as count_tag, 
		(SELECT COUNT(diagnostic_result.id) FROM diagnostic_result 
		LEFT JOIN diagnostic_content ON diagnostic_result.diagnostic_content = diagnostic_content.id 
		LEFT JOIN diagnostic_content_tag ON diagnostic_result.diagnostic_content = diagnostic_content_tag.diagnostic_content 
		WHERE diagnostic_content.age_min <= ${childAgeInMonths} AND diagnostic_content.age_max>=${childAgeInMonths} AND 
		diagnostic_result.session='${session}' AND diagnostic_result.answer = 'incorrect' AND diagnostic_content_tag.diagnostic_tag = dt.id) as count_incorrect 
		FROM diagnostic_tag dt WHERE dt.diagnostic=${diagnosticId}`,
		getEvaluationDetails: (answer_id, session) =>
			`SELECT SUM(IF(diagnostic_result_detail_06.${answer_id} = 'incorrect', 1, 0)) AS t_value FROM diagnostic_result_detail_06 WHERE diagnostic_result_detail_06.session='${session}'`,
		getResultDetails: (
			answer_id,
			session,
			score_name
		) => `SELECT SUM(IF(diagnostic_result_detail_09.${answer_id} = 'incorrect', 1, 0)) AS t_value FROM diagnostic_result_detail_09 
		LEFT JOIN diagnostic_content_tag ON diagnostic_result_detail_09.diagnostic_content = diagnostic_content_tag.diagnostic_content 
		LEFT JOIN diagnostic_tag ON diagnostic_content_tag.diagnostic_tag = diagnostic_tag.id 
		WHERE diagnostic_result_detail_09.session='${session}' AND diagnostic_tag.name='${score_name}'`,
		getSumExtendedAnswer: (
			session,
			score_name
		) => `SELECT SUM(IF(diagnostic_result_extended.answer = 'checked', 1, 0)) AS raw_value_append FROM diagnostic_result_extended 
		LEFT JOIN diagnostic_content_tag ON diagnostic_result_extended.diagnostic_content = diagnostic_content_tag.diagnostic_content 
		LEFT JOIN diagnostic_tag ON diagnostic_content_tag.diagnostic_tag = diagnostic_tag.id 
		WHERE diagnostic_result_extended.session='${session}' AND diagnostic_tag.name='${score_name}'`,
		getLabel: (diagnosticId, score_name) => `SELECT label FROM diagnostic_content_extended 
		LEFT JOIN diagnostic_content_tag ON diagnostic_content_extended.diagnostic_content = diagnostic_content_tag.diagnostic_content 
		LEFT JOIN diagnostic_tag ON diagnostic_content_tag.diagnostic_tag = diagnostic_tag.id 
		WHERE diagnostic_content_extended.diagnostic='${diagnosticId}' AND diagnostic_tag.name='${score_name}' LIMIT 1`,
		getContentAnalysisQuestions: (
			diagnosticId,
			session
		) => `SELECT diagnostic_content_analysis_questions.*, draq.answer FROM diagnostic_content_analysis_questions 
		LEFT JOIN (SELECT * FROM diagnostic_result_analysis_question WHERE session='${session}') draq ON draq.question_id = diagnostic_content_analysis_questions.id WHERE diagnostic_content_analysis_questions.diagnostic=${diagnosticId}`,
		getAnswersTab2Test5: session =>
			`SELECT * FROM diagnostic_result_analysis WHERE diagnostic_result_analysis.session="${session}" AND diagnostic_result_analysis.score_name= "Fragen"`,
		getAnswersTab2Test5: session =>
			`SELECT * FROM diagnostic_result_analysis WHERE diagnostic_result_analysis.session="${session}" AND diagnostic_result_analysis.score_name= "Fragen"`,
		updateAnswersTab2Test5: (session, newData) => {
			return {
				sql: `UPDATE diagnostic_result_analysis SET data=? WHERE session=? AND score_name='Fragen'`,
				values: [newData, session]
			};
		},
		getDiagnosticResultDetail: (diagnosticId, diagnosticContent, session) =>
			`SELECT * FROM diagnostic_result_detail_0${diagnosticId} WHERE session='${session}' AND diagnostic_content='${diagnosticContent}'`,
		editDiagnosticResultDetail: (
			diagnosticId,
			diagnosticContent,
			answer,
			answerId,
			session
		) => `UPDATE diagnostic_result_detail_0${diagnosticId} SET 
									${answerId}='${answer}'
									WHERE session='${session}' AND diagnostic_content='${diagnosticContent}'`,
		setDiagnosticResultDetail: (diagnosticId, diagnosticContent, answer, answerId, session) =>
			`INSERT INTO diagnostic_result_detail_0${diagnosticId} (session,diagnostic_content,${answerId}) VALUES ('${session}','${diagnosticContent}','${answer}')`,
		getArticulationType: `SELECT * FROM articulation_type`,
		getLexiconErrorType: `SELECT * FROM lexicon_error_type`,
		getSegment: 'SELECT * FROM segment',
		getVowels: "SELECT name FROM diagnostic_tag WHERE diagnostic=2 AND type='Vokal'",
		getLexiconErrorTypeByTagName: (
			session,
			id,
			answerId,
			tagName,
			errorTypeTag
		) => `SELECT lexicon_error_type.name, (SELECT COUNT(*) FROM diagnostic_result_detail_${id} 
		LEFT JOIN diagnostic_content_tag ON diagnostic_result_detail_${id}.diagnostic_content = diagnostic_content_tag.diagnostic_content 
		LEFT JOIN diagnostic_tag ON diagnostic_content_tag.diagnostic_tag = diagnostic_tag.id 
		WHERE diagnostic_result_detail_${id}.session='${session}' AND 
		diagnostic_result_detail_${id}.${answerId} = lexicon_error_type.id AND 
		diagnostic_tag.name='${tagName}') AS count, (SELECT COUNT(*) FROM diagnostic_result_detail_${id} 
		LEFT JOIN diagnostic_content_tag ON diagnostic_result_detail_${id}.diagnostic_content = diagnostic_content_tag.diagnostic_content 
		LEFT JOIN diagnostic_tag ON diagnostic_content_tag.diagnostic_tag = diagnostic_tag.id 
		WHERE diagnostic_result_detail_${id}.session='${session}' AND 
		diagnostic_result_detail_${id}.${answerId} IS NOT NULL AND 
		diagnostic_tag.name='${tagName}') AS total FROM lexicon_error_type WHERE lexicon_error_type.show_for LIKE '%${errorTypeTag}%'`,
		getDiagnosisResultDetails: (session, id, answerId, reponse) =>
			`SELECT SUM(IF(diagnostic_result_detail_${id}.${answerId} = '${reponse}', 1, 0)) AS count_accentuation FROM diagnostic_result_detail_${id} 	WHERE diagnostic_result_detail_${id}.session='${session}'`,
		getTargetItemHavingPhonetic: (
			session,
			childAgeInMonths
		) => `SELECT diagnostic_content.target_item_html, diagnostic_content.target_item, drd.answer_04, 
		(SELECT dt.name FROM diagnostic_content_tag dct LEFT JOIN 
			(SELECT * FROM diagnostic_tag WHERE diagnostic_tag.type='Betonungsmuster')
			 dt ON dct.diagnostic_tag = dt.id WHERE dct.diagnostic_content = diagnostic_content.id AND dt.name IS NOT NULL)
			 AS phonetic_structure 
		FROM diagnostic_content LEFT JOIN (SELECT * FROM diagnostic_result_detail_02 WHERE diagnostic_result_detail_02.session='${session}') drd 
		ON diagnostic_content.id = drd.diagnostic_content WHERE diagnostic_content.age_min<=${childAgeInMonths} AND diagnostic_content.age_max>=${childAgeInMonths} AND 
		diagnostic_content.diagnostic=2 AND diagnostic_content.training='no' 
		HAVING phonetic_structure IS NOT NULL`,
		getTargetItem: (session, childAgeInMonths) =>
			`SELECT diagnostic_content.target_item_html, drd.answer_04 FROM diagnostic_content 
	LEFT JOIN (SELECT * FROM diagnostic_result_detail_02 WHERE diagnostic_result_detail_02.session='${session}') drd 
	ON diagnostic_content.id = drd.diagnostic_content WHERE diagnostic_content.age_min<=${childAgeInMonths} AND 
	diagnostic_content.age_max>=${childAgeInMonths} AND diagnostic_content.diagnostic=2 AND 
	diagnostic_content.training='no'`,
		getTargetItemByTag: (session, childAgeInMonths, tagName) =>
			`SELECT diagnostic_content.target_item_html, diagnostic_content.target_item, drd.answer_04, 
	(SELECT GROUP_CONCAT(dt.name) FROM diagnostic_content_tag dct LEFT JOIN (SELECT * FROM diagnostic_tag WHERE diagnostic_tag.type='${tagName}') dt ON dct.diagnostic_tag = dt.id WHERE dct.diagnostic_content = diagnostic_content.id AND dt.name IS NOT NULL) AS phonetic_structure 
	FROM diagnostic_content LEFT JOIN (SELECT * FROM diagnostic_result_detail_02 WHERE diagnostic_result_detail_02.session='${session}') drd 
	ON diagnostic_content.id = drd.diagnostic_content WHERE diagnostic_content.age_min<=${childAgeInMonths} AND 
	diagnostic_content.age_max>=${childAgeInMonths} AND diagnostic_content.diagnostic=2 AND diagnostic_content.training='no' HAVING phonetic_structure IS NOT NULL`,
		getAnswer_04: session =>
			` SELECT answer_04 FROM diagnostic_result_detail_02 WHERE session='${session}' AND answer_04 IS NOT NULL`,
		getDiagnosticAnalysis: (childId, diagnosisId) => {
			let diagnosticIds = diagnosisId != '' && diagnosisId != null ? `AND diagnostic IN (${diagnosisId})` : '';
			return `SELECT * FROM diagnostic_result_analysis WHERE child=${childId} AND use_in_profile='yes' ${diagnosticIds}`;
		}
	},
	recordQueries: {
		createRecord: (session, diagnostic_content, filepath, filename, duration_in_seconds) =>
			`INSERT INTO diagnostic_result_audio_record (session,diagnostic_content,filepath,filename,duration_in_seconds) VALUES ('${session}','${diagnostic_content}','${filepath}','${filename}',${duration_in_seconds});`,
		removeRecord: id => `DELETE FROM diagnostic_result_audio_record WHERE id=${id}`,
		getRecords: (sessionId, diagnostic_content) =>
			`SELECT * FROM diagnostic_result_audio_record WHERE session='${sessionId}' and diagnostic_content ='${diagnostic_content}' `,
		removeRecords: filename => `DELETE FROM diagnostic_result_audio_record where filename LIKE '${filename}'`
	}
};

const Validator = require('validator');
const isEmpty = require('../helpers').isEmpty;

module.exports = {
	validateGetDiagnosticDetails: (req, res, next) => {
		const errors = {};
		const params = req.params;

		if (!Number.isInteger(+params.id)) {
			errors.userId = 'id must be integer !!';
		}
		if (!isEmpty(errors)) {
			return res.status(400).json({
				error: errors,
				status: 400,
				data: null
			});
		} else {
			next();
		}
	},
	validateGetDiagnosticGroups: (req, res, next) => {
		const errors = {};
		const query = req.query;

		if (query.childId && !Number.isInteger(+query.childId)) {
			errors.childId = 'id must be integer !!';
		}
		if (!isEmpty(errors)) {
			return res.status(400).json({
				error: errors,
				status: 400,
				data: null
			});
		} else {
			next();
		}
	},
	validateGetDiagnosticSessions: (req, res, next) => {
		const errors = {};
		const query = req.query;
		const params = req.params;
		if (query.childId && !Number.isInteger(+query.childId)) {
			errors.childId = 'childId must be integer !!';
		}
		if (query.diagnosisId && !Number.isInteger(+query.diagnosisId)) {
			errors.diagnosisId = 'diagnosisId must be integer !!';
		}
		if (
			query.orderBy &&
			!['diagnostic_session.date_initialized desc', 'diagnostic_session.date_initialized asc'].includes(
				query.orderBy
			)
		) {
			errors.orderBy =
				'orderBy must be one of  [diagnostic_session.date_initialized desc,diagnostic_session.date_initialized asc]';
		}
		if (!Number.isInteger(+params.userId)) {
			errors.userId = 'userId must be integer !!';
		}
		if (!isEmpty(errors)) {
			return res.status(400).json({
				error: errors,
				status: 400,
				data: null
			});
		} else {
			next();
		}
	},
	deleteDiagnosticSessionById: (req, res, next) => {
		const errors = {};
		const params = req.params;
		params.sessionId = !isEmpty(params.sessionId) ? params.sessionId : '';
		if (Validator.isEmpty(params.sessionId)) {
			errors.sessionId = 'sessionId is required !!';
		}
		if (!isEmpty(errors)) {
			return res.status(400).json({
				error: errors,
				status: 400,
				data: null
			});
		} else {
			next();
		}
	},
	validateNewSessionInputs: (req, res, next) => {
		const errors = {};
		const data = req.body;

		data.userId = !isEmpty(data.userId) ? data.userId : '';
		data.childId = !isEmpty(data.childId) ? data.childId : '';
		data.diagnosticId = !isEmpty(data.diagnosticId) ? data.diagnosticId : '';

		if (Validator.isEmpty('' + data.userId)) {
			errors.userId = 'userId is required !!';
		} else if (Number.isInteger(data.userId)) {
			errors.userId = 'Invalid input';
		}

		if (Validator.isEmpty('' + data.diagnosticId)) {
			errors.diagnosticId = 'diagnosticId is required !!';
		} else if (Number.isInteger(data.diagnosticId)) {
			errors.diagnosticId = 'Invalid input';
		}

		if (Validator.isEmpty('' + data.childId)) {
			errors.childId = 'childId is required !!';
		} else if (Number.isInteger(data.childId)) {
			errors.childId = 'Invalid input';
		}

		if (!isEmpty(errors)) {
			return res.status(400).json({
				error: errors,
				status: 400,
				data: null
			});
		} else {
			next();
		}
	},
	addDiagnosisResult: (req, res, next) => {
		const errors = {};
		const data = req.body;
		const params = req.params;

		data.notes = !isEmpty(data.notes) ? data.notes : '';
		data.answer = !isEmpty(data.answer) ? data.answer : '';
		params.contentId = !isEmpty(params.contentId) ? params.contentId : '';
		if (Validator.isEmpty(params.contentId)) {
			errors.contentId = 'contentId is required !!';
		}
		if (!Number.isInteger(+params.contentId)) {
			errors.contentId = 'contentId must be integer !!';
		}

		if (!isEmpty(errors)) {
			return res.status(400).json({
				error: errors,
				status: 400,
				data: null
			});
		} else {
			next();
		}
	}
};

const { APIWrapper, HTTPResponseBuilder } = require('http-api-wrapper');
const { diagnosticService, userService, childService } = require('../services');
const { connection } = require('../providers');

const getDiagnostics = APIWrapper(async function (req) {
	const diagnostics = await diagnosticService.getDiagnostics();
	return new HTTPResponseBuilder({
		status: 'OK',
		data: diagnostics,
		message: 'retrieved diagnostics  successfully'
	});
});
const getDiagnosticDetails = APIWrapper(async function (req) {
	const diagnostics = await diagnosticService.getDiagnosticDetails(req.params.id, req.query.session);
	return new HTTPResponseBuilder({
		status: 'OK',
		data: diagnostics,
		message: 'retrieved diagnostics  successfully'
	});
});
const getDiagnosticGroups = APIWrapper(async function (req) {
	const groups = await diagnosticService.getDiagnosticGroups(req.query);
	return new HTTPResponseBuilder({
		status: 'OK',
		data: groups,
		message: 'retrieved diagnostics groups  successfully'
	});
});
const getDiagnosticSessions = APIWrapper(async function (req) {
	const sessions = await diagnosticService.getDiagnosticSessions(req.params.userId, req.query);
	return new HTTPResponseBuilder({
		status: 'OK',
		data: sessions,
		message: 'retrieved diagnostics sessions  successfully'
	});
});
const deleteDiagnosticSessionById = APIWrapper(async function (req) {
	const session = await diagnosticService.deleteDiagnosticSessionById(req.params.sessionId);
	if (session.affectedRows > 0)
		return new HTTPResponseBuilder({
			status: 'OK',
			data: {},
			message: 'session deleted successfully'
		});
	else
		throw new HTTPResponseBuilder({
			status: 'BAD_REQUEST',
			data: {},
			message: 'session ID not Found'
		});
});

const createNewSession = APIWrapper(async function (req) {
	let { userId, diagnosticId, childId } = req.body;

	let checkDiagnostic = await diagnosticService.getDiagnosticDetails(diagnosticId);
	let checkChild = await childService.getChildById(childId);
	let checkUser = await userService.getUserById(userId);

	if (!checkDiagnostic[0] > 0) {
		throw {
			data: null,
			message: 'There is no diagnostic with this id  ',
			status: 'BAD_REQUEST'
		};
	}
	if (!checkChild[0] > 0) {
		throw {
			data: null,
			message: 'There is no child with this id  ',
			status: 'BAD_REQUEST'
		};
	}
	if (!checkUser[0] > 0) {
		throw {
			data: null,
			message: 'There is no user with this id  ',
			status: 'BAD_REQUEST'
		};
	}

	const session = await diagnosticService.InsetDiagnosticSession(req.body);
	if (session)
		return new HTTPResponseBuilder({
			status: 'OK',
			data: { session: session?.session, sessionId: session?.insertId },
			message: 'diagnostic session created  successfully'
		});
});

const updateDiagnosticSession = APIWrapper(async function (req) {
	const session = await diagnosticService.updateDiagnosticSession(req.params.id, req.body, req.params.session);
	if (session)
		return new HTTPResponseBuilder({
			status: 'OK',
			data: {},
			message: 'diagnostic session created  successfully'
		});
});
const getDiagnosticContent = APIWrapper(async function (req) {
	const content = await diagnosticService.getDiagnosticContentByDiagnosticId(
		req.params.diagnosticId,
		req.query.session
	);

	if (content)
		return new HTTPResponseBuilder({
			status: 'OK',
			data: content,
			message: 'diagnostic session created  successfully'
		});
});
const addDiagnosisResult = APIWrapper(async function (req) {
	const result = await diagnosticService.addDiagnosisResult(req.params.contentId, req.body);
	return new HTTPResponseBuilder({
		status: 'OK',
		data: result,
		message: 'result diagnostics session added successfully'
	});
});
module.exports = {
	getDiagnostics,
	getDiagnosticDetails,
	getDiagnosticGroups,
	getDiagnosticSessions,
	deleteDiagnosticSessionById,
	updateDiagnosticSession,
	getDiagnosticContent,
	createNewSession,
	addDiagnosisResult
};

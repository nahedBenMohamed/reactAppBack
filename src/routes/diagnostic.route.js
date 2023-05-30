const diagnosticRouter = require('express').Router();
const { diagnosticController } = require('../controllers_v2');
const { diagnosticValidation } = require('../validation');
const { validateNewSessionInputs } = require('../validation/diagnostic.validation');
const { GuardRoute } = require('../middlewares');

diagnosticRouter
	.get('/', diagnosticController.getDiagnostics)
	.get('/groups', diagnosticValidation.validateGetDiagnosticGroups, diagnosticController.getDiagnosticGroups)
	.get('/:id', diagnosticValidation.validateGetDiagnosticDetails, diagnosticController.getDiagnosticDetails)
	.get(
		'/sessions/:userId',
		diagnosticValidation.validateGetDiagnosticSessions,
		diagnosticController.getDiagnosticSessions
	)
	.delete(
		'/sessions/:sessionId',
		diagnosticValidation.deleteDiagnosticSessionById,
		diagnosticController.deleteDiagnosticSessionById
	)

	.post(
		'/sessions/content/result/:contentId',
		diagnosticValidation.addDiagnosisResult,
		diagnosticController.addDiagnosisResult
	)
	.post('/sessions', validateNewSessionInputs, diagnosticController.createNewSession)
	.patch('/sessions/:id/:session', diagnosticController.updateDiagnosticSession)
	.get('/sessions/initial/details', diagnosticController.createNewSession)
	.get('/sessions/content/:diagnosticId', diagnosticController.getDiagnosticContent);
	diagnosticRouter.get('/diagnostic-content/:id', diagnosticController.getDiagnosticContentByIdContent)
	diagnosticRouter.get('/diagnostic/:id', diagnosticController.getDiagnosticForEvaluation)

module.exports = diagnosticRouter;

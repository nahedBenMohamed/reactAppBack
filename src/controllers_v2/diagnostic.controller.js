const { diagnosticService, userService, childService } = require('../services');

//I have converted the functions to arrow functions,
//and also refactored the response status and message in some functions for better readability.

const getDiagnostics = async (req, res) => {
	try {
		const diagnostics = await diagnosticService.getDiagnostics();
		return res.status(200).json({
			status: 200,
			data: diagnostics,
			message: 'Retrieved diagnostics successfully'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const getDiagnosticDetails = async (req, res) => {
	try {
		const diagnostics = await diagnosticService.getDiagnosticDetails(req.params.id, req.query.session);
		return res.status(200).json({
			status: 200,
			data: diagnostics,
			message: 'Retrieved diagnostic details successfully'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const getDiagnosticGroups = async (req, res) => {
	try {
		const groups = await diagnosticService.getDiagnosticGroups(req.query);
		return res.status(200).json({
			status: 200,
			data: groups,
			message: 'Retrieved diagnostic groups successfully'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const getDiagnosticSessions = async (req, res) => {
	try {
		const sessions = await diagnosticService.getDiagnosticSessions(req.params.userId, req.query);
		return res.status(200).json({
			status: 200,
			data: sessions,
			message: 'Retrieved diagnostic sessions successfully'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const deleteDiagnosticSessionById = async (req, res) => {
	try {
		const session = await diagnosticService.deleteDiagnosticSessionById(req.params.sessionId);
		return res.status(session.affectedRows > 0 ? 200 : 400).json({
			status: session.affectedRows > 0 ? 200 : 400,
			data: {},
			message: session.affectedRows > 0 ? 'Session deleted successfully' : 'Session ID not found'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const createNewSession = async (req, res) => {
	try {
		let { userId, diagnosticId, childId } = req.body;

		let checkDiagnostic = (await diagnosticService.getDiagnosticDetails(diagnosticId))[0];
		let checkChild = (await childService.getChildById(childId))[0];
		let checkUser = (await userService.getUserById(userId))[0];

		if (!checkDiagnostic|| !checkChild || !checkUser[0]) {
			return res.status(400).json({
				status: 400,
				data: null,
				message: !checkDiagnostic
					? 'There is no diagnostic with this id'
					: !checkChild[0]
					? 'There is no child with this id'
					: 'There is no user with this id'
			});
		}

		const session = await diagnosticService.InsetDiagnosticSession(req.body);

		if (session) {
			return res.status(201).json({
				status: 201,
				data: { session: session?.session, sessionId: session?.insertId },
				message: 'diagnostic session created successfully'
			});
		}
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'server error'
		});
	}
};

const updateDiagnosticSession = async (req, res) => {
	try {
		const session = await diagnosticService.updateDiagnosticSession(req.params.id, req.body, req.params.session);
		return res.status(session ? 200 : 400).json({
			status: session ? 200 : 400,
			data: {},
			message: session ? 'diagnostic session updated successfully' : 'Bad request'
		});
	} catch (err) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Internal server error'
		});
	}
};



const getDiagnosticContent = async (req, res) => {
	try {
		const content = await diagnosticService.getDiagnosticContentByDiagnosticId(
			req.params.diagnosticId,
			req.query.session
		);
		return res.status(200).json({
			status: 200,
			data: content,
			message: 'retrieved diagnostic content successfully'
		});
	} catch (error) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'server error'
		});
	}
};

const getDiagnosticContentByIdContent = async (req, res) => {
	try {
		const content = await diagnosticService.getDiagnosticContentByContentId(
			req.params.id,
			req.query.session,
			req.query.contentId
		);
		return res.status(200).json({
			status: 200,
			data: content,
			message: 'retrieved diagnostic content successfully'
		});
	} catch (error) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'server error'
		});
	}
};

const getDiagnosticForEvaluation = async (req, res) => {
	try {
		const content = await diagnosticService.getDiagnosticContentForEvaluation(
			req.params.id,
			req.query.session,
		);
		return res.status(200).json({
			status: 200,
			data: content,
			message: 'retrieved diagnostic content successfully'
		});
	} catch (error) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'server error'
		});
	}
}

const addDiagnosisResult = async (req, res) => {
	try {
		let questionNumber;
		if (req.body?.extraContent?.questionNumber) {
			questionNumber = req.body.extraContent.questionNumber;
			delete req.body.extraContent.questionNumber;
		}

		const result = await diagnosticService.addDiagnosisResult(req.params.contentId, req.body);

		if (questionNumber && req.body.extraContent && Object.keys(req.body.extraContent).length > 0) {
			await diagnosticService.setDiagnosticClassificationResult(
				req.body.session,
				req.params.contentId,
				req.body.extraContent,
				questionNumber
			);
		}
		return res.status(201).json({
			status: 201,
			data: result,
			message: 'Result diagnostics session added successfully'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

module.exports = {
	getDiagnostics,
	getDiagnosticDetails,
	getDiagnosticGroups,
	getDiagnosticSessions,
	deleteDiagnosticSessionById,
	updateDiagnosticSession,
	getDiagnosticContent,
	createNewSession,
	addDiagnosisResult,
	getDiagnosticContentByIdContent,
	getDiagnosticForEvaluation
};

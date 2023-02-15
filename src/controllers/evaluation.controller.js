const { APIWrapper, HTTPResponseBuilder } = require('http-api-wrapper');
const { evaluationService } = require('../services');

module.exports = {
	getAnalyses: APIWrapper(async function (req) {
		const analyses = await evaluationService.getAnalyses(req.query);
		return new HTTPResponseBuilder({
			status: 'OK',
			data: analyses,
			message: 'retrieved analyses details successfully'
		});
	}),
	setAnalysesResult: APIWrapper(async function (req) {
		await evaluationService.setAnalysesResult(req.body);
		return new HTTPResponseBuilder({
			status: 'OK',
			data: {},
			message: 'analyses details updated successfully'
		});
	}),
	getAnalysesResultScores: APIWrapper(async function (req) {
		const result = await evaluationService.getAnalysesResultScores(req.query);
		return new HTTPResponseBuilder({
			status: 'OK',
			data: result,
			message: 'analyses result score details retrieved  successfully'
		});
	})
};

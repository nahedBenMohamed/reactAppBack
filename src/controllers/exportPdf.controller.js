const { APIWrapper, HTTPResponseBuilder } = require('http-api-wrapper');
const { evaluationService, childService } = require('../services');
const exportPdfService = require('../services/exportPdf.service');

const getEvaluationTestsByChild = APIWrapper(async function (req) {
	const result_analysis = await exportPdfService.getEvaluationTestsByChild(req.query);
    const child = await childService.getChildById(req.query.childId);
	let data = {  
		evaluations: result_analysis,
		child: child
	}
	return new HTTPResponseBuilder({
		status: 'OK',
		data,
		message: 'retrieved scores successfully'
	});
});

module.exports = {
	getEvaluationTestsByChild
};

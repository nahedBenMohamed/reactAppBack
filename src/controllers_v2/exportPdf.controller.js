const { childService } = require('../services');
const exportPdfService = require('../services/exportPdf.service');

const getEvaluationTestsByChild = async function (req, res) {
	try {
		const result_analysis = await exportPdfService.getEvaluationTestsByChild(req.query);
		const child = await childService.getChildById(req.query.childId);
		let data = {
			evaluations: result_analysis,
			child: child
		};
		return res.status(200).json({
			status: 200,
			data: data,
			message: 'Retrieved scores successfully'
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
	getEvaluationTestsByChild
};

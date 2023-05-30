const { evaluationService } = require('../services');

const getAnalyses = async (req, res) => {
	try {
		const analyses = await evaluationService.getAnalyses(req.query);
		return res.status(200).json({
			status: 200,
			data: analyses,
			message: 'Retrieved analysis details successfully'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const setAnalysesResult = async (req, res) => {
	try {
		await evaluationService.setAnalysesResult(req.body);
		return res.status(200).json({
			status: 200,
			data: {},
			message: 'Analysis details updated successfully'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const getAnalysesResultScores = async (req, res) => {
	try {
		const result = await evaluationService.getAnalysesResultScores(req.query);
		return res.status(200).json({
			status: 200,
			data: result,
			message: 'Analysis result score details retrieved successfully'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const getDiagnosisContentGrammars = async (req, res) => {
	try {
		const result = await evaluationService.getDiagnosisContentGrammars(req.query);
		return res.status(200).json({
			status: 200,
			data: result,
			message: 'Analysis result score for test 5 details retrieved successfully'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};
const setDiagnosisContentGrammars = async (req, res) => {
	try {
		const result = await evaluationService.setDiagnosisContentGrammars(req.body);
		return res.status(200).json({
			status: 200,
			data: result[0],
			message: 'Analysis result score for test 5 details updated successfully'
		});
	} catch (e) {
		console.log(e);
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const setDiagnosticResultDetail = async (req, res) => {
	try {
		const result = await evaluationService.setDiagnosticResultDetail(req.body);
		return res.status(200).json({
			status: 200,
			data: result,
			message: 'Diagnostic details updated successfully'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const getArticulationTypes = async (req, res) => {
	try {
		const articulations = await evaluationService.getArticulationTypes();
		return res.status(200).json({
			status: 200,
			data: articulations,
			message: 'Retrieved articulation types successfully'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const getLexiconErrorTypes = async (req, res) => {
	try {
		const lexicons = await evaluationService.getLexiconErrorTypes();
		return res.status(200).json({
			status: 200,
			data: lexicons,
			message: 'Retrieved lexicon error types successfully'
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
	getAnalyses,
	setAnalysesResult,
	getAnalysesResultScores,
	getDiagnosisContentGrammars,
	setDiagnosticResultDetail,
	getArticulationTypes,
	getLexiconErrorTypes,
	setDiagnosisContentGrammars
};

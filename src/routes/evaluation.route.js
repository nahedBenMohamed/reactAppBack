const evaluationRouter = require('express').Router();

const { evaluationController } = require('../controllers');
const { evaluationValidation } = require('../validation');

evaluationRouter
	.get('/', evaluationValidation.validateGetAnalyses, evaluationController.getAnalyses)
	.patch('/', evaluationController.setAnalysesResult);

evaluationRouter.route('/result').get(evaluationController.getAnalysesResultScores);

module.exports = evaluationRouter;

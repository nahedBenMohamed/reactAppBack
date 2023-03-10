const evaluationRouter = require('express').Router();

const { evaluationController } = require('../controllers');
const { evaluationValidation } = require('../validation');

evaluationRouter
	.get('/', evaluationValidation.validateGetAnalyses, evaluationController.getAnalyses)
	.patch('/', evaluationController.setAnalysesResult);

evaluationRouter.route('/result')
	.get(evaluationController.getAnalysesResultScores);

// need to be changed
evaluationRouter.route('/phonetics').patch(evaluationController.setDiagnosticResultDetail);

evaluationRouter.get('/articulations', evaluationController.getArticulationTypes);
evaluationRouter.get('/lexicons', evaluationController.getLexiconErrorTypes);


module.exports = evaluationRouter;

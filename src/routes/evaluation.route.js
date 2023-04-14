const evaluationRouter = require('express').Router();

const { evaluationController } = require('../controllers_v2');
const { evaluationValidation } = require('../validation');

evaluationRouter
	.get('/', evaluationValidation.validateGetAnalyses, evaluationController.getAnalyses)
	.patch('/', evaluationController.setAnalysesResult);

evaluationRouter.route('/result').get(evaluationController.getAnalysesResultScores);
evaluationRouter.route('/result/grammar/test').get(evaluationController.getDiagnosisContentGrammars);

// need to be changed
evaluationRouter.route('/phonetics').patch(evaluationController.setDiagnosticResultDetail);

evaluationRouter.get('/articulations', evaluationController.getArticulationTypes);
evaluationRouter.get('/lexicons', evaluationController.getLexiconErrorTypes);

module.exports = evaluationRouter;

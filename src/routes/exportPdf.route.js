const exportPdfRouter = require('express').Router();
const { exportPdfController } = require('../controllers_v2');

exportPdfRouter.get('/', exportPdfController.getEvaluationTestsByChild);

module.exports = exportPdfRouter;

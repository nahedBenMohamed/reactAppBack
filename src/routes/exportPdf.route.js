const exportPdfRouter = require('express').Router();
const { exportPdfController } = require('../controllers');

exportPdfRouter
	.get('/', exportPdfController.getEvaluationTestsByChild)

module.exports = exportPdfRouter;

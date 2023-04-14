const { recordController } = require('../controllers_v2');
const { upload } = require('../helpers/upload');

const recordRouter = require('express').Router();

recordRouter.post('/', upload.single('record'), recordController.addRecord);
recordRouter.delete('/:id', recordController.removeRecord);
recordRouter.get('/:id/:diagnosticId', recordController.getRecords);

module.exports = recordRouter;

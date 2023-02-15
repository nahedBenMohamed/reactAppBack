const { recordController } = require('../controllers');
const { upload } = require('../helpers/upload');

const recordRouter = require('express').Router();

recordRouter.post('/',upload.single('record') ,recordController.addRecord)
recordRouter.delete('/:id',recordController.removeRecord);
recordRouter.get('/:id',recordController.getRecords)



module.exports = recordRouter;

const childRouter = require('express').Router();

const { childController } = require('../controllers');
const { childValidation } = require('../validation');

childRouter
	.post('/:userId', childValidation.validateCreateChild, childController.createChild)
	.get('/:childId', childValidation.validateGetChildById, childController.getChildById)
	.patch('/:childId', childValidation.validateUpdateChild, childController.updateChild)
	.delete('/:childId', childValidation.validateGetChildById, childController.deleteChild);
module.exports = childRouter;

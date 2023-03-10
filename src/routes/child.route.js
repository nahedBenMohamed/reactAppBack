const childRouter = require('express').Router();

const { childController } = require('../controllers');
const { userAccessList, userChildAccess } = require('../middlewares/User/userAuth');
const { childValidation } = require('../validation');

childRouter
	.post('/:userId', childValidation.validateCreateChild, userAccessList, childController.createChild)
	.get('/:childId', childValidation.validateGetChildById, userChildAccess, childController.getChildById)
	.patch('/:childId', childValidation.validateUpdateChild, userChildAccess, childController.updateChild)
	.delete('/:childId', childValidation.validateGetChildById, userChildAccess, childController.deleteChild);
module.exports = childRouter;

const userRouter = require('express').Router();
const { userController } = require('../controllers_v2');
const { userAccessList } = require('../middlewares/User/userAuth');
const { userValidation } = require('../validation');

userRouter.get(
	'/child/:userId',
	userValidation.validateGetChildByUserId,
	userAccessList,
	userController.getChildByUserId
);

/*  */
userRouter.route('/').post(userValidation.ValidateInsetNewUser, userController.createNewUserForTheFirstSignUp);

userRouter.route('/:sub').get(userValidation.validateParamsSUB, userController.getAuthUserBySUBId);

module.exports = userRouter;

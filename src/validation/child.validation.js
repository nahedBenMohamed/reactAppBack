const Validator = require('validator');
const {
	isInteger,
	checkFormatDate,
	checkEnumData,
	checkIfPropertyExist,
	checkArrayType
} = require('../helpers/properties');
const isEmpty = require('../helpers').isEmpty;

module.exports = {
	validateCreateChild: (req, res, next) => {
		const errors = {};
		const data = req.body;
		const params = req.params;

		if (!isInteger(params.userId)) errors.userId = 'userId must be integer !!';

		data.firstName = checkIfPropertyExist(data, 'firstName');
		data.lastName = checkIfPropertyExist(data, 'lastName');
		data.birthDay = checkIfPropertyExist(data, 'birthDay');
		data.gender = checkIfPropertyExist(data, 'gender');
		data.languages = checkIfPropertyExist(data, 'languages');

		if (Validator.isEmpty(data.firstName)) {
			errors.firstName = 'firstName is required !!';
		}
		if (Validator.isEmpty(data.lastName)) {
			errors.lastName = 'lastName is required !!';
		}
		if (Validator.isEmpty(data.birthDay)) {
			errors.birthDay = 'birthDay is required !!';
		}
		if (checkFormatDate(data.birthDay)) {
			errors.birthDay = 'birthDay must be  date with format YYYY-MM-DD !!';
		}
		if (checkArrayType(data.languages)) {
			errors.languages = 'languages is required and type must be a array';
		}
		if (checkEnumData(['1', '2', '3'], data.gender)) {
			errors.gender = 'gender is required and must be in [1,2,3]';
		}
		if (!isEmpty(errors)) {
			return res.status(400).json({
				error: errors,
				status: 400,
				data: null
			});
		} else {
			next();
		}
	},
	validateGetChildById: (req, res, next) => {
		const errors = {};
		const params = req.params;

		if (!isInteger(params.childId)) errors.childId = 'childId must be integer !!';
		if (!isEmpty(errors)) {
			return res.status(400).json({
				error: errors,
				status: 400,
				data: null
			});
		} else {
			next();
		}
	},
	validateUpdateChild: (req, res, next) => {
		const errors = {};
		const data = req.body;
		const params = req.params;
		if (!isInteger(params.childId)) errors.childId = 'childId must be integer !!';
		if (isEmpty(data))
			return res.status(400).json({
				error: 'body cannot be empty',
				status: 400,
				data: null
			});
		if (checkFormatDate(data.birthDay)) {
			errors.birthDay = 'birthDay must be  date with format YYYY-MM-DD !!';
		}
		if (checkEnumData(['1', '2', '3'], data.gender)) {
			errors.gender = 'gender must be in [1,2,3]';
		}
		if (checkArrayType(data.languages)) {
			errors.languages = 'language type must be a array';
		}

		if (!isEmpty(errors)) {
			return res.status(400).json({
				error: errors,
				status: 400,
				data: null
			});
		} else {
			next();
		}
	}
};

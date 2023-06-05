const Validator = require('validator');

const isEmpty = require('../helpers').isEmpty;

// Separate functions for sub validation
function isValidSubFormat(sub) {
	return sub === 'auth' || 'auth0'; // Specify the desired format for the sub value
}
function isValidSubValue(sub) {
	const regex = /^[a-z0-9]+$/;
	return regex.test(sub);
}

module.exports = {
	validateGetChildByUserId: (req, res, next) => {
		const errors = {};
		const params = req.params;

		if (!Number.isInteger(+params.userId)) {
			errors.userId = 'userId must be integer !!';
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
	ValidateInsetNewUser: (req, res, next) => {
		const errors = {};
		const data = req.body;

		data.sub = !isEmpty(data.sub) ? data.sub : '';
		data.accepted_terms = !isEmpty(data.accepted_terms) ? data.accepted_terms : '';

		if (Validator.isEmpty(data.sub)) {
			errors.sub = 'this field is required';
		}
		if (Validator.isEmpty(data.accepted_terms)) {
			errors.accepted_terms = 'this field is required';
		} else if (!data.accepted_terms.includes('no') && !data.accepted_terms.includes('yes')) {
			errors.accepted_terms = 'Invalid input...';
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
	ValidateGetUserByEmail: (req, res, next) => {
		const errors = {};
		const data = req.params;

		data.email = !isEmpty(data.email) ? data.email : '';

		if (Validator.isEmpty(data.email)) {
			errors.email = 'this field is required';
		}

		if (!Validator.isEmail(data.email)) {
			errors.email = 'Invalid input...';
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
	// Validation function
	validateParamsSUB: (req, res, next) => {
		const errors = {};
		const data = req.params;

		data.sub = data.sub || '';

		if (!data.sub) {
			errors.sub = 'This field is required';
		} else {
			const subSplit = data.sub.split('|');
			console.log(isValidSubFormat(subSplit[0]), isValidSubValue(subSplit[1]), subSplit.length);

			if (subSplit.length !== 2 || !isValidSubFormat(subSplit[0]) || !isValidSubValue(subSplit[1])) {
				errors.sub = 'Invalid input...';
			}
		}
		if (Object.keys(errors).length !== 0) {
			return res.status(400).json({
				error: errors,
				status: 400,
				data: null
			});
		}

		next();
	}
};

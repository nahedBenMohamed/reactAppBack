const Validator = require('validator');
const { isInteger } = require('../helpers/properties');
const isEmpty = require('../helpers').isEmpty;

module.exports = {
	validateGetAnalyses: (req, res, next) => {
		const errors = {};
		const query = req.query;

		if (query.childId && !isInteger(query.childId)) errors.childId = 'childId must be integer !!';
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

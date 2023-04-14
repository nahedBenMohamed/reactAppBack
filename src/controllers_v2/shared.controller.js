const { sharedService } = require('../services');

module.exports = {
	getGenders: async function (req, res) {
		try {
			const genders = await sharedService.getGenders();
			return res.status(200).json({
				status: 200,
				data: genders,
				message: 'Retrieved genders successfully'
			});
		} catch (e) {
			return res.status(500).json({
				status: 500,
				data: null,
				message: 'Server error'
			});
		}
	},
	getLanguages: async function (req, res) {
		try {
			const languages = await sharedService.getLanguages();
			return res.status(200).json({
				status: 200,
				data: languages,
				message: 'Retrieved languages successfully'
			});
		} catch (e) {
			return res.status(500).json({
				status: 500,
				data: null,
				message: 'Server error'
			});
		}
	}
};

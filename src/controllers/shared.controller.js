const { APIWrapper, HTTPResponseBuilder } = require('http-api-wrapper');
const { sharedService } = require('../services');

module.exports = {
	getGenders: APIWrapper(async function (req) {
		const genders = await sharedService.getGenders();
		return new HTTPResponseBuilder({
			status: 'OK',
			data: genders,
			message: 'retrieved genders  successfully'
		});
	}),
	getLanguages: APIWrapper(async function (req) {
		const languages = await sharedService.getLanguages();
		return new HTTPResponseBuilder({
			status: 'OK',
			data: languages,
			message: 'retrieved Languages successfully'
		});
	})
};

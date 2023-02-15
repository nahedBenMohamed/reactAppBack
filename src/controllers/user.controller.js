const { APIWrapper, HTTPResponseBuilder } = require('http-api-wrapper');
const { userService } = require('../services');
module.exports = {
	getAuthUserBySUBId: APIWrapper(async function (req) {
		const user = await userService.getUserBySUB(req.params.sub);
		if (user[0].length === 0)
			throw {
				status: 'UNAVAILABLE',
				data: null,
				message: 'There is no user with this sub address ...'
			};
		return new HTTPResponseBuilder({
			status: 'OK',
			data: user[0]?.[0],
			message: 'process operated successfully'
		});
	}),
	createNewUserForTheFirstSignUp: APIWrapper(async function (req) {
		const user = await userService.getUserBySUB(req.body.sub);
		if (user[0].length > 0)
			throw {
				data: null,
				status: 'BAD_REQUEST',
				message: 'This SUB is already used...'
			};
		{
			const newUser = await userService.insetNewUser(req.body);
			return new HTTPResponseBuilder({
				status: 'OK',
				data: {
					userId: newUser[0]?.insertId,
					...newUser[0]
				},
				message: 'process operated successfully'
			});
		}
	}),
	getChildByUserId: APIWrapper(async function (req) {
		const children = await userService.getAllChildByUserId(req.params, req.query);
		return new HTTPResponseBuilder({
			status: 'OK',
			data: children,
			message: 'retrieved list of children of specific user  successfully'
		});
	})
};

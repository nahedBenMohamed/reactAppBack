const { APIWrapper, HTTPResponseBuilder } = require('http-api-wrapper');
const { childService } = require('../services');

module.exports = {
	createChild: APIWrapper(async function (req) {
		const res = await childService.createChild(req.body, req.params.userId);
		if (res)
			return new HTTPResponseBuilder({
				status: 'OK',
				data: {},
				message: 'child created successfully'
			});
		else
			throw new HTTPResponseBuilder({
				status: 'BAD_REQUEST',
				data: {},
				message: 'cannot create child '
			});
	}),
	getChildById: APIWrapper(async function (req) {
		const child = await childService.getChildById(req.params.childId);
		if (child.length > 0)
			return new HTTPResponseBuilder({
				status: 'OK',
				data: child,
				message: 'retrieved child details successfully'
			});
		else
			throw new HTTPResponseBuilder({
				status: 'BAD_REQUEST',
				data: {},
				message: 'child ID not Found'
			});
	}),
	updateChild: APIWrapper(async function (req) {
		const res = await childService.updateChild(req.params.childId, req.body);
		if (res)
			return new HTTPResponseBuilder({
				status: 'OK',
				data: {},
				message: 'update child details successfully'
			});
		else
			throw new HTTPResponseBuilder({
				status: 'BAD_REQUEST',
				data: {},
				message: 'cannot update child details'
			});
	}),
	deleteChild: APIWrapper(async function (req) {
		const child = await childService.deleteChild(req.params.childId);
		if (child.affectedRows > 0)
			return new HTTPResponseBuilder({
				status: 'OK',
				data: {},
				message: 'child deleted successfully'
			});
		else
			throw new HTTPResponseBuilder({
				status: 'BAD_REQUEST',
				data: {},
				message: 'child ID not Found'
			});
	})
};

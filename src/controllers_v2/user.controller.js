const { userService } = require('../services');

module.exports = {
	getAuthUserBySUBId: async function (req, res) {
		try {
			const user = await userService.getUserBySUB(req.params.sub);
			if (user[0].length === 0) {
				return res.status(451).json({
					status: 451,
					data: null,
					message: 'There is no user with this sub address ...'
				});
			}
			return res.status(200).json({
				status: 200,
				data: user[0]?.[0],
				message: 'Process operated successfully'
			});
		} catch (e) {
			return res.status(500).json({
				status: 500,
				data: null,
				message: 'Server error'
			});
		}
	},
	createNewUserForTheFirstSignUp: async function (req, res) {
		try {
			const user = await userService.getUserBySUB(req.body.sub);
			if (user[0].length > 0) {
				return res.status(400).json({
					status: 400,
					data: null,
					message: 'This SUB is already used...'
				});
			}
			const newUser = await userService.insetNewUser(req.body);
			return res.status(201).json({
				status: 201,
				data: {
					userId: newUser[0]?.insertId,
					...newUser[0]
				},
				message: 'Process operated successfully'
			});
		} catch (e) {
			return res.status(500).json({
				status: 500,
				data: null,
				message: 'Server error'
			});
		}
	},
	getChildByUserId: async function (req, res) {
		try {
			const children = await userService.getAllChildByUserId(req.params, req.query);
			return res.status(200).json({
				status: 200,
				data: children,
				message: 'Retrieved list of children of specific user successfully'
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

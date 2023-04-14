const { childService } = require('../services');

module.exports = {
	createChild: async function (req, res) {
		try {
			const result = await childService.createChild(req.body, req.params.userId);
			if (result) {
				return res.status(201).json({
					status: 201,
					data: {},
					message: 'Child created successfully'
				});
			} else {
				return res.status(400).json({
					status: 400,
					data: {},
					message: 'Cannot create child'
				});
			}
		} catch (e) {
			return res.status(500).json({
				status: 500,
				data: null,
				message: 'Server error'
			});
		}
	},

	getChildById: async function (req, res) {
		try {
			const child = await childService.getChildById(req.params.childId);
			if (child.length > 0) {
				return res.status(200).json({
					status: 200,
					data: child,
					message: 'Retrieved child details successfully'
				});
			} else {
				return res.status(404).json({
					status: 404,
					data: {},
					message: 'Child ID not found'
				});
			}
		} catch (e) {
			return res.status(500).json({
				status: 500,
				data: null,
				message: 'Server error'
			});
		}
	},

	updateChild: async function (req, res) {
		try {
			const result = await childService.updateChild(req.params.childId, req.body);
			if (result) {
				return res.status(200).json({
					status: 200,
					data: {},
					message: 'Updated child details successfully'
				});
			} else {
				return res.status(400).json({
					status: 400,
					data: {},
					message: 'Cannot update child details'
				});
			}
		} catch (e) {
			return res.status(500).json({
				status: 500,
				data: null,
				message: 'Server error'
			});
		}
	},

	deleteChild: async function (req, res) {
		try {
			const result = await childService.deleteChild(req.params.childId);
			if (result.affectedRows > 0) {
				return res.status(200).json({
					status: 200,
					data: {},
					message: 'Child deleted successfully'
				});
			} else {
				return res.status(404).json({
					status: 404,
					data: {},
					message: 'Child ID not found'
				});
			}
		} catch (e) {
			return res.status(500).json({
				status: 500,
				data: null,
				message: 'Server error'
			});
		}
	}
};

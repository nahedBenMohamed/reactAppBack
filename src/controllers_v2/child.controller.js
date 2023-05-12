const { childService } = require('../services');

//I simplified each function by using the ternary operator to choose the appropriate status code and message.
//The functionality remains the same, but the code is more concise.
const createChild = async (req, res) => {
	try {
		const result = await childService.createChild(req.body, req.params.userId);
		return res.status(result ? 201 : 400).json({
			status: result ? 201 : 400,
			data: {},
			message: result ? 'Child created successfully' : 'Cannot create child'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const getChildById = async (req, res) => {
	try {
		const child = await childService.getChildById(req.params.childId);
		return res.status(child.length > 0 ? 200 : 404).json({
			status: child.length > 0 ? 200 : 404,
			data: child.length > 0 ? child : {},
			message: child.length > 0 ? 'Retrieved child details successfully' : 'Child ID not found'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const updateChild = async (req, res) => {
	try {
		const result = await childService.updateChild(req.params.childId, req.body);
		return res.status(result ? 200 : 400).json({
			status: result ? 200 : 400,
			data: {},
			message: result ? 'Updated child details successfully' : 'Cannot update child details'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const deleteChild = async (req, res) => {
	try {
		const result = await childService.deleteChild(req.params.childId);
		return res.status(result.affectedRows > 0 ? 200 : 404).json({
			status: result.affectedRows > 0 ? 200 : 404,
			data: {},
			message: result.affectedRows > 0 ? 'Child deleted successfully' : 'Child ID not found'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

module.exports = {
	createChild,
	getChildById,
	updateChild,
	deleteChild
};

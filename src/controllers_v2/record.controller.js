const { recordService } = require('../services');

const addRecord = async function (req, res) {
	try {
		const result = await recordService.createRecord(req.body);
		return res.status(201).json({
			status: 201,
			data: result,
			message: 'Record added successfully'
		});
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const removeRecord = async function (req, res) {
	try {
		const result = await recordService.removeRecord(req.params.id);
		if (result.affectedRows > 0) {
			return res.status(200).json({
				status: 200,
				data: result,
				message: 'Record deleted successfully'
			});
		} else {
			return res.status(400).json({
				status: 400,
				data: {},
				message: 'Record ID not found'
			});
		}
	} catch (e) {
		return res.status(500).json({
			status: 500,
			data: null,
			message: 'Server error'
		});
	}
};

const getRecords = async function (req, res) {
	try {
		const result = await recordService.getRecords(req.params.id, req.params.diagnosticId);
		return res.status(200).json({
			status: 200,
			data: result,
			message: 'Retrieved records successfully'
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
	addRecord,
	removeRecord,
	getRecords
};

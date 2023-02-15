const { APIWrapper, HTTPResponseBuilder } = require('http-api-wrapper');
const { recordService } = require('../services');

const addRecord = APIWrapper(async function(req){
	const result = await recordService.createRecord(req.body);
	return new HTTPResponseBuilder({
		status: 'OK',
		data: result,
		message: 'Record added successfully'
	});
})

const removeRecord = APIWrapper(async function(req){
	const result = await recordService.removeRecord(req.params.id);
	if(result.affectedRows>0)
	return new HTTPResponseBuilder({
		status: 'OK',
		data: result,
		message: 'Record deleted successfully'
	});
	else 
	throw new HTTPResponseBuilder({
		status: 'BAD_REQUEST',
		data: {},
		message: 'record ID not Found'
	});
})

const getRecords = APIWrapper(async function(req){
	const result = await recordService.getRecords(req.params.id);
	return new HTTPResponseBuilder({
		status: 'OK',
		data: result,
		message: 'Retrieved records successfully'
	});
})



module.exports = {
	addRecord,
    removeRecord,
    getRecords
};
const io = require('../').io;

io.on('connection', function (socket) {
	/* 	console.clear();
	console.count('connection established ', socket?.id);
	console.log('Socket details', socket?.handshake?.query);
 */
	socket.on('INITIALIZE_DIAGNOSTIC_DATA', function (data) {
		console.log('INITIALIZE_DIAGNOSTIC_DATA');
		io.emit('INITIALIZE_DIAGNOSTIC_DATA', {
			data: JSON.parse(data),
			docket_id: socket?.handshake?.query
		});
	});

	socket.on('GET_DIAGNOSTIC_DATA', function (data) {
		console.count('GET_DIAGNOSTIC_DATA');
		io.emit('GET_DIAGNOSTIC_DATA', {
			data: JSON.parse(data),
			docket_id: socket?.handshake?.query
		});
	});

	socket.on('SET_DIAGNOSTIC_ANSWER', function (data) {
		console.log('SET_DIAGNOSTIC_ANSWER', JSON.parse(data));
		io.emit('SET_DIAGNOSTIC_ANSWER', {
			data: JSON.parse(data),
			docket_id: socket?.handshake?.query
		});
	});
	socket.on('GET_DIAGNOSTIC_STATES', function (data) {
		console.log('SET_DIAGNOSTIC_ANSWER', JSON.parse(data));
		io.emit('GET_DIAGNOSTIC_STATES', {
			data: JSON.parse(data),
			docket_id: socket?.handshake?.query
		});
	});

	socket.on('checked', function (data) {});
});

module.exports = {};

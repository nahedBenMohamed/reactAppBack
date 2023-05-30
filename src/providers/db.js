const mysql = require('mysql2');
const {
	env_variables: { DB_DATABASE, DB_HOST, DB_PASSWORD, DB_USER }
} = require('../../config');

function createPool() {
	const pool = mysql.createPool({
		database: DB_DATABASE,
		host: DB_HOST,
		password: DB_PASSWORD,
		user: DB_USER,
		waitForConnections: true,
		connectionLimit: 10,
		queueLimit: 0
	});

	pool.on('acquire', function (connection) {
		console.log('Connection %d acquired', connection.threadId);
	});

	pool.on('enqueue', function () {
		console.log('Waiting for available connection slot');
	});

	pool.on('release', function (connection) {
		console.log('Connection %d released', connection.threadId);
	});

	const promisePool = pool.promise();
	console.log('+++++++++++++++ Mysql DB  is up +++++++++++++++++++++');
	return promisePool;
}

const pool = createPool();

module.exports = {
	execute: (...params) => pool.execute(...params)
};

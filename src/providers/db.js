const mysql = require('mysql2');
const {
	env_variables: { DB_DATABASE, DB_HOST, DB_PASSWORD, DB_USER }
} = require('../../config');


function createPool() {
	try {
	  const pool = mysql.createPool({
		database: DB_DATABASE,
		host: DB_HOST,
		password: DB_PASSWORD,
		user: DB_USER,
		waitForConnections: true,
		connectionLimit: 10,
		queueLimit: 0
	});
	  const promisePool = pool.promise();
	  console.log('+++++++++++++++ Mysql DB  is up +++++++++++++++++++++'.bold.green);
	  return promisePool;
	} catch (error) {
	  return console.log('------------- Mysql client is down -------------------'.bold.red);
	}
  }

  const pool = createPool();

module.exports = {
	connection: async () => pool.getConnection(),
	execute: (...params) => pool.execute(...params)
  };

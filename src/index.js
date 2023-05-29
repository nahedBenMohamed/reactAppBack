const express = require('express');
const { documentation } = require('./utils');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const morgan = require('morgan');

require('dotenv').config();

const config = require('../config');
const cron = require('node-cron');
const { cronService } = require('./services');
process.on('uncaughtException', (error, origin) => {
	console.log('----- Uncaught exception -----');
	console.log(error);
	console.log('----- Exception origin -----');
	console.log(origin);
});

process.on('unhandledRejection', (reason, promise) => {
	console.log('----- Unhandled Rejection at -----');
	console.log(promise);
	console.log('----- Reason -----');
	console.log(reason);
});

// we must specify the frontend endpoint in environment file
app.use(
	cors({
		origin: process.env.FRONT_END_BASE_URL
	})
);
app.use(morgan('tiny'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
	documentation.path,
	documentation.swaggerUi.serve,
	documentation.swaggerUi.setup(documentation.swaggerDocument)
);

/*cron.schedule('0 0 1 * *', () => {
    cronService.permanentDeleteRecordsCron();
});*/
cron.schedule('*/5 * * * *', () => {
	cronService.permanentDeleteRecordsCron();
});

const http = require('http').createServer(app);
const io = require('socket.io')(http, {
	cors: { origin: process.env.FRONT_END_BASE_URL }
});

module.exports = { app, io, http, express };

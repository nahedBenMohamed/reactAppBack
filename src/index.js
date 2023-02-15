const express = require('express');
const { documentation } = require('./utils');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const morgan = require('morgan');

require('dotenv').config();

const config = require('../config');
const { join } = require('path');

app.use(cors());
app.use(morgan('tiny'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
	documentation.path,
	documentation.swaggerUi.serve,
	documentation.swaggerUi.setup(documentation.swaggerDocument)
);

app.use('/uploads', express.static(require('path').join(__dirname,'./uploads')));

const http = require('http').createServer(app);
const io = require('socket.io')(http, {
	cors: { origin: config?.env_variables?.FRONT_END_BASE_URL }
});

module.exports = { app, io, http, express };

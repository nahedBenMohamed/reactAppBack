const config = require('../../../config');
const expressOasGenerator = require('express-oas-generator');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-docs.json');

module.exports = {
	swaggerDocument,
	swaggerUi,
	expressOasGenerator,
	path: config.helpers.swagger_BaseURL
};

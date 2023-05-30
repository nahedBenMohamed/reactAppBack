const express = require("express");
const appTest = express();
appTest.disable("x-powered-by");
const bodyParser = require('body-parser');
appTest.use(bodyParser.json());
appTest.use(bodyParser.urlencoded({extended: true}));
appTest.use('/api/v1', require('../src/routes'))
module.exports = appTest;
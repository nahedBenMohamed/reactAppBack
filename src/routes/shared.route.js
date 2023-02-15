const sharedRoute = require('express').Router();
const { sharedController } = require('../controllers');

sharedRoute.get('/genders', sharedController.getGenders);
sharedRoute.get('/languages', sharedController.getLanguages);

module.exports = sharedRoute;

const CryptoJS = require('crypto-js');
const config = require('../../config');
const Validator = require('validator');
const isEmpty = require('./isEmpty');

module.exports = {
	isInteger: value => Number.isInteger(+value),
	CryptoProviders: data => ({
		hashIt: () => CryptoJS.AES.encrypt(data, config.hashSlatSecret).toString(),
		token: () => CryptoJS.SHA256(data + config.hashSlatSecret).toString()
	}),
	checkFormatDate: data => data && !Validator.isDate(data, 'YYYY-MM-DD'),
	checkEnumData: (enumArray, data) => data && !enumArray.includes(data),
	checkIfPropertyExist: (data, property) => (data[property] = !isEmpty(data[property]) ? data[property] : ''),
	checkArrayType: data => data && !Array.isArray(data)
};

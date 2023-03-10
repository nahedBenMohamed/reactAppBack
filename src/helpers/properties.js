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
	checkArrayType: data => data && !Array.isArray(data),
	parseDataJson: value => {
		let encoded = Buffer.from(value, 'base64').toString('ascii');
		const json = decodeURIComponent(encoded);
		return JSON.parse(json);
	},
	replaceLingBreakByBrHtml: value => {
		return value.replace(/(?:\r\n|\r|\n)/g, '<br>');
	},
	formatNumber2digit: number => {
		return (number < 10 ? '0' : '') + number;
	}
};

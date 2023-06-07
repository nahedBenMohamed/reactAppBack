const multer = require('multer');
const fs = require('fs');
const maxFileSize = 5242880;
const maxContentLength = maxFileSize + 100; // Add a buffer to the max file size
const storage = multer.diskStorage({
	destination(req, file, cb) {
		const path = `files/uploads/${req.body.session}/`;
		fs.mkdirSync(path, { recursive: true });
		cb(null, path);
	},
	filename(req, file, cb) {
		const date = Date.now();
		cb(null, `${req.body.session}-${date}.${file.mimetype.split('/')[1]}`);
		req.body.filename = `${req.body.session}-${date}.${file.mimetype.split('/')[1]}`;
		req.body.filepath = `files/uploads/${req.body.session}/`;
	}
});
const upload = multer({
	storage,
	limits: {
		fileSize: maxFileSize,
		contentLength: maxContentLength // Add content length limit
	},
	fileFilter(req, file, cb) {
		const fileSize = parseInt(req.headers['content-length']);
		try {
			if (fileSize <= maxFileSize) {
				cb(null, true);
			} else {
				throw 'File size exceeds the limit.';
			}
		} catch (error) {
			console.log('error', error);
		}
	}
});
module.exports = { upload };

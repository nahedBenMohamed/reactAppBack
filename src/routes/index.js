const { GuardRoute } = require('../middlewares');

const router = require('express').Router();

router.use('/user', require('./user.route'));
router.use('/child', require('./child.route'));
router.use('/shared', require('./shared.route'));
router.use('/diagnostics', require('./diagnostic.route'));
router.use('/evaluation', require('./evaluation.route'));
router.use('/records', require('./record.route'));

module.exports = router;

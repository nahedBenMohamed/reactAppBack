const jwt = require('jsonwebtoken');
const JwksRsa = require('jwks-rsa');

module.exports = async (req, res, next) => {
	if (!req.headers.authorization) {
		return res.status(401).json({
			error: 'Unauthorized',
			status: 403,
			data: null
		});
	}
	try {
		let client = JwksRsa({
			jwksUri: `https://${process.env.AUTH0_CLIENT_DOMAIN}/.well-known/jwks.json`,
			cache: false,
			rateLimit: false,
			jwksRequestsPerMinute: 50
		});
		const childIssuerKeys = await client.getKeys(req.headers.authorization.split(' ')[1]);
		const secretKey = await client.getSigningKey(childIssuerKeys[0].kid);

		jwt.verify(
			req.headers.authorization.split(' ')[1],
			secretKey.getPublicKey(),
			{
				audience: process.env.AUTH0_API_AUDIENCE,
				issuer: `https://${process.env.AUTH0_CLIENT_DOMAIN}/`,
				algorithms: ['RS256']
			},
			(err, decoded) => {
				if (err) {
					return res.status(403).json({
						error: 'Forbidden',
						status: 403,
						data: null
					});
				}
				return next();
			}
		);
	} catch (error) {
		console.log('Guard Route Error'.bold.red, error);
	}
};

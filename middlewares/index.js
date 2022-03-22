function redisMiddleware(req, res, next, data){
	req.app = data
  next();
}

function httpsRedirect(req, res, next){
	if (!req.secure) {
		return res.redirect("https://" + req.headers.host + req.url);
	}
	next();
}

module.exports = {
	redisMiddleware,
	httpsRedirect
}
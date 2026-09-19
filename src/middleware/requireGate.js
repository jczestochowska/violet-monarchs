function requireGate(req, res, next) {
  if (!req.session || !req.session.gatePassed) {
    return res.redirect('/gate');
  }
  next();
}

module.exports = requireGate;

export function authRequired(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/login"); next();
}
export function guestOnly(req, res, next) {
  if (req.session.user) return res.redirect("/"); next();
}

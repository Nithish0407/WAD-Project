const { fail } = require("../utils/response");

function notFound(req, res, next) {
  return fail(res, 404, "Not Found");
}

function errorHandler(err, req, res, next) {
  console.error(err);
  const details = process.env.NODE_ENV === "production" ? undefined : err.message;
  return fail(res, 500, "Server Error", details);
}

module.exports = { notFound, errorHandler };

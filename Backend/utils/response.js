function ok(res, data, meta) {
  const payload = { success: true, data };
  if (meta) payload.meta = meta;
  return res.json(payload);
}

function created(res, data) {
  return res.status(201).json({ success: true, data });
}

function fail(res, status, message, details) {
  const payload = { success: false, error: { message } };
  if (details) payload.error.details = details;
  return res.status(status).json(payload);
}

module.exports = { ok, created, fail };

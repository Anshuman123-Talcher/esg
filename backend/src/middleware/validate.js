/**
 * Request Validation Middleware using Zod
 */
function validate(schema) {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      // Replace with sanitized/coerced values
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query;
      if (parsed.params) req.params = parsed.params;
      next();
    } catch (err) {
      if (err.errors) {
        const issues = err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));
        return res.status(400).json({
          success: false,
          message: issues[0]?.message || 'Invalid request parameters.',
          errors: issues
        });
      }
      next(err);
    }
  };
}

module.exports = validate;

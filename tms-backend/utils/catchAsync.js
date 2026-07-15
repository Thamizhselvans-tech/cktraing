/**
 * Wraps async route handlers to forward errors to Express error middleware.
 * Eliminates try/catch boilerplate in every controller.
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;

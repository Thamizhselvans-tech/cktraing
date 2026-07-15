/**
 * Standardized API response helpers
 */

const sendSuccess = (res, statusCode = 200, message = 'Success', data = null, extra = {}) => {
  const response = {
    success: true,
    message,
    ...extra,
  };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

const sendError = (res, statusCode = 500, message = 'Something went wrong', errors = null) => {
  const response = {
    success: false,
    message,
  };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

const sendPaginated = (res, message = 'Success', data = [], page = 1, limit = 10, total = 0) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };

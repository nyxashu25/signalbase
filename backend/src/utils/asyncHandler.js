// Express 4 does not catch rejected promises from async handlers — an
// unawaited rejection would hang the request instead of hitting errorHandler.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

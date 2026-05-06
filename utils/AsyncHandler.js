/**
 * @function asyncHandler
 * A Higher-Order Function (HOF) used to eliminate repetitive try-catch blocks in Express controllers.
 * - Wraps asynchronous route handlers and automatically catches any rejected promises.
 * - Forwards errors to a centralized JSON response, using the error's status code or defaulting to 500 (Internal Server Error).
 */
const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next)
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        })
    }
}

export { asyncHandler }

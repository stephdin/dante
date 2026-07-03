// Simple domain error carrying an HTTP status. Used by services to signal
// expected failures (e.g. 404, 400) that the global Hono error handler maps
// to JSON responses.
export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 500,
  ) {
    super(message);
  }
}

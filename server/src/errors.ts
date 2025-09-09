export class HttpError extends Error {
  constructor(
    public code: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function createErrorHandler() {
  return (err: Error, _req: any, res: any, _next: any) => {
    if (err instanceof HttpError) {
      res.status(err.code).json({
        ok: false,
        code: err.code,
        message: err.message
      });
    } else {
      console.error('Unhandled error:', err);
      res.status(500).json({
        ok: false,
        code: 500,
        message: 'Internal server error'
      });
    }
  };
}

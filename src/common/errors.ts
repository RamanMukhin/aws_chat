import { constants as httpConstants } from 'http2';

export class CustomError extends Error {
  statusCode: number;
  constructor(message: string = '', statusCode: number = httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
  }
}

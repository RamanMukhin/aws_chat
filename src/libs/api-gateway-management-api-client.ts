import { ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi';
import { API_VERSION } from 'src/common/constants';

export const createApiGatewayMangementApiClient = (endpoint: string): ApiGatewayManagementApiClient =>
  new ApiGatewayManagementApiClient({
    apiVersion: API_VERSION,
    endpoint,
  });

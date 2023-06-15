import { format } from 'util';
import { LOCAL_APIGATEWAY_MANAGEMENT_ENDPOINT, STAGES } from './constants';

export const createApiGatewayMangementEndpoint = (domain: string, stage: string): string => {
  const apiGatewayMangementEndpoint = format(format('https://%s/%s', domain, stage));
  return stage === STAGES.LOCAL ? LOCAL_APIGATEWAY_MANAGEMENT_ENDPOINT : apiGatewayMangementEndpoint;
};

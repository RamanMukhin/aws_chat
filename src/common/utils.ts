import { format } from 'util';
import { DB_MAPPER, LOCAL_APIGATEWAY_MANAGEMENT_ENDPOINT, STAGES } from './constants';

export const createApiGatewayMangementEndpoint = (domain: string, stage: string): string => {
  const apiGatewayMangementEndpoint = format(format('https://%s/%s', domain, stage));
  return stage === STAGES.LOCAL ? LOCAL_APIGATEWAY_MANAGEMENT_ENDPOINT : apiGatewayMangementEndpoint;
};

export const getLimit = (limit: string, MAX_LIMIT: number): number =>
  !limit || isNaN(+limit) || !+limit || +limit > MAX_LIMIT ? MAX_LIMIT : +limit;

export const getLastEvaluatedKey = (entity: Record<string, any>) =>
  `${DB_MAPPER.RAW_PK(entity.PK)}:${DB_MAPPER.RAW_PK(entity.SK)}`;

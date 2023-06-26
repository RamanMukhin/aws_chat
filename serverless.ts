import type { AWS } from '@serverless/typescript';

import connect from '@functions/connect';
import disconnect from '@functions/disconnect';
import message from '@functions/message';
import signup from '@functions/signup';
import login from '@functions/login';
import authorizer from '@functions/authorizer';
import createRoom from '@functions/createRoom';
import getRooms from '@functions/getRooms';
import getMessages from '@functions/getMessages';
import getUser from '@functions/getUser';
import uploadAvatar from '@functions/uploadAvatar';
import { GSI_FIRST, STAGES } from 'src/common/constants';

const serverlessConfiguration: AWS = {
  service: 'aws-chat',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild', 'serverless-offline', 'serverless-dynamodb-local', 'serverless-api-gateway-caching'],
  resources: {
    Resources: {
      Table: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: '${env:TABLE}',
          KeySchema: [
            {
              AttributeName: 'PK',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'SK',
              KeyType: 'RANGE',
            },
          ],
          AttributeDefinitions: [
            {
              AttributeName: 'PK',
              AttributeType: 'S',
            },
            {
              AttributeName: 'SK',
              AttributeType: 'S',
            },
            {
              AttributeName: 'GSI_PK',
              AttributeType: 'S',
            },
            {
              AttributeName: 'GSI_SK',
              AttributeType: 'S',
            },
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
          GlobalSecondaryIndexes: [
            {
              IndexName: GSI_FIRST,
              KeySchema: [
                {
                  AttributeName: 'GSI_PK',
                  KeyType: 'HASH',
                },
                {
                  AttributeName: 'GSI_SK',
                  KeyType: 'RANGE',
                },
              ],
              Projection: { ProjectionType: 'ALL' },
              ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5,
              },
            },
          ],
        },
      },
      CognitoUserPool: {
        Type: 'AWS::Cognito::UserPool',
        Properties: {
          AliasAttributes: ['preferred_username'],
          MfaConfiguration: 'OFF',
          Policies: {
            PasswordPolicy: {
              MinimumLength: 6,
              RequireLowercase: false,
              RequireNumbers: false,
              RequireSymbols: false,
              RequireUppercase: false,
            },
          },
        },
      },
      CognitoUserPoolClient: {
        Type: 'AWS::Cognito::UserPoolClient',
        Properties: {
          GenerateSecret: true,
          UserPoolId: { Ref: 'CognitoUserPool' },
          ExplicitAuthFlows: ['ALLOW_REFRESH_TOKEN_AUTH', 'ALLOW_ADMIN_USER_PASSWORD_AUTH'],
        },
      },
      S3Bucket: {
        Type: 'AWS::S3::Bucket',
        DeletionPolicy: 'Retain',
        Properties: {
          BucketName: '${sls:stage}-${env:BUCKET}',
        },
      },
    },
  },
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      TABLE: { Ref: 'Table' },
      BUCKET: { Ref: 'S3Bucket' },
      USER_POOL_ID: { Ref: 'CognitoUserPool' },
      CLIENT_ID: { Ref: 'CognitoUserPoolClient' },
      // Uncomment for local development
      // ...{
      //   TABLE: '${env:TABLE}',
      //   BUCKET: '${sls:stage}-${env:BUCKET}',
      //   USER_POOL_ID: '${env:USER_POOL_ID}',
      //   CLIENT_ID: '${env:CLIENT_ID}',
      // },
    },
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: [
              'dynamodb:Query',
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:TransactWriteItems',
              'dynamodb:BatchGetItem',
              'dynamodb:DeleteItem',
            ],
            Resource: {
              'Fn::GetAtt': ['Table', 'Arn'],
            },
          },
          {
            Effect: 'Allow',
            Action: ['dynamodb:Query'],
            Resource: {
              'Fn::Join': [
                '/',
                [
                  {
                    'Fn::GetAtt': ['Table', 'Arn'],
                  },
                  'index',
                  'GSI',
                ],
              ],
            },
          },
          {
            Effect: 'Allow',
            Action: [
              'cognito-idp:AdminGetUser',
              'cognito-idp:AdminCreateUser',
              'cognito-idp:AdminInitiateAuth',
              'cognito-idp:AdminRespondToAuthChallenge',
              'cognito-idp:DescribeUserPoolClient',
            ],
            Resource: {
              'Fn::GetAtt': ['CognitoUserPool', 'Arn'],
            },
          },
          {
            Effect: 'Allow',
            Action: ['s3:ListBucket', 's3:PutObject', 's3:GetObject'],
            Resource: [
              {
                'Fn::GetAtt': ['S3Bucket', 'Arn'],
              },
              {
                'Fn::Join': [
                  '/',
                  [
                    {
                      'Fn::GetAtt': ['S3Bucket', 'Arn'],
                    },
                    '*',
                  ],
                ],
              },
            ],
          },
          {
            Effect: 'Allow',
            Action: ['rekognition:DetectModerationLabels'],
            Resource: '*',
          },
        ],
      },
    },
  },
  functions: {
    connect,
    disconnect,
    message,
    signup,
    login,
    authorizer,
    createRoom,
    getRooms,
    getMessages,
    getUser,
    uploadAvatar,
  },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node16',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
    dynamodb: {
      start: {
        port: 5000,
        inMemory: true,
        migrate: true,
      },
      stages: STAGES.DEV,
    },
  },
  useDotenv: true,
};

module.exports = serverlessConfiguration;

import type { AWS } from '@serverless/typescript';

import connect from '@functions/connect';
import disconnect from '@functions/disconnect';
import message from '@functions/message';
import login from '@functions/login';
import authorizer from '@functions/authorizer';

const serverlessConfiguration: AWS = {
  service: 'aws-chat',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild', 'serverless-offline', 'serverless-dynamodb-local'],
  resources: {
    Resources: {
      ConnectionsTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: '${env:CONNECTIONS_TABLE}',
          KeySchema: [
            {
              AttributeName: 'connectionId',
              KeyType: 'HASH',
            },
          ],
          AttributeDefinitions: [
            {
              AttributeName: 'connectionId',
              AttributeType: 'S',
            },
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
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
      CONNECTIONS_TABLE: '${env:CONNECTIONS_TABLE}',
      USER_POOL_ID: { Ref: 'CognitoUserPool' },
      CLIENT_ID: { Ref: 'CognitoUserPoolClient' },
      CLIENT_SECRET: {
        // Still not works (aws restrictions), need manual operation to set this env
        'Fn::GetAtt': ['CognitoUserPoolClient', 'ClientSecret'],
      },
    },
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: [
              // "dynamodb:DescribeTable",
              // "dynamodb:Query",
              'dynamodb:Scan',
              // "dynamodb:GetItem",
              'dynamodb:PutItem',
              // "dynamodb:UpdateItem",
              'dynamodb:DeleteItem',
            ],
            Resource: [
              {
                'Fn::GetAtt': ['ConnectionsTable', 'Arn'],
              },
            ],
          },
          {
            Effect: 'Allow',
            Action: [
              'cognito-idp:AdminGetUser',
              'cognito-idp:AdminInitiateAuth',
              'cognito-idp:AdminRespondToAuthChallenge',
            ],
            Resource: {
              'Fn::GetAtt': ['CognitoUserPool', 'Arn'],
            },
          },
        ],
      },
    },
  },
  functions: { connect, disconnect, message, login, authorizer },
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
      stages: 'dev',
    },
  },
  useDotenv: true,
};

module.exports = serverlessConfiguration;

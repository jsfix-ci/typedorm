import {Attribute, Entity, Table} from '@typedorm/common';
import {getConnection} from '@typedorm/core';
import {User} from '../../../../__mocks__/user';
import {createTestConnection, resetTestConnection} from '@typedorm/testing';
import path from 'path';
import {ConnectionManager} from '../connection-manager';
jest.useFakeTimers('modern').setSystemTime(new Date('2020-01-01'));

beforeEach(() => {
  createTestConnection({
    entities: [User],
  });
});
afterEach(() => {
  resetTestConnection();
});

test('Connection Manager should register metadata correctly', () => {
  const userMetadata = getConnection().getEntityByTarget(User);
  expect(userMetadata.schema).toEqual({
    indexes: {
      GSI1: {
        GSI1PK: 'USER#STATUS#{{status}}',
        GSI1SK: 'USER#{{name}}',
        _interpolations: {
          GSI1PK: ['status'],
          GSI1SK: ['name'],
        },
        _name: 'GSI1',
        type: 'GLOBAL_SECONDARY_INDEX',
      },
    },
    primaryKey: {
      PK: 'USER#{{id}}',
      SK: 'USER#{{id}}',
      _interpolations: {
        PK: ['id'],
        SK: ['id'],
      },
    },
  });
});

test('Connection Manager should register metadata for entity loaded from path', () => {
  resetTestConnection();
  createTestConnection({
    entities: path.resolve(__dirname, ' ../../../../../../__mocks__/**.ts'),
  });

  const userMetadata = getConnection().getEntityByTarget(User);
  expect(userMetadata.schema).toEqual({
    indexes: {
      GSI1: {
        GSI1PK: 'USER#STATUS#{{status}}',
        GSI1SK: 'USER#{{name}}',
        _interpolations: {
          GSI1PK: ['status'],
          GSI1SK: ['name'],
        },
        _name: 'GSI1',
        type: 'GLOBAL_SECONDARY_INDEX',
      },
    },
    primaryKey: {
      PK: 'USER#{{id}}',
      SK: 'USER#{{id}}',
      _interpolations: {
        PK: ['id'],
        SK: ['id'],
      },
    },
  });
});

test('Connection manager should properly configure global table instance for single table modeling to work ', () => {
  @Entity({
    name: 'anotherUser',
    primaryKey: {
      partitionKey: 'ANOTHER_USER#{{id}}',
    },
  })
  class AnotherUser {
    @Attribute()
    id: string;
  }

  const globalTable = new Table({
    name: 'Global Table',
    partitionKey: 'PK',
  });
  resetTestConnection();
  createTestConnection({
    entities: [AnotherUser],
    table: globalTable,
  });

  const userMetadata = getConnection().getEntityByTarget(AnotherUser);

  expect(userMetadata.table).toEqual(globalTable);
});

/**
 * Issue: 38
 */
test('Auto removes connection when failed to connect', () => {
  const connectionManager = new ConnectionManager();
  const createdConnection = connectionManager.create({
    entities: [User],
  });

  createdConnection.buildMetadatas = jest.fn().mockImplementation(() => {
    throw new Error('Failed to build metadata');
  });

  createdConnection.connect();

  expect(() => connectionManager.get()).toThrow(
    'No such connection with name "default" exists'
  );
});

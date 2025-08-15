import { jest } from '@jest/globals';

export class PrismaClient {
  constructor() {
    this.comment = {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    };

    this.commentLike = {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    this.commentDislike = {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    this.$connect = jest.fn().mockResolvedValue(undefined);
    this.$disconnect = jest.fn().mockResolvedValue(undefined);
    this.$transaction = jest.fn();
    this.$queryRaw = jest.fn();
    this.$executeRaw = jest.fn();
  }
}

export default PrismaClient;

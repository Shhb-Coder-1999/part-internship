// Minimal PrismaClient mock to avoid ESM loading issues during tests
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
    this.$transaction = jest.fn();
    this.$disconnect = jest.fn();
  }
}

export default PrismaClient;

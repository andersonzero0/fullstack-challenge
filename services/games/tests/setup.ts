import { mock } from 'bun:test'

mock.module('@nestjs/common', () => ({
  Controller: () => () => {},
  Post: () => () => {},
  Get: () => () => {},
  UseGuards: () => () => {},
  HttpCode: () => () => {},
  HttpStatus: { ACCEPTED: 202, OK: 200 },
  Body: () => () => {},
  Query: () => () => {},
  ConflictException: class ConflictException extends Error { constructor(m?: string) { super(m) } },
  UnprocessableEntityException: class UnprocessableEntityException extends Error { constructor(m?: string) { super(m) } },
  Module: () => () => {},
  Inject: () => () => {},
  Optional: () => () => {},
  Injectable: () => () => {},
  OnApplicationBootstrap: () => () => {},
  Logger: class Logger { log() {} error() {} warn() {} debug() {} verbose() {} },
}))

mock.module('@nestjs/core', () => ({
  Injectable: () => () => {},
  Module: () => () => {},
  Optional: () => () => {},
  Inject: () => () => {},
  Logger: class Logger { log() {} error() {} warn() {} debug() {} verbose() {} },
}))

mock.module('@nestjs/microservices', () => ({
  ClientProxy: class ClientProxy {},
  Transport: {},
}))
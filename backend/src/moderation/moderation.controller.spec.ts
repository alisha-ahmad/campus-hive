import { Test, TestingModule } from '@nestjs/testing';
import { ModerationController } from './moderation.controller';
import { describe, beforeEach } from 'node:test';

describe('ModerationController', () => {
  let controller: ModerationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModerationController],
    }).compile();

    controller = module.get<ModerationController>(ModerationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

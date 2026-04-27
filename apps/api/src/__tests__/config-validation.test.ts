import request from 'supertest';
import { validateConfig } from '@appforge/validators';
import fs from 'fs';
import path from 'path';

// Change port to 0 to avoid EADDRINUSE
process.env.PORT = '0';
process.env.NODE_ENV = 'test';

jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      create: jest.fn().mockResolvedValue({ id: 'user1', email: 'test@example.com' }),
      findUnique: jest.fn().mockResolvedValue({ id: 'user1', email: 'test@example.com', passwordHash: 'hash' })
    },
    app: {
      create: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: 'app123', configJson: args.data.configJson })),
      findUnique: jest.fn().mockImplementation((args: any) => Promise.resolve({ 
        id: args.where.id, 
        configJson: { 
          auth: { enabled: false }, 
          api: [
            { path: '/tasks', method: 'GET', table: 'tasks', action: 'list' }, 
            { path: '/tasks', method: 'POST', table: 'tasks', action: 'create' }
          ], 
          database: { tables: [{ name: 'tasks', fields: [] }] } 
        } 
      }))
    },
    appSession: {
      findUnique: jest.fn().mockResolvedValue({ token: 'mock-token' })
    },
    importJob: {
      create: jest.fn().mockResolvedValue({ id: 'job123' }),
      findUnique: jest.fn().mockResolvedValue({ id: 'job123', status: 'completed' })
    }
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

jest.mock('pg', () => {
  return {
    Pool: jest.fn(() => ({
      query: jest.fn().mockResolvedValue({ rows: [{ exists: false, count: "1", id: "task1", title: "Test Task" }], rowCount: 1 })
    }))
  };
});

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hash'),
  compare: jest.fn().mockResolvedValue(true)
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 'user1' })
}));

import app from '../index';

const validConfigPath = path.join(__dirname, '../../examples/task-manager.config.json');
const brokenConfigPath = path.join(__dirname, '../../examples/broken.config.json');

const validConfigRaw = JSON.parse(fs.readFileSync(validConfigPath, 'utf8'));
const brokenConfigRaw = JSON.parse(fs.readFileSync(brokenConfigPath, 'utf8'));

describe('Config Validation & Graceful Degradation', () => {
  let createdAppId: string;
  let brokenAppId: string;
  let userToken: string;

  beforeAll(async () => {
    // Optional: setup a user to bypass auth for tasks, or just let dynamic-api use 'system' if no auth
    // Wait, the config says "auth": true for tasks. We need to register a user.
    const res = await request(app).post('/api/auth/register').send({
      email: `test-${Date.now()}@example.com`,
      password: 'password123'
    });
    userToken = res.body.token;
  });

  describe('1-3. Unit level: validateConfig', () => {
    it('1. Valid config -> validateConfig returns valid: true', () => {
      const result = validateConfig(validConfigRaw);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.config).toBeDefined();
      }
    });

    it('2. Broken config -> returns valid: false, partialConfig has valid sections, errors array is populated', () => {
      const result = validateConfig(brokenConfigRaw);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.partialConfig).toBeDefined();
        expect(result.partialConfig.name).toBe('Broken Task Manager');
        expect(result.partialConfig.database?.tables[0].name).toBe('items');
      }
    });

    it('3. Unknown component type -> mapped to { type: "unknown", raw: {...} }', () => {
      const result = validateConfig(brokenConfigRaw);
      if (!result.valid) {
        const page = result.partialConfig.pages?.[0];
        const kanban = page?.components?.find(c => c.type === 'unknown');
        expect(kanban).toBeDefined();
        expect((kanban as any).raw.type).toBe('kanban_board');
      }
    });
  });

  describe('4-5. API level: App Creation', () => {
    it('4. POST /api/apps with valid config -> 201, returns appId', async () => {
      const res = await request(app)
        .post('/api/apps')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ config: validConfigRaw });
      
      expect(res.status).toBe(201);
      expect(res.body.appId).toBeDefined();
      createdAppId = res.body.appId;
    });

    it('5. POST /api/apps with broken config -> 201 (NOT 400), returns warnings array', async () => {
      const res = await request(app)
        .post('/api/apps')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ config: brokenConfigRaw });
      
      expect(res.status).toBe(201);
      expect(res.body.appId).toBeDefined();
      expect(res.body.warnings).toBeDefined();
      expect(res.body.warnings.length).toBeGreaterThan(0);
      brokenAppId = res.body.appId;
    });
  });

  describe('6-9. API level: CRUD and CSV Import', () => {
    let taskId: string;

    it('6. POST /api/apps/:appId/tasks -> creates a row in af_tasks', async () => {
      const res = await request(app)
        .post(`/api/apps/${createdAppId}/tasks`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test Task',
          description: 'This is a test task',
          status: 'todo'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('Test Task');
      taskId = res.body.data.id;
    });

    it('7. GET /api/apps/:appId/tasks -> returns paginated list', async () => {
      const res = await request(app)
        .get(`/api/apps/${createdAppId}/tasks`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.data.some((t: any) => t.id === taskId)).toBe(true);
    });

    let jobId: string;

    it('8. POST /api/apps/:appId/import/tasks with a CSV -> 202 with jobId', async () => {
      const csvContent = 'title,description,status\nCSV Task 1,desc 1,todo\nCSV Task 2,desc 2,done';
      
      const res = await request(app)
        .post(`/api/apps/${createdAppId}/import/tasks`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', Buffer.from(csvContent, 'utf8'), 'test.csv')
        .field('fieldMapping', JSON.stringify({
          'title': 'title',
          'description': 'description',
          'status': 'status'
        }));
      
      expect(res.status).toBe(202);
      expect(res.body.jobId).toBeDefined();
      expect(res.body.message).toBe('Import started');
      jobId = res.body.jobId;
    });

    it('9. GET /api/apps/:appId/import/:jobId/status -> returns job status', async () => {
      // Give it a brief moment to potentially process some rows
      await new Promise(r => setTimeout(r, 500));

      const res = await request(app)
        .get(`/api/apps/${createdAppId}/import/${jobId}/status`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.job).toBeDefined();
      expect(res.body.job.id).toBe(jobId);
      expect(['pending', 'processing', 'completed', 'failed']).toContain(res.body.job.status);
    });
  });
});

import request from 'supertest'; import { describe,it,expect } from 'vitest'; import { app } from '../src/server.js';
describe('api',()=>{it('health ok',async()=>{const r=await request(app).get('/api/v1/health'); expect(r.status).toBe(200); expect(r.body.status).toBe('ok');});});

import { validateConfig } from '@appforge/validators';
import fs from 'fs';
import path from 'path';

const validConfigPath = path.resolve('apps/api/examples/task-manager.config.json');
const validConfigRaw = JSON.parse(fs.readFileSync(validConfigPath, 'utf8'));

const result = validateConfig(validConfigRaw);
console.log('Valid:', result.valid);
if (!result.valid) {
  console.log('Errors:', (result as any).errors);
}

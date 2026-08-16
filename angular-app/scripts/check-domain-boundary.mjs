import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const domainDirectory = 'src/app/domain';

for (const file of readdirSync(domainDirectory)) {
  if (!file.endsWith('.ts') || file.endsWith('.spec.ts')) continue;

  const source = readFileSync(join(domainDirectory, file), 'utf8');
  if (/from ['\"](?:@angular|dexie)/.test(source)) {
    throw new Error(`Forbidden domain import: ${file}`);
  }
}

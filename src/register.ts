import { addAlias } from 'module-alias';
import { join } from 'path';

const baseDir = process.env.NODE_ENV === 'production' ? 'dist' : 'src';
addAlias('@', join(__dirname, baseDir === 'dist' ? '.' : '..'));

import { addAlias } from 'module-alias';
import { join, dirname } from 'path';

const baseDir = process.env.NODE_ENV === 'production' ? 'dist' : 'src';
const rootDir = join(dirname(__dirname), baseDir === 'dist' ? 'dist' : '');

addAlias('@', rootDir);
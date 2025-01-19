import { addAlias } from 'module-alias';
import { join } from 'path';

const rootDir = process.env.NODE_ENV === 'production'
  ? join(process.cwd(), 'dist')
  : join(process.cwd(), 'src');

// Registra o alias @ para apontar para o diretório correto
addAlias('@', rootDir);

// Log para debug
console.log('Module alias configurado:', {
  '@': rootDir,
  'NODE_ENV': process.env.NODE_ENV,
  'CWD': process.cwd()
});
import { addAlias } from 'module-alias';
import { join } from 'path';

<<<<<<< HEAD
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
=======
const baseDir = process.env.NODE_ENV === 'production' ? 'dist' : 'src';

addAlias('@', join(__dirname, baseDir === 'dist' ? '.' : '..'));
>>>>>>> parent of 63e1f9c (Enhance deployment process and module aliasing:)

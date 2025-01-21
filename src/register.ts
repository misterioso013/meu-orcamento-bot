import { addAlias } from 'module-alias';
import { join } from 'path';

// Adiciona o alias @ para a pasta src
addAlias("@", join(__dirname));

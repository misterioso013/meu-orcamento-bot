import './register';
import "dotenv/config";
import { createBot } from "./config/bot";
import { setupStartCommand } from "./handlers/start";
import { setupBudgetHandlers } from "./handlers/budget";
import { setupAiHandlers } from "./handlers/ai";
import { setupChatHandlers } from "./handlers/chat";
import { setupHelpCommand } from "./handlers/help";
import { setupProductCommands } from "./commands/admin/product";
import { setupStoreCommands } from "./commands/store";
import { setupAdminBudgetCommands } from "./commands/admin/budget";
import { setupInfoCommands } from "./commands/admin/info";
import { setupBroadcastCommands } from "./commands/admin/broadcast";

const bot = createBot();

// Setup dos comandos administrativos primeiro
setupProductCommands(bot);
setupAdminBudgetCommands(bot);
setupInfoCommands(bot);
setupBroadcastCommands(bot);

// Setup dos outros handlers
setupStartCommand(bot);
setupBudgetHandlers(bot);
setupAiHandlers(bot);
setupStoreCommands(bot);
setupHelpCommand(bot);

// Setup do handler de chat por último
setupChatHandlers(bot);

bot.start();

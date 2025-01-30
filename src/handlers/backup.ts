import { PrismaClient } from '@prisma/client';
import { Bot, InputFile } from 'grammy';
import * as fs from 'fs';
import * as path from 'path';
import { MyContext } from '../types/context';  // Ajuste o caminho conforme necessário

const prisma = new PrismaClient();

export async function setupDailyBackup(bot: Bot<MyContext>) {
    const backupHour = process.env.BACKUP_HOUR ? parseInt(process.env.BACKUP_HOUR) : 3;
    const adminId = process.env.ADMIN_ID;

    if (!adminId) {
        console.error('ADMIN_ID não configurado no .env');
        return;
    }

    setInterval(async () => {
        const now = new Date();
        if (now.getHours() === backupHour && now.getMinutes() === 0) {
            try {
                // Exporta os dados do banco
                const data = {
                    // Adicione aqui todas as tabelas que deseja fazer backup
                    users: await prisma.user.findMany(),
                    // Adicione outras tabelas conforme necessário
                };

                // Cria o arquivo de backup
                const backupPath = path.join(__dirname, '../../backups');
                if (!fs.existsSync(backupPath)) {
                    fs.mkdirSync(backupPath, { recursive: true });
                }

                const fileName = `backup_${now.toISOString().split('T')[0]}.json`;
                const filePath = path.join(backupPath, fileName);

                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

                // Envia o arquivo para o admin
                await bot.api.sendDocument(adminId, new InputFile(filePath), {
                    caption: `Backup diário do banco de dados - ${now.toLocaleDateString()}`
                });

                // Remove o arquivo após enviar
                fs.unlinkSync(filePath);

                console.log(`Backup enviado com sucesso para ${adminId}`);
            } catch (error: any) {
                console.error('Erro ao fazer backup:', error);
                await bot.api.sendMessage(adminId,
                    `❌ Erro ao gerar backup do banco de dados: ${error.message}`
                );
            }
        }
    }, 60000); // Verifica a cada minuto
}
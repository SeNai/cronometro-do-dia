/*
 * Configuração do Vite (a ferramenta que corre a interface em desenvolvimento e gera a versão final).
 *
 *   npm run dev   → abre a interface em http://localhost:5173 e atualiza-a sozinha a cada alteração.
 *                   Os pedidos a /api/... são reencaminhados para o servidor Python (porta 8765),
 *                   por isso o servidor tem de estar a correr (pelo atalho ou com iniciar.bat).
 *   npm run build → gera a versão final em web/dist/ (é essa que o servidor Python vai servir).
 */
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8765'
    }
  }
});

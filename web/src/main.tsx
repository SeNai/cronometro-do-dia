/*
 * Ponto de entrada da interface: carrega os estilos e desenha o componente App dentro de <div id="root">.
 * O StrictMode ajuda a encontrar erros em desenvolvimento (não tem efeito na versão final).
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

# FitEvolution AI — Aplicativo de Treinos & Nutrição Inteligente

Aplicativo PWA completo para acompanhamento de treinos com periodização em ciclos contínuos, registro individual de cargas por série, e diário alimentar com análise de linguagem natural baseada nas tabelas nutricionais oficiais (TACO, TBCA e USDA).

---

## 🚀 Funcionalidades Principais

### 1. Treinos & Periodização
- **Geração Automática de Treinos em Lote (Ciclo)**:
  - Seleção de múltiplos treinos (ex: TREINO A, B, C, D, E).
  - Repetição contínua em qualquer intervalo de datas.
  - Dias de folga configuráveis (ex: Sábado e Domingo).
  - **Comportamento inteligente de sequência**: dias de descanso não consomem slots do ciclo ("Continuar sequência após folga" ou "Reiniciar a cada semana").
  - Resolução de conflitos (substitui apenas futuros, preservando o histórico de treinos concluídos).
  - Prévia visual completa antes de confirmar a geração.
- **Execução ao Vivo de Treinos**:
  - Tabela com campos individuais e editáveis por série (Carga em kg e Repetições).
  - Sugestão automática de carga e repetições baseada na última sessão realizada daquele exercício.
  - Histórico de desempenho acessível durante o treino.
  - Cálculo em tempo real do volume total de treino (Volume = Carga × Repetições).
  - Cronômetro de duração da sessão.
- **Temporizador de Descanso Automático**:
  - Disparado automaticamente ao concluir uma série (configurável).
  - Contagem precisa com drift-protection (timestamps para não atrasar ao trocar de app/aba).
  - Sons sintetizados via Web Audio API (`beep`, `bell`, `digital`, `chime`).
  - Vibração em aparelhos compatíveis e notificações do navegador.
  - Controles de +15s, pausar, reiniciar e pular descanso.
- **Evolução de Cargas & Gráficos**:
  - Gráficos Recharts por exercício (Carga Máxima, Carga Média ou Volume Total).
  - Frequência semanal de treinos.

### 2. Alimentação & Nutrição com IA
- **Inteligência Artificial para Macronutrientes**:
  - Digite ou fale frases em linguagem natural (ex: *"Comi 150g de arroz branco, 100g de feijão carioca e 200g de peito de frango grelhado"*).
  - Identifica alimentos, modo de preparo e quantidades.
  - Cálculo proporcional exato com base na **Tabela TACO / UNICAMP**, **TBCA / USP** e **USDA FoodData Central**.
  - Tabela editável de revisão com calorias, proteínas, carboidratos e gorduras antes de salvar.
- **Pesquisa de Alimentos**:
  - Busca rápida no catálogo local e pesquisa com IA para qualquer alimento.
- **Diário de Refeições**:
  - Café da manhã, Almoço, Lanche, Jantar e Ceia.
  - Copiar refeição do dia anterior em 1 clique.
  - Duplicar dia inteiro.
  - Criador de receitas com recálculo de nutrientes por porção.
  - Rastreador de consumo de água (+250ml, +500ml).

### 3. Perfil, Biometria & Exportação
- Acompanhamento da evolução de peso corporal com gráfico cronológico.
- Metas diárias personalizáveis de calorias, proteínas, carboidratos, gorduras e água.
- Exportação de dados:
  - **PDF oficial para impressão** com layout organizado.
  - **Arquivos CSV** (`treinos.csv`, `nutricao.csv`, `pesos.csv`).

### 4. PWA & Funcionamento Offline
- Instalável na tela inicial de smartphones (Android & iOS Safari) e desktops.
- Suporte offline e sincronização com Cloud Firestore.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts, Canvas-Confetti
- **Backend / API**: Express, Node.js, `@google/genai` (Gemini 3.8 Flash)
- **Banco de Dados & Autenticação**: Firebase Cloud Firestore e Firebase Authentication (Google Sign-In)
- **PWA**: `vite-plugin-pwa`, Service Workers, Web App Manifest com ícones 192x192, 512x512 e maskable

---

## 📦 Como Executar Localmente

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/fitevolution-ai.git
cd fitevolution-ai
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente em um arquivo `.env`:
```env
GEMINI_API_KEY="sua_chave_do_google_ai_studio"
PORT=3000
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

Abra no navegador em `http://localhost:3000`.

---

## 🚀 Publicação (Deploy)

### Vercel
1. Conecte seu repositório no dashboard da Vercel.
2. Adicione a variável de ambiente `GEMINI_API_KEY`.
3. O arquivo `vercel.json` já está configurado para roteamento SPA.

### Netlify
1. Conecte o repositório na Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. O arquivo `public/_redirects` já garante o funcionamento das rotas SPA ao recarregar a página.

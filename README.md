<div align="center">

# 💈 Gestão Barbearias

**Sistema de gestão de alto desempenho para barbearias, com agendamento online, marketing gerado por IA e controle financeiro completo**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-FFCA28?logo=firebase&logoColor=black)
![Gemini](https://img.shields.io/badge/Gemini%20API-IA%20generativa-8E75B2?logo=googlegemini&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)

</div>

---

## 📋 Sumário

- [Sobre o projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias utilizadas](#-tecnologias-utilizadas)
- [Como rodar o projeto localmente](#️-como-rodar-o-projeto-localmente)
- [Variáveis de ambiente](#-variáveis-de-ambiente)
- [Segurança](#-segurança)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Licença](#-licença)

---

## 📖 Sobre o projeto

O **Gestão Barbearias** é um sistema web completo desenvolvido para digitalizar a rotina de uma barbearia — do agendamento de clientes ao controle financeiro, passando por estoque, fidelização e marketing. Ele substitui o controle manual por planilhas e agenda de papel por uma plataforma única, com dados em tempo real via Firebase.

Um diferencial do projeto é o uso da **API Gemini** para automatizar tarefas de comunicação com o cliente: geração de mensagens de confirmação, lembretes, cobranças e campanhas de marketing, além de sugestões de negócio baseadas nos indicadores financeiros do próprio estabelecimento.

## ✨ Funcionalidades

- 📊 **Painel (Dashboard)** — visão geral do desempenho do negócio
- 📅 **Agenda** — controle de horários e status de agendamentos (confirmado, pendente, recusado)
- 🌐 **Agendamento Online** — clientes solicitam horários sem precisar de cadastro prévio
- 👥 **Clientes** — cadastro com histórico de gasto total e última visita
- ✂️ **Serviços** — catálogo de serviços com preço e duração
- 🍹 **Bebidas** e 📦 **Estoque** — controle de produtos e materiais, com alerta de quantidade mínima
- 💰 **Financeiro** — controle de vendas, ajustes e meta mensal de faturamento
- 📈 **Relatórios** — gráficos de desempenho mensal (Recharts)
- 🤖 **Marketing com IA** — geração de campanhas de WhatsApp, confirmações, lembretes e cobranças via Gemini
- 🔐 **Autenticação** — login por e-mail/senha ou Google (Firebase Auth)
- 🛡️ **Painel Admin** — área restrita para administração do sistema
- ⚙️ **Perfil** — configuração de horário de funcionamento, intervalos e dias indisponíveis

## 🚀 Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| Linguagem | [TypeScript](https://www.typescriptlang.org/) |
| Interface | [React 19](https://react.dev/) |
| Build tool | [Vite](https://vitejs.dev/) |
| Estilização | Tailwind CSS |
| Gráficos | [Recharts](https://recharts.org/) |
| Ícones | [Lucide](https://lucide.dev/) |
| IA generativa | [Google Gemini API](https://ai.google.dev/) (`@google/genai`) |
| Backend/Dados | [Firebase](https://firebase.google.com/) (Auth + Firestore) |
| Hospedagem | [Vercel](https://vercel.com/) |

## 🛠️ Como rodar o projeto localmente

Pré-requisitos: [Node.js](https://nodejs.org/) 18+ e npm instalados.

```bash
# Clone o repositório
git clone https://github.com/BrendomSiqueira/Gest-oBarbearias.git

# Acesse a pasta do projeto
cd Gest-oBarbearias

# Instale as dependências
npm install

# Configure as variáveis de ambiente (veja a seção abaixo)
cp .env.example .env   # crie o arquivo se ele não existir

# Rode o projeto em ambiente de desenvolvimento
npm run dev
```

O projeto ficará disponível em `http://localhost:3000`.

## 🔑 Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto (nunca commitado) com a chave da API do Gemini:

```env
GEMINI_API_KEY=
```

A chave pode ser gerada em [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

> ⚠️ **Atenção:** a configuração do Firebase (`firebase-applet-config.json`) está versionada no repositório. Se for publicar este projeto ou reutilizá-lo, considere mover essas credenciais para variáveis de ambiente antes de tornar o repositório público, e revisar `firestore.rules` para o seu caso de uso.

## 🛡️ Segurança

O projeto documenta suas invariantes de segurança e casos de teste em [`security_spec.md`](./security_spec.md), cobrindo cenários como:

- Isolamento de dados por usuário (cada barbearia só acessa os próprios dados)
- Prevenção de escalonamento de privilégio (usuário comum não pode virar admin)
- Bloqueio de manipulação de preços, estoque negativo e histórico de vendas
- Controle de acesso ao painel de configuração global (`/system/config`)

As regras estão implementadas em [`firestore.rules`](./firestore.rules).

## 📁 Estrutura do projeto

```
Gest-oBarbearias/
├── components/
│   └── UI.tsx              # Componentes de interface reutilizáveis
├── services/
│   ├── gemini.ts            # Integração com a API Gemini (marketing e mensagens)
│   └── storage.ts           # Camada de persistência
├── App.tsx                  # Componente principal da aplicação
├── firebase.ts               # Inicialização do Firebase (Auth + Firestore)
├── firebase-applet-config.json
├── firestore.rules           # Regras de segurança do Firestore
├── security_spec.md          # Especificação de segurança e casos de teste
├── types.ts                  # Tipos e modelos de dados (Client, Service, Appointment...)
├── index.html
├── index.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json
```

## 📄 Licença

Projeto de uso pessoal/acadêmico. Direitos reservados ao autor.

---

<div align="center">

⭐ Feito para simplificar a rotina de quem cuida de uma barbearia todos os dias.

</div>

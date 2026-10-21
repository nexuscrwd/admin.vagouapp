# 🏛️ Guia de Integração Oficial — Formulários da Tríade VagouApp

> **Status:** APROVADO & HOMOLOGADO (15/10/2026)  
> **Aplicações Alvo:** `pvapp` (portal.vagouapp.com) e `mnvapp` (seunegocio.vagouapp.com)  
> **Origem / Soberania:** `admvapp` (adm.vagouapp.com)  

Este documento orienta os desenvolvedores do **pvapp** e do **mnvapp** sobre como disponibilizar e consumir os formulários oficiais unificados da Tríade.

---

## 🎯 1. Métodos de Disponibilização

Existem **2 métodos suportados** para `mnvapp` e `pvapp` utilizarem estes formulários:

### Método A: Via Embed / Iframe Oficial (Zero Configuração de Banco)
O `admvapp` disponibiliza rotas dedicadas e otimizadas para carregamento dentro de iframes ou webviews no `mnvapp` e `pvapp`:

1. **Cadastro Oficial de Estabelecimento / Parceiro:**
   ```html
   <iframe 
     src="https://adm.vagouapp.com/embed/estabelecimento" 
     width="100%" 
     height="780" 
     frameborder="0"
   ></iframe>
   ```

2. **Cadastro Oficial de Usuário (Modo Portal ou Modo Estabelecimento White-label):**
   ```html
   <!-- Modo Portal VagouApp (Branding Oficial VagouApp) -->
   <iframe 
     src="https://adm.vagouapp.com/embed/usuario" 
     width="100%" 
     height="720" 
     frameborder="0"
   ></iframe>

   <!-- Modo Estabelecimento Parceiro (Branding White-label do Salão) -->
   <iframe 
     src="https://adm.vagouapp.com/embed/mnv-cadastro?salonId=sal_123&salonName=Barbearia%20Vip&salonLogo=https://.../logo.png&salonColor=%2320C933" 
     width="100%" 
     height="720" 
     frameborder="0"
   ></iframe>
   ```

3. **Login / Acesso Rápido de Usuário:**
   ```html
   <iframe 
     src="https://adm.vagouapp.com/embed/mnv-acesso?salon=NomeDoSalao" 
     width="100%" 
     height="540" 
     frameborder="0"
   ></iframe>
   ```

---

### Método B: Importação Direta dos Componentes React / TypeScript
Caso `mnvapp` e `pvapp` compartilhem o repositório ou importem o módulo TypeScript compilado:

```tsx
import { 
  TriadeEstablishmentMasterForm, 
  TriadeUserRegisterForm, 
  TriadeMnvClientLoginForm 
} from '@/triade-export';

// Exemplo: No fluxo de Onboarding de Novo Salão no mnvapp:
<TriadeEstablishmentMasterForm
  onSuccess={(payload) => {
    console.log('Salão cadastrado:', payload);
    // Redireciona para o dashboard do mnvapp
  }}
/>

// Exemplo: No fluxo de Agendamento do pvapp / mnvapp:
<TriadeUserRegisterForm
  origin="establishment"
  salonName="Barbearia Imperial"
  salonAccentColor="#20C933"
  onSuccess={(client) => {
    console.log('Cliente cadastrado:', client);
    // Prossegue com a reserva de horário
  }}
/>
```

---

## 🛡️ 2. Regras de Negócio e UX Padronizadas (Invioláveis)
Todos os nós da Tríade devem respeitar as seguintes diretrizes:

1. **Botão Fechar (X) em 100% dos Formulários:**
   Todos os formulários (`TriadeUserRegisterForm`, `TriadeMnvClientLoginForm`, `TriadeEstablishmentMasterForm`, `TriadeAdminLoginForm`, `TriadeAdminRegisterForm`, `TriadeAdminRecoveryForm`) possuem botão de Fechar (`X`) posicionado no canto superior direito do cabeçalho.
   - Quando chamado via prop `onClose()`, executa a função de fechamento.
   - Quando renderizado via Embed / Iframe, emite um `postMessage({ source: 'VAGOUAPP_FORM', action: 'CLOSE' }, '*')` para o app pai capturar e fechar o modal/gaveta, com fallback para `window.history.back()`.

2. **Modal de "Mesmo Endereço do Usuário":**
   Ao cadastrar um estabelecimento, se o usuário já estiver logado ou se cadastrar, o formulário verifica proativamente se o salão funciona no endereço residencial do proprietário (ex: sobrado, garagem convertida, estúdio residencial). Se confirmado, copia os dados de CEP, rua, bairro e cidade com 1 clique!

2. **Identidade Padrão VagouApp:**
   Novos estabelecimentos NUNCA herdam nomes ou logos de salões pré-existentes. A marca de entrada é sempre a do **VagouApp**.

3. **Trava do Fundo Verde:**
   Qualquer elemento com fundo verde sólido (`bg-[#20C933]`, `bg-emerald-500`, botões ativos, tabs selecionadas) DEVE obrigatoriamente ter texto e ícones **brancos** (`text-white`).

4. **Zero Box dentro de Box:**
   Layouts respiram diretamente sobre o plano `bg-slate-900` / `bg-slate-950`, sem aninhamentos infinitos de cartões com bordas.

5. **100% Lucide-React:**
   Todos os ícones devem vir exclusivamente de `lucide-react`.

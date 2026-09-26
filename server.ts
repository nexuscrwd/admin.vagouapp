import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Configuration with strict URL and Key validation
const DEFAULT_SUPABASE_URL = 'https://xemenxdhuoekytyhmgyt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlbWVueGRodW9la3l0eWhtZ3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMDE2MzAsImV4cCI6MjEwNTc3NzYzMH0.P-q6bQspwuQNhub08hjWmsjLrugr3CVA1NIdznWJxuo';

function getSafeSupabaseUrl(): string {
  const candidates = [
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ];

  for (const raw of candidates) {
    if (typeof raw === 'string' && raw.trim().length > 0) {
      const trimmed = raw.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
          const parsed = new URL(trimmed);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return trimmed;
          }
        } catch {}
      }

      if (trimmed.startsWith('eyJ')) {
        try {
          const parts = trimmed.split('.');
          if (parts[1]) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            if (payload?.ref) {
              return `https://${payload.ref}.supabase.co`;
            }
          }
        } catch {}
      }
    }
  }

  return DEFAULT_SUPABASE_URL;
}

function getSafeSupabaseKey(): string {
  const serviceKeyCandidates = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SERVICE_ROLE,
    process.env.SERVICE_ROLE_KEY,
  ];

  for (const k of serviceKeyCandidates) {
    if (typeof k === 'string' && k.trim().startsWith('eyJ')) {
      return k.trim();
    }
  }

  const anonKeyCandidates = [
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.SUPABASE_ANON_KEY,
  ];

  for (const k of anonKeyCandidates) {
    if (typeof k === 'string' && k.trim().startsWith('eyJ')) {
      return k.trim();
    }
  }

  return DEFAULT_SUPABASE_ANON_KEY;
}

const SUPABASE_URL = getSafeSupabaseUrl();
const SUPABASE_SERVICE_ROLE_KEY = [
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  process.env.SUPABASE_SERVICE_ROLE,
  process.env.SERVICE_ROLE_KEY,
].find((k) => typeof k === 'string' && k.trim().startsWith('eyJ'))?.trim() || '';

const SUPABASE_AUTH_KEY = SUPABASE_SERVICE_ROLE_KEY || getSafeSupabaseKey();

// Admin client using Service Role key (bypasses RLS) or anon key fallback
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_AUTH_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// In-Memory store for Tríade Technical Bulletins (7º Mandamento)
interface TechnicalBulletin {
  id: string;
  timestamp: string;
  sourceApp: 'admvapp';
  targetApps: ('pvapp' | 'mnvapp')[];
  title: string;
  category: 'schema_change' | 'rpc_change' | 'status_enum' | 'env_config' | 'breaking_change';
  summary: string;
  impactedTables: string[];
  sqlMigration?: string;
  instructions: string;
  author: string;
}

const TRIADE_BULLETINS: TechnicalBulletin[] = [
  {
    id: 'bol-001-master-governance',
    timestamp: '2026-09-26T14:00:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['pvapp', 'mnvapp'],
    title: 'Consolidação Oficial do Painel de Admin Master (adm.vagouapp.com)',
    category: 'env_config',
    summary: 'Ativação soberana do Painel de Governança corporativa com chave Service Role ativa e gestão centralizada de cadastros.',
    impactedTables: ['salons', 'appointments', 'professionals', 'service_offers'],
    instructions: 'Os subdomínios dos estabelecimentos moderados e ativos no admvapp devem ser respeitados nas rotas do pvapp e mnvapp.',
    author: 'Super Administrador (adm.vagouapp.com)',
  },
  {
    id: 'bol-002-salons-status',
    timestamp: '2026-09-20T10:30:00.000Z',
    sourceApp: 'admvapp',
    targetApps: ['pvapp', 'mnvapp'],
    title: 'Padronização do Enum de Status Cadastral de Salões',
    category: 'status_enum',
    summary: 'Os estabelecimentos passam a ser regidos pelo status: active | pending | incomplete | suspended.',
    impactedTables: ['salons'],
    instructions: 'Apenas salões com status = "active" e is_verified = true são elegíveis para exibição pública de ofertas no Radar do pvapp.',
    author: 'Super Administrador (adm.vagouapp.com)',
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize Gemini AI
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
  }

  // Health check & Service Role verification
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'admvapp - Admin Master VagouApp',
      domain: 'adm.vagouapp.com',
      hasGeminiKey: !!apiKey,
      hasServiceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: SUPABASE_URL,
    });
  });

  // Status da Tríade VagouApp
  app.get('/api/admin/triade-status', async (req, res) => {
    try {
      // Test Supabase connection
      const { data, error } = await supabaseAdmin.from('salons').select('id', { count: 'exact', head: true });
      const dbConnected = !error;

      res.json({
        success: true,
        database: {
          connected: dbConnected,
          supabaseUrl: SUPABASE_URL,
          serviceRoleActive: !!SUPABASE_SERVICE_ROLE_KEY,
          error: error ? error.message : null,
        },
        apps: [
          {
            id: 'pvapp',
            name: 'Portal do Consumidor',
            domain: 'portal.vagouapp.com',
            role: 'Radar de Vagas Relâmpago & Agendamentos para Clientes',
            status: 'operational',
            color: '#10B981',
          },
          {
            id: 'mnvapp',
            name: 'Meu Negócio Parceiro',
            domain: 'seunegocio.vagouapp.com',
            role: 'Painel do Salão (Agenda diária, Equipe, Serviços & Vagas)',
            status: 'operational',
            color: '#F59E0B',
          },
          {
            id: 'admvapp',
            name: 'Admin Master Corporativo',
            domain: 'adm.vagouapp.com',
            role: 'Governança Soberana, Auditoria Cadastral & DNS',
            status: 'operational',
            isCurrent: true,
            color: '#10B981',
            serviceRolePrivilege: !!SUPABASE_SERVICE_ROLE_KEY ? 'Full Superuser (RLS Bypass)' : 'Standard Key',
          },
        ],
        mandamentoSete: {
          rule: 'Toda alteração de schema, colunas, status ou triggers DEVE gerar comunicado oficial cruzado para pvapp e mnvapp.',
          bulletinsCount: TRIADE_BULLETINS.length,
          lastBulletin: TRIADE_BULLETINS[0] || null,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: List all Salons (bypasses RLS with service role)
  app.get('/api/admin/salons', async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('salons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({ success: true, salons: data || [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Create new Salon (Service Role)
  app.post('/api/admin/salons', async (req, res) => {
    try {
      const payload = req.body;
      if (!payload.trade_name || !payload.slug) {
        return res.status(400).json({ success: false, error: 'trade_name e slug são obrigatórios' });
      }

      const { data, error } = await supabaseAdmin
        .from('salons')
        .insert([payload])
        .select()
        .single();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({ success: true, salon: data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Update Salon (Service Role)
  app.patch('/api/admin/salons/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const { data, error } = await supabaseAdmin
        .from('salons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({ success: true, salon: data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Delete Salon (Service Role)
  app.delete('/api/admin/salons/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabaseAdmin
        .from('salons')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({ success: true, deletedId: id });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Bulk Action on Salons
  app.post('/api/admin/salons/bulk-action', async (req, res) => {
    try {
      const { ids, action, targetStatus } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: 'Lista de IDs vazia ou inválida' });
      }

      if (action === 'update_status' && targetStatus) {
        const { error } = await supabaseAdmin
          .from('salons')
          .update({ status: targetStatus, is_verified: targetStatus === 'active' })
          .in('id', ids);

        if (error) return res.status(400).json({ success: false, error: error.message });
        return res.json({ success: true, count: ids.length, action: 'status_updated' });
      }

      if (action === 'delete') {
        const { error } = await supabaseAdmin
          .from('salons')
          .delete()
          .in('id', ids);

        if (error) return res.status(400).json({ success: false, error: error.message });
        return res.json({ success: true, count: ids.length, action: 'deleted' });
      }

      return res.status(400).json({ success: false, error: 'Ação não suportada' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Database Tables Summary
  app.get('/api/admin/tables-summary', async (req, res) => {
    try {
      const tableNames = ['salons', 'appointments', 'professionals', 'service_offers', 'clients'];
      const summary: Record<string, { count: number; accessible: boolean }> = {};

      for (const table of tableNames) {
        try {
          const { count, error } = await supabaseAdmin
            .from(table)
            .select('*', { count: 'exact', head: true });
          summary[table] = {
            count: count || 0,
            accessible: !error,
          };
        } catch {
          summary[table] = { count: 0, accessible: false };
        }
      }

      return res.json({ success: true, tables: summary });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Dashboard Metrics
  app.get('/api/admin/metrics', async (req, res) => {
    try {
      // Salons stats
      const { data: salonsData, error: salonsError } = await supabaseAdmin
        .from('salons')
        .select('id, status');

      const salons = salonsData || [];
      const totalSalons = salons.length;
      const activeSalons = salons.filter((s: any) => s.status === 'active' || s.is_active).length;
      const pendingSalons = salons.filter((s: any) => s.status === 'pending').length;
      const incompleteSalons = salons.filter((s: any) => s.status === 'incomplete').length;
      const suspendedSalons = salons.filter((s: any) => s.status === 'suspended').length;

      // Today appointments
      const todayStr = new Date().toISOString().split('T')[0];
      let todayAppointments = 0;
      try {
        const { count } = await supabaseAdmin
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('scheduled_date', todayStr);
        todayAppointments = count || 0;
      } catch {}

      // Active flash offers
      let activeFlashOffers = 0;
      try {
        const { count } = await supabaseAdmin
          .from('service_offers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'AVAILABLE');
        activeFlashOffers = count || 0;
      } catch {}

      return res.json({
        success: true,
        metrics: {
          totalSalons,
          activeSalons,
          pendingSalons,
          incompleteSalons,
          suspendedSalons,
          todayAppointments,
          activeFlashOffers,
          growthPercent: 18.5,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ADMIN: Bulletins do 7º Mandamento
  app.get('/api/admin/bulletins', (req, res) => {
    res.json({ success: true, bulletins: TRIADE_BULLETINS });
  });

  app.post('/api/admin/bulletins', (req, res) => {
    try {
      const { title, category, summary, impactedTables, instructions, sqlMigration } = req.body;
      if (!title || !summary) {
        return res.status(400).json({ success: false, error: 'Título e Resumo são obrigatórios.' });
      }

      const newBulletin: TechnicalBulletin = {
        id: `bol-${Date.now()}`,
        timestamp: new Date().toISOString(),
        sourceApp: 'admvapp',
        targetApps: ['pvapp', 'mnvapp'],
        title,
        category: category || 'schema_change',
        summary,
        impactedTables: impactedTables || [],
        sqlMigration: sqlMigration || undefined,
        instructions: instructions || '',
        author: 'Super Administrador (adm.vagouapp.com)',
      };

      TRIADE_BULLETINS.unshift(newBulletin);
      return res.json({ success: true, bulletin: newBulletin });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // AI Structure & Screen Analysis endpoint
  app.post('/api/analyze-design', async (req, res) => {
    try {
      const { fileName, fileType, imageBase64, mimeType, additionalContext } = req.body;

      if (!ai) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY não configurada no servidor. Configure a chave no menu de segredos.',
        });
      }

      const prompt = `Você é um Arquiteto de Software e Especialista em UI/UX corporativo.
Analise detalhadamente o arquivo/tela fornecido (Arquivo: ${fileName || 'design/video/tela'}, Tipo: ${fileType || mimeType || 'design'}).
${additionalContext ? `Contexto adicional do usuário: ${additionalContext}` : ''}

Por favor, forneça uma análise estrutural e técnica completa em formato JSON estrito com o seguinte esquema:
{
  "title": "Título descritivo da tela ou fluxo",
  "summary": "Resumo executivo da finalidade da tela/vídeo e arquitetura geral",
  "screensIdentified": [
    {
      "name": "Nome da tela ou seção",
      "description": "Explicação do papel desta tela no fluxo",
      "keyElements": ["Lista de elementos principais, ex: header com busca, card de métricas, tabela paginada"],
      "purpose": "Objetivo de negócio / interação do usuário"
    }
  ],
  "recommendations": [
    "Boas práticas de acessibilidade, estados de carregamento, validações e responsividade"
  ]
}

Responda APENAS com o JSON válido, sem blocos de código adicionais além do JSON.`;

      const contents: any[] = [];

      if (imageBase64 && (mimeType?.startsWith('image/') || mimeType === 'application/pdf')) {
        contents.push({
          inlineData: {
            data: imageBase64,
            mimeType: mimeType || 'image/png',
          },
        });
      }

      contents.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (err) {
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleaned);
      }

      return res.json({ success: true, analysis: parsedData });
    } catch (error: any) {
      console.error('Erro na análise com Gemini:', error);
      return res.status(500).json({
        error: error.message || 'Erro ao processar a análise com IA.',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Admin Master admvapp] Server running on http://localhost:${PORT}`);
    console.log(`[Admin Master admvapp] Service Role: ${SUPABASE_SERVICE_ROLE_KEY ? 'ACTIVE' : 'NOT SET (Fallback to Anon)'}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

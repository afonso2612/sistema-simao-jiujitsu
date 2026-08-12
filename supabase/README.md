# Supabase - Simao Tavares Top Team

Este projeto usa o Supabase como banco online e fonte principal dos dados quando as variaveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` ou `VITE_SUPABASE_ANON_KEY` estao configuradas.

## Configurar o projeto

1. Acesse o painel do Supabase.
2. Crie ou abra o projeto.
3. Abra `SQL Editor`.
4. Execute `supabase/schema.sql`.
5. Execute `supabase/2026-08-10-fonte-unica-alunos.sql`, se ainda nao foi aplicado.
6. Em `Project Settings > API`, copie:
   - Project URL
   - anon public key ou publishable key
7. Crie `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
```

## Criar o diretor principal

1. No Supabase, abra `Authentication > Users`.
2. Crie o usuario do Mestre Simao com e-mail e senha dentro do Supabase Auth.
3. Nao coloque a senha em codigo, SQL, Git, localStorage ou variaveis enviadas ao frontend.
4. Abra `supabase/bootstrap-diretor.sql`.
5. Troque `EMAIL_DO_DIRETOR_AQUI` pelo e-mail criado no Supabase Auth.
6. Rode o SQL no `SQL Editor`.

Esse SQL cria ou atualiza o registro em `public.profiles` com:

- `cargo = 'diretor'`
- `academia_id` da academia `Simao Tavares Top Team`

Sem esse perfil, o login por e-mail pode autenticar no Supabase, mas o sistema nao libera o painel administrativo.

## Fonte dos dados

Com Supabase configurado e usuario autorizado:

- alunos, presencas e pagamentos sao carregados do banco online;
- operacoes administrativas dependem das policies/RLS;
- `localStorage` fica apenas como fallback local quando Supabase nao esta configurado e para dados de sessao/interface.

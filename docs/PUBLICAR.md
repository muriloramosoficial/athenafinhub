# Publicar o Athena FinHub (do zero ao ar)

Ordem: **1. Supabase → 2. GitHub → 3. Vercel → 4. Cloudflare (restrição por IP)**.
Tempo estimado: 1 hora para quem nunca fez.

---

## 1. Supabase (banco, login e arquivos)

### 1.1 Criar o projeto
1. Crie uma conta em https://supabase.com e um **New project** (plano Free).
2. Guarde a senha do banco em local seguro.
3. Aguarde a criação.

### 1.2 Pegar as chaves
Em **Project Settings → API**, copie:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / publishable key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Não use a **service_role** key neste projeto.

### 1.3 Criar o banco
No menu lateral, abra **SQL Editor → New query**. Para **cada** arquivo abaixo, nesta ordem, cole o conteúdo
e clique em **Run**:

1. `supabase/migrations/0001_perfis_e_auth.sql`
2. `supabase/migrations/0002_telas_menus_permissoes.sql`
3. `supabase/migrations/0003_storage.sql`
4. `supabase/migrations/0004_tela_visao_geral.sql`

Cada um deve terminar com "Success". Se algum falhar, não rode os seguintes e veja a mensagem.

### 1.4 Configurar a autenticação
Em **Authentication → Providers → Email**:
- **Enable Email provider**: ligado.
- **Allow new users to sign up**: ligado (é o que permite a tela de cadastro).
- **Confirm email**: recomendado **ligado** (a pessoa confirma o próprio e-mail). Se o limite de e-mails do Free
  atrapalhar, pode desligar. A aprovação pelo Gestor continua sendo obrigatória de qualquer forma.

Em **Authentication → URL Configuration**, em **Site URL**, coloque a URL final da intranet
(ex.: `https://intranet.suaempresa.com.br`). Isso é usado nos links de confirmação de e-mail.

### 1.5 Criar o primeiro Desenvolvedor
1. Crie seu usuário pelo próprio sistema (**Criar cadastro**) ou em **Authentication → Users → Add user**.
2. No **SQL Editor**, rode (troque o e-mail):
   ```sql
   update public.perfis
      set perfil = 'desenvolvedor', status = 'ativo'
    where email = 'seu.email@suaempresa.com.br';
   ```
3. A partir daí, você aprova os demais usuários e os Gestores pelo sistema.

Verificação: `select email, perfil, status from public.perfis;` deve mostrar você como desenvolvedor ativo.

---

## 2. GitHub

O repositório já existe. Envie o código para o branch principal (ex.: `main`). A Vercel publica a partir dele.

---

## 3. Vercel (hospedagem)

1. Em https://vercel.com, **Add New → Project** e importe o repositório `athenafinhub`.
2. Framework: **Next.js** (detectado automaticamente). Não precisa mudar o build.
3. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon/publishable |
   | `APP_ALLOWED_HOSTS` | o domínio da intranet, ex.: `intranet.suaempresa.com.br` |

4. **Deploy**. Confira que a página de login abre pelo endereço `*.vercel.app` **somente** se o host
   estiver em `APP_ALLOWED_HOSTS` (com o domínio correto, o `*.vercel.app` responde **403**).
5. Em **Settings → Domains**, adicione `intranet.suaempresa.com.br`.

> **Atenção (custos):** o plano **Hobby** da Vercel é destinado a uso pessoal/não comercial. Para uso
> corporativo, confira os termos vigentes e, se for o caso, use o plano **Pro**. Verifique antes de publicar.

---

## 4. Cloudflare: acesso só pelo IP da empresa

### 4.1 Descobrir o IP de saída da empresa
Na rede da empresa, acesse https://ifconfig.me ou peça ao time de TI. Esse é o **IP público de saída**.
- Se o IP da operadora **mudar**, o acesso para. Peça um **IP fixo** à operadora (recomendado) ou um
  IP de saída fixo via VPN corporativa.
- Se houver vários IPs (matriz, filiais), liste todos.

### 4.2 Colocar o domínio no Cloudflare
1. Adicione o domínio da empresa no Cloudflare (plano Free) e troque os DNS na registradora, se necessário.
2. Crie o registro **CNAME** `intranet` apontando para o endereço que a Vercel indicar
   (ex.: `cname.vercel-dns.com`), com o **proxy ativado** (nuvem laranja).
   Sem o proxy, o Cloudflare não consegue filtrar o tráfego.

### 4.3 Regra de bloqueio (WAF)
Em **Security → WAF → Custom rules → Create rule**:
- Nome: `Intranet: somente IP da empresa`
- Expressão (exemplo com dois IPs):
  ```
  (http.host eq "intranet.suaempresa.com.br" and not ip.src in {203.0.113.10 198.51.100.20})
  ```
- Ação: **Block**.

Substitua os IPs pelos da empresa. Teste de fora da rede (ex.: 4G do celular): deve ser bloqueado.
O Free tem limite de regras personalizadas: confira no painel.

### 4.4 Impedir o acesso direto pela Vercel
Qualquer pessoa pode tentar o endereço `*.vercel.app` ou o domínio direto na Vercel, contornando o Cloudflare.
Duas proteções:
1. **Já incluída no app:** o `APP_ALLOWED_HOSTS` recusa (403) qualquer host que não seja o domínio da intranet.
2. **Recomendado:** no projeto da Vercel, desative os domínios `*.vercel.app` (se o painel oferecer essa opção
   no seu plano) e confira as regras de firewall/IP da própria Vercel.

Um atacante que descobrisse o IP da Vercel e enviasse o cabeçalho `Host` correto ainda passaria pelo app;
por isso, a proteção principal continua sendo o login + permissões no banco.

### 4.5 Validação final (checklist)
- [ ] De dentro da empresa: abre `https://intranet.suaempresa.com.br` e faz login.
- [ ] De fora (4G): bloqueado pelo Cloudflare.
- [ ] `https://<projeto>.vercel.app`: 403.
- [ ] Usuário novo se cadastra, fica "aguardando aprovação" e não vê o menu.
- [ ] Após aprovação, vê somente as telas liberadas.

---

## Manutenção do dia a dia

- **Nova migration:** crie `supabase/migrations/000N_descricao.sql`, rode no SQL Editor, e envie o código.
- **Novo usuário:** a própria pessoa se cadastra; um Gestor aprova em **Usuários e acessos**.
- **Troca de IP da empresa:** atualize a regra do Cloudflare (passo 4.3).
- **Projeto Supabase pausado:** restaure no painel do Supabase.

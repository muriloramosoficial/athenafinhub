# Publicar o Athena FinHub (do zero ao ar)

Ordem:
**0. Segurança das chaves → 1. Supabase (banco) → 2. GitHub → 3. Cloudflare (publicar) → 4. Variáveis de ambiente → 5. Domínio + restrição por IP → 6. Testes**

Tempo estimado: 1 a 2 horas para quem nunca fez.

---

## 0. Antes de tudo: troque as chaves que foram compartilhadas

As chaves enviadas em conversa (**service_role** e **token pessoal `sbp_...`**) dão controle total sobre o projeto.
Mesmo sendo temporárias, faça isto depois da configuração inicial:

1. No Supabase, em **Account → Access Tokens**, revogue o token pessoal e crie outro se precisar.
2. Em **Project Settings → API Keys**, gere uma nova chave `service_role`/secret e invalide a antiga.
3. Nunca cole chaves `service_role` ou tokens em chats, em arquivos do repositório ou em variáveis `NEXT_PUBLIC_*`.

O sistema **não usa** a service_role. Ela não deve estar em nenhum lugar do projeto de publicação.

---

## 1. Supabase (banco, login e arquivos)

### 1.1 Criar o banco
1. Abra o projeto no painel do Supabase.
2. No menu lateral, **SQL Editor → New query**.
3. Abra o arquivo **`supabase/setup_inicial.sql`** do repositório, copie tudo, cole e clique em **Run**.
4. Deve terminar com "Success". Se der erro, **não rode de novo**: veja a mensagem e avise.

> `setup_inicial.sql` contém as 4 migrations juntas (`supabase/migrations/0001` a `0004`). Use-o **uma única vez**, em projeto novo.

### 1.2 Pegar as chaves públicas
Em **Project Settings → API**, anote:
- **Project URL** → vai para `NEXT_PUBLIC_SUPABASE_URL`
- **anon / publishable key** → vai para `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 1.3 Configurar a autenticação
Em **Authentication → Sign In / Providers → Email**:
- **Enable Email provider**: ligado.
- **Allow new users to sign up**: ligado (permite a tela de cadastro).
- **Confirm email**: recomendado **ligado**. Se o limite de e-mails do plano gratuito atrapalhar, pode desligar; a aprovação pelo Gestor continua obrigatória.

Em **Authentication → URL Configuration**:
- **Site URL**: `https://intranet.suaempresa.com.br` (o domínio final, configurado na etapa 5).

### 1.4 Criar o primeiro Desenvolvedor
1. Cadastre seu usuário pela própria tela **Criar cadastro** do sistema (ou em **Authentication → Users → Add user**).
2. No **SQL Editor**, rode (troque o e-mail):
   ```sql
   update public.perfis
      set perfil = 'desenvolvedor', status = 'ativo'
    where email = 'seu.email@suaempresa.com.br';
   ```
3. Confira: `select email, perfil, status from public.perfis;`

---

## 2. GitHub

Envie o código para o branch que será publicado (normalmente `main`). O Cloudflare publica a partir dele.

---

## 3. Cloudflare: publicar a aplicação (Workers)

O Athena FinHub é publicado como **Cloudflare Worker** (com o adaptador OpenNext). Não use o Pages com o `*.pages.dev`:
o endereço `*.pages.dev` não pode ser desligado, enquanto o `*.workers.dev` pode (configurado no projeto, já está desligado em `wrangler.jsonc`).

### 3.1 Conectar o repositório
1. Painel do Cloudflare → **Workers & Pages → Create → Import a repository** (conecte o GitHub e escolha `athenafinhub`).
2. Nome do Worker: `athena-finhub` (deve bater com `name` em `wrangler.jsonc`).
3. Configure o build:
   - **Build command:** `npm run build:cf`
   - **Deploy command:** `npx wrangler deploy --keep-vars`
   - **Root directory:** `/` (raiz)
4. **Não clique em deploy ainda**: primeiro configure as variáveis (etapa 4).

> O Cloudflare pode mostrar outros nomes para estes campos conforme a versão do painel. O conteúdo é o mesmo.

---

## 4. Variáveis de ambiente (onde e como configurar)

Existem **dois tipos**, e cada um vai em um lugar:

| Variável | Tipo | Onde configurar | Valor |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Build** (usada ao construir o site) | Settings → **Build** → Variables and secrets (ou Build variables) | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Build** | idem | chave **anon/publishable** |
| `APP_ALLOWED_HOSTS` | **Runtime** (lida pelo servidor, a cada requisição) | Settings → **Variables and Secrets** (runtime) | `intranet.suaempresa.com.br` |

### 4.1 Passo a passo
No Worker `athena-finhub`, abra **Settings**:

**a) Build variables** (para o build):
- Adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com os valores da etapa 1.2.
- Para não ficar nada "escondido", pode usar tipo **Text**. São valores públicos por design; a segurança está no login e no banco.

**b) Variables and Secrets** (runtime):
- Clique em **Add** → tipo **Text** → nome `APP_ALLOWED_HOSTS` → valor `intranet.suaempresa.com.br` (o domínio real).
- Se houver mais de um domínio, separe por vírgula, sem espaços: `intranet.suaempresa.com.br,intranet2.suaempresa.com.br`.
- **Não coloque porta nem `https://`**. Só o nome do host.

**Por que isso importa:** se `APP_ALLOWED_HOSTS` estiver vazio em produção, o sistema responde **403 para tudo**.
Isso é proposital: é preferível ficar fechado a ficar aberto por esquecimento.

### 4.2 Depois de salvar
- Rode **Deploy** (ou faça um novo push no GitHub).
- A cada deploy o comando `--keep-vars` preserva as variáveis definidas no painel.

---

## 5. Domínio e restrição por IP

### 5.1 Descobrir o IP da empresa
O IP externo informado é **189.86.90.98**. Confirme-o **de dentro da rede da empresa** (abra https://ifconfig.me). Se for outro, use o que aparecer.

Pontos de atenção:
- **IP dinâmico:** a operadora pode trocá-lo, e o acesso para. Peça um **IP fixo** para a operadora (costuma ser um serviço pago, mas é o caminho mais estável). Enquanto isso, teste periodicamente.
- **IPv6:** se a rede usar IPv6, o acesso por esse protocolo terá outro endereço. Verifique com `https://ifconfig.co` (ou `curl -6 https://ifconfig.co`). Se houver IPv6, inclua o endereço também na regra.
- **Vários locais** (matriz, filiais, VPN): liste todos os IPs de saída na regra.

### 5.2 Colocar o domínio no Cloudflare
1. O domínio da empresa precisa estar **no Cloudflare** (zona ativa). Se estiver em outro DNS, adicione o domínio no Cloudflare e troque os nameservers na registradora.
2. No Worker, **Settings → Domains & Routes → Add → Custom domain** → `intranet.suaempresa.com.br`.
   O Cloudflare cria o registro DNS automaticamente, já com proxy ativado (nuvem laranja).

### 5.3 Regra de bloqueio por IP (WAF)
No painel do domínio (**a zona da empresa**, não o Worker): **Security → WAF → Custom rules → Create rule**
(no painel novo pode aparecer como **Security rules**).

- **Nome:** `Intranet: somente IP da empresa`
- **Expressão** (edite o domínio e os IPs):
  ```
  (http.host eq "intranet.suaempresa.com.br" and not ip.src in {189.86.90.98})
  ```
  Se houver mais IPs: `not ip.src in {189.86.90.98 200.1.2.3}`.
- **Ação:** **Block**.

Como o `*.workers.dev` está desligado, o único endereço que sobra é o do domínio, então a regra cobre tudo.
O plano gratuito tem um limite de regras personalizadas; esta usa apenas uma.

### 5.4 Limitação conhecida e próximo nível (recomendado)
Restrição só por IP tem duas fraquezas: quem estiver na mesma rede (ou usar o mesmo IP de saída) entra sem login
no Cloudflare, e mudanças de IP exigem ajuste. O login do próprio sistema continua obrigatório, então os dados
continuam protegidos. Se quiser mais robustez depois, dá para somar o **Cloudflare Access** (Zero Trust) com
política de IP **e** verificação de e-mail. Pergunte antes de implementar.

---

## 6. Testes (faça nesta ordem)

- [ ] **De dentro da empresa** (no mesmo Wi-Fi/cabo): `https://intranet.suaempresa.com.br` abre a tela de login.
- [ ] **De fora** (4G do celular, com Wi-Fi desligado): aparece bloqueio do Cloudflare.
- [ ] **Endereço `*.workers.dev`** do Worker: não abre (o Cloudflare desligou).
- [ ] **Host errado** (teste avançado): o sistema responde 403 caso alguém chegue ao Worker por outro domínio.
- [ ] **Cadastro novo**: fica "Cadastro aguardando aprovação" e não vê o menu.
- [ ] **Após aprovação**: vê somente as telas liberadas.
- [ ] **Login do Desenvolvedor**: vê Administração (Telas, Menus, Usuários).

Se algum teste falhar, verifique na ordem: variável `APP_ALLOWED_HOSTS` (etapa 4), domínio do Custom Domain (5.2), regra de IP (5.3).

---

## Manutenção do dia a dia

- **Nova migration:** crie `supabase/migrations/000N_descricao.sql`, rode no SQL Editor e envie o código.
- **Novo usuário:** a própria pessoa se cadastra; um Gestor aprova em **Usuários e acessos**.
- **Troca de IP da empresa:** atualize a expressão da regra (5.3).
- **Novo domínio:** adicione na variável `APP_ALLOWED_HOSTS` (separado por vírgula) **e** em Custom Domains.
- **Projeto Supabase pausado por inatividade:** restaure no painel do Supabase.

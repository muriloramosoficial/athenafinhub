'use client';

import { criarMenu } from '@/app/actions/menus';
import { FormAcao, BotaoEnviar } from '@/components/FormAcao';
import { ICONES_DISPONIVEIS } from '@/components/Icone';
import type { Tela } from '@/lib/tipos';

export function NovoMenuForm({
  telas,
  grupos,
}: {
  telas: Pick<Tela, 'id' | 'codigo' | 'nome' | 'status'>[];
  grupos: string[];
}) {
  return (
    <FormAcao acao={criarMenu}>
      <label className="campo">
        <span>Grupo (título no menu, opcional)</span>
        <input name="grupo" list="grupos-existentes" placeholder="Ex.: Tesouraria" maxLength={40} />
        <datalist id="grupos-existentes">
          {grupos.map((g) => <option key={g} value={g} />)}
        </datalist>
        <small className="texto-suave">Deixe em branco para o item aparecer no topo do menu.</small>
      </label>

      <label className="campo">
        <span>Rótulo (texto do item)</span>
        <input name="rotulo" required maxLength={40} placeholder="Ex.: Conciliação Bancária" />
      </label>

      <label className="campo">
        <span>Tela que este item abre</span>
        <select name="tela_id" required defaultValue="">
          <option value="" disabled>Escolha uma tela…</option>
          {telas.map((t) => (
            <option key={t.id} value={t.id}>{t.nome} ({t.codigo})</option>
          ))}
        </select>
      </label>

      <div className="linha-campos">
        <label className="campo">
          <span>Ícone</span>
          <select name="icone" defaultValue="folder">
            {ICONES_DISPONIVEIS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Ordem</span>
          <input name="ordem" type="number" defaultValue={10} />
        </label>
      </div>

      <BotaoEnviar>Criar item de menu</BotaoEnviar>
    </FormAcao>
  );
}

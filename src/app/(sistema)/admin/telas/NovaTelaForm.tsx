'use client';

import { useState } from 'react';
import { criarTela } from '@/app/actions/telas';
import { AREAS, sugerirCodigo } from '@/lib/codigo-tela';
import { FormAcao, BotaoEnviar } from '@/components/FormAcao';

export function NovaTelaForm() {
  const [area, setArea] = useState<string>(AREAS[0].id);
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoEditadoManualmente, setCodigoEditadoManualmente] = useState(false);

  // O código acompanha área e nome, até o usuário editar o campo manualmente
  const atualizarAutomatico = (novaArea: string, novoNome: string) => {
    if (!codigoEditadoManualmente) setCodigo(sugerirCodigo(novaArea, novoNome));
  };

  return (
    <FormAcao acao={criarTela}>
      <label className="campo">
        <span>Área</span>
        <select
          name="area"
          value={area}
          onChange={(e) => {
            setArea(e.target.value);
            atualizarAutomatico(e.target.value, nome);
          }}
        >
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>{a.rotulo} ({a.prefixo}_)</option>
          ))}
        </select>
      </label>

      <label className="campo">
        <span>Nome da tela</span>
        <input
          name="nome"
          required
          minLength={2}
          maxLength={80}
          placeholder="Ex.: Conciliação Bancária"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            atualizarAutomatico(area, e.target.value);
          }}
        />
      </label>

      <label className="campo">
        <span>Código da tela (nome da tabela)</span>
        <input
          name="codigo"
          required
          value={codigo}
          onChange={(e) => {
            setCodigoEditadoManualmente(true);
            setCodigo(e.target.value.toLowerCase());
          }}
          pattern="^(gl|tes|cap|car|bi)_[a-z0-9]+(_[a-z0-9]+)*$"
          className="input-codigo"
        />
        <small className="texto-suave">Somente minúsculas, números e "_". Ex.: tes_conciliacao_bancaria</small>
      </label>

      <label className="campo">
        <span>Descrição (opcional)</span>
        <textarea name="descricao" rows={3} placeholder="Para que serve esta tela?" />
      </label>

      <fieldset className="campo-grupo">
        <legend>Quem enxerga esta tela por padrão</legend>
        <label className="check">
          <input type="checkbox" name="perfis" value="gestor" defaultChecked /> Gestores
        </label>
        <label className="check">
          <input type="checkbox" name="perfis" value="colaborador" defaultChecked /> Colaboradores
        </label>
        <small className="texto-suave">Desenvolvedores sempre enxergam todas as telas.</small>
      </fieldset>

      <BotaoEnviar>Criar tela</BotaoEnviar>
    </FormAcao>
  );
}

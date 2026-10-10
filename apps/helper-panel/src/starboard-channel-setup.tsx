import { useEffect, useRef, useState } from 'react';
import { api, type GuildContext } from './api';
import { helperLocale } from './i18n';
import { canCreateStarboard, moderatorRoles, validStarboardName } from './starboard-channel';
import './starboard-channel.css';
import { ResourceMultiSelect } from './resource-multi-select';

export function StarboardChannel({context, onCreated}: {
  context: GuildContext | null;
  onCreated: (channel: GuildContext['channels'][number]) => void;
}) {
  const [name, setName] = useState('starboard');
  const [staff, setStaff] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState('');
  const alive = useRef(true);
  const submitting = useRef(false);
  useEffect(() => { alive.current = true; return () => {alive.current = false;}; }, []);
  const pt = helperLocale() === 'pt';
  const text = (en: string, translated: string) => pt ? translated : en;
  const roles = moderatorRoles(context);
  const allowed = canCreateStarboard(context);
  async function create() {
    if (!context || !allowed || !validStarboardName(name) || submitting.current) return;
    submitting.current = true;
    setBusy(true); setError('');
    try {
      const result = await api.createStarboardChannel(name.trim().toLowerCase(), staff);
      if (!alive.current) return;
      if (result.guildId !== context.guildId || result.channel.type !== 0 || !result.channel.id) {
        throw new Error('starboard_response_invalid');
      }
      onCreated({id:result.channel.id,name:result.channel.name,type:'text'});
      setCreated(result.channel.name);
    } catch (cause) {
      if (!alive.current) return;
      const code = cause instanceof Error ? cause.message : '';
      const errors: Record<string, string> = {
        starboard_channel_name_exists:text('A channel with this name already exists. Select it above or choose another name; its permissions were not changed.', 'Já existe um canal com este nome. Seleciona-o acima ou escolhe outro nome; as suas permissões não foram alteradas.'),
        starboard_existing_channel_changed:text('The previously created channel was changed in Discord. Check its permissions there and select it above; no existing channel was modified.', 'O canal criado anteriormente foi alterado no Discord. Verifica as permissões e seleciona-o acima; nenhum canal existente foi modificado.'),
        starboard_bot_permissions_required:text('The Helper needs Manage Channels, Manage Roles, View Channel, Send Messages, Add Reactions, Embed Links, Attach Files, Read Message History, Create Public/Private Threads and Send Messages in Threads. Administrator is not required.', 'O Helper precisa de gerir canais e cargos, ver canais, enviar mensagens, adicionar reações, incorporar links, anexar ficheiros, ler o histórico, criar threads públicas/privadas e enviar mensagens em threads. Não precisa de Administrador.'),
        starboard_creation_rate_limited:text('Discord is limiting channel creation. Wait a moment before trying again.', 'O Discord está a limitar a criação de canais. Aguarda um pouco antes de tentar novamente.'),
        starboard_channel_limit_reached:text('This server has reached Discord’s channel limit. Choose an existing channel.', 'Este servidor atingiu o limite de canais do Discord. Escolhe um canal existente.'),
        discord_channel_create_failed:text('Discord rejected the channel creation. Check the Helper’s server permissions and channel limit.', 'O Discord recusou a criação do canal. Verifica as permissões do Helper e o limite de canais do servidor.'),
        discord_context_unavailable:text('Discord resources could not be refreshed. Refresh the resources before trying again.', 'Não foi possível atualizar os recursos Discord. Atualiza os recursos antes de tentar novamente.'),
        unauthenticated:text('Your session expired. Sign in again before creating a channel.', 'A tua sessão expirou. Inicia sessão novamente antes de criar um canal.'),
        starboard_user_manage_channels_required:text('Your account needs Manage Server and Manage Channels, or Administrator.', 'A tua conta precisa de gerir servidor e canais, ou de Administrador.'),
        starboard_invalid_staff_role:text('Choose only existing moderator roles from this server.', 'Escolhe apenas cargos de moderação existentes neste servidor.'),
        starboard_everyone_administrator:text('Remove Administrator from @everyone first; channel overwrites cannot restrict administrators.', 'Remove primeiro Administrador de @everyone; as permissões do canal não restringem administradores.'),
      };
      setError(errors[code] ?? text('Creation could not be confirmed. Check Discord before trying again to avoid duplicates. Your Starboard configuration was not changed.', 'Não foi possível confirmar a criação. Verifica o Discord antes de tentar novamente para evitar duplicados. A configuração do Starboard não foi alterada.'));
    } finally {
      submitting.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return <section className="starboard-channel" aria-label={text('Dedicated Starboard channel','Canal dedicado ao Starboard')}>
    <div className="starboard-channel__heading">
      <h4>{text('Dedicated Starboard channel', 'Canal dedicado ao Starboard')}</h4>
      {!created && <button type="button" className="primary" disabled={busy || !allowed || !validStarboardName(name)} onClick={() => void create()}>{busy ? text('Creating channel…','A criar canal…') : text('Create channel with permissions','Criar canal com permissões')}</button>}
    </div>
    <p>{text('Members can read highlights and react. Only moderators and the Helper can post; members cannot create threads. Administrators retain their Discord access.', 'Os membros podem ler destaques e reagir. Só os moderadores e o Helper podem publicar; os membros não podem criar threads. Os administradores mantêm o seu acesso Discord.')}</p>
    <div className="field-grid">
      <label className="field"><span><b>{text('Channel name','Nome do canal')}</b></span>
        <input value={name} maxLength={80} disabled={busy || !!created} onChange={event => setName(event.target.value)} aria-invalid={!validStarboardName(name)} />
        {!validStarboardName(name) && <small>{text('Use 2–80 letters, numbers, hyphens or underscores.','Usa 2–80 letras, números, hífenes ou underscores.')}</small>}
      </label>
      <ResourceMultiSelect label={text('Moderator roles','Cargos de moderação')}
        help={text('Leave unselected to include all detected moderator roles.','Sem seleção, inclui todos os cargos de moderação detetados.')}
        options={roles.map(role => ({id:role.id,label:role.name}))} value={staff}
        disabled={busy || !!created || !roles.length} onChange={setStaff} />
    </div>
    {!allowed && <p role="status">{text('Refresh Discord resources and check the Helper permissions, including Create Public/Private Threads and Send Messages in Threads. Administrator is not required.','Atualiza os recursos Discord e verifica as permissões do Helper, incluindo criar threads públicas/privadas e enviar mensagens em threads. Não precisa de Administrador.')}</p>}
    {error && <p className="starboard-channel__error" role="alert">{error}</p>}
    {created && <p className="starboard-channel__success" role="status">{text(`#${created} is ready and selected. Save changes to use it for Starboard.`, `#${created} está pronto e selecionado. Guarda as alterações para o usar no Starboard.`)}</p>}
  </section>;
}

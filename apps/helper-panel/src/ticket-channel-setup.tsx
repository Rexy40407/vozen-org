import { useEffect, useRef, useState } from 'react';
import { api, type GuildContext } from './api';
import { helperLocale } from './i18n';
import { canCreateStarboard, validStarboardName } from './starboard-channel';
import './starboard-channel.css';

export function TicketPanelChannel({context, onCreated}: {
  context: GuildContext | null;
  onCreated: (channel: GuildContext['channels'][number]) => void;
}) {
  const [name, setName] = useState('tickets');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState('');
  const [error, setError] = useState('');
  const alive = useRef(true);
  const submitting = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const text = (en: string, pt: string) => helperLocale() === 'pt' ? pt : en;
  const allowed = canCreateStarboard(context);
  async function create() {
    if (!context || !allowed || !validStarboardName(name) || submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const result = await api.createTicketPanelChannel(name.trim().toLowerCase());
      if (!alive.current) return;
      if (result.guildId !== context.guildId || result.channel.type !== 0 || !result.channel.id || !result.channel.name) throw new Error('ticket_response_invalid');
      onCreated({id:result.channel.id, name:result.channel.name, type:'text'});
      setCreated(result.channel.name);
    } catch (cause) {
      if (!alive.current) return;
      const code = cause instanceof Error ? cause.message : '';
      const errors: Record<string,string> = {
        ticket_channel_name_exists: text('A channel with this name already exists. Select it below or choose another name; its permissions were not changed.', 'Já existe um canal com este nome. Seleciona-o abaixo ou escolhe outro nome; as permissões não foram alteradas.'),
        ticket_existing_channel_changed: text('The previously created channel has changed. Check it in Discord and select it below; no existing channel was modified.', 'O canal criado anteriormente foi alterado. Verifica-o no Discord e seleciona-o abaixo; nenhum canal existente foi modificado.'),
        ticket_bot_permissions_required: text('The Helper needs channel and role management, messaging and thread permissions to create the read-only panel channel. Refresh Discord resources after updating permissions.', 'O Helper precisa de gerir canais e cargos e das permissões de mensagens e threads para criar o canal de leitura. Atualiza os recursos Discord depois de alterar as permissões.'),
        ticket_user_manage_channels_required: text('Your account needs Manage Server and Manage Channels, or Administrator.', 'A tua conta precisa de gerir servidor e canais, ou de Administrador.'),
        ticket_creation_busy: text('Another channel is being created. Wait before trying again.', 'Está a ser criado outro canal. Aguarda antes de tentar novamente.'),
        ticket_creation_rate_limited: text('Discord is limiting channel creation. Wait before trying again.', 'O Discord está a limitar a criação de canais. Aguarda antes de tentar novamente.'),
        ticket_channel_limit_reached: text('This server has reached its channel limit. Choose an existing channel.', 'Este servidor atingiu o limite de canais. Escolhe um canal existente.'),
        ticket_everyone_administrator: text('Remove Administrator from @everyone before creating a read-only channel.', 'Remove Administrador de @everyone antes de criar um canal apenas de leitura.'),
        discord_context_unavailable: text('Refresh Discord resources before trying again.', 'Atualiza os recursos Discord antes de tentar novamente.'),
        unauthenticated: text('Your session expired. Sign in again before creating a channel.', 'A tua sessão expirou. Inicia sessão antes de criar um canal.'),
        csrf_origin_invalid: text('Reload the panel before creating a channel.', 'Recarrega o painel antes de criar um canal.'),
      };
      setError(errors[code] ?? text('Creation could not be confirmed. Check Discord before retrying to avoid duplicates. The selected channel was not changed.', 'Não foi possível confirmar a criação. Verifica o Discord antes de repetir para evitar duplicados. O canal selecionado não foi alterado.'));
    } finally {
      submitting.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return <section className="starboard-channel ticket-panel-channel" aria-label={text('Create a ticket panel channel', 'Criar canal para o painel de tickets')}>
    <div className="starboard-channel__heading">
      <h4>{text('Need a channel for the ticket panel?', 'Precisas de um canal para o painel de tickets?')}</h4>
      {!created && <button type="button" className="primary" disabled={busy || !allowed || !validStarboardName(name)} onClick={() => void create()}>
        {busy ? text('Creating channel…', 'A criar canal…') : text('Create ticket panel channel', 'Criar canal para tickets')}
      </button>}
    </div>
    <p>{text('Optional: create a public, read-only channel for the Open ticket button. Members can click the panel; only Helper and administrators can post. Private tickets still use the category selected below.', 'Opcional: cria um canal público de leitura para o botão Open ticket. Os membros podem clicar no painel; só o Helper e os administradores podem publicar. Os tickets privados continuam na categoria selecionada abaixo.')}</p>
    <label className="field"><span><b>{text('New panel channel name', 'Nome do novo canal do painel')}</b></span>
      <input value={name} maxLength={80} disabled={busy || !!created} onChange={event => setName(event.target.value)} aria-invalid={!validStarboardName(name)} />
      {!validStarboardName(name) && <small>{text('Use 2–80 letters, numbers, hyphens or underscores.', 'Usa 2–80 letras, números, hífenes ou underscores.')}</small>}
    </label>
    {!allowed && <p role="status">{text('Refresh Discord resources and check the Helper channel, role, messaging and thread permissions. Administrator is not required.', 'Atualiza os recursos Discord e verifica as permissões de canais, cargos, mensagens e threads do Helper. Não precisa de Administrador.')}</p>}
    {error && <p className="starboard-channel__error" role="alert">{error}</p>}
    {created && <p className="starboard-channel__success" role="status">{text(`#${created} is ready and selected. Check automatic saving above. Enabling Tickets publishes the Open ticket panel; creating the channel does not enable the feature.`, `#${created} está pronto e selecionado. Verifica a gravação automática acima. Ativar Tickets publica o painel Open ticket; criar o canal não ativa a feature.`)}</p>}
  </section>;
}

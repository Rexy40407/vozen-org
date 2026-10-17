import { useEffect, useRef, useState } from 'react';
import { api, type GuildContext } from './api';
import { helperLocale } from './i18n';
import { canCreateStarboard, validStarboardName } from './starboard-channel';
import { canCreateTicketCategory } from './ticket-category';
import './starboard-channel.css';

export function TicketPanelChannel({context, onCreated, category = false}: {
  context: GuildContext | null;
  category?: boolean;
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
  const allowed = category ? canCreateTicketCategory(context) : canCreateStarboard(context);
  async function create() {
    if (!context || !allowed || !validStarboardName(name) || submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const result = await (category ? api.createTicketCategory : api.createTicketPanelChannel)(name.trim().toLowerCase());
      if (!alive.current) return;
      if (result.guildId !== context.guildId || result.channel.type !== (category ? 4 : 0) || !result.channel.id || !result.channel.name) throw new Error('ticket_response_invalid');
      onCreated({id:result.channel.id, name:result.channel.name, type:category ? 'category' : 'text'});
      setCreated(result.channel.name);
    } catch (cause) {
      if (!alive.current) return;
      const code = cause instanceof Error ? cause.message : '';
      if (category) {
        const messages: Record<string,string> = {
          ticket_category_channel_name_exists: text('A category with this name already exists. Select it above or choose another name; it was not changed.', 'Já existe uma categoria com este nome. Seleciona-a acima ou escolhe outro nome; não foi alterada.'),
          ticket_category_existing_channel_changed: text('The previously created category changed in Discord. Check it and select it above; it was not modified.', 'A categoria criada anteriormente foi alterada no Discord. Verifica-a e seleciona-a acima; não foi modificada.'),
          ticket_category_bot_permissions_required: text('Helper needs Manage Channels, Manage Roles, View Channel, Send Messages and Read Message History.', 'O Helper precisa de gerir canais e cargos, ver canais, enviar mensagens e ler o histórico.'),
          ticket_category_user_manage_channels_required: text('Your account needs Manage Server and Manage Channels, or Administrator.', 'A tua conta precisa de gerir servidor e canais, ou de Administrador.'),
          ticket_category_everyone_administrator: text('Remove Administrator from @everyone before creating a private category.', 'Remove Administrador de @everyone antes de criar uma categoria privada.'),
          ticket_category_creation_busy: text('Another resource is being created. Wait before retrying.', 'Está a ser criado outro recurso. Aguarda antes de repetir.'),
          ticket_category_creation_rate_limited: text('Discord is limiting creation. Wait before retrying.', 'O Discord está a limitar a criação. Aguarda antes de repetir.'),
          ticket_category_channel_limit_reached: text('The server reached its channel limit. Select an existing category.', 'O servidor atingiu o limite de canais. Seleciona uma categoria existente.'),
          unauthenticated: text('Your session expired. Sign in again.', 'A sessão expirou. Inicia sessão novamente.'),
          discord_context_unavailable: text('Refresh Discord resources before retrying.', 'Atualiza os recursos Discord antes de repetir.'),
        };
        setError(messages[code] ?? text('Creation could not be confirmed. Check Discord before retrying to avoid duplicates. The selected category was not changed.', 'Não foi possível confirmar a criação. Verifica o Discord antes de repetir para evitar duplicados. A categoria selecionada não foi alterada.'));
        return;
      }
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
  return <section className={`starboard-channel ${category ? 'ticket-category-create' : 'ticket-panel-channel'}`} aria-label={category ? text('Create a private ticket category', 'Criar categoria para tickets privados') : text('Create a ticket panel channel', 'Criar canal para o painel de tickets')}>
    {!created && <div className="ticket-channel-create__row">
    <label className="field"><span><b>{category ? text('Or create a category', 'Ou cria uma categoria') : text('Or create a new channel', 'Ou cria um canal novo')}</b></span>
      <input value={name} maxLength={80} disabled={busy} onChange={event => setName(event.target.value)} aria-invalid={!validStarboardName(name)} />
      {!validStarboardName(name) && <small>{text('Use 2–80 letters, numbers, hyphens or underscores.', 'Usa 2–80 letras, números, hífenes ou underscores.')}</small>}
    </label>
      <button type="button" className="secondary" disabled={busy || !allowed || !validStarboardName(name)} onClick={() => void create()}>
        {category ? (busy ? text('Creating category…', 'A criar categoria…') : text('Create category', 'Criar categoria')) : busy ? text('Creating channel…', 'A criar canal…') : text('Create ticket panel channel', 'Criar canal para tickets')}
      </button>
    </div>}
    {!created && <p>{category ? text('Creates a private category. Each ticket keeps access for its author and support team.', 'Cria uma categoria privada. Cada ticket mantém o acesso do autor e da equipa.') : text('New channels are read-only for members. Helper and administrators can post.', 'Os novos canais são de leitura para membros. O Helper e os administradores podem publicar.')}</p>}
    {!allowed && <p role="status">{category ? text('Refresh Discord resources and check Helper channel, role and messaging permissions.', 'Atualiza os recursos Discord e verifica as permissões de canais, cargos e mensagens do Helper.') : text('Refresh Discord resources and check the Helper channel, role, messaging and thread permissions. Administrator is not required.', 'Atualiza os recursos Discord e verifica as permissões de canais, cargos, mensagens e threads do Helper. Não precisa de Administrador.')}</p>}
    {error && <p className="starboard-channel__error" role="alert">{error}</p>}
    {created && <p className="starboard-channel__success" role="status">{category ? text(`${created} is ready and selected. Check automatic saving above.`, `${created} está pronta e selecionada. Verifica a gravação automática acima.`) : text(`#${created} is ready and selected. Check automatic saving above. Tickets must be enabled to publish the panel.`, `#${created} está pronto e selecionado. Verifica a gravação automática acima. Ativa Tickets para publicar o painel.`)}</p>}
  </section>;
}

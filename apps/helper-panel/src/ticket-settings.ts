// Presentation only: keep the API keys, values and validation rules intact.
export function ticketSettingsGroups(locale: string) {
  const pt = locale === 'pt';
  return [
    { title: pt ? 'Onde abrir um ticket' : 'Where members open tickets', description: pt ? 'O canal público com o botão Open ticket.' : 'The public channel with the Open ticket button.', keys: ['panelChannel'] },
    { title: pt ? 'Atendimento e registos' : 'Support and records', description: pt ? 'Define quem atende e onde ficam os pedidos privados.' : 'Choose who handles requests and where private tickets go.', keys: ['categoryId','staffRole','maxOpen','transcriptChannel','closeAfterHours'] },
    { title: pt ? 'Mensagem do painel' : 'Panel message', description: pt ? 'O texto que os membros veem antes de abrir um ticket.' : 'What members see before opening a ticket.', keys: ['panelTitle','panelDescription'] },
  ];
}

export function ticketSettingCopy<T extends {key:string;label:string;help?:string}>(field:T, locale:string): T & {help?:string} {
  const pt = locale === 'pt';
  const copy: Record<string, [string,string]> = pt ? {
    panelChannel: ['Canal do painel', 'Escolhe um canal existente ou cria um abaixo.'],
    categoryId: ['Categoria dos tickets privados', 'Os novos pedidos ficam nesta categoria.'],
    staffRole: ['Equipa de suporte', 'Recebe avisos e pode gerir tickets. Permite mencionar o cargo ou dá essa permissão ao Helper. As preferências de notificação do Discord continuam a aplicar-se.'],
    maxOpen: ['Tickets abertos por membro', 'Quantos pedidos uma pessoa pode ter em simultâneo.'],
    transcriptChannel: ['Canal dos registos (opcional)', 'Recebe o histórico dos tickets fechados.'],
    closeAfterHours: ['Lembrete para a equipa (horas)', 'Envia um aviso se ninguém assumir o pedido neste prazo. Não fecha o ticket.'],
    panelTitle: ['Título', ''], panelDescription: ['Descrição', ''],
  } : {
    panelChannel: ['Panel channel', 'Choose an existing channel or create one below.'],
    categoryId: ['Private ticket category', 'New requests are created in this category.'],
    staffRole: ['Support team', 'Notified when a ticket opens and can manage requests. Make the role mentionable or allow Helper to mention roles. Discord notification preferences still apply.'],
    maxOpen: ['Open tickets per member', 'How many requests one person can have at a time.'],
    transcriptChannel: ['Records channel (optional)', 'Receives the history of closed tickets.'],
    closeAfterHours: ['Support reminder (hours)', 'Sends a reminder if nobody claims the request in this time. It does not close the ticket.'],
    panelTitle: ['Title', ''], panelDescription: ['Description', ''],
  };
  const value = copy[field.key];
  return value ? {...field, label:value[0], help:value[1] || undefined} : field;
}

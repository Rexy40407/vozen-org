type DemoCopy = { title: string; example: string; steps: [string, string, string] };
const demos = new Map<string, { asset: string; en: DemoCopy; pt: DemoCopy }>([
  ['community.starboard', {
    asset: 'starboard',
    en: { title: 'How Starboard works · looping animation', example: 'Illustrative example: a message receives 3 stars and is copied to #starboard. The animation uses sample data, not your server settings.', steps: ['1. A member posts a message in a channel the bot can read.', '2. Other members add the configured highlight reaction.', '3. At the required count, Helper creates or updates its mirror in the selected Starboard channel.'] },
    pt: { title: 'Como funciona o Starboard · animação em loop', example: 'Exemplo ilustrativo: uma mensagem recebe 3 estrelas e é copiada para #starboard. A animação usa dados de exemplo, não as definições do teu servidor.', steps: ['1. Um membro publica uma mensagem num canal que o bot consegue ler.', '2. Outros membros adicionam a reação de destaque configurada.', '3. Ao atingir a contagem necessária, o Helper cria ou atualiza o destaque no canal Starboard selecionado.'] },
  }],
  ['community.suggestions', {
    asset: 'suggestions',
    en: { title: 'How Suggestions works · looping animation', example: 'Illustrative example: a member submits /suggest, the community votes Support / Against, and a moderator approves it with /suggestion. Sample data, not your server settings.', steps: ['1. A member submits an idea with /suggest; Helper posts it in the selected suggestions channel.', '2. Members vote using Support / Against (or Support only, depending on your settings).', '3. A moderator uses /suggestion to approve, reject or mark the idea as considered. The public status is updated.'] },
    pt: { title: 'Como funcionam as Sugestões · animação em loop', example: 'Exemplo ilustrativo: um membro usa /suggest, a comunidade vota a favor ou contra e um moderador aprova com /suggestion. Dados de exemplo, não as definições do teu servidor.', steps: ['1. Um membro envia uma ideia com /suggest; o Helper publica-a no canal de sugestões selecionado.', '2. Os membros votam nos botões a favor ou contra (ou só a favor, conforme as definições).', '3. Um moderador usa /suggestion para aprovar, rejeitar ou marcar a ideia como considerada. O estado público é atualizado.'] },
  }],
  ['community.giveaways', {
    asset: 'giveaways',
    en: { title: 'How Giveaways work · looping animation', example: 'Illustrative example: a moderator creates a giveaway, eligible members click Join, and Helper draws the winner when it ends. Sample data and accelerated time, not a real giveaway or your server settings.', steps: ['1. A moderator uses /giveaway-start with a prize, duration and number of winners.', '2. Eligible members click Join on the giveaway message. Any configured required role is checked.', '3. When the duration ends (or staff use /giveaway-end), Helper draws from the eligible entrants and publishes the result.'] },
    pt: { title: 'Como funcionam os Sorteios · animação em loop', example: 'Exemplo ilustrativo: um moderador cria um sorteio, os membros elegíveis clicam em Join e o Helper sorteia o vencedor no fim. Dados de exemplo e tempo acelerado, não um sorteio real nem as definições do teu servidor.', steps: ['1. Um moderador usa /giveaway-start com um prémio, uma duração e o número de vencedores.', '2. Os membros elegíveis clicam em Join na mensagem do sorteio. O cargo obrigatório, se configurado, é verificado.', '3. Quando o prazo termina (ou a equipa usa /giveaway-end), o Helper sorteia entre os participantes elegíveis e publica o resultado.'] },
  }],
  ['support.tickets', {
    asset: 'tickets',
    en: { title: 'How Tickets work · looping animation', example: 'Illustrative example: a member opens a support ticket, Helper creates a private channel, and the support team handles the request. Sample data, not your server settings; no channels are created by this animation.', steps: ['1. A member clicks Open ticket on the support panel published in the configured channel.', '2. Helper creates a private channel for the member, Helper and the configured support role. Administrators retain their Discord access.', '3. A support team member uses Claim to take the request, then Close when resolved. Closing behaviour follows your settings.'] },
    pt: { title: 'Como funcionam os Tickets · animação em loop', example: 'Exemplo ilustrativo: um membro abre um ticket, o Helper cria um canal privado e a equipa de suporte trata do pedido. Dados de exemplo, não as definições do teu servidor; esta animação não cria canais.', steps: ['1. Um membro clica em Open ticket no painel de suporte publicado no canal configurado.', '2. O Helper cria um canal privado para o membro, o Helper e o cargo de suporte configurado. Os administradores mantêm o acesso do Discord.', '3. Um membro da equipa usa Claim para assumir o pedido e Close quando estiver resolvido. O comportamento ao fechar segue as tuas definições.'] },
  }],
]);

export function featureDemo(key: string, locale: string): (DemoCopy & { asset: string }) | null {
  const demo = demos.get(key);
  const language = locale === 'pt' ? 'pt' : 'en';
  return demo ? { ...demo[language], asset: `${demo.asset}-${language}` } : null;
}

type DemoCopy = { title: string; example: string; steps: [string, string, string] };
const demos = new Map<string, { asset: string; en: DemoCopy; pt: DemoCopy }>([
  ['community.starboard', {
    asset: 'starboard',
    en: { title: 'How Starboard works · 10-second video', example: 'Illustrative example: a message receives 3 stars and is copied to #starboard. The video uses sample data, not your server settings.', steps: ['1. A member posts a message in a channel the bot can read.', '2. Other members add the configured highlight reaction.', '3. At the required count, Helper creates or updates its mirror in the selected Starboard channel.'] },
    pt: { title: 'Como funciona o Starboard · vídeo de 10 segundos', example: 'Exemplo ilustrativo: uma mensagem recebe 3 estrelas e é copiada para #starboard. O vídeo usa dados de exemplo, não as definições do teu servidor.', steps: ['1. Um membro publica uma mensagem num canal que o bot consegue ler.', '2. Outros membros adicionam a reação de destaque configurada.', '3. Ao atingir a contagem necessária, o Helper cria ou atualiza o destaque no canal Starboard selecionado.'] },
  }],
  ['community.suggestions', {
    asset: 'suggestions',
    en: { title: 'How Suggestions works · 10-second video', example: 'Illustrative example: a member submits /suggest, the community votes Support / Against, and a moderator approves it with /suggestion. Sample data, not your server settings.', steps: ['1. A member submits an idea with /suggest; Helper posts it in the selected suggestions channel.', '2. Members vote using Support / Against (or Support only, depending on your settings).', '3. A moderator uses /suggestion to approve, reject or mark the idea as considered. The public status is updated.'] },
    pt: { title: 'Como funcionam as Sugestões · vídeo de 10 segundos', example: 'Exemplo ilustrativo: um membro usa /suggest, a comunidade vota a favor ou contra e um moderador aprova com /suggestion. Dados de exemplo, não as definições do teu servidor.', steps: ['1. Um membro envia uma ideia com /suggest; o Helper publica-a no canal de sugestões selecionado.', '2. Os membros votam nos botões a favor ou contra (ou só a favor, conforme as definições).', '3. Um moderador usa /suggestion para aprovar, rejeitar ou marcar a ideia como considerada. O estado público é atualizado.'] },
  }],
]);

export function featureDemo(key: string, locale: string): (DemoCopy & { asset: string }) | null {
  const demo = demos.get(key);
  const language = locale === 'pt' ? 'pt' : 'en';
  return demo ? { ...demo[language], asset: `${demo.asset}-${language}` } : null;
}

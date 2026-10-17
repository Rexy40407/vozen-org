import { describe, expect, it } from 'vitest';
import { ticketSettingsGroups, ticketSettingCopy } from './ticket-settings';
describe('clear ticket settings', () => {
  it('groups every current setting once without hiding any options', () => {
    const keys = ticketSettingsGroups('en').flatMap(group => group.keys);
    expect(keys).toEqual(['panelChannel','categoryId','staffRole','maxOpen','transcriptChannel','closeAfterHours','panelTitle','panelDescription']);
    expect(new Set(keys).size).toBe(8);
    expect(ticketSettingsGroups('pt')).toHaveLength(3);
  });
  it('describes the actual reminder instead of promising automatic closure', () => {
    const field = {key:'closeAfterHours',label:'Close after inactivity (hours)',kind:'number',min:1,max:168};
    const copy = ticketSettingCopy(field,'en');
    expect(copy.label).toBe('Support reminder (hours)');
    expect(copy.help).toContain('does not close');
    expect(copy.key).toBe(field.key);
    expect(copy.min).toBe(1);
    expect(copy.max).toBe(168);
    expect(ticketSettingCopy(field,'pt').label).toBe('Lembrete para a equipa (horas)');
  });
  it('keeps unknown future fields and uses English for other locales', () => {
    const field = {key:'future',label:'Future',help:'Keep this',kind:'text'};
    expect(ticketSettingCopy(field,'pt')).toEqual(field);
    expect(ticketSettingsGroups('fr')).toEqual(ticketSettingsGroups('en'));
  });
  it('localizes the known fields without changing the input model', () => {
    for (const locale of ['en','pt']) {
      for (const key of ticketSettingsGroups(locale).flatMap(group => group.keys)) {
        const field = {key,label:'Original',help:'Original help',kind:'text'};
        const copy = ticketSettingCopy(field, locale);
        expect(copy.label).not.toBe('Original');
        expect(copy.kind).toBe('text');
        expect(field.label).toBe('Original');
      }
    }
  });
});

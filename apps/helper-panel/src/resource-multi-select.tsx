import { helperLocale } from './i18n';
import './resource-multi-select.css';
import { toggleResource } from './resource-selection';

export type ResourceChoice = {id:string;label:string;disabled?:boolean};

export function ResourceMultiSelect({label,help,options,value,disabled,onChange}: {
  label:string;help?:string;options:ResourceChoice[];value:string[];disabled?:boolean;
  onChange:(value:string[])=>void;
}) {
  const pt = helperLocale() === 'pt';
  const choices: ResourceChoice[] = [...options,...value.filter(id => !options.some(option => option.id === id))
    .map(id => ({id,label:`${pt ? 'Recurso indisponível' : 'Unavailable resource'} (${id})`}))];
  return <fieldset className="resource-multi field" disabled={disabled}>
    <legend>{label}</legend>
    {help && <p className="resource-multi__help">{help}</p>}
    <small>{pt ? 'Marca todas as opções que quiseres.' : 'Tick as many options as you need.'} · {value.length} {pt ? 'selecionadas' : 'selected'}</small>
    <div className="resource-multi__choices">
      {choices.map(option => <label className="resource-multi__choice" key={option.id}>
        <input type="checkbox" checked={value.includes(option.id)} disabled={option.disabled}
          onChange={event => onChange(toggleResource(value,option.id,event.target.checked))} />
        <span>{option.label}</span>
      </label>)}
      {!choices.length && <p>{pt ? 'Não há opções disponíveis.' : 'No options available.'}</p>}
    </div>
  </fieldset>;
}

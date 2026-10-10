import {describe,expect,it} from 'vitest';
import {toggleResource} from './resource-selection';

describe('resource checkbox selection',()=>{
  it('adds independent choices without modifier keys or duplicates',()=>{
    let selected = toggleResource([],'one',true);
    selected = toggleResource(selected,'two',true);
    expect(toggleResource(selected,'two',true)).toEqual(['one','two']);
    expect(toggleResource(selected,'one',false)).toEqual(['two']);
  });
  it('keeps unavailable saved choices until explicitly removed',()=>{
    expect(toggleResource(['missing'],'new',true)).toEqual(['missing','new']);
    expect(toggleResource(['missing','new'],'missing',false)).toEqual(['new']);
  });
});

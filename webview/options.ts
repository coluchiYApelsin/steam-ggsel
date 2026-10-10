export type Variant={id:string;label:string;default:boolean;available:boolean;stock?:number};
export type ProductOption={id:string;name:string;label:string;type:'radio'|'select'|'checkbox'|'text'|'textarea';required:boolean;variants:Variant[]};
export type Selection=Record<string,string[]>;
export function productOptions(raw:unknown):ProductOption[]{
 if(!Array.isArray(raw)||raw.length>20)throw new Error('unsupported_options');
 const ids=new Set<string>();return raw.filter(o=>!o.hidden).map(o=>{
  const id=String(o.id);if(!/^\d{1,12}$/.test(id)||ids.has(id)||!['radio','select','checkbox','text','textarea'].includes(o.type)||typeof o.name!=='string'||!new RegExp(`^option_${o.type}_${id}$`).test(o.name)||typeof o.label!=='string')throw new Error('unsupported_options');ids.add(id);
  if(/password|парол|access.token|auth.token|secret|секрет/i.test(o.label))throw new Error('sensitive_option');
  const variants:Variant[]=Array.isArray(o.variants)?o.variants.map((v:any)=>{if(!/^\d{1,12}$/.test(String(v.value))||typeof v.text!=='string')throw new Error('unsupported_options');return {id:String(v.value),label:v.text,default:!!v.default,available:!v.disabled&&v.visible!==0&&v.num_in_stock!==0,stock:typeof v.num_in_stock==='number'?v.num_in_stock:undefined};}):[];
  if(['radio','select','checkbox'].includes(o.type)&&!variants.length)throw new Error('unsupported_options');
  return{id,name:o.name,label:o.label,type:o.type,required:!!o.required,variants};
 });
}
export function defaultSelection(options:ProductOption[],saved?:Selection):Selection{
 const result:Selection={};for(const o of options){const old=saved?.[o.id];result[o.id]=old?.filter(v=>!o.variants.length||o.variants.some(x=>x.id===v&&x.available))??o.variants.filter(v=>v.default&&v.available).map(v=>v.id);if(o.type!=='checkbox')result[o.id]=result[o.id]!.slice(0,1);}return result;
}
export function validateSelection(options:ProductOption[],selection:Selection):string|null{
 for(const o of options){const values=selection[o.id]??[];if(o.required&&(!values.length||values.some(v=>!v.trim())))return `Заполните: ${o.label}`;if(o.type!=='checkbox'&&values.length>1)return 'Несовместимые параметры';if(o.variants.length&&values.some(v=>!o.variants.some(x=>x.id===v&&x.available)))return `Вариант недоступен: ${o.label}`;if(values.some(v=>v.length>500))return 'Параметр слишком длинный';}return null;
}
export function priceSelection(options:ProductOption[],selection:Selection):Record<string,string>{
 const result:Record<string,string>={};for(const o of options)if(o.variants.length&&selection[o.id]?.length)result[o.id]=selection[o.id]!.join(',');return result;
}
export function decodeQuote(raw:unknown):{amount:number;fetchedAt:number}{
 const r:any=typeof raw==='string'?JSON.parse(raw):raw;if(r?.status!=='ok')throw new Error(r?.status??'invalid_response');
 if(r.data?.success!==true)throw new Error('combination_unavailable');const d=r.data?.data;
 if(!d||typeof d.amount!=='number'||!Number.isFinite(d.amount)||d.amount<=0||d.count!==1||typeof r.fetched_at!=='number')throw new Error('invalid_price_response');
 return {amount:d.amount,fetchedAt:r.fetched_at};
}
export function selectionSummary(options:ProductOption[],selection:Selection):string{return options.map(o=>`${o.label}: ${(selection[o.id]??[]).map(id=>o.variants.find(v=>v.id===id)?.label??id).join(', ')||'не выбрано'}`).join('\n');}
// Observed GGSEL product-page codec. Free text is intentionally not placed in URLs.
export function selectionProductUrl(url:string,options:ProductOption[],selection:Selection):{url:string;complete:boolean}{
 const u=new URL(url);const parts:string[]=[];let complete=true;
 for(const o of options){const values=selection[o.id]??[];if(!values.length)continue;if(!o.variants.length||values.length!==1){complete=false;continue;}parts.push(`${o.name}_${values[0]}`);}
 if(parts.length)u.searchParams.set('option',parts.join('_'));
 return {url:u.href,complete};
}

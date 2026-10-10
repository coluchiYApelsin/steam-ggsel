export class GgselError extends Error {
 constructor(code:string,readonly httpStatus?:number){super(code);this.name='GgselError';}
}
export function responseError(raw:any,fallback='invalid_response'):GgselError{
 const code=typeof raw?.status==='string'?raw.status:fallback;
 const status=Number.isInteger(raw?.http_status)&&raw.http_status>=100&&raw.http_status<=599?raw.http_status:undefined;
 return new GgselError(code,status);
}
export function diagnosticSuffix(error:unknown):string{
 const code=error instanceof Error?error.message:'invalid_response';
 // Only internal identifiers; never display arbitrary server bodies or user input.
 return /^[a-z][a-z0-9_]{0,63}$/.test(code)?` (${code}${error instanceof GgselError&&error.httpStatus!==undefined?`; HTTP ${error.httpStatus}`:''})`:'';
}

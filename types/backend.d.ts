// Starlight injects the implementation from the Lua @ffi annotation.
declare const backend: {
 getGgselOffers(appid: string, title: string): Promise<unknown>;
 getGgselProduct(id:string,slug:string):Promise<unknown>;
 setMerchantContext(appid:string,scroll:number):Promise<boolean>;
 getMerchantContext():Promise<unknown>;
};

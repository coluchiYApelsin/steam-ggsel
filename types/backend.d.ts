// Starlight injects the implementation from the Lua @ffi annotation.
declare const backend: {
 getGgselOffers(appid: string, title: string): Promise<unknown>;
 getGgselProduct(id:string,slug:string):Promise<unknown>;
 getGgselProductFresh(id:string,slug:string):Promise<unknown>;
 getGgselCatalog(appid:string,title:string,catalog:string,refresh:boolean):Promise<unknown>;
 searchGgselCatalogs(query:string):Promise<unknown>;
 getGgselPrice(id:string,selection:string):Promise<unknown>;
 getGgselReviews(id:string):Promise<unknown>;
};

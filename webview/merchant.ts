export function isProductUrl(value:string):boolean {
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='ggsel.net'&&!u.port&&!u.username&&!u.password&&!u.search&&!u.hash&&/^\/(?:en\/)?catalog\/product\/[a-z0-9-]+-\d+$/.test(u.pathname);}catch{return false;}
}

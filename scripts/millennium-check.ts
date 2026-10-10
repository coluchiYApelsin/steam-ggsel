import {dlopen} from 'bun:ffi';
import {encode,decode} from '@msgpack/msgpack';
import {join} from 'node:path';
export function mep(method:string,params:Record<string,unknown>={}) {
 const w=dlopen('ws2_32.dll',{
 WSAStartup:{args:['u16','ptr'],returns:'i32'},WSACleanup:{args:[],returns:'i32'},
 socket:{args:['i32','i32','i32'],returns:'usize'},connect:{args:['usize','ptr','i32'],returns:'i32'},
 send:{args:['usize','ptr','i32','i32'],returns:'i32'},recv:{args:['usize','ptr','i32','i32'],returns:'i32'},
 setsockopt:{args:['usize','i32','i32','ptr','i32'],returns:'i32'},closesocket:{args:['usize'],returns:'i32'},WSAGetLastError:{args:[],returns:'i32'}});
 const data=Buffer.alloc(512);if(w.symbols.WSAStartup(0x202,data)!==0)throw new Error('WSAStartup');
 const socket=w.symbols.socket(1,1,0);
 try {
  const addr=Buffer.alloc(110);addr.writeUInt16LE(1);const path=join(process.env.TEMP!,'millennium-mep.sock');if(Buffer.byteLength(path)>107)throw new Error('Socket path too long');addr.write(path,2,'utf8');
  if(w.symbols.connect(socket,addr,addr.length)!==0)throw new Error(`MEP connect: ${w.symbols.WSAGetLastError()}`);
  const timeout=Buffer.alloc(4);timeout.writeUInt32LE(5000);w.symbols.setsockopt(socket,0xffff,0x1006,timeout,4);
  const payload=Buffer.from(encode({id:'steam-ggsel-check',method,params}));const length=Buffer.alloc(4);length.writeUInt32LE(payload.length);const frame=Buffer.concat([length,payload]);
  let sent=0;while(sent<frame.length){const n=w.symbols.send(socket,frame.subarray(sent),frame.length-sent,0);if(n<=0)throw new Error('MEP send failed');sent+=n;}
  function read(size:number){const buffer=Buffer.alloc(size);let got=0;while(got<size){const n=w.symbols.recv(socket,buffer.subarray(got),size-got,0);if(n<=0)throw new Error(`MEP receive: ${w.symbols.WSAGetLastError()}`);got+=n;}return buffer;}
  const size=read(4).readUInt32LE();if(size>64000000)throw new Error('Invalid MEP frame');return decode(read(size));
 } finally {w.symbols.closesocket(socket);w.symbols.WSACleanup();w.close();}
}
if(import.meta.main) {
 const argument=process.argv[3];
 const params=argument ? (argument.startsWith('{') ? JSON.parse(argument) : {name:argument}) : {};
 console.log(JSON.stringify(mep(process.argv[2]??'millennium.status',params),null,2));
}

/* SPDX-License-Identifier: GPL-3.0-only
 * EXS Web Flasher (C) 2026 Exsiderurgica Instruments
 * Adapted from the FM-1 WebMIDI updater + package format by Leo Kuroshita,
 * Hügelton Instruments: https://github.com/hugelton/Felucca
 * Felucca original (C) 2026 Leo Kuroshita, GPL-3.0-only.
 * The project is distributed under GPL-3.0-only. See LICENSE.txt.
 */
(function (root) {
  'use strict';
  const BLOCKS=20, BLK=0x30, KEEP=0x2f;
  const HS_QUERY=[0xF0,0x00,0x32,0x45,0x00,0x00,0x00,0x40,0x7f,0xf7];
  const UPGRADE=[0xF0,0x22,0x24,0x35,0x7f,0xf7];
  const MAXDATA=512;
  /* Firmware MT4 v0.17 has FELUCCA_OTA=0. This public version deliberately
   * refuses UPDATE and RESUME until a compatible firmware and safe USB path
   * have been tested on real Nothing + FM1 hardware. */
  const FLASH_PROVISIONED=false;
  const sleep=ms=>new Promise(res=>setTimeout(res,ms));
  const known={
    'bd85133c8727c7ecac903b2148659e1b22b42e876624e413d9c118ffd6e1571b': {label:'EXS MT4 v0.17 — ultima stabile dichiarata',version:'0.17'},
    '661aecbf23a0d013427cf2a031efa076b1a959daeb9a624fbb036c73eda91c23': {label:'EXS MT1 v0.14 — stabile precedente',version:'0.14'}
  };
  // v0.14 expected hash overwritten only after independently verifying actual bytes;
  // the code must never enable an unverified image simply because the title matches.
  function crc16(bytes, seed=0){let c=seed;for(const b of bytes){c^=b<<8;for(let k=0;k<8;k++)c=(c&0x8000)?((c<<1)^0x1021)&0xffff:(c<<1)&0xffff;}return c;}
  const u16=(b,o)=>b[o]|b[o+1]<<8;
  const u32=(b,o)=>(b[o]|b[o+1]<<8|b[o+2]<<16|b[o+3]<<24)>>>0;
  function xorHeader(b,start,n,key=0xffff){for(let i=0;i<n;i++){b[start+i]^=key&255;key=((key*2)^(key&0x8000?0x1021:0))&65535;}}
  function productOf(b){if(b.length<BLOCKS*BLK)throw Error('Pacchetto troppo piccolo');let x='';for(let i=0;i<BLOCKS;i++){const a=b[i*BLK+KEEP];if(a!==0x7d)x+=String.fromCharCode((a-i-1)&255);}return x;}
  function logicalImage(b){if(b.length<BLOCKS*BLK)throw Error('Pacchetto troppo piccolo');const out=new Uint8Array(b.length-BLOCKS);for(let i=0;i<BLOCKS;i++)out.set(b.subarray(i*BLK,i*BLK+KEEP),i*KEEP);out.set(b.subarray(BLOCKS*BLK),BLOCKS*KEEP);return out;}
  function inspect(b){
    if(!(b instanceof Uint8Array)||b.length!==609912)throw Error('Dimensione non prevista: è necessario un file .fwsc MT4 supportato da 609912 byte.');
    const product=productOf(b);
    if(product!=='FM-1_986')throw Error('Pacchetto non compatibile: '+product+' (richiesto FM-1_986).');
    let h=new Uint8Array(BLOCKS*KEEP);
    for(let i=0;i<BLOCKS;i++)h.set(b.subarray(i*BLK,i*BLK+KEEP),i*KEEP);
    xorHeader(h,0,64);
    if(crc16(h.subarray(2,64))!==u16(h,0))throw Error('CRC intestazione firmware non valido.');
    const n=u16(h,8),end=64+n*80;
    if(!n||n>8||end>h.length)throw Error('Numero di sezioni UFW non valido.');
    if(crc16(h.subarray(64,end))!==u16(h,2))throw Error('CRC elenco UFW non valido.');
    let flash=null;
    for(let i=0;i<n;i++){
      const ent=h.slice(64+i*80,64+(i+1)*80);xorHeader(ent,0,80);
      if(u16(ent,0)===0){flash={offset:u32(ent,8)+(BLOCKS*BLK-BLOCKS*KEEP),length:u32(ent,12),crc:u16(ent,4)};break;}
    }
    if(!flash||flash.length<300000||flash.offset<960||flash.offset+flash.length>b.length)throw Error('Regione flash.bin mancante o fuori dai limiti.');
    if(crc16(b.subarray(flash.offset,flash.offset+flash.length))!==flash.crc)throw Error('CRC interno flash.bin non valido.');
    return {product,flash};
  }
  async function sha256(b){const x=await crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(x),v=>v.toString(16).padStart(2,'0')).join('');}
  async function validatePackage(bytes){
    const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
    const meta=inspect(b);const digest=await sha256(b);
    const entry=known[digest];
    if(!entry)throw Error('Firmware non autorizzato: SHA-256 non presente nel catalogo EXS verificato. Nessuna scrittura consentita.');
    return {bytes:b,logical:logicalImage(b),sha256:digest,product:meta.product,label:entry.label,version:entry.version,flash:meta.flash};
  }
  function pack7(b){const out=[];let acc=0,nb=0;for(const v of b){acc|=v<<nb;nb+=8;while(nb>=7){out.push(acc&127);acc>>>=7;nb-=7;}}if(nb)out.push(acc&127);return out;}
  function unpack7(b){const out=[];let acc=0,nb=0;for(const v of b){acc|=(v&127)<<nb;nb+=7;while(nb>=8){out.push(acc&255);acc>>>=8;nb-=8;}}return out;}
  function parseIdentity(data){if(data[0]!==0xf0||data[data.length-1]!==0xf7)return null;const d=unpack7(data.slice(1,-1));if(d.length!==34||d[0]!==0||d[1]!==0x59||d[2]!==0x11)return null;const name=String.fromCharCode(...d.slice(6,33)).replace(/\0+$/,'');const v=/^([^_]+)_(\d+)$/.exec(name);return v?{text:name,model:v[1],version:Number(v[2])}:null;}
  function parseRequest(p){if(p[0]!==0xf0||p[p.length-1]!==0xf7)return null;const u=unpack7(p.slice(1,-1));if(u.length!==15||u[0]!==0||u[1]!==0x59||u[2]!==0x30)return null;let sum=0;for(let i=6;i<14;i++)sum+=u[i];if((~sum&255)!==u[14])return null;return {fl:u[6],addr:u32(u,7),len:u[11]|u[12]<<8|u[13]<<16};}
  function response(addr,data,fl=0){const n=data.length;const t=[0,0x59,0x30,(n+8)&255,(n+8)>>8,0,fl,addr&255,(addr>>>8)&255,(addr>>>16)&255,(addr>>>24)&255,n&255,n>>8,0,...data];let sum=0;for(let i=6;i<t.length;i++)sum+=t[i];t.push(~sum&255);return [0xf0,...pack7(t),0xf7];}
  class Link{
    constructor(input,output){this.input=input;this.output=output;this.q=[];this.waiter=null;input.onmidimessage=ev=>{if(ev.data[0]!==0xf0)return;this.q.push(Array.from(ev.data));if(this.waiter){const w=this.waiter;this.waiter=null;w();}};}
    get lost(){return this.input.state==='disconnected'||this.output.state==='disconnected';}
    send(x){try{this.output.send(x);return true;}catch(_){return false;}}
    drain(){this.q.length=0;}
    async read(ms){if(!this.q.length){let timer;await Promise.race([new Promise(r=>{this.waiter=r;}),new Promise(r=>{timer=setTimeout(r,Math.max(1,ms));})]);clearTimeout(timer);this.waiter=null;}return this.q.shift()||null;}
    close(){this.input.onmidimessage=null;this.q=[];this.waiter=null;}
  }
  async function handshake(link){link.drain();for(let i=0;i<2;i++){if(!link.send(HS_QUERY))return null;let end=Date.now()+1000;while(Date.now()<end){const p=await link.read(end-Date.now());if(!p)break;const id=parseIdentity(p);if(id)return id;}}return null;}
  class Updater{
    constructor(access,log=()=>{}){this.access=access;this.log=log;}
    async find(filter){const outs=[...this.access.outputs.values()];for(const input of this.access.inputs.values()){
      if(input.state==='disconnected')continue;
      /* Chrome Android may expose the USB-MIDI device simply as "FM1",
       * "M-VAVE", "USB MIDI" or a generic USB interface. Probe only exact
       * matching IN/OUT port pairs with a read-only identity query; never
       * assume an FM1 based solely on the Android port label. */
      const normalize=x=>String(x||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
      const output=outs.find(o=>o.state!=='disconnected' && normalize(o.name)===normalize(input.name))
        || (outs.filter(o=>o.state!=='disconnected').length===1
            ? outs.find(o=>o.state!=='disconnected') : null);
      if(!output)continue;
      try{await input.open();await output.open();}catch(_){continue;}
      const link=new Link(input,output);const id=await handshake(link);
      if(id&&(!filter||filter(id)))return {link,id,name:input.name};link.close();
    }return null;}
    async waitFor(filter,ms){const end=Date.now()+ms;while(Date.now()<end){const x=await this.find(filter);if(x)return x;await sleep(850);}return null;}
    async serve(link,image,finish,idleMs,onProgress){let served=0,last=Date.now();for(;;){const pkt=await link.read(1000);if(!pkt){if(link.lost)return {served,finished:false,lost:true};if(Date.now()-last>idleMs)return {served,finished:false};continue;}
      const q=parseRequest(pkt);if(!q)continue;last=Date.now();
      if(q.addr===0xe0000000||q.addr===0xf0000000){if(!link.send(response(q.addr,[...new TextEncoder().encode('success'),0])))return {served,finished:false,lost:true};if(q.addr===finish)return {served,finished:true};continue;}
      if(q.len>MAXDATA||q.addr+q.len>image.length||q.len<1)throw Error(`Richiesta firmware fuori range: ${q.addr}+${q.len}`);
      await sleep(10);if(!link.send(response(q.addr,Array.from(image.subarray(q.addr,q.addr+q.len)),q.fl)))return {served,finished:false,lost:true};served++;if(onProgress)onProgress(served,q.addr);
    }}
    async install(image,product,step=()=>{}){
      if(!FLASH_PROVISIONED)throw Error('Scrittura disabilitata: firmware MT4 v0.17 senza OTA.');
      const dev=await this.find(id=>!/^ota-/i.test(id.model));
      if(!dev)throw Error('FM1 non trovato in modalità normale. Verifica cavo dati e chiudi DAW/MIDI.');
      const expected=product.split('_')[0];
      if(dev.id.model!==expected){dev.link.close();throw Error(`Modello USB ${dev.id.text} incompatibile con ${product}`);}
      step('device',dev.id.text);
      if(!dev.link.send(UPGRADE)){dev.link.close();throw Error('Comando update non inviato.');}
      await sleep(2000);
      const s1=await this.serve(dev.link,image,0xe0000000,8000,n=>step('verify',n));dev.link.close();
      if(!s1.finished)throw Error(`Invio loader interrotto (${s1.served} blocchi). Nessuna conferma scrittura: non scollegare senza una procedura di recupero.`);
      step('loader');await sleep(3000);
      const ota=await this.waitFor(id=>id.model==='ota-'+expected,30000);
      if(!ota)throw Error('Loader OTA non comparso. Fermarsi: non usare UBOOT dal browser. Per recuperare usare il kit Mac collaudato.');
      const res=await this.write(ota,image,step);
      if(!res.finished)throw Error('Trasferimento interrotto nel loader OTA. Non spegnere: usare RIPRENDI solo con lo stesso firmware e dopo aver verificato il collegamento.');
      await this.checkReturn(expected,step);
    }
    async write(ota,image,step){if(!FLASH_PROVISIONED)throw Error('Scrittura OTA disabilitata.');if(!ota.link.send(UPGRADE)){ota.link.close();throw Error('Loader non raggiungibile');}await sleep(2000);const res=await this.serve(ota.link,image,0xf0000000,180000,n=>step('write',n));ota.link.close();return res;}
    async checkReturn(expected,step){step('reboot');await sleep(3000);const back=await this.waitFor(id=>id.model===expected,40000);if(!back)throw Error('La periferica non è tornata in modalità normale: verifica il display e usa il ripristino Mac se necessario.');back.link.close();step('done',back.id.text);}
    async resume(image,product,step=()=>{}){if(!FLASH_PROVISIONED)throw Error('Ripresa OTA disabilitata.');const expected=product.split('_')[0];const ota=await this.find(id=>id.model==='ota-'+expected);if(!ota)throw Error('Nessun loader OTA trovato. Non tentare UBOOT da questa pagina.');const res=await this.write(ota,image,step);if(!res.finished)throw Error('Ripresa interrotta: non scollegare il dispositivo.');await this.checkReturn(expected,step);}
  }
  root.EXSProtocol={productOf,logicalImage,crc16,inspect,validatePackage,sha256,known,pack7,unpack7,parseIdentity,parseRequest,response,Updater};
})(typeof window!=='undefined'?window:globalThis);
/* SPDX-License-Identifier: GPL-3.0-only
 * EXS FLASH Android v0.2 — (C) Exsiderurgica Instruments.
 * Protocol based on Felucca (Leo Kuroshita), GPL-3.0-only.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const {validatePackage,Updater}=window.EXSProtocol;
let firmware=null,access=null,updater=null,device=null,busy=false,wake=null;
const log=s=>{const p=$('log');p.textContent+='['+new Date().toLocaleTimeString('it-IT')+'] '+s+'\n';p.scrollTop=p.scrollHeight;};
const say=(s,kind='muted')=>{const e=$('live-status');e.textContent=s;e.className=kind;log(s);};
const secure=()=>window.isSecureContext&&typeof navigator.requestMIDIAccess==='function'&&!!crypto.subtle;
function env(){const d='Android: '+(/Android/i.test(navigator.userAgent)?'SI':'NO')+' | Pagina HTTPS: '+(window.isSecureContext?'SI':'NO')+' | Web MIDI: '+(typeof navigator.requestMIDIAccess==='function'?'SI':'NO');
 $('browser-status').textContent=d;if(!secure())say('Chrome su Android e HTTPS sono necessari per parlare con FM1 via USB-MIDI.','error');
}
function refresh(){const allowed=!!firmware&&!busy&&secure()&&$('backup').checked&&$('risk').checked&&$('confirm').value.toUpperCase()==='FLASH';
 $('install').disabled=!(allowed&&device&&device.id.model==='FM-1');
 $('resume').disabled=!(allowed&&device&&device.id.model==='ota-FM-1');
 $('connect').disabled=busy;$('file').disabled=busy;
}
function disconnect(){if(device){device.link.close();device=null;} $('device-info').textContent='Nessun FM1 riconosciuto';refresh();}
async function choose(){firmware=null;$('fw-result').hidden=true;$('bar').value=0;refresh();const file=$('file').files?.[0];if(!file)return;
 try{if(file.size>8_000_000)throw Error('File troppo grande');say('Verifica CRC e SHA-256 sul Nothing…');
 const f=await validatePackage(new Uint8Array(await file.arrayBuffer()));firmware=f;
 $('fw-result').hidden=false;$('fw-result').textContent=f.label+'\n'+f.product+' · '+f.bytes.length+' byte\nSHA-256: '+f.sha256+'\nCRC: corretto';
 say('Firmware verificato localmente sul telefono.','ok');$('bar').value=10;
 }catch(e){$('fw-result').hidden=false;$('fw-result').textContent='NON ACCETTATO: '+e.message;say(e.message,'error');}refresh();
}
async function connect(){if(busy)return;disconnect();if(!secure()){env();return;}busy=true;refresh();
 try{say('Consenti a Chrome accesso MIDI e SysEx…');access=await navigator.requestMIDIAccess({sysex:true});updater=new Updater(access,log);
 const lines=[...access.inputs.values()].map(x=>'IN: '+x.name+' ('+x.state+')').concat([...access.outputs.values()].map(x=>'OUT: '+x.name+' ('+x.state+')'));
 $('ports').textContent=lines.join('\n')||'Nessuna porta MIDI visibile al Nothing.';
 say('Cerco FM1 sulle porte MIDI del Nothing…');const d=await updater.find();
 if(!d)throw Error('FM1 non risponde. '+(lines.length?'Le porte sono elencate nella diagnostica.':'Nessuna porta: controlla cavo dati, USB OTG e FM1 acceso.'));
 if(d.id.model!=='FM-1'&&d.id.model!=='ota-FM-1'){d.link.close();throw Error('Identità non prevista: '+d.id.text);}
 device=d;$('device-info').textContent='OK: '+d.id.text+' via '+d.name;
 say(d.id.model==='ota-FM-1'?'Loader OTA identificato: usare solo RIPRENDI con il medesimo file.':'USB-MIDI e SysEx funzionano sul Nothing. Nessun dato è stato scritto.','ok');$('bar').value=20;
 }catch(e){say('Diagnosi: '+e.message,'error');$('device-info').textContent=e.message;}finally{busy=false;refresh();}
}
async function keepAwake(){try{wake=await navigator.wakeLock?.request('screen');}catch(_){log('Wake Lock non disponibile: mantieni lo schermo acceso.');}}
async function releaseWake(){try{await wake?.release();}catch(_){}wake=null;}
function step(phase,v){if(phase==='device'){say('FM1: '+v+'. Avvio aggiornamento.');$('bar').value=24;}
 else if(phase==='verify'){$('bar').value=30;if(v===1||v%50===0)log('Loader richieste: '+v);}
 else if(phase==='loader'){say('Attendo loader OTA: non scollegare e non bloccare lo schermo.');$('bar').value=42;}
 else if(phase==='write'){if(v===1||v%32===0)say('OTA: '+v+' blocchi. Tieni Chrome in primo piano.');$('bar').value=Math.min(92,45+Math.floor(v/20));}
 else if(phase==='reboot'){say('Attendo riavvio FM1…');$('bar').value=95;}
 else if(phase==='done'){say('FM1 riavviato come '+v+'. Controlla il nome sul display.','ok');$('bar').value=100;}}
async function flash(resume){if(!firmware||!device||busy||(resume?$('resume').disabled:$('install').disabled))return;
 if(!window.confirm('FLASH REALE DA NOTHING SU FM1 — '+firmware.label+'\nFirmware WebMIDI non collaudato su Nothing; un errore potrebbe richiedere recupero esterno. Vuoi proseguire?'))return;
 busy=true;refresh();await keepAwake();disconnect();let success=false;
 try{if(!updater){access=await navigator.requestMIDIAccess({sysex:true});updater=new Updater(access,log);}
 say('Trasferimento avviato, non lasciare Chrome.');$('bar').value=22;
 if(resume)await updater.resume(firmware.logical,firmware.product,step);
 else await updater.install(firmware.logical,firmware.product,step);
 success=true;
 }catch(e){say('SCRITTURA NON CONFERMATA: '+e.message,'error');log('Non riprovare casualmente; verificare modalità OTA/UBOOT del dispositivo.');}
 finally{busy=false;await releaseWake();if(success)$('confirm').value='';refresh();}}
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(busy&&document.visibilityState==='hidden')log('ATTENZIONE: Chrome in background durante un flash!');});
$('file').addEventListener('change',choose);$('connect').addEventListener('click',connect);
$('install').addEventListener('click',()=>flash(false));$('resume').addEventListener('click',()=>flash(true));
for(const id of ['backup','risk','confirm'])$(id).addEventListener('input',refresh);
env();refresh();
})();
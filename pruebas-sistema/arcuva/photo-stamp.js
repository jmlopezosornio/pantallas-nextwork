// Derivative only: original JPEG stays private and unchanged.
export async function makeStampedPhoto(url,meta,context){
 if(!meta||meta.method!=='live_camera')throw Error('Esta foto no tiene GPS individual de captura.');
 const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('No se pudo leer la foto original.');
 const original=URL.createObjectURL(await response.blob()),img=new Image();
 try{
  img.src=original;await img.decode();const w=img.naturalWidth,h=img.naturalHeight;
  let map=null;if(context.map){if(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(context.map))throw Error('Mapa inválido');map=new Image();map.src=context.map;await map.decode();}
  const canvas=document.createElement('canvas'),pad=Math.max(12,Math.round(w*.022)),size=Math.max(12,Math.round(w*.024)),dy=Math.round(size*1.35);
  const fmt=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'medium'});
  const coord=(v,p,n)=>Math.abs(Number(v)).toFixed(6)+'° '+(Number(v)<0?n:p);
  const lines=[fmt.format(new Date(meta.captured_at))+' · hora argentina',coord(meta.latitude,'N','S')+' · '+coord(meta.longitude,'E','O'),'Precisión GPS: ±'+Math.round(meta.accuracy)+' m',context.element||'',context.gpsAddress?'Dirección aproximada GPS: '+context.gpsAddress:'Dirección GPS no resuelta',context.address?'Ubicación registrada: '+context.address:'',context.order||'',(context.certification?'CERT '+context.certification:'')+' · FOTO '+String(context.number||1).padStart(2,'0')].filter(Boolean);
  canvas.width=w;canvas.height=h;let ctx=canvas.getContext('2d');ctx.font=size+'px Arial';
  const wrap=(t,max)=>{const out=[];let row='';for(const word of String(t).split(/\s+/)){const next=row?row+' '+word:word;if(ctx.measureText(next).width>max&&row){out.push(row);row=word;}else row=next;}if(row)out.push(row);return out;};
  const mapW=map?Math.floor((w-pad*3)*.43):0,mapH=map?Math.round(mapW*map.naturalHeight/map.naturalWidth):0;
  const textX=map?pad*2+mapW:pad,textW=w-textX-pad,wrapped=lines.flatMap(t=>wrap(t,textW));
  const creditH=map?Math.round(dy*1.5):0,footer=pad*3+dy+Math.max(mapH+creditH,dy*wrapped.length);
  canvas.height=h+footer;ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,w,h);ctx.fillStyle='#111c2b';ctx.fillRect(0,h,w,footer);
  ctx.fillStyle='#a9d1ff';ctx.font='bold '+size+'px Arial';ctx.textBaseline='top';ctx.fillText('NEXTWORK · CERTIFICACIONES',pad,h+pad,w-2*pad);
  const y=h+pad*2+dy;
  if(map){ctx.drawImage(map,pad,y,mapW,mapH);ctx.fillStyle='#e0e8f3';ctx.font=Math.max(10,Math.round(size*.67))+'px Arial';ctx.fillText('© OpenStreetMap contributors',pad,y+mapH+4,mapW);ctx.fillText('Powered by Geoapify',pad,y+mapH+4+Math.round(size*.85),mapW);}
  ctx.fillStyle='#fff';ctx.font=size+'px Arial';wrapped.forEach((t,i)=>ctx.fillText(t,textX,y+dy*i,textW));
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));if(!blob)throw Error('No se pudo generar la foto certificada.');return blob;
 }finally{URL.revokeObjectURL(original);}
}
export function saveStampedBlob(blob,context){const object=URL.createObjectURL(blob),a=document.createElement('a');a.href=object;a.download='certificacion-'+String(context.certification||'foto').replace(/[^a-z0-9-]/gi,'')+'-'+(context.number||1)+(context.map?'-mapa':'')+'.jpg';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(object),30000);}
export async function downloadStampedPhoto(url,meta,context){saveStampedBlob(await makeStampedPhoto(url,meta,context),context);}

// Derivative only: original JPEG stays private and unchanged.
export async function makeStampedPhoto(url,meta,context){
 if(!meta||meta.method!=='live_camera')throw Error('Esta foto no tiene GPS individual de captura.');
 const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('No se pudo leer la foto original.');
 const original=URL.createObjectURL(await response.blob());const img=new Image();
 try{
 img.src=original;await img.decode();const w=img.naturalWidth,h=img.naturalHeight;
 const canvas=document.createElement('canvas'),scale=Math.max(1,w/1000),pad=Math.round(26*scale),font=Math.round(24*scale),line=Math.round(font*1.4);
 const fmt=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'medium'});
 const coord=(v,p,n)=>Math.abs(Number(v)).toFixed(6)+'° '+(Number(v)<0?n:p);
 const lines=[fmt.format(new Date(meta.captured_at))+' · hora argentina',coord(meta.latitude,'N','S')+' · '+coord(meta.longitude,'E','O')+' · GPS ±'+Math.round(meta.accuracy)+' m',context.element||'',context.address?'Ubicación registrada del elemento: '+context.address:'Dirección GPS no resuelta',context.order||'',(context.certification?'CERT '+context.certification:'')+' · FOTO '+String(context.number||1).padStart(2,'0')].filter(Boolean);
 const wrap=(ctx,t,max)=>{const out=[];let row='';for(const word of String(t).split(/\s+/)){const next=row?row+' '+word:word;if(ctx.measureText(next).width>max&&row){out.push(row);row=word;}else row=next;}if(row)out.push(row);return out;};
 canvas.width=w;canvas.height=h;let ctx=canvas.getContext('2d');const size=Math.max(12,Math.min(font,Math.round(w/28)));ctx.font=size+'px Arial';const wrapped=lines.flatMap(t=>wrap(ctx,t,w-2*pad));const dy=Math.round(size*1.42),footer=pad*2+dy*(wrapped.length+1);canvas.height=h+footer;ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,w,h);ctx.fillStyle='#111c2b';ctx.fillRect(0,h,w,footer);ctx.fillStyle='#a9d1ff';ctx.font='bold '+size+'px Arial';ctx.textBaseline='top';ctx.fillText('NEXTWORK · CERTIFICACIONES',pad,h+pad,w-2*pad);ctx.fillStyle='#fff';ctx.font=size+'px Arial';wrapped.forEach((t,i)=>ctx.fillText(t,pad,h+pad+dy*(i+1),w-2*pad));
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));if(!blob)throw Error('No se pudo generar la foto certificada.');return blob;
 }finally{URL.revokeObjectURL(original);}
}
export async function downloadStampedPhoto(url,meta,context){const blob=await makeStampedPhoto(url,meta,context);const object=URL.createObjectURL(blob),a=document.createElement('a');a.href=object;a.download='certificacion-'+String(context.certification||'foto').replace(/[^a-z0-9-]/gi,'')+'-'+(context.number||1)+'.jpg';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(object),30000);}

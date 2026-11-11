'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

type Room = {id:string;current_index:number;is_playing:boolean;started_at:string|null;position_seconds:number;updated_at:string};
type Video = {id:string;room_id:string;video_id:string;title:string;position:number};
type Player = {loadVideoById:(id:string)=>void;cueVideoById:(id:string)=>void;playVideo:()=>void;pauseVideo:()=>void;seekTo:(seconds:number,allowSeekAhead:boolean)=>void;getCurrentTime:()=>number;getPlayerState:()=>number;destroy:()=>void};
declare global {interface Window {YT?:{Player:new(el:HTMLElement,opts:Record<string,unknown>)=>Player};onYouTubeIframeAPIReady?:()=>void}}
function parseId(raw:string):string|null {
  try {const u=new URL(raw.trim());const host=u.hostname.toLowerCase().replace(/^www\./,'').replace(/^m\./,'');let id='';
    if(host==='youtu.be') id=u.pathname.split('/')[1]||'';
    else if(host==='youtube.com'||host==='youtube-nocookie.com') id=u.searchParams.get('v')||(/\/(?:shorts|embed|live)\/([\w-]{11})/.exec(u.pathname)?.[1]||'');
    return /^[\w-]{11}$/.test(id)?id:null;
  }catch{return /^[\w-]{11}$/.test(raw.trim())?raw.trim():null}
}
const code=()=>Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');
const getPosition=(r:Room)=>r.is_playing&&r.started_at?Math.max(0,(Date.now()-new Date(r.started_at).getTime())/1000):r.position_seconds;
export default function Home(){
 const [roomId,setRoomId]=useState('');const [joinCode,setJoinCode]=useState('');const [room,setRoom]=useState<Room|null>(null);const [videos,setVideos]=useState<Video[]>([]);
 const [single,setSingle]=useState('');const [bulk,setBulk]=useState('');const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);const [ready,setReady]=useState(false);
 const playerRef=useRef<Player|null>(null);const playerEl=useRef<HTMLDivElement|null>(null);const roomRef=useRef<Room|null>(null);const videosRef=useRef<Video[]>([]);const videoRef=useRef<string>('');const syncing=useRef(false);const latestRoom=useRef('');
 useEffect(()=>{roomRef.current=room},[room]);useEffect(()=>{videosRef.current=videos},[videos]);
 const refresh=useCallback(async(id:string)=>{
   if(!supabase)return;
   const [r,v]=await Promise.all([supabase.from('jam_rooms').select('*').eq('id',id).maybeSingle(),supabase.from('jam_videos').select('*').eq('room_id',id).order('position',{ascending:true})]);
   if(latestRoom.current!==id)return;
   if(r.data)setRoom(r.data as Room);if(v.data)setVideos(v.data as Video[]);
 },[]);
 useEffect(()=>{if(!supabase)return;const query=new URLSearchParams(location.search).get('room')?.toUpperCase();if(query&&/^[A-Z0-9]{8}$/.test(query)){latestRoom.current=query;setRoomId(query)}},[]);
 useEffect(()=>{if(!roomId||!supabase)return;latestRoom.current=roomId;refresh(roomId);
   const channel=supabase.channel('jam-'+roomId).on('postgres_changes',{event:'*',schema:'public',table:'jam_rooms',filter:'id=eq.'+roomId},()=>refresh(roomId)).on('postgres_changes',{event:'*',schema:'public',table:'jam_videos',filter:'room_id=eq.'+roomId},()=>refresh(roomId)).subscribe();
   const timer=setInterval(()=>refresh(roomId),3000);return()=>{clearInterval(timer);supabase.removeChannel(channel)};
 },[roomId,refresh]);
 const join=async(id:string)=>{if(!supabase)return;const clean=id.trim().toUpperCase();const {data,error}=await supabase.from('jam_rooms').select('id').eq('id',clean).maybeSingle();if(error||!data){setMsg('No se encontró esa sala.');return}setMsg('');setRoomId(clean);history.replaceState(null,'','?room='+clean)};
 const create=async()=>{if(!supabase)return;setBusy(true);setMsg('');let id='';let errorMessage='';for(let i=0;i<3;i++){id=code();const {error}=await supabase.from('jam_rooms').insert({id});if(!error){setRoomId(id);history.replaceState(null,'','?room='+id);break}errorMessage=error.message;id=''}if(!id)setMsg(errorMessage);setBusy(false)};
 const add=async(raw:string)=>{if(!supabase||!roomId)return;const ids=Array.from(new Set(raw.split(/[\s,]+/).map(parseId).filter((x):x is string=>!!x)));if(!ids.length){setMsg('Pega uno o varios enlaces válidos de YouTube.');return}setBusy(true);const {data:existing}=await supabase.from('jam_videos').select('position').eq('room_id',roomId).order('position',{ascending:false}).limit(1);const start=(existing?.[0]?.position??-1)+1;
 const {error}=await supabase.from('jam_videos').insert(ids.map((video_id,i)=>({room_id:roomId,video_id,title:'Video '+video_id,position:start+i})));
 if(error)setMsg(error.message);else{setMsg(`${ids.length} video(s) agregado(s).`);setSingle('');setBulk('');await refresh(roomId)}setBusy(false)};
 const updateRoom=async(patch:Partial<Room>)=>{if(!supabase||!roomId)return;const {error}=await supabase.from('jam_rooms').update({...patch,updated_at:new Date().toISOString()}).eq('id',roomId);if(error)setMsg(error.message);else await refresh(roomId)};
 const toggle=()=>{if(!room)return;const pos=getPosition(room);if(room.is_playing)updateRoom({is_playing:false,position_seconds:pos,started_at:null});else updateRoom({is_playing:true,position_seconds:pos,started_at:new Date(Date.now()-pos*1000).toISOString()})};
 const skip=()=>{if(!room)return;updateRoom({current_index:Math.min(room.current_index+1,videos.length),position_seconds:0,started_at:new Date().toISOString()})};
 const select=(index:number)=>updateRoom({current_index:index,position_seconds:0,started_at:new Date().toISOString(),is_playing:true});
 const remove=async(v:Video)=>{if(!supabase||!room)return;const idx=videos.findIndex(x=>x.id===v.id);const {error}=await supabase.from('jam_videos').delete().eq('id',v.id);if(error){setMsg(error.message);return}if(idx<room.current_index)await updateRoom({current_index:room.current_index-1});else if(idx===room.current_index)await updateRoom({position_seconds:0,started_at:new Date().toISOString()});await refresh(roomId)};
 const move=async(index:number,dir:number)=>{if(!supabase||!room)return;const other=index+dir;if(other<0||other>=videos.length)return;const a=videos[index],b=videos[other];const tmp=-Date.now();await supabase.from('jam_videos').update({position:tmp}).eq('id',a.id);await supabase.from('jam_videos').update({position:a.position}).eq('id',b.id);await supabase.from('jam_videos').update({position:b.position}).eq('id',a.id);
 let next=room.current_index;if(next===index)next=other;else if(next===other)next=index;if(next!==room.current_index)await updateRoom({current_index:next});await refresh(roomId)};
 const current=videos[room?.current_index??0];
 useEffect(()=>{if(!roomId||!playerEl.current||playerRef.current)return;let disposed=false;
  const init=()=>{if(disposed||!playerEl.current||!window.YT)return;playerRef.current=new window.YT.Player(playerEl.current,{height:'100%',width:'100%',videoId:'',playerVars:{playsinline:1,origin:location.origin},events:{onReady:()=>setReady(true),onStateChange:(event:{data:number})=>{if(event.data===0){const r=roomRef.current;if(r&&videosRef.current[r.current_index+1]){supabase?.from('jam_rooms').update({current_index:r.current_index+1,position_seconds:0,started_at:new Date().toISOString(),is_playing:true}).eq('id',r.id).eq('current_index',r.current_index).then(()=>{});}else if(r){supabase?.from('jam_rooms').update({is_playing:false,position_seconds:0,started_at:null}).eq('id',r.id).then(()=>{});}}}}});};
  if(window.YT?.Player)init();else{window.onYouTubeIframeAPIReady=init;if(!document.querySelector('script[data-youtube-api]')){const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.dataset.youtubeApi='true';document.body.appendChild(s)}}return()=>{disposed=true;playerRef.current?.destroy();playerRef.current=null;setReady(false);videoRef.current=''};
 },[roomId]);
 useEffect(()=>{if(!ready||!room||!playerRef.current)return;const p=playerRef.current;const v=videos[room.current_index];if(!v){if(videoRef.current){p.pauseVideo();videoRef.current=''}return}syncing.current=true;const changed=videoRef.current!==v.video_id;if(changed){videoRef.current=v.video_id;if(room.is_playing)p.loadVideoById(v.video_id);else p.cueVideoById(v.video_id)}const pos=getPosition(room);if(changed||Math.abs(p.getCurrentTime()-pos)>2.5)p.seekTo(pos,true);if(room.is_playing&&p.getPlayerState()!==1)p.playVideo();if(!room.is_playing&&p.getPlayerState()===1)p.pauseVideo();setTimeout(()=>{syncing.current=false},300)},[ready,room,videos]);
 useEffect(()=>{if(!ready||!roomId)return;const timer=setInterval(()=>{const r=roomRef.current,p=playerRef.current;if(!r||!p||!r.is_playing||syncing.current)return;const diff=Math.abs(p.getCurrentTime()-getPosition(r));if(diff>4)p.seekTo(getPosition(r),true)},5000);return()=>clearInterval(timer)},[ready,roomId]);
 if(!supabase)return <main><h1>▶ YouTube Jam</h1><div className="panel"><p className="error">Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel.</p></div></main>;
 return <main><h1>▶ YouTube Jam</h1><p>Crea una sala, pega una lista de enlaces y disfruta los videos con tus amigos.</p>
 {!roomId?<div className="panel"><h2>Comenzar</h2><button disabled={busy} onClick={create}>+ Crear una sala</button><h2>Unirse a una sala</h2><div className="row"><input style={{maxWidth:240,margin:0}} maxLength={8} placeholder="Código de 8 caracteres" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())}/><button className="secondary" onClick={()=>join(joinCode)}>Entrar</button></div></div>:
 <><div className="panel"><div className="row"><strong>Sala: <span className="code">{roomId}</span></strong><button className="secondary" onClick={()=>{navigator.clipboard.writeText(location.href);setMsg('Enlace copiado.')}}>🔗 Compartir sala</button><button className="ghost" onClick={()=>{setRoomId('');setRoom(null);setVideos([]);history.replaceState(null,'',location.pathname)}}>Salir</button></div></div>
 <div className="grid"><section><div className="panel"><div className="video"><div ref={playerEl} style={{width:'100%',height:'100%'}}/></div><h2>{current?.title||'Agrega un video para comenzar'}</h2><div className="row"><button onClick={toggle} disabled={!room||!current}>{room?.is_playing?'⏸ Pausar':'▶ Reproducir'}</button><button className="secondary" onClick={skip} disabled={!room||!current}>⏭ Siguiente</button><span className="muted tiny">Puede requerir pulsar Reproducir para activar el sonido.</span></div></div>
 <div className="panel"><h2>Agregar un video</h2><input placeholder="https://www.youtube.com/watch?v=..." value={single} onChange={e=>setSingle(e.target.value)}/><button disabled={busy} onClick={()=>add(single)}>+ Agregar</button><h2>Agregar una lista completa</h2><p className="tiny">Pega varios enlaces de YouTube, uno por línea. También admite enlaces separados por espacios.</p><textarea placeholder={'https://youtu.be/XXXXXXXXXXX\nhttps://www.youtube.com/watch?v=YYYYYYYYYYY'} value={bulk} onChange={e=>setBulk(e.target.value)}/><button disabled={busy} onClick={()=>add(bulk)}>+ Agregar toda la lista</button><p className="tiny">Los videos deben permitir reproducción en sitios externos.</p></div></section>
 <aside className="panel"><h2>📋 Lista de reproducción ({videos.length})</h2>{videos.length===0?<p>La lista está vacía.</p>:videos.map((v,i)=><div key={v.id} className={'item '+(i===room?.current_index?'active':'')}><img alt="Miniatura" src={`https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg`}/><div className="info"><strong>{i+1}. {v.title}</strong><span className="tiny muted">{i===room?.current_index?'Reproduciendo ahora':'En cola'}</span><div className="row"><button className="ghost" title="Reproducir" onClick={()=>select(i)}>▶</button><button className="ghost" title="Subir" disabled={i===0} onClick={()=>move(i,-1)}>↑</button><button className="ghost" title="Bajar" disabled={i===videos.length-1} onClick={()=>move(i,1)}>↓</button><button className="ghost" title="Eliminar" onClick={()=>remove(v)}>×</button></div></div></div>)}</aside></div></>}
 {msg&&<p className={msg.includes('No se')||msg.includes('válidos')?'error':'success'}>{msg}</p>}
 </main>
}

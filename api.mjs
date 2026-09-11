import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const H={"Content-Type":"application/json; charset=utf-8"};
const USER=process.env.ADMIN_USER||"admin", PASS=process.env.ADMIN_PASS||"Mihan1@123";
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
function auth(r){return (r.headers.get("cookie")||"").split(";").some(x=>x.trim()==="mihan1_admin=1")}
async function files(){const st=getStore("mihan1-files"),{blobs}=await st.list(),out=[];
 for(const b of blobs){const m=await st.getMetadata(b.key);if(m?.metadata?.record)out.push(m.metadata.record)}
 return out.sort((a,b)=>b.createdAt-a.createdAt)}
export default async req=>{
 const u=new URL(req.url), p=u.pathname.replace(/^\/api\/?/,"").replace(/\/$/,"");
 if(req.method==="GET"&&p==="files")return json(await files());
 if(req.method==="GET"&&p==="me")return json({admin:auth(req)});
 if(req.method==="POST"&&p==="login"){const b=await req.json().catch(()=>({}));
  if(b.username===USER&&b.password===PASS)return new Response('{"ok":true}',{headers:{...H,"Set-Cookie":"mihan1_admin=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400"}});
  return json({error:"نام کاربری یا رمز عبور اشتباه است."},401)}
 if(req.method==="POST"&&p==="logout")return new Response('{"ok":true}',{headers:{...H,"Set-Cookie":"mihan1_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"}});
 if(req.method==="POST"&&p==="upload"){if(!auth(req))return json({error:"دسترسی مدیر لازم است."},401);
  const f=await req.formData(),file=f.get("file");if(!(file instanceof File))return json({error:"فایلی انتخاب نشده است."},400);
  const key="file-"+crypto.randomUUID(),record={id:key,name:String(f.get("name")||file.name),description:String(f.get("description")||""),originalName:file.name,size:file.size,createdAt:Date.now(),key,url:"/api/download/"+encodeURIComponent(key)};
  await getStore("mihan1-files").set(key,file,{metadata:{record}});return json({ok:true,file:record})}
 if(req.method==="GET"&&p.startsWith("download/")){const key=decodeURIComponent(p.slice(9)),r=await getStore("mihan1-files").getWithMetadata(key,{type:"blob"});if(!r?.data)return new Response("Not found",{status:404});
  return new Response(r.data,{headers:{"Content-Type":"application/octet-stream","Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(r.metadata?.record?.originalName||"download")}`}})}
 if(req.method==="DELETE"&&p.startsWith("files/")){if(!auth(req))return json({error:"دسترسی مدیر لازم است."},401);const id=p.slice(6),all=await files(),x=all.find(a=>a.id===id);if(!x)return json({error:"فایل پیدا نشد."},404);await getStore("mihan1-files").delete(x.key);return json({ok:true})}
 return json({error:"مسیر پیدا نشد."},404)
}
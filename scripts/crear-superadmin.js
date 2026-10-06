const { createClient }=require('@supabase/supabase-js'); require('dotenv').config();
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_KEY;
const email=process.env.FOEST_SUPERADMIN_EMAIL,password=process.env.FOEST_SUPERADMIN_PASSWORD,nombre=process.env.FOEST_SUPERADMIN_NOMBRE||'Superadministrador FOEST';
if(!url||!key||!email||!password){console.error('Faltan SUPABASE_URL, SUPABASE_SERVICE_KEY, FOEST_SUPERADMIN_EMAIL o FOEST_SUPERADMIN_PASSWORD en .env');process.exit(1)}
if(password.length<10){console.error('FOEST_SUPERADMIN_PASSWORD debe tener mínimo 10 caracteres.');process.exit(1)}
const sb=createClient(url,key,{auth:{persistSession:false}});
(async()=>{try{
 const {data:list,error:le}=await sb.auth.admin.listUsers(); if(le)throw le;
 let user=(list.users||[]).find(u=>u.email?.toLowerCase()===email.toLowerCase());
 if(!user){const {data,error}=await sb.auth.admin.createUser({email:email.toLowerCase(),password,email_confirm:true,user_metadata:{nombre,rol:'SUPERADMIN'}});if(error)throw error;user=data.user;}
 const {data:existing}=await sb.from('funcionarios_foest').select('id,rol').eq('rol','SUPERADMIN').maybeSingle();
 if(existing){console.log('Ya existe un SUPERADMIN en funcionarios_foest. No se creó otro.');process.exit(0)}
 const {error}=await sb.from('funcionarios_foest').insert([{auth_user_id:user.id,nombre,correo:email.toLowerCase(),cargo:'Superadministrador FOEST',rol:'SUPERADMIN',activo:true,permisos:[]}]);if(error)throw error;
 console.log('SUPERADMIN FOEST creado correctamente:',email);
}catch(e){console.error(e.message);process.exit(1)}})();

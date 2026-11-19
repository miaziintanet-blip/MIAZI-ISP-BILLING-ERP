// Miazi ISP Billing & ERP — browser-safe Supabase configuration
// Paste your NEW Supabase Project URL and anon/publishable key below.
// NEVER use the service_role/secret key in this file.
const SUPABASE_URL = "https://waoijhpanpboksvcnqiq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_DbGYxusmvOLwlLzEC8D4OQ_KX9o_Srj";
let sb = null, currentPage = "dashboard", customers = [], packages = [], payments = [], lang = "both";
const $ = id => document.getElementById(id);
const configured = !SUPABASE_URL.startsWith("YOUR_") && !SUPABASE_ANON_KEY.startsWith("YOUR_");
if (configured && window.supabase) sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
if (configured) $("configNotice").classList.add("hidden");
function msg(t){$("loginMsg").textContent=t}
function money(n){return "৳"+Number(n||0).toLocaleString("en-BD")}
function showPage(page){currentPage=page;["dashboard","customers","packages","payments","reports","settings"].forEach(p=>$(p+"Page").classList.toggle("hidden",p!==page));document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("pageTitle").textContent=({dashboard:"Dashboard / ড্যাশবোর্ড",customers:"Customers / গ্রাহক",packages:"Packages / প্যাকেজ",payments:"Payments / পেমেন্ট",reports:"Reports / রিপোর্ট",settings:"Settings / সেটিংস"})[page];$("sidebar").classList.remove("open")}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>showPage(b.dataset.go));
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
$("langBtn").onclick=()=>{lang=lang==="both"?"en":"both";document.documentElement.lang=lang==="en"?"en":"bn";$("langBtn").textContent=lang==="en"?"English":"বাংলা / EN"};
$("loginBtn").onclick=async()=>{if(!sb)return msg("আগে app.js-এ Supabase URL ও anon key বসান।");const {error}=await sb.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(error)return msg(error.message);await init()};
$("logoutBtn").onclick=async()=>{await sb.auth.signOut();$("appView").classList.add("hidden");$("loginView").classList.remove("hidden")};
async function init(){const {data:{user}}=await sb.auth.getUser();if(!user)return;$("userEmail").textContent=user.email;$("loginView").classList.add("hidden");$("appView").classList.remove("hidden");await loadAll()}
async function loadAll(){await Promise.all([loadCustomers(),loadPackages(),loadPayments()]);render()}
async function loadCustomers(){const r=await sb.from("customers").select("*").order("created_at",{ascending:false});if(r.error)return alert(r.error.message);customers=r.data||[]}
async function loadPackages(){const r=await sb.from("packages").select("*").order("price");if(r.error)return alert(r.error.message);packages=r.data||[]}
async function loadPayments(){const r=await sb.from("payments").select("id,amount,method,note,paid_at,customers(name)").order("paid_at",{ascending:false}).limit(30);if(r.error)return alert(r.error.message);payments=r.data||[]}
function render(){ $("totalCustomers").textContent=customers.length;$("activeCustomers").textContent=customers.filter(c=>c.status==="active").length;$("dueCustomers").textContent=customers.filter(c=>Number(c.due_amount||0)>0).length;$("collected").textContent=money(payments.reduce((a,p)=>a+Number(p.amount),0));
$("customerPackage").innerHTML='<option value="">Select / নির্বাচন</option>'+packages.map(p=>`<option value="${p.id}">${esc(p.name)} — ${money(p.price)}</option>`).join("");
$("paymentCustomer").innerHTML='<option value="">Select customer</option>'+customers.map(c=>`<option value="${c.id}">${esc(c.name)} (${esc(c.phone)})</option>`).join("");
$("customerRows").innerHTML=customers.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${esc(c.username||"—")}</td><td>${money(c.monthly_fee)}</td><td><span class="pill ${c.status==="active"?"":"danger"}">${esc(c.status)}</span></td></tr>`).join("");
$("packageRows").innerHTML=packages.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.speed||"—")}</td><td>${money(p.price)}</td></tr>`).join("");
$("paymentRows").innerHTML=payments.map(p=>`<tr><td>${new Date(p.paid_at).toLocaleDateString()}</td><td>${esc(p.customers?.name||"—")}</td><td>${money(p.amount)}</td><td>${esc(p.method)}</td></tr>`).join("")}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
$("customerForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const d=Object.fromEntries(f);d.monthly_fee=Number(d.monthly_fee);d.package_id=d.package_id||null;const {error}=await sb.from("customers").insert(d);if(error)return alert(error.message);e.target.reset();await loadAll();alert("Customer saved / গ্রাহক সংরক্ষিত")};
$("packageForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));d.price=Number(d.price);const {error}=await sb.from("packages").insert(d);if(error)return alert(error.message);e.target.reset();await loadAll()};
$("paymentForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));d.amount=Number(d.amount);const {error}=await sb.from("payments").insert(d);if(error)return alert(error.message);e.target.reset();await loadAll();alert("Payment saved / পেমেন্ট সংরক্ষিত")};
$("customerSearch").oninput=e=>{const q=e.target.value.toLowerCase();$("customerRows").innerHTML=customers.filter(c=>(c.name+" "+c.phone+" "+(c.username||"")).toLowerCase().includes(q)).map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${esc(c.username||"—")}</td><td>${money(c.monthly_fee)}</td><td>${esc(c.status)}</td></tr>`).join("")};
(async()=>{if(!sb)return;const {data:{session}}=await sb.auth.getSession();if(session)await init()})();

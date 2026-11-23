// MIAZI ISP BILLING & ERP
const SUPABASE_URL = "https://waoijhpanpboksvcnqiq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_DbGYxusmvOLwlLzEC8D4OQ_KX9o_Srj";

let sb = null;
let currentPage = "dashboard";
let customers = [], packages = [], payments = [];
let lang = "both";
let importRows = [], importReport = [];

const $ = id => document.getElementById(id);

const configured = !SUPABASE_URL.startsWith("YOUR_") &&
                  !SUPABASE_ANON_KEY.startsWith("YOUR_");

if (configured && window.supabase) {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

if (configured) $("configNotice").classList.add("hidden");

function msg(t) {
  $("loginMsg").textContent = t;
}

function money(n) {
  return "৳" + Number(n || 0).toLocaleString("en-BD");
}

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);
}

function setConnectionDateDefault() {
  const field = $("connectionDate");
  if (field && !field.value) field.value = todayISO();
}

function showPage(page) {
  currentPage = page;

  ["dashboard","customers","customerDetail","packages","payments","reports","settings"]
    .forEach(p => $(p + "Page").classList.toggle("hidden", p !== page));

  document.querySelectorAll(".nav button").forEach(b =>
    b.classList.toggle("active", b.dataset.page === page)
  );

  $("pageTitle").textContent = ({
    dashboard:"Dashboard / ড্যাশবোর্ড",
    customers:"Customers / গ্রাহক",
    customerDetail:"Customer Information / গ্রাহকের তথ্য",
    packages:"Packages / প্যাকেজ",
    payments:"Payments / পেমেন্ট",
    reports:"Reports / রিপোর্ট",
    settings:"Settings / সেটিংস"
  })[page];

  $("sidebar").classList.remove("open");
}

document.querySelectorAll("[data-page]").forEach(b =>
  b.onclick = () => showPage(b.dataset.page)
);

document.querySelectorAll("[data-go]").forEach(b =>
  b.onclick = () => showPage(b.dataset.go)
);

$("menuBtn").onclick = () =>
  $("sidebar").classList.toggle("open");

$("langBtn").onclick = () => {
  lang = lang === "both" ? "en" : "both";
  document.documentElement.lang = lang === "en" ? "en" : "bn";
  $("langBtn").textContent = lang === "en" ? "English" : "বাংলা / EN";
};

$("loginBtn").onclick = async () => {
  if (!sb) return msg("Supabase configuration missing.");

  const { error } = await sb.auth.signInWithPassword({
    email: $("email").value,
    password: $("password").value
  });

  if (error) return msg(error.message);
  await init();
};

$("logoutBtn").onclick = async () => {
  await sb.auth.signOut();
  $("appView").classList.add("hidden");
  $("loginView").classList.remove("hidden");
};

async function init() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  $("userEmail").textContent = user.email;
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");

  setConnectionDateDefault();
  await loadAll();
}

async function loadAll() {
  await Promise.all([
    loadCustomers(),
    loadPackages(),
    loadPayments()
  ]);
  render();
}

async function loadCustomers() {
  const r = await sb.from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (r.error) return alert(r.error.message);
  customers = r.data || [];
}

async function loadPackages() {
  const r = await sb.from("packages")
    .select("*")
    .order("price");

  if (r.error) return alert(r.error.message);
  packages = r.data || [];
}

async function loadPayments() {
  const r = await sb.from("payments")
    .select("id,amount,method,note,paid_at,customers(name)")
    .order("paid_at", { ascending: false })
    .limit(30);

  if (r.error) return alert(r.error.message);
  payments = r.data || [];
}

function customerRow(c) {
  return `<tr data-customer-id="${esc(c.id)}" class="customer-row" style="cursor:pointer">
    <td>${esc(c.name)}</td>
    <td>${esc(c.phone)}</td>
    <td>${esc(c.username || "—")}</td>
    <td>${esc(c.mac_address || "—")}</td>
    <td>${esc(c.connection_date || "—")}</td>
    <td>${money(c.monthly_fee)}</td>
    <td><span class="pill ${c.status === "active" ? "" : "danger"}">
      ${esc(c.status)}
    </span></td>
  </tr>`;
}

function render() {
  $("totalCustomers").textContent = customers.length;

  $("activeCustomers").textContent =
    customers.filter(c => c.status === "active").length;

  $("dueCustomers").textContent =
    customers.filter(c => Number(c.due_amount || 0) > 0).length;

  $("collected").textContent =
    money(payments.reduce((a, p) => a + Number(p.amount), 0));

  $("customerPackage").innerHTML =
    '<option value="">Select / নির্বাচন</option>' +
    packages.map(p =>
      `<option value="${p.id}">${esc(p.name)} — ${money(p.price)}</option>`
    ).join("");

  $("paymentCustomer").innerHTML =
    '<option value="">Select customer</option>' +
    customers.map(c =>
      `<option value="${c.id}">${esc(c.name)} (${esc(c.phone)})</option>`
    ).join("");

  $("customerRows").innerHTML =
    customers.map(customerRow).join("");

  $("packageRows").innerHTML =
    packages.map(p => `<tr>
      <td>${esc(p.name)}</td>
      <td>${esc(p.speed || "—")}</td>
      <td>${money(p.price)}</td>
    </tr>`).join("");

  $("paymentRows").innerHTML =
    payments.map(p => `<tr>
      <td>${new Date(p.paid_at).toLocaleDateString()}</td>
      <td>${esc(p.customers?.name || "—")}</td>
      <td>${money(p.amount)}</td>
      <td>${esc(p.method)}</td>
    </tr>`).join("");
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[c]));
}

// CUSTOMER DETAILS
$("customerRows").addEventListener("click", e => {
  const row = e.target.closest("[data-customer-id]");
  if (!row) return;
  const c = customers.find(x => String(x.id) === row.dataset.customerId);
  if (!c) return;
  $("customerDetailContent").innerHTML = `
    <div class="formgrid">
      ${detailField("Customer ID", c.customer_code || c.id)}
      ${detailField("Customer Name", c.name)}
      ${detailField("Login ID", c.username)}
      ${detailField("Phone", c.phone)}
      ${detailField("MAC Address", c.mac_address)}
      ${detailField("NID", c.nid)}
      ${detailField("Package ID", c.package_id)}
      ${detailField("Monthly Fee", money(c.monthly_fee))}
      ${detailField("Connection Date", c.connection_date)}
      ${detailField("Status", c.status)}
      ${detailField("Due Amount", money(c.due_amount))}
      ${detailField("Address", c.address)}
    </div>`;
  showPage("customerDetail");
});
function detailField(label, value) {
  return `<div class="card"><span class="muted">${esc(label)}</span><b style="font-size:17px;overflow-wrap:anywhere">${esc(value || "—")}</b></div>`;
}
$("backCustomersBtn").onclick = () => showPage("customers");

// Stable deterministic key. Phone alone is deliberately NOT used as a unique key.
function makeImportKey(d) {
  const norm = v => String(v ?? "").trim().toLowerCase().replace(/\\s+/g, " ");
  const identity = norm(d.username) ? "user:"+norm(d.username)
    : norm(d.customer_code) ? "code:"+norm(d.customer_code)
    : norm(d.mac_address) ? "mac:"+norm(d.mac_address)
    : ["row", norm(d.name), norm(d.phone), norm(d.address),
       norm(d.connection_date), norm(d.monthly_fee), norm(d.package_id)].join("|");
  let h = 2166136261;
  for (let i = 0; i < identity.length; i++) {
    h ^= identity.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return "miazi1_" + (h >>> 0).toString(16).padStart(8, "0");
}
function normalizeImportRow(row) {
  const get = (...keys) => {
    for (const k of keys) if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return String(row[k]).trim();
    return "";
  };
  const d = {
    name: get("name","Name","নাম","customer_name"),
    phone: get("phone","Phone","Mobile","mobile","মোবাইল"),
    username: get("username","Username","Login ID","login_id","ইউজারনেম"),
    address: get("address","Address","ঠিকানা"),
    monthly_fee: Number(get("monthly_fee","Monthly Fee","monthly","fee","মাসিক বিল") || 500),
    status: (get("status","Status","অবস্থা") || "active").toLowerCase(),
    connection_date: get("connection_date","Connection Date","date","সংযোগের তারিখ") || todayISO(),
    customer_code: get("customer_code","Customer ID","customer_id","Customer Code"),
    mac_address: get("mac_address","MAC Address","mac","MAC"),
    nid: get("nid","NID")
  };
  if (!d.name || !d.phone || !Number.isFinite(d.monthly_fee) || d.monthly_fee < 0) return null;
  if (!["active","inactive"].includes(d.status)) d.status = "active";
  d.import_key = makeImportKey(d);
  return d;
}
$("previewImportBtn").onclick = async () => {
  const file = $("customerImportFile").files[0];
  if (!file) return alert("প্রথমে Excel বা CSV ফাইল নির্বাচন করুন।");
  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, {type:"array", cellDates:true});
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:""});
    if (!raw.length) return alert("ফাইলে কোনো Customer row পাওয়া যায়নি।");
    const normalized = raw.map((r, i) => ({row:i+2, data:normalizeImportRow(r)}));
    const valid = normalized.filter(x => x.data);
    const invalid = normalized.filter(x => !x.data);
    const seen = new Set();
    const unique = [];
    const duplicateInFile = [];
    for (const item of valid) {
      if (seen.has(item.data.import_key)) duplicateInFile.push(item);
      else { seen.add(item.data.import_key); unique.push(item); }
    }
    const existingKeys = new Set(customers.map(c => c.import_key || makeImportKey(c)));
    const already = unique.filter(x => existingKeys.has(x.data.import_key));
    importRows = unique.filter(x => !existingKeys.has(x.data.import_key));
    importReport = [
      ...already.map(x => ({row:x.row,status:"Already exists",name:x.data.name})),
      ...duplicateInFile.map(x => ({row:x.row,status:"Duplicate in file",name:x.data.name})),
      ...invalid.map(x => ({row:x.row,status:"Invalid: name/phone/fee missing or invalid",name:""})),
      ...importRows.map(x => ({row:x.row,status:"Ready to import",name:x.data.name}))
    ];
    $("importSummary").textContent = `মোট ${raw.length} | নতুন ${importRows.length} | আগে আছে ${already.length} | ফাইলে Duplicate ${duplicateInFile.length} | ভুল row ${invalid.length}`;
    $("importPreviewWrap").innerHTML = `<table><thead><tr><th>Row</th><th>Name</th><th>Phone</th><th>Status</th></tr></thead><tbody>${importReport.slice(0,100).map(x=>`<tr><td>${x.row}</td><td>${esc(x.name)}</td><td>${esc((normalized.find(n=>n.row===x.row)?.data||{}).phone||"—")}</td><td>${esc(x.status)}</td></tr>`).join("")}</tbody></table>`;
    $("runImportBtn").disabled = importRows.length === 0;
    $("downloadImportReport").disabled = false;
  } catch (err) { alert("ফাইল পড়া যায়নি: " + err.message); }
};
$("runImportBtn").onclick = async () => {
  if (!importRows.length) return;
  if (!confirm(`${importRows.length} জন নতুন Customer Import করবেন?`)) return;
  $("runImportBtn").disabled = true;
  let inserted = 0, skipped = 0, errors = [];
  for (const item of importRows) {
    const {error} = await sb.from("customers").upsert(item.data, {onConflict:"import_key", ignoreDuplicates:true});
    if (error) { errors.push({row:item.row,status:error.message,name:item.data.name}); }
    else inserted++;
  }
  await loadAll();
  $("importSummary").textContent = `Import সম্পন্ন। সফল/নতুন: ${inserted} | Error: ${errors.length}.`;
  importReport = [...importReport.filter(x=>x.status!=="Ready to import"), ...errors];
  $("downloadImportReport").disabled = false;
  alert(`Import শেষ। সফল: ${inserted}, Error: ${errors.length}.`);
};
$("downloadImportReport").onclick = () => {
  const ws = XLSX.utils.json_to_sheet(importReport);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Import Report");
  XLSX.writeFile(wb, "miazi-import-report.xlsx");
};

// SAVE CUSTOMER
$("customerForm").onsubmit = async e => {
  e.preventDefault();

  const d = Object.fromEntries(new FormData(e.target));
  d.monthly_fee = Number(d.monthly_fee);
  d.package_id = d.package_id || null;
  d.connection_date = d.connection_date || todayISO();
  d.mac_address = d.mac_address || null;
  d.nid = d.nid || null;
  d.customer_code = d.customer_code || null;
  d.import_key = makeImportKey(d);

  const { error } = await sb.from("customers").insert(d);

  if (error) return alert(error.message);

  e.target.reset();
  setConnectionDateDefault();
  await loadAll();

  alert("Customer saved / গ্রাহক সংরক্ষিত");
};

// SAVE PACKAGE
$("packageForm").onsubmit = async e => {
  e.preventDefault();

  const d = Object.fromEntries(new FormData(e.target));
  d.price = Number(d.price);

  const { error } = await sb.from("packages").insert(d);
  if (error) return alert(error.message);

  e.target.reset();
  await loadAll();
};

// SAVE PAYMENT
$("paymentForm").onsubmit = async e => {
  e.preventDefault();

  const d = Object.fromEntries(new FormData(e.target));
  d.amount = Number(d.amount);

  const { error } = await sb.from("payments").insert(d);
  if (error) return alert(error.message);

  e.target.reset();
  await loadAll();

  alert("Payment saved / পেমেন্ট সংরক্ষিত");
};

// CUSTOMER SEARCH
$("customerSearch").oninput = e => {
  const q = e.target.value.toLowerCase();

  $("customerRows").innerHTML = customers
    .filter(c => [
      c.name,
      c.phone,
      c.username,
      c.mac_address,
      c.connection_date
    ].join(" ").toLowerCase().includes(q))
    .map(customerRow)
    .join("");
};

// AUTO LOGIN SESSION
(async () => {
  if (!sb) return;

  const { data: { session } } = await sb.auth.getSession();
  if (session) await init();
})();

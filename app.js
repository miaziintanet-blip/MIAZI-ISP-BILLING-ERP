// MIAZI ISP BILLING & ERP
const SUPABASE_URL = "https://waoijhpanpboksvcnqiq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_DbGYxusmvOLwlLzEC8D4OQ_KX9o_Srj";

let sb = null;
let currentPage = "dashboard";
let customerListFilter = "all";
let activeBillFilter = "all";
let customers = [], packages = [], payments = [], invoices = [], pops = [], areas = [], boxes = [], tickets = [], expenses = [];
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

  ["dashboard","customers","customerDetail","packages","payments","invoices","network","tickets","expenses","reports","settings"]
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
    invoices:"Invoices / বিল",
    network:"POP / Area / Box",
    tickets:"Support Tickets",
    expenses:"Expenses / খরচ",
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

document.querySelectorAll('[data-action="add-customer"]').forEach(b => {
  b.onclick = () => {
    customerListFilter = "all";
    renderCustomerRows();
    showPage("customers");
    const form = $("customerForm");
    form.scrollIntoView({behavior:"smooth", block:"start"});
    form.querySelector('[name="name"]').focus({preventScroll:true});
  };
});

document.querySelectorAll('[data-action="import-customer"]').forEach(b => {
  b.onclick = () => {
    customerListFilter = "all";
    renderCustomerRows();
    showPage("customers");
    const section = document.querySelectorAll("#customersPage > .section")[2];
    section.scrollIntoView({behavior:"smooth", block:"start"});
    $("customerImportFile").focus({preventScroll:true});
  };
});

function openCustomerList(filter) {
  customerListFilter = filter;
  activeBillFilter = filter === "active" ? "paid" : filter === "due" ? "due" : "all";
  $("customerSearch").value = "";
  renderCustomerRows();
  showPage("customers");
}
document.querySelectorAll("[data-dashboard-filter]").forEach(card => {
  const open = () => openCustomerList(card.dataset.dashboardFilter);
  card.addEventListener("click", open);
  card.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });
});

$("menuBtn").onclick = () =>
  $("sidebar").classList.toggle("open");

$("langBtn").onclick = () => {
  lang = lang === "both" ? "en" : "both";
  document.documentElement.lang = lang === "en" ? "en" : "bn";
  $("langBtn").textContent = lang === "en" ? "English" : "বাংলা / EN";
};

function setPreviewMode(mode) {
  document.body.classList.toggle("preview-desktop", mode === "desktop");
  document.body.classList.toggle("preview-mobile", mode === "mobile");
  [["desktopViewBtn","desktop"],["mobileViewBtn","mobile"],["autoViewBtn","auto"]].forEach(([id,value]) => {
    const button = $(id);
    button.classList.toggle("active", mode === value);
    button.setAttribute("aria-pressed", mode === value ? "true" : "false");
  });
  $("sidebar").classList.remove("open");
}
$("desktopViewBtn").onclick = () => setPreviewMode("desktop");
$("mobileViewBtn").onclick = () => setPreviewMode("mobile");
$("autoViewBtn").onclick = () => setPreviewMode("auto");
setPreviewMode("auto");

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
    loadPayments(),
    loadInvoices(),
    loadNetwork(),
    loadTickets(),
    loadExpenses()
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
    .select("id,customer_id,amount,method,note,paid_at,customers(name)")
    .order("paid_at", { ascending: false })
    .limit(1000);

  if (r.error) return alert(r.error.message);
  payments = r.data || [];
}

async function loadInvoices() {
  const r = await sb.from("invoices").select("*,customers(name,phone)").order("billing_month", {ascending:false}).limit(500);
  if (r.error) return alert("Invoice: " + r.error.message);
  invoices = r.data || [];
}
async function loadNetwork() {
  const [p,a,b] = await Promise.all([
    sb.from("pops").select("*").order("name"),
    sb.from("areas").select("*,pops(name)").order("name"),
    sb.from("boxes").select("*,pops(name),areas(name)").order("name")
  ]);
  if (p.error || a.error || b.error) return alert("POP/Area/Box: " + (p.error || a.error || b.error).message);
  pops = p.data || []; areas = a.data || []; boxes = b.data || [];
}
async function loadTickets() {
  const r = await sb.from("tickets").select("*,customers(name,phone)").order("opened_at", {ascending:false}).limit(300);
  if (r.error) return alert("Tickets: " + r.error.message);
  tickets = r.data || [];
}
async function loadExpenses() {
  const r = await sb.from("expenses").select("*").order("expense_date", {ascending:false}).limit(500);
  if (r.error) return alert("Expenses: " + r.error.message);
  expenses = r.data || [];
}

function customerRow(c) {
  const due = customerHasDue(c);
  const billStatus = c.status === "active" ? (due ? "due" : "paid") : "inactive";
  return `<tr data-customer-id="${esc(c.id)}" class="customer-row" style="cursor:pointer">
    <td>${esc(c.name)}</td>
    <td>${esc(c.phone)}</td>
    <td>${esc(c.username || "—")}</td>
    <td>${esc(c.mac_address || "—")}</td>
    <td>${esc(c.connection_date || "—")}</td>
    <td>${money(c.monthly_fee)}</td>
    <td><div class="actions" style="gap:5px;flex-wrap:nowrap">
      <button type="button" class="secondary setCustomerActiveBtn" data-set-customer-active="${esc(c.id)}" aria-pressed="${c.status === "active"}" style="padding:5px 9px;min-width:58px;opacity:${c.status === "active" ? "1" : ".8"};${c.status === "active" ? "border-color:#16a34a;color:#16a34a;font-weight:700;" : ""}">Paid</button>
      <button type="button" class="secondary" disabled aria-pressed="${billStatus === "due"}" style="padding:5px 9px;min-width:58px;opacity:${billStatus === "due" ? "1" : ".45"};${billStatus === "due" ? "border-color:#dc2626;color:#dc2626;font-weight:700;" : ""}">Due</button>
    </div>${billStatus === "inactive" ? '<small class="muted">Inactive</small>' : ""}</td>
  </tr>`;
}

function render() {
  $("totalCustomers").textContent = customers.length;

  $("activeCustomers").textContent =
    customers.filter(c => c.status === "active").length;

  $("dueCustomers").textContent = customers.filter(customerHasDue).length;

  $("collected").textContent =
    money(payments.reduce((a, p) => a + Number(p.amount), 0));

  $("customerPackage").innerHTML =
    '<option value="">Select / নির্বাচন</option>' +
    packages.map(p =>
      `<option value="${p.id}">${esc(p.name)} — ${money(p.price)}</option>`
    ).join("");

  const customerOptions = '<option value="">Select customer</option>' + customers.map(c => `<option value="${c.id}">${esc(c.name)} (${esc(c.phone)})</option>`).join("");
  $("paymentCustomer").innerHTML = customerOptions;
  $("ticketCustomer").innerHTML = customerOptions;
  const popOptions = '<option value="">Select POP</option>' + pops.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  ["customerPop","areaPop","boxPop"].forEach(id => $(id).innerHTML = popOptions);
  const areaOptions = '<option value="">Select Area</option>' + areas.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("");
  $("customerArea").innerHTML = areaOptions;
  $("boxArea").innerHTML = areaOptions;
  $("customerBox").innerHTML = '<option value="">Select Box</option>' + boxes.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join("");
  $("popRows").innerHTML = pops.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.address)}</td><td>${esc(p.contact_person)}</td><td>${esc(p.phone)}</td></tr>`).join("");
  $("areaRows").innerHTML = areas.map(a => `<tr><td>${esc(a.name)}</td><td>${esc(a.pops?.name || "—")}</td></tr>`).join("");
  $("boxRows").innerHTML = boxes.map(b => `<tr><td>${esc(b.name)}</td><td>${esc(b.areas?.name || "—")}</td><td>${esc(b.pops?.name || "—")}</td><td>${esc(b.splitter_ratio)}</td><td>${esc(b.capacity)}</td></tr>`).join("");
  const statusFilter = $("invoiceStatusFilter").value;
  $("invoiceRows").innerHTML = invoices.filter(i => !statusFilter || i.status === statusFilter).map(i => {
    const due = Math.max(0,Number(i.amount)-Number(i.paid_amount));
    return `<tr><td>${esc(i.invoice_no)}</td><td>${esc(i.customers?.name || "—")}</td><td>${esc(String(i.billing_month).slice(0,7))}</td><td>${money(i.amount)}</td><td>${money(i.paid_amount)}</td><td>${money(due)}</td><td><span class="pill">${esc(i.status)}</span></td></tr>`;
  }).join("");
  $("ticketRows").innerHTML = tickets.map(t => `<tr><td>${new Date(t.opened_at).toLocaleDateString()}</td><td>${esc(t.customers?.name || "—")}</td><td>${esc(t.subject)}</td><td>${esc(t.priority)}</td><td>${esc(t.status)}</td><td><select data-ticket-id="${t.id}" class="ticketStatus"><option value="open" ${t.status==="open"?"selected":""}>Open</option><option value="in_progress" ${t.status==="in_progress"?"selected":""}>In progress</option><option value="resolved" ${t.status==="resolved"?"selected":""}>Resolved</option><option value="closed" ${t.status==="closed"?"selected":""}>Closed</option></select></td></tr>`).join("");
  $("expenseRows").innerHTML = expenses.map(x => `<tr><td>${esc(x.expense_date)}</td><td>${esc(x.category)}</td><td>${esc(x.description)}</td><td>${money(x.amount)}</td><td>${esc(x.payment_method)}</td></tr>`).join("");
  const totalDue = invoices.reduce((s,i) => s + Math.max(0,Number(i.amount)-Number(i.paid_amount)),0)
    + customers.reduce((s,c) => s + Number(c.due_amount || 0),0);
  const totalExpenses = expenses.reduce((s,x) => s + Number(x.amount),0);
  const totalPaid = payments.reduce((s,p) => s + Number(p.amount),0);
  $("reportDue").textContent = money(totalDue);
  $("reportPaid").textContent = money(totalPaid);
  $("reportExpense").textContent = money(totalExpenses);
  $("reportNet").textContent = money(totalPaid-totalExpenses);

  renderCustomerRows();

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
  if (e.target.closest(".markDuePaidBtn")) return;
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
      ${detailField("আগের বকেয়া / Opening Due", money(c.due_amount))}
      ${detailField("বকেয়া মাস / Due Month", c.due_month ? formatBillingMonth(c.due_month) : "মাস নির্বাচন হয়নি")}
      ${detailField("Address", c.address)}
    </div>
    <div class="section" style="margin-top:16px">
      <h2>আগের বকেয়া যোগ / পরিবর্তন</h2>
      <p class="muted">বকেয়া টাকার সঙ্গে যে মাসের বিল বকেয়া, সেই মাস নির্বাচন করুন। বকেয়া না থাকলে 0 দিন।</p>
      <form id="openingDueForm" data-customer-id="${esc(c.id)}" class="formgrid">
        <div><label>বকেয়া টাকা / Opening Due</label><input name="due_amount" type="number" min="0" step="0.01" value="${Number(c.due_amount || 0)}" required></div>
        <div><label>বকেয়া মাস / Due Month</label><input name="due_month" type="month" value="${esc(c.due_month || "")}" ${Number(c.due_amount || 0) > 0 ? "required" : ""}></div>
        <div style="align-self:end"><button type="submit">বকেয়া সংরক্ষণ করুন</button></div>
      </form>
    </div>
    <div class="section" style="margin-top:16px">
      <h2>মাসভিত্তিক Paid / Due সংশোধন</h2>
      <p class="muted">ভুল মাসের বিল ঠিক করুন। Paid করলে ওই মাসের বিল সম্পূর্ণ পরিশোধিত হবে, Due করলে ওই মাসের পরিশোধিত অঙ্ক 0 হবে। এটি পেমেন্টের ইতিহাস মুছবে না।</p>
      <div class="tablewrap">
        <table><thead><tr><th>মাস</th><th>বিল</th><th>জমা</th><th>বকেয়া</th><th>সংশোধন</th></tr></thead>
        <tbody>
          ${invoices.filter(i => String(i.customer_id) === String(c.id)).map(i => {
            const due = Math.max(0, Number(i.amount) - Number(i.paid_amount));
            const status = due <= 0 ? "paid" : "due";
            return `<tr><td>${esc(formatBillingMonth(i.billing_month))}</td><td>${money(i.amount)}</td><td>${money(i.paid_amount)}</td><td>${money(due)}</td>
              <td><form class="invoiceCorrectionForm" data-invoice-id="${esc(i.id)}" style="display:flex;gap:6px;min-width:190px">
                <select name="bill_status" aria-label="বিলের অবস্থা"><option value="due" ${status==="due"?"selected":""}>Due / বকেয়া</option><option value="paid" ${status==="paid"?"selected":""}>Paid / পরিশোধিত</option></select>
                <button type="submit">Save</button>
              </form></td></tr>`;
          }).join("") || '<tr><td colspan="5">এই গ্রাহকের কোনো মাসিক বিল তৈরি হয়নি।</td></tr>'}
        </tbody></table>
      </div>
    </div>`;
  showPage("customerDetail");
});
$("customerDetailContent").addEventListener("submit", async e => {
  const correctionForm = e.target.closest(".invoiceCorrectionForm");
  if (correctionForm) {
    e.preventDefault();
    const invoiceId = correctionForm.dataset.invoiceId;
    const invoice = invoices.find(i => String(i.id) === String(invoiceId));
    if (!invoice) return alert("বিলটি পাওয়া যায়নি।");
    const nextStatus = new FormData(correctionForm).get("bill_status");
    if (!["paid","due"].includes(nextStatus)) return;
    const isPaid = nextStatus === "paid";
    const question = isPaid
      ? "এই মাসের বিল সম্পূর্ণ Paid করবেন?"
      : "এই মাসের বিলের জমা 0 করে Due করবেন?";
    if (!confirm(question + "\nপেমেন্টের ইতিহাস অপরিবর্তিত থাকবে।")) return;
    const {error} = await sb.from("invoices")
      .update({paid_amount:isPaid ? Number(invoice.amount) : 0, status:isPaid ? "paid" : "unpaid"})
      .eq("id", invoiceId);
    if (error) return alert("বিলের অবস্থা পরিবর্তন হয়নি: " + error.message);
    await loadAll();
    const customer = customers.find(c => String(c.id) === String(invoice.customer_id));
    if (customer) {
      customerListFilter = "all";
      renderCustomerRows();
      const row = [...document.querySelectorAll(".customer-row[data-customer-id]")].find(el => el.dataset.customerId === String(customer.id));
      if (row) row.click();
    }
    alert("বিলের অবস্থা সংশোধন হয়েছে।");
    return;
  }
  if (e.target.id !== "openingDueForm") return;
  e.preventDefault();
  const customerId = e.target.dataset.customerId;
  const formData = new FormData(e.target);
  const dueAmount = Number(formData.get("due_amount"));
  const dueMonth = String(formData.get("due_month") || "");
  if (!Number.isFinite(dueAmount) || dueAmount < 0) return alert("সঠিক বকেয়া টাকা লিখুন।");
  if (dueAmount > 0 && !dueMonth) return alert("বকেয়া মাস নির্বাচন করুন।");
  const { error } = await sb.from("customers").update({due_amount:dueAmount,due_month:dueMonth || null}).eq("id",customerId);
  if (error) return alert("বকেয়া সংরক্ষণ হয়নি: " + error.message);
  await loadAll();
  const customer = customers.find(c => String(c.id) === String(customerId));
  if (customer) {
    const input = $("customerDetailContent").querySelector("input[name='due_amount']");
    if (input) input.value = Number(customer.due_amount || 0);
    const monthInput = $("customerDetailContent").querySelector("input[name='due_month']");
    if (monthInput) monthInput.value = customer.due_month || "";
    const dueCard = [...$("customerDetailContent").querySelectorAll(".card")].find(el => el.textContent.includes("আগের বকেয়া"));
    if (dueCard) dueCard.querySelector("b").textContent = money(customer.due_amount);
  }
  alert("আগের বকেয়া সংরক্ষণ হয়েছে। Due Customer তালিকা আপডেট হয়েছে।");
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
  d.due_amount = Number(d.due_amount || 0);
  d.package_id = d.package_id || null;
  d.connection_date = d.connection_date || todayISO();
  d.mac_address = d.mac_address || null;
  d.nid = d.nid || null;
  d.customer_code = d.customer_code || null;
  d.email = d.email || null;
  d.pop_id = d.pop_id || null; d.area_id = d.area_id || null; d.box_id = d.box_id || null;
  d.bill_cycle = Number(d.bill_cycle || 1);
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

  // Apply this payment to the customer's oldest open invoices first.
  let remaining = d.amount;
  const openResult = await sb.from("invoices").select("*").eq("customer_id",d.customer_id)
    .in("status",["unpaid","partial"]).order("billing_month",{ascending:true});
  if (openResult.error) {
    alert("Payment saved, but invoice allocation needs attention: " + openResult.error.message);
  } else {
    for (const inv of (openResult.data || [])) {
      if (remaining <= 0) break;
      const due = Math.max(0,Number(inv.amount)-Number(inv.paid_amount));
      const applied = Math.min(remaining,due);
      const paid = Number(inv.paid_amount)+applied;
      const status = paid >= Number(inv.amount) ? "paid" : "partial";
      const upd = await sb.from("invoices").update({paid_amount:paid,status}).eq("id",inv.id);
      if (upd.error) { alert("Payment saved, invoice update failed: " + upd.error.message); break; }
      remaining -= applied;
    }
  }

  e.target.reset();
  await loadAll();

  alert("Payment saved / পেমেন্ট সংরক্ষিত" + (remaining > 0 ? ". অগ্রিম/অবণ্টিত টাকা: " + money(remaining) : ""));
};

// DASHBOARD CUSTOMER FILTERS AND CUSTOMER SEARCH
function customerHasDue(c) {
  const customerInvoices = invoices.filter(i => String(i.customer_id) === String(c.id));
  return Number(c.due_amount || 0) > 0 ||
    customerInvoices.some(i => Math.max(0, Number(i.amount) - Number(i.paid_amount)) > 0);
}
function customerHasCollected(c) {
  return payments.some(p => String(p.customer_id) === String(c.id) && Number(p.amount) > 0);
}
function formatBillingMonth(value) {
  if (!value) return "—";
  const raw = String(value).slice(0, 7);
  const parts = raw.split("-");
  if (parts.length !== 2) return raw;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
  return date.toLocaleDateString("bn-BD", {month:"long", year:"numeric"});
}
function renderCustomerRows() {
  const activeFilters = $("activeBillFilters");
  if (activeFilters) {
    activeFilters.classList.remove("hidden");
    [["activeActiveFilter","active"],["activeDueFilter","due"],["activePaidFilter","paid"]].forEach(([id,value]) => {
      const button = $(id);
      button.classList.toggle("active", customerListFilter === value);
      button.setAttribute("aria-pressed", customerListFilter === value ? "true" : "false");
    });
  }
  const customerSections = document.querySelectorAll("#customersPage > .section");
  if (customerSections[1]) customerSections[1].classList.toggle("hidden", customerListFilter === "due");
  if (customerSections[2]) customerSections[2].classList.toggle("hidden", customerListFilter === "due");
  const q = ($("customerSearch").value || "").toLowerCase().trim();
  const filtered = customers.filter(c => {
    if (customerListFilter === "active" && c.status !== "active") return false;
    if (customerListFilter === "paid" && (c.status !== "active" || customerHasDue(c))) return false;
    if (customerListFilter === "due" && !customerHasDue(c)) return false;
    if (customerListFilter === "collected" && !customerHasCollected(c)) return false;
    return [c.name,c.phone,c.username,c.mac_address,c.connection_date,c.customer_code,c.address]
      .join(" ").toLowerCase().includes(q);
  });
  const head = $("customerRows").closest("table").querySelector("thead");
  if (customerListFilter === "due") {
    head.innerHTML = '<tr><th>গ্রাহকের নাম</th><th>ইউজার নেম</th><th>মোবাইল নম্বর</th><th>ঠিকানা</th><th>মাসের নাম</th><th>মাসিক বিল</th><th>বকেয়া</th><th>পরিশোধের অবস্থা</th></tr>';
    const rows = filtered.flatMap(c => {
      const open = invoices.filter(i => String(i.customer_id) === String(c.id))
        .map(i => ({invoice:i, due:Math.max(0,Number(i.amount)-Number(i.paid_amount))}))
        .filter(x => x.due > 0);
      const entries = [...open];
      if (Number(c.due_amount || 0) > 0) {
        entries.push({invoice:null,due:Number(c.due_amount || 0),opening:true});
      }
      return entries.map(({invoice,due,opening}) => {
        const paid = Number(invoice?.paid_amount || 0);
        const status = paid > 0 ? "Partial / আংশিক" : "Unpaid / অপরিশোধিত";
        const billMonth = opening ? (c.due_month ? formatBillingMonth(c.due_month) : "আগের") : formatBillingMonth(invoice?.billing_month);
        const reminderMessage = "প্রিয় " + c.name + ", আপনার " + billMonth + " মাসের ইন্টারনেট বিল " + money(due) + " বকেয়া রয়েছে। অনুগ্রহ করে পরিশোধ করুন। — MIAZI Internet";
        const whatsappPhone = String(c.phone || "").replace(/\\D/g, "").replace(/^0/, "880");
        return `<tr data-customer-id="${esc(c.id)}" class="customer-row" style="cursor:pointer">
          <td>${esc(c.name)}</td><td>${esc(c.username || "—")}</td><td>${esc(c.phone)}</td>
          <td>${esc(c.address || "—")}</td><td>${opening ? (c.due_month ? esc(formatBillingMonth(c.due_month)) : "মাস নির্বাচন হয়নি") : esc(formatBillingMonth(invoice?.billing_month))}</td>
          <td>${money(invoice?.amount ?? due)}</td><td>${money(due)}</td>
          <td><span class="pill danger">${status}</span><br><a class="secondary" href="https://wa.me/${whatsappPhone}?text=${encodeURIComponent(reminderMessage)}" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none;margin-top:6px;padding:7px 10px;border-radius:7px">WhatsApp Reminder</a><br><button type="button" class="secondary imoReminderBtn" data-message="${esc(reminderMessage)}" style="margin-top:6px;padding:7px 10px">IMO Reminder</button><br><a class="secondary" href="sms:${esc(c.phone || "")}?body=${encodeURIComponent(reminderMessage)}" style="display:inline-block;text-decoration:none;margin-top:6px;padding:7px 10px;border-radius:7px">SMS Reminder / SMS পাঠান</a><br><button type="button" class="markDuePaidBtn" data-mark-due-paid="${opening ? "opening" : "invoice"}" data-customer-id="${esc(c.id)}" ${invoice ? `data-invoice-id="${esc(invoice.id)}"` : ""} style="margin-top:6px;padding:7px 10px">Paid / পরিশোধ</button></td></tr>`;
      });
    }).join("");
    $("customerRows").innerHTML = rows || '<tr><td colspan="8">কোনো বকেয়া গ্রাহক পাওয়া যায়নি।</td></tr>';
  } else {
    head.innerHTML = customerListFilter === "active"
      ? '<tr><th>Name</th><th>Phone</th><th>Username</th><th>MAC</th><th>Connection Date</th><th>Monthly</th><th>Bill Status / বিলের অবস্থা</th></tr>'
      : '<tr><th>Name</th><th>Phone</th><th>Username</th><th>MAC</th><th>Connection Date</th><th>Monthly</th><th>Status</th></tr>';
    $("customerRows").innerHTML = filtered.length
      ? filtered.map(customerRow).join("")
      : '<tr><td colspan="7">এই তালিকায় কোনো গ্রাহক পাওয়া যায়নি।</td></tr>';
  }
  const labels = {all:"সব গ্রাহক",active:"Active Customer / চালু গ্রাহক",paid:"Paid Customer / বিল পরিশোধিত গ্রাহক",due:"Due Customer / বকেয়া গ্রাহক",collected:"পেমেন্ট করা গ্রাহক"};
  const heading = document.querySelector("#customersPage .section h2");
  if (heading) heading.textContent = "Customer List / " + labels[customerListFilter] + " (" + (customerListFilter === "due" ? filtered.reduce((n,c)=>n + (invoices.some(i=>String(i.customer_id)===String(c.id)) ? invoices.filter(i=>String(i.customer_id)===String(c.id) && Math.max(0,Number(i.amount)-Number(i.paid_amount))>0).length : 1),0) : filtered.length) + ")";
}
$("customerRows").addEventListener("click", async e => {
  const imoButton = e.target.closest(".imoReminderBtn");
  if (imoButton) {
    e.stopPropagation();
    const message = imoButton.dataset.message || "";
    window.open("https://imo.im/", "_blank", "noopener");
    try {
      await navigator.clipboard.writeText(message);
      alert("বিলের রিমাইন্ডার বার্তা কপি হয়েছে। IMO-তে গ্রাহকের চ্যাট খুলে পেস্ট করে পাঠান।");
    } catch {
      window.prompt("এই বার্তাটি কপি করে IMO-তে পাঠান:", message);
    }
    return;
  }
  const activateButton = e.target.closest(".setCustomerActiveBtn");
  if (activateButton) {
    e.stopPropagation();
    const customerId = activateButton.dataset.setCustomerActive;
    const customer = customers.find(c => String(c.id) === String(customerId));
    if (!customer) return alert("গ্রাহক পাওয়া যায়নি।");
    if (customer.status === "active") return alert("এই গ্রাহক ইতিমধ্যে Active Customer তালিকায় আছেন। বকেয়া থাকলে Due তালিকাতেও থাকবেন।");
    if (!confirm(customer.name + " — গ্রাহককে Active Customer তালিকায় যোগ করবেন? বকেয়া বিল Due-ই থাকবে।")) return;
    const result = await sb.from("customers").update({status:"active"}).eq("id",customerId);
    if (result.error) return alert("Status পরিবর্তন হয়নি: " + result.error.message);
    await loadAll();
    customerListFilter = "all";
    activeBillFilter = "all";
    $("customerSearch").value = "";
    renderCustomerRows();
    showPage("customers");
    alert("গ্রাহক Active Customer তালিকায় যোগ হয়েছে। বকেয়া বিল Due হিসেবেই রাখা হয়েছে।");
    return;
  }
  const paidButton = e.target.closest(".markDuePaidBtn");
  if (!paidButton) return;
  e.stopPropagation();
  const customerId = paidButton.dataset.customerId;
  const customer = customers.find(c => String(c.id) === String(customerId));
  if (!customer) return alert("গ্রাহক পাওয়া যায়নি।");
  const kind = paidButton.dataset.markDuePaid;
  const invoice = kind === "invoice"
    ? invoices.find(i => String(i.id) === String(paidButton.dataset.invoiceId))
    : null;
  const dueAmount = kind === "opening"
    ? Number(customer.due_amount || 0)
    : invoice ? Math.max(0, Number(invoice.amount) - Number(invoice.paid_amount)) : 0;
  if (!dueAmount || dueAmount <= 0) return alert("এই বিলে বকেয়া নেই।");
  if (!confirm(customer.name + " — " + money(dueAmount) + " টাকা Paid হিসেবে চিহ্নিত করবেন?")) return;
  const payment = await sb.from("payments").insert({
    customer_id: customerId,
    amount: dueAmount,
    method: "Cash",
    note: kind === "opening" ? "Opening due cleared from Due Customer list" : "Invoice due cleared from Due Customer list"
  });
  if (payment.error) return alert("পেমেন্ট রেকর্ড সংরক্ষণ হয়নি: " + payment.error.message);
  if (kind === "opening") {
    const result = await sb.from("customers").update({due_amount:0,due_month:null,status:"active"}).eq("id",customerId);
    if (result.error) return alert("পেমেন্ট রেকর্ড হয়েছে, কিন্তু বকেয়া আপডেট হয়নি: " + result.error.message);
  } else {
    const result = await sb.from("invoices").update({paid_amount:Number(invoice.amount),status:"paid"}).eq("id",invoice.id);
    if (result.error) return alert("পেমেন্ট রেকর্ড হয়েছে, কিন্তু বিল আপডেট হয়নি: " + result.error.message);
    const statusResult = await sb.from("customers").update({status:"active"}).eq("id",customerId);
    if (statusResult.error) return alert("বিল Paid হয়েছে, কিন্তু Customer Active করা যায়নি: " + statusResult.error.message);
  }
  await loadAll();
  customerListFilter = "due";
  activeBillFilter = "due";
  $("customerSearch").value = "";
  renderCustomerRows();
  showPage("customers");
  alert("Paid সফল হয়েছে। বকেয়া থাকলে Due তালিকায় থাকবে, সব বকেয়া শেষ হলে Active Customer-এর Paid তালিকায় যাবে।");
});
$("customerSearch").oninput = renderCustomerRows;

function setActiveBillFilter(filter) {
  customerListFilter = ["active","due","paid"].includes(filter) ? filter : "all";
  activeBillFilter = filter;
  $("customerSearch").value = "";
  renderCustomerRows();
  showPage("customers");
}
$("activeActiveFilter").onclick = () => setActiveBillFilter("active");
$("activeDueFilter").onclick = () => setActiveBillFilter("due");
$("activePaidFilter").onclick = () => setActiveBillFilter("paid");


// NETWORK, BILLING, SUPPORT AND EXPENSES
function formData(form) { return Object.fromEntries(new FormData(form)); }
async function insertForm(formId, table, numericFields=[]) {
  const form = $(formId); const d = formData(form);
  numericFields.forEach(k => d[k] = d[k] === "" ? null : Number(d[k]));
  ["pop_id","area_id","box_id","customer_id"].forEach(k => { if (d[k] === "") d[k] = null; });
  const {error} = await sb.from(table).insert(d);
  if (error) return alert(error.message);
  form.reset();
  if (formId === "expenseForm") $("expenseDate").value = todayISO();
  await loadAll();
  alert("Saved successfully / সংরক্ষণ হয়েছে");
}
$("popForm").onsubmit = e => { e.preventDefault(); insertForm("popForm","pops"); };
$("areaForm").onsubmit = e => { e.preventDefault(); insertForm("areaForm","areas"); };
$("boxForm").onsubmit = e => { e.preventDefault(); insertForm("boxForm","boxes",["capacity"]); };
$("ticketForm").onsubmit = e => { e.preventDefault(); insertForm("ticketForm","tickets"); };
$("expenseForm").onsubmit = e => { e.preventDefault(); insertForm("expenseForm","expenses",["amount"]); };
$("generateBillsBtn").onclick = async () => {
  const month = $("billingMonth").value;
  if (!month) return alert("প্রথমে বিলের মাস নির্বাচন করুন।");
  const billDate = month + "-01";
  const active = customers.filter(c => c.status === "active");
  if (!active.length) return alert("কোনো Active customer নেই।");
  if (!confirm(month + " মাসের " + active.length + " জন Active customer-এর বিল তৈরি করবেন?")) return;
  const rows = active.map(c => ({
    customer_id:c.id, invoice_no:"MZ-"+month.replace("-","")+"-"+String(c.id).replace(/-/g,"").slice(-10),
    billing_month:billDate, amount:Number(c.monthly_fee || 0), paid_amount:0, status:"unpaid"
  }));
  const {data,error} = await sb.from("invoices").upsert(rows,{onConflict:"customer_id,billing_month",ignoreDuplicates:true}).select("id");
  if (error) return alert(error.message);
  await loadAll(); render();
  alert("বিল তৈরির কাজ শেষ। নতুন তৈরি হয়েছে: " + (data?.length ?? 0) + " টি। আগে তৈরি থাকা বিল পুনরায় যোগ হয়নি।");
};
$("invoiceStatusFilter").onchange = render;
$("ticketRows").addEventListener("change", async e => {
  const sel = e.target.closest(".ticketStatus"); if (!sel) return;
  const {error} = await sb.from("tickets").update({status:sel.value,closed_at:["resolved","closed"].includes(sel.value)?new Date().toISOString():null}).eq("id",sel.dataset.ticketId);
  if (error) return alert(error.message);
  await loadTickets(); render();
});
$("customerPop").addEventListener("change", e => {
  const related = areas.filter(a => !a.pop_id || a.pop_id === e.target.value);
  $("customerArea").innerHTML = '<option value="">Select Area</option>' + related.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join("");
});
$("boxPop").addEventListener("change", e => {
  const related = areas.filter(a => !a.pop_id || a.pop_id === e.target.value);
  $("boxArea").innerHTML = '<option value="">Select Area</option>' + related.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join("");
});
$("expenseDate").value = todayISO();
$("billingMonth").value = todayISO().slice(0,7);

// AUTO LOGIN SESSION
(async () => {
  if (!sb) return;

  const { data: { session } } = await sb.auth.getSession();
  if (session) await init();
})();

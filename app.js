const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "visitease_visitors_v1";
let visitors = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let chartMain, chartReport, currentPassId = null, html5QrScanner = null;

const today = () => new Date().toISOString().slice(0,10);
const fmtDate = d => d ? new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const fmtTime = d => d ? new Date(d).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : "—";
const save = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(visitors)); renderAll(); };
const id = () => "VP" + Date.now().toString().slice(-8) + Math.floor(Math.random()*90+10);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const toast = msg => { const t=$("toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2600); };
const statusClass = s => s.replace(/\s+/g,"-");
function statusPill(s){return `<span class="status ${statusClass(s)}">${esc(s)}</span>`}
function person(name,sub=""){return `<div class="person-cell"><div class="person-mini">${esc((name||"V").split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase())}</div><div><b>${esc(name)}</b><small>${esc(sub)}</small></div></div>`}
function nav(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+page));
  document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  const titles={dashboard:"Dashboard overview",register:"Register visitor",passes:"Digital visitor passes",tracking:"Live visitor tracking",approvals:"Approval requests",history:"Visitor history",reports:"Reports & analytics"};
  $("pageTitle").textContent=titles[page]||"VisitEase";
  $("sidebar").classList.remove("open");
  if(page==="reports") drawReportChart();
}
document.querySelectorAll(".nav-link").forEach(b=>b.addEventListener("click",()=>nav(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>nav(b.dataset.go)));
$("mobileMenu").onclick=()=>$("sidebar").classList.toggle("open");
$("todayLabel").textContent=new Date().toLocaleDateString("en-IN",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});
$("visitorForm").elements.visitDate.value=today();
$("visitorForm").elements.entryTime.value=new Date().toTimeString().slice(0,5);

$("visitorForm").addEventListener("submit",e=>{
  e.preventDefault();
  const f=new FormData(e.currentTarget), v=Object.fromEntries(f.entries());
  if(!/^[0-9]{10}$/.test(v.phone)){toast("Enter a valid 10-digit mobile number.");return}
  const record={...v,id:id(),createdAt:new Date().toISOString(),status:"Pending",checkIn:null,checkOut:null};
  visitors.unshift(record);save();e.currentTarget.reset();e.currentTarget.elements.visitDate.value=today();e.currentTarget.elements.entryTime.value=new Date().toTimeString().slice(0,5);
  showPass(record.id);toast("Visitor registered. Pass created and sent for approval.");
  nav("passes");
});

function showPass(passId){
  const v=visitors.find(x=>x.id===passId);if(!v)return;
  currentPassId=passId;
  $("modalPassContent").innerHTML=`<div class="visitor-pass" id="printablePass">
    <div class="pass-brand"><span>V</span> VisitEase <small style="margin-left:auto;color:#8795aa;font:600 8px 'DM Sans'">VISITOR ACCESS PASS</small></div>
    <div class="pass-title"><h2>VISITOR PASS</h2><p>DIGITAL IDENTITY & ACCESS</p></div>
    <div class="pass-body"><div class="qr-box"><div id="passQr"></div></div><div class="pass-details">
      <div><small>VISITOR NAME</small><b>${esc(v.name)}</b></div><div><small>HOST</small><b>${esc(v.host)}</b></div>
      <div><small>DEPARTMENT</small><b>${esc(v.department)}</b></div><div><small>VISIT DATE</small><b>${fmtDate(v.visitDate)}</b></div>
      <div><small>STATUS</small><b>${esc(v.status)}</b></div>
    </div></div><div class="pass-code">PASS ID: <b>${esc(v.id)}</b><br>Show this QR code at the security desk.</div></div>`;
  $("passModal").classList.add("show");
  new QRCode($("passQr"),{text:JSON.stringify({passId:v.id}),width:112,height:112,colorDark:"#172746",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});
}
$("closeModal").onclick=()=>$("passModal").classList.remove("show");
$("passModal").addEventListener("click",e=>{if(e.target===$("passModal"))$("passModal").classList.remove("show")});
$("printPass").onclick=()=>{const content=$("printablePass").outerHTML;const w=window.open("","_blank","width=600,height=700");if(!w){toast("Allow pop-ups to print the pass.");return}w.document.write(`<html><head><title>Visitor Pass</title><style>body{font-family:Arial;padding:30px}.visitor-pass{border:1px dashed #aaa;padding:25px;max-width:430px;margin:auto}.pass-brand{font-weight:bold}.pass-title{text-align:center;margin:25px}.pass-body{display:flex;gap:20px;align-items:center}.pass-details{font-size:12px}.pass-details div{margin:10px 0}.pass-details small{display:block;color:#777}.pass-code{text-align:center;margin-top:20px;font-size:11px}</style></head><body>${content}</body></html>`);w.document.close();setTimeout(()=>w.print(),400)};
$("downloadPass").onclick=()=>downloadPassPdf(currentPassId);
function downloadPassPdf(passId){
  const v=visitors.find(x=>x.id===passId);if(!v)return;
  const {jsPDF}=window.jspdf;const doc=new jsPDF();
  doc.setFillColor(23,43,76);doc.roundedRect(15,15,180,22,3,3,"F");doc.setTextColor(255,255,255);doc.setFontSize(18);doc.text("VisitEase - Visitor Pass",23,29);
  doc.setTextColor(35,48,70);doc.setFontSize(12);
  [["Visitor name",v.name],["Pass ID",v.id],["Mobile",v.phone],["Email",v.email||"—"],["Company",v.company||"—"],["Host",v.host],["Department",v.department],["Purpose",v.purpose],["Visit date",fmtDate(v.visitDate)],["Expected entry",v.entryTime],["Duration",v.duration],["Status",v.status]].forEach((x,i)=>{doc.setTextColor(120,130,148);doc.text(x[0].toUpperCase(),22,52+i*13);doc.setTextColor(35,48,70);doc.text(String(x[1]),78,52+i*13)});
  doc.setFontSize(9);doc.setTextColor(120,130,148);doc.text("Present this pass to security at the entrance.",22,220);doc.save(`${v.id}-visitor-pass.pdf`);
}
function renderAll(){renderDashboard();renderPasses();renderTracking();renderApprovals();renderHistory();renderReports();$("approvalBadge").textContent=visitors.filter(v=>v.status==="Pending").length}
function renderDashboard(){
  const t=today(),inside=visitors.filter(v=>v.status==="Inside").length,pending=visitors.filter(v=>v.status==="Pending").length;
  $("statTotal").textContent=visitors.length;$("statToday").textContent=visitors.filter(v=>v.visitDate===t).length;$("statInside").textContent=inside;$("statPending").textContent=pending;
  $("recentTable").innerHTML=visitors.slice(0,5).map(v=>`<tr><td>${person(v.name,v.company||v.phone)}</td><td>${esc(v.id)}</td><td>${esc(v.host)}</td><td>${fmtDate(v.visitDate)}</td><td>${statusPill(v.status)}</td></tr>`).join("")||`<tr><td colspan="5" class="empty">No visitors registered yet.</td></tr>`;
  const statuses=[["Approved",visitors.filter(v=>v.status==="Approved").length,"#356df3"],["Inside",inside,"#159b72"],["Pending",pending,"#e3a13d"],["Checked out",visitors.filter(v=>v.status==="Checked out").length,"#8b75d7"],["Rejected",visitors.filter(v=>v.status==="Rejected").length,"#d9535d"]];
  $("statusSummary").innerHTML=statuses.map(s=>`<div class="status-item"><span><i class="dot" style="background:${s[2]}"></i>${s[0]}</span><b>${s[1]}</b></div>`).join("");
  drawMainChart();
}
function chartData(){const labels=[];const values=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=d.toISOString().slice(0,10);labels.push(d.toLocaleDateString("en-IN",{weekday:"short"}));values.push(visitors.filter(v=>v.visitDate===key).length)}return {labels,values}}
function drawChart(canvas,old,options){if(old)old.destroy();return new Chart($(canvas),options)}
function chartOptions(){const d=chartData();return {type:"bar",data:{labels:d.labels,datasets:[{label:"Visitors",data:d.values,backgroundColor:"#4779f5",borderRadius:6,maxBarThickness:28}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:"#8995a8",font:{size:10}}},y:{beginAtZero:true,ticks:{precision:0,color:"#8995a8"},grid:{color:"#edf0f5"}}}}}}
function drawMainChart(){if(!$("visitorChart"))return;chartMain=drawChart("visitorChart",chartMain,chartOptions())}
function drawReportChart(){chartReport=drawChart("reportChart",chartReport,chartOptions())}
function renderPasses(){
 const q=($("passSearch")?.value||"").toLowerCase(),filter=$("passFilter")?.value||"all";
 const list=visitors.filter(v=>(v.name+" "+v.id).toLowerCase().includes(q)&&(filter==="all"||v.status===filter));
 $("passGrid").innerHTML=list.map(v=>`<article class="pass-card"><div class="pass-card-head"><span class="tag">${esc(v.id)}</span>${statusPill(v.status)}</div><h3>${esc(v.name)}</h3><p>${esc(v.company||"Individual visitor")} · ${esc(v.phone)}</p><div class="pass-meta"><div><small>HOST</small><b>${esc(v.host)}</b></div><div><small>VISIT DATE</small><b>${fmtDate(v.visitDate)}</b></div><div><small>DEPARTMENT</small><b>${esc(v.department)}</b></div><div><small>PURPOSE</small><b>${esc(v.purpose)}</b></div></div><div class="pass-actions"><button class="btn btn-outline" onclick="showPass('${v.id}')">View pass</button><button class="btn btn-primary" onclick="downloadPassPdf('${v.id}')">↓ PDF</button></div></article>`).join("")||`<div class="panel empty">No matching visitor passes.</div>`;
}
$("passSearch").addEventListener("input",renderPasses);$("passFilter").addEventListener("change",renderPasses);
function renderTracking(){
 const t=today(),inside=visitors.filter(v=>v.status==="Inside"),out=visitors.filter(v=>v.status==="Checked out"&&v.visitDate===t);
 $("trackingInside").textContent=inside.length;$("trackingOut").textContent=out.length;$("trackingExpected").textContent=visitors.filter(v=>v.visitDate===t&&["Approved","Inside","Checked out"].includes(v.status)).length;
 $("trackingTable").innerHTML=inside.map(v=>`<tr><td>${person(v.name,v.phone)}</td><td>${esc(v.id)}</td><td>${esc(v.host)}</td><td>${fmtTime(v.checkIn)}</td><td>${duration(v.checkIn)}</td><td><button class="action-btn checkout-btn" onclick="checkOut('${v.id}')">Check out</button></td></tr>`).join("")||`<tr><td colspan="6" class="empty">No visitors are currently inside.</td></tr>`;
}
function duration(start){if(!start)return"—";let m=Math.max(0,Math.floor((Date.now()-new Date(start))/60000));return `${Math.floor(m/60)}h ${m%60}m`}
function checkIn(passId){const v=visitors.find(x=>x.id===passId);if(!v||v.status!=="Approved"){toast("Only approved passes can check in.");return}v.status="Inside";v.checkIn=new Date().toISOString();save();toast(`${v.name} checked in.`)}
function checkOut(passId){const v=visitors.find(x=>x.id===passId);if(!v||v.status!=="Inside")return;v.status="Checked out";v.checkOut=new Date().toISOString();save();toast(`${v.name} checked out.`)}
function renderApprovals(){
 const list=visitors.filter(v=>v.status==="Pending");
 $("approvalTable").innerHTML=list.map(v=>`<tr><td>${person(v.name,v.phone)}</td><td>${esc(v.host)}</td><td>${esc(v.department)}</td><td>${esc(v.purpose)}</td><td>${fmtDate(v.visitDate)}</td><td><button class="action-btn approve-btn" onclick="decide('${v.id}','Approved')">Approve</button><button class="action-btn reject-btn" onclick="decide('${v.id}','Rejected')">Reject</button></td></tr>`).join("")||`<tr><td colspan="6" class="empty">No pending approval requests.</td></tr>`;
}
function decide(passId,status){const v=visitors.find(x=>x.id===passId);if(!v)return;v.status=status;save();toast(`Visitor request ${status.toLowerCase()}.`)}
function renderHistory(){
 const q=($("historySearch")?.value||"").toLowerCase(),s=$("historyStatus")?.value||"all";
 const list=visitors.filter(v=>([v.name,v.phone,v.host,v.id].join(" ").toLowerCase().includes(q))&&(s==="all"||v.status===s));
 $("historyTable").innerHTML=list.map(v=>`<tr><td>${person(v.name,v.company)}</td><td>${esc(v.phone)}<br>${esc(v.email||"")}</td><td>${esc(v.id)}</td><td>${esc(v.host)}<br>${esc(v.department)}</td><td>${fmtDate(v.visitDate)}</td><td>${statusPill(v.status)}</td></tr>`).join("")||`<tr><td colspan="6" class="empty">No visitor records found.</td></tr>`;
}
$("historySearch").addEventListener("input",renderHistory);$("historyStatus").addEventListener("change",renderHistory);
function renderReports(){$("reportTotal").textContent=visitors.length;$("reportApproved").textContent=visitors.filter(v=>["Approved","Inside","Checked out"].includes(v.status)).length;$("reportRejected").textContent=visitors.filter(v=>v.status==="Rejected").length;$("reportCheckout").textContent=visitors.filter(v=>v.status==="Checked out").length}
function csvExport(rows,filename){const csv=rows.map(row=>row.map(x=>`"${String(x??"").replace(/"/g,'""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=filename;a.click();URL.revokeObjectURL(a.href)}
function exportRecords(){csvExport([["Visitor","Phone","Email","Pass ID","Host","Department","Purpose","Visit Date","Status","Check in","Check out"],...visitors.map(v=>[v.name,v.phone,v.email,v.id,v.host,v.department,v.purpose,v.visitDate,v.status,v.checkIn,v.checkOut])],"visitease-visitors.csv")}
$("exportCsv").onclick=exportRecords;$("reportExport").onclick=exportRecords;
$("resetDemo").onclick=()=>{if(confirm("Delete all locally saved visitor records and load demo data?")){visitors=demoData();save();toast("Demo data restored.")}};
function demoData(){const date=today();return [
{id:"VP24000101",name:"Aarav Mehta",phone:"9876543210",email:"aarav@example.com",company:"Northstar Labs",host:"Ananya Rao",department:"Engineering",purpose:"Business meeting",duration:"1 hour",visitDate:date,entryTime:"10:00",createdAt:new Date().toISOString(),status:"Inside",checkIn:new Date(Date.now()-35*60000).toISOString(),checkOut:null},
{id:"VP24000102",name:"Priya Reddy",phone:"9876543211",email:"priya@example.com",company:"Individual",host:"Rahul Verma",department:"Human Resources",purpose:"Interview",duration:"2 hours",visitDate:date,entryTime:"11:00",createdAt:new Date().toISOString(),status:"Pending",checkIn:null,checkOut:null},
{id:"VP24000103",name:"Kiran Kumar",phone:"9876543212",email:"kiran@example.com",company:"Swift Logistics",host:"Sanjay Rao",department:"Operations",purpose:"Delivery",duration:"30 minutes",visitDate:date,entryTime:"09:30",createdAt:new Date().toISOString(),status:"Checked out",checkIn:new Date(Date.now()-3*3600000).toISOString(),checkOut:new Date(Date.now()-2*3600000).toISOString()},
{id:"VP24000104",name:"Sneha Patel",phone:"9876543213",email:"sneha@example.com",company:"BrightWorks",host:"Meera Shah",department:"Finance",purpose:"Business meeting",duration:"1 hour",visitDate:date,entryTime:"14:00",createdAt:new Date().toISOString(),status:"Approved",checkIn:null,checkOut:null},
{id:"VP24000105",name:"Vikram Singh",phone:"9876543214",email:"vikram@example.com",company:"Individual",host:"Ananya Rao",department:"Administration",purpose:"Personal visit",duration:"30 minutes",visitDate:date,entryTime:"12:00",createdAt:new Date().toISOString(),status:"Rejected",checkIn:null,checkOut:null}
]}
if(!visitors.length){visitors=demoData();localStorage.setItem(STORAGE_KEY,JSON.stringify(visitors))}
renderAll();

// QR scanner: decoded content is expected to contain {"passId":"..."}.
$("startScanner").onclick=async()=>{
 if(!window.Html5Qrcode){await loadScannerLibrary()}
 if(!window.Html5Qrcode){$("scanResult").textContent="QR scanner library could not load. Check your internet connection.";return}
 if(html5QrScanner){try{await html5QrScanner.stop()}catch(e){}html5QrScanner=null}
 html5QrScanner=new Html5Qrcode("reader");
 try{await html5QrScanner.start({facingMode:"environment"},{fps:10,qrbox:{width:210,height:210}},decoded=>{
   try{const data=JSON.parse(decoded),v=visitors.find(x=>x.id===data.passId);if(!v){$("scanResult").textContent="Invalid pass: visitor not found.";return}
   $("scanResult").textContent=`Found ${v.name} — ${v.status}.`;
   if(v.status==="Approved"){checkIn(v.id)}else if(v.status==="Inside"){$("scanResult").textContent=`${v.name} is already checked in.`}else{$("scanResult").textContent=`Pass cannot be used. Current status: ${v.status}.`}
   html5QrScanner.stop().catch(()=>{});
   }catch(e){$("scanResult").textContent="QR code is not a valid VisitEase pass."}
 })}catch(e){$("scanResult").textContent="Could not start camera. Allow camera access and use localhost or HTTPS."}
};
function loadScannerLibrary(){return new Promise(resolve=>{const s=document.createElement("script");s.src="https://unpkg.com/html5-qrcode";s.onload=resolve;s.onerror=resolve;document.head.appendChild(s)})}

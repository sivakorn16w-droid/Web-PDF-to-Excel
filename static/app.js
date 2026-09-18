const $=s=>document.querySelector(s);let selectedFiles=[],scanData=[],activeIndex=0;
const input=$("#fileInput"),drop=$("#dropzone"),scan=$("#scanBtn");
input.addEventListener("change",()=>{selectedFiles=[...input.files].filter(f=>f.type==="application/pdf"||f.name.toLowerCase().endsWith(".pdf"));updateFiles()});
["dragenter","dragover"].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.add("drag") }));
["dragleave","drop"].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.remove("drag") }));
drop.addEventListener("drop",x=>{selectedFiles=[...x.dataTransfer.files].filter(f=>f.name.toLowerCase().endsWith(".pdf"));updateFiles()});
function updateFiles(){
  $("#fileName").innerHTML=selectedFiles.length?`เลือกแล้ว <b>${selectedFiles.length}</b> ไฟล์`:`ยังไม่ได้เลือกไฟล์`;
  $("#fileList").innerHTML=selectedFiles.map((f,i)=>`<div class="file-row"><span>${i+1}. ${esc(f.name)}</span><span>${(f.size/1024/1024).toFixed(2)} MB</span></div>`).join("");
  scan.disabled=!selectedFiles.length;
  $("#exportBtn").disabled=true;
}
scan.addEventListener("click",async()=>{
  if(!selectedFiles.length)return;
  const fd=new FormData();selectedFiles.forEach(f=>fd.append("files",f));fd.append("document_type",$("#documentType").value);
  scan.disabled=true;setStatus(`กำลังสแกน ${selectedFiles.length} ไฟล์...`);$("#progressBar").style.width="10%";
  try{
    const r=await fetch("/api/scan_batch?ts="+Date.now(),{method:"POST",body:fd,cache:"no-store"});const d=await r.json();
    if(!r.ok)throw Error(d.error||"สแกนไม่สำเร็จ");
    scanData=d.files||[];activeIndex=0;renderBatch();$("#progressBar").style.width="100%";$("#exportBtn").disabled=!scanData.length;
    setStatus(`สแกนสำเร็จ ${scanData.length} ไฟล์${d.errors?.length?` • ข้าม ${d.errors.length} ไฟล์`:""}`);
  }catch(e){setStatus(e.message,true)}finally{scan.disabled=false}
});
function renderBatch(){
  $("#fileTabs").innerHTML=scanData.map((d,i)=>`<button class="file-tab ${i===activeIndex?'active':''}" data-i="${i}">${i+1}. ${esc(d.filename)}</button>`).join("");
  document.querySelectorAll(".file-tab").forEach(b=>b.onclick=()=>{activeIndex=Number(b.dataset.i);renderActive()});renderActive();
}
function renderActive(){
 const d=scanData[activeIndex];if(!d)return;
 $("#fileInfo").innerHTML=`<b>${esc(d.filename)}</b><br><span class="muted">${d.total_rows} แถว • ${d.columns.length} คอลัมน์</span>`;
 $("#previewMeta").textContent=`ไฟล์ที่ ${activeIndex+1}/${scanData.length} • แสดง ${d.rows.length} จาก ${d.total_rows} แถว`;
 $("#warnings").innerHTML=(d.warnings||[]).map(w=>`<div class="warning">${esc(w)}</div>`).join("");
 $("#columnChooser").innerHTML=`<div class="column-tools"><button id="selectAllCols">✓ เลือกทั้งหมด</button><button id="clearCols">ยกเลิกทั้งหมด</button><span class="muted">เลือกคอลัมน์ที่จะส่งออกทุก Sheet</span></div>`+
 d.columns.map((c,i)=>`<label class="col-chip"><input type="checkbox" data-index="${i}" checked> ${esc(c.label)}</label>`).join("");
 $("#selectAllCols").onclick=()=>document.querySelectorAll("#columnChooser input[type=checkbox]").forEach(x=>x.checked=true);
 $("#clearCols").onclick=()=>document.querySelectorAll("#columnChooser input[type=checkbox]").forEach(x=>x.checked=false);
 let cols=d.columns.map(c=>c.name),h="<table><thead><tr>"+cols.map(c=>`<th>${esc(c)}</th>`).join("")+"</tr></thead><tbody>";
 for(const row of d.rows)h+="<tr>"+cols.map(c=>`<td>${esc(row[c]??"")}</td>`).join("")+"</tr>";
 $("#tableWrap").innerHTML=h+"</tbody></table>";
}
$("#exportBtn").addEventListener("click",async()=>{
 if(!scanData.length){setStatus("กรุณาสแกน PDF ก่อน",true);return}
 const all=[...document.querySelectorAll("#columnChooser input[type=checkbox]")];const checked=all.filter(x=>x.checked);const indices=(checked.length?checked:all).map(x=>x.dataset.index);
 const f=new FormData();scanData.forEach(d=>f.append("tokens",d.token));f.append("document_type",$("#documentType").value);f.append("export_format",$("#exportFormat").value);indices.forEach(i=>f.append("selected_indices",i));
 try{
  $("#exportBtn").disabled=true;setStatus(`กำลังสร้าง ${scanData.length>1?"Excel หลาย Sheet":"ไฟล์ Excel"}...`);
  const r=await fetch("/api/export_batch?ts="+Date.now(),{method:"POST",body:f,cache:"no-store"});
  if(!r.ok){const raw=await r.text();let msg="ส่งออกไม่สำเร็จ";try{msg=JSON.parse(raw).error||msg}catch(_){if(raw)msg=raw.slice(0,500)}throw Error(msg)}
  const b=await r.blob(),cd=r.headers.get("Content-Disposition")||"";const m=cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);const fn=m?decodeURIComponent(m[1]||m[2]):"pdf_to_excel_export.xlsx";
  const u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);setStatus(`ส่งออกสำเร็จ • ${fn}`)
 }catch(e){setStatus(e.message,true)}finally{$("#exportBtn").disabled=false}
});
function setStatus(m,e=false){$("#status").textContent=m;$("#status").className="status "+(e?"error":"success")}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
const pages={convert:"convertPage",volume:"convertPage",history:"historyPage",settings:"settingsPage",about:"aboutPage"};
document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",async()=>{document.querySelectorAll(".nav-item").forEach(b=>b.classList.remove("active"));btn.classList.add("active");const p=btn.dataset.page;document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));$("#"+pages[p]).classList.remove("hidden");$("#crumb").textContent="PDF to Excel › "+btn.textContent.trim();if(p==="volume"){$("#documentType").value="volume";$("#pageSubtitle").textContent="ปริมาณผลปาล์ม / CPO • หลายเดือนแยก Sheet"}if(p==="convert"){$("#documentType").value="price";$("#pageSubtitle").textContent="ราคาปาล์ม • เลือกหลาย PDF ได้"}if(p==="history")await loadHistory();if(p==="settings")await loadSettings()}));
const gearButton=document.querySelector(".gear");
gearButton?.addEventListener("click",async()=>{const settingsNav=document.querySelector('.nav-item[data-page="settings"]');if(settingsNav)settingsNav.click();else{document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));$("#settingsPage").classList.remove("hidden");$("#crumb").textContent="PDF to Excel › การตั้งค่า";await loadSettings();}});
async function loadHistory(){let r=await fetch("/api/history"),d=await r.json();$("#historyList").innerHTML=d.length?d.map(x=>`<div class="history-item"><div><div class="history-name">${esc(x.source_filename||x.filename)}</div><div class="history-meta">${esc(x.document_type)} • ${esc(x.export_format)} • ${x.rows||0} แถว${x.sheets?` • ${x.sheets} Sheet`:""}</div></div><div class="history-file">${esc(x.filename)}</div></div>`).join(""):"<div class='empty'>ยังไม่มีประวัติ</div>"}
$("#clearHistory").addEventListener("click",async()=>{if(confirm("ล้างประวัติทั้งหมด?")){await fetch("/api/history",{method:"DELETE"});loadHistory()}});
async function loadSettings(){let r=await fetch("/api/settings"),d=await r.json();$("#defaultDocumentType").value=d.default_document_type;$("#defaultExportFormat").value=d.default_export_format;$("#maxPreviewRows").value=d.max_preview_rows;applyFontScale(localStorage.getItem("pdf2excel_font_scale")||100,false)}
$("#saveSettings").addEventListener("click",async()=>{let d={default_document_type:$("#defaultDocumentType").value,default_export_format:$("#defaultExportFormat").value,max_preview_rows:Number($("#maxPreviewRows").value)};let r=await fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});let s=await r.json();$("#settingsStatus").textContent="บันทึกการตั้งค่าแล้ว";$("#documentType").value=s.default_document_type;$("#exportFormat").value=s.default_export_format});
function applyFontScale(value, persist=true){
  const n=Math.max(85,Math.min(125,Number(value)||100));
  document.documentElement.style.setProperty("--font-scale", String(n/100));
  const slider=$("#fontScale"), out=$("#fontScaleValue"), settingsSlider=$("#settingsFontScale"), settingsOut=$("#settingsFontScaleValue");
  if(slider) slider.value=n;
  if(out) out.textContent=n+"%";
  if(settingsSlider) settingsSlider.value=n;
  if(settingsOut) settingsOut.textContent=n+"%";
  if(persist) localStorage.setItem("pdf2excel_font_scale",String(n));
}
const savedFontScale=localStorage.getItem("pdf2excel_font_scale")||"100";
applyFontScale(savedFontScale,false);
$("#fontScale").addEventListener("input",e=>applyFontScale(e.target.value));
$("#settingsFontScale")?.addEventListener("input",e=>applyFontScale(e.target.value));

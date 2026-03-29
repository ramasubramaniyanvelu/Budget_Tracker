/**
 * MyExpense India — Google Apps Script Backend  v3.2
 * Google Sign-In · Manual entry · Income + Expense · Auto-categorise · Budget · Sankey
 * Custom Categories · Editable Users · Date Range Reports · Pro Tips · PWA
 * All data stored in a dedicated Google Drive folder
 */

const SHEET_TXN    = 'Transactions';
const SHEET_CATS   = 'CategoryMap';
const SHEET_BUDGET = 'Budget';
const SHEET_SETTINGS = 'Settings';
const TZ = 'Asia/Kolkata';
const DRIVE_FOLDER_NAME = 'MyExpense India';

const INCOME_KW = [
  'SALARY','SAL CR','NEFT CR','RTGS CR','IMPS CR','CREDIT BY',
  'INTEREST','DIVIDEND','CASHBACK','REFUND','REVERSAL','BONUS'
];

// ══════════════════════════════════════════════
// WEB APP
// ══════════════════════════════════════════════
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('MyExpense India')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width, initial-scale=1.0, maximum-scale=1.0');
}

// ══════════════════════════════════════════════
// GOOGLE DRIVE FOLDER — all data lives here
// ══════════════════════════════════════════════
function getOrCreateDriveFolder_() {
  const props = PropertiesService.getScriptProperties();
  let folderId = props.getProperty('FOLDER_ID');
  if (folderId) {
    try { return DriveApp.getFolderById(folderId); } catch(e) { /* folder deleted, recreate */ }
  }
  // Check if folder already exists by name
  const existing = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (existing.hasNext()) {
    const folder = existing.next();
    props.setProperty('FOLDER_ID', folder.getId());
    return folder;
  }
  // Create new folder
  const folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
  folder.setDescription('MyExpense India — All your expense tracking data, budgets, and reports');
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

// ══════════════════════════════════════════════
// AUTO-CREATE SPREADSHEET (inside Drive folder)
// ══════════════════════════════════════════════
function getOrCreateSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SS_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch(e) {} }
  const ss = SpreadsheetApp.create('MyExpense India — Data');
  props.setProperty('SS_ID', ss.getId());
  // Move spreadsheet into the dedicated Drive folder
  const folder = getOrCreateDriveFolder_();
  const file = DriveApp.getFileById(ss.getId());
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file); // remove from root "My Drive"
  setupSheets_(ss);
  return ss;
}

function setupSheets_(ss) {
  let t = ss.getSheets()[0]; t.setName(SHEET_TXN);
  t.getRange(1,1,1,10).setValues([[
    'Date','Description','Amount (₹)','Category','Type',
    'Payment Mode','Notes','Source','Entered By','Month'
  ]]).setBackground('#1565c0').setFontColor('#fff').setFontWeight('bold');
  t.setFrozenRows(1);
  t.getRange(2,3,5000,1).setNumberFormat('₹#,##,##0.00');
  t.getRange(2,1,5000,1).setNumberFormat('dd-mm-yyyy');
  t.setColumnWidth(2,240); t.setColumnWidth(4,160);

  const c = ss.insertSheet(SHEET_CATS);
  c.getRange(1,1,1,3).setValues([['Keyword','Category','Last Used']])
   .setBackground('#2e7d32').setFontColor('#fff').setFontWeight('bold');
  c.setFrozenRows(1);
  const merchants = defaultMerchants_();
  if (merchants.length) c.getRange(2,1,merchants.length,3).setValues(merchants);

  const b = ss.insertSheet(SHEET_BUDGET);
  b.getRange(1,1,1,4).setValues([['Month','Category','Budget (₹)','Notes']])
   .setBackground('#b71c1c').setFontColor('#fff').setFontWeight('bold');
  b.setFrozenRows(1);
  b.getRange(2,3,2000,1).setNumberFormat('₹#,##,##0.00');

  const s = ss.insertSheet(SHEET_SETTINGS);
  s.getRange(1,1,5,2).setValues([['Key','Value'],['Initialized',new Date().toISOString()],['Currency','INR'],['User1Name','User 1'],['User2Name','User 2']]);

  const cc = ss.insertSheet('CustomCategories');
  cc.getRange(1,1,1,4).setValues([['Name','Icon','Type','DateAdded']])
    .setBackground('#7c3aed').setFontColor('#fff').setFontWeight('bold');
  cc.setFrozenRows(1);
}

// ══════════════════════════════════════════════
// INIT — called on first load
// ══════════════════════════════════════════════
function initApp() {
  try {
    const ss = getOrCreateSpreadsheet();
    const folder = getOrCreateDriveFolder_();
    const userEmail = Session.getActiveUser().getEmail() || '';
    const userName = userEmail ? userEmail.split('@')[0] : 'User';
    return {
      ok: true,
      sheetUrl: ss.getUrl(),
      driveUrl: folder.getUrl(),
      driveName: DRIVE_FOLDER_NAME,
      currentMonth: Utilities.formatDate(new Date(), TZ, 'MMM-yyyy'),
      userEmail: userEmail,
      userName: userName
    };
  } catch(e) { return { ok:false, error:e.message }; }
}

function getUserInfo() {
  const userEmail = Session.getActiveUser().getEmail();
  return {
    email: userEmail,
    name: userEmail.split('@')[0]
  };
}

// ══════════════════════════════════════════════
// EXPORT MONTHLY REPORT TO DRIVE (as PDF backup)
// ══════════════════════════════════════════════
function exportMonthlyReport(month) {
  try {
    const ss = getOrCreateSpreadsheet();
    const folder = getOrCreateDriveFolder_();
    const tgt = month || Utilities.formatDate(new Date(), TZ, 'MMM-yyyy');

    // Create a summary text file in the Drive folder
    const dash = JSON.parse(getDashboardData(tgt));
    let report = 'MyExpense India — Monthly Report: ' + tgt + '\n';
    report += '════════════════════════════════════════\n\n';
    report += 'Total Income:   ₹' + fmt_(dash.income) + '\n';
    report += 'Total Expenses: ₹' + fmt_(dash.expenses) + '\n';
    report += 'Net Savings:    ₹' + fmt_(dash.savings) + '\n';
    report += 'Savings Rate:   ' + dash.savingsRate + '%\n\n';

    report += 'EXPENSE BREAKDOWN:\n';
    report += '────────────────────────────────────────\n';
    (dash.expenseBreakdown||[]).forEach(function(e){
      report += '  ' + e.category + ': ₹' + fmt_(e.amount) + '\n';
    });

    report += '\nINCOME BREAKDOWN:\n';
    report += '────────────────────────────────────────\n';
    (dash.incomeBreakdown||[]).forEach(function(i){
      report += '  ' + i.category + ': ₹' + fmt_(i.amount) + '\n';
    });

    report += '\n\nGenerated: ' + new Date().toLocaleString('en-IN', {timeZone:TZ}) + '\n';

    const fileName = 'MyExpense_Report_' + tgt.replace('-','_') + '.txt';
    // Check if report already exists, update it
    const files = folder.getFilesByName(fileName);
    if (files.hasNext()) {
      files.next().setContent(report);
    } else {
      folder.createFile(fileName, report, 'text/plain');
    }
    return { success:true, fileName:fileName, folderUrl:folder.getUrl() };
  } catch(e) { return { success:false, error:e.message }; }
}

function getDriveInfo() {
  try {
    const folder = getOrCreateDriveFolder_();
    const files = folder.getFiles();
    var fileList = [];
    while(files.hasNext()) {
      var f = files.next();
      fileList.push({ name:f.getName(), url:f.getUrl(), size:f.getSize(), updated:f.getLastUpdated().toISOString() });
    }
    return { success:true, folderUrl:folder.getUrl(), folderName:DRIVE_FOLDER_NAME, files:fileList };
  } catch(e) { return { success:false, error:e.message }; }
}

// ══════════════════════════════════════════════
// ADD TRANSACTION
// ══════════════════════════════════════════════
function addTransaction(json) {
  try {
    const d  = JSON.parse(json);
    const ss = getOrCreateSpreadsheet();
    const sh = ss.getSheetByName(SHEET_TXN);
    const dateObj = d.date ? new Date(d.date) : new Date();
    const month   = Utilities.formatDate(dateObj, TZ, 'MMM-yyyy');
    const type    = d.type || 'EXPENSE';

    sh.appendRow([
      dateObj,
      (d.description||'').toUpperCase().trim(),
      parseFloat(d.amount)||0,
      d.category  || 'Miscellaneous',
      type,
      d.paymentMode || 'UPI',
      d.notes       || '',
      'MANUAL',
      d.enteredBy   || 'User1',
      month
    ]);

    if (d.description && d.category) saveMap_(d.description, d.category);
    return { success:true };
  } catch(e) { return { success:false, error:e.message }; }
}

// ══════════════════════════════════════════════
// DELETE TRANSACTION
// ══════════════════════════════════════════════
function deleteTransaction(rowNum) {
  try {
    const ss = getOrCreateSpreadsheet();
    ss.getSheetByName(SHEET_TXN).deleteRow(rowNum);
    return { success:true };
  } catch(e) { return { success:false, error:e.message }; }
}

// ══════════════════════════════════════════════
// GET TRANSACTIONS
// ══════════════════════════════════════════════
function getTransactions(month) {
  try {
    const ss = getOrCreateSpreadsheet();
    const sh = ss.getSheetByName(SHEET_TXN);
    if (sh.getLastRow() < 2) return JSON.stringify([]);
    const data = sh.getRange(2,1,sh.getLastRow()-1,10).getValues();
    const tgt  = month || Utilities.formatDate(new Date(), TZ, 'MMM-yyyy');
    let runExp=0, runInc=0;
    const rows = data
      .map((r,i) => ({r, idx:i+2}))
      .filter(o => o.r[0] && o.r[9]===tgt)
      .map(o => {
        const r = o.r;
        if ((r[4]||'EXPENSE')==='INCOME') runInc += (parseFloat(r[2])||0);
        else runExp += (parseFloat(r[2])||0);
        return {
          row: o.idx,
          date: Utilities.formatDate(new Date(r[0]), TZ, 'dd-MMM-yyyy'),
          description:r[1], amount:r[2], category:r[3],
          type:r[4]||'EXPENSE', paymentMode:r[5], notes:r[6],
          enteredBy:r[8], runningTotal:runExp
        };
      });
    rows.reverse();
    return JSON.stringify(rows);
  } catch(e) { return JSON.stringify([]); }
}

// ══════════════════════════════════════════════
// CATEGORY SUGGEST
// ══════════════════════════════════════════════
function suggestCategory(description) {
  const u = (description||'').toUpperCase().trim();
  for (const kw of INCOME_KW)
    if (u.includes(kw)) return { category:incCat_(u), confidence:'auto', type:'INCOME' };

  const ss = getOrCreateSpreadsheet();
  const sh = ss.getSheetByName(SHEET_CATS);
  if (sh.getLastRow() >= 2) {
    const data = sh.getRange(2,1,sh.getLastRow()-1,2).getValues();
    for (const r of data) if (r[0] && u === r[0].toString().toUpperCase())
      return { category:r[1], confidence:'exact', type:'EXPENSE' };
    for (const r of data) if (r[0] && u.includes(r[0].toString().toUpperCase()))
      return { category:r[1], confidence:'partial', type:'EXPENSE' };
  }
  return { category:'Miscellaneous', confidence:'none', type:'EXPENSE' };
}

function incCat_(u) {
  if (u.includes('SALARY')||u.includes('SAL CR')) return 'Salary';
  if (u.includes('INTEREST')||u.includes('DIVIDEND')) return 'Interest/Dividend';
  if (u.includes('CASHBACK')||u.includes('REFUND')) return 'Cashback/Refund';
  return 'Other Income';
}

function saveMap_(desc, cat) {
  const ss = getOrCreateSpreadsheet();
  const sh = ss.getSheetByName(SHEET_CATS);
  const key = desc.toUpperCase().trim().slice(0,50);
  if (sh.getLastRow() >= 2) {
    const data = sh.getRange(2,1,sh.getLastRow()-1,2).getValues();
    for (let i=0;i<data.length;i++) {
      if (data[i][0] && data[i][0].toString().toUpperCase()===key) {
        sh.getRange(i+2,2).setValue(cat);
        sh.getRange(i+2,3).setValue(new Date());
        return;
      }
    }
  }
  sh.appendRow([key, cat, new Date()]);
}

// ══════════════════════════════════════════════
// BUDGET
// ══════════════════════════════════════════════
function getBudget(month) {
  const ss = getOrCreateSpreadsheet();
  const sh = ss.getSheetByName(SHEET_BUDGET);
  const tgt = month || Utilities.formatDate(new Date(), TZ, 'MMM-yyyy');
  if (sh.getLastRow() < 2) return { budget:[], month:tgt, empty:true, suggested:prevActuals_(tgt) };
  const data = sh.getRange(2,1,sh.getLastRow()-1,4).getValues();
  const budget = data.filter(r=>r[0]===tgt).map(r=>({category:r[1],amount:parseFloat(r[2])||0}));
  if (!budget.length) return { budget:[], month:tgt, empty:true, suggested:prevActuals_(tgt) };
  return { budget, month:tgt, empty:false };
}

function saveBudget(month, budgetJson) {
  try {
    const items = JSON.parse(budgetJson);
    const ss = getOrCreateSpreadsheet();
    const sh = ss.getSheetByName(SHEET_BUDGET);
    if (sh.getLastRow()>=2) {
      const col=sh.getRange(2,1,sh.getLastRow()-1,1).getValues();
      for (let i=col.length-1;i>=0;i--) if(col[i][0]===month) sh.deleteRow(i+2);
    }
    const rows = items.filter(it=>it.amount>0).map(it=>[month,it.category,parseFloat(it.amount)||0,'']);
    if (rows.length) sh.getRange(sh.getLastRow()+1,1,rows.length,4).setValues(rows);
    return { success:true };
  } catch(e) { return { success:false, error:e.message }; }
}

function prevActuals_(month) {
  const mn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [m,y]=month.split('-'); let mi=mn.indexOf(m),yr=parseInt(y);
  if(mi===0){mi=11;yr--;}else{mi--;}
  const prev=mn[mi]+'-'+yr;
  const ss=getOrCreateSpreadsheet(); const sh=ss.getSheetByName(SHEET_TXN);
  if(sh.getLastRow()<2)return[];
  const data=sh.getRange(2,1,sh.getLastRow()-1,10).getValues();
  const tot={};
  for(const r of data){
    if(r[9]!==prev||(r[4]||'EXPENSE')==='INCOME')continue;
    tot[r[3]||'Miscellaneous']=(tot[r[3]||'Miscellaneous']||0)+(parseFloat(r[2])||0);
  }
  return Object.entries(tot).map(([c,a])=>({category:c,amount:Math.ceil(a/100)*100})).sort((a,b)=>b.amount-a.amount);
}

// ══════════════════════════════════════════════
// DASHBOARD DATA (for Sankey + stats)
// ══════════════════════════════════════════════
function getDashboardData(month) {
  try {
    const ss=getOrCreateSpreadsheet(); const sh=ss.getSheetByName(SHEET_TXN);
    const tgt=month||Utilities.formatDate(new Date(),TZ,'MMM-yyyy');
    const empty={income:0,expenses:0,savings:0,savingsRate:'0',incomeBreakdown:[],expenseBreakdown:[],month:tgt};
    if(sh.getLastRow()<2) return JSON.stringify(empty);
    const data=sh.getRange(2,1,sh.getLastRow()-1,10).getValues();
    const inc={},exp={};
    for(const r of data){
      if(!r[0]||r[9]!==tgt)continue;
      const cat=r[3]||'Miscellaneous'; const amt=parseFloat(r[2])||0;
      if((r[4]||'EXPENSE')==='INCOME') inc[cat]=(inc[cat]||0)+amt;
      else exp[cat]=(exp[cat]||0)+amt;
    }
    const totalInc=Object.values(inc).reduce((a,b)=>a+b,0);
    const totalExp=Object.values(exp).reduce((a,b)=>a+b,0);
    const sav=totalInc-totalExp;
    const bdg=getBudget(tgt); const bmap={};
    if(!bdg.empty) bdg.budget.forEach(b=>{bmap[b.category]=b.amount;});
    return JSON.stringify({
      income:totalInc, expenses:totalExp, savings:sav,
      savingsRate:totalInc>0?((sav/totalInc)*100).toFixed(1):'0', month:tgt,
      incomeBreakdown:Object.entries(inc).map(([c,a])=>({category:c,amount:a})).sort((a,b)=>b.amount-a.amount),
      expenseBreakdown:Object.entries(exp).map(([c,a])=>({category:c,amount:a,budget:bmap[c]||0})).sort((a,b)=>b.amount-a.amount)
    });
  } catch(e){ return JSON.stringify({error:e.message}); }
}

function getTransactionsByDateRange(startDate, endDate) {
  try {
    const ss = getOrCreateSpreadsheet();
    const sh = ss.getSheetByName(SHEET_TXN);
    if (sh.getLastRow() < 2) return JSON.stringify([]);
    const data = sh.getRange(2,1,sh.getLastRow()-1,10).getValues();
    const startD = new Date(startDate);
    const endD = new Date(endDate);
    let runExp=0, runInc=0;
    const rows = data
      .map((r,i) => ({r, idx:i+2}))
      .filter(o => {
        const d = new Date(o.r[0]);
        return d >= startD && d <= endD;
      })
      .map(o => {
        const r = o.r;
        if ((r[4]||'EXPENSE')==='INCOME') runInc += (parseFloat(r[2])||0);
        else runExp += (parseFloat(r[2])||0);
        return {
          row: o.idx,
          date: Utilities.formatDate(new Date(r[0]), TZ, 'dd-MMM-yyyy'),
          description:r[1], amount:r[2], category:r[3],
          type:r[4]||'EXPENSE', paymentMode:r[5], notes:r[6],
          enteredBy:r[8], runningTotal:runExp
        };
      });
    rows.reverse();
    return JSON.stringify(rows);
  } catch(e) { return JSON.stringify([]); }
}

function getDashboardDataByDateRange(startDate, endDate) {
  try {
    const ss=getOrCreateSpreadsheet(); const sh=ss.getSheetByName(SHEET_TXN);
    const startD = new Date(startDate);
    const endD = new Date(endDate);
    const dateRangeStr = Utilities.formatDate(startD, TZ, 'dd-MMM') + ' to ' + Utilities.formatDate(endD, TZ, 'dd-MMM-yyyy');
    const empty={income:0,expenses:0,savings:0,savingsRate:'0',incomeBreakdown:[],expenseBreakdown:[],dateRange:dateRangeStr};
    if(sh.getLastRow()<2) return JSON.stringify(empty);
    const data=sh.getRange(2,1,sh.getLastRow()-1,10).getValues();
    const inc={},exp={};
    for(const r of data){
      if(!r[0]) continue;
      const d = new Date(r[0]);
      if(d < startD || d > endD) continue;
      const cat=r[3]||'Miscellaneous'; const amt=parseFloat(r[2])||0;
      if((r[4]||'EXPENSE')==='INCOME') inc[cat]=(inc[cat]||0)+amt;
      else exp[cat]=(exp[cat]||0)+amt;
    }
    const totalInc=Object.values(inc).reduce((a,b)=>a+b,0);
    const totalExp=Object.values(exp).reduce((a,b)=>a+b,0);
    const sav=totalInc-totalExp;
    return JSON.stringify({
      income:totalInc, expenses:totalExp, savings:sav,
      savingsRate:totalInc>0?((sav/totalInc)*100).toFixed(1):'0', dateRange:dateRangeStr,
      incomeBreakdown:Object.entries(inc).map(([c,a])=>({category:c,amount:a})).sort((a,b)=>b.amount-a.amount),
      expenseBreakdown:Object.entries(exp).map(([c,a])=>({category:c,amount:a})).sort((a,b)=>b.amount-a.amount)
    });
  } catch(e){ return JSON.stringify({error:e.message}); }
}

// ══════════════════════════════════════════════
// PRO TIPS
// ══════════════════════════════════════════════
function getMonthlySummary(month) {
  const tgt=month||Utilities.formatDate(new Date(),TZ,'MMM-yyyy');
  const dash=JSON.parse(getDashboardData(tgt));
  const bdg=getBudget(tgt); const bmap={};
  if(!bdg.empty) bdg.budget.forEach(b=>{bmap[b.category]=b.amount;});
  const bc=(dash.expenseBreakdown||[]).map(e=>({
    category:e.category, budget:bmap[e.category]||0, actual:e.amount,
    diff:(bmap[e.category]||0)-e.amount
  }));
  return { month:tgt, totalIncome:dash.income, totalExpense:dash.expenses,
    savings:dash.savings, savingsRate:dash.savingsRate,
    categoryBreakdown:dash.expenseBreakdown||[], incomeBreakdown:dash.incomeBreakdown||[],
    budgetComparison:bc, tips:genTips_(dash,bc) };
}

function genTips_(d,bc) {
  const tips=[], exp=d.expenseBreakdown||[], tot=d.expenses||0;
  const sr=parseFloat(d.savingsRate||0);
  if(!tot){tips.push({icon:'📝',tip:'Start logging expenses to get personalised tips!'});return tips;}
  if(sr<0) tips.push({icon:'🚨',tip:'You spent ₹'+fmt_(Math.abs(d.savings))+' MORE than you earned. Cut discretionary spends immediately.'});
  else if(sr<10) tips.push({icon:'⚠️',tip:'Savings rate '+sr+'% is very low. Aim for 20%. Start a ₹500/month SIP today.'});
  else if(sr>=20) tips.push({icon:'✅',tip:'Great! Savings rate '+sr+'%. Consider increasing SIP contributions.'});
  else tips.push({icon:'💡',tip:'Savings rate '+sr+'%. Aim for 20% — a ₹2K/month Nifty 50 SIP grows to ~₹5.6L in 10 years.'});

  if(exp.length) tips.push({icon:'🔍',tip:'Highest spend: "'+exp[0].category+'" at ₹'+fmt_(exp[0].amount)+' ('+(tot>0?((exp[0].amount/tot)*100).toFixed(0):0)+'% of expenses).'});

  const over=bc.filter(b=>b.budget>0&&b.diff<0).sort((a,b)=>a.diff-b.diff);
  if(over.length) tips.push({icon:'🔴',tip:'Budget exceeded in '+over.length+' categories. Worst: "'+over[0].category+'" over by ₹'+fmt_(Math.abs(over[0].diff))+'.'});

  const find=n=>exp.find(e=>e.category.includes(n));
  const food=find('Food')||find('Eating');
  if(food&&food.amount>3000) tips.push({icon:'🍱',tip:'₹'+fmt_(food.amount)+' on food. Cooking 3 extra meals/week saves ₹1,500–₹2,000/month.'});
  const cab=find('Cab')||find('Auto');
  if(cab&&cab.amount>2000) tips.push({icon:'🚕',tip:'₹'+fmt_(cab.amount)+' on cabs. A metro monthly pass saves 40–50%.'});
  const subs=find('Subscription');
  if(subs&&subs.amount>800) tips.push({icon:'📺',tip:'₹'+fmt_(subs.amount)+'/month on subscriptions. Audit usage — consolidate to one family plan.'});

  if(exp.length>=3){const t3=exp.slice(0,3).reduce((s,e)=>s+e.amount,0);const p=tot>0?((t3/tot)*100).toFixed(0):0;
    if(p>65)tips.push({icon:'📊',tip:'Top 3 = '+p+'% of spending. Cutting 15% across these saves ₹'+fmt_(t3*0.15)+'/month.'});}

  tips.push({icon:'💰',tip:'Auto-debit SIP on 1st of every month. Even ₹1K/month in NIFTY 50 index grows to ₹23L in 30 years at 12% CAGR.'});
  return tips;
}

function fmt_(n){return Math.round(n).toLocaleString('en-IN');}

// ══════════════════════════════════════════════
// AVAILABLE MONTHS
// ══════════════════════════════════════════════
function getAvailableMonths() {
  const ss=getOrCreateSpreadsheet(); const sh=ss.getSheetByName(SHEET_TXN);
  const cur=Utilities.formatDate(new Date(),TZ,'MMM-yyyy');
  const set=new Set([cur]);
  if(sh.getLastRow()>=2) sh.getRange(2,10,sh.getLastRow()-1,1).getValues().forEach(r=>{if(r[0])set.add(r[0]);});
  const mn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return [...set].sort((a,b)=>{const[ma,ya]=a.split('-');const[mb,yb]=b.split('-');
    return(parseInt(ya)*12+mn.indexOf(ma))-(parseInt(yb)*12+mn.indexOf(mb));});
}

function getSpreadsheetUrl(){return getOrCreateSpreadsheet().getUrl();}

// ══════════════════════════════════════════════
// CUSTOM CATEGORIES
// ══════════════════════════════════════════════
function addCustomCategory(json) {
  try {
    const d = JSON.parse(json);
    const ss = getOrCreateSpreadsheet();
    let sh = ss.getSheetByName('CustomCategories');
    if (!sh) {
      sh = ss.insertSheet('CustomCategories');
      sh.getRange(1,1,1,4).setValues([['Name','Icon','Type','DateAdded']])
        .setBackground('#7c3aed').setFontColor('#fff').setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    sh.appendRow([d.name, d.icon, d.type, new Date()]);
    return { success: true };
  } catch(e) { return { success: false, error: e.message }; }
}

function getCustomCategories() {
  try {
    const ss = getOrCreateSpreadsheet();
    let sh = ss.getSheetByName('CustomCategories');
    if (!sh) {
      sh = ss.insertSheet('CustomCategories');
      sh.getRange(1,1,1,4).setValues([['Name','Icon','Type','DateAdded']])
        .setBackground('#7c3aed').setFontColor('#fff').setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    if (sh.getLastRow() < 2) return JSON.stringify([]);
    const data = sh.getRange(2, 1, sh.getLastRow()-1, 4).getValues();
    const custom = data.map(r => ({
      n: r[0],
      i: r[1],
      t: r[2]
    }));
    return JSON.stringify(custom);
  } catch(e) { return JSON.stringify([]); }
}

// ══════════════════════════════════════════════
// INDIA CATEGORY LIST
// ══════════════════════════════════════════════
const INDIA_CATS = [
  {n:'Groceries/Kirana',i:'🛒',t:'expense',pop:true},{n:'Vegetables & Fruits',i:'🥦',t:'expense'},
  {n:'Milk & Dairy',i:'🥛',t:'expense'},{n:'Online Food Delivery',i:'🍱',t:'expense',pop:true},
  {n:'Eating Out/Restaurant',i:'🍽️',t:'expense',pop:true},{n:'Chai/Snacks',i:'☕',t:'expense'},
  {n:'Petrol/Diesel',i:'⛽',t:'expense',pop:true},{n:'Auto/Cab/Ola/Uber',i:'🚕',t:'expense',pop:true},
  {n:'Bus/Metro/Train',i:'🚆',t:'expense'},{n:'Rent',i:'🏠',t:'expense',pop:true},
  {n:'Electricity Bill',i:'⚡',t:'expense',pop:true},{n:'Water Bill',i:'💧',t:'expense'},
  {n:'LPG Gas',i:'🔥',t:'expense'},{n:'Mobile Recharge',i:'📱',t:'expense',pop:true},
  {n:'Internet/WiFi',i:'🌐',t:'expense'},{n:'DTH/Cable TV',i:'📺',t:'expense'},
  {n:'School/Tuition Fees',i:'📚',t:'expense'},{n:'Books & Stationery',i:'📖',t:'expense'},
  {n:'Medical/Pharmacy',i:'💊',t:'expense',pop:true},{n:'Doctor/Hospital',i:'🏥',t:'expense'},
  {n:'Insurance Premium',i:'🛡️',t:'expense'},{n:'EMI/Loan Payment',i:'🏦',t:'expense',pop:true},
  {n:'Credit Card Bill',i:'💳',t:'expense'},{n:'Domestic Help/Maid',i:'🧹',t:'expense'},
  {n:'Clothing & Footwear',i:'👕',t:'expense'},{n:'Online Shopping',i:'🛍️',t:'expense',pop:true},
  {n:'Festival/Puja/Gifts',i:'🪔',t:'expense'},{n:'Movie/Entertainment',i:'🎬',t:'expense'},
  {n:'Gym/Fitness',i:'🏋️',t:'expense'},{n:'Personal Care/Salon',i:'💄',t:'expense'},
  {n:'Home Maintenance',i:'🔧',t:'expense'},{n:'Society Maintenance',i:'🏢',t:'expense'},
  {n:'Subscriptions (OTT/Apps)',i:'🎧',t:'expense'},{n:'Investments/SIP',i:'📈',t:'expense'},
  {n:'Gold/Jewellery',i:'💍',t:'expense'},{n:'Travel/Vacation',i:'✈️',t:'expense'},
  {n:'Donations/Charity',i:'🙏',t:'expense'},{n:'Children Activities',i:'👶',t:'expense'},
  {n:'Pet Care',i:'🐾',t:'expense'},{n:'Miscellaneous',i:'📦',t:'expense'},
  {n:'Salary',i:'💼',t:'income',pop:true},{n:'Freelance/Business',i:'💻',t:'income'},
  {n:'Rental Income',i:'🏘️',t:'income'},{n:'Interest/Dividend',i:'💹',t:'income'},
  {n:'Cashback/Refund',i:'🔄',t:'income'},{n:'Gift Received',i:'🎁',t:'income'},
  {n:'Other Income',i:'💰',t:'income'}
];

function getCategoryList() {
  try {
    const custom = JSON.parse(getCustomCategories());
    const merged = INDIA_CATS.concat(custom);
    return JSON.stringify(merged);
  } catch(e) { return JSON.stringify(INDIA_CATS); }
}

// ══════════════════════════════════════════════
// KEYWORD MAP & MERCHANTS
// ══════════════════════════════════════════════
const KW_MAP = [
  ['SWIGGY','Online Food Delivery'],['ZOMATO','Online Food Delivery'],['DUNZO','Online Food Delivery'],
  ['BIGBASKET','Groceries/Kirana'],['BLINKIT','Groceries/Kirana'],['ZEPTO','Groceries/Kirana'],
  ['DMART','Groceries/Kirana'],['RELIANCE FRESH','Groceries/Kirana'],
  ['OLA','Auto/Cab/Ola/Uber'],['UBER','Auto/Cab/Ola/Uber'],['RAPIDO','Auto/Cab/Ola/Uber'],
  ['PETROL','Petrol/Diesel'],['DIESEL','Petrol/Diesel'],['FASTTAG','Petrol/Diesel'],
  ['BESCOM','Electricity Bill'],['TATA POWER','Electricity Bill'],['MSEB','Electricity Bill'],
  ['AIRTEL','Mobile Recharge'],['JIO','Mobile Recharge'],['VODAFONE','Mobile Recharge'],
  ['NETFLIX','Subscriptions (OTT/Apps)'],['HOTSTAR','Subscriptions (OTT/Apps)'],['SPOTIFY','Subscriptions (OTT/Apps)'],
  ['AMAZON','Online Shopping'],['FLIPKART','Online Shopping'],['MYNTRA','Clothing & Footwear'],
  ['APOLLO','Medical/Pharmacy'],['PHARMEASY','Medical/Pharmacy'],['1MG','Medical/Pharmacy'],
  ['LIC','Insurance Premium'],['SIP','Investments/SIP'],['ZERODHA','Investments/SIP'],
  ['EMI','EMI/Loan Payment'],['HOME LOAN','EMI/Loan Payment'],
  ['IRCTC','Travel/Vacation'],['MAKEMYTRIP','Travel/Vacation'],['INDIGO','Travel/Vacation'],
  ['BOOKMYSHOW','Movie/Entertainment'],['PVR','Movie/Entertainment'],
  ['CULT FIT','Gym/Fitness'],['SALON','Personal Care/Salon'],
  ['TANISHQ','Gold/Jewellery'],['MALABAR GOLD','Gold/Jewellery'],
  ['DOMINOS','Eating Out/Restaurant'],['KFC','Eating Out/Restaurant'],['STARBUCKS','Chai/Snacks'],
];
function defaultMerchants_(){const d=new Date();return KW_MAP.map(([kw,cat])=>[kw,cat,d]);}

// ══════════════════════════════════════════════
// USER NAMES
// ══════════════════════════════════════════════
function getUserNames() {
  try {
    const ss = getOrCreateSpreadsheet();
    const sh = ss.getSheetByName(SHEET_SETTINGS);
    if (!sh || sh.getLastRow() < 2) return JSON.stringify({user1:'User 1', user2:'User 2'});
    const data = sh.getRange(2, 1, sh.getLastRow()-1, 2).getValues();
    let user1 = 'User 1', user2 = 'User 2', found1 = false, found2 = false;
    for (const r of data) {
      if (r[0] === 'User1Name') { user1 = r[1] || 'User 1'; found1 = true; }
      if (r[0] === 'User2Name') { user2 = r[1] || 'User 2'; found2 = true; }
    }
    if (!found1) sh.appendRow(['User1Name', 'User 1']);
    if (!found2) sh.appendRow(['User2Name', 'User 2']);
    return JSON.stringify({user1: user1, user2: user2});
  } catch(e) { return JSON.stringify({user1:'User 1', user2:'User 2'}); }
}

function saveUserNames(json) {
  try {
    const d = JSON.parse(json);
    const ss = getOrCreateSpreadsheet();
    const sh = ss.getSheetByName(SHEET_SETTINGS);
    if (sh.getLastRow() >= 2) {
      const data = sh.getRange(2, 1, sh.getLastRow()-1, 2).getValues();
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === 'User1Name') sh.getRange(i+2, 2).setValue(d.user1 || 'User 1');
        if (data[i][0] === 'User2Name') sh.getRange(i+2, 2).setValue(d.user2 || 'User 2');
      }
    }
    return { success: true };
  } catch(e) { return { success: false, error: e.message }; }
}

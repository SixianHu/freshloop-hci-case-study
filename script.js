'use strict';
const $=s=>document.querySelector(s),app=$('#app');
const baseFoods=[
{id:1,name:'Baby spinach',qty:'1 bag',category:'Produce',storage:'Fridge',date:'2026-09-24',emoji:'🥬'},
{id:2,name:'Tomatoes',qty:'4 pieces',category:'Produce',storage:'Fridge',date:'2026-09-25',emoji:'🍅'},
{id:3,name:'Wholemeal bread',qty:'4 slices',category:'Bakery',storage:'Pantry',date:'2026-09-26',emoji:'🍞'},
{id:4,name:'Oat milk',qty:'1 carton',category:'Dairy alternatives',storage:'Fridge',date:'2026-09-29',emoji:'🥛'},
{id:5,name:'Pasta',qty:'200 g',category:'Pantry staples',storage:'Pantry',date:'2026-12-15',emoji:'🍝'},
{id:6,name:'Olive oil',qty:'250 ml',category:'Pantry staples',storage:'Pantry',date:'2027-02-20',emoji:'🫒'}];
const scanTemplate=[{name:'Tomatoes',qty:'4 pieces',category:'Produce',storage:'Fridge',date:'',emoji:'🍅'}, {name:'Baby spinach',qty:'1 bag',category:'Produce',storage:'Fridge',date:'',emoji:'🥬'}, {name:'Oat milk',qty:'1 carton',category:'Dairy alternatives',storage:'Fridge',date:'',emoji:'🥛'}];
const recipes=[{"id":"pasta","title":"Tomato & spinach pasta","emoji":"🍝","mins":20,"desc":"Uses your tomatoes + spinach","ingredients":["Tomatoes","Baby spinach","Pasta","Olive oil","Parmesan"],"steps":["Boil pasta in salted water until tender.","Cook chopped tomatoes in a little olive oil.","Stir in the spinach until wilted, then toss with pasta.","Sprinkle with parmesan and serve."]},{"id":"toast","title":"Warm tomato toast","emoji":"🍞","mins":10,"desc":"A quick way to use your bread","ingredients":["Tomatoes","Wholemeal bread","Olive oil"],"steps":["Toast the bread until golden.","Warm chopped tomatoes with a little olive oil.","Spoon the tomatoes over the toast and serve."]},{"id":"fried-rice","title":"Vegetable fried rice","emoji":"🍚","mins":20,"desc":"Turn vegetables and leftover rice into a meal","ingredients":["Rice","Eggs","Carrots","Peas","Soy sauce"],"steps":["Cook rice ahead of time and chill it promptly, or use safely stored leftover rice.","Dice carrots and cook in a frying pan until tender.","Add peas and rice, then stir-fry until piping hot.","Scramble the eggs into the rice, add soy sauce and serve hot."]},{"id":"omelette","title":"Spinach & tomato omelette","emoji":"🍳","mins":15,"desc":"An easy breakfast with fresh vegetables","ingredients":["Eggs","Baby spinach","Tomatoes","Milk"],"steps":["Beat eggs with a splash of milk.","Cook chopped tomatoes and spinach in a non-stick pan.","Pour in the eggs and cook until fully set.","Fold and serve warm."]},{"id":"soup","title":"Easy vegetable soup","emoji":"🥣","mins":30,"desc":"A simple way to use spare vegetables","ingredients":["Carrots","Potatoes","Tomatoes","Onion","Vegetable stock"],"steps":["Chop the carrots, potatoes, tomatoes and onion.","Cook the onion in a large pot until softened.","Add the remaining vegetables and vegetable stock.","Simmer until the vegetables are tender, then serve."]},{"id":"pancakes","title":"Banana pancakes","emoji":"🥞","mins":15,"desc":"Use ripe bananas for a quick breakfast","ingredients":["Bananas","Eggs","Milk","Flour"],"steps":["Mash the bananas in a mixing bowl.","Whisk in eggs, milk and flour to make a batter.","Pour small rounds into a lightly oiled non-stick pan.","Cook both sides until golden and cooked through."]}];
const initialList=[{id:1,name:'Parmesan',qty:'30 g',done:false},{id:2,name:'Eggs',qty:'6 pack',done:false},{id:3,name:'Bananas',qty:'4 pieces',done:false}];
function stored(key,def){try{const v=JSON.parse(localStorage.getItem(key));return Array.isArray(v)?v:def}catch{return def}}
// Local-only demonstration accounts. No backend, no multi-device synchronization.
const USERS_KEY='freshloop-preparation-accounts-v1';
const SESSION_KEY='freshloop-preparation-session-v1';
const DATA_PREFIX='freshloop-preparation-user-v1:';
const defaultPreferences=()=>({frequency:'Daily summary',time:'18:00',lead:'2 days before'});
function readJSON(key,fallback){try{const value=JSON.parse(localStorage.getItem(key));return value??fallback}catch{return fallback}}
function accounts(){const data=readJSON(USERS_KEY,[]);return Array.isArray(data)?data:[]}
function clone(value){return JSON.parse(JSON.stringify(value))}
function sessionEmail(){try{return sessionStorage.getItem(SESSION_KEY)||localStorage.getItem(SESSION_KEY)||''}catch{return ''}}
let currentUser=accounts().find(u=>u.email===sessionEmail())||null;
let isGuest=false;
let foods=[],shopping=[],filter='All',page=currentUser?'kitchen':'login',selectedFood=null,scanItems=[],reviewIndex=0,recipeId='pasta',navHistory=[],lastUsed=null,preferences=defaultPreferences();
let cameraCaptured=false,uploadedPhoto=null,lastCookedRecipe=null;
let purchaseDraft=[];let deleteTarget=null;
function loadUserData(){
  const d=currentUser?readJSON(DATA_PREFIX+currentUser.email,{}):{};
  foods=Array.isArray(d.foods)?d.foods:[];
  shopping=Array.isArray(d.shopping)?d.shopping:[];
  preferences=d.preferences&&typeof d.preferences==='object'?d.preferences:defaultPreferences();
  filter='All';selectedFood=null;scanItems=[];lastUsed=null;navHistory=[];
}
function save(){
  if(!currentUser)return; // Guest activity stays in memory only.
  try{localStorage.setItem(DATA_PREFIX+currentUser.email,JSON.stringify({foods,shopping,preferences}))}
  catch(e){console.warn('Unable to save local demo data',e)}
}
function signOut(){save();currentUser=null;isGuest=false;sessionStorage.removeItem(SESSION_KEY);localStorage.removeItem(SESSION_KEY);foods=[];shopping=[];scanItems=[];purchaseDraft=[];selectedFood=null;lastUsed=null;navHistory=[];page='login';render()}
function enterAs(user,remember=false){
  currentUser=user;isGuest=!user;
  sessionStorage.removeItem(SESSION_KEY);localStorage.removeItem(SESSION_KEY);
  if(user)(remember?localStorage:sessionStorage).setItem(SESSION_KEY,user.email);
  if(user)loadUserData();else {foods=[];shopping=[];preferences=defaultPreferences();filter='All';scanItems=[];navHistory=[];}page='kitchen';navHistory=[];render();
}
async function passwordDigest(email,password,salt){
  if(!window.crypto?.subtle)throw new Error('Password hashing is unavailable in this browser. Please use a current Chrome or Safari.');
  const bytes=new TextEncoder().encode(`FreshLoop-local-v1:${salt}:${email}:${password}`);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function errorForm(message){const element=$('#auth-error');if(element){element.textContent=message;element.hidden=false}else toast(message)}
if(currentUser)loadUserData();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const dateText=d=>d?new Date(d+'T12:00:00').toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}):'Date unknown';
const matching=(a,b)=>String(a||'').trim().toLocaleLowerCase()===String(b||'').trim().toLocaleLowerCase();
const hasIngredient=name=>foods.some(f=>matching(f.name,name)&&bestBeforeStatus(f.date).kind!=='past');
const missingIngredients=r=>r.ingredients.filter(ing=>!hasIngredient(ing));
const recipeMatches=r=>r.ingredients.length-missingIngredients(r).length;
const recipeReady=r=>r.ingredients.length>0&&missingIngredients(r).length===0;
const sortedRecipes=()=>[...recipes].sort((a,b)=>Number(recipeReady(b))-Number(recipeReady(a))||recipeMatches(b)-recipeMatches(a)||a.title.localeCompare(b.title));
const suggestion=r=>`${recipeMatches(r)} of ${r.ingredients.length} ingredients ready · ${missingIngredients(r).length?'Missing: '+missingIngredients(r).join(', '):'Everything is in your kitchen!'}`;
const recommended=()=>sortedRecipes()[0];
const categories={Parmesan:'Dairy',Eggs:'Dairy',Bananas:'Produce',Tomatoes:'Produce','Baby spinach':'Produce','Wholemeal bread':'Bakery',Pasta:'Pantry staples','Olive oil':'Pantry staples','Oat milk':'Dairy alternatives',Rice:'Pantry staples',Carrots:'Produce',Peas:'Produce','Soy sauce':'Pantry staples',Milk:'Dairy',Potatoes:'Produce',Onion:'Produce','Vegetable stock':'Pantry staples',Flour:'Pantry staples'};
const emojis={Parmesan:'🧀',Eggs:'🥚',Bananas:'🍌',Tomatoes:'🍅','Baby spinach':'🥬','Wholemeal bread':'🍞',Pasta:'🍝','Olive oil':'🫒','Oat milk':'🥛',Rice:'🍚',Carrots:'🥕',Peas:'🫛','Soy sauce':'🥢',Milk:'🥛',Potatoes:'🥔',Onion:'🧅','Vegetable stock':'🥣',Flour:'🌾'};
function finishShopping(){
 const bought=shopping.filter(x=>x.done);
 if(!bought.length){toast('Tick the items you bought first.');return}
 purchaseDraft=bought.map(x=>({id:x.id,name:x.name,qty:x.qty==='To buy'?'1 item':x.qty||'1 item',category:categories[x.name]||'Other',storage:['Produce','Dairy','Dairy alternatives'].includes(categories[x.name])?'Fridge':'Pantry',date:'',unknown:true}));
 go('purchase-review');
}
function confirmPurchase(){
 if(!purchaseDraft.length){go('list');return}
 const boughtIDs=new Set(purchaseDraft.map(x=>String(x.id)));
 const today=localToday();
 for(let i=0;i<purchaseDraft.length;i++){
  const x=purchaseDraft[i];const date=$(`#purchase-date-${i}`)?.value||'';
  const unknown=$(`#purchase-unknown-${i}`)?.checked;
  if(!unknown&&!date){toast(`Choose a date or Date unknown for ${x.name}`);return}
  if(date&&!unknown&&date<today){toast('Best before cannot be in the past.');return}
  x.date=unknown?'':date;
  x.qty=$(`#purchase-qty-${i}`)?.value.trim()||x.qty;
  x.storage=$(`#purchase-storage-${i}`)?.value||x.storage;
 }
 for(const x of purchaseDraft) foods.unshift({id:Date.now()+Math.floor(Math.random()*1000000),name:x.name,qty:x.qty,category:x.category,storage:x.storage,date:x.date,addedAt:today,emoji:emojis[x.name]||'🛍️'});
 shopping=shopping.filter(x=>!boughtIDs.has(String(x.id)));
 const n=purchaseDraft.length;purchaseDraft=[];filter='All';save();go('kitchen',{reset:true});toast(`${n} purchased item(s) added to Food.`)
}
function showDeleteConfirm(id){const f=foods.find(x=>String(x.id)===String(id));if(!f)return;deleteTarget=id;const box=$('#delete-modal');$('#delete-food-name').textContent=f.name;box.hidden=false;$('#cancel-food-delete').focus()}
function hideDeleteConfirm(){deleteTarget=null;$('#delete-modal').hidden=true;document.querySelectorAll('.food-swipe.swiped').forEach(n=>n.classList.remove('swiped'))}
function confirmFoodDelete(){if(deleteTarget===null)return;foods=foods.filter(x=>String(x.id)!==String(deleteTarget));hideDeleteConfirm();save();render();toast('Food removed from your kitchen.')}
async function seedDemo(){
 // Local preparation: original preseeded login omitted. Use guest or a synthetic sign-up.
}

const btn=(label,to,secondary=false,action='go')=>`<button class="${secondary?'secondary':'primary'}" data-${action}="${to}">${label}</button>`;
const back=(to=null)=>`<button class="back" type="button" data-back="${to||'true'}">‹ &nbsp; Back</button>`;
const header=(title,sub='',to=null)=>`${back(to)}<h1>${title}</h1><p class="subtitle">${sub}</p>`;
const notice=(title,body,warning=false)=>`<div class="notice ${warning?'warning':''}"><strong>${title}</strong><span>${body}</span></div>`;
// Compare calendar dates, not elapsed hours, so results stay stable around midnight and DST.
function bestBeforeStatus(date){
  if(!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))return {kind:'normal',label:'Date unknown'};
  const [year,month,day]=date.split('-').map(Number);
  const stamp=Date.UTC(year,month-1,day);
  const now=new Date();
  const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
  const days=Math.round((stamp-today)/86400000);
  if(days<0)return {kind:'past',label:`Past best before · ${Math.abs(days)} day${days===-1?'':'s'} ago`};
  const lead=Math.max(0,Number.parseInt(preferences.lead,10)||2);
  if(days<=lead)return {kind:'soon',label:days===0?'Best before today':days===1?'Best before tomorrow':`Best before in ${days} days`};
  return {kind:'normal',label:`Best before ${dateText(date)}`};
}
function foodCard(f,mode='default'){
  const state=bestBeforeStatus(f.date);
  const warning=mode==='review'?'normal':state.kind;
  const message=mode==='review'?(f.date?'Best before '+dateText(f.date):'Date not confirmed'):state.label;
  const inner=`<div class="food ${warning==='past'?'food-past':''}"><div class="food-icon">${f.emoji||'🥗'}</div><div class="food-body"><strong>${esc(f.name)}</strong><span>${esc(f.qty)} · ${esc(f.storage||f.category)}</span><small class="food-date ${warning==='past'?'food-date-past':warning==='soon'?'food-date-soon':''}">${warning==='past'?'⚠ ':warning==='soon'?'◷ ':''}${esc(message)}</small></div><button class="food-action" data-${mode==='review'?'review':'food'}="${f.id}" aria-label="View ${esc(f.name)}">›</button></div>`;
  return mode==='review'?inner:`<div class="food-swipe" data-swipe-id="${f.id}"><div class="food-swipe-actions"><button class="swipe-delete" data-delete-food="${f.id}" aria-label="Delete ${esc(f.name)}">Delete</button></div><div class="food-swipe-content">${inner}</div></div>`;
}
const field=(name,id,value='',type='text',placeholder='')=>`<label class="field">${name}<input id="${id}" type="${type}" ${type==='date'?`min="${localToday()}"`: ''} value="${esc(value)}" placeholder="${esc(placeholder)}"></label>`;
const optionField=(name,id,opts,value)=>`<label class="field">${name}<select id="${id}">${opts.map(o=>`<option ${o===value?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`;
function toast(s){const t=$('#toast');t.textContent=s;t.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove('show'),2500)}
// App navigation is separate from browser history. Each entry keeps its caller's
// item, filter and scroll position; Back consumes entries rather than adding one.
const mainTabs=['kitchen','recipes','list'];
const resultParents={added:'kitchen',scanned:'kitchen',used:'kitchen','prefs-saved':'reminders'};
const pageParents={signup:'login',account:'kitchen','add-choice':'kitchen',add:'add-choice',food:'kitchen',edit:'food',scan:'add-choice',camera:'scan',upload:'scan',review:'scan','review-item':'review',reminders:'kitchen','reminder-settings':'reminders',recipe:'recipes','purchase-review':'list',...resultParents};
function navigationEntry(name=page){return {page:name,selectedFood,recipeId,reviewIndex,filter,scrollTop:name===page?app.scrollTop:0}}
function entryAvailable(entry){
 if(!currentUser&&!isGuest)return ['login','signup'].includes(entry.page);
 if(['food','edit'].includes(entry.page))return foods.some(f=>f.id===entry.selectedFood);
 if(entry.page==='review')return scanItems.length>0;
 if(entry.page==='review-item')return !!scanItems[entry.reviewIndex];
 if(entry.page==='purchase-review')return purchaseDraft.length>0;
 return true;
}
function restoreEntry(entry){
 page=entry.page;selectedFood=entry.selectedFood;recipeId=entry.recipeId;reviewIndex=entry.reviewIndex;filter=entry.filter;
 render();app.scrollTop=entry.scrollTop||0;
}
function keepThrough(name){
 const index=navHistory.map(entry=>entry.page).lastIndexOf(name);
 navHistory=index<0?[navigationEntry(name)]:navHistory.slice(0,index+1);
}
function go(next,{reset=false,replace=false}={}){
 if(!currentUser&&!isGuest&&!['login','signup'].includes(next)){toast('Please log in first.');next='login';reset=true}
 if(reset){navHistory=[];page=next;render();return}
 if(page===next)return;
 // Returning to an ancestor must never create an edit/detail or review loop.
 const index=navHistory.map(entry=>entry.page).lastIndexOf(next);
 if(index>=0&&entryAvailable(navHistory[index])){const entry=navHistory[index];navHistory=navHistory.slice(0,index);restoreEntry(entry);return}
 if(resultParents[next])keepThrough(resultParents[next]);
 else if(!replace&&!resultParents[page])navHistory.push(navigationEntry());
 page=next;render();
}
function previous(target=null){
 if(deleteTarget!==null){hideDeleteConfirm();return}
 if(target){
  const index=navHistory.map(entry=>entry.page).lastIndexOf(target);
  if(index>=0){const entry=navHistory[index];navHistory=navHistory.slice(0,index);if(entryAvailable(entry)){restoreEntry(entry);return}}
  else navHistory=[];
 }
 if(!target){while(navHistory.length){const entry=navHistory.pop();if(entryAvailable(entry)){restoreEntry(entry);return}}}
 let fallback=!currentUser&&!isGuest?'login':target||pageParents[page]||'kitchen';
 while(!entryAvailable(navigationEntry(fallback)))fallback=pageParents[fallback]||'kitchen';
 go(fallback,{reset:true});
}
function restartAdding(next){
 // Start a fresh add/scan flow, with no completed form or receipt behind it.
 keepThrough('kitchen');
 navHistory.push(navigationEntry('add-choice'));
 scanItems=[];cameraCaptured=false;uploadedPhoto=null;
 go(next,{replace:true});
}

const navIcons={
 kitchen:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 11h16M8 7h2M8 15h2"/></svg>',
 recipes:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 13a4 4 0 0 1 1-7.8 5 5 0 0 1 9.5 0A4 4 0 0 1 18 13v5H6z"/><path d="M6 18h12M9 21h6"/></svg>',
 list:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M2 3h2l3 13h13l2-9H5"/></svg>'
};
function render(){let html='';$('#nav').style.display=['login','signup'].includes(page)?'none':'flex';
$('#nav').innerHTML=mainTabs.map(p=>{const active=page===p||(p==='kitchen'&&['food','edit','add','add-choice','added','scan','camera','upload','review','review-item','scanned','reminders','reminder-settings','prefs-saved','used','cooked','duplicate','account'].includes(page))||(p==='recipes'&&page==='recipe')||(p==='list'&&page==='purchase-review');return `<button class="${active?'active':''}" data-go="${p}" aria-label="${{kitchen:'Food',recipes:'Recipes',list:'Shopping'}[p]}"><span class="symbol">${navIcons[p]}</span>${{kitchen:'Food',recipes:'Recipes',list:'Shopping'}[p]}</button>`}).join('');
switch(page){
case 'login':html=`<div class="login-art">🥬 🍅</div><div class="login-logo">🌿 FreshLoop</div><h1>Welcome back.</h1><p class="subtitle">Log in to access your own kitchen.</p><form id="login-form">${field('Email','login-email','','email','demo@example.invalid')}${field('Password','login-password','','password','Your password')}<label class="auth-check"><input type="checkbox" id="remember"> Keep me logged in on this browser</label><p id="auth-error" class="auth-error" role="alert" hidden></p><button class="primary" type="submit">Log in</button></form><button class="secondary" id="guest-login">Continue as guest</button><p class="login-footer">Don't have an account? <button class="textbutton" data-go="signup">Sign up</button></p><p class="muted">Local demo accounts only. Do not use a real password.</p>`;break;
case 'signup':html=`${back()}<div class="login-logo">🌿 FreshLoop</div><h1>Create an account</h1><p class="subtitle">Your own kitchen, saved on this browser.</p><form id="signup-form">${field('Your name','signup-name','','text','Your name')}${field('Email','signup-email','','email','demo@example.invalid')}${field('Password','signup-password','','password','At least 8 characters')}${field('Confirm password','signup-confirm','','password','Re-enter password')}<p class="helper">Use 8+ characters with a letter and a number. Use a demo-only password.</p><p id="auth-error" class="auth-error" role="alert" hidden></p><button class="primary" type="submit">Create account</button></form><button class="secondary" data-back="true">${isGuest?'Back to account':'Back to login'}</button>`;break;
case 'kitchen':{
 const filtered=foods.filter(f=>filter==='All'||f.storage===filter).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
 const dated=foods.filter(f=>f.date).sort((a,b)=>a.date.localeCompare(b.date));
 const top=dated[0];
 html=`<div class="topline"><div><h1>My kitchen</h1><p class="subtitle">A little care. A lot less waste.</p></div><div class="top-actions"><button class="top-action-button account-button" data-go="account" title="Account & log out" aria-label="Account and logout"><span class="top-action-icon">👤</span><span class="top-action-label">Account</span></button><button class="top-action-button bell" data-go="reminders" title="Best before reminders" aria-label="Best before reminders"><span class="top-action-icon">🔔</span><span class="top-action-label">Reminders</span></button></div></div>
 ${!foods.length?notice('Your kitchen starts here','Add your first food item or scan a grocery receipt.'):''}
 <button class="primary add-food-hero" data-go="add-choice"><span class="add-hero-icon">＋</span><span><strong>Add Food</strong><small>Manually add or scan a receipt</small></span><span class="add-hero-arrow">→</span></button>
 <div class="filters">${['All','Fridge','Pantry'].map(f=>`<button class="${filter===f?'active':''}" data-filter="${f}">${f}</button>`).join('')}</div>
 <div class="sortline">Today: ${dateText(localToday())} · Soonest best-before first</div>
 ${filtered.length?filtered.map(f=>foodCard(f)).join(''):'<p class="empty">Nothing here yet. Tap “Add food” to get started.</p>'}
 ${foods.length?`<button class="textbutton" data-go="recipes">🍽️ See recipes for my ingredients →</button>`:''}`;
 break;}
 case 'account':html=`${header('My account','Account and data for this browser.')}<div class="card"><h3>${currentUser?esc(currentUser.name):'Guest'}</h3><p>${currentUser?esc(currentUser.email):'Guest mode — changes are not saved after leaving.'}</p></div>${notice('Your own kitchen',currentUser?'Your food and shopping list are saved separately from other local accounts.':'Create an account to save your kitchen on this browser.')}${currentUser?'<button class="secondary" id="logout">Log out</button>':btn('Create an account','signup')+'<button class="secondary" id="logout">Exit guest mode</button>'}`;break;
case 'add-choice':html=`${header('Add a little freshness','Choose the quickest way to update your kitchen.')}${notice('Less typing. More living.','Scan a receipt, review the results, and check dates on the packaging.')}${btn('▣ Scan a receipt','scan')}${btn('＋ Add food manually','add',true)}${notice('Your kitchen stays yours','You review every item before it is saved.')}`;break;
case 'add':html=`${header('Add food','A few details now. Less waste later.','add-choice')}<form id="add-form">${field('Food name','name','','text','Greek yogurt')}${field('Quantity','qty','','text','1 tub')}${optionField('Category','category',['Produce','Dairy','Dairy alternatives','Bakery','Pantry staples','Other'],'Dairy')}${optionField('Storage','storage',['Fridge','Pantry'],'Fridge')}${field('Best-before date','date','','date')}<p class="helper">Check the date printed on the pack.</p><button type="submit" class="primary">Save food</button></form>`;break;
case 'added':html=`${header('Freshness, saved.','Your food is now in My kitchen.','kitchen')}<div class="hero-success">✅</div>${notice('✓ Added to your fridge','Your kitchen inventory has been updated.')}${btn('View my kitchen','kitchen')}${btn('Add another item','add',true,'restart')}`;break;
case 'food':{const f=foods.find(f=>f.id===selectedFood);if(!f){go('kitchen');return}html=`${header(esc(f.name),esc(f.category)+' · '+esc(f.storage))}<div class="hero-success">${f.emoji}</div><div class="card"><h3>${esc(f.name)}</h3><p>Quantity · ${esc(f.qty)}</p><p>Best before: ${dateText(f.date)}</p><p>Added on: ${f.addedAt?dateText(f.addedAt):'Not recorded (older item)'}</p><p class="detail-date ${bestBeforeStatus(f.date).kind==='past'?'food-date-past':bestBeforeStatus(f.date).kind==='soon'?'food-date-soon':''}">${esc(bestBeforeStatus(f.date).label)}</p></div>${notice('Keep an eye on freshness','Check the date and condition before using.')}${btn('Find a recipe','recipes')}${btn('Edit quantity & date →','edit',true)}<button class="secondary" id="used-btn">Mark as used</button>`;break;}
case 'edit':{const f=foods.find(f=>f.id===selectedFood);if(!f){go('kitchen');return}html=`${header('Edit '+esc(f.name),'Update the amount or check the date.','food')}<form id="edit-form">${field('Quantity','qty',f.qty)}${field('Best-before date','date',f.date,'date')}${optionField('Storage','storage',['Fridge','Pantry'],f.storage)}<button type="submit" class="primary">Save changes</button></form>`;break;}
case 'used':html=`${header('A little less waste.','This item has been marked as used.')}<div class="hero-success">🌱</div>${notice('✓ Kitchen updated','The item is removed from your available food.')}${btn('View my kitchen','kitchen')}<button class="secondary" id="undo-used">Undo</button>`;break;
case 'scan':
  html = `
    ${header('Scan your receipt', 'Add your groceries in one simple step.')}

    <div class="receipt-camera">
      <div class="receipt-paper">
        <h3>FRESH MARKET</h3>
        <small>24 SEP 2026 • 14:32</small>
        <hr>
        <div>Tomatoes <b>$3.50</b></div>
        <div>Baby spinach <b>$2.80</b></div>
        <div>Oat milk <b>$3.00</b></div>
        <hr>
        <div><b>TOTAL</b><b>$9.30</b></div>
      </div>
    </div>

    <p class="helper">
      Keep the full receipt inside the frame.<br>
      Use good lighting and avoid shadows.
    </p>

    <button class="primary" id="capture">
      ◎ Capture receipt
    </button>

    <button class="secondary" id="choose">
      Choose from photos
    </button>

    <p class="muted">
      Demo: scanning is simulated in this prototype.
    </p>
  `;
  break;
case 'camera':html=`${header('Take a photo','Position your receipt inside the frame.','scan')}<div class="camera-preview"><div class="camera-corners"><div class="receipt-paper"><h3>FRESH MARKET</h3><small>24 SEP 2026 • 14:32</small><hr><div>Tomatoes <b>$3.50</b></div><div>Baby spinach <b>$2.80</b></div><div>Oat milk <b>$3.00</b></div><hr><div><b>TOTAL</b><b>$9.30</b></div></div></div></div><p class="helper">${cameraCaptured?'Photo captured. Review it before continuing.':'Make sure all items are visible and the text is clear.'}</p>${cameraCaptured?'<button class="primary" id="use-camera-photo">✓ Use photo</button><button class="secondary" id="retake-camera-photo">Retake</button>':'<button class="primary" id="take-camera-photo">◎ Take photo</button><button class="secondary" data-back="scan">Cancel</button>'}<p class="muted">Demo camera: the receipt preview is simulated.</p>`;break;
case 'upload':html=`${header('Upload receipt','Choose a receipt photo from your device.','scan')}<div class="upload-area">${uploadedPhoto?`<img src="${uploadedPhoto}" class="uploaded-preview" alt="Selected receipt">`:'<div class="upload-icon">▧</div><h3>No photo selected</h3><p>Select a clear photo of your receipt.</p>'}</div><input type="file" id="receipt-file" accept="image/*" hidden><button class="secondary" id="select-photo">${uploadedPhoto?'Choose another photo':'Select a photo'}</button><button class="primary" id="continue-upload" ${uploadedPhoto?'':'disabled'}>Continue</button><p class="muted">Select a JPG, PNG, or another supported image. Receipt recognition is simulated.</p>`;break;
case 'review':html=`${header('Check your items',`${scanItems.length} groceries found. Tap an item to correct it.`)}${notice('Dates need your review','Receipts usually omit expiry dates. Check each package before confirming.',true)}${scanItems.map((f,i)=>foodCard({...f,id:i},'review')).join('')}<button class="primary" id="confirm-scan">Confirm & add ${scanItems.length} items</button>${btn('Retake photo','scan',true,'retake')}`;break;
case 'review-item':{let f=scanItems[reviewIndex];html=`${header('Review '+esc(f.name),'Check the recognised details before saving.','review')}<form id="review-form"><div class="card"><h3>${esc(f.name)}</h3><p>Category: ${esc(f.category)} · Storage: ${esc(f.storage)}</p></div>${field('Quantity · tap to correct','qty',f.qty)}${field('Date on package · tap to confirm','date',f.date,'date')}${notice('Dates are not read from receipts','Check the package or leave the date as unknown.',true)}<button type="submit" class="primary">Save reviewed item</button></form>`;break;}
case 'scanned':html=`${header('Groceries added',`${scanItems.length} reviewed items are now in your kitchen.`,'kitchen')}<div class="hero-success">🛒</div>${notice('✓ Receipt saved','New purchases are kept as separate batches, so older food stays visible.')}${btn('View my kitchen','kitchen')}${btn('Scan another receipt','scan',true,'restart')}`;break;
case 'reminders':{
 const dated=foods.filter(f=>f.date).sort((a,b)=>a.date.localeCompare(b.date));
 html=`${header('Use it, don’t lose it','Your upcoming best-before dates.')}<span class="pill">${dated.length} dated item${dated.length===1?'':'s'}</span>${dated.length?dated.map(f=>foodCard(f)).join(''):'<p class="empty">No dated groceries yet. Add food and set a date to see reminders.</p>'}${foods.length?btn('Find recipes for my food','recipes'):btn('Add food','add-choice')}${btn('Reminder preferences →','reminder-settings',true)}`;break;}
 case 'reminder-settings':html=`${header('Reminders, your way','Stay in the loop without the noise.','reminders')}<form id="prefs-form">${optionField('Reminder frequency','frequency',['Daily summary','Paused'],preferences.frequency)}${field('Daily summary time','time',preferences.time,'time')}${optionField('Remind me','lead',['1 day before','2 days before','3 days before','5 days before','7 days before'],preferences.lead)}${notice('One useful nudge','Items are grouped into a single daily summary. Urgent food stays visible in your kitchen.')}<button type="submit" class="primary">Save preferences</button></form>`;break;
case 'prefs-saved':html=`${header('All set.','Your reminder preferences have been saved.','reminders')}<div class="hero-success">🔔</div>${notice('Daily summary',esc(preferences.frequency)+' · '+esc(preferences.time))}${btn('Back to reminders','reminders',false,'back')}${btn('Change preferences','reminder-settings',true)}`;break;
case 'recipes':{
 html=`${navHistory.length?back():''}<h1>Made for your fridge</h1><p class="subtitle">Recommendations ranked by the ingredients in your kitchen.</p>${sortedRecipes().some(r=>recipeMatches(r)>0)?'':notice('No matching recipes yet','Add some ingredients to Food to see relevant recipe ideas.')}${sortedRecipes().filter(r=>recipeMatches(r)>0).map(r=>`<button class="recipe-card ${recipeReady(r)?'recipe-ready':''}" data-recipe="${r.id}">${recipeReady(r)?'<span class="recipe-ready-label">✓ Ready to make</span>':''}<div class="recipe-art">${r.emoji}</div><strong>${esc(r.title)}</strong><p>${esc(suggestion(r))}</p><small>${r.mins} min · Easy · 2 servings &nbsp; →</small></button>`).join('')}`;break;}
 case 'recipe':{const r=recipes.find(x=>x.id===recipeId),missing=missingIngredients(r);
 html=`${header(esc(r.title),'Recipe matched to your current kitchen','recipes')}${recipeReady(r)?'<span class="recipe-ready-label">✓ Ready to make</span>':''}<div class="recipe-art large">${r.emoji}</div><p class="muted">${r.mins} min · Easy · 2 servings</p>${notice(missing.length?`${missing.length} ingredient${missing.length===1?'':'s'} missing`:'✓ All ingredients available',missing.length?'Add missing items to your shopping list.':'You have everything listed for this recipe.')}
 <h2>What you’ll need</h2>${r.ingredients.map(ing=>`<div class="ingredient"><span class="tick">${hasIngredient(ing)?'✓':'○'}</span>${esc(ing)} ${hasIngredient(ing)?'<span class="ingredient-state">In your kitchen</span>':'<span class="ingredient-state missing">Missing</span>'}</div>`).join('')}
 ${missing.length?`<button class="secondary" id="add-missing">＋ Add ${missing.length} missing item${missing.length===1?'':'s'} to shopping list</button>`:''}
 <h2>Let’s make it</h2><ol class="recipe-steps">${r.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><p class="helper">Recipe suggestions are based on ingredients recorded in Food, not precise quantities. Check you have enough before cooking. Viewing a recipe does not change your inventory.</p>`;break;}
case 'purchase-review':html=`${header('Review purchased food','Check details before saving. Select Date unknown if you cannot find the date.','list')}
 ${purchaseDraft.map((x,i)=>`<div class="card purchase-card"><h3>${emojis[x.name]||'🛍️'} ${esc(x.name)}</h3><label class="field">Quantity<input id="purchase-qty-${i}" value="${esc(x.qty)}" required></label><label class="field">Storage<select id="purchase-storage-${i}"><option ${x.storage==='Fridge'?'selected':''}>Fridge</option><option ${x.storage==='Pantry'?'selected':''}>Pantry</option></select></label><label class="field">Best-before date<input type="date" id="purchase-date-${i}" min="${localToday()}" ${x.unknown?'disabled':''} value="${esc(x.date)}"></label><label class="unknown-check"><input type="checkbox" id="purchase-unknown-${i}" data-unknown="${i}" ${x.unknown?'checked':''}> Date unknown</label></div>`).join('')}
 <button class="primary" id="confirm-purchases">Confirm & add to Food</button><p class="helper">Nothing is added until you confirm. Back will keep purchased items on your shopping list.</p>`;break;
case 'list':html=`${navHistory.length?back():''}<h1>Shopping list</h1><p class="subtitle">Tick what you bought, then add it to your kitchen.</p>${shopping.length?notice('Ready to unpack?','Tick purchased groceries. Next, confirm their best-before dates (or select Date unknown).') :notice('Your shopping list is empty','Open a recipe to add missing ingredients, or add an item below.')}
 <form id="list-form" class="input-row"><input class="text-input" id="list-name" placeholder="Add an item" required><button type="submit" aria-label="Add item">＋</button></form>
 ${shopping.map(x=>`<div class="shopping-item ${x.done?'done':''}"><label><input type="checkbox" data-toggle="${x.id}" ${x.done?'checked':''}><span>${esc(x.name)} <small class="muted">· ${esc(x.qty)}</small></span></label><button class="delete" data-delete="${x.id}" aria-label="Remove ${esc(x.name)}">×</button></div>`).join('')}
 <button class="primary" id="finish-shopping" ${shopping.some(x=>x.done)?'':'disabled'}>✓ Finish shopping · Review ${shopping.filter(x=>x.done).length} items</button><p class="helper">You will review each purchased item before it is added to Food. Unchecked items stay here.</p>`;break;
}
app.innerHTML=html;
const backbar=$('#backbar');
const backButton=app.querySelector('.back');
backbar.replaceChildren();
if(backButton){backbar.appendChild(backButton);backbar.hidden=false;}
else backbar.hidden=true;
app.scrollTop=0;save()}
function scanStart(){scanItems=scanTemplate.map(x=>({...x}));go('review')}
function form(id,handler){const el=$('#'+id);if(el)el.addEventListener('submit',e=>{e.preventDefault();handler()})}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
if(b.dataset.back){previous(b.dataset.back==='true'?null:b.dataset.back);return}
if(b.dataset.restart){restartAdding(b.dataset.restart);return}
if(b.dataset.retake){scanItems=[];cameraCaptured=false;uploadedPhoto=null;previous('scan');return}
if(b.dataset.go){go(b.dataset.go,{reset:!!b.closest('#nav')});return}if(b.dataset.filter){filter=b.dataset.filter;render();return}
if(b.dataset.food){selectedFood=Number(b.dataset.food);go('food');return}if(b.dataset.review){reviewIndex=Number(b.dataset.review);go('review-item');return}
if(b.id==='guest-login'){enterAs(null);return}
if(b.id==='finish-shopping'){finishShopping();return}
if(b.id==='confirm-purchases'){confirmPurchase();return}
if(b.dataset.deleteFood){showDeleteConfirm(b.dataset.deleteFood);return}
if(b.id==='cancel-food-delete'){hideDeleteConfirm();return}
if(b.id==='confirm-food-delete'){confirmFoodDelete();return}
if(b.id==='add-missing'){const r=recipes.find(x=>x.id===recipeId);for(const name of missingIngredients(r)){if(!shopping.some(x=>matching(x.name,name)))shopping.push({id:Date.now()+Math.floor(Math.random()*1000000),name,qty:name==='Parmesan'?'30 g':'To buy',done:false})}save();go('list');toast('Missing ingredients added to shopping list');return}
if(b.id==='logout'){signOut();return}
if(b.dataset.recipe){recipeId=b.dataset.recipe;go('recipe');return}
if(b.dataset.delete){shopping=shopping.filter(x=>x.id!==Number(b.dataset.delete));render();return}
if(b.id==='capture'){cameraCaptured=false;go('camera');return}
if(b.id==='choose'){uploadedPhoto=null;go('upload');return}
if(b.id==='take-camera-photo'){cameraCaptured=true;render();return}
if(b.id==='retake-camera-photo'){cameraCaptured=false;render();return}
if(b.id==='use-camera-photo'){scanStart();return}
if(b.id==='select-photo'){const input=$('#receipt-file');if(input)input.click();return}
if(b.id==='continue-upload'){if(!uploadedPhoto){toast('Please select a photo first.');return}scanStart();return}
if(b.id==='confirm-scan'){foods=[...scanItems.map((f,i)=>({...f,id:Date.now()+i,addedAt:localToday()})),...foods];go('scanned');return}
if(b.id==='used-btn'){lastUsed={kind:'item',snapshot:foods.slice()};foods=foods.filter(f=>f.id!==selectedFood);go('used');return}
if(b.id==='undo-used'||b.id==='undo-cooked'){if(lastUsed){foods=lastUsed.snapshot;lastUsed=null}previous('kitchen');toast('Changes undone');return}
if(b.id==='add-parmesan'){if(!shopping.some(s=>s.name==='Parmesan'))shopping.unshift({id:Date.now(),name:'Parmesan',qty:'30 g',done:false});save();toast('Parmesan added to shopping list');return}});
document.addEventListener('change',e=>{
if(e.target.id!=='receipt-file')return;
const file=e.target.files?.[0];if(!file)return;
if(!file.type.startsWith('image/')){toast('Please select an image file.');return}
if(file.size>10*1024*1024){toast('Please choose an image smaller than 10 MB.');return}
const reader=new FileReader();
reader.onload=()=>{if(page==='upload'){uploadedPhoto=reader.result;render()}};
reader.onerror=()=>toast('Unable to read the selected image.');
reader.readAsDataURL(file);
});
document.addEventListener('change',e=>{if(e.target.matches('[data-unknown]')){const i=Number(e.target.dataset.unknown);purchaseDraft[i].unknown=e.target.checked;const input=$('#purchase-date-'+i);input.disabled=e.target.checked;if(e.target.checked)input.value='';return}if(e.target.matches('[data-toggle]')){const x=shopping.find(x=>x.id===Number(e.target.dataset.toggle));if(x)x.done=e.target.checked;render()}});
document.addEventListener('submit',async e=>{e.preventDefault();const id=e.target.id;
if(id==='signup-form'){
  const name=$('#signup-name').value.trim(),email=$('#signup-email').value.trim().toLowerCase(),password=$('#signup-password').value,confirm=$('#signup-confirm').value;
  if(name.length<2){errorForm('Please enter a name of at least 2 characters.');return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){errorForm('Please enter a valid email address.');return}
  if(accounts().some(u=>u.email===email)){errorForm('This email already has a local account. Please log in.');return}
  if(password.length<8||!/[a-zA-Z]/.test(password)||!/\d/.test(password)){errorForm('Use at least 8 characters, including a letter and a number.');return}
  if(password!==confirm){errorForm('Passwords do not match.');return}
  try{
    const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
    const hash=await passwordDigest(email,password,salt);
    const user={name,email,salt,hash};
    const items=accounts();if(items.some(u=>u.email===email)){errorForm('This email is already registered.');return}
    items.push(user);localStorage.setItem(USERS_KEY,JSON.stringify(items));signOut();toast('Account created! Please sign in.');
  }catch(err){errorForm(err.message||'Unable to create account. Please check browser storage.')}return;
}
if(id==='login-form'){
  const email=$('#login-email').value.trim().toLowerCase(),password=$('#login-password').value,user=accounts().find(u=>u.email===email);
  if(!user){errorForm('Account not found. Please sign up first.');return}
  try{
    const actual=await passwordDigest(email,password,user.salt);
    if(actual!==user.hash){errorForm('Incorrect password. Please try again.');return}
    enterAs(user,$('#remember').checked);toast('Welcome back, '+user.name+'!');
  }catch(err){errorForm(err.message||'Login unavailable.')}return;
}
if(id==='add-form'){if($('#date').value&&$('#date').value<localToday()){toast('Please choose today or a future best-before date.');return}const name=$('#name').value.trim();if(!name){toast('Please enter a food name');return}const category=$('#category').value;foods.unshift({id:Date.now(),name,qty:$('#qty').value.trim()||'1 item',category,storage:$('#storage').value,date:$('#date').value,addedAt:localToday(),emoji:category==='Produce'?'🥬':category==='Dairy'?'🥛':'🥗'});go('added');return}
if(id==='edit-form'){const old=foods.find(x=>x.id===selectedFood);if($('#date').value&&$('#date').value<localToday()&&$('#date').value!==old?.date){toast('Please choose today or a future best-before date.');return}const f=foods.find(x=>x.id===selectedFood);if(f){f.qty=$('#qty').value.trim()||f.qty;f.date=$('#date').value;f.storage=$('#storage').value}previous('food');toast('Changes saved');return}
if(id==='review-form'){if($('#date').value&&$('#date').value<localToday()){toast('Please choose today or a future best-before date.');return}scanItems[reviewIndex].qty=$('#qty').value.trim()||scanItems[reviewIndex].qty;scanItems[reviewIndex].date=$('#date').value;previous('review');toast('Item reviewed');return}
if(id==='prefs-form'){preferences={frequency:$('#frequency').value,time:$('#time').value,lead:$('#lead').value};go('prefs-saved');return}
if(id==='list-form'){const name=$('#list-name').value.trim();if(name){shopping.push({id:Date.now(),name,qty:'To buy',done:false});render()}return}
});
seedDemo().finally(()=>render());

// Swipe left to reveal Delete; works with touch and mouse. Back/right swipe closes it.
let swipeStart=null;
document.addEventListener('pointerdown',e=>{const card=e.target.closest('.food-swipe');if(!card||e.target.closest('button'))return;swipeStart={id:card.dataset.swipeId,x:e.clientX,y:e.clientY};});
document.addEventListener('pointerup',e=>{if(!swipeStart)return;const card=document.querySelector(`.food-swipe[data-swipe-id="${swipeStart.id}"]`);const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;swipeStart=null;if(!card||Math.abs(dx)<35||Math.abs(dx)<Math.abs(dy))return;document.querySelectorAll('.food-swipe.swiped').forEach(n=>{if(n!==card)n.classList.remove('swiped')});card.classList.toggle('swiped',dx<0);if(dx>0)card.classList.remove('swiped')});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&deleteTarget!==null)hideDeleteConfirm()});

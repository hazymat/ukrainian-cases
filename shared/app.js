// Shared engine for the Ukrainian Cases practice pages.
// Each page defines `const STORAGE_KEY = "...";` and `const DATA = {...};` inline (in its own
// <script> tag, before this file is loaded), then includes this file via
// <script src="shared/app.js"></script>. This file reads those two globals and builds the
// interactive exercises into <div id="sections">.
//
// Two DATA shapes are supported, auto-detected:
//   - Single-case pages: DATA.usageExercises / vocabExercises / fillExercises / revisionExercises
//     (plus matching *WrapperTitle strings) -- four fixed parts, see buildMC/buildTwoPart/buildFill/
//     buildRevisionItem below.
//   - Combo/contrastive pages: DATA.exercises -- a flat array of sections, each built with buildBracket.

let STORE = {};
try{ STORE = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }catch(e){ STORE = {}; }
function saveAnswer(id, data){
  STORE[id]=data;
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(STORE)); }catch(e){}
}

let total=0, answered=0, correctCount=0;

// Remembers which <details data-state-key="..."> sections were open across a reset-triggered
// reload, so resetting one exercise doesn't collapse the whole page back to closed. Only used
// around reset actions, not on ordinary navigation/refresh.
const OPEN_STATE_KEY = STORAGE_KEY+"_openstate";

function saveOpenState(){
  const openKeys=[...document.querySelectorAll("details[data-state-key]")].filter(d=>d.open).map(d=>d.dataset.stateKey);
  try{ sessionStorage.setItem(OPEN_STATE_KEY, JSON.stringify(openKeys)); }catch(e){}
}

function restoreOpenState(){
  let openKeys=[];
  try{ openKeys=JSON.parse(sessionStorage.getItem(OPEN_STATE_KEY)||"[]"); }catch(e){}
  if(!openKeys.length) return;
  openKeys.forEach(key=>{
    const el=document.querySelector('details[data-state-key="'+CSS.escape(key)+'"]');
    if(el) el.open=true;
  });
  try{ sessionStorage.removeItem(OPEN_STATE_KEY); }catch(e){}
}

function updateProgress(){
  document.getElementById("ansCount").textContent=answered;
  document.getElementById("corrCount").textContent=correctCount;
  document.getElementById("fillBar").style.width=(total?(answered/total*100):0)+"%";
}

// Per-exercise ("group") completion tracking: each exercise/section gets a groupKey
// (idPrefix+"_"+exerciseIndex, e.g. "v_2"), derived from the item id (idPrefix+"_"+ei+"_"+ii,
// optionally with a suffix like "_c"/"_mc"/"_why") by taking its first two underscore-separated
// parts. Single-case pages additionally group exercises under a wrapperKey (one per Part, e.g.
// "v") for the always-visible "N/M exercises complete" tally; combo pages have no wrapper level.
const groupTally = {};
const groupEls = {};
const groupWrapperMap = {};
const wrapperGroups = {};
const wrapperEls = {};

function initGroup(groupKey, itemCount, wrapperKey){
  groupTally[groupKey] = {answered:0, correct:0, total:itemCount};
  if(wrapperKey){
    groupWrapperMap[groupKey] = wrapperKey;
    if(!wrapperGroups[wrapperKey]) wrapperGroups[wrapperKey] = [];
    wrapperGroups[wrapperKey].push(groupKey);
  }
}

// qEl (the item's own .q element) is passed in directly by the caller, which already has it in
// scope from building the item, rather than looked up here -- during a page-load replay of a
// stored answer, this fires *before* that item has been appended to the DOM (buildWrapper/
// assembleComboPage append the returned element only after the builder function returns), so a
// query-based lookup at this point would silently find nothing.
function recordGroupAnswer(id, isCorrect, qEl){
  const parts = id.split("_");
  const groupKey = parts[0]+"_"+parts[1];
  const g = groupTally[groupKey];
  if(!g) return;
  g.answered++;
  if(isCorrect) g.correct++;

  if(qEl) qEl.dataset.answered = "1";
  const groupEl = groupEls[groupKey];
  if(groupEl) updateSkippedHighlights(groupEl);

  const justCompleted = g.answered>=g.total && !STORE[groupKey+"_cel"];
  if(justCompleted){
    STORE[groupKey+"_cel"]=true;
    // Personal-best tracking: "best_<groupKey>" deliberately doesn't start with groupKey+"_",
    // so resetGroup's prefix-based clear doesn't wipe it -- the historical high score survives
    // a reset, which is the point (something for the next attempt to beat). The "_rec" flag
    // (does start with the prefix, so it IS cleared on reset) records whether THIS completion
    // was a new record, so ensureCelebrateNote can show the badge consistently across reloads
    // without re-deriving it from a comparison that a later reset/redo would change the answer to.
    const bestKey = "best_"+groupKey;
    const prevBest = STORE[bestKey];
    if(prevBest===undefined){
      STORE[bestKey] = g.correct;
    } else if(g.correct > prevBest){
      STORE[bestKey] = g.correct;
      STORE[groupKey+"_rec"] = true;
    }
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(STORE)); }catch(e){}
  }
  updateGroupUI(groupKey);
  if(justCompleted) celebrateGroup(groupKey);
}

// Flags any question that comes before the last-answered one in its exercise but is itself still
// unanswered -- a likely accidental skip (e.g. answered 1 and 3, missed 2) rather than a question
// simply not reached yet. Re-run after every answer in the group, so a flag clears itself the
// moment the learner goes back and fills the gap.
function updateSkippedHighlights(groupEl){
  const items = [...groupEl.querySelectorAll(":scope > .body .q[data-item-id]")];
  let lastAnsweredIndex = -1;
  items.forEach((qEl,i)=>{ if(qEl.dataset.answered==="1") lastAnsweredIndex = i; });
  items.forEach((qEl,i)=>{
    const isSkipped = i < lastAnsweredIndex && qEl.dataset.answered!=="1";
    qEl.classList.toggle("q-skipped", isSkipped);
    let tag = qEl.querySelector(":scope > .skip-tag");
    if(isSkipped && !tag){
      tag = document.createElement("div");
      tag.className = "skip-tag";
      tag.innerHTML = `${emojify("⚠️")}<span>Пропущено, поверніться сюди <span class="en">Skipped, come back to this one</span></span>`;
      qEl.insertBefore(tag, qEl.firstChild);
    } else if(!isSkipped && tag){
      tag.remove();
    }
  });
}

// Reward pool content lives in shared/rewards-data.js (loaded before this file, defines the
// global REWARD_TIERS), which is also used standalone by rewards.html for review/editing.

function tierKeyForScore(score){
  if(score<=2) return "t0";
  if(score<=4) return "t1";
  if(score<=6) return "t2";
  if(score<=8) return "t3";
  if(score===9) return "t4";
  return "t5";
}

// Short verdict word that opens every non-10/10 reward, right after the "N/total." score.
const TIER_LEADS = {
  t0: {uk:"Ой.", en:"Oof."},
  t1: {uk:"Гм.", en:"Hm."},
  t2: {uk:"Непогано.", en:"Not bad."},
  t3: {uk:"Молодець!", en:"Nice work!"},
  t4: {uk:"Так близько!", en:"So close!"}
};

// Site-wide "shuffle bag": every tier's pool is dealt out in a shuffled order, one entry at a
// time, and only reshuffled (avoiding an immediate repeat of the last card) once the whole pool
// has been seen. Shared across every page, in its own localStorage key (not the page's STORAGE_KEY),
// so variety carries across the whole site rather than resetting per page.
const REWARD_BAG_KEY = "uk_cases_reward_bag_v1";

function drawReward(tierKey){
  const pool = REWARD_TIERS[tierKey];
  let bag = {};
  try{ bag = JSON.parse(localStorage.getItem(REWARD_BAG_KEY) || "{}"); }catch(e){ bag = {}; }
  let state = bag[tierKey];
  if(!state || !state.queue || !state.queue.length){
    const queue = pool.map((_,i)=>i);
    for(let i=queue.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [queue[i],queue[j]]=[queue[j],queue[i]];
    }
    if(state && state.last!==undefined && queue.length>1 && queue[0]===state.last){
      [queue[0],queue[1]]=[queue[1],queue[0]];
    }
    state = {queue, last: state ? state.last : undefined};
  }
  const idx = state.queue.shift();
  state.last = idx;
  bag[tierKey] = state;
  try{ localStorage.setItem(REWARD_BAG_KEY, JSON.stringify(bag)); }catch(e){}
  return idx;
}

// Wraps bare Cyrillic words/phrases in an English sentence so they render upright (never
// italic), per house style, even though the surrounding English gloss is italic.
function wrapUkWords(en){
  return en.replace(/[Ѐ-ӿ]+/g, m => `<span class="uk-word">${m}</span>`);
}

// Reward-note emoji are swapped for real image files (assets/emoji/, Twemoji SVGs, CC-BY 4.0,
// credited in the footer) instead of relying on the OS emoji font -- Windows in particular
// renders several of these (flags especially) inconsistently or not at all. Keyed by lowercase
// hex codepoint. The Ukraine flag is handled separately via assets/flag-ukraine.svg (a hand-built
// public-domain flag, so it can also get a CSS wave animation) rather than through this map.
const EMOJI_IMG_MAP = {
  "1f62d":"crying-face", "1f624":"steam-nose", "1f611":"expressionless", "1f629":"weary",
  "1f644":"rolling-eyes", "1f372":"pot-of-food", "1f95f":"dumpling", "1f9ca":"ice",
  "1f956":"baguette-bread", "1f52a":"kitchen-knife", "1f342":"fallen-leaf", "1f96c":"leafy-green",
  "1f963":"bowl-spoon", "1f954":"potato", "2728":"sparkles", "1fad9":"jar",
  "1f383":"jack-o-lantern", "1f9c0":"cheese", "1f968":"pretzel", "1f96f":"bagel",
  "1f358":"rice-cracker", "1f32f":"burrito", "1f9c4":"garlic", "1f9f5":"thread",
  "1f34e":"red-apple", "1f33d":"corn", "1f352":"cherries", "1f373":"cooking",
  "1f370":"shortcake", "1f36f":"honey-pot", "1f475":"old-woman", "1f35e":"bread",
  "1f37d":"fork-knife-plate", "1f3e1":"house-garden", "1f3db":"classical-building", "1f943":"tumbler-glass",
  "1f389":"party-popper", "1f377":"wine-glass", "1f95a":"egg", "1f6e2":"oil-drum",
  "1f376":"sake", "1f3c6":"trophy", "1f455":"tshirt", "1f33b":"sunflower", "1f3c5":"medal",
  "26a0":"warning"
};
const UA_FLAG = "🇺🇦";

// Splits an emoji string by Unicode code point (correct for astral-plane emoji, unlike naive
// string indexing) and swaps each recognized glyph for its local image; anything not in the map
// (a stray variation selector, an emoji we haven't added) just passes through as plain text.
function emojify(str){
  if(str === UA_FLAG){
    return `<img class="flag-img flag-wave" src="assets/flag-ukraine.svg" alt="Прапор України">`;
  }
  return [...str].map(ch=>{
    const cp = ch.codePointAt(0).toString(16);
    const name = EMOJI_IMG_MAP[cp];
    return name ? `<img class="emoji-img" src="assets/emoji/${name}.svg" alt="">` : ch;
  }).join("");
}

// The note element itself is pre-placed (empty, hidden) at the end of the exercise body by
// buildWrapper/assembleComboPage, before any items are answered. That guarantees it always sits
// after the last question, even when this fires during a same-tick replay of a stored answer on
// page load (which would otherwise append the note before the last question's own DOM node had
// been attached yet).
function ensureCelebrateNote(el, g, groupKey){
  const note = el.querySelector(":scope > .body > .celebrate-note");
  if(!note) return;
  const correct = Math.max(0, Math.min(10, g.correct));
  const tierKey = tierKeyForScore(correct);
  const rwKey = groupKey+"_rw";
  let assigned = STORE[rwKey];
  if(!assigned || assigned.tier!==tierKey){
    assigned = {tier: tierKey, idx: drawReward(tierKey)};
    STORE[rwKey] = assigned;
  }
  // Always keep the exact score on the stored assignment (also lets trophy.html show it later);
  // refreshed every render, not just on a fresh draw, so older saved entries pick it up too.
  assigned.correct = correct;
  assigned.total = g.total;
  STORE[rwKey] = assigned;
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(STORE)); }catch(e){}
  const reward = REWARD_TIERS[assigned.tier][assigned.idx];
  // The score is always its own badge, never relied on being baked into the reward text --
  // some lines (especially in the 10/10 pool) never state the number at all, so text-only
  // scoring silently failed to show a mark on those. Tiers below 10/10 still get a short verdict
  // word next to the badge, for flavour, but the number itself lives only in the badge now.
  const uk = tierKey==="t5" ? reward.uk : `${TIER_LEADS[tierKey].uk} ${reward.uk}`;
  const en = tierKey==="t5" ? reward.en : `${TIER_LEADS[tierKey].en} ${reward.en}`;
  const isRecord = !!STORE[groupKey+"_rec"];
  const scoreBadge = `<span class="score-badge">${correct}/${g.total} правильно / correct</span>`;
  const recordBadge = isRecord
    ? `<span class="record-badge">${emojify("🏅")}<span>Новий рекорд! <span class="en">New record!</span></span></span>`
    : "";
  note.hidden = false;
  note.innerHTML = `<span class="celebrate-tags">${scoreBadge}${recordBadge}</span><span class="celebrate-row"><span class="celebrate-emoji">${emojify(reward.emoji)}</span><span class="celebrate-text">${uk}<span class="en">${wrapUkWords(en)}</span></span></span>`;
}

function celebrateGroup(groupKey){
  const el = groupEls[groupKey];
  if(!el) return;
  el.classList.add("celebrate-pulse");
  setTimeout(()=>el.classList.remove("celebrate-pulse"), 1400);
}

function wireGroupReset(statusEl, groupKey){
  const resetBtn = statusEl.querySelector(".group-reset");
  resetBtn.addEventListener("click",(e)=>{
    e.preventDefault(); e.stopPropagation();
    resetGroup(groupKey);
  });
}

function updateGroupUI(groupKey){
  const g = groupTally[groupKey];
  const el = groupEls[groupKey];
  if(!g || !el) return;
  const statusEl = el.querySelector(":scope > summary > .group-status");
  const complete = g.total>0 && g.answered>=g.total;
  el.classList.toggle("group-complete", complete);
  if(statusEl){
    if(complete){
      statusEl.className = "group-status group-status-complete";
      statusEl.innerHTML = `<span class="group-check">✅</span><span>Завершено · Complete. ${g.correct}/${g.total} правильно / correct.</span><button type="button" class="group-reset">Скинути / Reset</button>`;
      wireGroupReset(statusEl, groupKey);
      ensureCelebrateNote(el, g, groupKey);
    } else if(g.answered>0){
      statusEl.className = "group-status group-status-partial";
      statusEl.innerHTML = `<span>⏳ Відповідано ${g.answered} / ${g.total}.</span><button type="button" class="group-reset">Скинути / Reset</button>`;
      wireGroupReset(statusEl, groupKey);
    } else {
      statusEl.className = "group-status group-status-empty";
      statusEl.textContent = `Готові почати? · Ready to start?`;
    }
  }
  const wrapperKey = groupWrapperMap[groupKey];
  if(wrapperKey) updateWrapperUI(wrapperKey);
}

function updateWrapperUI(wrapperKey){
  const groups = wrapperGroups[wrapperKey];
  const el = wrapperEls[wrapperKey];
  if(!groups || !el) return;
  const statusEl = el.querySelector(":scope > summary > .group-status");
  if(!statusEl) return;
  const completeCount = groups.filter(gk=>{
    const g=groupTally[gk]; return g && g.total>0 && g.answered>=g.total;
  }).length;
  statusEl.textContent = `${completeCount}/${groups.length} вправи виконано · ${completeCount}/${groups.length} exercises complete`;
}

function resetGroup(groupKey){
  const prefix = groupKey+"_";
  Object.keys(STORE).forEach(k=>{
    if(k===groupKey || k.startsWith(prefix)) delete STORE[k];
  });
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(STORE)); }catch(e){}
  saveOpenState();
  location.reload();
}

document.getElementById("resetBtn").addEventListener("click",()=>{
  try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
  try{ sessionStorage.removeItem(OPEN_STATE_KEY); }catch(e){}
  location.reload();
});

function norm(s){return s.toLowerCase().trim().replace(/[’ʼ']/g,"").replace(/\s+/g," ")}

function shuffle(correct, distractors){
  const opts=[correct,...distractors];
  for(let i=opts.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [opts[i],opts[j]]=[opts[j],opts[i]];
  }
  return {opts, correctIndex: opts.indexOf(correct)};
}

function revealFeedback(qEl,isCorrect,explainHtml,countIt){
  const fb=qEl.querySelector(".feedback");
  fb.querySelector(".verdict").textContent=isCorrect?"Правильно! Correct.":"Неправильно. Incorrect.";
  fb.querySelector(".verdict").className="verdict "+(isCorrect?"correct":"incorrect");
  fb.querySelector(".explain").innerHTML=explainHtml;
  fb.classList.add("show");
  if(countIt){ answered++; if(isCorrect)correctCount++; updateProgress(); }
}

// Builds a set of option buttons, wires clicks, and replays a stored prior answer (if any) using the same code path.
function buildOptionButtons(wrapEl, opts, correctIndex, onResolve, mini, storeId){
  opts.forEach((opt)=>{
    const btn=document.createElement("button");
    btn.className="opt"+(mini?" mini":"");
    btn.textContent=opt;
    wrapEl.appendChild(btn);
  });
  const resolve=(chosenIndex)=>{
    if(wrapEl.dataset.done)return; wrapEl.dataset.done="1";
    [...wrapEl.children].forEach((b,bi)=>{
      b.disabled=true;
      if(bi===correctIndex)b.classList.add("correct");
      else if(bi===chosenIndex)b.classList.add("incorrect");
    });
    const isCorrect=chosenIndex===correctIndex;
    saveAnswer(storeId,{chosen:opts[chosenIndex],correct:isCorrect});
    onResolve(isCorrect);
  };
  [...wrapEl.children].forEach((btn,i)=>{
    btn.addEventListener("click",()=>resolve(i));
  });
  const prior=STORE[storeId];
  if(prior){
    let idx=opts.indexOf(prior.chosen);
    if(idx===-1) idx=prior.correct?correctIndex:-1;
    resolve(idx);
  }
}

function buildTwoPart(item, idPrefix){
  const q=document.createElement("div"); q.className="q"; q.dataset.itemId=idPrefix;
  q.innerHTML=`<p class="word-display">${item.word}</p>
    <p class="bi-q-uk">Що означає це слово?</p><p class="bi-q-en">What does this word mean?</p>
    <div class="options mini-wrap"></div>
    <div class="case-part hidden">
      <p class="bi-q-uk">${item.step2Uk || "Постав слово у потрібному відмінку."}</p><p class="bi-q-en">${item.step2En || "Put it in the correct form."}</p>
      <div class="options case-wrap"></div>
      <div class="feedback"><div class="verdict"></div><div class="explain"></div></div>
    </div>`;
  const casePartEl=q.querySelector(".case-part");
  const miniWrap=q.querySelector(".mini-wrap");
  const {opts:mOpts, correctIndex:mCorrect} = shuffle(item.meaning, item.dmeanings);
  buildOptionButtons(miniWrap, mOpts, mCorrect, ()=>{
    casePartEl.classList.remove("hidden");
  }, true, idPrefix+"_m");
  const caseWrap=q.querySelector(".case-wrap");
  const {opts:cOpts, correctIndex:cCorrect} = shuffle(item.answer, item.dforms);
  buildOptionButtons(caseWrap, cOpts, cCorrect, (isCorrect)=>{
    revealFeedback(q, isCorrect, item.explain, true);
    recordGroupAnswer(idPrefix+"_c", isCorrect, q);
  }, false, idPrefix+"_c");
  return q;
}

let FILL_MODE = "type";
try{ FILL_MODE = localStorage.getItem(STORAGE_KEY+"_fillmode") || "type"; }catch(e){}

function buildFill(item, id){
  const q=document.createElement("div"); q.className="q"; q.dataset.itemId=id;
  const explainWithAnswer=item.explain+`<br><br>Правильна форма: <b>${item.answers.join(" / ")}</b>`;

  if(FILL_MODE==="mc" && item.opts && item.opts.length){
    q.innerHTML=`<p class="prompt"><span class="uk">${item.uk}</span><span class="translation">${item.en}</span></p>
      <div class="options"></div>
      <div class="feedback"><div class="verdict"></div><div class="explain"></div></div>`;
    const optsWrap=q.querySelector(".options");
    const {opts,correctIndex}=shuffle(item.answers[0], item.opts);
    buildOptionButtons(optsWrap, opts, correctIndex, (isCorrect)=>{
      revealFeedback(q,isCorrect,explainWithAnswer,true);
      recordGroupAnswer(id+"_mc", isCorrect, q);
    }, false, id+"_mc");
    return q;
  }

  q.innerHTML=`<p class="prompt"><span class="uk">${item.uk}</span><span class="translation">${item.en}</span></p>
    <div class="fillrow"><input type="text" placeholder="Введіть форму..."><button>Перевірити</button></div>
    <div class="feedback"><div class="verdict"></div><div class="explain"></div></div>`;
  const input=q.querySelector("input"), btn=q.querySelector(".fillrow button");
  const check=(value)=>{
    if(q.dataset.done)return; q.dataset.done="1";
    input.value=value;
    const val=norm(value);
    const isCorrect=item.answers.some(a=>norm(a)===val);
    input.classList.add(isCorrect?"correct":"incorrect");
    input.disabled=true; btn.disabled=true;
    saveAnswer(id,{value:value,correct:isCorrect});
    revealFeedback(q,isCorrect,explainWithAnswer,true);
    recordGroupAnswer(id, isCorrect, q);
  };
  btn.addEventListener("click",()=>check(input.value));
  input.addEventListener("keydown",e=>{if(e.key==="Enter")check(input.value);});
  const prior=STORE[id];
  if(prior) check(prior.value);
  return q;
}

function buildMC(item, id){
  const q=document.createElement("div"); q.className="q"; q.dataset.itemId=id;
  q.innerHTML=`<p class="prompt"><span class="uk">${item.uk}</span><span class="translation">${item.en}</span></p>
    <div class="options"></div>
    <div class="feedback"><div class="verdict"></div><div class="explain"></div></div>`;
  const optsWrap=q.querySelector(".options");
  buildOptionButtons(optsWrap, item.opts, item.correct, (isCorrect)=>{
    revealFeedback(q, isCorrect, item.explain, true);
    recordGroupAnswer(id, isCorrect, q);
  }, false, id);
  return q;
}

// Revision word-click component. item.mode: "correct" (click the right word, single try),
// "error" (click the wrong word, retries allowed until correct), "trick" (click the special
// "no such word" chip because the sentence is correctly Nominative, not the target case).
function buildRevisionItem(item, id){
  const q=document.createElement("div"); q.className="q"; q.dataset.itemId=id;
  const noteLabel = item.noteLabel || "No target-case word here";
  q.innerHTML=`<p class="translation" style="margin-bottom:10px">${item.en}</p>
    <div class="word-click-wrap"></div>
    <p class="try-again"></p>
    <div class="click-note"></div>
    <div class="why-part hidden">
      <p class="bi-q-uk">Чому?</p><p class="bi-q-en">Why?</p>
      <div class="options why-opts"></div>
      <div class="feedback"><div class="verdict"></div><div class="explain"></div></div>
    </div>`;
  const wrap=q.querySelector(".word-click-wrap");
  const tryAgainEl=q.querySelector(".try-again");
  const clickNoteEl=q.querySelector(".click-note");
  const whyPartEl=q.querySelector(".why-part");

  item.tokens.forEach((tok)=>{
    const chip=document.createElement("button");
    chip.className="word-chip"; chip.textContent=tok;
    wrap.appendChild(chip);
  });
  if(item.mode==="trick"){
    const noneChip=document.createElement("button");
    noneChip.className="word-chip none-chip"; noneChip.textContent=noteLabel;
    wrap.appendChild(noneChip);
  }

  const revealWhy=()=>{
    if(!item.why)return;
    whyPartEl.classList.remove("hidden");
    const whyWrap=whyPartEl.querySelector(".why-opts");
    buildOptionButtons(whyWrap, item.why.opts, item.why.correct, (isCorrect)=>{
      revealFeedback(whyPartEl, isCorrect, item.why.explain, false);
    }, false, id+"_why");
  };

  const finish=(clickedIndex)=>{
    wrap.dataset.done="1";
    [...wrap.children].forEach((c,ci)=>{
      c.disabled=true;
      if(ci===item.target)c.classList.add("correct");
      else if(ci===clickedIndex)c.classList.add("incorrect");
    });
    tryAgainEl.classList.remove("show");
    clickNoteEl.textContent = clickedIndex===item.target ? "" : item.revealNote;
    saveAnswer(id,{chosen:clickedIndex,correct:clickedIndex===item.target});
    answered++; if(clickedIndex===item.target)correctCount++; updateProgress();
    recordGroupAnswer(id, clickedIndex===item.target, q);
    revealWhy();
  };

  const finishError=(clickedIndex)=>{
    wrap.dataset.done="1";
    [...wrap.children].forEach(c=>c.disabled=true);
    const chip=wrap.children[item.target];
    chip.classList.add("struck");
    const tick=document.createElement("span"); tick.className="tick-ok"; tick.textContent="✓";
    chip.after(tick);
    tryAgainEl.classList.remove("show");
    saveAnswer(id,{chosen:item.target,correct:true});
    answered++; correctCount++; updateProgress();
    recordGroupAnswer(id, true, q);
    revealWhy();
  };

  [...wrap.children].forEach((chip,i)=>{
    chip.addEventListener("click",()=>{
      if(wrap.dataset.done)return;
      if(item.mode==="error"){
        if(i===item.target){ finishError(i); }
        else{
          chip.classList.remove("flash"); void chip.offsetWidth; chip.classList.add("flash");
          setTimeout(()=>chip.classList.remove("flash"),650);
          tryAgainEl.textContent="Спробуй ще раз! / Try again!";
          tryAgainEl.classList.add("show");
        }
      } else {
        finish(i);
      }
    });
  });

  const prior=STORE[id];
  if(prior){
    if(item.mode==="error"){ finishError(item.target); }
    else { finish(prior.chosen); }
  }
  return q;
}

function buildWrapper(wrapperTitleHtml, wrapperDesc, exercises, idPrefix, itemBuilder, extraHtml){
  const top=document.createElement("details"); top.className="top-details";
  top.innerHTML=`<summary>${wrapperTitleHtml}<span class="group-status"></span></summary><div class="body"><p class="section-desc">${wrapperDesc}</p>${extraHtml||""}</div>`;
  const body=top.querySelector(".body");
  const wrapperKey=idPrefix;
  top.dataset.stateKey="wrap_"+wrapperKey;
  wrapperEls[wrapperKey]=top;
  wrapperGroups[wrapperKey]=[];
  exercises.forEach((ex,ei)=>{
    const sub=document.createElement("details"); sub.className="subtest";
    sub.innerHTML=`<summary>${ex.title}<span class="group-status"></span></summary><div class="body"></div>`;
    const groupKey=idPrefix+"_"+ei;
    sub.dataset.stateKey="grp_"+groupKey;
    groupEls[groupKey]=sub;
    initGroup(groupKey, ex.items.length, wrapperKey);
    const subBody=sub.querySelector(".body");
    if(ex.desc){
      const descEl=document.createElement("p"); descEl.className="desc"; descEl.textContent=ex.desc;
      subBody.appendChild(descEl);
    }
    const noteEl=document.createElement("div"); noteEl.className="celebrate-note"; noteEl.hidden=true;
    subBody.appendChild(noteEl);
    ex.items.forEach((item,ii)=>{
      subBody.appendChild(itemBuilder(item, idPrefix+"_"+ei+"_"+ii));
    });
    subBody.appendChild(noteEl); // re-append: moves it after the last question, however it was populated
    body.appendChild(sub);
    updateGroupUI(groupKey);
    // Redo the skip-scan now every item is actually in the DOM: replaying stored answers fires
    // recordGroupAnswer (and its own scan) mid-construction, before later items are appended, so
    // that scan sees an incomplete list. This final pass is the one that's actually accurate.
    updateSkippedHighlights(sub);
  });
  updateWrapperUI(wrapperKey);
  return top;
}

// Combo/contrastive-page bracket-choice component: a sentence with a blank and word-forms in brackets.
function buildBracket(item, id){
  const q=document.createElement("div"); q.className="q"; q.dataset.itemId=id;
  q.innerHTML=`<p class="prompt"><span class="uk">${item.pre}<span class="blank-slot">________</span>${item.post}</span><span class="translation">${item.en}</span></p>
    <div class="bracket-row"></div>
    <div class="feedback"><div class="verdict"></div><div class="explain"></div></div>`;
  const blank=q.querySelector(".blank-slot");
  const row=q.querySelector(".bracket-row");
  row.appendChild(document.createTextNode("("));
  const btns=[];
  item.opts.forEach((opt,i)=>{
    if(i>0) row.appendChild(document.createTextNode(" / "));
    const btn=document.createElement("button"); btn.className="bracket-opt"; btn.textContent=opt;
    row.appendChild(btn); btns.push(btn);
  });
  row.appendChild(document.createTextNode(")"));
  const resolve=(chosenIndex)=>{
    if(q.dataset.done)return; q.dataset.done="1";
    btns.forEach((b,bi)=>{
      b.disabled=true;
      if(bi===item.correct)b.classList.add("correct");
      else if(bi===chosenIndex)b.classList.add("incorrect");
    });
    const isCorrect=chosenIndex===item.correct;
    blank.textContent=item.opts[chosenIndex];
    blank.classList.add(isCorrect?"correct":"incorrect");
    saveAnswer(id,{chosen:chosenIndex,correct:isCorrect});
    revealFeedback(q,isCorrect,item.explain,true);
    recordGroupAnswer(id, isCorrect, q);
  };
  btns.forEach((btn,i)=>btn.addEventListener("click",()=>resolve(i)));
  const prior=STORE[id];
  if(prior) resolve(prior.chosen);
  return q;
}

function stitch(){ const s=document.createElement("div"); s.className="stitch"; return s; }

function assembleSingleCasePage(){
  DATA.vocabExercises.forEach(t=>total+=t.items.length);
  DATA.fillExercises.forEach(t=>total+=t.items.length);
  DATA.usageExercises.forEach(t=>total+=t.items.length);
  DATA.revisionExercises.forEach(t=>total+=t.items.length);
  document.getElementById("totalCount").textContent=total;

  const sectionsEl=document.getElementById("sections");

  sectionsEl.appendChild(buildWrapper(
    DATA.usageWrapperTitle,
    "Start here: identify which rule explains the case usage in each sentence. This builds intuition for what to listen for before you drill the endings themselves.",
    DATA.usageExercises, "u",
    (item,id)=>buildMC(item,id)
  ));

  sectionsEl.appendChild(stitch());

  sectionsEl.appendChild(buildWrapper(
    DATA.vocabWrapperTitle,
    "Each question starts with a quick vocabulary check, then asks you to put the word into the correct case. Exercises get progressively more challenging.",
    DATA.vocabExercises, "v",
    (item,id)=>buildTwoPart(item,id)
  ));

  sectionsEl.appendChild(stitch());

  const modeToggleHtml=`<div class="mode-toggle">
    <button class="mode-btn" data-mode="type">✏️ Введи слово / Type it</button>
    <button class="mode-btn" data-mode="mc">🔘 Обери варіант / Multiple choice</button>
  </div>`;

  function wireFillToggle(el){
    el.querySelectorAll(".mode-btn").forEach(btn=>{
      if(btn.dataset.mode===FILL_MODE) btn.classList.add("active");
      btn.addEventListener("click",()=>{
        if(btn.dataset.mode===FILL_MODE)return;
        try{ localStorage.setItem(STORAGE_KEY+"_fillmode", btn.dataset.mode); }catch(e){}
        FILL_MODE=btn.dataset.mode;
        rebuildFillSection();
      });
    });
  }

  function renderFillSection(){
    const el=buildWrapper(
      DATA.fillWrapperTitle,
      "Fill the blank with the word in brackets, put into the correct form. Sentences get longer as you go.",
      DATA.fillExercises, "f",
      (item,id)=>buildFill(item,id),
      modeToggleHtml
    );
    wireFillToggle(el);
    return el;
  }

  function rebuildFillSection(){
    const oldEl=document.getElementById("fillWrapper");
    const wasOpen=oldEl.open;
    const oldSubs=[...oldEl.querySelectorAll(".subtest")].map(s=>s.open);
    const newEl=renderFillSection();
    newEl.id="fillWrapper";
    newEl.open=wasOpen;
    const newSubs=newEl.querySelectorAll(".subtest");
    newSubs.forEach((s,i)=>{ if(oldSubs[i]) s.open=true; });
    oldEl.replaceWith(newEl);
  }

  const fillWrapperEl=renderFillSection();
  fillWrapperEl.id="fillWrapper";
  sectionsEl.appendChild(fillWrapperEl);

  sectionsEl.appendChild(stitch());

  sectionsEl.appendChild(buildWrapper(
    DATA.revisionWrapperTitle,
    "Once you've learned this case and worked through the exercises above, come back here any time to remind yourself how it works. These mix question styles and include deliberate «false friend» sentences that look like they need this case but don't; read carefully!",
    DATA.revisionExercises, "r",
    (item,id)=>buildRevisionItem(item,id)
  ));

  updateProgress();
}

function assembleComboPage(){
  DATA.exercises.forEach(t=>total+=t.items.length);
  document.getElementById("totalCount").textContent=total;

  const sectionsEl=document.getElementById("sections");
  DATA.exercises.forEach((ex,ei)=>{
    if(ei>0) sectionsEl.appendChild(stitch());
    const top=document.createElement("details"); top.className="top-details";
    top.innerHTML=`<summary>${ex.title}<span class="group-status"></span></summary><div class="body"></div>`;
    const groupKey="m_"+ei;
    top.dataset.stateKey="grp_"+groupKey;
    groupEls[groupKey]=top;
    initGroup(groupKey, ex.items.length, null);
    const body=top.querySelector(".body");
    if(ex.desc){
      const d=document.createElement("p"); d.className="section-desc"; d.textContent=ex.desc;
      body.appendChild(d);
    }
    const noteEl=document.createElement("div"); noteEl.className="celebrate-note"; noteEl.hidden=true;
    body.appendChild(noteEl);
    ex.items.forEach((item,ii)=>{
      body.appendChild(buildBracket(item, "m_"+ei+"_"+ii));
    });
    body.appendChild(noteEl); // re-append: moves it after the last question, however it was populated
    sectionsEl.appendChild(top);
    updateGroupUI(groupKey);
    updateSkippedHighlights(top);
  });

  updateProgress();
}

if(DATA.exercises){
  assembleComboPage();
} else {
  assembleSingleCasePage();
}
restoreOpenState();

// The right-edge fade on rule tables is a "there's more, scroll me" hint -- only show it
// when the table actually overflows its container, not on every screen size.
function updateTableScrollAffordances(){
  document.querySelectorAll(".table-scroll").forEach(el=>{
    el.classList.toggle("scrollable", el.scrollWidth > el.clientWidth + 1);
  });
}
updateTableScrollAffordances();
window.addEventListener("resize", updateTableScrollAffordances);
document.addEventListener("toggle", ()=>{
  requestAnimationFrame(updateTableScrollAffordances);
}, true);

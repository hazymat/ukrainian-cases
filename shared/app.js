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

function recordGroupAnswer(id, isCorrect){
  const parts = id.split("_");
  const groupKey = parts[0]+"_"+parts[1];
  const g = groupTally[groupKey];
  if(!g) return;
  g.answered++;
  if(isCorrect) g.correct++;
  const justCompleted = g.answered>=g.total && !STORE[groupKey+"_cel"];
  if(justCompleted){
    STORE[groupKey+"_cel"]=true;
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(STORE)); }catch(e){}
  }
  updateGroupUI(groupKey);
  if(justCompleted) celebrateGroup(groupKey);
}

// Reward pools: a themed Ukrainian-dish/culture note shown as a permanent little card under
// the exercise once it's complete. Scores 0-6 roast (mock-stern but affectionate); 7-10 are
// warm/proud. Each entry is {emoji, uk, en}; Cyrillic words left untranslated inside the English
// line (borsch, вареники, etc.) are auto-wrapped in .uk-word so they render upright, never italic.
const REWARD_TIERS = {
  t0: [ // 0-2/10
    {emoji:"😭🍲", uk:"Борщ треба варити щонайменше три години. У тебе стільки часу не знайшлось, і це видно.", en:"Борщ needs at least three hours on the stove before it's any good. You clearly didn't put the time in, and it shows."},
    {emoji:"😤🥟", uk:"Справжні вареники защипують руками, дбайливо. Твої розвалились у каструлі.", en:"Real вареники are pinched shut by hand, with care. Yours came apart in the pot."},
    {emoji:"😑🧊", uk:"Холодець застигає цілу ніч у холодильнику. Твої знання, здається, взагалі не застигли.", en:"Холодець sets overnight in the fridge. Your knowledge, it seems, hasn't set at all."},
    {emoji:"😩🥖", uk:"Пампушки подають гарячими, щойно з печі. Ці відповіді холодні й давно перегорілі.", en:"Пампушки are served hot, straight from the oven. These answers are cold, and long since burnt out."},
    {emoji:"😤🔪", uk:"Сало ріжуть тонкими скибками, з повагою. Тебе б порізали ще тонше.", en:"Сало is sliced thin, with respect. You'd be sliced even thinner."},
    {emoji:"😭🍂", uk:"Узвар вариться з сухофруктів роками перевіреним рецептом. Твій рецепт сьогодні не спрацював.", en:"Узвар is brewed from dried fruit, a recipe tested for generations. Yours didn't work today."},
    {emoji:"🙄🥬", uk:"Квашену капусту тримають місяцями, поки вона не набуде смаку. Тобі бракує і смаку, і часу.", en:"Квашена капуста sits for months before it develops flavour. You're short on both flavour and time."},
    {emoji:"😑🥣", uk:"Гречку не можна пересолити двічі. А от твої відповіді можна було й краще присолити.", en:"You can't oversalt гречка twice. Your answers, though, could've used more seasoning."},
    {emoji:"😤🥔", uk:"Деруни без сметани це просто картопля, що вдає із себе страву. Твій результат так само вдає.", en:"Деруни without smetana are just potatoes putting on airs. Your score is doing the same."},
    {emoji:"😭✨", uk:"Кутю готують раз на рік, на Святвечір, з великою любов'ю. Цю спробу так не готували.", en:"Кутя is made once a year, on Christmas Eve, with great care. This attempt clearly wasn't."},
    {emoji:"🙄🫙", uk:"Солоні огірки набирають смаку в розсолі щонайменше тиждень. Твої відповіді розчинились одразу.", en:"Pickled cucumbers need at least a week in the brine to taste right. Your answers dissolved instantly."},
    {emoji:"😩🎃", uk:"Гарбузову кашу варять на повільному вогні. Тобі теж варто трохи повільніше.", en:"Гарбузова каша is cooked low and slow. You might want to slow down too."}
  ],
  t1: [ // 3-4/10
    {emoji:"🥔", uk:"Деруни смажать до золотистого з обох боків. Твої підрум'янились лише з одного.", en:"Деруни get fried until golden on both sides. Yours only browned on one."},
    {emoji:"🧀", uk:"Сирники перевертають обережно, щоб не розвалились. Половина твоїх відповідей не втрималась.", en:"Сирники are flipped carefully so they don't fall apart. Half your answers didn't hold together."},
    {emoji:"🥨", uk:"Вергуни смажать до хрумкості за лічені хвилини. Тобі знадобилось трохи більше часу.", en:"Вергуни fry crisp in just a few minutes. You needed a little longer."},
    {emoji:"🥯", uk:"Книші ліплять із начинкою всередині. У твоїх відповідях начинки поки що мало.", en:"Книші are shaped with filling tucked inside. Your answers are still a bit light on filling."},
    {emoji:"🍘", uk:"Гречаники печуть невеликими, щоб пропеклися рівномірно. Ти пропікся нерівно.", en:"Гречаники are baked small so they cook evenly. You cooked a bit unevenly."},
    {emoji:"🌯", uk:"Налисники загортають тонким млинцем, акуратно. У тебе вийшло трохи неохайно.", en:"Налисники are wrapped in a thin crepe, neatly. Yours came out a little messy."},
    {emoji:"🧄", uk:"Часникові пампушки подають до борщу, обов'язково. Ти забув про половину рецепта.", en:"Часникові пампушки go with борщ, no exceptions. You forgot about half the recipe."},
    {emoji:"🧵", uk:"Крученики фарширують і перев'язують нитками. Пара ниток у тебе розв'язалась.", en:"Крученики are stuffed and tied with thread. A couple of your threads came undone."},
    {emoji:"🍎", uk:"Яблучний пиріг проситься на друге коло. Тобі теж не завадило б друге коло.", en:"Яблучний пиріг always calls for seconds. You could do with a second round too."},
    {emoji:"🌽", uk:"Банош готують, безперервно помішуючи. Ти, здається, забув про половину помішувань.", en:"Банош needs constant stirring. You seem to have skipped half the stirring."}
  ],
  t2: [ // 5-6/10
    {emoji:"🥣", uk:"Капусняк вариться довго, і смак приходить не одразу. Так само й у тебе.", en:"Капусняк needs a long simmer before the flavour comes through. Same goes for you."},
    {emoji:"🥬", uk:"Голубці загортають один за одним, терпляче. Ти впорався рівно з половиною.", en:"Голубці are rolled one by one, patiently. You managed exactly half."},
    {emoji:"🥖", uk:"Пампушки піднімаються повільно, але впевнено. Твій результат так само.", en:"Пампушки rise slowly, but surely. Your score did the same."},
    {emoji:"🍒", uk:"Вареники з вишнями варять окремо від картопляних, щоб не переплутати смаки. У тебе трохи переплуталось.", en:"Cherry вареники are cooked separately from potato ones, so the flavours don't mix. Yours mixed a little."},
    {emoji:"🍳", uk:"Сирники виходять рум'яними, коли сковорідка як слід розігріта. Твоя, здається, була ледь тепла.", en:"Сирники turn out golden when the pan is properly hot. Yours seems to have been lukewarm."},
    {emoji:"🍰", uk:"Медовик потребує часу, щоб коржі просякли кремом. Твоїм відповідям теж треба ще трохи часу.", en:"Медовик needs time for the layers to soak through with cream. Your answers need a bit more time too."},
    {emoji:"🥔", uk:"Деруни зі сметаною це вже пристойна страва. Пристойний результат, тримайся.", en:"Деруни with smetana make a decent meal. A decent result, keep going."},
    {emoji:"🧊", uk:"Холодець любить точні пропорції желатину. Твої пропорції були приблизно вірні.", en:"Холодець needs the gelatin ratio just right. Yours was roughly right."},
    {emoji:"🍂", uk:"Узвар настоюється ніч, а вранці смакує краще. Дай собі ще одну спробу, теж буде краще.", en:"Узвар steeps overnight and tastes better by morning. Give yourself another go, it'll taste better too."},
    {emoji:"🍯", uk:"Кутя з медом і маком проста, але легко забути хоч один інгредієнт. Ти забув один.", en:"Кутя with honey and poppy seed is simple, but easy to forget one ingredient. You forgot one."}
  ],
  t3: [ // 7-8/10
    {emoji:"🍯", uk:"Справжній медовик має дев'ять медових коржів. У тебе майже стільки ж правильних відповідей.", en:"A proper медовик has nine honey layers. You've got nearly as many correct answers."},
    {emoji:"👵", uk:"Бабуся розповіла б усім сусідкам про такий результат.", en:"Бабуся would tell every neighbour about a result like that."},
    {emoji:"🥬", uk:"Рівно й акуратно загорнуті голубці свідчать про впевнену руку кухаря. У тебе саме така рука.", en:"Голубці rolled neat and even are the mark of a steady hand. You've got a steady hand."},
    {emoji:"🍲", uk:"Мама б додала тобі другу тарілку борщу за такий результат.", en:"Your mama would give you a second bowl of борщ for a result like that."},
    {emoji:"🍞", uk:"Паску пекли лише раз на рік і завжди боялись, що не підніметься. Твоя піднялась чудово.", en:"Паска was only ever baked once a year, and everyone worried it wouldn't rise. Yours rose beautifully."},
    {emoji:"🍽️", uk:"Крученики, які тримають форму до кінця варіння, це знак майстерності. Твоя форма трималась.", en:"Крученики that hold their shape right through cooking are a sign of real skill. Yours held up."},
    {emoji:"🏡", uk:"Сусідка запитала б рецепт після такого результату.", en:"The neighbour would be asking for the recipe after a result like that."},
    {emoji:"🥃", uk:"Дідусь налив би тобі чарку узвару в знак поваги. Ну, майже повну чарку.", en:"Дідусь would pour you a glass of узвар out of respect for that. Well, almost a full one."},
    {emoji:"🍘", uk:"Гречаники, пропечені рівно з усіх боків, це рідкість навіть у досвідчених кухарів. У тебе вийшло.", en:"Гречаники baked evenly on every side are rare even for experienced cooks. You managed it."},
    {emoji:"🎉", uk:"Такий результат вартий місця за святковим столом.", en:"A result like that earns you a seat at the holiday table."}
  ],
  t4: [ // 9/10
    {emoji:"🥚", uk:"Великодній кошик тримає дюжину писанок. Тобі бракує лише однієї, це вже майже повний кошик!", en:"An Easter basket holds a dozen писанки. You're only one short, and that's basically a full basket!"},
    {emoji:"🧵", uk:"Вишиванку вишивають сотнями стібків. Тобі не вистачило лише одного, щоб вважати її довершеною.", en:"A вишиванка is stitched with hundreds of threads. You're just one stitch from calling it finished."},
    {emoji:"🍞", uk:"Коровай печуть цілою родиною. Тобі бракує лише однієї пари рук, і майже готово.", en:"A коровай is baked by the whole family. You're just one pair of hands short, and nearly there."},
    {emoji:"🌻", uk:"Соняшникове поле цвіте майже суцільно жовтим. Твоє поле теж, лишилась одна пелюстка.", en:"A sunflower field blooms almost entirely yellow. So does yours, just one petal left."},
    {emoji:"🧵", uk:"Рушник вишивають з обох країв, симетрично. Твій симетричний майже повністю.", en:"A рушник is embroidered from both ends, symmetrically. Yours is nearly there."},
    {emoji:"🥟", uk:"Дюжина вареників на тарілці означає гостину. У тебе одинадцять, і це теж гостина.", en:"A dozen вареники on a plate means a proper spread. You've got eleven, and that still counts."},
    {emoji:"🍯", uk:"Мед у банці майже по вінця, бджоли попрацювали на славу. Твоя банка теж майже повна.", en:"Honey filled almost to the brim, the bees did well. Your jar's nearly full too."},
    {emoji:"🥚", uk:"Писанку розписують воском у кілька шарів, і один пропущений шар усе одно лишає її гарною. Твоя гарна.", en:"A писанка is waxed in several layers, and missing just one still leaves it beautiful. Yours is beautiful."},
    {emoji:"🍎", uk:"Кошик з яблуками для родини набирають з верхом. Твій кошик майже з верхом.", en:"A family's apple basket gets filled right to the top. Yours is nearly there too."},
    {emoji:"🇺🇦", uk:"Прапор має два кольори, рівні між собою. Твій результат майже такий же рівний.", en:"The flag has two colours, equal in size. Your score is almost as balanced."}
  ],
  t5: [ // 10/10, one-off
    {emoji:"🇺🇦", uk:"Прапор піднято, вареники подано, громадянство видано. Десять з десяти!", en:"Flag raised, вареники served, citizenship granted. Ten out of ten!"},
    {emoji:"👵", uk:"Бабуся розповіла б усім сусідкам, і не тільки їм.", en:"Бабуся would tell every neighbour, and then some."},
    {emoji:"👕", uk:"Вишиванку тобі, по заслузі.", en:"A вишиванка for you, well earned."},
    {emoji:"🌻", uk:"Соняшникове поле повертається й дивиться прямо на тебе.", en:"A whole field of sunflowers turns to face only you."},
    {emoji:"🥚", uk:"Десяток яєць, жодного розбитого.", en:"A full десяток of eggs, not one cracked."},
    {emoji:"🍰", uk:"Медовик у дев'ять коржів, і кожен вдався.", en:"A медовик with nine layers, and every single one came out right."},
    {emoji:"🍞", uk:"Коровай спекли на твою честь, і він піднявся як слід.", en:"A коровай baked in your honour, and it rose just right."},
    {emoji:"🥚", uk:"Писанку розписали найтоншим воском, спеціально для тебе.", en:"A писанка painted with the finest wax, just for you."},
    {emoji:"🧵", uk:"Рушник вишили від краю до краю, без жодного пропущеного стібка.", en:"A рушник embroidered edge to edge, without a single missed stitch."},
    {emoji:"🥃", uk:"Дідусь дістав би найкращу чарку узвару з буфета.", en:"Дідусь would pull out the good узвар glass from the cupboard for this."},
    {emoji:"🥬", uk:"Голубці загорнуті так рівно, що жоден не розвалився за весь обід.", en:"Голубці rolled so neatly, not one fell apart the whole meal."},
    {emoji:"✨", uk:"Кутя вийшла солодкою рівно настільки, наскільки треба, з першої спроби.", en:"Кутя came out exactly the right sweetness, first try."},
    {emoji:"🍞", uk:"Паска піднялась вище за всі інші на підвіконні.", en:"Паска rose taller than every other loaf on the windowsill."},
    {emoji:"🏆", uk:"Сало нарізали найтоншими, найохайнішими скибками, спеціально для переможця.", en:"Сало cut into the thinnest, neatest slices, just for the winner."},
    {emoji:"🍂", uk:"Узвар настоявся рівно стільки, скільки треба, ні хвилиною менше.", en:"Узвар steeped exactly as long as it should, not a minute less."},
    {emoji:"🍽️", uk:"Крученики трималися купи навіть після третьої тарілки.", en:"Крученики held together even after a third helping."},
    {emoji:"📷", uk:"Мама поставила б твою фотографію на холодильник.", en:"Your mama would put your photo on the fridge for this."},
    {emoji:"🥔", uk:"Сусідка приходила б саме заради твоїх дерунів.", en:"The neighbour would start showing up just for your деруни."},
    {emoji:"🍘", uk:"Гречаники з першої партії, жоден не пригорів.", en:"Гречаники straight off the first batch, not one burnt."},
    {emoji:"🥯", uk:"Книші такі пухкі, що аж не вірилось, що вони твої.", en:"Книші so fluffy, no one would believe you made them."},
    {emoji:"🥨", uk:"Вергуни вийшли хрумкими настільки, що чути було з іншої кімнати.", en:"Вергуни so crisp you could hear them from the next room."},
    {emoji:"🧄", uk:"Часникові пампушки розлетілися ще до того, як борщ поставили на стіл.", en:"Часникові пампушки disappeared before the борщ even hit the table."},
    {emoji:"🧊", uk:"Холодець застиг ідеально рівним шаром, без жодної бульбашки.", en:"Холодець set in one perfectly smooth layer, not a bubble in sight."},
    {emoji:"🍯", uk:"Медова баночка спорожніла тільки тому, що всі просили добавки.", en:"The honey jar only emptied because everyone kept asking for more."},
    {emoji:"🌻", uk:"Соняшникове насіння підсмажили окремо, спеціально для тебе, у знак поваги.", en:"Sunflower seeds roasted specially for you, as a mark of respect."},
    {emoji:"🥟", uk:"Дюжина вареників зникла з тарілки за хвилину, і всі хвалили кухаря.", en:"A dozen вареники vanished off the plate in a minute, and everyone praised the cook."},
    {emoji:"🇺🇦", uk:"Прапор майорить рівно, без жодного пориву вітру проти.", en:"The flag flies straight, with not a gust of wind against it."},
    {emoji:"🍎", uk:"Кошик з яблуками наповнили з горою, для тебе окремо.", en:"A basket of apples piled high, just for you."},
    {emoji:"🎃", uk:"Гарбузова каша вийшла такою, що навіть найвибагливіший дідусь попросив добавки.", en:"Гарбузова каша turned out so good even the fussiest дідусь asked for seconds."},
    {emoji:"🏆", uk:"Десять з десяти. Хтось точно розповість бабусі.", en:"Ten out of ten. Someone's definitely telling бабуся."}
  ]
};

function tierKeyForScore(score){
  if(score<=2) return "t0";
  if(score<=4) return "t1";
  if(score<=6) return "t2";
  if(score<=8) return "t3";
  if(score===9) return "t4";
  return "t5";
}

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

function ensureCelebrateNote(el, g, groupKey){
  const body = el.querySelector(":scope > .body");
  if(!body) return;
  let note = body.querySelector(".celebrate-note");
  if(!note){
    note = document.createElement("div");
    note.className = "celebrate-note";
    body.appendChild(note);
  }
  const tierKey = tierKeyForScore(Math.max(0, Math.min(10, g.correct)));
  const rwKey = groupKey+"_rw";
  let assigned = STORE[rwKey];
  if(!assigned || assigned.tier!==tierKey){
    assigned = {tier: tierKey, idx: drawReward(tierKey)};
    STORE[rwKey] = assigned;
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(STORE)); }catch(e){}
  }
  const reward = REWARD_TIERS[assigned.tier][assigned.idx];
  note.innerHTML = `<span class="celebrate-emoji">${reward.emoji}</span><span class="celebrate-text">${reward.uk}<span class="en">${wrapUkWords(reward.en)}</span></span>`;
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
  const q=document.createElement("div"); q.className="q";
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
    recordGroupAnswer(idPrefix+"_c", isCorrect);
  }, false, idPrefix+"_c");
  return q;
}

let FILL_MODE = "type";
try{ FILL_MODE = localStorage.getItem(STORAGE_KEY+"_fillmode") || "type"; }catch(e){}

function buildFill(item, id){
  const q=document.createElement("div"); q.className="q";
  const explainWithAnswer=item.explain+`<br><br>Правильна форма: <b>${item.answers.join(" / ")}</b>`;

  if(FILL_MODE==="mc" && item.opts && item.opts.length){
    q.innerHTML=`<p class="prompt"><span class="uk">${item.uk}</span><span class="translation">${item.en}</span></p>
      <div class="options"></div>
      <div class="feedback"><div class="verdict"></div><div class="explain"></div></div>`;
    const optsWrap=q.querySelector(".options");
    const {opts,correctIndex}=shuffle(item.answers[0], item.opts);
    buildOptionButtons(optsWrap, opts, correctIndex, (isCorrect)=>{
      revealFeedback(q,isCorrect,explainWithAnswer,true);
      recordGroupAnswer(id+"_mc", isCorrect);
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
    recordGroupAnswer(id, isCorrect);
  };
  btn.addEventListener("click",()=>check(input.value));
  input.addEventListener("keydown",e=>{if(e.key==="Enter")check(input.value);});
  const prior=STORE[id];
  if(prior) check(prior.value);
  return q;
}

function buildMC(item, id){
  const q=document.createElement("div"); q.className="q";
  q.innerHTML=`<p class="prompt"><span class="uk">${item.uk}</span><span class="translation">${item.en}</span></p>
    <div class="options"></div>
    <div class="feedback"><div class="verdict"></div><div class="explain"></div></div>`;
  const optsWrap=q.querySelector(".options");
  buildOptionButtons(optsWrap, item.opts, item.correct, (isCorrect)=>{
    revealFeedback(q, isCorrect, item.explain, true);
    recordGroupAnswer(id, isCorrect);
  }, false, id);
  return q;
}

// Revision word-click component. item.mode: "correct" (click the right word, single try),
// "error" (click the wrong word, retries allowed until correct), "trick" (click the special
// "no such word" chip because the sentence is correctly Nominative, not the target case).
function buildRevisionItem(item, id){
  const q=document.createElement("div"); q.className="q";
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
    recordGroupAnswer(id, clickedIndex===item.target);
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
    recordGroupAnswer(id, true);
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
    ex.items.forEach((item,ii)=>{
      subBody.appendChild(itemBuilder(item, idPrefix+"_"+ei+"_"+ii));
    });
    body.appendChild(sub);
    updateGroupUI(groupKey);
  });
  updateWrapperUI(wrapperKey);
  return top;
}

// Combo/contrastive-page bracket-choice component: a sentence with a blank and word-forms in brackets.
function buildBracket(item, id){
  const q=document.createElement("div"); q.className="q";
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
    recordGroupAnswer(id, isCorrect);
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
    ex.items.forEach((item,ii)=>{
      body.appendChild(buildBracket(item, "m_"+ei+"_"+ii));
    });
    sectionsEl.appendChild(top);
    updateGroupUI(groupKey);
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

// Reward pools: a themed Ukrainian-dish/culture note shown as a permanent little card under
// the exercise once it's complete. Scores 0-6 roast (mock-stern but affectionate); 7-10 are
// warm/proud. Each entry is {emoji, uk, en}; Cyrillic words left untranslated inside the English
// line (borsch, вареники, etc.) are auto-wrapped in .uk-word so they render upright, never italic.
//
// This is the single source of truth for reward content: shared/app.js and rewards.html both
// load this file, so editing a line here updates what ships and what the review page shows.
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
    {emoji:"😤🥔", uk:"Деруни без сметани це звичайна картопля, яка вдає із себе справжню страву. Твій результат так само вдає.", en:"Деруни without smetana are just plain potatoes pretending to be a proper dish. Your score's pretending too."},
    {emoji:"😭✨", uk:"Кутю готують раз на рік, на Святвечір, з великою любов'ю. Цю спробу так не готували.", en:"Кутя is made once a year, on Christmas Eve, with great care. This attempt clearly wasn't."},
    {emoji:"🙄🫙", uk:"Солоні огірки набирають смаку в розсолі щонайменше тиждень. Твої відповіді розчинились одразу.", en:"Pickled cucumbers need at least a week in the brine to taste right. Your answers dissolved instantly."},
    {emoji:"😩🎃", uk:"Гарбузову кашу варять на повільному вогні. Тобі теж варто трохи повільніше.", en:"Гарбузова каша is cooked low and slow. You might want to slow down too."}
  ],
  t1: [ // 3-4/10
    {emoji:"🥔", uk:"Деруни смажать до золотистого з обох боків. Твої підрум'янились лише з одного.", en:"Деруни get fried until golden on both sides. Yours only browned on one."},
    {emoji:"🧀", uk:"Сирники перевертають обережно, щоб не розвалились. Половина твоїх відповідей не втрималась.", en:"Сирники are flipped carefully so they don't fall apart. Half your answers didn't hold together."},
    {emoji:"🥨", uk:"Вергуни смажать до хрумкості за лічені хвилини. Тобі знадобилось трохи більше часу.", en:"Вергуни fry crisp in just a few minutes. You needed a little longer."},
    {emoji:"🥯", uk:"Книші ліплять із начинкою всередині. У твоїх відповідях начинки поки що мало.", en:"Книші are shaped with filling tucked inside. Your answers are still a bit light on filling."},
    {emoji:"🍘", uk:"Гречаники печуть невеликими навмисно, щоб нічого не лишалось сирим усередині. У тебе кілька таких і лишилось сирими.", en:"Гречаники are kept small on purpose, so nothing stays raw in the middle. A few of yours stayed raw in the middle."},
    {emoji:"🌯", uk:"Налисники загортають тонким млинцем, акуратно. У тебе вийшло трохи неохайно.", en:"Налисники are wrapped in a thin crepe, neatly. Yours came out a little messy."},
    {emoji:"🧄", uk:"Часникові пампушки подають до борщу, обов'язково. Ти забув про половину рецепта.", en:"Часникові пампушки go with борщ, no exceptions. You forgot about half the recipe."},
    {emoji:"🧵", uk:"Крученики фарширують і туго перев'язують нитками, щоб нічого не витекло під час варіння. У тебе трохи витекло.", en:"Крученики are stuffed and tied tight with thread, so nothing spills out mid-cook. A couple of yours spilled everywhere."},
    {emoji:"🍎", uk:"Яблучний пиріг проситься на друге коло. Тобі теж не завадило б друге коло.", en:"Яблучний пиріг always calls for seconds. You could do with a second round too."},
    {emoji:"🌽", uk:"Банош треба мішати весь час, інакше він перетворюється на клей на дні казана. Твій перетворився на клей.", en:"Банош needs stirring the whole time, or it turns to glue at the bottom of the pot. Yours turned to glue."}
  ],
  t2: [ // 5-6/10
    {emoji:"🥣", uk:"Капусняк вариться довго, і смак приходить не одразу. Так само й у тебе.", en:"Капусняк needs a long simmer before the flavour comes through. Same goes for you."},
    {emoji:"🥬", uk:"Голубці загортають один за одним, терпляче. Твої вийшли посередньо, чесно кажучи. Продовжуй, і в тебе точно вийде краще.", en:"Голубці are rolled one by one, patiently. Yours were average at best. Keep trying and I'm sure you'll improve."},
    {emoji:"🥖", uk:"Пампушки потребують доброї години, щоб як слід підійти. Твій результат теж ще підіймається, дай йому час.", en:"Пампушки need a good hour to rise properly. Your score's still rising too, give it time."},
    {emoji:"🍒", uk:"Вишневі вареники завжди варять окремо від картопляних, ніколи не змішуючи. У тебе теж трохи все змішалось.", en:"Cherry вареники always get cooked separately from potato ones, never mixed. Yours got a little mixed up too."},
    {emoji:"🍳", uk:"Сирники виходять рум'яними, коли сковорідка як слід розігріта. Твоя була трохи недогріта.", en:"Сирники turn out golden when the pan is properly hot. Yours were a little lukewarm."},
    {emoji:"🍰", uk:"Медовик потребує часу, щоб коржі просякли кремом. Твоїм відповідям теж треба ще трохи часу.", en:"Медовик needs time for the layers to soak through with cream. Your answers need a bit more time too."},
    {emoji:"🥔", uk:"Деруни зі сметаною це вже пристойна страва. Завжди є місце для чогось вражаючого, тож продовжуй!", en:"Деруни with smetana make a decent meal. Always room for something more impressive, so keep going!"},
    {emoji:"🧊", uk:"Холодець любить точні пропорції желатину. Твої пропорції були приблизно вірні.", en:"Холодець needs the gelatin ratio just right. Yours was roughly right."},
    {emoji:"🍂", uk:"Узвар настоюється ніч і на ранок стає смачнішим. Це був хороший результат, а завтра буде ще кращий.", en:"Узвар steeps overnight and tastes better by morning. This was a good score, but you'll do even better tomorrow."},
    {emoji:"🍯", uk:"Кутя з медом і маком проста, але легко забути хоч один інгредієнт. Ти забув один.", en:"Кутя with honey and poppy seed is simple, but easy to forget one ingredient. You forgot one."}
  ],
  t3: [ // 7-8/10
    {emoji:"🍯", uk:"Справжній медовик має дев'ять медових коржів. У тебе майже стільки ж правильних відповідей.", en:"A proper медовик has nine honey layers. You've got nearly as many correct answers."},
    {emoji:"👵", uk:"Бабуся розповіла б усім сусідкам про такий результат.", en:"Бабуся would tell every neighbour about a result like that."},
    {emoji:"🥬", uk:"Рівно й акуратно загорнуті голубці свідчать про впевнену руку кухаря. У тебе саме така рука.", en:"Голубці rolled neat and even are the mark of a steady hand. You've got a steady hand."},
    {emoji:"🍲", uk:"Мама б додала тобі другу тарілку борщу за такий результат.", en:"Your mama would give you a second bowl of борщ for a result like that."},
    {emoji:"🍞", uk:"Паска має лише один шанс на рік піднятися, і жодного тиску. Твоя піднялась так, ніби мала щось довести.", en:"Паска only gets one shot a year to rise, no pressure at all. Yours rose like it had something to prove."},
    {emoji:"🍽️", uk:"Крученики, які тримають форму до кінця варіння, це знак майстерності. Твоя форма трималась.", en:"Крученики that hold their shape right through cooking are a sign of real skill. Yours held up."},
    {emoji:"🏡", uk:"З таким результатом сусідка раптом дуже зацікавиться позичити цукру.", en:"A result like that, and the neighbour's suddenly very interested in borrowing sugar."},
    {emoji:"🥃", uk:"Дідусь налив би тобі чарку узвару в знак поваги. Ну, майже повну чарку.", en:"Дідусь would pour you a glass of узвар out of respect for that. Well, almost a full one."},
    {emoji:"🍘", uk:"Гречаники, пропечені рівно з усіх боків, це рідкість навіть у досвідчених кухарів. У тебе вийшло.", en:"Гречаники baked evenly on every side are rare even for experienced cooks. You managed it."},
    {emoji:"🎉", uk:"Такий результат вартий місця за святковим столом.", en:"A result like that earns you a seat at the holiday table."},
    {emoji:"🍒🥃", uk:"Дідусева наливка стоїть у льоху щонайменше рік, перш ніж її можна пити. Такий результат вартий дегустації просто зараз.", en:"Дідусь's наливка sits in the cellar for at least a year before it's ready. A result like that deserves a taste right now."},
    {emoji:"🍯🍷", uk:"Журавлинова медовуха настоюється місяцями, доки не стане ідеальною. Цей результат вже ідеальний.", en:"Cranberry медовуха takes months to get just right. This result already is."}
  ],
  t4: [ // 9/10
    {emoji:"🥚", uk:"Великодній кошик тримає дюжину писанок. Тобі бракує лише однієї, це вже майже повний кошик!", en:"An Easter basket holds a dozen писанки. You're only one short, and that's basically a full basket!"},
    {emoji:"🧵", uk:"Вишиванку вишивають сотнями стібків. Тобі не вистачило лише одного, щоб вважати її довершеною.", en:"A вишиванка is stitched with hundreds of threads. You're just one stitch from calling it finished."},
    {emoji:"🍞", uk:"Коровай печуть цілою родиною. Тобі бракує лише однієї пари рук, і майже готово.", en:"A коровай is baked by the whole family. You're just one pair of hands short, and nearly there."},
    {emoji:"🛢️", uk:"Квас потребує кількох днів у теплому місці, щоб добре забродити. Дай собі ще трохи часу, і твої відмінки стануть смачними, як справжній квас.", en:"Квас needs a few days in a warm spot to ferment properly. Give it a little more time and your cases will turn out as good as a proper квас."},
    {emoji:"🧵", uk:"Рушник вишивають з обох країв, симетрично. Твій симетричний майже повністю.", en:"A рушник is embroidered from both ends, symmetrically. Yours is nearly there."},
    {emoji:"🥟", uk:"Тобі бракує одного до дюжини вареників, але це все одно хороший результат!", en:"You're one short of a dozen вареники, but it's still a good result!"},
    {emoji:"🍯🍶", uk:"Малинова медовуха має відстоятися останній тиждень, перш ніж стане готовою. Тобі лишився лише один крок до готовності.", en:"Raspberry медовуха needs one last week to settle before it's ready. You're just one step from ready too."},
    {emoji:"🥚", uk:"Писанку розписують воском у кілька шарів, і один пропущений шар усе одно лишає її гарною. Твоя гарна.", en:"A писанка is waxed in several layers, and missing just one still leaves it beautiful. Yours is beautiful."},
    {emoji:"🍒🥟", uk:"Вишневі вареники подають цілою тарілкою на гостину. Твоя тарілка майже повна, бракує лише одного.", en:"Cherry вареники are served up by the plateful for guests. Yours is almost full, just one short."},
    {emoji:"🥬", uk:"Голубці подають цілою купою, і лише один загорнувся не так рівно. Дев'ять із десяти це вже купа.", en:"Голубці come out in a whole batch, and only one didn't roll up quite as neatly. Nine out of ten is still a proper batch."}
  ],
  t5: [ // 10/10, one-off. Each line already opens with its own score/exclamation, so no dynamic prefix is added for this tier.
    {emoji:"🇺🇦", uk:"10/10. Прапор твій, вареники подано, громадянство майже офіційне.", en:"10/10 - Flag's yours, вареники are served, citizenship is basically official."},
    {emoji:"🇺🇦", uk:"Ідеально. Ти явно подаєшся на українське громадянство.", en:"Perfect. Are you applying for Ukrainian citizenship?"},
    {emoji:"🍞", uk:"Супер! Ось тобі ціла паска. Не з'їж усю одразу.", en:"Super! Here, have a whole паска. Don't eat it all at once."},
    {emoji:"🏆", uk:"10/10. Ти явно знаєш, про що йдеться.", en:"10/10 - You clearly know your stuff."},
    {emoji:"👵", uk:"Бездоганно. Бабуся розповість усім сусідкам про тебе.", en:"Flawless. Бабуся would tell all her neighbours about you."},
    {emoji:"👕", uk:"Чудово! Ось вишиванка, по заслузі.", en:"Great score! Here you go, a вишиванка for you, well earned."},
    {emoji:"🥚", uk:"Ідеально. Десяток яєць, жодного розбитого.", en:"Perfect. A full десяток of eggs, not one cracked."},
    {emoji:"🍰", uk:"10/10. Медовик у дев'ять коржів, і кожен вдався.", en:"10/10 - Медовик with nine layers, and every single one came out right."},
    {emoji:"🍞", uk:"Супер! Коровай спекли на твою честь, і він піднявся як слід.", en:"Super! A коровай baked in your honour, and it rose just right."},
    {emoji:"🍒🥃", uk:"Бездоганно. Дідусь дістає найкращу наливку з льоху для такого результату.", en:"Flawless. Дідусь brings out his best наливка from the cellar for a result like that."},
    {emoji:"🍯🍷", uk:"Чудово! Журавлинова медовуха, витримана рік, наливається тобі першому.", en:"Great score! Cranberry медовуха, aged a full year, gets poured for you first."},
    {emoji:"🍯🍶", uk:"10/10. Малинова медовуха, найкраща партія в льоху, тільки для тебе.", en:"10/10 - Raspberry медовуха, the best batch in the cellar, just for you."},
    {emoji:"🛢️", uk:"Ідеально. Крижаний квас, найкращий у спеку, і він увесь твій.", en:"Perfect. Ice-cold квас, unbeatable in the heat, and it's all yours."},
    {emoji:"🥬", uk:"Супер! Голубці загорнуті так рівно, що жоден не розвалився за весь обід.", en:"Super! Голубці rolled so neatly, not one fell apart the whole meal."},
    {emoji:"✨", uk:"Бездоганно. Кутя вийшла солодкою рівно настільки, наскільки треба, з першої спроби.", en:"Flawless. Кутя came out exactly the right sweetness, first try."},
    {emoji:"🍞", uk:"Чудово! Паска піднялась вище за всі інші на підвіконні.", en:"Great score! Паска rose taller than every other loaf on the windowsill."},
    {emoji:"🏆", uk:"10/10. Сало нарізали найтоншими скибками, спеціально для переможця.", en:"10/10 - Сало cut into the thinnest slices, just for the winner."},
    {emoji:"🍂", uk:"Ідеально. Узвар настоявся рівно стільки, скільки треба, ні хвилиною менше.", en:"Perfect. Узвар steeped exactly as long as it should, not a minute less."},
    {emoji:"🥔", uk:"Супер! Сусідка приходила б саме заради твоїх дерунів.", en:"Super! The neighbour would start showing up just for your деруни."},
    {emoji:"🍘", uk:"Бездоганно. Гречаники з першої партії, жоден не пригорів.", en:"Flawless. Гречаники straight off the first batch, not one burnt."},
    {emoji:"🥯", uk:"Чудово! Книші такі пухкі, що аж не вірилось, що вони твої.", en:"Great score! Книші so fluffy, no one would believe you made them."},
    {emoji:"🥨", uk:"10/10. Вергуни вийшли хрумкими настільки, що чути було з іншої кімнати.", en:"10/10 - Вергуни so crisp you could hear them from the next room."},
    {emoji:"🧄", uk:"Ідеально. Часникові пампушки розлетілися ще до того, як борщ поставили на стіл.", en:"Perfect. Часникові пампушки disappeared before the борщ even hit the table."},
    {emoji:"🧊", uk:"Супер! Холодець застиг ідеально рівним шаром, без жодної бульбашки.", en:"Super! Холодець set in one perfectly smooth layer, not a bubble in sight."},
    {emoji:"🍯", uk:"Бездоганно. Медова баночка спорожніла тільки тому, що всі просили добавки.", en:"Flawless. The honey jar only emptied because everyone kept asking for more."},
    {emoji:"🌻", uk:"Чудово! Соняшникове насіння підсмажили окремо, спеціально для тебе, у знак поваги.", en:"Great score! Sunflower seeds roasted specially for you, as a mark of respect."},
    {emoji:"🥟", uk:"10/10. Дюжина вареників зникла з тарілки за хвилину, і всі хвалили кухаря.", en:"10/10 - A dozen вареники vanished off the plate in a minute, and everyone praised the cook."},
    {emoji:"🇺🇦", uk:"Ідеально. Прапор майорить над тобою, і всі це бачать.", en:"Perfect. The flag flies over you, and everyone sees it."},
    {emoji:"🎃", uk:"Супер! Гарбузова каша вийшла такою, що навіть найвибагливіший дідусь попросив добавки.", en:"Super! Гарбузова каша turned out so good even the fussiest дідусь asked for seconds."},
    {emoji:"🏆", uk:"Десять з десяти. Хтось точно розповість бабусі.", en:"Ten out of ten. Someone's definitely telling бабуся."}
  ]
};

(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- toast ---------- */
  const toastEl = $("#toast");
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("is-on"), 2600);
  }

  /* ---------- speech (tr-TR) ---------- */
  let trVoice = null, warned = false;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    const vs = speechSynthesis.getVoices();
    trVoice = vs.find(v => /^tr(-|_)/i.test(v.lang)) || null;
  }
  if ("speechSynthesis" in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  function say(text, el) {
    if (!("speechSynthesis" in window)) { toast("Браузер не умеет озвучивать текст"); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "tr-TR"; u.rate = 0.88;
    if (trVoice) u.voice = trVoice;
    else if (!warned) { warned = true; toast("Турецкого голоса в системе нет — читаю как получится"); }
    if (el) {
      el.classList.add("is-speaking");
      u.onend = u.onerror = () => el.classList.remove("is-speaking");
    }
    speechSynthesis.speak(u);
  }
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-say]");
    if (t) { e.stopPropagation(); say(t.dataset.say, t); }
  });

  /* ---------- progress, nav, sticky ---------- */
  const bar = $("#progressBar"), nav = $("#nav"), sticky = $("#sticky");
  let lastY = scrollY, heroOut = false, nearEnd = false;
  function onScroll() {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
    const y = scrollY;
    nav.classList.toggle("is-hidden", y > 300 && y > lastY + 4);
    if (y < lastY - 4 || y < 300) nav.classList.remove("is-hidden");
    lastY = y;
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const syncSticky = () => sticky.classList.toggle("is-on", heroOut && !nearEnd);
  new IntersectionObserver(([en]) => { heroOut = !en.isIntersecting; syncSticky(); }).observe($("#hero"));
  const endIO = new IntersectionObserver(ens => {
    nearEnd = ens.some(en => en.isIntersecting) || $$("#price,#final").some(el => el.getBoundingClientRect().top < innerHeight && el.getBoundingClientRect().bottom > 0);
    syncSticky();
  });
  $$("#price,#final").forEach(el => endIO.observe(el));

  /* ---------- reveal ---------- */
  const rio = new IntersectionObserver(ens => ens.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("is-in"); rio.unobserve(en.target); }
  }), { rootMargin: "0px 0px -8% 0px" });
  $$(".reveal").forEach((el, i) => { el.style.transitionDelay = (i % 3) * 70 + "ms"; rio.observe(el); });

  /* ---------- turkish keys ---------- */
  const KEYS = [
    ["Ç", "ч", "çekmek", "чекмек", "снимать (деньги)"],
    ["Ğ", "не читается, тянет гласную", "doğrulama", "доорулама", "подтверждение"],
    ["I", "ы", "sıra", "сыра", "очередь"],
    ["İ", "и", "imza", "имза", "подпись"],
    ["Ö", "ё", "ödeme", "ёдеме", "платёж"],
    ["Ş", "ш", "şifre", "шифре", "PIN-код"],
    ["Ü", "ю", "ücret", "юджрет", "плата"]
  ];
  const keysRow = $("#keys"), keysOut = $("#keysOut");
  KEYS.forEach(([k, snd, w, cy, ru]) => {
    const b = document.createElement("button");
    b.className = "key"; b.type = "button"; b.textContent = k;
    b.setAttribute("aria-label", `${k}: ${snd}. Пример: ${w}`);
    b.addEventListener("click", () => {
      $$(".key").forEach(x => x.classList.remove("is-on"));
      b.classList.add("is-on");
      keysOut.innerHTML = `<b>${k}</b> = ${esc(snd)} · <b>${w}</b> [${cy}] — ${ru}`;
      say(w);
    });
    keysRow.append(b);
  });

  /* ---------- 3D card tilt ---------- */
  const card = $("#card3d"), stage = $(".hero__stage");
  if (!reduce && card) {
    let tx = 0, ty = 0, cx = 0, cy = 0, auto = true, t0 = performance.now();
    const set = (x, y) => { tx = x; ty = y; };
    stage.addEventListener("pointermove", e => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      auto = false; set(x * 30, -y * 26);
      card.style.setProperty("--sx", (x + .5) * 100 + "%");
      card.style.setProperty("--sy", (y + .5) * 100 + "%");
    });
    stage.addEventListener("pointerleave", () => { auto = true; });
    (function loop(now) {
      if (auto) { const k = (now - t0) / 1000; set(Math.sin(k * .8) * 14, Math.cos(k * .6) * 8); }
      cx += (tx - cx) * .08; cy += (ty - cy) * .08;
      card.style.transform = `rotateY(${cx}deg) rotateX(${cy}deg) rotateZ(${-6 + cx * .1}deg)`;
      requestAnimationFrame(loop);
    })(t0);
  }

  /* ---------- mouse glow on dark cards ---------- */
  $$(".ps__card--dark").forEach(c => c.addEventListener("pointermove", e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", e.clientX - r.left + "px");
    c.style.setProperty("--my", e.clientY - r.top + "px");
  }));

  /* ---------- magnetic buttons ---------- */
  if (!reduce && matchMedia("(hover:hover)").matches) {
    $$(".magnetic").forEach(b => {
      b.addEventListener("pointermove", e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px,${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      b.addEventListener("pointerleave", () => { b.style.transform = ""; });
    });
  }

  /* ---------- builder: -mak istiyorum ---------- */
  const VERBS = [
    ["Hesap açmak", "Я хочу открыть счёт.", "Хесап ачмак"],
    ["Para çekmek", "Я хочу снять деньги.", "Пара чекмек"],
    ["Para yatırmak", "Я хочу положить деньги.", "Пара ятырмак"],
    ["Dolar bozdurmak", "Я хочу обменять доллары.", "Долар боздурмак"],
    ["Havale yapmak", "Я хочу сделать перевод.", "Хавале япмак"],
    ["Şifremi değiştirmek", "Я хочу сменить PIN-код.", "Шифреми дэиштирмек"],
    ["Kartımı iptal etmek", "Я хочу аннулировать карту.", "Картымы иптал этмек"]
  ];
  const chips = $("#verbChips"), bVerb = $("#bVerb"), bRu = $("#bRu"), bCy = $("#bCy");
  VERBS.forEach(([tr, ru, cy], i) => {
    const c = document.createElement("button");
    c.type = "button"; c.className = "chip" + (i === 0 ? " is-on" : ""); c.textContent = tr.toLowerCase();
    c.setAttribute("aria-pressed", i === 0);
    c.addEventListener("click", () => {
      $$(".chip", chips).forEach(x => { x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false"); });
      c.classList.add("is-on"); c.setAttribute("aria-pressed", "true");
      bVerb.textContent = tr;
      bVerb.style.animation = "none"; void bVerb.offsetWidth; bVerb.style.animation = "";
      bRu.textContent = ru; bCy.textContent = cy + " истийорум";
      say(tr + " istiyorum.");
    });
    chips.append(c);
  });
  $("#bSay").addEventListener("click", e => say(bVerb.textContent + " istiyorum.", e.currentTarget));

  /* ---------- words by zone ---------- */
  const ZONES = [
    { t: "Вход и очередь", n: "01",
      note: "Сначала автомат у входа. Это <b>sıramatik</b>. Жмёшь <b>Bireysel</b> (для физлиц), берёшь номерок и смотришь на табло над окошками.",
      w: [
        ["şube", "шубе", "отделение банка", "En yakın şube nerede? — Где ближайшее отделение?"],
        ["sıramatik", "сыраматик", "автомат с номерками", "Sıramatikten numara alın. — Возьмите номер в автомате."],
        ["sıra numarası", "сыра нумарасы", "номер в очереди", "Sıra numaranız kaç? — Какой у вас номер?"],
        ["bireysel", "бирейсель", "для частных лиц", "Bireysel işlemler — операции для физлиц"],
        ["gişe", "гише", "окошко", "Üç numaralı gişeye buyurun. — Пройдите к окну №3."],
        ["vezne", "везне", "касса (наличные)", "Vezneye gidin. — Пройдите в кассу."],
        ["müşteri temsilcisi", "мюштери темсилджиси", "консультант", "Müşteri temsilcisiyle görüşmek istiyorum."],
        ["buyurun", "буюрун", "слушаю вас, проходите", "Buyurun, nasıl yardımcı olabilirim?"]
      ] },
    { t: "Счёт и документы", n: "02",
      note: "Для счёта обычно просят паспорт и <b>vergi numarası</b> (налоговый номер). Иногда ещё <b>ikamet</b>. Зависит от банка.",
      w: [
        ["hesap", "хесап", "счёт", "Hesap açmak istiyorum. — Хочу открыть счёт."],
        ["vadesiz hesap", "вадесиз хесап", "текущий счёт", "Vadesiz hesap yeterli. — Текущего хватит."],
        ["vadeli hesap", "вадели хесап", "вклад на срок", "Vadeli hesapta faiz var. — На вкладе есть проценты."],
        ["faiz", "фаиз", "процент, ставка", "Faiz oranı ne kadar? — Какая ставка?"],
        ["kimlik", "кимлик", "удостоверение личности", "Kimliğinizi alabilir miyim?"],
        ["ikamet izni", "икамет изни", "вид на жительство", "İkamet iznim var. — У меня есть ВНЖ."],
        ["vergi numarası", "верги нумарасы", "налоговый номер", "Vergi numaranız var mı?"],
        ["imza", "имза", "подпись", "Buraya imza atar mısınız? — Распишитесь здесь."]
      ] },
    { t: "Деньги туда-сюда", n: "03",
      note: "Арендодатель попросит <b>dekont</b> — квитанцию о переводе. Турки кидают её в WhatsApp как доказательство. Привыкай.",
      w: [
        ["para yatırmak", "пара ятырмак", "положить деньги", "Hesabıma para yatırmak istiyorum."],
        ["para çekmek", "пара чекмек", "снять деньги", "ATM'den para çektim. — Снял в банкомате."],
        ["havale", "хавале", "перевод (свой банк)", "Arkadaşıma havale yaptım."],
        ["IBAN", "ибан", "номер счёта IBAN", "IBAN'ınızı gönderir misiniz? — Пришлёте IBAN?"],
        ["dekont", "деконт", "квитанция о переводе", "Dekontu WhatsApp'tan attım. — Скинул квитанцию в WhatsApp."],
        ["bakiye", "бакийе", "баланс", "Bakiyem yetersiz. — Недостаточно средств."],
        ["masraf", "масраф", "комиссия, расход", "Masraf var mı? — Есть комиссия?"],
        ["nakit", "накит", "наличные", "Nakit mi, kart mı? — Наличными или картой?"]
      ] },
    { t: "Карта и банкомат", n: "04",
      note: "Три раза ошибся с <b>şifre</b> — карта уходит в <b>bloke</b>. Банкомат может её <b>yuttu</b> — съесть. Буквально.",
      w: [
        ["banka kartı", "банка карты", "дебетовая карта", "Banka kartım gelmedi. — Карта не пришла."],
        ["kredi kartı", "креди карты", "кредитная карта", "Kredi kartı başvurusu — заявка на кредитку"],
        ["şifre", "шифре", "PIN-код, пароль", "Şifremi unuttum. — Я забыл PIN."],
        ["bloke olmak", "блоке олмак", "заблокироваться", "Kartım bloke oldu. — Карта заблокирована."],
        ["yutmak", "ютмак", "проглотить", "ATM kartımı yuttu. — Банкомат съел карту."],
        ["taksit", "таксит", "рассрочка", "Üç taksit yapabilir misiniz? — Можно в 3 платежа?"],
        ["temassız", "темассыз", "бесконтактный", "Temassız ödeme — бесконтактная оплата"],
        ["doğrulama kodu", "доорулама коду", "код подтверждения", "Doğrulama kodu gelmedi. — Код не пришёл."]
      ] },
    { t: "Валюта", n: "05",
      note: "На табло обменника два столбца. <b>Alış</b> — почём они купят у тебя. <b>Satış</b> — почём продадут тебе. Не перепутай, это твои деньги.",
      w: [
        ["döviz", "дёвиз", "валюта", "Döviz bürosu nerede? — Где обменник?"],
        ["kur", "кур", "курс", "Bugün kur ne kadar? — Какой сегодня курс?"],
        ["bozdurmak", "боздурмак", "обменять, разменять", "Dolar bozdurmak istiyorum."],
        ["bozuk para", "бозук пара", "мелочь", "Bozuk paranız var mı? — Есть мелочь?"],
        ["alış", "алыш", "покупка (курс)", "Alış fiyatı — курс покупки"],
        ["satış", "сатыш", "продажа (курс)", "Satış fiyatı — курс продажи"],
        ["Dolar kaç?", "долар кач", "почём доллар?", "Bugün dolar kaç? — Почём сегодня доллар?"],
        ["avro", "авро", "евро", "Avro bozdurmak istiyorum."]
      ] }
  ];
  const zonesEl = $("#zones"), grid = $("#wordGrid"), zoneNote = $("#zoneNote");
  function renderZone(i) {
    $$(".zone", zonesEl).forEach((z, j) => { z.classList.toggle("is-on", j === i); z.setAttribute("aria-selected", j === i); });
    zoneNote.innerHTML = ZONES[i].note;
    grid.innerHTML = "";
    ZONES[i].w.forEach(([tr, cy, ru, ex], k) => {
      const c = document.createElement("div");
      c.className = "wc enter"; c.style.animationDelay = k * 45 + "ms";
      c.tabIndex = 0; c.setAttribute("role", "button");
      c.setAttribute("aria-label", `${tr} — нажми, чтобы увидеть перевод`);
      const exTr = ex.split(" — ")[0];
      c.innerHTML = `<div class="wc__in">
          <div class="wc__f"><span class="wc__tr">${esc(tr)}</span><span class="wc__cy">${esc(cy)}</span></div>
          <div class="wc__b"><span class="wc__ru">${esc(ru)}</span><span class="wc__ex">${esc(ex)}</span></div>
        </div>
        <button class="wc__spk" type="button" aria-label="Послушать: ${esc(tr)}" data-say="${esc(tr)}. ${esc(exTr)}"><svg><use href="#spk"/></svg></button>`;
      const flip = () => c.classList.toggle("is-flip");
      c.addEventListener("click", e => { if (!e.target.closest(".wc__spk")) flip(); });
      c.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
      grid.append(c);
    });
  }
  ZONES.forEach((z, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "zone"; b.setAttribute("role", "tab");
    b.innerHTML = `<small>Зона ${z.n}</small><b>${z.t}</b>`;
    b.addEventListener("click", () => { renderZone(i); b.scrollIntoView({ behavior: reduce ? "auto" : "smooth", inline: "center", block: "nearest" }); });
    zonesEl.append(b);
  });
  renderZone(0);

  /* ---------- phone app ---------- */
  const phone = $("#phone"), tip = $("#appTip");
  let appLang = "tr";
  $$(".toggle__b").forEach(b => b.addEventListener("click", () => {
    appLang = b.dataset.lang;
    $$(".toggle__b").forEach(x => x.classList.toggle("is-on", x === b));
    $$(".t", phone).forEach(t => { t.textContent = t.dataset[appLang]; });
    tip.innerHTML = appLang === "ru" ? "Видишь? Ничего страшного. Верни <b>Türkçe</b> и потренируйся." : "Тапни любой элемент на экране.";
  }));
  $$(".t", phone).forEach(t => {
    t.tabIndex = 0;
    const act = () => {
      $$(".t", phone).forEach(x => x.classList.remove("is-on"));
      t.classList.add("is-on");
      tip.innerHTML = `<b>${esc(t.dataset.tr)}</b> [${esc(t.dataset.cy)}] — ${esc(t.dataset.ru)}`;
      say(t.dataset.tr);
    };
    t.addEventListener("click", act);
    t.addEventListener("keydown", e => { if (e.key === "Enter") act(); });
  });
  const bal = $("#bal");
  new IntersectionObserver(([en], o) => {
    if (!en.isIntersecting) return;
    o.disconnect();
    const target = 200250, d = reduce ? 1 : 1600, s = performance.now();
    (function step(n) {
      const p = Math.min(1, (n - s) / d), v = target * (1 - Math.pow(1 - p, 3));
      bal.textContent = "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (p < 1) requestAnimationFrame(step);
    })(s);
  }, { threshold: .4 }).observe(phone);

  /* ---------- chat ---------- */
  const CHAT = {
    start: { them: ["Hoş geldiniz, buyurun.", "Добро пожаловать, слушаю вас."],
      opts: [["Merhaba. Hesap açmak istiyorum.", "Здравствуйте. Хочу открыть счёт.", "n2"], ["Şey… hesap… istemek?", "Ну… счёт… хотеть?", "n1b"]] },
    n1b: { note: "Почти. Вспомни чит-код №1: глагол целиком + istiyorum.", them: ["Hesap açmak mı istiyorsunuz?", "Вы хотите открыть счёт?"],
      opts: [["Evet, hesap açmak istiyorum.", "Да, хочу открыть счёт.", "n2"]] },
    n2: { them: ["Tabii. Kimliğiniz ya da pasaportunuz var mı?", "Конечно. У вас есть удостоверение или паспорт?"],
      opts: [["Pasaportum burada.", "Вот мой паспорт.", "n3"]] },
    n3: { them: ["Vergi numaranız var mı?", "У вас есть налоговый номер?"],
      opts: [["Evet, var.", "Да, есть.", "n5"], ["Hayır, yok. Nereden alabilirim?", "Нет. Где его можно получить?", "n4"], ["(кивнуть с умным видом)", "", "n3nod"]] },
    n3nod: { note: "Вот так я и пришёл в банк три раза. Не кивай. Отвечай.", them: ["Vergi numaranız var mı?", "У вас есть налоговый номер?"],
      opts: [["Evet, var.", "Да, есть.", "n5"], ["Hayır, yok. Nereden alabilirim?", "Нет. Где его можно получить?", "n4"]] },
    n4: { them: ["Vergi dairesinden alabilirsiniz. Pasaportunuzu götürün.", "Можно получить в налоговой. Возьмите паспорт."],
      note: "Налоговый номер иностранцу дают в vergi dairesi по паспорту. Бывает и онлайн.",
      opts: [["Tamam, yarın gelirim.", "Хорошо, приду завтра.", "n4b"]] },
    n4b: { note: "Следующий день. Снова окошко. Уже с номером.", them: ["Tekrar hoş geldiniz! Vergi numaranızı aldınız mı?", "С возвращением! Получили налоговый номер?"],
      opts: [["Evet, aldım.", "Да, получил.", "n5"]] },
    n5: { them: ["Harika. Vadesiz mi, vadeli mi hesap istiyorsunuz?", "Отлично. Вам текущий или срочный счёт?"],
      opts: [["Vadesiz, lütfen.", "Текущий, пожалуйста.", "n6"], ["Vadeli ne demek?", "А что значит vadeli?", "n5q"]] },
    n5q: { them: ["Vadeli hesapta para belli bir süre durur, faiz alırsınız.", "На срочном счёте деньги лежат определённый срок, вы получаете проценты."],
      opts: [["Anladım. Vadesiz, lütfen.", "Понял. Текущий, пожалуйста.", "n6"]] },
    n6: { them: ["Banka kartı da ister misiniz?", "Карту тоже хотите?"],
      opts: [["Evet, lütfen. Masraf var mı?", "Да, пожалуйста. Есть комиссия?", "n7"], ["Evet.", "Да.", "n6x"]] },
    n6x: { note: "Работает. Но ты не спросил про masraf. Иногда карта бесплатная, иногда нет. Спрашивай до, а не после.", next: "n7" },
    n7: { them: ["Kart ücretsiz. Buraya ve buraya imza atar mısınız?", "Карта бесплатная. Распишитесь здесь и здесь?"],
      opts: [["Tabii.", "Конечно.", "n8"]] },
    n8: { them: ["Şifrenizi belirleyin lütfen. Kartınız birkaç gün içinde şubeye gelecek.", "Задайте PIN, пожалуйста. Карта придёт в отделение через несколько дней."],
      opts: [["Teşekkür ederim, iyi çalışmalar!", "Спасибо, хорошей работы!", "end"], ["Teşekkürler, görüşürüz.", "Спасибо, до встречи.", "end2"]] },
    end: { them: ["Çok teşekkürler, size de iyi günler!", "Большое спасибо, и вам хорошего дня!"],
      note: "«İyi çalışmalar» — «хорошей работы». Говорят любому, кто работает. Сотрудник это запомнит. Ты больше не турист.", fin: true },
    end2: { them: ["İyi günler!", "Хорошего дня!"],
      note: "Норм. А в следующий раз скажи «iyi çalışmalar» — «хорошей работы». Турки это обожают.", fin: true }
  };
  const log = $("#chatLog"), opts = $("#chatOpts"), chatBox = $(".chat");
  $("#chatRu").addEventListener("change", e => chatBox.classList.toggle("no-ru", !e.target.checked));
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  const scrollLog = () => { log.scrollTop = log.scrollHeight; };
  function bubble(who, tr, ru) {
    const m = document.createElement("div");
    m.className = "msg msg--" + who;
    m.innerHTML = `<div class="msg__tr" data-say="${esc(tr)}">${esc(tr)}</div>${ru ? `<div class="msg__ru">${esc(ru)}</div>` : ""}`;
    log.append(m); scrollLog();
  }
  function note(txt) {
    const n = document.createElement("div"); n.className = "msg__note"; n.textContent = txt; log.append(n); scrollLog();
  }
  let chatStarted = false;
  async function go(id) {
    const node = CHAT[id];
    opts.innerHTML = "";
    if (node.note && !node.them) { note(node.note); await wait(500); return go(node.next); }
    if (node.note && id !== "n4" && !node.fin) { note(node.note); await wait(600); }
    const ty = document.createElement("div"); ty.className = "typing"; ty.innerHTML = "<i></i><i></i><i></i>";
    log.append(ty); scrollLog();
    await wait(900);
    ty.remove();
    bubble("them", ...node.them);
    if (chatStarted) say(node.them[0]);
    if (node.note && (id === "n4" || node.fin)) { await wait(500); note(node.note); }
    if (node.fin) {
      const b = document.createElement("button");
      b.className = "opt"; b.type = "button"; b.innerHTML = "<b>Пройти ещё раз ↻</b><small>Попробуй другие ответы</small>";
      b.addEventListener("click", () => { log.innerHTML = ""; go("start"); });
      opts.append(b);
      return;
    }
    node.opts.forEach(([tr, ru, next]) => {
      const b = document.createElement("button");
      b.className = "opt"; b.type = "button";
      b.innerHTML = `<b>${esc(tr)}</b>${ru ? `<small>${esc(ru)}</small>` : ""}`;
      b.addEventListener("click", () => {
        chatStarted = true;
        if (tr.startsWith("(")) note("*кивает*"); else { bubble("me", tr, ru); say(tr); }
        opts.innerHTML = "";
        setTimeout(() => go(next), reduce ? 0 : 500);
      });
      opts.append(b);
    });
    scrollLog();
  }
  new IntersectionObserver(([en], o) => { if (en.isIntersecting) { o.disconnect(); go("start"); } }, { threshold: .3 }).observe(chatBox);

  /* ---------- quiz ---------- */
  const QUIZ = [
    ["В окошке прозвучало «masraf». Это…", ["зарплата", "комиссия", "очередь"], 1, "masraf = комиссия, расход. Кивнул — заплатил."],
    ["Перевести другу в ДРУГОЙ банк прямо сейчас, ночью — это…", ["havale", "FAST", "dekont"], 1, "FAST — средний брат-спортсмен. Мгновенно, между банками, 24/7."],
    ["Банкомат «kartımı yuttu». Что случилось?", ["выдал деньги", "проглотил карту", "сломался экран"], 1, "yutmak — глотать. Банкомат-людоед."],
    ["Как сказать «Хочу снять деньги»?", ["Para yatırmak istiyorum.", "Para çekmek istiyorum.", "Para bozdurmak istiyorum."], 1, "çekmek — тянуть, снимать. yatırmak — положить, bozdurmak — обменять."],
    ["Сотрудник: «Buraya imza atar mısınız?»", ["Распишитесь здесь", "Подождите тут", "Введите PIN"], 0, "imza — подпись. imza atmak — расписаться."],
    ["«Bozuk para» — это…", ["фальшивые деньги", "мелочь", "долг"], 1, "bozuk — сломанный. Мелочь для турка — сломанные деньги."]
  ];
  let qi = 0, score = 0;
  const qText = $("#qText"), qOpts = $("#qOpts"), qFb = $("#qFb"), qNum = $("#qNum"), qBar = $("#qBar"), qBox = $("#quizBox"), qRes = $("#quizRes");
  function renderQ() {
    const [q, os, ok, ex] = QUIZ[qi];
    qNum.textContent = `${qi + 1} / ${QUIZ.length}`;
    qBar.style.width = (qi / QUIZ.length) * 100 + "%";
    qText.textContent = q; qFb.textContent = ""; qOpts.innerHTML = "";
    os.forEach((o, j) => {
      const b = document.createElement("button");
      b.className = "qo"; b.type = "button"; b.textContent = o;
      b.addEventListener("click", () => {
        $$(".qo", qOpts).forEach(x => x.disabled = true);
        if (j === ok) { b.classList.add("ok"); score++; qFb.textContent = "Да. " + ex; }
        else { b.classList.add("bad"); qOpts.children[ok].classList.add("ok"); qFb.textContent = "Мимо. " + ex; }
        setTimeout(() => { qi++; qi < QUIZ.length ? renderQ() : finishQ(); }, reduce ? 600 : 1700);
      });
      qOpts.append(b);
    });
  }
  function finishQ() {
    qBar.style.width = "100%";
    qBox.hidden = true; qRes.hidden = false;
    $("#qScore").textContent = `${score}/${QUIZ.length}`;
    const v = score === 6 ? ["Ты не киваешь. Ты разговариваешь.", "Банк закрыт. Буквально. Следующая остановка — аптека, аренда, врач. Всё это уже лежит на платформе, по уровням."]
      : score >= 4 ? ["Почти местный.", `${QUIZ.length - score === 1 ? "Одна ошибка" : "Две ошибки"} — это ещё пара походов в банк с Google-переводчиком. Добей тему, а потом бери следующую из 131.`]
      : ["Пока кивал бы. Это нормально.", "Пройди зоны ещё раз. А если хочешь, чтобы таких тем было не одна, а сто тридцать одна — они уже собраны."];
    $("#qVerdict").textContent = v[0]; $("#qMsg").textContent = v[1];
    if (score >= 4) confetti();
  }
  $("#qAgain").addEventListener("click", () => { qi = 0; score = 0; qBox.hidden = false; qRes.hidden = true; renderQ(); });
  renderQ();

  function confetti() {
    if (reduce) return;
    const cols = ["#00FFCC", "#ffffff", "#111111", "#00d4aa"];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement("i");
      c.className = "cf";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = cols[i % cols.length];
      c.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
      c.style.animationDelay = Math.random() * .4 + "s";
      document.body.append(c);
      setTimeout(() => c.remove(), 3800);
    }
  }

  /* ---------- counters ---------- */
  const cio = new IntersectionObserver(ens => ens.forEach(en => {
    if (!en.isIntersecting) return;
    cio.unobserve(en.target);
    const el = en.target, to = +el.dataset.to, d = reduce ? 1 : 1400, s = performance.now();
    (function step(n) {
      const p = Math.min(1, (n - s) / d);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString("ru-RU");
      if (p < 1) requestAnimationFrame(step);
    })(s);
  }), { threshold: .5 });
  $$(".count").forEach(c => cio.observe(c));

  /* ---------- notion wall ---------- */
  const NOTION = [
    ["Деньги", "lexika-money", "notion · A0-A1-A2 Alterna / Лексика", "Лексика A0–A2. Карточка «Деньги» — твой банк живёт тут.", "Раздел «Лексика» с карточкой «Деньги»", { l: 36.2, t: 42, w: 27.4, h: 26.4 }],
    ["Блок слов", "products", "notion · Лексика / Продукты", "Так устроен блок лексики: русский · турецкий · транскрипция кириллицей.", "Таблица лексики «Продукты»", null],
    ["Темы", "topics", "notion · Лексика / Темы", "Еда, ресторан, больница, гостиница, транспорт… Жизнь, а не учебник.", "Сетка тем лексики", null],
    ["Хаб A0–A2", "hub-a0", "notion · A0-A1-A2 Alterna", "Главная уровня A0–A2: грамматика, лексика, подборка ресурсов.", "Главная страница уровня A0–A2", null],
    ["Хаб B1–C1", "hub-b1", "notion · B1-B2-C1 Alterna", "B1–C1: те же разделы, но уже для тех, кто говорит.", "Главная страница уровня B1–C1", null],
    ["Прогресс", "progress", "notion · B1-B2-C1 / Грамматика / Прогресс по темам", "Трекер: тема, блок, заметки, «пройдено», уровень. Видно, куда движешься.", "Таблица прогресса по темам", null]
  ];
  const nTabs = $("#notionTabs"), nImg = $("#notionImg"), nHl = $("#notionHl");
  function showN(i) {
    const [, f, url, cap, alt, hl] = NOTION[i];
    $$(".tab", nTabs).forEach((t, j) => { t.classList.toggle("is-on", j === i); t.setAttribute("aria-selected", j === i); });
    nImg.classList.add("is-fading"); nHl.classList.remove("is-on");
    setTimeout(() => {
      nImg.src = `media/notion/${f}.webp`; nImg.alt = alt;
      $("#notionUrl").textContent = url; $("#notionCap").textContent = cap;
      nImg.onload = () => {
        nImg.classList.remove("is-fading");
        if (hl) { Object.assign(nHl.style, { left: hl.l + "%", top: hl.t + "%", width: hl.w + "%", height: hl.h + "%" }); nHl.classList.add("is-on"); }
      };
    }, 200);
  }
  NOTION.forEach((n, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tab"; b.textContent = n[0]; b.setAttribute("role", "tab");
    b.addEventListener("click", () => showN(i));
    nTabs.append(b);
  });
  $$(".tab", nTabs)[0].classList.add("is-on");
  new IntersectionObserver(([en], o) => {
    if (!en.isIntersecting) return;
    o.disconnect();
    const hl = NOTION[0][5];
    Object.assign(nHl.style, { left: hl.l + "%", top: hl.t + "%", width: hl.w + "%", height: hl.h + "%" });
    setTimeout(() => nHl.classList.add("is-on"), 500);
  }, { threshold: .5 }).observe($("#notionShot"));

  /* ---------- lightbox ---------- */
  const lb = $("#lb"), lbImg = $("img", lb);
  const openLb = (src, alt) => { lbImg.src = src; lbImg.alt = alt; lb.hidden = false; };
  $(".shot__img").addEventListener("click", () => openLb(nImg.src, nImg.alt));
  $(".cert").addEventListener("click", () => openLb($("#certImg").src, $("#certImg").alt));
  $$(".fan img").forEach(im => im.addEventListener("click", () => openLb(im.src, im.alt)));
  lb.addEventListener("click", () => { lb.hidden = true; });
  addEventListener("keydown", e => { if (e.key === "Escape") lb.hidden = true; });

  /* ---------- videos: play in view ---------- */
  const vio = new IntersectionObserver(ens => ens.forEach(en => {
    const v = en.target;
    if (en.isIntersecting) { if (v.preload === "none") v.preload = "auto"; v.play().catch(() => {}); }
    else v.pause();
  }), { threshold: .55 });
  $$(".vid video").forEach(v => vio.observe(v));

  /* ---------- phones fan: 3D by position ---------- */
  const fan = $("#fan");
  if (fan && !reduce) {
    const figs = $$("figure", fan);
    const upd = () => {
      const r = fan.getBoundingClientRect(), mid = r.left + r.width / 2;
      figs.forEach(f => {
        const fr = f.getBoundingClientRect(), d = (fr.left + fr.width / 2 - mid) / r.width;
        f.style.transform = `rotateY(${d * -28}deg) scale(${1 - Math.min(Math.abs(d) * .25, .15)}) translateY(${Math.abs(d) * 18}px)`;
      });
    };
    fan.addEventListener("scroll", () => requestAnimationFrame(upd), { passive: true });
    addEventListener("resize", upd);
    upd();
  }

  /* ---------- calculator ---------- */
  const tutor = $("#tutor"), tVal = $("#tutorVal"), tOut = $("#tutorOut");
  const lessons = n => {
    if (!Number.isInteger(n)) return "≈ " + n.toLocaleString("ru-RU", { maximumFractionDigits: 1 }) + " занятия";
    const m10 = n % 10, m100 = n % 100;
    const w = m10 === 1 && m100 !== 11 ? "занятие" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "занятия" : "занятий";
    return n + " " + w;
  };
  function calc() {
    const p = +tutor.value, n = Math.round((30 / p) * 10) / 10;
    tVal.textContent = "$" + p;
    tOut.textContent = `$30 — это ${lessons(n)} с репетитором. ${n <= 1 ? "Один час — и всё." : "Пара часов — и всё."}`;
  }
  tutor.addEventListener("input", calc);
  calc();

  /* ---------- wordmark letters ---------- */
  const wm = $(".wordmark");
  wm.innerHTML = [...wm.textContent].map(ch => `<span>${ch}</span>`).join("");
})();

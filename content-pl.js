// Teksty formularzy dla pacjentki (PL). Tłumaczenie content.js (DE = wersja prawnie wiążąca).
// Ten sam kształt obiektu i te same klucze co window.AB_CONTENT. Zabiegi (treatments) zostają po niemiecku (język panelu).
window.AB_CONTENT_PL = {
  version: "2026-10-11",
  practice: {
    name: "Aesthetic Harmony",
    owner: "Samanta Wysocka, Heilpraktikerin",
    address: "Arcostraße 11, 10587 Berlin",
    city: "Berlin",
    phone: "",
    email: ""
  },

  questions: [
    { id: "q1", t: "Czy przyjmuje Pani/Pan regularnie lub obecnie jakieś leki?", h: "Również leki ziołowe, suplementy diety i preparaty dostępne bez recepty.", d: "Jakie i w jakiej dawce?" },
    { id: "q2", t: "Czy przyjmuje Pani/Pan leki rozrzedzające krew?", h: "Na przykład kwas acetylosalicylowy (ASS, aspiryna), ibuprofen, Marcumar, Xarelto, Eliquis, klopidogrel albo duże dawki witaminy E, kwasów omega-3 lub miłorzębu (ginkgo).", d: "Jakie?" },
    { id: "q3", t: "Czy ma Pani/Pan alergię lub nietolerancję?", h: "Na przykład na leki, znieczulenie miejscowe (lidokainę), hialuronidazę, lateks, plastry, środki dezynfekujące, białka bakteryjne lub żywność.", d: "Na co i jak się objawia?" },
    { id: "q4", t: "Czy ma Pani/Pan skłonność do krwawień lub siniaków?", h: "Również po drobnych urazach lub u dentysty.", d: "Prosimy opisać" },
    { id: "q5", t: "Czy ma Pani/Pan chorobę serca lub układu krążenia?", h: "Na przykład wysokie lub niskie ciśnienie krwi, zaburzenia rytmu serca, zawał serca, udar mózgu.", d: "Jaką?" },
    { id: "q6", t: "Czy ma Pani/Pan chorobę metaboliczną, na przykład cukrzycę?", d: "Jaką?" },
    { id: "q7", t: "Czy ma Pani/Pan chorobę tarczycy?", d: "Jaką?" },
    { id: "q8", t: "Czy ma Pani/Pan chorobę autoimmunologiczną lub chorobę tkanki łącznej?", h: "Na przykład toczeń, reumatoidalne zapalenie stawów, twardzina, choroba Hashimoto, stwardnienie rozsiane.", d: "Jaką?" },
    { id: "q9", t: "Czy ma Pani/Pan osłabiony układ odpornościowy lub przyjmuje leki, które go osłabiają?", h: "Na przykład kortyzon, chemioterapia.", d: "Prosimy opisać" },
    { id: "q10", t: "Czy ma Pani/Pan chorobę zakaźną?", h: "Na przykład zapalenie wątroby (hepatitis), HIV, gruźlica.", d: "Jaką?" },
    { id: "q11", t: "Czy miewa Pani/Pan opryszczkę na ustach (tak zwane zimno)?", d: "Jak często?" },
    { id: "q12", t: "Czy ma Pani/Pan obecnie stan zapalny, trądzik, egzemę lub otwarte rany na twarzy?", d: "Gdzie?" },
    { id: "q13", t: "Czy ma Pani/Pan skłonność do zaburzeń gojenia się ran, blizn przerostowych lub bliznowców (keloidów)?", d: "Prosimy opisać" },
    { id: "q14", t: "Czy w ostatnich 4 tygodniach miało miejsce szczepienie, infekcja lub leczenie stomatologiczne albo czy w ciągu najbliższych 4 tygodni planowane jest szczepienie lub leczenie stomatologiczne?", h: "Również przeziębienie, grypa, COVID-19.", d: "Co i kiedy?" },
    { id: "q15", t: "Czy ma Pani/Pan implanty w ciele lub w twarzy?", h: "Na przykład rozrusznik serca, endoproteza stawu, implanty zębowe, nici, silikon lub inne trwałe wypełniacze.", d: "Jakie?" },
    { id: "q16", t: "Czy wykonywano już u Pani/Pana zabiegi estetyczne twarzy?", h: "Na przykład wypełniacze, toksyna botulinowa, nici liftingujące, laser, peeling, operacja.", d: "Co, gdzie, kiedy, jakim preparatem? Czy były jakieś problemy?" },
    { id: "q17", t: "Czy kiedykolwiek wystąpiły u Pani/Pana powikłania po znieczuleniu miejscowym?", d: "Co się wydarzyło?" },
    { id: "q18", t: "Czy ma Pani/Pan zaburzenia psychiczne lub jest z tego powodu w trakcie leczenia?", h: "Na przykład depresja, zaburzenia lękowe, zaburzenia odżywiania.", d: "Prosimy opisać" },
    { id: "q19", t: "Czy pali Pani/Pan?", d: "Ile dziennie?" },
    { id: "q20", t: "Czy są inne choroby, operacje lub informacje, o których powinniśmy wiedzieć?", d: "Prosimy opisać" },
    { id: "q21", t: "Czy jest Pani w ciąży lub może Pani być w ciąży?", women: true },
    { id: "q22", t: "Czy obecnie karmi Pani piersią?", women: true }
  ],

  anamnesisConfirm: [
    "Oświadczam, że moje odpowiedzi na wszystkie pytania są zgodne z prawdą i moją najlepszą wiedzą. Wiem, że nieprawdziwe lub brakujące informacje mogą zagrażać mojemu zdrowiu.",
    "Przed każdym kolejnym zabiegiem poinformuję o zmianach stanu mojego zdrowia."
  ],

  treatments: [
    "Lippen: Volumen", "Lippen: Kontur", "Lippen: Lippenfältchen", "Nasolabialfalten", "Marionettenfalten",
    "Mundwinkel", "Wangen / Jochbein", "Kinn", "Kieferlinie", "Tränenrinne", "Skinbooster", "Kontrolle", "Sonstiges"
  ],

  fillerInfoHtml: `
<p class="note">To jest tłumaczenie pomocnicze. Prawnie wiążąca jest wyłącznie wersja niemiecka.</p>
<p>Prosimy o spokojne przeczytanie tej informacji. Nie zastępuje ona osobistej rozmowy z osobą wykonującą zabieg, lecz pomaga się do niej przygotować. Prosimy zanotować pytania, które pojawią się podczas czytania. Wyjaśnimy je wspólnie podczas rozmowy.</p>
<p>Zabieg wykonuje Heilpraktikerin (niemiecki zawód leczniczy wykonywany na podstawie państwowego zezwolenia). Zabieg ma charakter estetyczny, czyli nie jest konieczny z medycznego punktu widzenia. Decyzję o jego wykonaniu podejmuje Pani/Pan całkowicie swobodnie.</p>
<p>Nie musi Pani/Pan decydować od razu. Jeśli po rozmowie potrzebuje Pani/Pan więcej czasu do namysłu, prosimy nam o tym powiedzieć. Zabieg może się wtedy odbyć innego dnia.</p>

<h2>1. Na czym polega zabieg?</h2>
<p>Kwas hialuronowy to substancja, którą organizm wytwarza sam. Wiąże wodę i nadaje skórze objętość oraz jędrność. Z wiekiem jego ilość się zmniejsza. Zmarszczki się pogłębiają, a usta i policzki tracą objętość.</p>
<p>Podczas zabiegu żel z kwasem hialuronowym wstrzykuje się w skórę lub pod skórę za pomocą cienkiej igły albo tępej kaniuli. Żel wypełnia zmarszczki, modeluje kontury lub dodaje objętości, na przykład w okolicy ust, bruzd nosowo-wargowych, zmarszczek marionetki, policzków lub brody. Wiele preparatów zawiera dodatkowo środek znieczulający miejscowo (lidokainę).</p>
<p>Zabieg trwa zwykle od 20 do 45 minut. Efekt jest widoczny od razu. Ostateczny wynik ocenia się po około 2 tygodniach, gdy ustąpi obrzęk.</p>

<h2>2. Jak długo utrzymuje się efekt?</h2>
<p>Organizm stopniowo rozkłada kwas hialuronowy. W zależności od preparatu, okolicy ciała, przemiany materii i stylu życia efekt utrzymuje się zwykle od 6 do 18 miesięcy, na ustach często krócej. Aby efekt się utrzymał, zabieg trzeba powtarzać. Nie można zagwarantować określonego efektu ani określonego czasu jego trwania. Czasami potrzebny jest zabieg uzupełniający (korekta), aby osiągnąć oczekiwany efekt lub równomierny kształt.</p>

<h2>3. Jakie są inne możliwości?</h2>
<p>Można również całkowicie zrezygnować z zabiegu. W zależności od potrzeb w grę wchodzą także:</p>
<ul>
<li>toksyna botulinowa na zmarszczki mimiczne (wykonywana wyłącznie przez lekarzy)</li>
<li>skinboostery, mikronakłuwanie, peeling chemiczny, laser lub radiofrekwencja w celu poprawy jakości skóry</li>
<li>przeszczep własnego tłuszczu lub osocze z własnej krwi (PRP)</li>
<li>nici liftingujące</li>
<li>zabiegi operacyjne, takie jak lifting twarzy lub operacja ust</li>
</ul>
<p>Metody te różnią się działaniem, czasem utrzymywania się efektu, kosztami i ryzykiem. Które z nich wchodzą w grę w Pani/Pana przypadku, omówimy podczas rozmowy.</p>

<h2>4. Jakie jest ryzyko?</h2>
<p>Nawet przy starannym wykonaniu mogą wystąpić skutki uboczne i powikłania. Wymieniamy także rzadkie ryzyka, ponieważ zabieg nie jest konieczny z medycznego punktu widzenia, a przed podjęciem decyzji ma Pani/Pan prawo wiedzieć wszystko.</p>
<h3>Częste i zwykle niegroźne</h3>
<p>Zwykle ustępują w ciągu kilku dni do 2 tygodni.</p>
<ul>
<li>zaczerwienienie, obrzęk, uczucie ucisku i ból w miejscach wkłucia</li>
<li>siniaki (krwiaki)</li>
<li>niewielkie wyczuwalne zgrubienia lub grudki</li>
<li>na ustach wyraźny obrzęk przez pierwsze 2 do 3 dni</li>
</ul>
<h3>Niezbyt częste</h3>
<ul>
<li>nierówny efekt lub asymetria, zbyt duża lub zbyt mała objętość</li>
<li>widoczne uwypuklenia lub niebieskawe zabarwienie skóry, gdy żel leży bardzo płytko (efekt Tyndalla)</li>
<li>wystąpienie opryszczki wargowej u osób ze skłonnością do niej</li>
<li>przejściowe drętwienie</li>
</ul>
<h3>Rzadkie</h3>
<ul>
<li>zakażenie lub ropień, które mogą wymagać leczenia antybiotykami lub zabiegu</li>
<li>reakcja alergiczna na preparat lub środek znieczulający, która może przebiegać nawet z dusznością lub zaburzeniami krążenia</li>
<li>opóźniona reakcja zapalna lub guzki (ziarniniak), nawet po kilku tygodniach lub miesiącach</li>
<li>przemieszczenie się żelu (migracja) poza leczony obszar</li>
<li>trwałe przebarwienia lub blizny</li>
</ul>
<h3>Bardzo rzadkie, ale poważne</h3>
<ul>
<li>Jeśli żel dostanie się do naczynia krwionośnego lub uciśnie naczynie, może dojść do zaburzenia ukrwienia. Może to prowadzić do obumarcia skóry (martwicy) z trwałymi bliznami.</li>
<li>W pojedynczych przypadkach takie zamknięcie może dotyczyć naczyń oka lub mózgu. Może to prowadzić do <b>zaburzeń widzenia, aż do trwałej utraty wzroku (ślepoty)</b>, lub do <b>udaru mózgu</b>.</li>
</ul>
<p>Wiele powikłań można dobrze leczyć, jeśli zostaną wcześnie rozpoznane. Kwas hialuronowy można rozpuścić za pomocą enzymu hialuronidazy. Również ten enzym może w rzadkich przypadkach wywołać reakcję alergiczną.</p>
<div class="warnbox"><b>Prosimy o natychmiastowy kontakt</b> pod numerem {TEL} (poza godzinami otwarcia numer alarmowy 112), jeśli wystąpią:
<ul>
<li>silny lub narastający ból</li>
<li>biała, blada, sinawa lub plamista skóra w leczonym obszarze</li>
<li>zaburzenia widzenia, podwójne widzenie, ból oczu</li>
<li>niedowłady, zaburzenia mowy, zawroty głowy</li>
<li>duszność, obrzęk języka lub gardła</li>
<li>gorączka, zaczerwienienie i ocieplenie skóry, które po 2 do 3 dniach narastają zamiast słabnąć</li>
</ul></div>

<h2>5. Kiedy nie należy wykonywać zabiegu?</h2>
<p>Zabieg z reguły nie jest możliwy lub musi zostać przełożony w przypadku:</p>
<ul>
<li>ciąży i okresu karmienia piersią</li>
<li>stanu zapalnego, opryszczki, trądziku lub otwartych ran w obszarze zabiegu</li>
<li>ostrej infekcji lub gorączki</li>
<li>znanej alergii na składniki preparatu lub na lidokainę</li>
<li>ciężkich chorób autoimmunologicznych lub zaburzeń krzepnięcia krwi (tylko po konsultacji)</li>
<li>trwałych wypełniaczy w tym samym obszarze (tylko po konsultacji)</li>
<li>osób poniżej 18. roku życia</li>
</ul>

<h2>6. Koszty</h2>
<p>Zabiegi estetyczne z reguły nie są finansowane ani przez ustawowe, ani przez prywatne ubezpieczenie zdrowotne. Koszty ponosi Pani/Pan samodzielnie. Dotyczy to również zabiegów uzupełniających oraz leczenia ewentualnych powikłań, jeśli ubezpieczenie zdrowotne ich nie pokrywa. Przewidywaną cenę podamy na piśmie przed zabiegiem.</p>

<h2>7. Zalecenia</h2>
<h3>Przed zabiegiem</h3>
<ul>
<li>Leków rozrzedzających krew <b>nigdy nie wolno odstawiać samodzielnie</b>. Zawsze prosimy wcześniej omówić to z nami i z lekarzem prowadzącym.</li>
<li>Jeśli to możliwe, prosimy na 3 do 7 dni przed zabiegiem zrezygnować z leków przeciwbólowych, takich jak aspiryna lub ibuprofen, oraz z dużych dawek witaminy E, kwasów omega-3 i miłorzębu, o ile nie zostały przepisane przez lekarza.</li>
<li>Prosimy nie pić alkoholu przez 24 godziny przed zabiegiem.</li>
<li>W przypadku skłonności do opryszczki wargowej prosimy poinformować nas o tym wcześniej. Pomocne może być leczenie zapobiegawcze.</li>
<li>Najlepiej przyjść bez makijażu.</li>
</ul>
<h3>Po zabiegu</h3>
<ul>
<li>W razie obrzęku ostrożnie chłodzić, zawsze przez tkaninę między zimnym okładem a skórą.</li>
<li>Nie dotykać, nie masować i nie uciskać leczonego obszaru, chyba że wyraźnie to zalecimy.</li>
<li>Przez 12 godzin nie nakładać makijażu na miejsca wkłucia.</li>
<li>Przez 24 godziny nie pić alkoholu i nie uprawiać sportu.</li>
<li>Przez 2 tygodnie unikać sauny, solarium, silnego słońca, zabiegów na twarz i masażu twarzy.</li>
<li>Jeśli to możliwe, przez 2 tygodnie unikać leczenia stomatologicznego.</li>
<li>Przez pierwsze noce w miarę możliwości spać na plecach.</li>
<li>Zalecana jest wizyta kontrolna po około 2 tygodniach.</li>
</ul>`,

  photoDocText: "Przed zabiegami i po nich wykonujemy zdjęcia leczonych obszarów. Stanowią one część dokumentacji zabiegów. Dzięki nim możemy śledzić zmiany skóry, oceniać efekt i planować kolejne zabiegi. Zdjęcia są przechowywane wyłącznie w Pani/Pana karcie pacjenta na tablecie gabinetu. Ogląda je tylko osoba wykonująca zabieg. Nie są publikowane ani nikomu przekazywane. Tak jak pozostałą dokumentację przechowujemy je przez 10 lat od zakończenia leczenia, a następnie usuwamy.",
  photoDocCheck: "Wyrażam zgodę na wykonywanie i przechowywanie zdjęć w celu dokumentacji mojego leczenia.",
  photoPubIntro: "Chcielibyśmy pokazywać wybrane zdjęcia na naszej stronie internetowej i w mediach społecznościowych (Instagram, Facebook). Jest to całkowicie dobrowolne. Brak zgody nie ma żadnego wpływu na zabieg. Pani/Pana imię i nazwisko nigdy nie zostanie podane. Tę zgodę można w każdej chwili wycofać, na przykład telefonicznie, e-mailem lub podczas kolejnej wizyty. Od tego momentu nie publikujemy nowych zdjęć, a opublikowane usuwamy z naszej strony i naszych kanałów, o ile jest to możliwe. Nie możemy odzyskać kopii, które inne osoby już zapisały lub udostępniły.",
  photoPubOptions: [
    { v: "nein", t: "Nie, prosimy nie publikować żadnych zdjęć." },
    { v: "ohne", t: "Tak, ale tylko bez rozpoznawalnej twarzy (fragment, na przykład same usta)." },
    { v: "mit", t: "Tak, zdjęcia mogą być publikowane, także z rozpoznawalną twarzą." }
  ],

  privacyHtml: `
<p class="note">To jest tłumaczenie pomocnicze. Prawnie wiążąca jest wyłącznie wersja niemiecka.</p>
<h3>Kto odpowiada za dane?</h3>
<p>Samanta Wysocka, Heilpraktikerin (niemiecki zawód leczniczy wykonywany na podstawie państwowego zezwolenia), Aesthetic Harmony, Arcostraße 11, 10587 Berlin{CONTACT}</p>
<h3>Jakie dane?</h3>
<p>Dane kontaktowe, odpowiedzi w ankiecie zdrowotnej, dane dotyczące zabiegów (data, zabieg, preparaty, numery serii, notatki), zdjęcia leczonych obszarów oraz formularze informacyjne i zgody z podpisem, datą i godziną.</p>
<h3>W jakim celu i na jakiej podstawie?</h3>
<p>W celu wykonania zabiegu i prowadzenia dokumentacji wymaganej przez prawo (art. 6 ust. 1 lit. b i c oraz art. 9 ust. 2 lit. h RODO, § 22 BDSG (niemiecka federalna ustawa o ochronie danych), §§ 630a i nast. BGB (niemiecki kodeks cywilny)). Bez tych informacji nie możemy bezpiecznie wykonać zabiegu. Zdjęcia są publikowane wyłącznie za Pani/Pana dobrowolną zgodą (art. 6 ust. 1 lit. a oraz art. 9 ust. 2 lit. a RODO, § 22 KUG (prawo do wizerunku)).</p>
<h3>Komu przekazujemy dane?</h3>
<p>Pani/Pana dane są objęte tajemnicą zawodową i nie są nikomu przekazywane, chyba że wyrazi Pani/Pan na to zgodę albo zobowiązuje nas do tego prawo.</p>
<h3>Gdzie przechowujemy dane?</h3>
<p>Dane są przechowywane wyłącznie na tablecie gabinetu i nie są przesyłane na serwery żadnego dostawcy. Część dla personelu jest chroniona kodem PIN. Kopie zapasowe przechowujemy w gabinecie w bezpieczny sposób.</p>
<h3>Jak długo?</h3>
<p>Dokumentację zabiegów, w tym zdjęcia i zgody, przechowujemy przez 10 lat od zakończenia leczenia (§ 630f ust. 3 BGB).</p>
<h3>Pani/Pana prawa</h3>
<p>Prawo dostępu do danych, ich sprostowania, usunięcia (o ile nie obowiązuje nas obowiązek przechowywania), ograniczenia przetwarzania, przenoszenia danych, sprzeciwu oraz prawo do kopii dokumentacji medycznej (§ 630g BGB). Każdą zgodę można w dowolnym momencie wycofać ze skutkiem na przyszłość. Skargi: Berliner Beauftragte für Datenschutz und Informationsfreiheit (berliński organ nadzorczy ds. ochrony danych osobowych), Alt-Moabit 59-61, 10555 Berlin.</p>
<p>Stan na: październik 2026</p>`,

  consentText: [
    "Zapoznałam/zapoznałem się z informacją dla pacjenta i ją rozumiem.",
    "Podczas osobistej rozmowy wyjaśniono mi planowany zabieg, jego przebieg, oczekiwany efekt i jego trwałość, ryzyko i możliwe powikłania, metody alternatywne oraz koszty. Na wszystkie moje pytania odpowiedziano w sposób dla mnie zrozumiały.",
    "Czas na przemyślenie decyzji był dla mnie wystarczający. Nie mam dalszych pytań.",
    "Wyrażam zgodę na opisany powyżej zabieg, łącznie ze zmianami lub rozszerzeniami omówionymi podczas rozmowy.",
    "Wiem, że mogę w każdej chwili wycofać tę zgodę bez podawania przyczyn, także bezpośrednio przed zabiegiem. Będę przestrzegać zaleceń przed zabiegiem i po nim.",
    "Otrzymam kopię tego dokumentu."
  ],
  refusalText: "Udzielono mi wyjaśnień dotyczących planowanego zabiegu. Nie wyrażam zgody na zabieg."
};

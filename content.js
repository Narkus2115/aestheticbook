// Treści formularzy (DE). Źródło: ../formularz/*.md (ENTWURF 10.10.2026)
window.AB_CONTENT = {
  version: "2026-10-11",
  practice: {
    name: "Aesthetic Harmony",
    owner: "Samanta Wysocka, Heilpraktikerin",
    address: "Arcostraße 11, 10587 Berlin",
    city: "Berlin",
    // Telefon und E-Mail für Patientinnen (Notfall nach Behandlung, Datenschutz). Leer = Text ohne Nummer.
    phone: "",
    email: ""
  },

  questions: [
    { id: "q1", t: "Nehmen Sie regelmäßig oder zurzeit Medikamente ein?", h: "Auch pflanzliche Mittel, Nahrungsergänzung und rezeptfreie Präparate.", d: "Welche und in welcher Dosis?" },
    { id: "q2", t: "Nehmen Sie blutverdünnende Mittel ein?", h: "Zum Beispiel ASS (Aspirin), Ibuprofen, Marcumar, Xarelto, Eliquis, Clopidogrel, oder hochdosiert Vitamin E, Omega-3, Ginkgo.", d: "Welche?" },
    { id: "q3", t: "Haben Sie eine Allergie oder Unverträglichkeit?", h: "Zum Beispiel gegen Medikamente, örtliche Betäubung (Lidocain), Hyaluronidase, Latex, Pflaster, Desinfektionsmittel, Eiweiß von Bakterien oder Nahrungsmittel.", d: "Welche und wie äußert sie sich?" },
    { id: "q4", t: "Neigen Sie zu Blutungen oder blauen Flecken?", h: "Auch nach kleinen Verletzungen oder beim Zahnarzt.", d: "Bitte beschreiben" },
    { id: "q5", t: "Haben Sie eine Herz- oder Kreislauferkrankung?", h: "Zum Beispiel hoher oder niedriger Blutdruck, Herzrhythmusstörungen, Herzinfarkt, Schlaganfall.", d: "Welche?" },
    { id: "q6", t: "Haben Sie eine Stoffwechselerkrankung, zum Beispiel Diabetes?", d: "Welche?" },
    { id: "q7", t: "Haben Sie eine Erkrankung der Schilddrüse?", d: "Welche?" },
    { id: "q8", t: "Haben Sie eine Autoimmunerkrankung oder eine Erkrankung des Bindegewebes?", h: "Zum Beispiel Lupus, rheumatoide Arthritis, Sklerodermie, Hashimoto, Multiple Sklerose.", d: "Welche?" },
    { id: "q9", t: "Ist Ihr Immunsystem geschwächt oder nehmen Sie Medikamente, die es unterdrücken?", h: "Zum Beispiel Kortison, Chemotherapie.", d: "Bitte beschreiben" },
    { id: "q10", t: "Haben Sie eine Infektionskrankheit?", h: "Zum Beispiel Hepatitis, HIV, Tuberkulose.", d: "Welche?" },
    { id: "q11", t: "Bekommen Sie Lippenherpes (Fieberbläschen)?", d: "Wie oft?" },
    { id: "q12", t: "Haben Sie zurzeit eine Entzündung, Akne, Ekzeme oder offene Stellen im Gesicht?", d: "Wo?" },
    { id: "q13", t: "Neigen Sie zu Wundheilungsstörungen, wulstigen Narben oder Keloiden?", d: "Bitte beschreiben" },
    { id: "q14", t: "Hatten Sie in den letzten 4 Wochen eine Impfung, eine Infektion oder eine Zahnbehandlung, oder ist in den nächsten 4 Wochen eine Impfung oder Zahnbehandlung geplant?", h: "Auch Erkältung, Grippe, COVID-19.", d: "Was und wann?" },
    { id: "q15", t: "Haben Sie Implantate im Körper oder im Gesicht?", h: "Zum Beispiel Herzschrittmacher, Gelenkersatz, Zahnimplantate, Fäden, Silikon oder andere dauerhafte Füllstoffe.", d: "Welche?" },
    { id: "q16", t: "Hatten Sie schon ästhetische Behandlungen im Gesicht?", h: "Zum Beispiel Filler, Botulinumtoxin, Fadenlifting, Laser, Peeling, Operation.", d: "Was, wo, wann, welches Produkt? Gab es Probleme?" },
    { id: "q17", t: "Hatten Sie schon einmal eine Komplikation bei einer örtlichen Betäubung?", d: "Was ist passiert?" },
    { id: "q18", t: "Haben Sie eine psychische Erkrankung oder sind Sie deswegen in Behandlung?", h: "Zum Beispiel Depression, Angststörung, Essstörung.", d: "Bitte beschreiben" },
    { id: "q19", t: "Rauchen Sie?", d: "Wie viel pro Tag?" },
    { id: "q20", t: "Gibt es weitere Erkrankungen, Operationen oder Hinweise, die wir wissen sollten?", d: "Bitte beschreiben" },
    { id: "q21", t: "Sind Sie schwanger oder könnten Sie schwanger sein?", women: true },
    { id: "q22", t: "Stillen Sie zurzeit?", women: true }
  ],

  anamnesisConfirm: [
    "Ich habe alle Fragen wahrheitsgemäß und nach bestem Wissen beantwortet. Mir ist bekannt, dass falsche oder fehlende Angaben meine Gesundheit gefährden können.",
    "Ich werde Änderungen meines Gesundheitszustands vor jeder weiteren Behandlung mitteilen."
  ],

  treatments: [
    "Lippen: Volumen", "Lippen: Kontur", "Lippen: Lippenfältchen", "Nasolabialfalten", "Marionettenfalten",
    "Mundwinkel", "Wangen / Jochbein", "Kinn", "Kieferlinie", "Tränenrinne", "Skinbooster", "Kontrolle", "Sonstiges"
  ],

  fillerInfoHtml: `
<p>Bitte lesen Sie diese Information in Ruhe durch. Sie ersetzt nicht das persönliche Gespräch mit Ihrer Behandlerin, sondern bereitet es vor. Notieren Sie sich Fragen, die beim Lesen entstehen. Im Gespräch klären wir sie gemeinsam.</p>
<p>Ihre Behandlerin ist Heilpraktikerin. Die Behandlung ist ästhetisch, also medizinisch nicht notwendig. Sie entscheiden frei, ob Sie sie durchführen lassen.</p>
<p>Sie müssen sich nicht sofort entscheiden. Wenn Sie nach dem Gespräch mehr Bedenkzeit möchten, sagen Sie es uns. Die Behandlung kann dann an einem anderen Tag stattfinden.</p>

<h2>1. Worum geht es?</h2>
<p>Hyaluronsäure ist ein Stoff, den der Körper selbst bildet. Er bindet Wasser und gibt der Haut Volumen und Spannkraft. Mit den Jahren nimmt der Anteil ab. Falten werden tiefer, Lippen und Wangen verlieren Volumen.</p>
<p>Bei der Behandlung wird ein Gel aus Hyaluronsäure mit einer feinen Nadel oder einer stumpfen Kanüle in oder unter die Haut gespritzt. Das Gel füllt Falten auf, formt Konturen oder gibt Volumen, zum Beispiel an Lippen, Nasolabialfalten, Marionettenfalten, Wangen oder Kinn. Viele Produkte enthalten zusätzlich ein örtliches Betäubungsmittel (Lidocain).</p>
<p>Die Behandlung dauert meist 20 bis 45 Minuten. Das Ergebnis ist sofort sichtbar und wird nach dem Abklingen der Schwellung in etwa 2 Wochen endgültig beurteilt.</p>

<h2>2. Wie lange hält das Ergebnis?</h2>
<p>Hyaluronsäure wird vom Körper nach und nach abgebaut. Je nach Produkt, Körperstelle, Stoffwechsel und Lebensweise hält das Ergebnis meist 6 bis 18 Monate, an den Lippen oft kürzer. Für ein dauerhaftes Ergebnis sind Wiederholungen nötig. Ein bestimmtes Ergebnis oder eine bestimmte Haltbarkeit kann nicht garantiert werden. Manchmal ist eine Nachbehandlung nötig, um das gewünschte Ergebnis oder eine gleichmäßige Form zu erreichen.</p>

<h2>3. Welche anderen Möglichkeiten gibt es?</h2>
<p>Sie können auch ganz auf eine Behandlung verzichten. Je nach Anliegen kommen außerdem in Frage:</p>
<ul>
<li>Botulinumtoxin bei Mimikfalten (nur durch Ärztinnen und Ärzte)</li>
<li>Skinbooster, Microneedling, chemisches Peeling, Laser oder Radiofrequenz zur Verbesserung der Hautqualität</li>
<li>Eigenfett oder Eigenblut (PRP)</li>
<li>Fadenlifting</li>
<li>operative Verfahren wie Facelift oder Lippenoperation</li>
</ul>
<p>Diese Verfahren unterscheiden sich in Wirkung, Dauer, Kosten und Risiken. Welche für Sie in Frage kommen, besprechen wir im Gespräch.</p>

<h2>4. Welche Risiken gibt es?</h2>
<p>Auch bei sorgfältiger Arbeit kann es zu Nebenwirkungen und Komplikationen kommen. Wir nennen auch seltene Risiken, weil die Behandlung nicht medizinisch notwendig ist und Sie alles wissen sollen, bevor Sie sich entscheiden.</p>
<h3>Häufig und meist harmlos</h3>
<p>Diese Beschwerden klingen in der Regel nach einigen Tagen bis 2 Wochen ab.</p>
<ul>
<li>Rötung, Schwellung, Druckgefühl und Schmerzen an den Einstichstellen</li>
<li>Blutergüsse (blaue Flecken)</li>
<li>tastbare kleine Verhärtungen oder Knötchen</li>
<li>an den Lippen deutliche Schwellung in den ersten 2 bis 3 Tagen</li>
</ul>
<h3>Gelegentlich</h3>
<ul>
<li>ungleichmäßiges Ergebnis oder Asymmetrie, zu viel oder zu wenig Volumen</li>
<li>sichtbare Erhebungen oder bläulicher Schimmer, wenn das Gel sehr oberflächlich liegt (Tyndall-Effekt)</li>
<li>Ausbruch von Lippenherpes bei entsprechender Veranlagung</li>
<li>vorübergehendes Taubheitsgefühl</li>
</ul>
<h3>Selten</h3>
<ul>
<li>Infektion oder Abszess, die eine Behandlung mit Antibiotika oder einen Eingriff nötig machen können</li>
<li>allergische Reaktion auf das Produkt oder das Betäubungsmittel, bis hin zu Atemnot oder Kreislaufproblemen</li>
<li>verspätete Entzündungsreaktion oder Knoten (Granulom), auch noch Wochen oder Monate später</li>
<li>Verlagerung des Gels (Migration) aus dem behandelten Bereich</li>
<li>dauerhafte Verfärbung oder Narben</li>
</ul>
<h3>Sehr selten, aber schwerwiegend</h3>
<ul>
<li>Gelangt Gel in ein Blutgefäß oder drückt es ein Gefäß ab, kann die Durchblutung gestört werden. Das kann zum Absterben von Haut (Nekrose) mit bleibenden Narben führen.</li>
<li>In Einzelfällen kann so ein Verschluss die Gefäße des Auges oder des Gehirns betreffen. Das kann zu <b>Sehstörungen bis zur dauerhaften Erblindung</b> oder zu einem <b>Schlaganfall</b> führen.</li>
</ul>
<p>Viele Komplikationen lassen sich gut behandeln, wenn sie früh erkannt werden. Hyaluronsäure kann mit dem Enzym Hyaluronidase wieder aufgelöst werden. Auch dieses Enzym kann selten eine allergische Reaktion auslösen.</p>
<div class="warnbox"><b>Sofort melden</b> unter {TEL}, außerhalb der Öffnungszeiten Notruf 112:
<ul>
<li>starke oder zunehmende Schmerzen</li>
<li>weiße, blasse, bläuliche oder fleckige Haut im behandelten Bereich</li>
<li>Sehstörungen, Doppelbilder, Augenschmerzen</li>
<li>Lähmungen, Sprachstörungen, Schwindel</li>
<li>Atemnot, Schwellung von Zunge oder Hals</li>
<li>Fieber, Rötung und Wärme, die nach 2 bis 3 Tagen zunehmen statt abnehmen</li>
</ul></div>

<h2>5. Wann sollte nicht behandelt werden?</h2>
<p>Eine Behandlung ist in der Regel nicht möglich oder muss verschoben werden bei:</p>
<ul>
<li>Schwangerschaft und Stillzeit</li>
<li>Entzündung, Herpes, Akne oder offenen Stellen im Behandlungsbereich</li>
<li>akuter Infektion oder Fieber</li>
<li>bekannter Allergie gegen Bestandteile des Produkts oder gegen Lidocain</li>
<li>schweren Autoimmunerkrankungen oder Gerinnungsstörungen (nur nach Rücksprache)</li>
<li>dauerhaften Füllstoffen im gleichen Bereich (nur nach Rücksprache)</li>
<li>Personen unter 18 Jahren</li>
</ul>

<h2>6. Kosten</h2>
<p>Ästhetische Behandlungen werden von gesetzlichen und privaten Krankenkassen in der Regel nicht bezahlt. Die Kosten tragen Sie selbst. Das gilt auch für Nachbehandlungen und für die Behandlung möglicher Komplikationen, wenn Ihre Krankenkasse diese nicht übernimmt. Den voraussichtlichen Preis nennen wir Ihnen vor der Behandlung schriftlich.</p>

<h2>7. Verhaltenshinweise</h2>
<h3>Vor der Behandlung</h3>
<ul>
<li>Blutverdünnende Medikamente setzen Sie <b>nie eigenmächtig</b> ab. Sprechen Sie das immer vorher mit uns und Ihrer Ärztin oder Ihrem Arzt ab.</li>
<li>Wenn möglich, verzichten Sie 3 bis 7 Tage vorher auf Schmerzmittel wie ASS oder Ibuprofen und auf hochdosiertes Vitamin E, Omega-3 und Ginkgo, sofern diese nicht ärztlich verordnet sind.</li>
<li>24 Stunden vorher bitte keinen Alkohol.</li>
<li>Bei Neigung zu Lippenherpes sagen Sie uns das bitte vorher. Eine vorbeugende Behandlung kann sinnvoll sein.</li>
<li>Kommen Sie möglichst ungeschminkt.</li>
</ul>
<h3>Nach der Behandlung</h3>
<ul>
<li>Kühlen Sie bei Schwellung vorsichtig, mit einem Tuch zwischen Kühlpack und Haut.</li>
<li>Berühren, massieren oder drücken Sie den behandelten Bereich nicht, außer wir sagen es Ihnen ausdrücklich.</li>
<li>12 Stunden kein Make-up auf den Einstichstellen.</li>
<li>24 Stunden kein Alkohol und kein Sport.</li>
<li>2 Wochen keine Sauna, kein Solarium, keine starke Sonne, keine Gesichtsbehandlungen oder Massagen im Gesicht.</li>
<li>Wenn möglich 2 Wochen keine Zahnbehandlung.</li>
<li>In den ersten Nächten möglichst auf dem Rücken schlafen.</li>
<li>Ein Kontrolltermin nach etwa 2 Wochen ist sinnvoll.</li>
</ul>`,

  photoDocText: "Vor und nach Ihren Behandlungen machen wir Fotos der behandelten Bereiche. Sie gehören zu Ihrer Behandlungsdokumentation. So können wir die Entwicklung Ihrer Haut verfolgen, das Ergebnis beurteilen und weitere Behandlungen planen. Die Fotos werden nur in Ihrer Patientenakte auf dem Tablet der Praxis gespeichert. Nur Ihre Behandlerin sieht sie. Sie werden nicht veröffentlicht und nicht weitergegeben. Wie die übrige Dokumentation bewahren wir sie 10 Jahre nach Abschluss der Behandlung auf und löschen sie danach.",
  photoDocCheck: "Ich bin damit einverstanden, dass Fotos zur Dokumentation meiner Behandlung gemacht und gespeichert werden.",
  photoPubIntro: "Wir würden einzelne Fotos gern auf unserer Website und in unseren Social-Media-Kanälen (Instagram, Facebook) zeigen. Das ist völlig freiwillig. Wenn Sie nicht zustimmen, hat das keinen Einfluss auf Ihre Behandlung. Ihr Name wird nie genannt. Sie können diese Einwilligung jederzeit widerrufen, zum Beispiel telefonisch, per E-Mail oder bei Ihrem nächsten Termin. Danach veröffentlichen wir keine neuen Fotos und löschen veröffentlichte Fotos von unserer Website und unseren Kanälen, soweit wir das können. Kopien, die andere bereits gespeichert oder geteilt haben, können wir nicht zurückholen.",
  photoPubOptions: [
    { v: "nein", t: "Nein, keine Veröffentlichung." },
    { v: "ohne", t: "Ja, aber nur ohne erkennbares Gesicht (Ausschnitt, zum Beispiel nur Lippen)." },
    { v: "mit", t: "Ja, Fotos dürfen veröffentlicht werden, auch mit erkennbarem Gesicht." }
  ],

  privacyHtml: `
<h3>Wer ist verantwortlich?</h3>
<p>Samanta Wysocka, Heilpraktikerin, Aesthetic Harmony, Arcostraße 11, 10587 Berlin{CONTACT}</p>
<h3>Welche Daten?</h3>
<p>Kontaktdaten, Ihre Angaben im Gesundheitsfragebogen, Behandlungsdaten (Datum, Behandlung, Produkte, Chargennummern, Notizen), Fotos der behandelten Bereiche sowie Aufklärungsbögen und Einwilligungen mit Unterschrift, Datum und Uhrzeit.</p>
<h3>Wofür und auf welcher Grundlage?</h3>
<p>Für Ihre Behandlung und die gesetzliche Dokumentation (Art. 6 Abs. 1 lit. b und c, Art. 9 Abs. 2 lit. h DSGVO, § 22 BDSG, §§ 630a ff. BGB). Ohne diese Angaben können wir Sie nicht sicher behandeln. Die Veröffentlichung von Fotos erfolgt nur mit Ihrer freiwilligen Einwilligung (Art. 6 Abs. 1 lit. a, Art. 9 Abs. 2 lit. a DSGVO, § 22 KUG).</p>
<h3>Wer bekommt Ihre Daten?</h3>
<p>Ihre Daten unterliegen der Schweigepflicht und werden nicht weitergegeben, außer Sie willigen ein oder ein Gesetz verpflichtet uns dazu.</p>
<h3>Wo werden Ihre Daten gespeichert?</h3>
<p>Ihre Daten werden nur auf dem Tablet der Praxis gespeichert und nicht an Server eines Anbieters übertragen. Der Praxisbereich ist mit einer PIN geschützt. Sicherungskopien bewahren wir geschützt in der Praxis auf.</p>
<h3>Wie lange?</h3>
<p>Die Behandlungsdokumentation einschließlich Fotos und Einwilligungen bewahren wir 10 Jahre nach Abschluss der Behandlung auf (§ 630f Abs. 3 BGB).</p>
<h3>Ihre Rechte</h3>
<p>Auskunft, Berichtigung, Löschung (soweit keine Aufbewahrungspflicht besteht), Einschränkung, Datenübertragbarkeit, Widerspruch sowie eine Kopie Ihrer Patientenakte (§ 630g BGB). Einwilligungen können Sie jederzeit für die Zukunft widerrufen. Beschwerden: Berliner Beauftragte für Datenschutz und Informationsfreiheit, Alt-Moabit 59-61, 10555 Berlin.</p>
<p>Stand: Oktober 2026</p>`,

  consentText: [
    "Ich habe die Patienteninformation gelesen und verstanden.",
    "Ich wurde in einem persönlichen Gespräch über die geplante Behandlung, ihren Ablauf, die zu erwartende Wirkung und Haltbarkeit, die Risiken und möglichen Komplikationen, die Alternativen und die Kosten aufgeklärt. Alle meine Fragen wurden verständlich beantwortet.",
    "Ich hatte ausreichend Zeit, um meine Entscheidung zu überdenken, und habe keine weiteren Fragen.",
    "Ich willige in die oben beschriebene Behandlung ein, einschließlich Änderungen oder Erweiterungen, die im Gespräch besprochen wurden.",
    "Mir ist bekannt, dass ich diese Einwilligung jederzeit ohne Angabe von Gründen widerrufen kann, auch noch unmittelbar vor der Behandlung. Ich werde die Verhaltenshinweise beachten.",
    "Eine Abschrift dieses Dokuments wird mir ausgehändigt."
  ],
  refusalText: "Ich wurde über die geplante Behandlung aufgeklärt. Ich willige in die Behandlung nicht ein."
};

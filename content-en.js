// Patient-facing form texts (EN). Translation of content.js (DE, legally binding version).
// Same object shape and keys as window.AB_CONTENT. Treatments stay German (panel language).
window.AB_CONTENT_EN = {
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
    { id: "q1", t: "Do you take any medication regularly or at the moment?", h: "This includes herbal remedies, dietary supplements and over-the-counter products.", d: "Which ones and in what dose?" },
    { id: "q2", t: "Do you take blood-thinning medication?", h: "For example aspirin (ASS), ibuprofen, Marcumar, Xarelto, Eliquis, clopidogrel, or high doses of vitamin E, omega-3 or ginkgo.", d: "Which ones?" },
    { id: "q3", t: "Do you have an allergy or intolerance?", h: "For example to medication, local anaesthetics (lidocaine), hyaluronidase, latex, plasters, disinfectants, bacterial proteins or food.", d: "Which one, and how does it show?" },
    { id: "q4", t: "Do you bleed or bruise easily?", h: "Also after minor injuries or at the dentist.", d: "Please describe" },
    { id: "q5", t: "Do you have a heart or circulatory condition?", h: "For example high or low blood pressure, irregular heartbeat, heart attack, stroke.", d: "Which one?" },
    { id: "q6", t: "Do you have a metabolic disorder, for example diabetes?", d: "Which one?" },
    { id: "q7", t: "Do you have a thyroid condition?", d: "Which one?" },
    { id: "q8", t: "Do you have an autoimmune disease or a connective tissue disease?", h: "For example lupus, rheumatoid arthritis, scleroderma, Hashimoto's, multiple sclerosis.", d: "Which one?" },
    { id: "q9", t: "Is your immune system weakened, or do you take medication that suppresses it?", h: "For example cortisone, chemotherapy.", d: "Please describe" },
    { id: "q10", t: "Do you have an infectious disease?", h: "For example hepatitis, HIV, tuberculosis.", d: "Which one?" },
    { id: "q11", t: "Do you get cold sores (lip herpes)?", d: "How often?" },
    { id: "q12", t: "Do you currently have any inflammation, acne, eczema or open sores on your face?", d: "Where?" },
    { id: "q13", t: "Do you tend to have problems with wound healing, raised scars or keloids?", d: "Please describe" },
    { id: "q14", t: "In the last 4 weeks, have you had a vaccination, an infection or dental treatment, or is a vaccination or dental treatment planned in the next 4 weeks?", h: "This includes colds, flu and COVID-19.", d: "What and when?" },
    { id: "q15", t: "Do you have any implants in your body or face?", h: "For example a pacemaker, joint replacement, dental implants, threads, silicone or other permanent fillers.", d: "Which ones?" },
    { id: "q16", t: "Have you had any aesthetic treatments on your face before?", h: "For example fillers, botulinum toxin, thread lift, laser, peeling, surgery.", d: "What, where, when, which product? Were there any problems?" },
    { id: "q17", t: "Have you ever had a complication with a local anaesthetic?", d: "What happened?" },
    { id: "q18", t: "Do you have a mental health condition, or are you being treated for one?", h: "For example depression, anxiety disorder, eating disorder.", d: "Please describe" },
    { id: "q19", t: "Do you smoke?", d: "How much per day?" },
    { id: "q20", t: "Are there any other illnesses, operations or details we should know about?", d: "Please describe" },
    { id: "q21", t: "Are you pregnant, or could you be pregnant?", women: true },
    { id: "q22", t: "Are you currently breastfeeding?", women: true }
  ],

  anamnesisConfirm: [
    "I have answered all questions truthfully and to the best of my knowledge. I understand that incorrect or missing information can put my health at risk.",
    "I will inform the practice of any changes in my health before every further treatment."
  ],

  treatments: [
    "Lippen: Volumen", "Lippen: Kontur", "Lippen: Lippenfältchen", "Nasolabialfalten", "Marionettenfalten",
    "Mundwinkel", "Wangen / Jochbein", "Kinn", "Kieferlinie", "Tränenrinne", "Skinbooster", "Kontrolle", "Sonstiges"
  ],

  fillerInfoHtml: `
<p class="note">This is a translation for your convenience. Only the German version is legally binding.</p>
<p>Please take your time to read this information carefully. It does not replace the personal consultation with your practitioner, it prepares you for it. Write down any questions that come up while you read. We will go through them together during the consultation.</p>
<p>Your practitioner is a Heilpraktikerin (a state-licensed non-medical practitioner in Germany). The treatment is aesthetic, which means it is not medically necessary. You are free to decide whether you want to have it.</p>
<p>You do not have to decide straight away. If you would like more time to think after the consultation, just tell us. The treatment can then take place on another day.</p>

<h2>1. What is it about?</h2>
<p>Hyaluronic acid is a substance that the body produces itself. It binds water and gives the skin volume and firmness. Over the years, the amount decreases. Wrinkles become deeper, and the lips and cheeks lose volume.</p>
<p>During the treatment, a hyaluronic acid gel is injected into or under the skin with a fine needle or a blunt cannula. The gel fills wrinkles, shapes contours or adds volume, for example to the lips, nasolabial folds, marionette lines, cheeks or chin. Many products also contain a local anaesthetic (lidocaine).</p>
<p>The treatment usually takes 20 to 45 minutes. The result is visible straight away. The final result can be assessed after about 2 weeks, once the swelling has gone down.</p>

<h2>2. How long does the result last?</h2>
<p>The body gradually breaks down hyaluronic acid. Depending on the product, the area treated, your metabolism and your lifestyle, the result usually lasts 6 to 18 months, often less on the lips. To keep the result, the treatment has to be repeated. A specific result or a specific duration cannot be guaranteed. Sometimes a follow-up treatment is needed to achieve the desired result or an even shape.</p>

<h2>3. What other options are there?</h2>
<p>You can also decide not to have any treatment at all. Depending on your wishes, the following may also be options:</p>
<ul>
<li>botulinum toxin for expression lines (only performed by medical doctors)</li>
<li>skin boosters, microneedling, chemical peels, laser or radiofrequency to improve skin quality</li>
<li>your own fat or your own blood (PRP)</li>
<li>thread lift</li>
<li>surgical procedures such as a facelift or lip surgery</li>
</ul>
<p>These procedures differ in effect, duration, cost and risks. We will discuss which of them may be suitable for you during the consultation.</p>

<h2>4. What are the risks?</h2>
<p>Even with careful work, side effects and complications can occur. We also list rare risks, because the treatment is not medically necessary and you should know everything before you decide.</p>
<h3>Common and usually harmless</h3>
<p>These usually go away within a few days to 2 weeks.</p>
<ul>
<li>redness, swelling, a feeling of pressure and pain at the injection sites</li>
<li>bruising</li>
<li>small hardened areas or lumps that can be felt</li>
<li>on the lips, noticeable swelling during the first 2 to 3 days</li>
</ul>
<h3>Occasional</h3>
<ul>
<li>uneven result or asymmetry, too much or too little volume</li>
<li>visible bumps or a bluish shimmer if the gel lies very close to the surface (Tyndall effect)</li>
<li>an outbreak of cold sores if you are prone to them</li>
<li>temporary numbness</li>
</ul>
<h3>Rare</h3>
<ul>
<li>infection or abscess, which may need treatment with antibiotics or a procedure</li>
<li>allergic reaction to the product or the anaesthetic, which can go as far as shortness of breath or circulatory problems</li>
<li>delayed inflammatory reaction or lumps (granuloma), even weeks or months later</li>
<li>movement of the gel (migration) out of the treated area</li>
<li>permanent discolouration or scarring</li>
</ul>
<h3>Very rare, but serious</h3>
<ul>
<li>If gel gets into a blood vessel or presses on a vessel, the blood supply can be disrupted. This can cause skin tissue to die (necrosis) and leave permanent scars.</li>
<li>In individual cases, such a blockage can affect the blood vessels of the eye or the brain. This can lead to <b>visual disturbances up to permanent blindness</b> or to a <b>stroke</b>.</li>
</ul>
<p>Many complications can be treated well if they are recognised early. Hyaluronic acid can be dissolved again with the enzyme hyaluronidase. In rare cases, this enzyme can also cause an allergic reaction.</p>
<div class="warnbox"><b>Report immediately</b> by calling {TEL} (outside opening hours, call the emergency number 112):
<ul>
<li>severe or increasing pain</li>
<li>white, pale, bluish or blotchy skin in the treated area</li>
<li>visual disturbances, double vision, eye pain</li>
<li>paralysis, speech problems, dizziness</li>
<li>shortness of breath, swelling of the tongue or throat</li>
<li>fever, redness and warmth that get worse after 2 to 3 days instead of better</li>
</ul></div>

<h2>5. When should the treatment not be carried out?</h2>
<p>Treatment is usually not possible, or has to be postponed, in the case of:</p>
<ul>
<li>pregnancy and breastfeeding</li>
<li>inflammation, cold sores, acne or open sores in the treatment area</li>
<li>acute infection or fever</li>
<li>known allergy to ingredients of the product or to lidocaine</li>
<li>severe autoimmune diseases or blood clotting disorders (only after consultation)</li>
<li>permanent fillers in the same area (only after consultation)</li>
<li>persons under 18 years of age</li>
</ul>

<h2>6. Costs</h2>
<p>Aesthetic treatments are generally not covered by statutory or private health insurance. You pay the costs yourself. This also applies to follow-up treatments and to the treatment of possible complications if your health insurance does not cover them. We will give you the expected price in writing before the treatment.</p>

<h2>7. Instructions to follow</h2>
<h3>Before the treatment</h3>
<ul>
<li>Never stop taking blood-thinning medication <b>on your own</b>. Always discuss this with us and with your doctor first.</li>
<li>If possible, avoid painkillers such as aspirin or ibuprofen and high doses of vitamin E, omega-3 and ginkgo for 3 to 7 days beforehand, unless a doctor has prescribed them.</li>
<li>Please do not drink alcohol for 24 hours beforehand.</li>
<li>If you are prone to cold sores, please tell us beforehand. Preventive treatment may be advisable.</li>
<li>If possible, come without make-up.</li>
</ul>
<h3>After the treatment</h3>
<ul>
<li>If there is swelling, cool the area gently, with a cloth between the cold pack and your skin.</li>
<li>Do not touch, massage or press the treated area unless we explicitly tell you to.</li>
<li>No make-up on the injection sites for 12 hours.</li>
<li>No alcohol and no sport for 24 hours.</li>
<li>For 2 weeks: no sauna, no solarium, no strong sun, no facial treatments and no facial massages.</li>
<li>If possible, no dental treatment for 2 weeks.</li>
<li>For the first few nights, try to sleep on your back.</li>
<li>A follow-up appointment after about 2 weeks is advisable.</li>
</ul>`,

  photoDocText: "We take photos of the treated areas before and after your treatments. They are part of your treatment records. This lets us follow how your skin develops, assess the result and plan further treatments. The photos are stored only in your patient file on the practice tablet. Only your practitioner sees them. They are not published and not passed on. Like the rest of your records, we keep them for 10 years after the end of your treatment and then delete them.",
  photoDocCheck: "I agree that photos are taken and stored to document my treatment.",
  photoPubIntro: "We would like to show some photos on our website and on our social media channels (Instagram, Facebook). This is completely voluntary. If you do not agree, this has no effect on your treatment. Your name will never be mentioned. You can withdraw this consent at any time, for example by phone, by email or at your next appointment. After that, we will not publish any new photos and will delete published photos from our website and our channels as far as we can. We cannot recall copies that others have already saved or shared.",
  photoPubOptions: [
    { v: "nein", t: "No, please do not publish any photos." },
    { v: "ohne", t: "Yes, but only without a recognisable face (a detail only, for example just the lips)." },
    { v: "mit", t: "Yes, photos may be published, even with my face recognisable." }
  ],

  privacyHtml: `
<p class="note">This is a translation for your convenience. Only the German version is legally binding.</p>
<h3>Who is responsible?</h3>
<p>Samanta Wysocka, Heilpraktikerin (state-licensed non-medical practitioner in Germany), Aesthetic Harmony, Arcostraße 11, 10587 Berlin{CONTACT}</p>
<h3>What data?</h3>
<p>Contact details, your answers in the health questionnaire, treatment data (date, treatment, products, batch numbers, notes), photos of the treated areas, and information sheets and consent forms with signature, date and time.</p>
<h3>For what purpose and on what legal basis?</h3>
<p>For your treatment and the documentation required by law (Art. 6(1)(b) and (c) and Art. 9(2)(h) GDPR, § 22 BDSG (German Federal Data Protection Act), §§ 630a et seq. BGB (German Civil Code)). Without this information we cannot treat you safely. Photos are published only with your voluntary consent (Art. 6(1)(a) and Art. 9(2)(a) GDPR, § 22 KUG (right to one's own image)).</p>
<h3>Who receives your data?</h3>
<p>Your data is protected by professional confidentiality and is not passed on unless you consent or the law requires us to do so.</p>
<h3>Where is your data stored?</h3>
<p>Your data is stored only on the practice tablet and is not transferred to any provider's servers. The practice area is protected by a PIN. We keep backup copies securely in the practice.</p>
<h3>How long?</h3>
<p>We keep the treatment records, including photos and consent forms, for 10 years after the end of your treatment (§ 630f(3) BGB).</p>
<h3>Your rights</h3>
<p>Access, rectification, erasure (unless we are legally required to keep the data), restriction of processing, data portability, objection, and a copy of your patient file (§ 630g BGB). You can withdraw any consent at any time with effect for the future. Complaints: Berlin Commissioner for Data Protection and Freedom of Information (Berliner Beauftragte für Datenschutz und Informationsfreiheit), Alt-Moabit 59-61, 10555 Berlin.</p>
<p>Last updated: October 2026</p>`,

  consentText: [
    "I have read and understood the patient information.",
    "In a personal consultation, I was informed about the planned treatment, how it is carried out, the expected effect and how long it lasts, the risks and possible complications, the alternatives and the costs. All my questions were answered in a way I could understand.",
    "I had enough time to think about my decision, and I have no further questions.",
    "I consent to the treatment described above, including any changes or extensions discussed during the consultation.",
    "I am aware that I can withdraw this consent at any time without giving reasons, even immediately before the treatment. I will follow the instructions before and after the treatment.",
    "I will receive a copy of this document."
  ],
  refusalText: "I was informed about the planned treatment. I do not consent to the treatment."
};

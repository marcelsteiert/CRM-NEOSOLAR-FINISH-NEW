// Generiert Anrufliste fuer alle Kunden mit gesendeten Angeboten
const ExcelJS = require('exceljs')

const data = [
  ["Jürg","Stadelmann Stadelmann","9512 Ganterschwil, Wiesenstr. 1","0041 79 720 89 80","juerg.stadelmann@gmail.com",19699,"2026-06-05","Eileen Möwe"],
  ["Alexander","Richard","4658 Däniken, Gröderstr. 22","+41 76 580 91 51","arich@sunrise.ch",47263,"2026-06-05","Eileen Möwe"],
  ["T","Michael Taryan","Cholibuck 6, 8121 Benglen ZH","+41 78 805 45 74","tam@ggaweb.ch",20765,"2026-06-02","Eileen Möwe"],
  ["Erman","","Oltner Strasse 31 B , 5013 Niedergösgen","+41 76 565 30 05","ermandemir@hotmail.com",0,"2026-06-02","Eileen Möwe"],
  ["Zimmermann","","3900 Brig, Bielastr. 72","+41 79 788 59 29","sebastian.zimmermann@ehl.ch",0,"2026-06-02","Eileen Möwe"],
  ["Uta","Fecht Fecht","Sägenbach 518, 9103 Schwellbrunn","+41765692546","poitou@gmx.ch",29263,"2026-05-29","Eileen Möwe"],
  ["Francesco","Rizzo","3422 Kirchberg, Froberg 6","+41 79 301 58 08","info@casax.info",0,"2026-05-27","Eileen Möwe"],
  ["Milos","Horvath","4103 Bottmingen, Nussbaumweg 52","+41 61 422 03 61","milos.s.horvath@gmail.com",0,"2026-05-20","Eileen Möwe"],
  ["Kraus","","5506 Mägenwil, Bachweg 8","+41 76 748 05 44","krausjue@gmail.com",0,"2026-05-18","Eileen Möwe"],
  ["Jegan","Tim","Hübelweg 4 5506 Mägenwil","+41792212552","jthymo@hotmail.com",23802,"2026-05-12","Eileen Möwe"],
  ["Fabian","Fuchs","Wissackerstrasse 11 4628 Wolfwil","0794794019","fabianfuchs@bluewin.ch",27000,"2026-05-08","Eileen Möwe"],
  ["Stefan","Rüdisüli","","+41 76 344 62 66","",48000,"2026-05-08","Eileen Möwe"],
  ["Eisenhut","Eisenhut","Hesligenstrasse 120, 8700 Küsnacht","+41 79 380 40 20","eisenhut@ggaweb.ch",30000,"2026-05-07","Eileen Möwe"],
  ["Thayaharan","Sinnathurai","Oelbergstieg 14, 8200 Schaffhausen","+41 76 680 86 44","aksayan29@hotmail.com",0,"2026-05-07","Eileen Möwe"],
  ["Rainer","Zimmermann","Rütiring 30, Riehen 3011 Schweiz","+41792288439","Rainer.zimm@gmail.com",32700,"2026-05-07","Eileen Möwe"],
  ["Christian","Gfeller","7152 sagogn, via sorts 8","+41 79 360 42 17","collina111@bluewin.ch",27666,"2026-05-07","Eileen Möwe"],
  ["Novica","Misic","5000 Aarau, Entfelderstr. 84","+41 76 222 00 10","novicamisic@gmx.ch",24000,"2026-05-07","Eileen Möwe"],
  ["Tino","Florio","Fontana 24 7553 Tarasp","+41 79 610 41 64","Tino.florio@gmail.com",53156,"2026-05-05","Eileen Möwe"],
  ["Remo","Fischbacher","8447 Dachsen, Laufenerstr.4","+41 79 249 31 81","remo.fischbacher1@gmail.com",36441,"2026-05-05","Eileen Möwe"],
  ["Blerim","Tahiri","Rainstrasse 41, 5013 Niedergösgen","+41 78 213 24 45","blerim.tahiri@gmx.ch",45500,"2026-05-01","Eileen Möwe"],
  ["Michael","Andereggen","Hohfeldstr. 100, 3931 Lalden,","+41 78 689 84 71","michael.andereggen@me.com",33000,"2026-05-01","Eileen Möwe"],
  ["Andre","Fankhauser","5615 Farwangen,hintenhof 530","+41 79 321 49 71","Af71@bluewin.ch",38500,"2026-04-30","Eileen Möwe"],
  ["Karem","Gomashiny","8867 Niederurnen, Tschudihoschet 5","+41 79 669 16 45","noahgo24@gmail.com",28000,"2026-04-30","Eileen Möwe"],
  ["Hans","Egger","Bahnhofstrasse 30, Mörschwil 9402","0041794374167","hansegger@paus.ch",30,"2026-04-29","Eileen Möwe"],
  ["Sven","Rappo","Turmstrasse 12, 5610 Wohlen","+4179 458 10 61","sven.rappo@hotmail.com",45175.5,"2026-04-29","Eileen Möwe"],
  ["Eros","Minola","Hausnummer 2, 7423 Portain","+41 79 943 35 47","erosminola@gmx.ch",17700,"2026-04-29","Eileen Möwe"],
  ["Roman","Urnaut","Gönhard weg 90, 5000 Arau","+41 79 176 57 50","roman@urnaut.com",32000,"2026-04-23","Eileen Möwe"],
  ["Tudor","Salomie","Ottenbergstr. 6 8049 Zürich","+41 79 176 90 05","ioana.dabacan@gmail.com",14000,"2026-04-23","Eileen Möwe"],
  ["Osman","Islami","Schulhausstrasse 53, 3076 Worb","+41 76 492 28 55","llokumi-me_arra@hotmail.com",34500,"2026-04-23","Eileen Möwe"],
  ["Smerakda","Giannini","8421 Dättlikon, Lärchenstr. 2","+41 76 377 99 91","smerakda.g@gmail.com",20000,"2026-04-23","Eileen Möwe"],
  ["Anto","Luso","Hinterbissaustrasse 8, 9410 Heiden","078 888 06 42","antol@bluemail.ch",0,"2026-04-23","Eileen Möwe"],
  ["Salim","Akbari","Zollikofen 3052, Im Täli 13","0798455185","salim.akbari17@gmail.com",23000,"2026-04-16","Eileen Möwe"],
  ["Rochaix","","Dorfstrasse 16, 8762 Sool,","+41 79 779 69 16","jacquelinerochaix69@gmail.com",0,"2026-04-16","Eileen Möwe"],
  ["Fabian","Bühlmann","6027 Römerswil, Gosperdingen 3 schweiz","+41799614927","fabian.buehlmann161@gmail.com",114000,"2026-04-15","Eileen Möwe"],
  ["Rene","Lauper","Struss 6 , 1717 St. Ursen FR","+41796348055","relauper41@gmail.com",24000,"2026-04-15","Eileen Möwe"],
  ["Sean","Lewis","Schledernweg 14 in Dornach","+41797692094","lewis@wohngruppe.ch",24800,"2026-04-13","Eileen Möwe"],
  ["Schenk","","P.Roncaioli 91, 6827 Lungolago","+41794446715","g.schenkag@bluewin.ch",20300,"2026-04-13","Eileen Möwe"],
  ["Asres","","Bieberselk 17, 3206 Rizenbach","+41765326827","aron.asres@outlook.com",26200,"2026-04-13","Eileen Möwe"],
  ["Jörg","Birkle","In der Gyrhalden 5, 8902 Urdorf, Schweiz","0041763328580","joerg.birkle@bluewin.ch",38500,"2026-04-10","Eileen Möwe"],
  ["Daniel","Kühni","Bürglenweg 41, 3123 Belp","079 719 00 10","dani.kuehni@bluewein.ch",25400,"2026-04-10","Eileen Möwe"],
  ["André","Leclerc","Aareweg 166, 4618 Boninge","+41796412275","aleclerc1963@gmail.com",27000,"2026-04-10","Eileen Möwe"],
  ["Stefan","Böller","Steigstrasse 8, 5452 Oberrohrdorf","+41793953057","stefan_boeller@bluewin.ch",28700,"2026-04-10","Eileen Möwe"],
  ["Christop","Philipp","Aurorastrasse 4, 7310 Bad Ragaz","+41796680651","philipp.christoph@gmail.com",28800,"2026-04-09","Eileen Möwe"],
  ["Sandro","Spindler","Lindenstrasse 3, 8582 Dozwil, Schweiz","+41791931993","sandro_spindler@hotmail.com",36000,"2026-04-08","Eileen Möwe"],
  ["Mike","Schudel","Wellenacher 15D, 3800 Unterseen","079 590 68 55","mike.schudel@bluewin.ch",33300,"2026-04-08","Eileen Möwe"],
  ["Zimmermann","Andreas-Urs","Pöschenweg 14, 3150 Schwarzenburg, BE","0041793533137","azi.jun@bluewin.ch",36800,"2026-04-08","Eileen Möwe"],
  ["Christian","Frie","Wiesenstrasse 5, Schindellegi 8834","0041799282828","chfrie@yahoo.com",34000,"2026-04-08","Eileen Möwe"],
  ["Schero","Youssef","Brunnenstrasse 14 4912 Aarwangen","+41765399289","marwanyoussef1988@gmail.com",21000,"2026-04-07","Eileen Möwe"],
  ["Manuel","Colaiemma","Talackerstrasse 20, 8156 Niederhasli","+41 76 560 24 01","colaiemma@sunrise.ch",33429,"2026-04-02","Eileen Möwe"],
  ["Malu","Fahrni","Friedweg 18, 5080 Laufenburg, Schweiz","+41792971727","kruemi79@hotmail.com",18700,"2026-04-02","Eileen Möwe"],
  ["Michael","Wendel","Müliwiesstrasse 5, Zell 8487","+41 76 484 25 60","adilma.akeret@gmx.ch",18582,"2026-04-02","Eileen Möwe"],
  ["Akdeniz","Volkan","Feldbergstrasse 51, 4057 Basel, BS","0041796833939","info@akdeniz.ch",11773,"2026-04-01","Eileen Möwe"],
  ["Afshar","Farhad","Interlakenstrasse 79, 3705 Faulensee, BE","0041788308280","afshar@bluewin.ch",49955,"2026-04-01","Eileen Möwe"],
  ["Lukas","Schmid","Vitzhaus 187, 3464 Schmidigen-Mühleweg","+41786826564","lukas.schm@gmx.ch",54500,"2026-04-01","Eileen Möwe"],
  ["Edyho","","Glärnischstrasse 50 8712 Stäfe","076 528 42 24","edyho777@gmail.com",32362,"2026-03-31","Eileen Möwe"],
  ["Doris","Seuz","Untere Bachstrasse 2, 8580 Amriswil","079 513 97 32","d.feuz@gmx.ch",18200,"2026-03-31","Eileen Möwe"],
  ["Antonio","Rotondaro","Spycherweg 10, Wiesendangen, Schweiz","+41765598779","antoniorotondaro70@gmail.com",27701,"2026-03-31","Eileen Möwe"],
  ["Claudio","Bässler","Via Spinatsch 25, 7014 Trin, Schweiz","+41786701222","cbaessler@gmx.ch",35982,"2026-03-31","Eileen Möwe"],
  ["Alex","Steiner","Bitzihofstrasse 39 8854 Schübelbach","+41789071052","alex58steiner@gmail.com",50849,"2026-03-31","Eileen Möwe"],
  ["Dominik","Belser","Obere Bodenbergstrasse 27, Weggis 6353","+41796477131","domi.speuz@sunrise.ch",38255,"2026-03-31","Eileen Möwe"],
  ["Verena","Frey Dasan","Alte Kirchgasse 2, 7215 Fanas, Schweiz","+41796512102","v.frey@healthmanagement-davos.ch",29807,"2026-03-31","Eileen Möwe"],
  ["Andreas","Schnellmann","Kusterwiesstrasse 5, 8865 Glarus Nord","+41786617820","andi.schnellmann@sunrise.ch",28708,"2026-03-31","Eileen Möwe"],
  ["edyho","Glauben","Glärnischstrasse 50 8712 Stäfe","+41765284224","edyho777@gmail.com",32134,"2026-03-30","Eileen Möwe"],
  ["Caroline","Herren","Breitfeldstrasse 8, 3014 Bern","0795443633","caroline_herren@gmx.ch",27828,"2026-03-30","Eileen Möwe"],
  ["Prasad","Bharanya","Bellevuestrasse 3, 3012 Bern, Schweiz","+41794852045","ecovision@bluewin.ch",15669,"2026-03-30","Eileen Möwe"],
  ["Besnik","Halitjaha","Geiger Architektur AG, Alpenstrasse 35, 8800 Thalwil","044 552 22 93","b.halitjaha@gmx.ch",45634,"2026-03-30","Eileen Möwe"],
  ["--","Yassen","--","--","goian@gmx.ch",27553,"2026-03-30","Eileen Möwe"],
  ["Patrick","Trafelet","Gartenstrasse 1 8134 Adilswiel","079 538 88 36","ptrafelet@gmail.com",26779,"2026-03-30","Eileen Möwe"],
  ["Nikola","Nedeljkovic","Sonnenstrasse 1, 5415 Nussbaumen, Schweiz","+41782616269","nikned@gmx.net",9980,"2026-03-30","Eileen Möwe"],
  ["Kurt","Seemann","Schulhausstrasse 23, 6294 Ermensee","079 435 30 41","k.seemann@bluewin.ch",31204,"2026-03-30","Eileen Möwe"],
  ["Besar","Bajrami","Vorderdorfstrasse 3b, 5242 Birr","+4177267556","besar.bajrami@gmail.com",52389,"2026-03-30","Eileen Möwe"],
  ["Andreas","Hunziker","Haagächerstrasse 28, 8155 Niederhasli","079 111 11 11","a.hunziker@cocreate.swiss",29142,"2026-03-30","Eileen Möwe"],
  ["Chris","Suckow","Buckgass 11, 8182 Hochfelden, Schweiz","+41767414373","christophsuckow@gmail.com",30255.35,"2026-03-27","Eileen Möwe"],
  ["Karlheinz","Hinze","KD hatte bereits einen Online termin erwartet das Angebot","+41795421241","karlheinz.hinze@gmail.com",21756.4,"2026-03-27","Eileen Möwe"],
  ["Stephan","Caspar","Oberhusweg 2, 7074 Malix","078 689 90 07","renovationburgwiesli@gmail.com",26484,"2026-03-27","Eileen Möwe"],
  ["Michael","Werner","Status: Vorort-Termin vereinbart","+41765348521","werke-anagramm-4v@icloud.com",0,"2026-03-27","Eileen Möwe"],
  ["Martin","Arpasi","Lohstrasse 17 Kreuzlingen","079 409 76 27","arpasimartin@gmail.com",29957.75,"2026-03-26","Eileen Möwe"],
  ["Ersedin","Prasovic","Wilenwies 2 D Niederglatt","079 562 61 23","ersedin2@sunrise.ch",38827.65,"2026-03-26","Eileen Möwe"],
  ["Oliver","Robin Siegrist","Via Lusciago 3, 6616 Losone Schweiz","076 344 81 35","olrogusi@outlook.com",31297.45,"2026-03-26","Eileen Möwe"],
  ["Reto","Scheiber","Hellgasse 12, 6460 Altdorf","079 362 04 58","reto.scheiber@gmail.com",34231.9,"2026-03-26","Eileen Möwe"],
  ["Steve","Furrer","Lärchenstrasse 59, 8400 Winterthur","079 442 93 29","s.furrer@gmx.net",32353.4,"2026-03-26","Eileen Möwe"],
  ["Nino","Laria","Terbinerstrasse 23, 3930 Visp","+41788231197","ninoo_1988@hotmail.com",38947.55,"2026-03-26","Eileen Möwe"],
  ["Mirco","Haller","Glockenstrasse 10, Lausen 4450","+41762020689","m.haller98@gmx.ch",71879,"2026-03-26","Eileen Möwe"],
  ["Malte","Laska","Bachtelenstrasse 21 2540 Grenchen","079 801 51 12","maltelaska@gmail.com",37807.8,"2026-03-26","Eileen Möwe"],
  ["Hossein","Najafi","Epinette 32 1791 Münchenwilen","078 875 95 71","hossein.najafi61@gmail.com",29981.2,"2026-03-24","Eileen Möwe"],
]

async function main() {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'NeoSolar CRM'
  wb.created = new Date()

  const ws = wb.addWorksheet('Anrufliste', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    properties: { defaultRowHeight: 22 },
  })

  const headers = [
    'Vorname', 'Nachname', 'Adresse', 'Telefon', 'E-Mail',
    'Offerten-Preis CHF', 'Angebot am', 'Verkäufer',
    'Anruf am', 'Status', 'Notiz / Nächster Schritt',
  ]

  ws.columns = [
    { width: 14 }, { width: 22 }, { width: 42 }, { width: 18 }, { width: 26 },
    { width: 16 }, { width: 12 }, { width: 16 },
    { width: 12 }, { width: 18 }, { width: 38 },
  ]

  // Header-Row
  const headerRow = ws.addRow(headers)
  headerRow.height = 32
  headers.forEach((_, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    }
  })

  // Data rows
  data.forEach((row, idx) => {
    const r = ws.addRow([
      row[0], row[1], row[2], row[3], row[4],
      row[5], row[6], row[7],
      '', '', '',
    ])
    r.height = 22

    // Zebra
    const rowBg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC'

    for (let i = 1; i <= headers.length; i++) {
      const cell = r.getCell(i)
      if (!cell.fill) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } }
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } }
      cell.alignment = { vertical: 'middle', wrapText: true }
    }

    // Vorname / Nachname fett
    r.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } }
    r.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } }

    // Telefon hervorheben
    const telCell = r.getCell(4)
    telCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF2563EB' } }
    telCell.alignment = { horizontal: 'center', vertical: 'middle' }

    // Preis als Zahl, mit CHF-Format
    const priceCell = r.getCell(6)
    priceCell.value = row[5] || 0
    priceCell.numFmt = '#,##0 "CHF"'
    priceCell.alignment = { horizontal: 'right', vertical: 'middle' }
    priceCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFD97706' } }

    // Datum
    const dateCell = r.getCell(7)
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' }
    dateCell.font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } }

    // Verkäufer
    r.getCell(8).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } }
    r.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' }

    // Anruf-am: leer, mit hellem gelben Hintergrund (Klick zum Ausfüllen)
    r.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }
    r.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' }

    // Status-Spalte: leer + Dropdown
    r.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }
    r.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' }

    // Notiz
    r.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }
    r.getCell(11).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
  })

  // Data Validation: Status-Dropdown
  const statusList = ['Erreicht', 'Nicht erreicht', 'Termin vereinbart', 'Rueckruf', 'Kein Interesse', 'Verloren', 'Gewonnen']
  for (let i = 2; i <= data.length + 1; i++) {
    ws.getCell(`J${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${statusList.join(',')}"`],
      showErrorMessage: true,
      errorTitle: 'Ungueltiger Status',
      error: 'Bitte aus der Liste waehlen',
    }
  }

  // Conditional formatting fuer Status-Spalte
  ws.addConditionalFormatting({
    ref: `J2:J${data.length + 1}`,
    rules: [
      { type: 'containsText', operator: 'containsText', text: 'Erreicht', priority: 1,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD1FAE5' } }, font: { color: { argb: 'FF047857' }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Nicht erreicht', priority: 2,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEE2E2' } }, font: { color: { argb: 'FFB91C1C' }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Termin vereinbart', priority: 3,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFDCFCE7' } }, font: { color: { argb: 'FF15803D' }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Rueckruf', priority: 4,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEF3C7' } }, font: { color: { argb: 'FFB45309' }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Kein Interesse', priority: 5,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE5E7EB' } }, font: { color: { argb: 'FF4B5563' }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Verloren', priority: 6,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEE2E2' } }, font: { color: { argb: 'FFB91C1C' }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Gewonnen', priority: 7,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD1FAE5' } }, font: { color: { argb: 'FF047857' }, bold: true } } },
    ],
  })

  // AutoFilter
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }

  // Total/Summary unten
  ws.addRow([])
  const totalRow = ws.addRow([`Total: ${data.length} Kunden`])
  totalRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } }

  const filename = `Anrufliste_Angebote_${new Date().toISOString().split('T')[0]}.xlsx`
  await wb.xlsx.writeFile(filename)
  console.log(`Excel erstellt: ${filename}`)
  console.log(`Anzahl Kunden: ${data.length}`)
}

main().catch(console.error)

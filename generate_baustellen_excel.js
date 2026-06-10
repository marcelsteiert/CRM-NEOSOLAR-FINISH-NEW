// Generiert Baustellen-Excel aus aktuellem DB-Snapshot
const XLSX = require('xlsx')

const data = [
  ["Markus Schrimpl","Markus Schrimpl","Amselweg 12, 4565 Recherswil","+41 79 866 86 73","32745",true,"2026-05-06",false,null,false,null,false,null,false,null,null,false,null,null,false,null,"",""],
  ["Robert Radonjic","Robert Radonjic","Binzhofstrasse 24 8404 Winterthur","+41 78 470 32 05","30600",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"",""],
  ["Marcel Schmidt","Marcel Schmidt","Förstergässli 10, Vorderthal","+41789073672","44762",true,"2026-05-06",false,null,false,null,false,null,false,null,null,false,null,null,false,null,"",""],
  ["Rolf Zubler","Rolf Zubler","Klettgauerstrasse 30, 8212 Neuhausen am Rheinfall","079 502 ","45707",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"",""],
  ["Maik Salvator","Maik Salvator","Via Plaun 6, 7130 Schnaus","077 213 46 79","30147",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"",""],
  ["Rinaldo Zanni","Rinaldo Zanni","Dornierstrasse 7, 9423 Altenrhein","079 522 59 26","27591",true,null,true,null,true,null,true,null,false,null,null,true,null,null,true,null,"",""],
  ["Antonio Cenga","Antonio Cenga","Aadorferstrasse 19, 8362 Balterswil TG","078 823 45 69","26603",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"",""],
  ["Gian Luca Lisci","Gian Luca Lisci","Eichlibachweg 6, 9545 Wängi","076 371 13 13","33021",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"",""],
  ["Gebhard Schumann","Gebhard Schumann","Trockenloostrasse 42a, 8107 Watt","076 604 77 98","22611",true,null,true,null,false,null,false,null,false,null,null,true,null,null,true,null,"",""],
  ["Manuela Hofmann","Manuela Hofmann","Schulweg 39, 8180 Bülach","079 270 32 09","57648",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"",""],
  ["Manuela Hofmann Horelec GmbH","Manuela Hofmann Horelec GmbH","Raaterstrasse 23, 8175 Windlach","044 860 30 68","99888",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"",""],
  ["Miroslav Panic","Miroslav Panic","Wallenrütistrasse 14 8234 Stetten","079 605 21 24","27470",true,null,true,null,false,null,false,null,false,null,null,true,null,null,true,null,"Batterie spinnt",""],
  ["Arnaud L'Hote","Arnaud L'Hote","Tüfwiesenstrasse 80, 8606 Nänikon","076 362 65 86","30130",true,null,true,null,true,null,false,null,true,null,null,true,null,null,true,null,"3 Module fehlen",""],
  ["Michael Schaad","Michael Schaad","Im Seiler 1, 8525 Niederneunforn","079 293 87 87","25756",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"Probleme mit Pronovo",""],
  ["Guido Wenning","Guido Wenning","Rigistrasse 8, 8303 Bassersdorf","079 947 98 11","28907",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"",""],
  ["Erich Imhof","Erich Imhof","Riedtli 4, 6436 Muotathal","079 313 37 51","32127",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"Batterie neu hinzufügen",""],
  ["Horst Peschko","Horst Peschko","Lenzenhaus 7 8586 Andwil","071 648 21 82","25495",true,null,true,null,false,null,false,null,false,null,null,true,null,null,true,null,"",""],
  ["Christian Buehler","Christian Buehler","Dättnauerstrasse 64C, 8406 Winterthur","079 100 58 58","24720",true,null,true,null,false,null,false,null,false,null,null,true,null,null,true,null,"",""],
  ["Prenk Dodes","Prenk Dodes","Konstanzerstrasse 64A, 9500 Wil","076 564 11 54","41000",true,null,true,null,true,null,false,null,true,null,null,true,null,null,true,null,"",""],
  ["Mirco Suter","Mirco Suter","Holweg 5, 9300 Wittenbach","071 313 55 08","68056",true,null,true,null,true,null,false,null,false,null,null,true,null,null,true,null,"",""],
  ["Autozentrum-West AG SG","Autozentrum-West AG SG","Nebengrabenstrasse 5, 9430 St. Margrethen","078 622 66 88","122887",true,null,true,null,true,null,true,null,true,null,null,false,null,null,true,null,"Schaltschrank fehlt",""],
  ["Autozentrum-West AG STM","Autozentrum-West AG SG","Nebengrabenstrasse 5, 9430 St. Margrethen","078 622 66 88","178494",true,null,true,null,false,null,false,null,false,null,null,true,null,null,true,null,"",""],
  ["Stefan Beck","Stefan Beck","Speckstrasse 3, 8330 Pfäffikon","079 507 67 69","28062",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"",""],
  ["Fabienne Kuratli","Fabienne Kuratli","Bahnhofstrasse 12, 9305 Berg","071 313 55 05","0",true,null,true,null,true,null,false,null,true,null,null,true,null,null,true,null,"Batterie fehlt",""],
  ["Marcel Bischof","Marcel Bischof","Lochstrasse 17, 9404 Rorschacherberg","079 442 75 68","39935",true,null,true,null,true,null,false,null,true,null,null,true,null,null,true,null,"Dongle fehlt",""],
  ["Urs Baumann","Urs Baumann","Schwantlern 59, 9056 Gais","076 510 49 43","34999",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"Rechnung fehlt",""],
  ["Christian Ederer","Christian EDERER","Kastellstrasse 43, 8107 Buchs","079 867 37 59","29997",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"Notstrombox fehlt",""],
  ["Andre Kiener","Andre Kiener","Maschwanderstrasse 20a, 8932 Mettmenstetten","076 746 75 57","34150",true,null,true,null,true,null,false,null,true,null,null,true,null,null,true,null,"",""],
  ["Freddy Waldvogel","Freddy Waldvogel","Weiherstrasse 8, 9607 Mosnang","079 600 53 53","23488",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"Dongle fehlt",""],
  ["Robert Gregus","Robert Gregus","Wiesenstrasse 2, 8235 Lohn","078 631 23 56","32999",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"Batterie fehlt",""],
  ["Christian Schneider","Christian Schneider","Stokarbergstrasse 61, 8200 Schaffhausen","076 321 50 47","52846",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"Elektriker TAG fehlt",""],
  ["Aydin Cuya","Aydin Cuya","Kronenstrasse 8, 9444 Diepoldsau","076 726 64 00","19869",true,null,true,null,true,null,true,null,true,null,null,true,null,null,true,null,"",""],
  ["Franz Zürcher","Franz Zürcher","Bodmerweg 82/94, 8807 Freienbach","079 642 33 01","35986",true,null,true,null,true,null,false,null,false,null,null,false,null,null,false,null,"",""],
  ["Jakob Jehli","Jakob Jehli","Apfelmatte 10, 8804 Au ZH","079 601 93 52","25774",true,null,true,null,true,null,false,null,true,"2026-06-08",null,true,"2026-06-08",null,false,null,"Tag fehlt",""],
  ["Dieter Nepas","Dieter Nepas","Floraweg 11, 6343 Buonas","079 258 25 68","25300",true,null,true,null,true,null,false,null,true,"2026-06-08",null,true,"2026-06-08",null,false,null,"",""],
  ["Roger Liechti","Roger Liechti","Königsweg 1, 5070 Frick","078 737 58 19","39302",true,null,true,null,true,null,false,null,true,"2026-06-08",null,true,"2026-06-08",null,false,null,"",""],
  ["Rolf Steiger","Rolf Steiger","Friedbergstrasse 10, 9230 Flawil","079 593 48 20","19028",true,null,true,null,false,null,false,null,true,"2026-06-08",null,false,null,null,false,null,"",""],
  ["Wojcieck Lewandowski","Wojcieck Lewandowski","Haagächerstrasse 57, 8155 Niederhasli","079 248 16 26","35682",true,null,true,null,true,"2026-06-08",false,null,true,"2026-06-08",null,true,null,null,false,null,"",""],
]

const headers = [
  "Baustelle","Kunde","Adresse","Telefon","Auftragssumme CHF",
  "Baubewilligung","Baubew. am","TAG eingereicht","TAG eing. am","TAG bewilligt","TAG bew. am",
  "IA eingereicht","IA eing. am","IA bewilligt","IA bew. am",
  "DC Montage Termin","DC Montage ausgeführt","DC Montage am",
  "AC Termin","AC installiert","AC installiert am",
  "Fehlt etwas","Bemerkung",
]

// Wandle null/boolean zu Ja/Nein/-
const rows = data.map(row => row.map((cell, idx) => {
  // Boolean-Spalten (Indexes 5, 7, 9, 11, 13, 16, 19)
  if ([5,7,9,11,13,16,19].includes(idx)) {
    if (cell === true) return "Ja"
    if (cell === false) return "Nein"
    return ""
  }
  // Datum-Spalten
  if ([6,8,10,12,14,15,17,18,20].includes(idx)) {
    return cell ? cell : ""
  }
  // Zahl-Spalte CHF
  if (idx === 4) {
    return cell ? Number(cell) : 0
  }
  return cell ?? ""
}))

const wb = XLSX.utils.book_new()
const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

// Spaltenbreiten
ws["!cols"] = [
  {wch: 26}, {wch: 26}, {wch: 38}, {wch: 18}, {wch: 14},
  {wch: 14}, {wch: 14}, {wch: 16}, {wch: 14}, {wch: 14}, {wch: 14},
  {wch: 14}, {wch: 14}, {wch: 14}, {wch: 14},
  {wch: 18}, {wch: 18}, {wch: 14},
  {wch: 14}, {wch: 14}, {wch: 14},
  {wch: 24}, {wch: 24},
]

// Header-Format (fett)
const range = XLSX.utils.decode_range(ws["!ref"])
for (let C = range.s.c; C <= range.e.c; ++C) {
  const cellRef = XLSX.utils.encode_cell({r: 0, c: C})
  if (!ws[cellRef]) continue
  ws[cellRef].s = { font: { bold: true } }
}

// Freeze first row
ws["!freeze"] = { xSplit: 0, ySplit: 1 }

XLSX.utils.book_append_sheet(wb, ws, "Baustellen")
XLSX.writeFile(wb, "Baustellen_2026-06-09.xlsx")
console.log("Excel erstellt: Baustellen_2026-06-09.xlsx")
console.log("Zeilen:", rows.length)

/**
 * Canonical catalogue source of truth.
 *
 * `name` is the brand and `composition` is the generic, kept separate so the
 * display name can be rebuilt deterministically as "Brand - Generic" without
 * guessing where one ends and the other begins.
 */
export const MEDICINES = [
  { name: 'Dolo 650', composition: 'Paracetamol 650mg', packSize: '15 tablets', mrp: 35, price: 32, rx: 0, category: 'Analgesic', dosageForm: 'Tablet', strength: '650mg', manufacturer: 'Dolover', description: 'Relieves mild to moderate fever and body pain.' },
  { name: 'Calpol 650', composition: 'Paracetamol 650mg', packSize: '15 tablets', mrp: 30, price: 28, rx: 0, category: 'Analgesic', dosageForm: 'Tablet', strength: '650mg', manufacturer: 'Cipla', description: 'Paracetamol used for fever and pain relief.' },
  { name: 'Crocin 650', composition: 'Paracetamol 650mg', packSize: '15 tablets', mrp: 34, price: 31, rx: 0, category: 'Analgesic', dosageForm: 'Tablet', strength: '650mg', manufacturer: 'GSK', description: 'Trusted antipyretic and analgesic.' },
  { name: 'Cetzine', composition: 'Cetirizine 10mg', packSize: '10 tablets', mrp: 25, price: 22, rx: 0, category: 'Antihistamine', dosageForm: 'Tablet', strength: '10mg', manufacturer: 'Alkem', description: 'Relieves sneezing, runny nose and itchy eyes.' },
  { name: 'Montair-LC', composition: 'Montelukast 10mg + Levocetirizine 5mg', packSize: '10 tablets', mrp: 175, price: 158, rx: 1, category: 'Antihistamine', dosageForm: 'Tablet', strength: '10mg + 5mg', manufacturer: 'Cipla', description: 'Prescription allergy and asthma support.' },
  { name: 'Augmentin 625 Duo', composition: 'Amoxicillin 500mg + Clavulanic acid 125mg', packSize: '6 tablets', mrp: 210, price: 189, rx: 1, category: 'Antibiotic', dosageForm: 'Tablet', strength: '625mg', manufacturer: 'GSK', description: 'Broad spectrum antibiotic for bacterial infections.' },
  { name: 'Azithral 500', composition: 'Azithromycin 500mg', packSize: '3 tablets', mrp: 148, price: 132, rx: 1, category: 'Antibiotic', dosageForm: 'Tablet', strength: '500mg', manufacturer: 'Alembic', description: 'Macrolide antibiotic for respiratory infections.' },
  { name: 'Amoxil 500', composition: 'Amoxicillin 500mg', packSize: '10 capsules', mrp: 120, price: 108, rx: 1, category: 'Antibiotic', dosageForm: 'Capsule', strength: '500mg', manufacturer: 'GSK', description: 'Penicillin antibiotic.' },
  { name: 'Pan 40', composition: 'Pantoprazole 40mg', packSize: '10 tablets', mrp: 145, price: 130, rx: 1, category: 'Antacid', dosageForm: 'Tablet', strength: '40mg', manufacturer: 'Alkem', description: 'Proton pump inhibitor for acidity and ulcers.' },
  { name: 'Rantac 150', composition: 'Ranitidine 150mg', packSize: '10 tablets', mrp: 45, price: 40, rx: 0, category: 'Antacid', dosageForm: 'Tablet', strength: '150mg', manufacturer: 'Zydus', description: 'H2 blocker for stomach acid.' },
  { name: 'Ascoril LS', composition: 'Levosalbutamol 1mg + Ambroxol 30mg', packSize: '100ml syrup', mrp: 95, price: 84, rx: 1, category: 'Respiratory', dosageForm: 'Syrup', strength: '1mg + 30mg', manufacturer: 'Cipla', description: 'Cough and cold syrup.' },
  { name: 'Benadryl Cough', composition: 'Diphenhydramine 12.5mg', packSize: '100ml syrup', mrp: 88, price: 78, rx: 0, category: 'Respiratory', dosageForm: 'Syrup', strength: '12.5mg/5ml', manufacturer: 'Johnson & Johnson', description: 'Dry cough syrup.' },
  { name: 'Ventolin Inhaler', composition: 'Salbutamol 100mcg', packSize: '200 doses', mrp: 285, price: 258, rx: 1, category: 'Respiratory', dosageForm: 'Inhaler', strength: '100mcg', manufacturer: 'GSK', description: 'Reliever inhaler for asthma and wheeze.' },
  { name: 'Thyronorm 50', composition: 'Levothyroxine 50mcg', packSize: '100 tablets', mrp: 98, price: 88, rx: 1, category: 'Hormone', dosageForm: 'Tablet', strength: '50mcg', manufacturer: 'Abbott', description: 'Thyroid hormone replacement.' },
  { name: 'Metformin 500', composition: 'Metformin 500mg', packSize: '20 tablets', mrp: 60, price: 52, rx: 1, category: 'Diabetes', dosageForm: 'Tablet', strength: '500mg', manufacturer: 'USL', description: 'First line medicine for type 2 diabetes.' },
  { name: 'Glycomet GP1', composition: 'Metformin 500mg + Glimepiride 1mg', packSize: '10 tablets', mrp: 95, price: 85, rx: 1, category: 'Diabetes', dosageForm: 'Tablet', strength: '500mg + 1mg', manufacturer: 'USL', description: 'Combination sugar control tablet.' },
  { name: 'Ecosprin AV 75', composition: 'Aspirin 75mg + Atorvastatin 10mg', packSize: '10 tablets', mrp: 110, price: 98, rx: 1, category: 'Cardiac', dosageForm: 'Capsule', strength: '75mg + 10mg', manufacturer: 'USL', description: 'Heart and cholesterol protection.' },
  { name: 'Amlodipine 5', composition: 'Amlodipine 5mg', packSize: '10 tablets', mrp: 55, price: 48, rx: 1, category: 'Cardiac', dosageForm: 'Tablet', strength: '5mg', manufacturer: 'Cipla', description: 'Blood pressure control.' },
  { name: 'Losar 50', composition: 'Losartan Potassium 50mg', packSize: '9 tablets', mrp: 90, price: 80, rx: 1, category: 'Cardiac', dosageForm: 'Tablet', strength: '50mg', manufacturer: 'Torrent', description: 'Blood pressure control.' },
  { name: 'Cetzine Eye Drops', composition: 'Olopatadine 0.5%', packSize: '5ml', mrp: 120, price: 108, rx: 0, category: 'Ophthalmic', dosageForm: 'Drops', strength: '0.5%', manufacturer: 'Allergan', description: 'Relieves itchy watery eyes.' },
  { name: 'Betadine', composition: 'Povidone Iodine 10%', packSize: '100ml solution', mrp: 65, price: 57, rx: 0, category: 'Antiseptic', dosageForm: 'Solution', strength: '10%', manufacturer: 'Wockhardt', description: 'Antiseptic for cuts and wounds.' },
  { name: 'Candid Dusting Powder', composition: 'Clotrimazole 1%', packSize: '50g', mrp: 145, price: 132, rx: 0, category: 'Antifungal', dosageForm: 'Powder', strength: '1%', manufacturer: 'Glenmark', description: 'Antifungal dusting powder for skin folds.' },
  { name: 'Ketostar Cream', composition: 'Ketoconazole 2% + Clobetasol 0.05%', packSize: '30g', mrp: 165, price: 148, rx: 1, category: 'Antifungal', dosageForm: 'Ointment', strength: '2% + 0.05%', manufacturer: 'Glenmark', description: 'Skin cream for fungal infection.' },
  { name: 'ORS Sachet (Jeevan)', composition: 'WHO Formula ORS', packSize: '21.8g sachet', mrp: 15, price: 12, rx: 0, category: 'Electrolyte', dosageForm: 'Sachet', strength: 'oral rehydration salts', manufacturer: 'BPL', description: 'Oral rehydration salts for dehydration.' },
  { name: 'Electral Powder', composition: 'Balanced electrolyte mix', packSize: '4.21g sachet', mrp: 18, price: 15, rx: 0, category: 'Electrolyte', dosageForm: 'Sachet', strength: 'balanced electrolyte mix', manufacturer: 'Cipla', description: 'Rapid rehydration during loose motions.' },
  { name: 'Zincovit', composition: 'Zinc + Vitamin A/B/C', packSize: '20 tablets', mrp: 105, price: 92, rx: 0, category: 'Supplement', dosageForm: 'Tablet', strength: 'n/a', manufacturer: 'Cipla', description: 'Immunity support during recovery.' },
  { name: 'Vitamin C 500', composition: 'Ascorbic acid 500mg', packSize: '30 tablets', mrp: 70, price: 62, rx: 0, category: 'Supplement', dosageForm: 'Tablet', strength: '500mg', manufacturer: 'Sun Pharma', description: 'Immunity booster.' },
]

/** Display name: brand and generic joined by a plain ASCII separator. */
export function displayName(med) {
  return `${med.name} - ${med.composition}`
}

/**
 * Strength including the pack size, e.g. "650mg (15 tablets)".
 *
 * The contract has no separate packSize column and the UI shows a single
 * strength line, so the pack count rides along here. Parentheses keep it
 * readable for combination salts such as "500mg + 1mg (10 tablets)".
 */
export function displayStrength(med) {
  return `${med.strength} (${med.packSize})`
}

/** Brand prefix key, used to match a database row back to its catalogue entry. */
export function brandKey(value) {
  return value
    .split(' - ')[0]
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
}
